<?php

namespace Tests\Feature\HR;

use App\Models\PostgreSQL\CompanyMembership;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CannotRevokeOwnerTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $adminTwo;

    private CompanyProfile $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create(['role' => 'company_admin']);
        $this->adminTwo = User::factory()->create(['role' => 'company_admin']);

        $this->company = CompanyProfile::factory()->create(['owner_user_id' => $this->owner->id]);

        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->owner->id,
            'membership_role' => 'company_admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->adminTwo->id,
            'membership_role' => 'company_admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);
    }

    public function test_admin_cannot_revoke_company_owner()
    {
        $response = $this->actingAs($this->adminTwo)->deleteJson("/api/v1/company/members/{$this->owner->id}/revoke");

        $response->assertStatus(400);
        $response->assertJsonPath('code', 'CANNOT_REVOKE_OWNER');
    }

    public function test_admin_cannot_revoke_themselves()
    {
        $response = $this->actingAs($this->adminTwo)->deleteJson("/api/v1/company/members/{$this->adminTwo->id}/revoke");

        $response->assertStatus(400);
        $response->assertJsonPath('code', 'CANNOT_REVOKE_SELF');
    }
}
