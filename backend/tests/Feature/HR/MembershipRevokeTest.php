<?php

namespace Tests\Feature\HR;

use App\Models\PostgreSQL\CompanyMembership;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MembershipRevokeTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $hr;

    private CompanyProfile $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'company_admin']);
        $this->hr = User::factory()->create(['role' => 'hr']);

        $this->company = CompanyProfile::factory()->create(['owner_user_id' => $this->admin->id]);

        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->admin->id,
            'membership_role' => 'company_admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->hr->id,
            'membership_role' => 'hr',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        // Give HR a token
        $this->hr->createToken('test-device')->plainTextToken;
    }

    public function test_admin_can_revoke_hr_and_terminate_sessions()
    {
        // Prove HR has a token
        $this->assertDatabaseCount('personal_access_tokens', 1);

        $response = $this->actingAs($this->admin)->deleteJson("/api/v1/company/members/{$this->hr->id}/revoke");

        $response->assertStatus(200);

        // Verify membership updated correctly
        $membership = CompanyMembership::where('user_id', $this->hr->id)->first();
        $this->assertEquals('inactive', $membership->status);
        $this->assertNotNull($membership->revoked_at);
        $this->assertEquals($this->admin->id, $membership->revoked_by_user_id);

        // Verify all sessions terminated instantly
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
