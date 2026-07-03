<?php

namespace Tests\Feature\Auth;

use App\Models\PostgreSQL\CompanyProfile;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckCompanyDomainTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_company_info_when_domain_exists(): void
    {
        $owner = User::factory()->create();

        CompanyProfile::factory()->create([
            'user_id' => $owner->id,
            'owner_user_id' => $owner->id,
            'company_name' => 'Acme Corporation',
            'company_domain' => 'acme.com',
        ]);

        $response = $this->postJson('/api/v1/auth/check-company-domain', [
            'email' => 'Recruiter@Acme.com',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'company_exists' => true,
                    'company_name' => 'Acme Corporation',
                    'requires_invite' => true,
                ],
            ]);
    }

    public function test_it_returns_no_company_when_domain_does_not_exist(): void
    {
        $response = $this->postJson('/api/v1/auth/check-company-domain', [
            'email' => 'new@startup-example.com',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'company_exists' => false,
                    'company_name' => null,
                    'requires_invite' => false,
                ],
            ]);
    }

    public function test_it_validates_email_input(): void
    {
        $response = $this->postJson('/api/v1/auth/check-company-domain', []);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'VALIDATION_ERROR',
            ])
            ->assertJsonValidationErrors(['email']);
    }
}
