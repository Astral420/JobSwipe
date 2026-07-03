<?php

namespace App\Repositories\Redis;

use Carbon\Carbon;
use Illuminate\Support\Facades\Redis;

class SwipeCacheRepository
{
    // ── Counter ────────────────────────────────────────────────────────────

    private function counterKey(string $userId): string
    {
        $date = Carbon::now(config('app.timezone'))->toDateString();

        return "swipe:counter:{$userId}:{$date}";
    }

    public function getCounter(string $userId): ?int
    {
        $val = Redis::get($this->counterKey($userId));

        return $val !== null ? (int) $val : null;
    }

    public function incrementCounter(string $userId): int
    {
        $key = $this->counterKey($userId);
        $count = Redis::incr($key);

        // Set TTL to midnight PHT if this is the first increment
        if ($count === 1) {
            $secondsUntilMidnight = Carbon::now(config('app.timezone'))->secondsUntilEndOfDay();
            Redis::expire($key, $secondsUntilMidnight);
        }

        return $count;
    }

    public function refreshCounter(string $userId, int $count): void
    {
        $key = $this->counterKey($userId);
        $secondsUntilMidnight = Carbon::now(config('app.timezone'))->secondsUntilEndOfDay();
        Redis::set($key, $count, 'EX', $secondsUntilMidnight);
    }

    // ── Applicant deck dedup ────────────────────────────────────────────────

    private function deckSeenKey(string $userId): string
    {
        return "swipe:deck:seen:{$userId}";
    }

    public function hasSeenJob(string $userId, string $jobId): ?bool
    {
        // Returns null if key doesn't exist (cache miss), true/false otherwise
        if (! Redis::exists($this->deckSeenKey($userId))) {
            return null; // trigger fallback
        }

        return (bool) Redis::sismember($this->deckSeenKey($userId), $jobId);
    }

    public function markJobSeen(string $userId, string $jobId): void
    {
        $key = $this->deckSeenKey($userId);
        Redis::sadd($key, $jobId);
        Redis::expire($key, 90 * 86400); // 90 days
    }

    public function getSeenJobs(string $userId): ?array
    {
        $redisKey = "swipe:deck:seen:{$userId}";

        // smembers returns empty array if key doesn't exist, no race condition
        $members = Redis::smembers($redisKey);

        return $members !== false ? $members : null;
    }

    public function refreshDeckSeen(string $userId, array $jobIds): void
    {
        if (empty($jobIds)) {
            return;
        }
        $key = $this->deckSeenKey($userId);
        Redis::sadd($key, ...$jobIds);
        Redis::expire($key, 90 * 86400);
    }

    // ── HR applicant dedup ─────────────────────────────────────────────────

    private function hrSeenKey(string $hrUserId, string $jobPostingId): string
    {
        return "swipe:hr:seen:{$hrUserId}:{$jobPostingId}";
    }

    public function hasSeenApplicant(string $hrUserId, string $jobPostingId, string $applicantId): ?bool
    {
        $key = $this->hrSeenKey($hrUserId, $jobPostingId);
        if (! Redis::exists($key)) {
            return null; // trigger fallback
        }

        return (bool) Redis::sismember($key, $applicantId);
    }

    public function markApplicantSeenByHr(string $hrUserId, string $jobPostingId, string $applicantId): void
    {
        $key = $this->hrSeenKey($hrUserId, $jobPostingId);
        Redis::sadd($key, $applicantId);
        Redis::expire($key, 90 * 86400);
    }

    public function refreshHRSeen(string $hrUserId, string $jobPostingId, array $applicantIds): void
    {
        if (empty($applicantIds)) {
            return;
        }
        $key = $this->hrSeenKey($hrUserId, $jobPostingId);
        Redis::sadd($key, ...$applicantIds);
        Redis::expire($key, 90 * 86400);
    }

    // ── Points cache ───────────────────────────────────────────────────────

    public function getPoints(string $userId): ?int
    {
        $val = Redis::get("points:{$userId}");

        return $val !== null ? (int) $val : null;
    }

    public function setPoints(string $userId, int $points): void
    {
        Redis::set("points:{$userId}", $points, 'EX', 600); // 10 minutes
    }
}
