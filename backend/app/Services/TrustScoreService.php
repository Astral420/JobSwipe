<?php

namespace App\Services;

use App\Models\PostgreSQL\CompanyProfile;
use App\Repositories\MongoDB\CompanyReviewDocumentRepository;
use App\Repositories\PostgreSQL\CompanyProfileRepository;
use App\Repositories\PostgreSQL\CompanyReviewRepository;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class TrustScoreService
{
    public function __construct(
        private CompanyProfileRepository $companyProfiles,
        private CompanyReviewRepository $reviewRepository,
        private CompanyReviewDocumentRepository $reviewDocs,
    ) {}

    /**
     * Calculate and persist the trust score for a company.
     */
    public function recalculate(string $companyId): array
    {
        $company = $this->companyProfiles->findById($companyId);

        if (! $company) {
            return [];
        }

        $components = $this->calculateComponents($company);
        $totalScore = min(100, max(0, array_sum($components)));
        $trustLevel = $this->resolveLevel($totalScore);
        $listingCap = $this->resolveListingCap(
            $trustLevel,
            $company->subscription_tier,
            $company->subscription_status
        );

        $this->companyProfiles->update($company, [
            'trust_score' => $totalScore,
            'trust_level' => $trustLevel,
            'listing_cap' => $listingCap,
        ]);

        $this->cacheScore($companyId, $totalScore, $trustLevel, $listingCap);

        return [
            'company_id' => $companyId,
            'components' => $components,
            'total_score' => $totalScore,
            'trust_level' => $trustLevel,
            'listing_cap' => $listingCap,
        ];
    }

    /**
     * Get cached trust score, or recalculate if stale.
     */
    public function getScore(string $companyId): array
    {
        $cached = $this->getCachedScore($companyId);

        if ($cached !== null) {
            return $cached;
        }

        return $this->recalculate($companyId);
    }

    /**
     * Record a trust-affecting event and recalculate.
     */
    public function recordEvent(string $companyId, string $eventType, int $scoreDelta, array $metadata = []): void
    {
        $company = $this->companyProfiles->findById($companyId);

        if (! $company) {
            return;
        }

        $eventId = (string) Str::uuid();

        DB::connection('pgsql')->table('trust_events')->insert([
            'id' => $eventId,
            'company_id' => $companyId,
            'event_type' => $eventType,
            'score_delta' => $scoreDelta,
            'score_after' => 0,
            'metadata' => json_encode($metadata),
            'created_at' => now(),
        ]);

        $result = $this->recalculate($companyId);
        $scoreAfter = (int) ($result['total_score'] ?? 0);

        DB::connection('pgsql')->table('trust_events')
            ->where('id', $eventId)
            ->update(['score_after' => $scoreAfter]);

        Log::info('Trust event recorded', [
            'company_id' => $companyId,
            'event_type' => $eventType,
            'score_delta' => $scoreDelta,
            'score_after' => $scoreAfter,
        ]);
    }

    /**
     * Get the visibility multiplier for a company's jobs in the deck.
     */
    public function getVisibilityMultiplier(string $companyId): float
    {
        $score = $this->getScore($companyId);
        $trustLevel = $score['trust_level'] ?? 'untrusted';
        $levels = config('trust.levels', []);

        return (float) ($levels[$trustLevel]['visibility_multiplier'] ?? 0.0);
    }

    /**
     * Invalidate the cached trust score for a company.
     */
    public function invalidateCache(string $companyId): void
    {
        $prefix = config('trust.cache.prefix', 'trust:score:');
        Redis::del("{$prefix}{$companyId}");
    }

    // ── Private: Score Component Calculations ─────────────────────────────

    private function calculateComponents(CompanyProfile $company): array
    {
        return [
            'email_domain' => $this->scoreEmailDomain($company),
            'document_verification' => $this->scoreDocumentVerification($company),
            'account_age' => $this->scoreAccountAge($company),
            'company_reviews' => $this->scoreCompanyReviews($company),
            'behavioral' => $this->scoreBehavioral($company),
            'subscription' => $this->scoreSubscription($company),
        ];
    }

    private function scoreEmailDomain(CompanyProfile $company): int
    {
        if ($company->is_free_email_domain || $company->company_domain === null) {
            return 0;
        }

        return (int) config('trust.weights.email_domain', 10);
    }

    private function scoreDocumentVerification(CompanyProfile $company): int
    {
        $max = (int) config('trust.weights.document_verification', 30);

        return match ($company->verification_status) {
            'approved' => $max,
            'pending' => (int) round($max * 0.33),  // 10
            'rejected' => (int) round($max * 0.17), // 5
            default => 0,
        };
    }

    private function scoreAccountAge(CompanyProfile $company): int
    {
        $max = (int) config('trust.weights.account_age', 10);
        $monthsOld = Carbon::parse($company->created_at)->diffInMonths(now());

        return match (true) {
            $monthsOld >= 12 => $max,
            $monthsOld >= 6 => 7,
            $monthsOld >= 3 => 5,
            $monthsOld >= 1 => 3,
            default => 1,
        };
    }

    private function scoreCompanyReviews(CompanyProfile $company): int
    {
        $max = (int) config('trust.weights.company_reviews', 20);
        $minReviews = (int) config('trust.reviews.minimum_count', 3);

        $visibleReviewIds = $this->reviewRepository
            ->getVisibleReviewIds($company->id)
            ->toArray();

        $reviewCount = count($visibleReviewIds);

        if ($reviewCount < $minReviews) {
            return 0;
        }

        $stats = $this->reviewDocs->getAggregateStats($company->id, $visibleReviewIds);
        $avgRating = (float) ($stats['average_rating'] ?? 0);

        return match (true) {
            $avgRating >= 4.5 && $reviewCount >= 10 => $max,
            $avgRating >= 4.0 && $reviewCount >= 5 => 15,
            $avgRating >= 3.5 && $reviewCount >= 3 => 10,
            $avgRating >= 3.0 && $reviewCount >= 1 => 5,
            default => 0,
        };
    }

    private function scoreBehavioral(CompanyProfile $company): int
    {
        $baseScore = (int) config('trust.behavioral.base_score', 15);
        $maxScore = (int) config('trust.behavioral.max_score', 20);

        $eventDelta = (int) DB::connection('pgsql')
            ->table('trust_events')
            ->where('company_id', $company->id)
            ->whereIn('event_type', [
                'job_flagged', 'spam_confirmed', 'warning_issued',
                'clean_month',
            ])
            ->sum('score_delta');

        return max(0, min($maxScore, $baseScore + $eventDelta));
    }

    private function scoreSubscription(CompanyProfile $company): int
    {
        if ($company->subscription_status !== 'active') {
            return 0;
        }

        return match ($company->subscription_tier) {
            'pro' => 10,
            'basic' => 7,
            default => 0,
        };
    }

    // ── Private: Level & Cap Resolution ───────────────────────────────────

    private function resolveLevel(int $score): string
    {
        $levels = config('trust.levels', []);

        foreach (['trusted', 'established', 'new'] as $level) {
            if ($score >= ($levels[$level]['min_score'] ?? PHP_INT_MAX)) {
                return $level;
            }
        }

        return 'untrusted';
    }

    private function resolveListingCap(string $trustLevel, string $subscriptionTier, string $subscriptionStatus): int
    {
        $levels = config('trust.levels', []);
        $baseCap = (int) ($levels[$trustLevel]['listing_cap'] ?? 0);
        $bonus = $subscriptionStatus === 'active'
            ? (int) (config("trust.premium_listing_bonus.{$subscriptionTier}") ?? 0)
            : 0;

        return $baseCap + $bonus;
    }

    // ── Private: Redis Cache ──────────────────────────────────────────────

    private function cacheScore(string $companyId, int $score, string $level, int $cap): void
    {
        $prefix = config('trust.cache.prefix', 'trust:score:');
        $ttl = (int) config('trust.cache.ttl_seconds', 3600);

        $data = json_encode([
            'total_score' => $score,
            'trust_level' => $level,
            'listing_cap' => $cap,
        ]);

        Redis::setex("{$prefix}{$companyId}", $ttl, $data);
    }

    private function getCachedScore(string $companyId): ?array
    {
        $prefix = config('trust.cache.prefix', 'trust:score:');
        $cached = Redis::get("{$prefix}{$companyId}");

        if ($cached === null) {
            return null;
        }

        $data = json_decode($cached, true);

        return is_array($data) ? $data : null;
    }
}
