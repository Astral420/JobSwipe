<?php

namespace Tests\Feature\HR;

use App\Models\PostgreSQL\CompanyMembership;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class BulkInviteTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private CompanyProfile $company;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();

        $this->admin = User::factory()->create(['role' => 'company_admin']);
        $this->company = CompanyProfile::factory()->create([
            'owner_user_id' => $this->admin->id,
            'user_id' => $this->admin->id, // Legacy field
        ]);

        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->admin->id,
            'membership_role' => 'company_admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);
    }

    public function test_bulk_invite_success()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/v1/company/invites/bulk', [
            'emails' => ['a@example.com', 'b@example.com', 'a@example.com'], // Test dedup
            'role' => 'hr',
        ]);

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data.succeeded')); // Deduped
        $this->assertCount(0, $response->json('data.failed'));

        $this->assertDatabaseHas('company_invites', ['email' => 'a@example.com']);
        $this->assertDatabaseHas('company_invites', ['email' => 'b@example.com']);
    }

    public function test_bulk_invite_limit_exceeded()
    {
        $emails = [];
        for ($i = 0; $i < 21; $i++) {
            $emails[] = "user{$i}@example.com";
        }

        $response = $this->actingAs($this->admin)->postJson('/api/v1/company/invites/bulk', [
            'emails' => $emails,
            'role' => 'hr',
        ]);

        $response->assertStatus(422);
    }
}
