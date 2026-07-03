<?php

namespace App\Repositories\PostgreSQL;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * TrustEventRepository
 *
 * Manages trust score events and history.
 * Since there's no dedicated trust_events table, this repository
 * uses audit logs and company profile data for trust management.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
class TrustEventRepository
{
    /**
     * List trust events from audit logs.
     *
     * Requirements: 6.1
     */
    public function listEvents(int $perPage = 20): LengthAwarePaginator
    {
        // Since we don't have a dedicated trust_events table,
        // we'll return company profiles with trust data formatted as events
        $results = DB::table('company_profiles')
            ->select([
                'id as company_id',
                'company_name',
                'trust_score',
                'trust_level',
                'updated_at',
                'created_at',
            ])
            ->orderBy('updated_at', 'desc')
            ->paginate($perPage);

        // Transform the results to match TrustEvent structure
        $results->getCollection()->transform(function ($item) {
            return [
                'id' => $item->company_id,
                'company_id' => $item->company_id,
                'company' => [
                    'id' => $item->company_id,
                    'name' => $item->company_name,
                    'trust_score' => $item->trust_score,
                    'trust_level' => $item->trust_level,
                ],
                'type' => 'score_updated',
                'description' => "Trust score updated to {$item->trust_score}",
                'score_change' => 0, // We don't track historical changes yet
                'score_before' => $item->trust_score,
                'score_after' => $item->trust_score,
                'created_at' => $item->updated_at,
            ];
        });

        return $results;
    }

    /**
     * Get trust events for a specific company.
     *
     * Requirements: 6.4
     */
    public function getByCompany(string $companyId): Collection
    {
        // Return trust-related data for the company
        $company = DB::table('company_profiles')
            ->where('id', $companyId)
            ->first();

        if (! $company) {
            return collect([]);
        }

        return collect([
            [
                'company_id' => $company->id,
                'company_name' => $company->company_name,
                'trust_score' => $company->trust_score,
                'trust_level' => $company->trust_level,
                'listing_cap' => $company->listing_cap,
                'event_type' => 'current_status',
                'event_date' => $company->updated_at,
            ],
        ]);
    }

    /**
     * Get companies with low trust scores.
     *
     * Requirements: 6.2
     */
    public function getLowTrustCompanies(int $threshold = 40): Collection
    {
        return DB::table('company_profiles')
            ->select([
                'id',
                'company_name',
                'trust_score',
                'trust_level',
                'listing_cap',
                'status',
                'created_at',
                'updated_at',
            ])
            ->where('trust_score', '<', $threshold)
            ->orderBy('trust_score', 'asc')
            ->get();
    }

    /**
     * Log a trust score adjustment event.
     *
     * Requirements: 6.5
     */
    public function logTrustAdjustment(
        string $companyId,
        float $oldScore,
        float $newScore,
        string $reason,
        string $actorId
    ): void {
        Log::channel('admin_audit')->info('Trust score adjusted', [
            'action' => 'adjust_trust_score',
            'company_id' => $companyId,
            'old_score' => $oldScore,
            'new_score' => $newScore,
            'reason' => $reason,
            'actor_id' => $actorId,
            'timestamp' => now()->toIso8601String(),
            'ip_address' => request()->ip(),
        ]);
    }

    /**
     * Log a trust score recalculation event.
     *
     * Requirements: 6.3
     */
    public function logTrustRecalculation(
        string $companyId,
        float $oldScore,
        float $newScore,
        string $actorId
    ): void {
        Log::channel('admin_audit')->info('Trust score recalculated', [
            'action' => 'recalculate_trust_score',
            'company_id' => $companyId,
            'old_score' => $oldScore,
            'new_score' => $newScore,
            'actor_id' => $actorId,
            'timestamp' => now()->toIso8601String(),
            'ip_address' => request()->ip(),
        ]);
    }

    /**
     * Count companies below a trust score threshold.
     *
     * Requirements: 6.2
     */
    public function countLowTrustCompanies(int $threshold = 40): int
    {
        return DB::table('company_profiles')
            ->where('trust_score', '<', $threshold)
            ->count();
    }

    /**
     * Count companies with recent trust score changes.
     *
     * Requirements: 6.1
     */
    public function countRecentTrustEvents(int $days = 30): int
    {
        return DB::table('company_profiles')
            ->where('updated_at', '>=', now()->subDays($days))
            ->count();
    }

    /**
     * Count companies by trust level.
     *
     * Requirements: 6.1
     */
    public function countByTrustLevel(string $level): int
    {
        return DB::table('company_profiles')
            ->where('trust_level', $level)
            ->count();
    }
}
