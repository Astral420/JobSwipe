<?php

namespace Tests\Feature\HR;

use App\Models\PostgreSQL\CompanyMembership;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private CompanyProfile $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'company_admin']);
        $this->company = CompanyProfile::factory()->create(['owner_user_id' => $this->admin->id]);

        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->admin->id,
            'membership_role' => 'company_admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);
    }

    public function test_invite_creation_is_rate_limited()
    {
        // Allowed 10 requests per minute
        for ($i = 0; $i < 10; $i++) {
            $response = $this->actingAs($this->admin)->postJson('/api/v1/company/invites', [
                'email' => "hr{$i}@example.com",
                'role' => 'hr',
            ]);
            $response->assertStatus(200);
        }

        // 11th request should be blocked by SlidingWindowRateLimiter
        $response = $this->actingAs($this->admin)->postJson('/api/v1/company/invites', [
            'email' => 'hr11@example.com',
            'role' => 'hr',
        ]);

        $response->assertStatus(429);
        $response->assertJsonPath('code', 'RATE_LIMIT_EXCEEDED');
    }
}
