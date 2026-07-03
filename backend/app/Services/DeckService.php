<?php

namespace App\Services;

use App\Models\MongoDB\ApplicantProfileDocument;
use App\Models\MongoDB\CompanyProfileDocument;
use App\Models\PostgreSQL\JobPosting;
use App\Repositories\MongoDB\SwipeHistoryRepository;
use App\Repositories\Redis\SwipeCacheRepository;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class DeckService
{
    public function __construct(
        private SwipeCacheRepository $cache,
        private SwipeHistoryRepository $swipeHistory,
        private TrustScoreService $trustScore,
        private FileUploadService $fileUploads,
    ) {}

    /**
     * Get the job deck for an applicant with relevance-based sorting
     */
    public function getJobDeck(string $userId, int $perPage = 20, ?string $cursor = null): array
    {
        $perPage = max(1, min($perPage, 50));

        // 1. Sync historical seen jobs once, then query via PostgreSQL anti-join
        $this->ensureSeenJobsSynced($userId);

        // 2. Get applicant's profile data for skill matching
        $applicantProfile = ApplicantProfileDocument::where('user_id', $userId)->first();
        $applicantSkills = $applicantProfile?->skills ?? [];
        $applicantCity = $applicantProfile?->location_city;

        $baseUnseenQuery = $this->unseenJobsQuery($userId);

        // 3. Query exactly one page worth of unseen jobs using cursor pagination.
        // This avoids skipping jobs when relevance sorting is applied in-memory.
        $query = (clone $baseUnseenQuery)
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->with(['skills', 'company']);

        $decodedCursor = $this->decodeCursor($cursor);
        if ($decodedCursor !== null) {
            $this->applyCursor($query, $decodedCursor['published_at'], $decodedCursor['job_id']);
        }

        $candidatePool = $query
            ->limit($perPage + 1)
            ->get();

        $hasMore = $candidatePool->count() > $perPage;
        $jobs = $candidatePool->take($perPage)->values();

        // 4. Hydrate company data from MongoDB (logo_url, office_images)
        $companyIds = $jobs->pluck('company_id')->unique()->values()->toArray();
        $companyDocs = CompanyProfileDocument::whereIn('company_id', $companyIds)
            ->get()
            ->keyBy('company_id');

        // 5. Calculate relevance score for each job
        $scoredJobs = $jobs->map(function ($job) use ($applicantSkills, $applicantCity, $companyDocs) {
            $skillScore = $this->calculateSkillMatch($job, $applicantSkills);
            $recencyScore = $this->calculateRecencyScore($job);
            $locationBonus = $this->calculateLocationBonus($job, $applicantCity);
            $remoteBonus = $job->work_type === 'remote' ? 0.05 : 0;

            // Apply trust-based visibility multiplier
            $visibilityMultiplier = $this->trustScore->getVisibilityMultiplier($job->company_id);
            $baseScore = ($skillScore * 0.7) + ($recencyScore * 0.3) + $locationBonus + $remoteBonus;
            $job->relevance_score = $baseScore * $visibilityMultiplier;

            // City-level distance estimation (no geocoordinates available)
            $job->distance_km = $this->estimateCityDistance($job, $applicantCity);

            // Hydrate company with MongoDB assets (logo, office images)
            $doc = $companyDocs->get($job->company_id);
            if ($doc && $job->company) {
                $job->company->logo_url = $this->toSignedUrl($doc->logo_url);
                $job->company->office_images = array_map(
                    fn ($url) => $this->toSignedUrl($url),
                    $doc->office_images ?? []
                );
            }

            return $job;
        });

        // 6. Sort this page by relevance for presentation
        $sortedJobs = $scoredJobs
            ->sortByDesc('relevance_score')
            ->values();

        $nextCursor = null;
        if ($hasMore && $jobs->isNotEmpty()) {
            $nextCursor = $this->encodeCursor($jobs->last());
        }

        // Cache total unseen count for 30 seconds to avoid expensive COUNT(*) queries
        $cacheKey = $this->totalUnseenCacheKey($userId);
        $totalUnseen = Redis::get($cacheKey);

        if ($totalUnseen === null) {
            $totalUnseen = (clone $baseUnseenQuery)->count();
            Redis::setex($cacheKey, 30, $totalUnseen);
        } else {
            $totalUnseen = (int) $totalUnseen;
        }

        return [
            'jobs' => $sortedJobs,
            'has_more' => $hasMore,
            'total_unseen' => $totalUnseen,
            'next_cursor' => $nextCursor,
        ];
    }

    /**
     * Calculate skill match score between job requirements and applicant skills
     */
    private function calculateSkillMatch(JobPosting $job, array $applicantSkills): float
    {
        if (empty($applicantSkills) || $job->skills->isEmpty()) {
            return 0.0;
        }

        $jobSkillNames = $job->skills->pluck('skill_name')->map(fn ($s) => strtolower($s))->toArray();
        $applicantSkillNames = collect($applicantSkills)->pluck('name')->map(fn ($s) => strtolower($s))->toArray();

        $matchedSkills = array_intersect($jobSkillNames, $applicantSkillNames);
        $matchCount = count($matchedSkills);
        $totalJobSkills = count($jobSkillNames);

        if ($totalJobSkills === 0) {
            return 0.0;
        }

        // Return percentage of matched skills (0.0 to 1.0)
        return $matchCount / $totalJobSkills;
    }

    /**
     * Calculate recency score based on publication date
     */
    private function calculateRecencyScore(JobPosting $job): float
    {
        if (! $job->published_at) {
            return 0.4; // Default for unpublished/draft
        }

        $daysAgo = Carbon::now()->diffInDays($job->published_at);

        return match (true) {
            $daysAgo < 7 => 1.0,
            $daysAgo < 14 => 0.8,
            $daysAgo < 30 => 0.6,
            default => 0.4,
        };
    }

    /**
     * Calculate location bonus if job is in same city
     */
    private function calculateLocationBonus(JobPosting $job, ?string $applicantCity): float
    {
        if (! $applicantCity || ! $job->location_city) {
            return 0.0;
        }

        return strtolower($job->location_city) === strtolower($applicantCity) ? 0.1 : 0.0;
    }

    /**
     * Estimate distance based on city/region matching.
     * Returns a rough estimate since we lack lat/lng coordinates.
     */
    private function estimateCityDistance(JobPosting $job, ?string $applicantCity): float
    {
        if ($job->work_type === 'remote') {
            return 0.0;
        }

        if (! $applicantCity || ! $job->location_city) {
            return -1.0; // -1 signals "unknown" to the frontend
        }

        if (strtolower($job->location_city) === strtolower($applicantCity)) {
            return 0.0; // Same city
        }

        // Same region = nearby estimate
        if ($job->location_region) {
            return 25.0; // Different city but we have region info
        }

        return -1.0; // Different city, unknown distance
    }

    /**
     * Convert a raw R2 file URL to a pre-signed read URL.
     * Returns the original URL on failure (non-R2 URLs, missing config, etc.)
     */
    private function toSignedUrl(?string $url): ?string
    {
        if (! $url || $url === '') {
            return null;
        }

        try {
            $result = $this->fileUploads->generatePresignedReadUrl($url);

            return $result['read_url'] ?? $url;
        } catch (\Throwable) {
            return $url;
        }
    }

    /**
     * Get seen job IDs from MongoDB (authoritative) with Redis fallback
     */
    private function getSeenJobIds(string $userId): array
    {
        $seenIds = $this->swipeHistory->getSeenJobIds($userId);

        if (! empty($seenIds)) {
            $this->cache->refreshDeckSeen($userId, $seenIds);

            return $seenIds;
        }

        return $this->cache->getSeenJobs($userId) ?? [];
    }

    private function unseenJobsQuery(string $userId): Builder
    {
        return JobPosting::active()
            ->whereNotNull('published_at')
            ->whereNotExists(function ($query) use ($userId) {
                $query->selectRaw('1')
                    ->from('applicant_seen_jobs as seen_jobs')
                    ->whereColumn('seen_jobs.job_id', 'job_postings.id')
                    ->where('seen_jobs.user_id', $userId);
            });
    }

    private function ensureSeenJobsSynced(string $userId): void
    {
        $syncKey = $this->seenJobsSyncKey($userId);

        if (Redis::exists($syncKey)) {
            return;
        }

        $seenJobIds = array_values(array_unique($this->getSeenJobIds($userId)));

        if (empty($seenJobIds)) {
            Redis::set($syncKey, '1', 'EX', 90 * 86400);

            return;
        }

        $this->upsertSeenJobsToPostgres($userId, $seenJobIds);
        Redis::set($syncKey, '1', 'EX', 90 * 86400);
    }

    private function upsertSeenJobsToPostgres(string $userId, array $jobIds): void
    {
        $timestamp = now();

        foreach (array_chunk($jobIds, 1000) as $jobIdChunk) {
            $rows = [];

            foreach ($jobIdChunk as $jobId) {
                $rows[] = [
                    'user_id' => $userId,
                    'job_id' => (string) $jobId,
                    'seen_at' => $timestamp,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }

            DB::connection('pgsql')
                ->table('applicant_seen_jobs')
                ->upsert($rows, ['user_id', 'job_id'], ['seen_at', 'updated_at']);
        }
    }

    private function seenJobsSyncKey(string $userId): string
    {
        return "swipe:deck:seen:pgsync:{$userId}";
    }

    private function totalUnseenCacheKey(string $userId): string
    {
        return "deck:total_unseen:{$userId}";
    }

    /**
     * Invalidate the total unseen count cache for a user
     * Called when a user swipes on a job to ensure fresh count
     */
    public function invalidateTotalUnseenCache(string $userId): void
    {
        Redis::del($this->totalUnseenCacheKey($userId));
    }

    private function applyCursor(Builder $query, Carbon $publishedAt, string $jobId): void
    {
        $query->where(function (Builder $builder) use ($publishedAt, $jobId) {
            $builder->where('published_at', '<', $publishedAt)
                ->orWhere(function (Builder $inner) use ($publishedAt, $jobId) {
                    $inner->where('published_at', '=', $publishedAt)
                        ->where('id', '<', $jobId);
                });
        });
    }

    private function decodeCursor(?string $cursor): ?array
    {
        if ($cursor === null || trim($cursor) === '') {
            return null;
        }

        $decoded = base64_decode($cursor, true);

        if ($decoded === false) {
            return null;
        }

        $data = json_decode($decoded, true);

        if (! is_array($data) || ! isset($data['published_at'], $data['job_id'])) {
            return null;
        }

        try {
            $publishedAt = Carbon::parse((string) $data['published_at']);
        } catch (\Throwable) {
            return null;
        }

        $jobId = (string) $data['job_id'];
        if ($jobId === '') {
            return null;
        }

        return [
            'published_at' => $publishedAt,
            'job_id' => $jobId,
        ];
    }

    private function encodeCursor(JobPosting $job): string
    {
        $publishedAt = $job->published_at?->toIso8601String();

        return base64_encode((string) json_encode([
            'published_at' => $publishedAt,
            'job_id' => (string) $job->id,
        ]));
    }
}
