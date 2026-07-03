<?php

namespace Tests\Unit\Support;

use App\Support\AdminCacheable;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AdminCacheableTest extends TestCase
{
    use AdminCacheable;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_cache_dashboard_stats(): void
    {
        $callCount = 0;

        $result1 = $this->cacheDashboardStats(function () use (&$callCount) {
            $callCount++;

            return ['total_users' => 100];
        });

        $result2 = $this->cacheDashboardStats(function () use (&$callCount) {
            $callCount++;

            return ['total_users' => 100];
        });

        $this->assertEquals(['total_users' => 100], $result1);
        $this->assertEquals(['total_users' => 100], $result2);
        $this->assertEquals(1, $callCount, 'Callback should only be called once due to caching');
    }

    public function test_cache_user_growth(): void
    {
        $callCount = 0;

        $result1 = $this->cacheUserGrowth(30, function () use (&$callCount) {
            $callCount++;

            return ['growth' => 10];
        });

        $result2 = $this->cacheUserGrowth(30, function () use (&$callCount) {
            $callCount++;

            return ['growth' => 10];
        });

        $this->assertEquals(['growth' => 10], $result1);
        $this->assertEquals(['growth' => 10], $result2);
        $this->assertEquals(1, $callCount, 'Callback should only be called once due to caching');
    }

    public function test_cache_revenue_data(): void
    {
        $callCount = 0;

        $result1 = $this->cacheRevenueData(12, function () use (&$callCount) {
            $callCount++;

            return ['revenue' => 5000];
        });

        $result2 = $this->cacheRevenueData(12, function () use (&$callCount) {
            $callCount++;

            return ['revenue' => 5000];
        });

        $this->assertEquals(['revenue' => 5000], $result1);
        $this->assertEquals(['revenue' => 5000], $result2);
        $this->assertEquals(1, $callCount, 'Callback should only be called once due to caching');
    }

    public function test_cache_company_list_with_different_filters(): void
    {
        $callCount = 0;

        $filters1 = ['status' => 'active'];
        $filters2 = ['status' => 'suspended'];

        $result1 = $this->cacheCompanyList($filters1, function () use (&$callCount) {
            $callCount++;

            return ['companies' => ['A', 'B']];
        });

        $result2 = $this->cacheCompanyList($filters1, function () use (&$callCount) {
            $callCount++;

            return ['companies' => ['A', 'B']];
        });

        $result3 = $this->cacheCompanyList($filters2, function () use (&$callCount) {
            $callCount++;

            return ['companies' => ['C']];
        });

        $this->assertEquals(['companies' => ['A', 'B']], $result1);
        $this->assertEquals(['companies' => ['A', 'B']], $result2);
        $this->assertEquals(['companies' => ['C']], $result3);
        $this->assertEquals(2, $callCount, 'Callback should be called twice for different filters');
    }

    public function test_invalidate_company_cache(): void
    {
        $companyId = 'test-company-id';

        // Cache some data
        $this->cacheCompanyDetails($companyId, fn () => ['name' => 'Test Company']);

        // Verify it's cached
        $this->assertTrue(Cache::has(config('admin.cache_keys.company_details').":{$companyId}"));

        // Invalidate
        $this->invalidateCompanyCache($companyId);

        // Verify it's cleared
        $this->assertFalse(Cache::has(config('admin.cache_keys.company_details').":{$companyId}"));
    }

    public function test_invalidate_trust_cache(): void
    {
        // Cache some data
        $this->cacheLowTrustCompanies(fn () => ['companies' => []]);

        // Verify it's cached
        $this->assertTrue(Cache::has(config('admin.cache_keys.trust_low_companies')));

        // Invalidate
        $this->invalidateTrustCache();

        // Verify it's cleared
        $this->assertFalse(Cache::has(config('admin.cache_keys.trust_low_companies')));
    }

    public function test_config_values_are_set(): void
    {
        $this->assertIsInt(config('admin.cache.dashboard_stats'));
        $this->assertIsInt(config('admin.cache.company_lists'));
        $this->assertIsInt(config('admin.cache.revenue_data'));
        $this->assertIsInt(config('admin.cache.trust_events'));

        $this->assertIsString(config('admin.cache_keys.dashboard_stats'));
        $this->assertIsString(config('admin.cache_keys.company_list'));
        $this->assertIsString(config('admin.cache_keys.revenue_data'));
    }

    public function test_pagination_config_values(): void
    {
        $this->assertEquals(20, config('admin.pagination.default_per_page'));
        $this->assertEquals(100, config('admin.pagination.max_per_page'));
    }

    public function test_trust_threshold_config_values(): void
    {
        $this->assertEquals(40, config('admin.trust.low_trust_threshold'));
        $this->assertEquals(20, config('admin.trust.job_posting_threshold'));
    }

    public function test_webhook_config_values(): void
    {
        $this->assertEquals(3, config('admin.webhooks.max_retry_attempts'));
    }
}
