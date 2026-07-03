<?php

namespace Tests\Feature\HR;

use App\Models\PostgreSQL\CompanyInvite;
use App\Models\PostgreSQL\CompanyMembership;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class InviteResendTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private CompanyProfile $company;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();

        $this->admin = User::factory()->create([
            'role' => 'company_admin',
            'email_verified_at' => now(),
        ]);
        $this->company = CompanyProfile::factory()->create(['owner_user_id' => $this->admin->id]);

        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $this->admin->id,
            'membership_role' => 'company_admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);
    }

    public function test_can_resend_pending_invite()
    {
        $invite = CompanyInvite::create([
            'company_id' => $this->company->id,
            'email' => 'hr@example.com',
            'email_domain' => 'example.com',
            'invite_role' => 'hr',
            'token_hash' => hash('sha256', 'old_token'),
            'invited_by_user_id' => $this->admin->id,
            'expires_at' => now()->addDays(7),
        ]);

        $response = $this->actingAs($this->admin)->postJson("/api/v1/company/invites/{$invite->id}/resend");

        $response->assertStatus(200);
        $this->assertNotNull($response->json('data.invite.invite_email_sent_at'));

        // Hash should be updated to invalidate old link
        $this->assertNotEquals(
            hash('sha256', 'old_token'),
            $invite->fresh()->token_hash
        );
    }

    public function test_cannot_resend_accepted_invite()
    {
        $invite = CompanyInvite::create([
            'company_id' => $this->company->id,
            'email' => 'hr@example.com',
            'email_domain' => 'example.com',
            'invite_role' => 'hr',
            'token_hash' => hash('sha256', 'old_token'),
            'invited_by_user_id' => $this->admin->id,
            'accepted_at' => now(), // ACCEPTED
            'expires_at' => now()->addDays(7),
        ]);

        $response = $this->actingAs($this->admin)->postJson("/api/v1/company/invites/{$invite->id}/resend");

        $response->assertStatus(400);
        $response->assertJsonPath('code', 'INVITE_ALREADY_ACCEPTED');
    }
}
