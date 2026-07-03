<?php

namespace Tests\Feature\Auth;

use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LogoutAndMeTest extends TestCase
{
    use RefreshDatabase;

    // ─── Logout ──────────────────────────────────────────────────────────

    public function test_authenticated_user_can_logout(): void
    {
        $user = User::factory()->create([
            'password_hash' => Hash::make('StrongP@ss1'),
        ]);
        $tokenResult = $user->createToken('test');
        $token = $tokenResult->plainTextToken;
        $tokenId = $tokenResult->accessToken->id;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/v1/auth/logout');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Logged out successfully.',
            ]);

        // Verify token was deleted from database
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $tokenId,
        ]);
    }

    public function test_unauthenticated_logout_returns_401(): void
    {
        $response = $this->postJson('/api/v1/auth/logout');

        $response->assertStatus(401);
    }

    // ─── Me ──────────────────────────────────────────────────────────────

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create(['role' => 'applicant']);

        $response = $this->actingAs($user)
            ->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'role' => 'applicant',
                ],
            ]);
    }

    public function test_me_does_not_expose_password_hash(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->getJson('/api/v1/auth/me');

        $response->assertOk();

        $data = $response->json('data');
        $this->assertArrayNotHasKey('password_hash', $data);
    }

    public function test_me_loads_applicant_profile_for_applicant(): void
    {
        $user = User::factory()->applicant()->create();
        \App\Models\PostgreSQL\ApplicantProfile::factory()->create([
            'user_id' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'email',
                    'role',
                    'applicant_profile',
                ],
            ]);
    }

    public function test_me_loads_company_profile_for_hr(): void
    {
        $user = User::factory()->hr()->create();
        \App\Models\PostgreSQL\CompanyProfile::factory()->create([
            'user_id' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'email',
                    'role',
                    'company_profile',
                ],
            ]);
    }

    public function test_me_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(401);
    }

    // ─── Resend Verification ─────────────────────────────────────────────

    public function test_resend_verification_always_returns_200(): void
    {
        // Always 200 to prevent email enumeration
        $response = $this->postJson('/api/v1/auth/resend-verification', [
            'email' => 'nonexistent@example.com',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'If that email is registered, a new code has been sent.',
            ]);
    }

    public function test_resend_verification_requires_email(): void
    {
        $response = $this->postJson('/api/v1/auth/resend-verification', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
