<?php

namespace Tests\Feature\Admin;

use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardControllerTest extends TestCase
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

    public function test_dashboard_stats_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(401);
    }

    public function test_dashboard_stats_requires_moderator_or_super_admin_role(): void
    {
        $response = $this->actingAs($this->applicant)
            ->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(403);
    }

    public function test_dashboard_stats_returns_all_metrics_including_trust(): void
    {
        $response = $this->actingAs($this->moderator)
            ->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'users' => [
                        'total',
                        'applicants',
                        'hr',
                        'company_admins',
                        'moderators',
                        'super_admins',
                        'banned',
                    ],
                    'companies' => [
                        'total',
                        'verified',
                        'pending_verification',
                        'rejected_verification',
                    ],
                    'reviews' => [
                        'total',
                        'flagged',
                    ],
                    'jobs' => [
                        'total',
                        'active',
                    ],
                    'trust' => [
                        'low_trust_companies',
                        'critical_trust_companies',
                        'recent_events',
                        'by_level' => [
                            'untrusted',
                            'new',
                            'established',
                            'trusted',
                        ],
                    ],
                ],
                'message',
            ]);
    }

    public function test_dashboard_stats_trust_metrics_are_accurate(): void
    {
        // Create users for the companies
        $user1 = User::factory()->create(['role' => 'company_admin']);
        $user2 = User::factory()->create(['role' => 'company_admin']);
        $user3 = User::factory()->create(['role' => 'company_admin']);
        $user4 = User::factory()->create(['role' => 'company_admin']);

        // Create companies with different trust levels
        CompanyProfile::factory()->create([
            'user_id' => $user1->id,
            'trust_score' => 15,
            'trust_level' => 'untrusted',
        ]);

        CompanyProfile::factory()->create([
            'user_id' => $user2->id,
            'trust_score' => 35,
            'trust_level' => 'new',
        ]);

        CompanyProfile::factory()->create([
            'user_id' => $user3->id,
            'trust_score' => 60,
            'trust_level' => 'established',
        ]);

        CompanyProfile::factory()->create([
            'user_id' => $user4->id,
            'trust_score' => 80,
            'trust_level' => 'trusted',
        ]);

        $response = $this->actingAs($this->moderator)
            ->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200);

        $trustData = $response->json('data.trust');

        // Verify low trust companies count (below 40)
        $this->assertEquals(2, $trustData['low_trust_companies']);

        // Verify critical trust companies count (below 20)
        $this->assertEquals(1, $trustData['critical_trust_companies']);

        // Verify trust level breakdown
        $this->assertEquals(1, $trustData['by_level']['untrusted']);
        $this->assertEquals(1, $trustData['by_level']['new']);
        $this->assertEquals(1, $trustData['by_level']['established']);
        $this->assertEquals(1, $trustData['by_level']['trusted']);
    }

    public function test_dashboard_stats_can_be_accessed_by_super_admin(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'trust',
                ],
            ]);
    }
}
