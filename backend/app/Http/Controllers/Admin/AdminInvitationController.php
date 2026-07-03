<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PostgreSQL\AdminInvitation;
use App\Models\PostgreSQL\User;
use App\Services\AuditService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminInvitationController extends Controller
{
    public function __construct(
        private AuditService $auditService,
    ) {}

    /**
     * Validate invitation token
     */
    public function validate(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'token' => 'required|string',
            ]);

            if ($validator->fails()) {
                return $this->error('VALIDATION_ERROR', $validator->errors()->first(), 422);
            }

            $invitation = AdminInvitation::where('token', $request->token)->first();

            if (! $invitation) {
                return $this->error('INVALID_TOKEN', 'Invalid invitation token.', 404);
            }

            if (! $invitation->isValid()) {
                $reason = $invitation->isExpired() ? 'expired' : ($invitation->isRevoked() ? 'revoked' : 'already accepted');

                return $this->error('INVALID_INVITATION', "This invitation has {$reason}.", 400);
            }

            return $this->success([
                'email' => $invitation->email,
                'role' => $invitation->role,
                'invited_by' => $invitation->inviter->name ?? 'Unknown',
                'expires_at' => $invitation->expires_at->toIso8601String(),
            ], 'Invitation is valid.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Accept invitation and set password
     */
    public function accept(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'token' => 'required|string',
                'password' => [
                    'required',
                    'string',
                    'min:12',
                    'regex:/[a-z]/',      // at least one lowercase letter
                    'regex:/[A-Z]/',      // at least one uppercase letter
                    'regex:/[0-9]/',      // at least one digit
                    'regex:/[@$!%*#?&]/', // at least one special character
                ],
                'password_confirmation' => 'required|same:password',
                'name' => 'required|string|max:255',
            ]);

            if ($validator->fails()) {
                return $this->error('VALIDATION_ERROR', $validator->errors()->first(), 422);
            }

            $invitation = AdminInvitation::where('token', $request->token)->first();

            if (! $invitation) {
                return $this->error('INVALID_TOKEN', 'Invalid invitation token.', 404);
            }

            if (! $invitation->isValid()) {
                $reason = $invitation->isExpired() ? 'expired' : ($invitation->isRevoked() ? 'revoked' : 'already accepted');

                return $this->error('INVALID_INVITATION', "This invitation has {$reason}.", 400);
            }

            // Check if user already exists
            $existingUser = User::where('email', strtolower(trim($invitation->email)))->first();
            if ($existingUser) {
                return $this->error('EMAIL_TAKEN', 'A user with this email already exists.', 409);
            }

            DB::beginTransaction();

            try {
                // Create the user
                $user = User::create([
                    'email' => strtolower(trim($invitation->email)),
                    'password_hash' => Hash::make($request->password),
                    'name' => $request->name,
                    'role' => $invitation->role,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]);

                // Mark invitation as accepted
                $invitation->update(['accepted_at' => now()]);

                // Log the acceptance
                $this->auditService->log(
                    actionType: 'admin_invitation_accepted',
                    resourceType: 'user',
                    resourceId: $user->id,
                    actor: $user,
                    metadata: [
                        'invitation_id' => $invitation->id,
                        'invited_by' => $invitation->invited_by,
                        'role' => $invitation->role,
                    ]
                );

                DB::commit();

                // Create token for immediate login
                $token = $user->createToken('admin-access')->plainTextToken;

                return $this->success([
                    'user' => [
                        'id' => $user->id,
                        'email' => $user->email,
                        'name' => $user->name,
                        'role' => $user->role,
                    ],
                    'token' => $token,
                ], 'Account activated successfully. Welcome to JobSwipe!');
            } catch (Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Resend invitation
     */
    public function resend(string $invitationId, Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (! $user->isSuperAdmin()) {
                return $this->error('PERMISSION_DENIED', 'Only super admins can resend invitations.', 403);
            }

            $invitation = AdminInvitation::find($invitationId);

            if (! $invitation) {
                return $this->error('INVITATION_NOT_FOUND', 'Invitation not found.', 404);
            }

            if ($invitation->isAccepted()) {
                return $this->error('ALREADY_ACCEPTED', 'This invitation has already been accepted.', 400);
            }

            // Generate new token and extend expiration
            $newToken = bin2hex(random_bytes(32));
            $invitation->update([
                'token' => $newToken,
                'expires_at' => now()->addDays(config('admin.invitation.token_expiration_days', 7)),
                'revoked_at' => null, // Clear revoked status if any
            ]);

            // Send new invitation email
            // TODO: Dispatch email job

            $this->auditService->log(
                actionType: 'admin_invitation_resent',
                resourceType: 'admin_invitation',
                resourceId: $invitation->id,
                actor: $user,
                metadata: [
                    'email' => $invitation->email,
                    'role' => $invitation->role,
                ]
            );

            return $this->success([
                'invitation_id' => $invitation->id,
                'expires_at' => $invitation->expires_at->toIso8601String(),
            ], 'Invitation resent successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Revoke invitation
     */
    public function revoke(string $invitationId, Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (! $user->isSuperAdmin()) {
                return $this->error('PERMISSION_DENIED', 'Only super admins can revoke invitations.', 403);
            }

            $invitation = AdminInvitation::find($invitationId);

            if (! $invitation) {
                return $this->error('INVITATION_NOT_FOUND', 'Invitation not found.', 404);
            }

            if ($invitation->isAccepted()) {
                return $this->error('ALREADY_ACCEPTED', 'Cannot revoke an accepted invitation.', 400);
            }

            if ($invitation->isRevoked()) {
                return $this->error('ALREADY_REVOKED', 'This invitation has already been revoked.', 400);
            }

            $invitation->update(['revoked_at' => now()]);

            $this->auditService->log(
                actionType: 'admin_invitation_revoked',
                resourceType: 'admin_invitation',
                resourceId: $invitation->id,
                actor: $user,
                metadata: [
                    'email' => $invitation->email,
                    'role' => $invitation->role,
                ]
            );

            return $this->success(null, 'Invitation revoked successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }
}
