<?php

namespace Tests\Unit\Services;

use App\Models\PostgreSQL\User;
use App\Services\AdminService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AdminAnalyticsServiceTest extends TestCase
{
    use RefreshDatabase;

    private AdminService $adminService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminService = app(AdminService::class);
    }

    public function test_get_user_growth_data_returns_array_with_correct_structure(): void
    {
        // Arrange
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subDays(5)]);
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subDays(3)]);
        User::factory()->create(['role' => 'company_admin', 'created_at' => now()->subDays(2)]);

        // Act
        $result = $this->adminService->getUserGrowthData(7);

        // Assert
        $this->assertIsArray($result);
        $this->assertArrayHasKey('data', $result);
        $this->assertArrayHasKey('growth_percentage', $result);
        $this->assertArrayHasKey('current_period_total', $result);
        $this->assertArrayHasKey('previous_period_total', $result);
        $this->assertIsArray($result['data']);
        $this->assertCount(7, $result['data']);

        // Verify data structure
        foreach ($result['data'] as $day) {
            $this->assertArrayHasKey('date', $day);
            $this->assertArrayHasKey('applicants', $day);
            $this->assertArrayHasKey('companies', $day);
            $this->assertArrayHasKey('total', $day);
        }
    }

    public function test_get_revenue_data_returns_array_with_correct_structure(): void
    {
        // Act
        $result = $this->adminService->getRevenueData(6);

        // Assert
        $this->assertIsArray($result);
        $this->assertArrayHasKey('data', $result);
        $this->assertArrayHasKey('growth_percentage', $result);
        $this->assertArrayHasKey('current_period_total', $result);
        $this->assertArrayHasKey('previous_period_total', $result);
        $this->assertIsArray($result['data']);
        $this->assertCount(6, $result['data']);

        // Verify data structure
        foreach ($result['data'] as $month) {
            $this->assertArrayHasKey('date', $month);
            $this->assertArrayHasKey('subscriptions', $month);
            $this->assertArrayHasKey('iap', $month);
            $this->assertArrayHasKey('total', $month);
        }
    }

    public function test_get_recent_activity_returns_array(): void
    {
        // Arrange
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subMinutes(5)]);
        User::factory()->create(['role' => 'company_admin', 'created_at' => now()->subMinutes(3)]);

        // Act
        $result = $this->adminService->getRecentActivity(10);

        // Assert
        $this->assertIsArray($result);
        $this->assertLessThanOrEqual(10, count($result));

        // Verify activity structure if there are activities
        if (count($result) > 0) {
            foreach ($result as $activity) {
                $this->assertArrayHasKey('id', $activity);
                $this->assertArrayHasKey('type', $activity);
                $this->assertArrayHasKey('description', $activity);
                $this->assertArrayHasKey('created_at', $activity);
            }
        }
    }

    public function test_user_growth_data_uses_caching(): void
    {
        // Arrange
        Cache::flush();
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subDays(2)]);

        // Act - First call should cache
        $result1 = $this->adminService->getUserGrowthData(7);

        // Assert - Cache should exist
        $cacheKey = config('admin.cache_keys.user_growth').':7';
        $this->assertTrue(Cache::has($cacheKey));

        // Act - Second call should use cache
        $result2 = $this->adminService->getUserGrowthData(7);

        // Assert - Results should be identical
        $this->assertEquals($result1, $result2);
    }

    public function test_revenue_data_uses_caching(): void
    {
        // Arrange
        Cache::flush();

        // Act - First call should cache
        $result1 = $this->adminService->getRevenueData(6);

        // Assert - Cache should exist
        $cacheKey = config('admin.cache_keys.revenue_data').':6';
        $this->assertTrue(Cache::has($cacheKey));

        // Act - Second call should use cache
        $result2 = $this->adminService->getRevenueData(6);

        // Assert - Results should be identical
        $this->assertEquals($result1, $result2);
    }

    public function test_recent_activity_uses_caching(): void
    {
        // Arrange
        Cache::flush();
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subMinutes(5)]);

        // Act - First call should cache
        $result1 = $this->adminService->getRecentActivity(10);

        // Assert - Cache should exist
        $cacheKey = config('admin.cache_keys.recent_activity');
        $this->assertTrue(Cache::has($cacheKey));

        // Act - Second call should use cache
        $result2 = $this->adminService->getRecentActivity(10);

        // Assert - Results should be identical
        $this->assertEquals($result1, $result2);
    }

    public function test_growth_percentage_calculation_is_accurate(): void
    {
        // Arrange - Create users in two distinct periods
        // Previous period (days 7-4): 2 users
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subDays(7)]);
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subDays(5)]);

        // Current period (days 3-0): 4 users
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subDays(3)]);
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subDays(2)]);
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subDays(1)]);
        User::factory()->create(['role' => 'applicant', 'created_at' => now()]);

        // Act
        Cache::flush();
        $result = $this->adminService->getUserGrowthData(8);

        // Assert - Growth should be 100% (from 2 to 4 users)
        // (4 - 2) / 2 * 100 = 100%
        $this->assertEquals(100.0, $result['growth_percentage']);
        $this->assertEquals(4, $result['current_period_total']);
        $this->assertEquals(2, $result['previous_period_total']);
    }
}
