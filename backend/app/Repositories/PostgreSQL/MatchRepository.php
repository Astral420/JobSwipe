<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\MatchRecord;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class MatchRepository
{
    public function create(array $data): MatchRecord
    {
        return MatchRecord::create($data);
    }

    public function findById(string $id): ?MatchRecord
    {
        return MatchRecord::find($id);
    }

    public function findByIdOrFail(string $id): MatchRecord
    {
        return MatchRecord::findOrFail($id);
    }

    public function findByIdOrFailForUpdate(string $id): MatchRecord
    {
        return MatchRecord::where('id', $id)
            ->lockForUpdate()
            ->with(['applicant'])
            ->firstOrFail();

    }

    public function findByApplicationId(string $applicationId): ?MatchRecord
    {
        return MatchRecord::where('application_id', $applicationId)->first();
    }

    public function getForApplicant(string $applicantId, ?string $status = null, int $perPage = 20): LengthAwarePaginator
    {
        $query = MatchRecord::where('applicant_id', $applicantId)
            ->with(['jobPosting.company', 'hrUser', 'application']);

        if ($status) {
            $query->where('status', $status);
        }

        return $query->orderByRaw("
            CASE status
                WHEN 'pending' THEN 1
                WHEN 'accepted' THEN 2
                WHEN 'closed' THEN 3
                WHEN 'expired' THEN 4
                WHEN 'declined' THEN 5
            END ASC,
            matched_at DESC
        ")->paginate($perPage);
    }

    public function getForHrUser(string $hrUserId, ?string $jobId = null, ?string $status = null, int $perPage = 20): LengthAwarePaginator
    {
        $query = MatchRecord::where('hr_user_id', $hrUserId)
            ->with(['applicant.user', 'jobPosting', 'application']);

        if ($jobId) {
            $query->where('job_posting_id', $jobId);
        }

        if ($status) {
            $query->where('status', $status);
        }

        return $query->orderByRaw("
            CASE status
                WHEN 'pending' THEN 1
                WHEN 'accepted' THEN 2
                WHEN 'closed' THEN 3
                WHEN 'expired' THEN 4
                WHEN 'declined' THEN 5
            END ASC,
            matched_at DESC
        ")->paginate($perPage);
    }

    public function getForJobPosting(string $jobPostingId): Collection
    {
        return MatchRecord::where('job_posting_id', $jobPostingId)
            ->with(['applicant.user', 'application'])
            ->orderBy('matched_at', 'desc')
            ->get();
    }

    public function getPendingExpired(): Collection
    {
        return MatchRecord::where('status', 'pending')
            ->where('response_deadline', '<=', now())
            ->get();
    }

    public function expirePendingForApplicant(string $applicantId): int
    {
        return MatchRecord::where('applicant_id', $applicantId)
            ->where('status', 'pending')
            ->where('response_deadline', '<=', now())
            ->update(['status' => 'expired']);
    }

    public function expirePendingForHrUser(string $hrUserId): int
    {
        return MatchRecord::where('hr_user_id', $hrUserId)
            ->where('status', 'pending')
            ->where('response_deadline', '<=', now())
            ->update(['status' => 'expired']);
    }

    public function updateStatus(string $id, string $status): int
    {
        return MatchRecord::where('id', $id)->update(['status' => $status]);
    }

    public function expireIfPendingAndDeadlinePassed(string $id): int
    {
        return MatchRecord::where('id', $id)
            ->where('status', 'pending')
            ->where('response_deadline', '<=', now())
            ->update(['status' => 'expired']);
    }

    public function accept(string $id): int
    {
        return MatchRecord::where('id', $id)->update([
            'status' => 'accepted',
            'responded_at' => now(),
        ]);
    }

    public function acceptIfPendingBeforeDeadline(string $id): int
    {
        return MatchRecord::where('id', $id)
            ->where('status', 'pending')
            ->where('response_deadline', '>', now())
            ->update([
                'status' => 'accepted',
                'responded_at' => now(),
            ]);
    }

    public function decline(string $id): int
    {
        return MatchRecord::where('id', $id)->update([
            'status' => 'declined',
            'responded_at' => now(),
        ]);
    }

    public function declineIfPendingBeforeDeadline(string $id): int
    {
        return MatchRecord::where('id', $id)
            ->where('status', 'pending')
            ->where('response_deadline', '>', now())
            ->update([
                'status' => 'declined',
                'responded_at' => now(),
            ]);
    }

    public function close(string $id, string $closedByUserId): int
    {
        return MatchRecord::where('id', $id)->update([
            'status' => 'closed',
            'closed_at' => now(),
            'closed_by' => $closedByUserId,
        ]);
    }

    public function closeIfAccepted(string $id, string $closedByUserId): int
    {
        return MatchRecord::where('id', $id)
            ->where('status', 'accepted')
            ->update([
                'status' => 'closed',
                'closed_at' => now(),
                'closed_by' => $closedByUserId,
            ]);
    }

    public function getUnreadMessageCount(string $matchId, string $userId): int
    {
        return \App\Models\PostgreSQL\MatchMessage::where('match_id', $matchId)
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->count();
    }

    /**
     * Search matches for admin with filters
     */
    public function searchAdmin(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $query = MatchRecord::with(['applicant.user', 'jobPosting.company', 'hrUser']);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['applicant_id'])) {
            $query->where('applicant_id', $filters['applicant_id']);
        }

        if (! empty($filters['job_posting_id'])) {
            $query->where('job_posting_id', $filters['job_posting_id']);
        }

        if (! empty($filters['company_id'])) {
            $query->whereHas('jobPosting', function ($q) use ($filters) {
                $q->where('company_id', $filters['company_id']);
            });
        }

        if (! empty($filters['date_from'])) {
            $query->where('matched_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->where('matched_at', '<=', $filters['date_to']);
        }

        return $query->orderBy('matched_at', 'desc')->paginate($perPage);
    }

    /**
     * Count all matches
     */
    public function countAll(): int
    {
        return MatchRecord::count();
    }

    /**
     * Count matches by status
     */
    public function countByStatus(string $status): int
    {
        return MatchRecord::where('status', $status)->count();
    }

    /**
     * Count matches created today
     */
    public function countCreatedToday(): int
    {
        return MatchRecord::whereDate('matched_at', today())->count();
    }

    /**
     * Count matches created this week
     */
    public function countCreatedThisWeek(): int
    {
        return MatchRecord::whereBetween('matched_at', [
            now()->startOfWeek(),
            now()->endOfWeek(),
        ])->count();
    }

    /**
     * Count matches created this month
     */
    public function countCreatedThisMonth(): int
    {
        return MatchRecord::whereYear('matched_at', now()->year)
            ->whereMonth('matched_at', now()->month)
            ->count();
    }

    /**
     * Calculate average response time in hours
     */
    public function averageResponseTime(): float
    {
        $avg = MatchRecord::whereNotNull('responded_at')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (responded_at - matched_at)) / 3600) as avg_hours')
            ->value('avg_hours');

        return round((float) $avg, 2);
    }
}
