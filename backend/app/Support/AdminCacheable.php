<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Trait AdminCacheable
 *
 * Provides caching utilities for admin dashboard endpoints.
 * Uses configuration from config/admin.php for TTL values and cache keys.
 */
trait AdminCacheable
{
    /**
     * Cache dashboard statistics.
     */
    protected function cacheDashboardStats(callable $callback): mixed
    {
        return Cache::remember(
            config('admin.cache_keys.dashboard_stats'),
            config('admin.cache.dashboard_stats'),
            $callback
        );
    }

    /**
     * Cache user growth data.
     */
    protected function cacheUserGrowth(int $days, callable $callback): mixed
    {
        $key = config('admin.cache_keys.user_growth').":{$days}";

        return Cache::remember(
            $key,
            config('admin.cache.user_growth'),
            $callback
        );
    }

    /**
     * Cache revenue data.
     */
    protected function cacheRevenueData(int $months, callable $callback): mixed
    {
        $key = config('admin.cache_keys.revenue_data').":{$months}";

        return Cache::remember(
            $key,
            config('admin.cache.revenue_data'),
            $callback
        );
    }

    /**
     * Cache recent activity.
     */
    protected function cacheRecentActivity(callable $callback): mixed
    {
        return Cache::remember(
            config('admin.cache_keys.recent_activity'),
            config('admin.cache.recent_activity'),
            $callback
        );
    }

    /**
     * Cache company list with filters.
     */
    protected function cacheCompanyList(array $filters, callable $callback): mixed
    {
        $key = config('admin.cache_keys.company_list').':'.md5(json_encode($filters));

        return Cache::remember(
            $key,
            config('admin.cache.company_lists'),
            $callback
        );
    }

    /**
     * Cache company details.
     */
    protected function cacheCompanyDetails(string $companyId, callable $callback): mixed
    {
        $key = config('admin.cache_keys.company_details').":{$companyId}";

        return Cache::remember(
            $key,
            config('admin.cache.company_lists'),
            $callback
        );
    }

    /**
     * Cache low trust companies.
     */
    protected function cacheLowTrustCompanies(callable $callback): mixed
    {
        return Cache::remember(
            config('admin.cache_keys.trust_low_companies'),
            config('admin.cache.trust_events'),
            $callback
        );
    }

    /**
     * Cache match statistics.
     */
    protected function cacheMatchStats(callable $callback): mixed
    {
        return Cache::remember(
            config('admin.cache_keys.match_stats'),
            config('admin.cache.match_stats'),
            $callback
        );
    }

    /**
     * Cache application statistics.
     */
    protected function cacheApplicationStats(callable $callback): mixed
    {
        return Cache::remember(
            config('admin.cache_keys.application_stats'),
            config('admin.cache.application_stats'),
            $callback
        );
    }

    /**
     * Cache subscription revenue statistics.
     */
    protected function cacheSubscriptionRevenue(callable $callback): mixed
    {
        return Cache::remember(
            config('admin.cache_keys.subscription_revenue'),
            config('admin.cache.revenue_data'),
            $callback
        );
    }

    /**
     * Invalidate company-related caches.
     */
    protected function invalidateCompanyCache(?string $companyId = null): void
    {
        // Clear company list cache (all filter combinations)
        Cache::forget(config('admin.cache_keys.company_list'));

        // Clear specific company details if provided
        if ($companyId) {
            $key = config('admin.cache_keys.company_details').":{$companyId}";
            Cache::forget($key);
        }

        // Clear dashboard stats as company changes affect overall stats
        Cache::forget(config('admin.cache_keys.dashboard_stats'));
    }

    /**
     * Invalidate trust-related caches.
     */
    protected function invalidateTrustCache(): void
    {
        Cache::forget(config('admin.cache_keys.trust_low_companies'));
        Cache::forget(config('admin.cache_keys.dashboard_stats'));
    }

    /**
     * Invalidate analytics caches.
     */
    protected function invalidateAnalyticsCache(): void
    {
        Cache::forget(config('admin.cache_keys.match_stats'));
        Cache::forget(config('admin.cache_keys.application_stats'));
        Cache::forget(config('admin.cache_keys.dashboard_stats'));
    }

    /**
     * Invalidate all admin caches.
     */
    protected function invalidateAllAdminCache(): void
    {
        $keys = config('admin.cache_keys');

        foreach ($keys as $key) {
            Cache::forget($key);
        }
    }
}
