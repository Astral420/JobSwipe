<?php

namespace Tests\Feature\HR;

use App\Models\PostgreSQL\CompanyMembership;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MembershipActiveMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private User $hr;

    private CompanyProfile $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->hr = User::factory()->create([
            'role' => 'hr',
            'email_verified_at' => now(),
        ]);
        // Need an owner for the company profile factory valid creation
        $owner = User::factory()->create([
            'role' => 'company_admin',
            'email_verified_at' => now(),
        ]);
        $this->company = CompanyProfile::factory()->create(['owner_user_id' => $owner->id]);
    }

    public function test_active_member_can_access_route()
    {
        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->hr->id,
            'membership_role' => 'hr',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($this->hr)->getJson('/api/v1/company/jobs');

        // Should return 200 (or validation error depending on profile completion),
        // but not 403 MEMBERSHIP_INACTIVE or NO_MEMBERSHIP
        $response->assertStatus(200);
    }

    public function test_inactive_member_is_blocked()
    {
        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->hr->id,
            'membership_role' => 'hr',
            'status' => 'inactive',
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($this->hr)->getJson('/api/v1/company/jobs');

        $response->assertStatus(403);
        $response->assertJsonPath('code', 'MEMBERSHIP_INACTIVE');
    }

    public function test_user_with_no_membership_record_is_blocked()
    {
        // No membership record created
        $response = $this->actingAs($this->hr)->getJson('/api/v1/company/jobs');

        $response->assertStatus(403);
        $response->assertJsonPath('code', 'NO_MEMBERSHIP');
    }
}
