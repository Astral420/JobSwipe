<?php

namespace App\Services;

use App\Exceptions\InvalidRoleTransitionException;
use App\Exceptions\LastSuperAdminException;
use App\Exceptions\SelfModificationException;
use App\Mail\AdminInvitationMail;
use App\Mail\AdminRoleChangedMail;
use App\Models\PostgreSQL\AdminInvitation;
use App\Models\PostgreSQL\User;
use App\Repositories\PostgreSQL\UserRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AdminUserService
{
    public function __construct(
        private UserRepository $userRepository,
        private AuditService $auditService,
        private TokenService $tokenService,
    ) {}

    /**
     * Create a new admin user with invitation token.
     *
     * Requirements: 10.1, 10.2, 15.1, 15.2
     *
     * @param  string  $email  Email address for the new admin user
     * @param  string  $role  Role to assign (admin or moderator)
     * @param  User  $creator  The super_admin creating the user
     * @return array ['user' => User, 'invitation' => AdminInvitation]
     *
     * @throws \Exception
     */
    public function createAdminUser(string $email, string $role, User $creator): array
    {
        // Validate email uniqueness
        $email = strtolower(trim($email));
        if ($this->userRepository->emailExists($email)) {
            throw new \Exception('Email already exists');
        }

        // Validate role
        if (! in_array($role, ['admin', 'moderator'], true)) {
            throw new \Exception('Invalid role. Only admin and moderator can be created via invitation.');
        }

        return DB::transaction(function () use ($email, $role, $creator) {
            // Create user with inactive status (will be activated on invitation acceptance)
            $user = $this->userRepository->create([
                'email' => $email,
                'password_hash' => '', // Will be set when invitation is accepted
                'role' => $role,
                'is_active' => false,
                'is_banned' => false,
            ]);

            // Generate invitation token
            $token = $this->generateInvitationToken();
            $expiresAt = now()->addDays(config('admin.invitation.token_expiration_days', 7));

            // Create invitation record
            $invitation = AdminInvitation::create([
                'email' => $email,
                'role' => $role,
                'token' => $token,
                'invited_by' => $creator->id,
                'expires_at' => $expiresAt,
            ]);

            // Send invitation email
            $this->sendInvitation($user, $invitation, $creator);

            // Log the action
            $this->auditService->log(
                'admin_user_create',
                'user',
                $user->id,
                $creator,
                [
                    'email' => $email,
                    'role' => $role,
                    'invitation_expires_at' => $expiresAt->toIso8601String(),
                ]
            );

            return [
                'user' => $user,
                'invitation' => $invitation,
            ];
        });
    }

    /**
     * Update an admin user's role.
     *
     * Requirements: 10.5, 14.1-14.5
     *
     * @param  string  $userId  ID of the user to update
     * @param  string  $newRole  New role to assign
     * @param  User  $actor  The super_admin performing the update
     * @return User Updated user
     *
     * @throws \Exception
     */
    public function updateRole(string $userId, string $newRole, User $actor): User
    {
        $user = $this->userRepository->findById($userId);

        if (! $user) {
            throw new \Exception('User not found');
        }

        // Prevent self-modification
        if ($user->id === $actor->id) {
            throw new SelfModificationException('role change');
        }

        // Validate role transition
        if (! $this->validateRoleTransition($user->role, $newRole)) {
            throw new InvalidRoleTransitionException(
                $user->role,
                $newRole,
                'Cannot promote moderator directly to super_admin'
            );
        }

        // Prevent demoting the last super_admin
        if ($user->role === 'super_admin' && $newRole !== 'super_admin') {
            $superAdminCount = $this->userRepository->countByRole('super_admin');
            if ($superAdminCount <= 1) {
                throw new LastSuperAdminException;
            }
        }

        $oldRole = $user->role;

        return DB::transaction(function () use ($user, $newRole, $oldRole, $actor) {
            // Update user role
            $user = $this->userRepository->update($user, ['role' => $newRole]);

            // Revoke all existing tokens (force re-login)
            $this->tokenService->revokeAllTokens($user);

            // Send notification email
            Mail::to($user->email)->queue(
                new AdminRoleChangedMail(
                    $user->email,
                    $oldRole,
                    $newRole,
                    $actor->email
                )
            );

            // Log the action
            $this->auditService->log(
                'admin_role_change',
                'user',
                $user->id,
                $actor,
                [
                    'old_role' => $oldRole,
                    'new_role' => $newRole,
                ],
                ['role' => $oldRole],
                ['role' => $newRole]
            );

            return $user;
        });
    }

    /**
     * Deactivate an admin user.
     *
     * Requirements: 10.6
     *
     * @param  string  $userId  ID of the user to deactivate
     * @param  User  $actor  The super_admin performing the action
     * @return bool Success status
     *
     * @throws \Exception
     */
    public function deactivateAdminUser(string $userId, User $actor): bool
    {
        $user = $this->userRepository->findById($userId);

        if (! $user) {
            throw new \Exception('User not found');
        }

        // Prevent self-deactivation
        if ($user->id === $actor->id) {
            throw new SelfModificationException('deactivation');
        }

        // Prevent deactivating the last active super_admin
        if ($user->role === 'super_admin' && $user->is_active) {
            $activeSuperAdminCount = User::where('role', 'super_admin')
                ->where('is_active', true)
                ->count();

            if ($activeSuperAdminCount <= 1) {
                throw new LastSuperAdminException;
            }
        }

        return DB::transaction(function () use ($user, $actor) {
            // Set is_active to false
            $this->userRepository->update($user, ['is_active' => false]);

            // Revoke all tokens
            $this->tokenService->revokeAllTokens($user);

            // Log the action
            $this->auditService->log(
                'admin_user_deactivate',
                'user',
                $user->id,
                $actor,
                ['reason' => 'Admin user deactivated'],
                ['is_active' => true],
                ['is_active' => false]
            );

            return true;
        });
    }

    /**
     * Reactivate an admin user.
     *
     * Requirements: 10.7
     *
     * @param  string  $userId  ID of the user to reactivate
     * @param  User  $actor  The super_admin performing the action
     * @return bool Success status
     *
     * @throws \Exception
     */
    public function reactivateAdminUser(string $userId, User $actor): bool
    {
        $user = $this->userRepository->findById($userId);

        if (! $user) {
            throw new \Exception('User not found');
        }

        return DB::transaction(function () use ($user, $actor) {
            // Set is_active to true
            $this->userRepository->update($user, ['is_active' => true]);

            // Log the action
            $this->auditService->log(
                'admin_user_reactivate',
                'user',
                $user->id,
                $actor,
                ['reason' => 'Admin user reactivated'],
                ['is_active' => false],
                ['is_active' => true]
            );

            return true;
        });
    }

    /**
     * List admin users with filtering.
     *
     * Requirements: 10.3
     *
     * @param  array  $filters  Filtering options (role, is_active, search)
     */
    public function listAdminUsers(array $filters): LengthAwarePaginator
    {
        // Ensure we only get admin users
        $adminRoles = ['super_admin', 'admin', 'moderator'];

        // If role filter is provided, validate it's an admin role
        if (! empty($filters['role']) && ! in_array($filters['role'], $adminRoles, true)) {
            $filters['role'] = null;
        }

        // If no role filter, search only admin roles
        if (empty($filters['role'])) {
            // We'll need to modify the repository method or handle this differently
            // For now, we'll filter by each role
            $perPage = $filters['per_page'] ?? 20;

            $query = User::query()->whereIn('role', $adminRoles);

            if (array_key_exists('is_active', $filters) && $filters['is_active'] !== null) {
                $query->where('is_active', (bool) $filters['is_active']);
            }

            if (! empty($filters['search'])) {
                $term = '%'.strtolower(trim($filters['search'])).'%';
                $query->where('email', 'ilike', $term);
            }

            return $query->orderBy('created_at', 'desc')->paginate($perPage);
        }

        return $this->userRepository->searchAdmin($filters, $filters['per_page'] ?? 20);
    }

    /**
     * Get detailed information about an admin user.
     *
     * Requirements: 10.4
     *
     * @param  string  $userId  ID of the user
     * @return array User details with additional metadata
     *
     * @throws \Exception
     */
    public function getAdminUserDetails(string $userId): array
    {
        $user = $this->userRepository->findById($userId);

        if (! $user) {
            throw new \Exception('User not found');
        }

        // Get audit logs for this user (their actions)
        $recentActions = $this->auditService->query([
            'actor_id' => $userId,
            'per_page' => 10,
        ]);

        // Get invitation details if exists
        $invitation = AdminInvitation::where('email', $user->email)
            ->orderBy('created_at', 'desc')
            ->first();

        return [
            'user' => $user,
            'recent_actions' => $recentActions,
            'invitation' => $invitation,
            'active_tokens_count' => $user->tokens()->count(),
        ];
    }

    /**
     * Validate role transition rules.
     *
     * Requirements: 14.5
     *
     * @param  string  $currentRole  Current role
     * @param  string  $newRole  Desired new role
     * @return bool Whether the transition is valid
     */
    public function validateRoleTransition(string $currentRole, string $newRole): bool
    {
        // Same role is always valid (no-op)
        if ($currentRole === $newRole) {
            return true;
        }

        // Prevent direct moderator to super_admin transition
        if ($currentRole === 'moderator' && $newRole === 'super_admin') {
            return false;
        }

        // All other transitions are valid
        return true;
    }

    /**
     * Send invitation email to new admin user.
     *
     * Requirements: 15.2
     *
     * @param  User  $user  The user being invited
     * @param  AdminInvitation  $invitation  The invitation record
     * @param  User  $inviter  The user sending the invitation
     */
    public function sendInvitation(User $user, AdminInvitation $invitation, User $inviter): void
    {
        Mail::to($user->email)->queue(
            new AdminInvitationMail(
                $user->email,
                $user->role,
                $invitation->token,
                $inviter->email
            )
        );
    }

    /**
     * Resend invitation if token expires.
     *
     * Requirements: 15.6
     *
     * @param  string  $userId  ID of the user
     * @param  User  $actor  The super_admin resending the invitation
     * @return AdminInvitation New invitation
     *
     * @throws \Exception
     */
    public function resendInvitation(string $userId, User $actor): void
    {
        $user = $this->userRepository->findById($userId);

        if (! $user) {
            throw new \Exception('User not found');
        }

        // Find the most recent invitation
        $oldInvitation = AdminInvitation::where('email', $user->email)
            ->orderBy('created_at', 'desc')
            ->first();

        if (! $oldInvitation) {
            throw new \Exception('No invitation found for this user');
        }

        // Check if already accepted
        if ($oldInvitation->isAccepted()) {
            throw new \Exception('Invitation has already been accepted');
        }

        DB::transaction(function () use ($user, $oldInvitation, $actor) {
            // Revoke old invitation
            $oldInvitation->update(['revoked_at' => now()]);

            // Generate new invitation token
            $token = $this->generateInvitationToken();
            $expiresAt = now()->addDays(config('admin.invitation.token_expiration_days', 7));

            // Create new invitation record
            $newInvitation = AdminInvitation::create([
                'email' => $user->email,
                'role' => $user->role,
                'token' => $token,
                'invited_by' => $actor->id,
                'expires_at' => $expiresAt,
            ]);

            // Send invitation email
            $this->sendInvitation($user, $newInvitation, $actor);

            // Log the action
            $this->auditService->log(
                'admin_invitation_resend',
                'user',
                $user->id,
                $actor,
                [
                    'email' => $user->email,
                    'role' => $user->role,
                    'old_invitation_id' => $oldInvitation->id,
                    'new_invitation_id' => $newInvitation->id,
                ]
            );
        });
    }

    /**
     * Revoke invitation before acceptance.
     *
     * Requirements: 15.7
     *
     * @param  string  $userId  ID of the user
     * @param  User  $actor  The super_admin revoking the invitation
     *
     * @throws \Exception
     */
    public function revokeInvitation(string $userId, User $actor): void
    {
        $user = $this->userRepository->findById($userId);

        if (! $user) {
            throw new \Exception('User not found');
        }

        // Find the most recent invitation
        $invitation = AdminInvitation::where('email', $user->email)
            ->whereNull('accepted_at')
            ->whereNull('revoked_at')
            ->orderBy('created_at', 'desc')
            ->first();

        if (! $invitation) {
            throw new \Exception('No active invitation found for this user');
        }

        DB::transaction(function () use ($invitation, $user, $actor) {
            // Mark invitation as revoked
            $invitation->update(['revoked_at' => now()]);

            // Deactivate the user account
            $this->userRepository->update($user, ['is_active' => false]);

            // Log the action
            $this->auditService->log(
                'admin_invitation_revoke',
                'user',
                $user->id,
                $actor,
                [
                    'email' => $user->email,
                    'invitation_id' => $invitation->id,
                ]
            );
        });
    }

    /**
     * Generate a secure invitation token.
     */
    private function generateInvitationToken(): string
    {
        return Str::random(64);
    }
}
