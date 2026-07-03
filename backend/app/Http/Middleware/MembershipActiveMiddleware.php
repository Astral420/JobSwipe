<?php

namespace App\Http\Middleware;

use App\Services\CompanyMembershipService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verifies that an authenticated HR member or company_admin has an active
 * membership in their company. Applied after auth:sanctum + role middleware.
 *
 * Returns 403 MEMBERSHIP_INACTIVE if status = 'inactive'.
 * Returns 403 NO_MEMBERSHIP if no record exists at all.
 *
 * Req 10.
 */
class MembershipActiveMiddleware
{
    public function __construct(
        private CompanyMembershipService $memberships,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Only enforce for HR / company_admin roles
        if (! $user || ! in_array($user->role, ['hr', 'company_admin'], true)) {
            return $next($request);
        }

        // Try to find company via active membership first
        $company = $this->memberships->getPrimaryCompanyForUser($user->id);

        // If no active membership found, check if there's an inactive one
        if (! $company) {
            $membership = \App\Models\PostgreSQL\CompanyMembership::where('user_id', $user->id)->first();

            if ($membership && $membership->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Your membership has been revoked.',
                    'code' => 'MEMBERSHIP_INACTIVE',
                ], 403);
            }

            return response()->json([
                'success' => false,
                'message' => 'No company membership found.',
                'code' => 'NO_MEMBERSHIP',
            ], 403);
        }

        $membership = $this->memberships->getMembership($company->id, $user->id);

        if (! $membership) {
            $isLegacyOwner = (string) ($company->user_id ?? '') === (string) $user->id
                || (string) ($company->owner_user_id ?? '') === (string) $user->id;

            if ($isLegacyOwner) {
                $membershipRole = $user->role === 'company_admin' ? 'company_admin' : 'hr';
                $membership = $this->memberships->addMember($company->id, $user->id, $membershipRole);
            }
        }

        if (! $membership) {
            return response()->json([
                'success' => false,
                'message' => 'No company membership found.',
                'code' => 'NO_MEMBERSHIP',
            ], 403);
        }

        if ($membership->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Your membership has been revoked.',
                'code' => 'MEMBERSHIP_INACTIVE',
            ], 403);
        }

        return $next($request);
    }
}
