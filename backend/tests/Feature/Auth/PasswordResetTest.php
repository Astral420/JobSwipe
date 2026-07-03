<?php

namespace Tests\Feature\Auth;

use App\Models\PostgreSQL\User;
use App\Services\PasswordResetService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Mockery;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    // ─── Forgot Password ─────────────────────────────────────────────────

    public function test_forgot_password_always_returns_200(): void
    {
        // Even for non-existent emails, returns 200 to prevent enumeration
        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'nobody@example.com',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'If that email is registered, a password reset code has been sent.',
            ]);
    }

    public function test_forgot_password_sends_code_for_existing_user(): void
    {
        $resetMock = Mockery::mock(PasswordResetService::class);
        $resetMock->shouldReceive('sendResetCode')->once()->with('exists@example.com');
        $this->app->instance(PasswordResetService::class, $resetMock);

        User::factory()->create(['email' => 'exists@example.com']);

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'exists@example.com',
        ]);

        $response->assertOk();
    }

    public function test_forgot_password_requires_email(): void
    {
        $response = $this->postJson('/api/v1/auth/forgot-password', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    // ─── Reset Password ──────────────────────────────────────────────────

    public function test_valid_reset_code_changes_password(): void
    {
        $resetMock = Mockery::mock(PasswordResetService::class);
        $resetMock->shouldReceive('verifyCode')->with('user@example.com', '123456')->andReturn('valid');
        $resetMock->shouldReceive('clearResetData')->with('user@example.com');
        $this->app->instance(PasswordResetService::class, $resetMock);

        $user = User::factory()->create([
            'email' => 'user@example.com',
            'password_hash' => Hash::make('TW0@t3st!erOldReset'),
        ]);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'user@example.com',
            'code' => '123456',
            'password' => 'TW0@t3st!erNewReset',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Password reset successfully. Please login with your new password.',
            ]);

        // Verify password was actually changed
        $user->refresh();
        $this->assertTrue(Hash::check('TW0@t3st!erNewReset', $user->password_hash));
    }

    public function test_reset_revokes_all_tokens(): void
    {
        $resetMock = Mockery::mock(PasswordResetService::class);
        $resetMock->shouldReceive('verifyCode')->andReturn('valid');
        $resetMock->shouldReceive('clearResetData');
        $this->app->instance(PasswordResetService::class, $resetMock);

        $user = User::factory()->create([
            'email' => 'tokentest@example.com',
            'password_hash' => Hash::make('TW0@t3st!erTokenOld'),
        ]);

        // Create a token
        $user->createToken('test-token');
        $this->assertCount(1, $user->tokens);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'tokentest@example.com',
            'code' => '123456',
            'password' => 'TW0@t3st!erTokenNew',
        ]);

        // All tokens should be revoked
        // Use fresh() to reload the model with relationships
        $this->assertCount(0, $user->fresh()->tokens);
    }

    public function test_invalid_reset_code_returns_422(): void
    {
        $resetMock = Mockery::mock(PasswordResetService::class);
        $resetMock->shouldReceive('verifyCode')->andReturn('invalid');
        $this->app->instance(PasswordResetService::class, $resetMock);

        User::factory()->create(['email' => 'user@example.com']);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'user@example.com',
            'code' => '000000',
            'password' => 'TW0@t3st!erInvalidCode',
        ]);

        $response->assertStatus(422)
            ->assertJson(['code' => 'CODE_INVALID']);
    }

    public function test_expired_reset_code_returns_422(): void
    {
        $resetMock = Mockery::mock(PasswordResetService::class);
        $resetMock->shouldReceive('verifyCode')->andReturn('expired');
        $this->app->instance(PasswordResetService::class, $resetMock);

        User::factory()->create(['email' => 'user@example.com']);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'user@example.com',
            'code' => '111111',
            'password' => 'TW0@t3st!erExpired',
        ]);

        $response->assertStatus(422)
            ->assertJson(['code' => 'CODE_EXPIRED']);
    }

    public function test_reset_password_validates_strong_password(): void
    {
        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'user@example.com',
            'code' => '123456',
            'password' => 'weak',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }
}
