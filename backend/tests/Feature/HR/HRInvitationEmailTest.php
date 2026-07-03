<?php

namespace Tests\Feature\HR;

use App\Mail\HRInvitationMail;
use App\Models\PostgreSQL\CompanyMembership;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class HRInvitationEmailTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private CompanyProfile $company;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();

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

    public function test_admin_can_invite_hr_and_email_is_dispatched()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/v1/company/invites', [
            'email' => 'newhr@example.com',
            'role' => 'hr',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'invite' => [
                    'id', 'email', 'role', 'status', 'expires_at', 'invite_email_sent_at',
                ],
            ],
            'message',
        ]);

        // Verify the raw token is completely absent from the response
        $this->assertArrayNotHasKey('token', $response->json('data.invite'));

        $this->assertDatabaseHas('company_invites', [
            'email' => 'newhr@example.com',
            'company_id' => $this->company->id,
            'invite_role' => 'hr',
        ]);

        $this->assertDatabaseMissing('company_invites', [
            'invite_email_sent_at' => null,
        ]);

        Mail::assertQueued(HRInvitationMail::class, function ($mail) {
            return $mail->hasTo('newhr@example.com') &&
                   $mail->invite->company_id === $this->company->id &&
                   $mail->inviter->id === $this->admin->id &&
                   ! empty($mail->rawToken);
        });
    }

    public function test_non_admin_cannot_invite_hr()
    {
        $hrUser = User::factory()->create(['role' => 'hr']);
        CompanyMembership::create([
            'company_id' => $this->company->id,
            'user_id' => $hrUser->id,
            'membership_role' => 'hr',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($hrUser)->postJson('/api/v1/company/invites', [
            'email' => 'another@example.com',
            'role' => 'hr',
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('code', 'UNAUTHORIZED');
    }
}
