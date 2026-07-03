<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\JobPosting;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class JobPostingRepository
{
    public function findById(string $id): ?JobPosting
    {
        return JobPosting::find($id);
    }

    public function create(array $data): JobPosting
    {
        return JobPosting::create($data);
    }

    public function update(JobPosting $job, array $data): JobPosting
    {
        $job->update($data);

        return $job->fresh();
    }

    public function delete(JobPosting $job): bool
    {
        return $job->delete();
    }

    public function getActive(int $perPage = 15): LengthAwarePaginator
    {
        return JobPosting::active()
            ->with(['company', 'skills'])
            ->orderBy('published_at', 'desc')
            ->paginate($perPage);
    }

    public function getByCompany(string $companyId): Collection
    {
        return JobPosting::where('company_id', $companyId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getActiveByCompany(string $companyId): Collection
    {
        return JobPosting::active()
            ->where('company_id', $companyId)
            ->orderBy('published_at', 'desc')
            ->get();
    }

    public function markAsExpired(string $jobId): void
    {
        JobPosting::where('id', $jobId)->update([
            'status' => 'expired',
        ]);
    }

    /**
     * Get expiring jobs (for cron job)
     */
    public function getExpiring(): Collection
    {
        return JobPosting::where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->get();
    }

    public function searchByLocation(string $city, ?string $region = null): Collection
    {
        $query = JobPosting::active()->where('location_city', $city);

        if ($region) {
            $query->where('location_region', $region);
        }

        return $query->get();
    }

    public function countTotal(): int
    {
        return JobPosting::count();
    }

    public function countActive(): int
    {
        return JobPosting::active()->count();
    }

    /**
     * Admin search with comprehensive filtering.
     * Supports filtering by status, company, date range, and search terms.
     *
     * Requirements: 3.1
     */
    public function searchAdmin(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $query = JobPosting::query()
            ->with(['company', 'skills'])
            ->withTrashed(); // Include soft-deleted jobs for admin view

        // Filter by status
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Filter by company
        if (! empty($filters['companyId'])) {
            $query->where('company_id', $filters['companyId']);
        }

        // Filter by date range
        if (! empty($filters['startDate'])) {
            $query->whereDate('created_at', '>=', $filters['startDate']);
        }

        if (! empty($filters['endDate'])) {
            $query->whereDate('created_at', '<=', $filters['endDate']);
        }

        // Filter by flagged status
        if (isset($filters['isFlagged'])) {
            $query->where('is_flagged', (bool) $filters['isFlagged']);
        }

        // Search by title or description
        if (! empty($filters['search'])) {
            $searchTerm = $filters['search'];
            $query->where(function ($q) use ($searchTerm) {
                $q->where('title', 'ILIKE', "%{$searchTerm}%")
                    ->orWhere('description', 'ILIKE', "%{$searchTerm}%");
            });
        }

        // Order by most recent first
        $query->orderBy('created_at', 'desc');

        return $query->paginate($perPage);
    }

    /**
     * Flag a job posting for moderation.
     * Sets is_flagged to true and records the reason.
     *
     * Requirements: 3.2, 3.5
     */
    public function flagJob(string $jobId, string $reason, string $actorId): bool
    {
        try {
            DB::beginTransaction();

            $updated = JobPosting::where('id', $jobId)->update([
                'is_flagged' => true,
                'flag_reason' => $reason,
                'flagged_at' => now(),
                'flagged_by' => $actorId,
            ]);

            // Log audit trail
            $this->logAuditAction(
                action: 'flag_job',
                jobId: $jobId,
                actorId: $actorId,
                details: ['reason' => $reason]
            );

            DB::commit();

            return $updated > 0;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to flag job posting', [
                'job_id' => $jobId,
                'actor_id' => $actorId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Unflag a job posting (restore to normal status).
     * Sets is_flagged to false and clears flag-related fields.
     *
     * Requirements: 3.3, 3.5
     */
    public function unflagJob(string $jobId, string $actorId): bool
    {
        try {
            DB::beginTransaction();

            $updated = JobPosting::where('id', $jobId)->update([
                'is_flagged' => false,
                'flag_reason' => null,
                'flagged_at' => null,
                'flagged_by' => null,
            ]);

            // Log audit trail
            $this->logAuditAction(
                action: 'unflag_job',
                jobId: $jobId,
                actorId: $actorId,
                details: []
            );

            DB::commit();

            return $updated > 0;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to unflag job posting', [
                'job_id' => $jobId,
                'actor_id' => $actorId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Admin-initiated job closure.
     * Sets status to closed and records the admin action.
     *
     * Requirements: 3.4, 3.5
     */
    public function adminCloseJob(string $jobId, string $actorId): bool
    {
        try {
            DB::beginTransaction();

            $updated = JobPosting::where('id', $jobId)->update([
                'status' => 'closed',
                'closed_at' => now(),
                'closed_by' => $actorId,
            ]);

            // Log audit trail
            $this->logAuditAction(
                action: 'admin_close_job',
                jobId: $jobId,
                actorId: $actorId,
                details: []
            );

            DB::commit();

            return $updated > 0;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to close job posting', [
                'job_id' => $jobId,
                'actor_id' => $actorId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Log audit trail for job moderation actions.
     * Uses Laravel's logging system for audit trail.
     *
     * Requirements: 3.5
     */
    private function logAuditAction(string $action, string $jobId, string $actorId, array $details): void
    {
        Log::channel('admin_audit')->info("Job moderation action: {$action}", [
            'action' => $action,
            'job_id' => $jobId,
            'actor_id' => $actorId,
            'details' => $details,
            'timestamp' => now()->toIso8601String(),
            'ip_address' => request()->ip(),
        ]);
    }
}
