<?php

namespace Tests\Feature\HR;

use App\Models\PostgreSQL\CompanyInvite;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HRRegistrationWithMagicLinkTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private CompanyProfile $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'company_admin']);
        $this->company = CompanyProfile::factory()->create(['owner_user_id' => $this->admin->id]);
    }

    public function test_web_magic_link_registration_skips_otp()
    {
        $token = 'magic_link_token_123';
        $email = 'hr@example.com';

        CompanyInvite::create([
            'company_id' => $this->company->id,
            'email' => $email,
            'email_domain' => 'example.com',
            'invite_role' => 'hr',
            'token_hash' => hash('sha256', $token),
            'invited_by_user_id' => $this->admin->id,
            'expires_at' => now()->addDays(7),
        ]);

        // Register directly with magic_link_verified=true
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => $email,
            'password' => 'SecureP@ssw0rd2024!',
            'role' => 'hr',
            'company_invite_token' => $token,
            'magic_link_verified' => true, // Skipping OTP
        ]);

        if ($response->status() !== 200) {
            dump($response->json());
        }

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'web_magic_link_registered');
        $this->assertNotNull($response->json('data.token'));

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'role' => 'hr',
        ]);

        $user = User::where('email', $email)->first();
        $this->assertNotNull($user->email_verified_at);

        $this->assertDatabaseHas('company_memberships', [
            'user_id' => $user->id,
            'company_id' => $this->company->id,
            'status' => 'active',
        ]);
    }
}
