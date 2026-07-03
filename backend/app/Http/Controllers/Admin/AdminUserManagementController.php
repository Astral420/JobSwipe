<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\InvalidRoleTransitionException;
use App\Exceptions\LastSuperAdminException;
use App\Exceptions\SelfModificationException;
use App\Http\Controllers\Controller;
use App\Services\AdminUserService;
use App\Services\AuditService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserManagementController extends Controller
{
    public function __construct(
        private AdminUserService $adminUserService,
        private AuditService $auditService,
    ) {}

    /**
     * List all admin users (super_admin, admin, moderator)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = [
                'role' => $request->input('role'),
                'is_active' => $request->has('is_active') ? $request->boolean('is_active') : null,
            ];

            $perPage = (int) $request->input('per_page', 20);
            $adminUsers = $this->adminUserService->listAdminUsers($filters, $perPage);

            return $this->success($adminUsers, 'Admin users retrieved successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Get admin user details
     */
    public function show(string $id): JsonResponse
    {
        try {
            $adminUser = $this->adminUserService->getAdminUserDetails($id);

            return $this->success($adminUser, 'Admin user details retrieved successfully.');
        } catch (Exception $e) {
            if (str_contains($e->getMessage(), 'not found')) {
                return $this->error('USER_NOT_FOUND', 'Admin user not found.', 404);
            }

            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Create a new admin user with invitation
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:admin,moderator',
        ]);

        try {
            $result = $this->adminUserService->createAdminUser(
                $validated['email'],
                $validated['role'],
                $request->user()
            );

            // Log audit
            $this->auditService->log(
                'admin_user_create',
                'user',
                $result['user']->id,
                $request->user(),
                [
                    'email' => $validated['email'],
                    'role' => $validated['role'],
                ]
            );

            return $this->success($result, 'Admin user created and invitation sent successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Update admin user role
     */
    public function updateRole(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role' => 'required|in:super_admin,admin,moderator',
        ]);

        try {
            $actor = $request->user();

            $updatedUser = $this->adminUserService->updateRole(
                $id,
                $validated['role'],
                $actor
            );

            return $this->success($updatedUser, 'Admin user role updated successfully.');
        } catch (SelfModificationException $e) {
            return $this->error(
                'SELF_MODIFICATION',
                $e->getMessage(),
                403
            );
        } catch (InvalidRoleTransitionException $e) {
            return $this->error(
                'INVALID_ROLE_TRANSITION',
                $e->getMessage(),
                422,
                [
                    'from_role' => $e->fromRole,
                    'to_role' => $e->toRole,
                    'reason' => $e->reason,
                ]
            );
        } catch (LastSuperAdminException $e) {
            return $this->error(
                'LAST_SUPER_ADMIN',
                $e->getMessage(),
                403
            );
        } catch (Exception $e) {
            if (str_contains($e->getMessage(), 'not found')) {
                return $this->error('USER_NOT_FOUND', 'Admin user not found.', 404);
            }

            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Deactivate an admin user
     */
    public function deactivate(string $id, Request $request): JsonResponse
    {
        try {
            $actor = $request->user();

            $result = $this->adminUserService->deactivateAdminUser($id, $actor);

            if (! $result) {
                return $this->error('DEACTIVATION_FAILED', 'Failed to deactivate admin user.', 500);
            }

            return $this->success(null, 'Admin user deactivated successfully.');
        } catch (SelfModificationException $e) {
            return $this->error(
                'SELF_MODIFICATION',
                $e->getMessage(),
                403
            );
        } catch (LastSuperAdminException $e) {
            return $this->error(
                'LAST_SUPER_ADMIN',
                $e->getMessage(),
                403
            );
        } catch (Exception $e) {
            if (str_contains($e->getMessage(), 'not found')) {
                return $this->error('USER_NOT_FOUND', 'Admin user not found.', 404);
            }

            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Reactivate an admin user
     */
    public function reactivate(string $id, Request $request): JsonResponse
    {
        try {
            $result = $this->adminUserService->reactivateAdminUser($id, $request->user());

            if (! $result) {
                return $this->error('REACTIVATION_FAILED', 'Failed to reactivate admin user.', 500);
            }

            return $this->success(null, 'Admin user reactivated successfully.');
        } catch (Exception $e) {
            if (str_contains($e->getMessage(), 'not found')) {
                return $this->error('USER_NOT_FOUND', 'Admin user not found.', 404);
            }

            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Resend invitation to an admin user
     */
    public function resendInvitation(string $id, Request $request): JsonResponse
    {
        try {
            $this->adminUserService->resendInvitation($id, $request->user());

            return $this->success(null, 'Invitation resent successfully.');
        } catch (Exception $e) {
            if (str_contains($e->getMessage(), 'not found')) {
                return $this->error('USER_NOT_FOUND', 'Admin user not found.', 404);
            }

            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Revoke invitation for an admin user
     */
    public function revokeInvitation(string $id, Request $request): JsonResponse
    {
        try {
            $this->adminUserService->revokeInvitation($id, $request->user());

            return $this->success(null, 'Invitation revoked successfully.');
        } catch (Exception $e) {
            if (str_contains($e->getMessage(), 'not found')) {
                return $this->error('INVITATION_NOT_FOUND', 'Invitation not found.', 404);
            }

            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }
}
