<?php

namespace App\Services;

use App\Jobs\SendWelcomeEmail;
use App\Repositories\PostgreSQL\UserRepository;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Contracts\User as SocialiteUser;

class AuthService
{
    public function __construct(
        private UserRepository $users,
        private OTPService $otp,
        private ProfileService $profiles,
        private TokenService $tokens,
        private PasswordResetService $passwordResetService,
        private CompanyEmailValidator $emailValidator,
        private CompanyInvitationService $invitations,
        private CompanyMembershipService $memberships,
    ) {}

    public function initiateRegistration(
        string $email,
        string $password,
        string $role,
        ?string $companyInviteToken = null,
        bool $magicLinkVerified = false
    ): string|array {
        Log::info('AuthService: Starting registration', [
            'email' => $email,
            'role' => $role,
            'has_invite_token' => $companyInviteToken !== null,
            'magic_link_verified' => $magicLinkVerified,
        ]);

        if ($this->users->emailExists($email)) {
            Log::warning('AuthService: Email already exists', ['email' => $email]);

            return 'email_taken';
        }

        // For HR/company_admin roles, check if invite is required
        if (in_array($role, ['hr', 'company_admin'], true)) {
            $domain = $this->emailValidator->extractDomain($email);
            $existingCompany = app(\App\Repositories\PostgreSQL\CompanyProfileRepository::class)
                ->findByDomain($domain);

            if ($existingCompany) {
                // Domain already has a company - invite is required
                if (! $companyInviteToken) {
                    Log::warning('AuthService: Company invite required', [
                        'email' => $email,
                        'domain' => $domain,
                    ]);

                    return 'company_invite_required';
                }

                // Validate the invite token
                $invite = $this->invitations->resolvePendingInvite($email, $companyInviteToken);

                if (! $invite) {
                    Log::warning('AuthService: Invalid company invite', ['email' => $email]);

                    return 'company_invite_invalid';
                }

                if ($invite->invite_role !== $role) {
                    Log::warning('AuthService: Company invite role mismatch', [
                        'email' => $email,
                        'expected_role' => $role,
                        'invite_role' => $invite->invite_role,
                    ]);

                    return 'company_invite_role_mismatch';
                }
            }
        }

        // Web magic-link flow: email pre-verified, skip OTP entirely (Req 3 AC 3)
        if ($magicLinkVerified && $companyInviteToken) {
            $passwordHash = Hash::make($password, ['rounds' => config('hashing.bcrypt.rounds', 10)]);

            // Directly complete registration without OTP round-trip
            $result = $this->completeRegistrationDirect($email, $passwordHash, $role, $companyInviteToken);

            // Return the full result array for magic link registration
            return $result;
        }

        $passwordHash = Hash::make($password, ['rounds' => config('hashing.bcrypt.rounds', 10)]);

        try {
            $this->otp->sendOtp($email, $passwordHash, $role, $companyInviteToken);
            Log::info('AuthService: OTP sent successfully', ['email' => $email]);
        } catch (Exception $e) {
            Log::error('AuthService: Failed to send OTP', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        return 'otp_sent';
    }

    public function completeRegistration(string $email, string $code): array
    {
        $result = $this->otp->verify($email, $code);

        if ($result !== 'valid') {
            return ['status' => $result];
        }

        // Get stored registration data from Redis
        $storedData = $this->otp->getStoredData($email);

        if (! $storedData || ! isset($storedData['password_hash'], $storedData['role'])) {
            return ['status' => 'expired'];
        }

        $companyInviteToken = $storedData['company_invite_token'] ?? null;

        // Use transaction to ensure atomicity
        DB::transaction(function () use ($email, $storedData, $companyInviteToken, &$user, &$token) {
            // Create user with stored password hash
            $user = $this->users->create([
                'email' => strtolower(trim($email)),
                'password_hash' => $storedData['password_hash'],
                'role' => $storedData['role'],
                'email_verified_at' => now(),
            ]);

            // Handle company invite acceptance if present
            if ($companyInviteToken && in_array($user->role, ['hr', 'company_admin'], true)) {
                try {
                    $this->invitations->acceptInviteForUser(
                        $email,
                        $companyInviteToken,
                        $user->id,
                        $user->role
                    );

                    // Don't create a new profile - user is joining existing company
                    Log::info('AuthService: User joined company via invite', [
                        'user_id' => $user->id,
                        'email' => $email,
                    ]);
                } catch (\InvalidArgumentException $e) {
                    Log::error('AuthService: Failed to accept invite', [
                        'user_id' => $user->id,
                        'error' => $e->getMessage(),
                    ]);
                    throw $e;
                }
            } else {
                // Create profile for new user (no invite)
                $this->profiles->createProfileForUser($user);

                // Extract and store company email domain for trust scoring
                if (in_array($user->role, ['hr', 'company_admin'], true)) {
                    $this->profiles->setCompanyEmailDomain($user->id, $email);
                }
            }

            // Generate token
            $token = $this->tokens->generateToken($user);
        });

        $this->otp->clearStoredData($email);

        // Dispatch welcome email job
        SendWelcomeEmail::dispatch($user->id)->onQueue('emails');

        return [
            'status' => 'verified',
            'token' => $token,
            'user' => $user,
        ];
    }

    /**
     * Complete registration for the web magic-link flow — bypasses OTP.
     * Called from initiateRegistration() when magic_link_verified=true.
     * Req 3 AC 3.
     */
    public function completeRegistrationDirect(
        string $email,
        string $passwordHash,
        string $role,
        string $companyInviteToken
    ): array {
        $user = null;
        $token = null;

        DB::transaction(function () use ($email, $passwordHash, $role, $companyInviteToken, &$user, &$token) {
            $user = $this->users->create([
                'email' => strtolower(trim($email)),
                'password_hash' => $passwordHash,
                'role' => $role,
                'email_verified_at' => now(), // pre-verified by magic link
            ]);

            if (in_array($user->role, ['hr', 'company_admin'], true)) {
                try {
                    $this->invitations->acceptInviteForUser($email, $companyInviteToken, $user->id, $user->role);
                    Log::info('AuthService: Web magic-link user joined company via invite', [
                        'user_id' => $user->id,
                        'email' => $email,
                    ]);
                } catch (\InvalidArgumentException $e) {
                    Log::error('AuthService: Failed to accept invite (web flow)', [
                        'user_id' => $user->id,
                        'error' => $e->getMessage(),
                    ]);
                    throw $e;
                }
            }

            $token = $this->tokens->generateToken($user);
        });

        if ($user) {
            SendWelcomeEmail::dispatch($user->id)->onQueue('emails');
        }

        return [
            'status' => 'verified',
            'token' => $token,
            'user' => $user,
        ];
    }

    public function initiateForgotPassword(string $email): string
    {
        $user = $this->users->findByEmail($email);

        if (! $user) {
            return 'code_sent';
        }

        if ($user->google_id && ! $user->password_hash) {
            return 'code_sent';
        }

        $this->passwordResetService->sendResetCode($email);

        return 'code_sent';
    }

    public function resetPassword(string $email, string $code, string $newPassword): array
    {
        $user = $this->users->findByEmail($email);

        if (! $user) {
            return ['status' => 'invalid'];
        }

        $result = $this->passwordResetService->verifyCode($email, $code);

        if ($result !== 'valid') {
            return ['status' => $result];
        }

        $newPasswordHash = Hash::make($newPassword, ['rounds' => config('hashing.bcrypt.rounds', 10)]);

        $this->users->update($user, [
            'password_hash' => $newPasswordHash,
        ]);

        $this->passwordResetService->clearResetData($email);

        $user->tokens()->delete();

        return ['status' => 'success'];
    }

    public function login(string $email, string $password): array
    {
        $user = $this->users->findByEmail($email);

        if (! $user || ! Hash::check($password, $user->getAuthPassword())) {
            return ['status' => 'invalid_credentials'];
        }

        if ($user->is_banned) {
            return ['status' => 'banned'];
        }

        if (! $user->hasVerifiedEmail()) {
            $this->otp->sendOtp($email, $user->password_hash, $user->role);

            return ['status' => 'unverified'];
        }

        $token = $this->tokens->generateToken($user);

        return [
            'status' => 'success',
            'token' => $token,
            'user' => $user,
        ];
    }

    public function logout($user): void
    {
        $this->tokens->revokeCurrentToken($user);
    }

    public function handleGoogleCallback(SocialiteUser $googleUser): array
    {
        $user = $this->users->findByGoogleId($googleUser->getId());

        if ($user && $user->role !== 'applicant') {
            return ['status' => 'role_not_allowed'];
        }

        if (! $user) {
            $user = $this->users->findByEmail($googleUser->getEmail());

            if ($user) {
                if ($user->role !== 'applicant') {
                    return ['status' => 'role_not_allowed'];
                }

                // Link Google account
                $this->users->update($user, [
                    'google_id' => $googleUser->getId(),
                ]);

                // Update profile photo if empty
                $this->profiles->updateApplicantPhoto($user->id, $googleUser->getAvatar());
            } else {
                // Create new user with transaction
                DB::transaction(function () use ($googleUser, &$user) {
                    $user = $this->users->create([
                        'email' => strtolower(trim($googleUser->getEmail())),
                        'password_hash' => Hash::make(str()->random(40)),
                        'role' => 'applicant',
                        'google_id' => $googleUser->getId(),
                        'email_verified_at' => now(),
                    ]);

                    $this->profiles->createProfileForUser($user, $googleUser->getAvatar());
                });

                // Dispatch welcome email for new users
                SendWelcomeEmail::dispatch($user->id)->onQueue('emails');
            }
        }

        if ($user->is_banned) {
            return ['status' => 'banned'];
        }

        $token = $this->tokens->generateToken($user);

        $onboardingStatus = $this->profiles->getOnboardingStatus($user->id, 'applicant');
        $needsOnboarding = ! $onboardingStatus['completed'];

        return [
            'status' => 'success',
            'token' => $token,
            'user' => $user,
            'is_new_user' => $user->wasRecentlyCreated,
            'needs_onboarding' => $needsOnboarding,
        ];
    }

    public function resendOtp(string $email): void
    {
        $storedData = $this->otp->getStoredData($email);

        if ($storedData && isset($storedData['password_hash'], $storedData['role'])) {
            $this->otp->sendOtp($email);

            return;
        }

        $user = $this->users->findByEmail($email);

        if (! $user || $user->hasVerifiedEmail()) {
            return;
        }

        $this->otp->sendOtp($email, $user->password_hash, $user->role);
    }
}
