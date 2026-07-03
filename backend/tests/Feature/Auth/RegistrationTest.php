<?php

namespace Tests\Feature\Auth;

use App\Models\PostgreSQL\User;
use App\Services\OTPService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Stub the OTPService so no real emails/Redis calls happen during registration.
     */
    protected function mockOTPService(): void
    {
        $mock = Mockery::mock(OTPService::class);
        $mock->shouldReceive('sendOtp')->andReturn(true);
        $mock->shouldReceive('getStoredData')->andReturn(null);
        $this->app->instance(OTPService::class, $mock);
    }

    // ─── Happy Path ──────────────────────────────────────────────────────

    public function test_applicant_can_register_with_valid_data(): void
    {
        $this->mockOTPService();

        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'newuser@example.com',
            'password' => 'TW0@t3st!erRegister',
            'role' => 'applicant',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Verification code sent successfully',
                'data' => ['email' => 'newuser@example.com'],
            ]);
    }

    public function test_company_admin_can_register_with_new_domain(): void
    {
        $this->mockOTPService();

        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'admin@brand-new-domain.com',
            'password' => 'TW0@t3st!erAdmin',
            'role' => 'company_admin',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Verification code sent successfully',
            ]);
    }

    // ─── Validation Errors ───────────────────────────────────────────────

    public function test_registration_fails_without_required_fields(): void
    {
        $response = $this->postJson('/api/v1/auth/register', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password', 'role']);
    }

    public function test_registration_fails_with_invalid_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'test@example.com',
            'password' => 'TW0@t3st!erInvalidRole',
            'role' => 'superuser',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_registration_fails_with_weak_password(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'test@example.com',
            'password' => 'weak',
            'role' => 'applicant',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_registration_fails_with_invalid_email(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'not-an-email',
            'password' => 'TW0@t3st!erInvalidEmail',
            'role' => 'applicant',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    // ─── Business Logic Errors ───────────────────────────────────────────

    public function test_registration_rejects_duplicate_email(): void
    {
        $this->mockOTPService();

        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'taken@example.com',
            'password' => 'TW0@t3st!erDuplicate',
            'role' => 'applicant',
        ]);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'EMAIL_TAKEN',
            ]);
    }

    public function test_hr_cannot_register_with_oauth_provider(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'hr@company.com',
            'password' => 'TW0@t3st!erHROAuth',
            'role' => 'hr',
            'oauth_provider' => 'google',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'OAUTH_NOT_PERMITTED',
            ]);
    }

    public function test_company_admin_oauth_is_also_rejected(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'admin@company.com',
            'password' => 'TW0@t3st!erAdminOAuth',
            'role' => 'company_admin',
            'oauth_provider' => 'google',
        ]);

        $response->assertStatus(422)
            ->assertJson(['code' => 'OAUTH_NOT_PERMITTED']);
    }

    // ─── Response Structure ──────────────────────────────────────────────

    public function test_successful_registration_returns_correct_structure(): void
    {
        $this->mockOTPService();

        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'structure@example.com',
            'password' => 'TW0@t3st!erStructure',
            'role' => 'applicant',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => ['email'],
                'message',
            ]);
    }
}
