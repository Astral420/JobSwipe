<?php

namespace App\Services;

use App\Mail\MembershipRevokedMail;
use App\Models\PostgreSQL\CompanyMembership;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use App\Repositories\PostgreSQL\CompanyProfileRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use InvalidArgumentException;

class CompanyMembershipService
{
    public function __construct(
        private CompanyProfileRepository $companyProfiles,
    ) {}

    /**
     * Add (or reactivate) a member in a company.
     */
    public function addMember(
        string $companyId,
        string $userId,
        string $role,
        ?string $invitedByUserId = null
    ): CompanyMembership {
        $membership = CompanyMembership::firstOrNew([
            'company_id' => $companyId,
            'user_id' => $userId,
        ]);

        $membership->membership_role = $role;
        $membership->status = 'active';
        $membership->invited_by_user_id = $invitedByUserId;
        $membership->joined_at = $membership->exists ? $membership->joined_at : now();
        $membership->save();

        return $membership;
    }

    /**
     * Revoke an active member. Terminates all Sanctum sessions atomically.
     * Req 8 + Req 9.
     */
    public function revokeMember(
        string $companyId,
        string $adminUserId,
        string $targetUserId
    ): CompanyMembership {
        if (! $this->isAdmin($companyId, $adminUserId)) {
            throw new InvalidArgumentException('INVITE_FORBIDDEN');
        }

        if ($adminUserId === $targetUserId) {
            throw new InvalidArgumentException('CANNOT_REVOKE_SELF');
        }

        // Resolve company to check ownership
        $company = $this->companyProfiles->findById($companyId);

        if ($company && (string) $company->owner_user_id === $targetUserId) {
            throw new InvalidArgumentException('CANNOT_REVOKE_OWNER');
        }

        $membership = CompanyMembership::query()
            ->where('company_id', $companyId)
            ->where('user_id', $targetUserId)
            ->where('status', 'active')
            ->first();

        if (! $membership) {
            throw new InvalidArgumentException('MEMBER_NOT_FOUND');
        }

        // Atomic: update membership + delete all sessions in one transaction
        DB::transaction(function () use ($membership, $adminUserId, $targetUserId, $companyId) {
            $membership->update([
                'status' => 'inactive',
                'revoked_at' => now(),
                'revoked_by_user_id' => $adminUserId,
            ]);

            // Terminate all Sanctum tokens instantly (Req 9 AC 1)
            $targetUser = User::find($targetUserId);
            if ($targetUser) {
                $targetUser->tokens()->delete();

                // Dispatch revocation email if feature is enabled (Req 12 AC 4)
                if (config('features.revocation_email', false)) {
                    $company = $this->companyProfiles->findById($companyId);
                    if ($company) {
                        try {
                            Mail::to($targetUser->email)
                                ->queue(new MembershipRevokedMail($targetUser, $company));
                        } catch (\Throwable $e) {
                            Log::error('CompanyMembershipService: Failed to queue revocation email', [
                                'user_id' => $targetUserId,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                }
            }
        });

        return $membership->fresh();
    }

    /**
     * List all active members of a company with their HR profile data.
     * Req 7.
     */
    public function listMembers(string $companyId): Collection
    {
        return CompanyMembership::query()
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->with([
                'user:id,email',
                'user.hrProfile:user_id,first_name,last_name,job_title,photo_url',
            ])
            ->orderByDesc('joined_at')
            ->get();
    }

    /**
     * Return all membership records for a company for the audit log.
     * Req 20 AC 5.
     */
    public function listAllForAudit(string $companyId): Collection
    {
        return CompanyMembership::query()
            ->where('company_id', $companyId)
            ->with([
                'user:id,email',
                'invitedBy:id,email',
                'revokedBy:id,email',
            ])
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Check if a user is an active admin of a company.
     */
    public function isAdmin(string $companyId, string $userId): bool
    {
        return CompanyMembership::query()
            ->where('company_id', $companyId)
            ->where('user_id', $userId)
            ->where('membership_role', 'company_admin')
            ->where('status', 'active')
            ->exists();
    }

    /**
     * Check if a user has an active membership in a company.
     * Req 10 — used by MembershipActiveMiddleware.
     */
    public function isActiveMember(string $companyId, string $userId): bool
    {
        return CompanyMembership::query()
            ->where('company_id', $companyId)
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->exists();
    }

    /**
     * Get the membership record for a user in a company.
     */
    public function getMembership(string $companyId, string $userId): ?CompanyMembership
    {
        return CompanyMembership::query()
            ->where('company_id', $companyId)
            ->where('user_id', $userId)
            ->first();
    }

    /**
     * Resolve the primary company for a user (via their company profile ownership or membership).
     */
    public function getPrimaryCompanyForUser(string $userId): ?CompanyProfile
    {
        return $this->companyProfiles->findByUserId($userId);
    }
}
