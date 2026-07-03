<?php

namespace App\Services;

use App\Models\PostgreSQL\AuditLog;
use App\Models\PostgreSQL\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;

class AuditService
{
    /**
     * Log an admin action to the audit trail.
     *
     * Requirements: 12.1, 12.4
     *
     * @param  string  $actionType  The type of action performed (e.g., 'user_ban', 'company_suspend')
     * @param  string  $resourceType  The type of resource affected (e.g., 'user', 'company', 'job')
     * @param  string  $resourceId  The ID of the affected resource
     * @param  User  $actor  The user performing the action
     * @param  array|null  $metadata  Additional action-specific metadata
     * @param  array|null  $beforeState  State of the resource before the action
     * @param  array|null  $afterState  State of the resource after the action
     */
    public function log(
        string $actionType,
        string $resourceType,
        string $resourceId,
        User $actor,
        ?array $metadata = null,
        ?array $beforeState = null,
        ?array $afterState = null
    ): AuditLog {
        // Get IP address and user agent from current request
        $request = request();
        $ipAddress = $request ? $request->ip() : null;
        $userAgent = $request ? $request->userAgent() : null;

        return AuditLog::create([
            'action_type' => $actionType,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'actor_id' => $actor->id,
            'actor_role' => $actor->role,
            'metadata' => $metadata,
            'before_state' => $beforeState,
            'after_state' => $afterState,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
        ]);
    }

    /**
     * Query audit logs with filtering and pagination.
     *
     * Requirements: 12.2, 12.7
     *
     * @param  array  $filters  Filtering options:
     *                          - actor_id: Filter by admin user ID
     *                          - action_type: Filter by action type
     *                          - resource_type: Filter by resource type
     *                          - resource_id: Filter by specific resource ID
     *                          - date_from: Filter logs from this date (Y-m-d format)
     *                          - date_to: Filter logs until this date (Y-m-d format)
     * @param  int  $perPage  Number of results per page (default: 20)
     */
    public function query(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $query = AuditLog::query()->with('actor');

        // Filter by actor (admin user)
        if (! empty($filters['actor_id'])) {
            $query->where('actor_id', $filters['actor_id']);
        }

        // Filter by action type
        if (! empty($filters['action_type'])) {
            $query->where('action_type', $filters['action_type']);
        }

        // Filter by resource type
        if (! empty($filters['resource_type'])) {
            $query->where('resource_type', $filters['resource_type']);
        }

        // Filter by specific resource ID
        if (! empty($filters['resource_id'])) {
            $query->where('resource_id', $filters['resource_id']);
        }

        // Filter by date range
        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        // Order by most recent first
        $query->orderBy('created_at', 'desc');

        return $query->paginate($perPage);
    }

    /**
     * Find audit log by ID.
     */
    public function findById(string $id): ?AuditLog
    {
        return AuditLog::with('actor')->find($id);
    }

    /**
     * Export audit logs to CSV format.
     *
     * Requirements: 12.8
     *
     * @param  array  $filters  Same filtering options as query() method
     * @return string Path to the generated CSV file
     */
    public function export(array $filters): string
    {
        // Get all matching logs (without pagination)
        $query = AuditLog::query()->with('actor');

        // Apply same filters as query method
        if (! empty($filters['actor_id'])) {
            $query->where('actor_id', $filters['actor_id']);
        }

        if (! empty($filters['action_type'])) {
            $query->where('action_type', $filters['action_type']);
        }

        if (! empty($filters['resource_type'])) {
            $query->where('resource_type', $filters['resource_type']);
        }

        if (! empty($filters['resource_id'])) {
            $query->where('resource_id', $filters['resource_id']);
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        $query->orderBy('created_at', 'desc');

        $logs = $query->get();

        // Generate CSV content
        $csvContent = $this->generateCsvContent($logs);

        // Generate unique filename
        $filename = 'audit_logs_'.now()->format('Y-m-d_His').'.csv';
        $path = 'exports/'.$filename;

        // Store the CSV file
        Storage::disk('local')->put($path, $csvContent);

        return storage_path('app/'.$path);
    }

    /**
     * Get all available action types from configuration.
     */
    public function getActionTypes(): array
    {
        return config('admin.audit.action_types', []);
    }

    /**
     * Generate CSV content from audit logs.
     *
     * @param  \Illuminate\Support\Collection  $logs
     */
    private function generateCsvContent($logs): string
    {
        $csv = [];

        // CSV header
        $csv[] = [
            'ID',
            'Action Type',
            'Resource Type',
            'Resource ID',
            'Actor ID',
            'Actor Email',
            'Actor Role',
            'Metadata',
            'Before State',
            'After State',
            'IP Address',
            'User Agent',
            'Created At',
        ];

        // CSV rows
        foreach ($logs as $log) {
            $csv[] = [
                $log->id,
                $log->action_type,
                $log->resource_type,
                $log->resource_id,
                $log->actor_id,
                $log->actor->email ?? 'N/A',
                $log->actor_role,
                json_encode($log->metadata),
                json_encode($log->before_state),
                json_encode($log->after_state),
                $log->ip_address,
                $log->user_agent,
                $log->created_at->toIso8601String(),
            ];
        }

        // Convert array to CSV string
        $output = fopen('php://temp', 'r+');
        foreach ($csv as $row) {
            fputcsv($output, $row);
        }
        rewind($output);
        $csvString = stream_get_contents($output);
        fclose($output);

        return $csvString;
    }
}
