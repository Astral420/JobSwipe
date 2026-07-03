<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminFlagJobRequest;
use App\Http\Requests\Admin\AdminJobFilterRequest;
use App\Repositories\PostgreSQL\JobPostingRepository;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class AdminJobController extends Controller
{
    public function __construct(
        private JobPostingRepository $jobs,
        private NotificationService $notifications,
        private AuditService $auditService,
    ) {}

    /**
     * List job postings with admin filtering.
     *
     * Requirements: 3.1
     */
    public function index(AdminJobFilterRequest $request): JsonResponse
    {
        try {
            $jobs = $this->jobs->searchAdmin(
                $request->validated(),
                $request->input('pageSize', 20)
            );

            return $this->success($jobs, 'Job postings retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Admin job listing failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to retrieve job postings', 500);
        }
    }

    /**
     * Get detailed job posting information.
     *
     * Requirements: 3.1
     */
    public function show(string $id): JsonResponse
    {
        try {
            $job = $this->jobs->findById($id);

            if (! $job) {
                return $this->error('JOB_NOT_FOUND', 'Job posting not found', 404);
            }

            // Load relationships for admin view
            $job->load(['company', 'skills']);

            return $this->success($job, 'Job posting retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Admin job detail retrieval failed', [
                'job_id' => $id,
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to retrieve job posting', 500);
        }
    }

    /**
     * Flag a job posting for moderation.
     *
     * Requirements: 3.2, 3.6
     */
    public function flag(string $id, AdminFlagJobRequest $request): JsonResponse
    {
        try {
            $job = $this->jobs->findById($id);

            if (! $job) {
                return $this->error('JOB_NOT_FOUND', 'Job posting not found', 404);
            }

            if ($job->is_flagged) {
                return $this->error('JOB_ALREADY_FLAGGED', 'Job posting is already flagged', 400);
            }

            $result = $this->jobs->flagJob(
                $id,
                $request->input('reason'),
                auth()->id()
            );

            if (! $result) {
                return $this->error('FLAG_FAILED', 'Failed to flag job posting', 500);
            }

            // Log audit
            $this->auditService->log(
                'job_flag',
                'job',
                $id,
                auth()->user(),
                ['reason' => $request->input('reason')],
                ['is_flagged' => false],
                ['is_flagged' => true]
            );

            // Notify company owner about flagged job
            if ($job->company && $job->company->owner_user_id) {
                $this->notifications->create(
                    userId: $job->company->owner_user_id,
                    type: 'job_flagged',
                    title: 'Job Posting Flagged',
                    body: "Your job posting '{$job->title}' has been flagged for review.",
                    data: [
                        'job_id' => $id,
                        'reason' => $request->input('reason'),
                    ]
                );
            }

            return $this->success(null, 'Job posting flagged successfully.');
        } catch (\Exception $e) {
            Log::error('Admin job flagging failed', [
                'job_id' => $id,
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to flag job posting', 500);
        }
    }

    /**
     * Unflag a job posting (restore to normal status).
     *
     * Requirements: 3.3, 3.6
     */
    public function unflag(string $id): JsonResponse
    {
        try {
            $job = $this->jobs->findById($id);

            if (! $job) {
                return $this->error('JOB_NOT_FOUND', 'Job posting not found', 404);
            }

            if (! $job->is_flagged) {
                return $this->error('JOB_NOT_FLAGGED', 'Job posting is not flagged', 400);
            }

            $result = $this->jobs->unflagJob($id, auth()->id());

            if (! $result) {
                return $this->error('UNFLAG_FAILED', 'Failed to unflag job posting', 500);
            }

            // Log audit
            $this->auditService->log(
                'job_unflag',
                'job',
                $id,
                auth()->user(),
                null,
                ['is_flagged' => true],
                ['is_flagged' => false]
            );

            // Notify company owner about unflagged job
            if ($job->company && $job->company->owner_user_id) {
                $this->notifications->create(
                    userId: $job->company->owner_user_id,
                    type: 'job_unflagged',
                    title: 'Job Posting Restored',
                    body: "Your job posting '{$job->title}' has been restored to active status.",
                    data: [
                        'job_id' => $id,
                    ]
                );
            }

            return $this->success(null, 'Job posting unflagged successfully.');
        } catch (\Exception $e) {
            Log::error('Admin job unflagging failed', [
                'job_id' => $id,
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to unflag job posting', 500);
        }
    }

    /**
     * Admin-initiated job closure.
     *
     * Requirements: 3.4, 3.6
     */
    public function close(string $id): JsonResponse
    {
        try {
            $job = $this->jobs->findById($id);

            if (! $job) {
                return $this->error('JOB_NOT_FOUND', 'Job posting not found', 404);
            }

            if ($job->status === 'closed') {
                return $this->error('JOB_ALREADY_CLOSED', 'Job posting is already closed', 400);
            }

            $result = $this->jobs->adminCloseJob($id, auth()->id());

            if (! $result) {
                return $this->error('CLOSE_FAILED', 'Failed to close job posting', 500);
            }

            // Log audit
            $this->auditService->log(
                'job_close',
                'job',
                $id,
                auth()->user(),
                null,
                ['status' => $job->status],
                ['status' => 'closed']
            );

            // Notify company owner about closed job
            if ($job->company && $job->company->owner_user_id) {
                $this->notifications->create(
                    userId: $job->company->owner_user_id,
                    type: 'job_admin_closed',
                    title: 'Job Posting Closed',
                    body: "Your job posting '{$job->title}' has been closed by an administrator.",
                    data: [
                        'job_id' => $id,
                    ]
                );
            }

            return $this->success(null, 'Job posting closed successfully.');
        } catch (\Exception $e) {
            Log::error('Admin job closure failed', [
                'job_id' => $id,
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to close job posting', 500);
        }
    }
}
