<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use App\Services\PermissionService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAuditLogController extends Controller
{
    public function __construct(
        private AuditService $auditService,
        private PermissionService $permissionService,
    ) {}

    /**
     * List audit logs with filtering
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Check if user can view all logs or only their own
            $canViewAll = $this->permissionService->hasPermission($user, 'audit.view_all');

            $filters = [
                'action_type' => $request->input('action_type'),
                'resource_type' => $request->input('resource_type'),
                'resource_id' => $request->input('resource_id'),
                'date_from' => $request->input('date_from'),
                'date_to' => $request->input('date_to'),
            ];

            // If user can only view their own logs, add actor filter
            if (! $canViewAll) {
                $filters['actor_id'] = $user->id;
            } else {
                // Super admin can filter by specific actor
                $filters['actor_id'] = $request->input('actor_id');
            }

            $perPage = (int) $request->input('per_page', 20);
            $logs = $this->auditService->query($filters, $perPage);

            return $this->success($logs, 'Audit logs retrieved successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Get audit log details
     */
    public function show(string $id, Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $log = $this->auditService->findById($id);

            if (! $log) {
                return $this->error('AUDIT_LOG_NOT_FOUND', 'Audit log not found.', 404);
            }

            // Check if user can view this log
            $canViewAll = $this->permissionService->hasPermission($user, 'audit.view_all');

            if (! $canViewAll && $log->actor_id !== $user->id) {
                return $this->error(
                    'PERMISSION_DENIED',
                    'You can only view your own audit logs.',
                    403
                );
            }

            return $this->success($log, 'Audit log retrieved successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Export audit logs to CSV
     */
    public function export(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Only super admins can export
            if (! $this->permissionService->hasPermission($user, 'audit.export')) {
                return $this->error(
                    'PERMISSION_DENIED',
                    'Only super admins can export audit logs.',
                    403
                );
            }

            $filters = [
                'action_type' => $request->input('action_type'),
                'resource_type' => $request->input('resource_type'),
                'actor_id' => $request->input('actor_id'),
                'date_from' => $request->input('date_from'),
                'date_to' => $request->input('date_to'),
            ];

            $csvPath = $this->auditService->export($filters);

            return $this->success([
                'file_path' => $csvPath,
                'download_url' => url("storage/{$csvPath}"),
            ], 'Audit logs exported successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Get available action types for filtering
     */
    public function actionTypes(): JsonResponse
    {
        try {
            $actionTypes = $this->auditService->getActionTypes();

            return $this->success($actionTypes, 'Action types retrieved successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }
}
