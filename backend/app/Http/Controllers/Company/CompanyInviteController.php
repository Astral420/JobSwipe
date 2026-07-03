<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\BulkInviteRequest;
use App\Http\Requests\Company\CreateInviteRequest;
use App\Services\CompanyInvitationService;
use App\Services\CompanyMembershipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class CompanyInviteController extends Controller
{
    public function __construct(
        private CompanyInvitationService $invitations,
        private CompanyMembershipService $memberships,
    ) {}

    /**
     * Create a new company invite and dispatch magic-link email.
     * POST /api/v1/company/invites
     */
    public function store(CreateInviteRequest $request): JsonResponse
    {
        $user = $request->user();
        $company = $this->memberships->getPrimaryCompanyForUser($user->id);

        if (! $company) {
            return $this->error('NO_COMPANY_PROFILE', 'No company profile found.', 403);
        }

        try {
            $result = $this->invitations->createInvite(
                companyId: $company->id,
                inviterUserId: $user->id,
                email: $request->input('email'),
                inviteRole: $request->input('role'),
            );

            $invite = $result['invite'];

            return $this->success([
                'invite' => [
                    'id' => $invite->id,
                    'email' => $invite->email,
                    'role' => $invite->invite_role,
                    'status' => 'pending',
                    'expires_at' => $invite->expires_at,
                    'invite_email_sent_at' => $invite->invite_email_sent_at,
                    'created_at' => $invite->created_at,
                ],
            ], 'Invite sent successfully.');

        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'INVITE_EMAIL_FAILED') {
                return $this->error('INVITE_EMAIL_FAILED', 'The invite was created but the email could not be sent.', 500);
            }

            return $this->error('INVITE_FAILED', 'Failed to create invite.', 500);
        } catch (InvalidArgumentException $e) {
            return match ($e->getMessage()) {
                'INVITE_FORBIDDEN' => $this->error('INVITE_FORBIDDEN', 'Only company admins can create invites.', 403),
                'INVITE_ROLE_INVALID' => $this->error('INVITE_ROLE_INVALID', 'Invalid invite role.', 422),
                'INVITE_EMAIL_INVALID' => $this->error('INVITE_EMAIL_INVALID', 'Invalid email address.', 422),
                default => $this->error('INVITE_FAILED', $e->getMessage(), 400),
            };
        }
    }

    /**
     * Bulk invite — up to 20 emails at once.
     * POST /api/v1/company/invites/bulk
     */
    public function bulkStore(BulkInviteRequest $request): JsonResponse
    {
        $user = $request->user();
        $company = $this->memberships->getPrimaryCompanyForUser($user->id);

        if (! $company) {
            return $this->error('NO_COMPANY_PROFILE', 'No company profile found.', 403);
        }

        try {
            $result = $this->invitations->createBulkInvites(
                companyId: $company->id,
                inviterUserId: $user->id,
                emails: $request->input('emails'),
                inviteRole: $request->input('role')
            );

            return $this->success($result, 'Bulk invites processed.');
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 'Bulk invite failed.', 403);
        }
    }

    /**
     * Resend an invite email
     *
     * POST /api/v1/company/invites/{inviteId}/resend
     */
    public function resend(Request $request, string $inviteId): JsonResponse
    {
        $user = $request->user();
        $company = $this->memberships->getPrimaryCompanyForUser($user->id);

        if (! $company) {
            return $this->error('NO_COMPANY_PROFILE', 'No company profile found.', 403);
        }

        try {
            $result = $this->invitations->resendInvite($company->id, $user->id, $inviteId);

            return $this->success([
                'invite' => [
                    'id' => $result['invite']->id,
                    'email' => $result['invite']->email,
                    'invite_email_sent_at' => $result['invite']->invite_email_sent_at,
                ],
            ], 'Invite resent successfully.');
        } catch (InvalidArgumentException $e) {
            return match ($e->getMessage()) {
                'INVITE_FORBIDDEN' => $this->error('INVITE_FORBIDDEN', 'Only company admins can resend invites.', 403),
                'INVITE_NOT_FOUND' => $this->error('INVITE_NOT_FOUND', 'Invite not found.', 404),
                'INVITE_ALREADY_ACCEPTED' => $this->error('INVITE_ALREADY_ACCEPTED', 'Cannot resend an accepted invite.', 400),
                default => $this->error('RESEND_FAILED', $e->getMessage(), 400),
            };
        }
    }

    /**
     * List all invites for the company
     *
     * GET /api/v1/company/invites
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $company = $this->memberships->getPrimaryCompanyForUser($user->id);

        if (! $company) {
            return $this->error('NO_COMPANY_PROFILE', 'No company profile found.', 403);
        }

        $statusFilter = $request->query('status');

        try {
            $invites = $this->invitations->listInvites($company->id, $user->id);

            $mapped = $invites->map(fn ($invite) => [
                'id' => $invite->id,
                'email' => $invite->email,
                'role' => $invite->invite_role,
                'status' => $this->getInviteStatus($invite),
                'expires_at' => $invite->expires_at,
                'accepted_at' => $invite->accepted_at,
                'revoked_at' => $invite->revoked_at,
                'invite_email_sent_at' => $invite->invite_email_sent_at,
                'created_at' => $invite->created_at,
            ]);

            // Optional status filter (Req 14 AC 4)
            if ($statusFilter) {
                $mapped = $mapped->filter(fn ($i) => $i['status'] === $statusFilter)->values();
            }

            return $this->success(['invites' => $mapped]);

        } catch (InvalidArgumentException $e) {
            return $this->error('INVITE_FORBIDDEN', 'Only company admins can view invites.', 403);
        }
    }

    /**
     * Revoke a pending invite.
     * DELETE /api/v1/company/invites/{inviteId}
     */
    public function destroy(Request $request, string $inviteId): JsonResponse
    {
        $user = $request->user();
        $company = $this->memberships->getPrimaryCompanyForUser($user->id);

        if (! $company) {
            return $this->error('NO_COMPANY_PROFILE', 'No company profile found.', 403);
        }

        try {
            $invite = $this->invitations->revokeInvite($company->id, $user->id, $inviteId);

            return $this->success([
                'invite' => [
                    'id' => $invite->id,
                    'email' => $invite->email,
                    'revoked_at' => $invite->revoked_at,
                ],
            ], 'Invite revoked successfully.');

        } catch (InvalidArgumentException $e) {
            return match ($e->getMessage()) {
                'INVITE_FORBIDDEN' => $this->error('INVITE_FORBIDDEN', 'Only company admins can revoke invites.', 403),
                'INVITE_NOT_FOUND' => $this->error('INVITE_NOT_FOUND', 'Invite not found.', 404),
                'INVITE_ALREADY_ACCEPTED' => $this->error('INVITE_ALREADY_ACCEPTED', 'Cannot revoke an accepted invite.', 400),
                default => $this->error('REVOKE_FAILED', $e->getMessage(), 400),
            };
        }
    }

    /**
     * Validate an invite token — used by registration flow (public endpoint).
     * POST /api/v1/company/invites/validate
     */
    public function validate(Request $request): JsonResponse
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'email' => 'required|email',
            'token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->error('VALIDATION_FAILED', $validator->errors()->first(), 422);
        }

        try {
            $invite = $this->invitations->validateInviteToken(
                $request->input('email'),
                $request->input('token'),
            );

            $company = $invite->company;
            $inviterName = $invite->invitedBy?->email ?? 'Your administrator';

            return $this->success([
                'valid' => true,
                'company_name' => $company?->company_name ?? 'Unknown Company',
                'company_logo_url' => $company?->logo_url ?? null,
                'role' => $invite->invite_role,
                'inviter_name' => $inviterName,
                'expires_at' => $invite->expires_at,
            ]);

        } catch (InvalidArgumentException $e) {
            return match ($e->getMessage()) {
                'INVITE_EXPIRED' => $this->error('INVITE_EXPIRED', 'This invite link has expired.', 400),
                'INVITE_ALREADY_ACCEPTED' => $this->error('INVITE_ALREADY_ACCEPTED', 'This invite has already been used.', 400),
                default => $this->error('INVITE_INVALID', 'Invalid or expired invite token.', 400),
            };
        }
    }

    // ──────────────────────────────────────────────────────────────────────────

    private function getInviteStatus($invite): string
    {
        if ($invite->accepted_at !== null) {
            return 'accepted';
        }

        if ($invite->revoked_at !== null) {
            return 'revoked';
        }

        if ($invite->expires_at < now()) {
            return 'expired';
        }

        return 'pending';
    }
}
