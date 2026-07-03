<?php

namespace App\Services;

use App\Models\PostgreSQL\ApplicantProfile;
use App\Models\PostgreSQL\Application;
use App\Repositories\MongoDB\SwipeHistoryRepository;
use App\Repositories\PostgreSQL\ApplicationRepository;
use App\Repositories\Redis\SwipeCacheRepository;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class SwipeService
{
    public function __construct(
        private SwipeCacheRepository $cache,
        private SwipeHistoryRepository $swipeHistory,
        private ApplicationRepository $applications,
        private MatchService $matchService,
        private DeckService $deckService,
    ) {}

    // ── Applicant swipes right on a job ────────────────────────────────────

    public function applicantSwipeRight(string $userId, string $jobId): array
    {
        $applicant = ApplicantProfile::where('user_id', $userId)->firstOrFail();

        // 1. Deduplication — Redis first, MongoDB fallback
        if ($this->hasAlreadySwiped($userId, $jobId, 'job_posting')) {
            return ['status' => 'already_swiped'];
        }

        // MongoDB Write

        $swipeDoc = $this->swipeHistory->recordSwipe([
            'user_id' => $userId,
            'actor_type' => 'applicant',
            'direction' => 'right',
            'target_id' => $jobId,
            'target_type' => 'job_posting',
            'job_posting_id' => null,
            'meta' => [
                'subscription_tier' => $applicant->subscription_tier,
                'daily_swipe_count_at_time' => $this->cache->getCounter($userId) ?? 0,
            ],
        ]);

        try {
            DB::transaction(function () use ($applicant, $userId, $jobId) {
                if (! $this->consumeApplicantSwipeAtomically((string) $applicant->id)) {
                    throw new \RuntimeException('SWIPE_LIMIT_REACHED');
                }

                $this->applications->create($applicant->id, $jobId);
                $this->markJobSeenInPostgres($userId, $jobId);
            });
        } catch (QueryException $e) {
            if ($swipeDoc && $swipeDoc->_id) {
                $this->swipeHistory->deleteById($swipeDoc->_id);
            }

            $sqlState = $e->errorInfo[0] ?? $e->getCode();
            if (in_array((string) $sqlState, ['23000', '23505'], true)) {
                return ['status' => 'already_swiped'];
            }
            throw $e;
        } catch (\RuntimeException $e) {
            if ($swipeDoc && $swipeDoc->_id) {
                $this->swipeHistory->deleteById($swipeDoc->_id);
            }

            if ($e->getMessage() === 'SWIPE_LIMIT_REACHED') {
                return ['status' => 'limit_reached'];
            }

            throw $e;
        } catch (\Throwable $e) {
            // Rollback MongoDB write if PostgreSQL fails
            if ($swipeDoc && $swipeDoc->_id) {
                $this->swipeHistory->deleteById($swipeDoc->_id);
            }
            throw $e;
        }

        // 5. Update Redis cache
        $this->cache->markJobSeen($userId, $jobId);
        $this->cache->incrementCounter($userId);

        // Invalidate total unseen count cache since user just swiped
        $this->deckService->invalidateTotalUnseenCache($userId);

        return ['status' => 'applied'];
    }

    // ── Applicant swipes left on a job ─────────────────────────────────────

    public function applicantSwipeLeft(string $userId, string $jobId): array
    {
        $applicant = ApplicantProfile::where('user_id', $userId)->firstOrFail();

        // 1. Deduplication check
        if ($this->hasAlreadySwiped($userId, $jobId, 'job_posting')) {
            return ['status' => 'already_swiped'];
        }

        // 3. Write to MongoDB first
        $swipeDoc = $this->swipeHistory->recordSwipe([
            'user_id' => $userId,
            'actor_type' => 'applicant',
            'direction' => 'left',
            'target_id' => $jobId,
            'target_type' => 'job_posting',
            'job_posting_id' => null,
            'meta' => ['subscription_tier' => $applicant->subscription_tier],
        ]);

        // 4. Update PostgreSQL counter in transaction
        try {
            DB::transaction(function () use ($applicant, $userId, $jobId) {
                if (! $this->consumeApplicantSwipeAtomically((string) $applicant->id)) {
                    throw new \RuntimeException('SWIPE_LIMIT_REACHED');
                }

                $this->markJobSeenInPostgres($userId, $jobId);
            });
        } catch (\RuntimeException $e) {
            if ($swipeDoc && $swipeDoc->_id) {
                $this->swipeHistory->deleteById($swipeDoc->_id);
            }

            if ($e->getMessage() === 'SWIPE_LIMIT_REACHED') {
                return ['status' => 'limit_reached'];
            }

            throw $e;
        } catch (\Throwable $e) {
            // Rollback MongoDB write if PostgreSQL fails
            if ($swipeDoc && $swipeDoc->_id) {
                $this->swipeHistory->deleteById($swipeDoc->_id);
            }
            throw $e;
        }

        // 5. Update Redis cache
        $this->cache->markJobSeen($userId, $jobId);
        $this->cache->incrementCounter($userId);

        // Invalidate total unseen count cache since user just swiped
        $this->deckService->invalidateTotalUnseenCache($userId);

        return ['status' => 'dismissed'];
    }

    // ── HR swipes right on an applicant (sends invitation) ─────────────────

    public function hrSwipeRight(string $hrUserId, string $jobId, string $applicantId, string $message): array
    {
        // 1. Deduplication check
        if ($this->hasHrAlreadySwiped($hrUserId, $jobId, $applicantId)) {
            return ['status' => 'already_swiped'];
        }

        if (! $this->applications->exists($applicantId, $jobId)) {
            return ['status' => 'application_not_found'];
        }

        // 2. Write to MongoDB first, then update PostgreSQL
        $swipeDoc = $this->swipeHistory->recordSwipe([
            'user_id' => $hrUserId,
            'actor_type' => 'hr',
            'direction' => 'right',
            'target_id' => $applicantId,
            'target_type' => 'applicant',
            'job_posting_id' => $jobId,
            'meta' => [],
        ]);

        try {
            $application = Application::where('applicant_id', $applicantId)
                ->where('job_posting_id', $jobId)
                ->firstOrFail();

            $this->matchService->createMatch(
                applicationId: $application->id,
                applicantId: $applicantId,
                jobId: $jobId,
                hrUserId: $hrUserId,
                initialMessage: $message,
            );
        } catch (\RuntimeException $e) {
            if ($swipeDoc && $swipeDoc->_id) {
                $this->swipeHistory->deleteById($swipeDoc->_id);
            }

            if ($e->getMessage() === 'APPLICATION_NOT_FOUND') {
                return ['status' => 'application_not_found'];
            }

            throw $e;
        } catch (QueryException $e) {
            if ($swipeDoc && $swipeDoc->_id) {
                $this->swipeHistory->deleteById($swipeDoc->_id);
            }

            $sqlState = $e->errorInfo[0] ?? $e->getCode();
            if (in_array((string) $sqlState, ['23000', '23505'], true)) {
                return ['status' => 'already_swiped'];
            }

            throw $e;
        } catch (\Throwable $e) {
            if ($swipeDoc && $swipeDoc->_id) {
                $this->swipeHistory->deleteById($swipeDoc->_id);
            }

            throw $e;
        }

        // 3. Update Redis cache
        $this->cache->markApplicantSeenByHr($hrUserId, $jobId, $applicantId);

        return ['status' => 'matched'];
    }

    // ── HR swipes left on an applicant ─────────────────────────────────────

    public function hrSwipeLeft(string $hrUserId, string $jobId, string $applicantId): array
    {
        // 1. Deduplication check
        if ($this->hasHrAlreadySwiped($hrUserId, $jobId, $applicantId)) {
            return ['status' => 'already_swiped'];
        }

        // 2. Write to MongoDB only (no PostgreSQL update needed for dismissals)
        $this->swipeHistory->recordSwipe([
            'user_id' => $hrUserId,
            'actor_type' => 'hr',
            'direction' => 'left',
            'target_id' => $applicantId,
            'target_type' => 'applicant',
            'job_posting_id' => $jobId,
            'meta' => [],
        ]);

        // 3. Update Redis cache
        $this->cache->markApplicantSeenByHr($hrUserId, $jobId, $applicantId);

        return ['status' => 'dismissed'];
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private function consumeApplicantSwipeAtomically(string $applicantId): bool
    {
        // Lock row so limit checks and decrements are authoritative under concurrency.
        $applicant = ApplicantProfile::query()->lockForUpdate()->find($applicantId);
        if (! $applicant) {
            return false;
        }

        $today = now()->toDateString();
        $lastResetDate = $applicant->swipe_reset_at?->toDateString();

        if ($lastResetDate !== $today) {
            $applicant->update([
                'daily_swipes_used' => 0,
                'swipe_reset_at' => $today,
            ]);
            $applicant->refresh();
        }

        if ($applicant->daily_swipes_used < $applicant->daily_swipe_limit) {
            $applicant->increment('daily_swipes_used');

            return true;
        }

        if ($applicant->extra_swipe_balance > 0) {
            $applicant->decrement('extra_swipe_balance');

            return true;
        }

        return false;
    }

    private function hasAlreadySwiped(string $userId, string $targetId, string $targetType): bool
    {
        // Try Redis first
        $cached = $this->cache->hasSeenJob($userId, $targetId);

        if ($cached !== null) {
            return $cached;
        }

        // Fallback to MongoDB
        $exists = $this->swipeHistory->hasSwipedOn($userId, $targetId, $targetType);

        // Rehydrate Redis cache if MongoDB had the data
        if ($exists) {
            $this->cache->markJobSeen($userId, $targetId);
            $this->markJobSeenInPostgres($userId, $targetId);
        }

        return $exists;
    }

    private function markJobSeenInPostgres(string $userId, string $jobId): void
    {
        $timestamp = now();

        DB::connection('pgsql')
            ->table('applicant_seen_jobs')
            ->upsert(
                [[
                    'user_id' => $userId,
                    'job_id' => $jobId,
                    'seen_at' => $timestamp,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ]],
                ['user_id', 'job_id'],
                ['seen_at', 'updated_at']
            );
    }

    private function hasHrAlreadySwiped(string $hrUserId, string $jobId, string $applicantId): bool
    {
        // Try Redis first
        $cached = $this->cache->hasSeenApplicant($hrUserId, $jobId, $applicantId);

        if ($cached !== null) {
            return $cached;
        }

        // Fallback to MongoDB
        $exists = $this->swipeHistory->hasHrSwipedOn($hrUserId, $jobId, $applicantId);

        // Rehydrate Redis cache if MongoDB had the data
        if ($exists) {
            $this->cache->markApplicantSeenByHr($hrUserId, $jobId, $applicantId);
        }

        return $exists;
    }
}
