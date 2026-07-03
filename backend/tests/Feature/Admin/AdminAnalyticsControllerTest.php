<?php

namespace Tests\Feature\Admin;

use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAnalyticsControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $moderator;

    private User $superAdmin;

    private User $applicant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->moderator = User::factory()->create([
            'role' => 'moderator',
            'email_verified_at' => now(),
        ]);

        $this->superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'email_verified_at' => now(),
        ]);

        $this->applicant = User::factory()->create([
            'role' => 'applicant',
            'email_verified_at' => now(),
        ]);
    }

    public function test_user_growth_data_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/admin/dashboard/user-growth');

        $response->assertStatus(401);
    }

    public function test_user_growth_data_requires_moderator_or_super_admin_role(): void
    {
        $response = $this->actingAs($this->applicant)
            ->getJson('/api/v1/admin/dashboard/user-growth');

        $response->assertStatus(403);
    }

    public function test_moderator_can_access_user_growth_data(): void
    {
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subDays(5)]);
        User::factory()->create(['role' => 'company_admin', 'created_at' => now()->subDays(3)]);

        $response = $this->actingAs($this->moderator)
            ->getJson('/api/v1/admin/dashboard/user-growth?days=7');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data',
                    'growth_percentage',
                    'current_period_total',
                    'previous_period_total',
                ],
                'message',
            ])
            ->assertJson(['success' => true]);

        $this->assertIsArray($response->json('data.data'));
        $this->assertCount(7, $response->json('data.data'));
    }

    public function test_super_admin_can_access_user_growth_data(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/admin/dashboard/user-growth?days=30');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_user_growth_data_validates_days_parameter(): void
    {
        $response = $this->actingAs($this->moderator)
            ->getJson('/api/v1/admin/dashboard/user-growth?days=500');

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'code' => 'VALIDATION_ERROR',
            ]);
    }

    public function test_revenue_data_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/admin/dashboard/revenue');

        $response->assertStatus(401);
    }

    public function test_revenue_data_requires_moderator_or_super_admin_role(): void
    {
        $response = $this->actingAs($this->applicant)
            ->getJson('/api/v1/admin/dashboard/revenue');

        $response->assertStatus(403);
    }

    public function test_moderator_can_access_revenue_data(): void
    {
        $response = $this->actingAs($this->moderator)
            ->getJson('/api/v1/admin/dashboard/revenue?months=12');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data',
                    'growth_percentage',
                    'current_period_total',
                    'previous_period_total',
                ],
                'message',
            ])
            ->assertJson(['success' => true]);

        $this->assertIsArray($response->json('data.data'));
        $this->assertCount(12, $response->json('data.data'));
    }

    public function test_revenue_data_validates_months_parameter(): void
    {
        $response = $this->actingAs($this->moderator)
            ->getJson('/api/v1/admin/dashboard/revenue?months=50');

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'code' => 'VALIDATION_ERROR',
            ]);
    }

    public function test_recent_activity_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/admin/dashboard/activity');

        $response->assertStatus(401);
    }

    public function test_recent_activity_requires_moderator_or_super_admin_role(): void
    {
        $response = $this->actingAs($this->applicant)
            ->getJson('/api/v1/admin/dashboard/activity');

        $response->assertStatus(403);
    }

    public function test_moderator_can_access_recent_activity(): void
    {
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subMinutes(5)]);
        User::factory()->create(['role' => 'company_admin', 'created_at' => now()->subMinutes(3)]);

        $response = $this->actingAs($this->moderator)
            ->getJson('/api/v1/admin/dashboard/activity?limit=50');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data',
                'message',
            ])
            ->assertJson(['success' => true]);

        $this->assertIsArray($response->json('data'));
    }

    public function test_recent_activity_validates_limit_parameter(): void
    {
        $response = $this->actingAs($this->moderator)
            ->getJson('/api/v1/admin/dashboard/activity?limit=200');

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'code' => 'VALIDATION_ERROR',
            ]);
    }

    public function test_user_growth_data_returns_correct_structure_for_each_day(): void
    {
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subDays(2)]);

        $response = $this->actingAs($this->moderator)
            ->getJson('/api/v1/admin/dashboard/user-growth?days=3');

        $response->assertStatus(200);

        $data = $response->json('data.data');
        foreach ($data as $day) {
            $this->assertArrayHasKey('date', $day);
            $this->assertArrayHasKey('applicants', $day);
            $this->assertArrayHasKey('companies', $day);
            $this->assertArrayHasKey('total', $day);
        }
    }

    public function test_revenue_data_returns_correct_structure_for_each_month(): void
    {
        $response = $this->actingAs($this->moderator)
            ->getJson('/api/v1/admin/dashboard/revenue?months=3');

        $response->assertStatus(200);

        $data = $response->json('data.data');
        foreach ($data as $month) {
            $this->assertArrayHasKey('date', $month);
            $this->assertArrayHasKey('subscriptions', $month);
            $this->assertArrayHasKey('iap', $month);
            $this->assertArrayHasKey('total', $month);
        }
    }

    public function test_recent_activity_returns_activities_with_correct_structure(): void
    {
        User::factory()->create(['role' => 'applicant', 'created_at' => now()->subMinutes(5)]);

        $response = $this->actingAs($this->moderator)
            ->getJson('/api/v1/admin/dashboard/activity?limit=10');

        $response->assertStatus(200);

        $activities = $response->json('data');
        if (count($activities) > 0) {
            foreach ($activities as $activity) {
                $this->assertArrayHasKey('id', $activity);
                $this->assertArrayHasKey('type', $activity);
                $this->assertArrayHasKey('description', $activity);
                $this->assertArrayHasKey('created_at', $activity);
            }
        }
    }
}
