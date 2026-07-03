<?php

namespace Tests\Feature\HR;

use App\Models\PostgreSQL\CompanyMembership;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\HRProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListMembersTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $hrActive;

    private User $hrInactive;

    private CompanyProfile $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'company_admin', 'email' => 'admin@test.com']);
        $this->hrActive = User::factory()->create(['role' => 'hr', 'email' => 'active@test.com']);
        $this->hrInactive = User::factory()->create(['role' => 'hr', 'email' => 'inactive@test.com']);

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
            'user_id' => $this->hrActive->id,
            'membership_role' => 'hr',
            'status' => 'active',
            'joined_at' => now()->subDay(),
        ]);

        HRProfile::create([
            'user_id' => $this->hrActive->id,
            'company_id' => $this->company->id,
            'first_name' => 'Active',
            'last_name' => 'User',
            'job_title' => 'Recruiter',
        ]);

        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->hrInactive->id,
            'membership_role' => 'hr',
            'status' => 'inactive',
            'joined_at' => now()->subDays(2),
        ]);
    }

    public function test_admin_can_list_active_members()
    {
        $response = $this->actingAs($this->admin)->getJson('/api/v1/company/members');

        $response->assertStatus(200);
        $members = $response->json('data.members');

        // Should only return active members (admin + hrActive)
        $this->assertCount(2, $members);

        $emails = array_column($members, 'email');
        $this->assertContains('admin@test.com', $emails);
        $this->assertContains('active@test.com', $emails);
        $this->assertNotContains('inactive@test.com', $emails);

        // Check profile inclusion
        $activeData = collect($members)->firstWhere('email', 'active@test.com');
        $this->assertEquals('Active', $activeData['first_name']);
        $this->assertEquals('Recruiter', $activeData['job_title']);
    }

    public function test_non_admin_cannot_list_members()
    {
        $response = $this->actingAs($this->hrActive)->getJson('/api/v1/company/members');

        $response->assertStatus(403);
    }
}
