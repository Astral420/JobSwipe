<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Services\CompanyMembershipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class CompanyMemberController extends Controller
{
    public function __construct(
        private CompanyMembershipService $memberships,
    ) {}

    /**
     * List all active HR members with their profile data.
     * GET /api/v1/company/members
     * Req 7.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $company = $this->memberships->getPrimaryCompanyForUser($user->id);

        if (! $company) {
            return $this->error('NO_COMPANY_PROFILE', 'No company profile found.', 403);
        }

        $members = $this->memberships->listMembers($company->id);

        $data = $members->map(function ($membership) {
            $u = $membership->user;
            $profile = $u?->hrProfile;

            return [
                'user_id' => $membership->user_id,
                'email' => $u?->email,
                'first_name' => $profile?->first_name ?? null,
                'last_name' => $profile?->last_name ?? null,
                'job_title' => $profile?->job_title ?? null,
                'photo_url' => $profile?->photo_url ?? null,
                'membership_role' => $membership->membership_role,
                'status' => $membership->status,
                'joined_at' => $membership->joined_at,
            ];
        });

        return $this->success([
            'members' => $data,
            'total' => $data->count(),
        ]);
    }

    /**
     * Revoke an active HR member's access and terminate their sessions.
     * DELETE /api/v1/company/members/{userId}/revoke
     * Req 8 + Req 9.
     */
    public function revoke(Request $request, string $userId): JsonResponse
    {
        $admin = $request->user();
        $company = $this->memberships->getPrimaryCompanyForUser($admin->id);

        if (! $company) {
            return $this->error('NO_COMPANY_PROFILE', 'No company profile found.', 403);
        }

        try {
            $membership = $this->memberships->revokeMember(
                companyId: $company->id,
                adminUserId: $admin->id,
                targetUserId: $userId,
            );

            return $this->success([
                'user_id' => $membership->user_id,
                'status' => $membership->status,
                'revoked_at' => $membership->revoked_at,
            ], 'Member access revoked. All sessions terminated immediately.');

        } catch (InvalidArgumentException $e) {
            return match ($e->getMessage()) {
                'INVITE_FORBIDDEN' => $this->error('FORBIDDEN', 'Only company admins can revoke members.', 403),
                'CANNOT_REVOKE_OWNER' => $this->error('CANNOT_REVOKE_OWNER', 'The company owner cannot be revoked.', 400),
                'CANNOT_REVOKE_SELF' => $this->error('CANNOT_REVOKE_SELF', 'You cannot revoke your own access.', 400),
                'MEMBER_NOT_FOUND' => $this->error('MEMBER_NOT_FOUND', 'Member not found in this company.', 404),
                default => $this->error('REVOKE_FAILED', $e->getMessage(), 400),
            };
        }
    }

    /**
     * Return the full membership audit log for the company.
     * GET /api/v1/company/audit-log
     * Req 20 AC 5.
     */
    public function auditLog(Request $request): JsonResponse
    {
        $user = $request->user();
        $company = $this->memberships->getPrimaryCompanyForUser($user->id);

        if (! $company) {
            return $this->error('NO_COMPANY_PROFILE', 'No company profile found.', 403);
        }

        $records = $this->memberships->listAllForAudit($company->id);

        $data = $records->map(fn ($m) => [
            'user_id' => $m->user_id,
            'email' => $m->user?->email,
            'membership_role' => $m->membership_role,
            'status' => $m->status,
            'invited_by_email' => $m->invitedBy?->email,
            'revoked_by_email' => $m->revokedBy?->email,
            'joined_at' => $m->joined_at,
            'revoked_at' => $m->revoked_at,
            'created_at' => $m->created_at,
        ]);

        return $this->success(['records' => $data, 'total' => $data->count()]);
    }
}
