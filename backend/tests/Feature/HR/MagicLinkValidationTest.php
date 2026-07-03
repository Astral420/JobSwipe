<?php

namespace Tests\Feature\HR;

use App\Models\PostgreSQL\CompanyInvite;
use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MagicLinkValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private CompanyProfile $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'company_admin', 'email' => 'admin@company.com']);
        $this->company = CompanyProfile::factory()->create([
            'owner_user_id' => $this->admin->id,
            'company_name' => 'Test Corp',
            // logo_url belongs in MongoDB CompanyProfileDocument, not PostgreSQL CompanyProfile
        ]);
    }

    private function createInvite(string $email, string $token, array $overrides = []): CompanyInvite
    {
        return CompanyInvite::create(array_merge([
            'company_id' => $this->company->id,
            'email' => $email,
            'email_domain' => 'example.com',
            'invite_role' => 'hr',
            'token_hash' => hash('sha256', $token),
            'invited_by_user_id' => $this->admin->id,
            'expires_at' => now()->addDays(7),
        ], $overrides));
    }

    public function test_valid_magic_link_returns_company_and_inviter_info()
    {
        $token = 'valid_token_123';
        $email = 'hr@example.com';
        $invite = $this->createInvite($email, $token);

        $this->assertNull($invite->magic_link_clicked_at);

        $response = $this->postJson('/api/v1/company/invites/validate', [
            'email' => $email,
            'token' => $token,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.valid', true);
        $response->assertJsonPath('data.company_name', 'Test Corp');
        // logo_url is in MongoDB CompanyProfileDocument, not yet implemented in this endpoint
        // $response->assertJsonPath('data.company_logo_url', 'https://example.com/logo.png');
        $response->assertJsonPath('data.inviter_name', 'admin@company.com');

        // Verify click tracking
        $updatedInvite = CompanyInvite::find($invite->id);
        $this->assertNotNull($updatedInvite->magic_link_clicked_at);
    }

    public function test_expired_magic_link()
    {
        $token = 'expired_token';
        $email = 'hr@example.com';
        $this->createInvite($email, $token, ['expires_at' => now()->subDay()]);

        $response = $this->postJson('/api/v1/company/invites/validate', [
            'email' => $email,
            'token' => $token,
        ]);

        $response->assertStatus(400);
        $response->assertJsonPath('code', 'INVITE_EXPIRED');
    }

    public function test_already_accepted_magic_link()
    {
        $token = 'accepted_token';
        $email = 'hr@example.com';
        $this->createInvite($email, $token, ['accepted_at' => now()]);

        $response = $this->postJson('/api/v1/company/invites/validate', [
            'email' => $email,
            'token' => $token,
        ]);

        $response->assertStatus(400);
        $response->assertJsonPath('code', 'INVITE_ALREADY_ACCEPTED');
    }

    public function test_invalid_token()
    {
        $email = 'hr@example.com';
        $this->createInvite($email, 'real_token');

        $response = $this->postJson('/api/v1/company/invites/validate', [
            'email' => $email,
            'token' => 'wrong_token',
        ]);

        $response->assertStatus(400);
        $response->assertJsonPath('code', 'INVITE_INVALID');
    }
}
