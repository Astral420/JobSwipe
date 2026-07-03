<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\Application;
use Illuminate\Database\Eloquent\Collection;

class ApplicationRepository
{
    public function findById(string $id): ?Application
    {
        return Application::find($id);
    }

    public function findByIdOrFail(string $id): Application
    {
        return Application::findOrFail($id);
    }

    public function create(string $applicantId, string $jobPostingId): Application
    {
        return Application::create([
            'applicant_id' => $applicantId,
            'job_posting_id' => $jobPostingId,
            'status' => 'applied',
        ]);
    }

    public function markInvited(string $applicantId, string $jobPostingId, string $message): int
    {
        return Application::where('applicant_id', $applicantId)
            ->where('job_posting_id', $jobPostingId)
            ->update([
                'status' => 'invited',
                'invitation_message' => $message,
                'invited_at' => now(),
            ]);
    }

    public function exists(string $applicantId, string $jobPostingId): bool
    {
        return Application::where('applicant_id', $applicantId)
            ->where('job_posting_id', $jobPostingId)
            ->exists();
    }

    public function getPrioritizedApplicants(string $jobPostingId, int $perPage = 20)
    {
        return Application::with('applicant')
            ->join('applicant_profiles', 'applications.applicant_id',
                '=', 'applicant_profiles.id')
            ->where('applications.job_posting_id', $jobPostingId)
            ->where('applications.status', 'applied')
            ->orderByRaw("
             CASE
                    WHEN applicant_profiles.subscription_tier = 'pro'
                     AND applicant_profiles.total_points >= 100 THEN 1
                    WHEN applicant_profiles.subscription_tier = 'pro'
                     AND applicant_profiles.total_points < 100  THEN 2
                    WHEN applicant_profiles.subscription_tier != 'pro'
                     AND applicant_profiles.total_points >= 50  THEN 3
                    WHEN applicant_profiles.subscription_tier != 'pro'
                     AND applicant_profiles.total_points BETWEEN 1 AND 49 THEN 4
                    ELSE 5
                END ASC,
                applications.created_at ASC
            ")
            ->select('applications.*')
            ->paginate($perPage);
    }

    public function update(Application $application, array $data): Application
    {
        $application->update($data);

        return $application->fresh();
    }

    public function hasApplied(string $applicantId, string $jobPostingId): bool
    {
        return Application::where('applicant_id', $applicantId)
            ->where('job_posting_id', $jobPostingId)
            ->exists();
    }

    public function getByApplicant(string $applicantId): Collection
    {
        return Application::where('applicant_id', $applicantId)
            ->with(['jobPosting.company'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getByJobPosting(string $jobPostingId): Collection
    {
        return Application::where('job_posting_id', $jobPostingId)
            ->with('applicant.user')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getPending(string $jobPostingId): Collection
    {
        return Application::where('job_posting_id', $jobPostingId)
            ->where('status', 'applied')
            ->with('applicant.user')
            ->get();
    }

    public function updateStatus(string $applicationId, string $status): void
    {
        Application::where('id', $applicationId)->update(['status' => $status]);
    }

    public function countByStatus(string $jobPostingId, string $status): int
    {
        return Application::where('job_posting_id', $jobPostingId)
            ->where('status', $status)
            ->count();
    }

    /**
     * Fetch prioritized applicants across ALL active jobs for a given company.
     * Uses the same tier/points ordering as getPrioritizedApplicants().
     */
    public function getPrioritizedApplicantsForCompany(string $companyId, int $perPage = 20)
    {
        return Application::with(['applicant', 'jobPosting.skills'])
            ->join('applicant_profiles', 'applications.applicant_id', '=', 'applicant_profiles.id')
            ->join('job_postings', 'applications.job_posting_id', '=', 'job_postings.id')
            ->where('job_postings.company_id', $companyId)
            ->whereNull('job_postings.deleted_at')
            ->where('job_postings.status', 'active')
            ->where('applications.status', 'applied')
            ->orderByRaw("
                CASE
                    WHEN applicant_profiles.subscription_tier = 'pro'
                     AND applicant_profiles.total_points >= 100 THEN 1
                    WHEN applicant_profiles.subscription_tier = 'pro'
                     AND applicant_profiles.total_points < 100  THEN 2
                    WHEN applicant_profiles.subscription_tier != 'pro'
                     AND applicant_profiles.total_points >= 50  THEN 3
                    WHEN applicant_profiles.subscription_tier != 'pro'
                     AND applicant_profiles.total_points BETWEEN 1 AND 49 THEN 4
                    ELSE 5
                END ASC,
                applications.created_at ASC
            ")
            ->select('applications.*')
            ->paginate($perPage);
    }

    /**
     * Check if an applicant has applied to at least one job at a company
     */
    public function hasAppliedToCompany(string $applicantId, string $companyId): bool
    {
        return Application::where('applications.applicant_id', $applicantId)
            ->join('job_postings', 'applications.job_posting_id', '=', 'job_postings.id')
            ->where('job_postings.company_id', $companyId)
            ->exists();
    }
}
