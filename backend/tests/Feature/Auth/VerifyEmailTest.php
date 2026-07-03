<?php

namespace Tests\Feature\Auth;

use App\Models\PostgreSQL\User;
use App\Services\OTPService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Mockery;
use Tests\TestCase;

class VerifyEmailTest extends TestCase
{
    use RefreshDatabase;

    // ─── Happy Path ──────────────────────────────────────────────────────

    public function test_valid_otp_verifies_email_and_creates_user(): void
    {
        $otpMock = Mockery::mock(OTPService::class);
        $otpMock->shouldReceive('verify')->with('new@example.com', '123456')->andReturn('valid');
        $otpMock->shouldReceive('getStoredData')->with('new@example.com')->andReturn([
            'password_hash' => Hash::make('StrongP@ss1'),
            'role' => 'applicant',
        ]);
        $otpMock->shouldReceive('clearStoredData')->with('new@example.com');
        $this->app->instance(OTPService::class, $otpMock);

        $response = $this->postJson('/api/v1/auth/verify-email', [
            'email' => 'new@example.com',
            'code' => '123456',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Email verified successfully. Account created.',
            ])
            ->assertJsonStructure([
                'data' => ['token', 'user'],
            ]);

        // Verify user was actually created in the database
        $this->assertDatabaseHas('users', [
            'email' => 'new@example.com',
            'role' => 'applicant',
        ]);
    }

    // ─── OTP Error Cases ─────────────────────────────────────────────────

    public function test_invalid_otp_returns_422(): void
    {
        $otpMock = Mockery::mock(OTPService::class);
        $otpMock->shouldReceive('verify')->with('test@example.com', '000000')->andReturn('invalid');
        $this->app->instance(OTPService::class, $otpMock);

        $response = $this->postJson('/api/v1/auth/verify-email', [
            'email' => 'test@example.com',
            'code' => '000000',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'OTP_INVALID',
            ]);
    }

    public function test_expired_otp_returns_422(): void
    {
        $otpMock = Mockery::mock(OTPService::class);
        $otpMock->shouldReceive('verify')->with('test@example.com', '111111')->andReturn('expired');
        $this->app->instance(OTPService::class, $otpMock);

        $response = $this->postJson('/api/v1/auth/verify-email', [
            'email' => 'test@example.com',
            'code' => '111111',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'OTP_EXPIRED',
            ]);
    }

    public function test_max_attempts_returns_429(): void
    {
        $otpMock = Mockery::mock(OTPService::class);
        $otpMock->shouldReceive('verify')->with('test@example.com', '222222')->andReturn('max_attempts');
        $this->app->instance(OTPService::class, $otpMock);

        $response = $this->postJson('/api/v1/auth/verify-email', [
            'email' => 'test@example.com',
            'code' => '222222',
        ]);

        $response->assertStatus(429)
            ->assertJson([
                'success' => false,
                'code' => 'OTP_MAX_ATTEMPTS',
            ]);
    }

    // ─── Validation Errors ───────────────────────────────────────────────

    public function test_verify_email_requires_email_and_code(): void
    {
        $response = $this->postJson('/api/v1/auth/verify-email', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'code']);
    }

    public function test_verify_email_requires_6_digit_code(): void
    {
        $response = $this->postJson('/api/v1/auth/verify-email', [
            'email' => 'test@example.com',
            'code' => '12345',  // 5 chars, needs 6
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }
}
