<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Repositories\PostgreSQL\UserRepository;
use App\Services\AdminService;
use App\Services\AuditService;
use App\Services\PermissionService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function __construct(
        private AdminService $adminService,
        private UserRepository $userRepository,
        private AuditService $auditService,
        private PermissionService $permissionService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            // Permission check is handled by middleware
            $filters = [
                'role' => $request->input('role'),
                'is_banned' => $request->has('is_banned') ? $request->boolean('is_banned') : null,
                'is_active' => $request->has('is_active') ? $request->boolean('is_active') : null,
                'search' => $request->input('search'),
            ];

            $perPage = (int) $request->input('per_page', 20);
            $users = $this->userRepository->searchAdmin($filters, $perPage);

            // Log audit
            $this->auditService->log(
                'user_list_view',
                'user',
                $request->user()->id,
                $request->user(),
                ['filters' => $filters]
            );

            return $this->success($users, 'Users retrieved successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        $user = $this->userRepository->findById($id);

        if (! $user) {
            return $this->error('USER_NOT_FOUND', 'User not found.', 404);
        }

        // Log audit
        $this->auditService->log(
            'user_view',
            'user',
            $id,
            request()->user(),
            ['viewed_user_role' => $user->role]
        );

        return $this->success($user, 'User retrieved successfully.');
    }

    public function ban(string $id, Request $request): JsonResponse
    {
        try {
            $actor = $request->user();

            // Additional permission check for super_admin only
            if (! $this->permissionService->hasPermission($actor, 'users.ban')) {
                return $this->error(
                    'PERMISSION_DENIED',
                    'Only super admins can ban users.',
                    403
                );
            }

            // Prevent self-ban
            if ($actor->id === $id) {
                return $this->error('CANNOT_BAN_SELF', 'You cannot ban yourself.', 422);
            }

            $targetUser = $this->userRepository->findById($id);
            if (! $targetUser) {
                return $this->error('USER_NOT_FOUND', 'User not found.', 404);
            }

            // Prevent banning other super admins
            if ($targetUser->role === 'super_admin') {
                return $this->error(
                    'CANNOT_BAN_ADMIN',
                    'Cannot ban super admin users.',
                    403
                );
            }

            $reason = $request->input('reason', 'No reason provided');
            $beforeState = ['is_banned' => $targetUser->is_banned];

            $user = $this->adminService->banUser($id, $actor->id);

            // Log audit
            $this->auditService->log(
                'user_ban',
                'user',
                $id,
                $actor,
                ['reason' => $reason],
                $beforeState,
                ['is_banned' => true]
            );

            return $this->success($user, 'User banned successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    public function unban(string $id, Request $request): JsonResponse
    {
        try {
            $actor = $request->user();

            // Additional permission check for super_admin only
            if (! $this->permissionService->hasPermission($actor, 'users.unban')) {
                return $this->error(
                    'PERMISSION_DENIED',
                    'Only super admins can unban users.',
                    403
                );
            }

            $targetUser = $this->userRepository->findById($id);
            if (! $targetUser) {
                return $this->error('USER_NOT_FOUND', 'User not found.', 404);
            }

            $reason = $request->input('reason', 'No reason provided');
            $beforeState = ['is_banned' => $targetUser->is_banned];

            $user = $this->adminService->unbanUser($id);

            // Log audit
            $this->auditService->log(
                'user_unban',
                'user',
                $id,
                $actor,
                ['reason' => $reason],
                $beforeState,
                ['is_banned' => false]
            );

            return $this->success($user, 'User unbanned successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }
}
