<?php

namespace Tests\Unit\Models;

use App\Models\PostgreSQL\AdminSession;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSessionTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_has_correct_fillable_fields(): void
    {
        $session = new AdminSession;
        $fillable = $session->getFillable();

        $this->assertContains('user_id', $fillable);
        $this->assertContains('token_id', $fillable);
        $this->assertContains('ip_address', $fillable);
        $this->assertContains('user_agent', $fillable);
        $this->assertContains('last_activity_at', $fillable);
        $this->assertContains('expires_at', $fillable);
    }

    /** @test */
    public function it_casts_datetime_fields_correctly(): void
    {
        $session = new AdminSession;
        $casts = $session->getCasts();

        $this->assertEquals('datetime', $casts['last_activity_at']);
        $this->assertEquals('datetime', $casts['expires_at']);
    }

    /** @test */
    public function it_uses_uuid_as_primary_key(): void
    {
        $session = new AdminSession;

        $this->assertFalse($session->getIncrementing());
        $this->assertEquals('string', $session->getKeyType());
    }

    /** @test */
    public function it_generates_uuid_on_creation(): void
    {
        $user = User::factory()->create(['role' => 'admin']);

        $session = AdminSession::create([
            'user_id' => $user->id,
            'token_id' => 'test-token-123',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test Agent',
            'last_activity_at' => now(),
            'expires_at' => now()->addHours(24),
        ]);

        $this->assertNotNull($session->id);
        $this->assertIsString($session->id);
        $this->assertEquals(36, strlen($session->id)); // UUID length
    }

    /** @test */
    public function it_belongs_to_a_user(): void
    {
        $user = User::factory()->create(['role' => 'super_admin']);

        $session = AdminSession::create([
            'user_id' => $user->id,
            'token_id' => 'test-token-456',
            'ip_address' => '192.168.1.1',
            'user_agent' => 'Mozilla/5.0',
            'last_activity_at' => now(),
            'expires_at' => now()->addHours(24),
        ]);

        $this->assertInstanceOf(User::class, $session->user);
        $this->assertEquals($user->id, $session->user->id);
    }

    /** @test */
    public function it_detects_expired_session(): void
    {
        $user = User::factory()->create(['role' => 'admin']);

        $expiredSession = AdminSession::create([
            'user_id' => $user->id,
            'token_id' => 'expired-token',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test Agent',
            'last_activity_at' => now()->subHours(3),
            'expires_at' => now()->subHour(),
        ]);

        $this->assertTrue($expiredSession->isExpired());
    }

    /** @test */
    public function it_detects_non_expired_session(): void
    {
        $user = User::factory()->create(['role' => 'admin']);

        $activeSession = AdminSession::create([
            'user_id' => $user->id,
            'token_id' => 'active-token',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test Agent',
            'last_activity_at' => now(),
            'expires_at' => now()->addHours(24),
        ]);

        $this->assertFalse($activeSession->isExpired());
    }

    /** @test */
    public function it_detects_inactive_session_based_on_default_timeout(): void
    {
        $user = User::factory()->create(['role' => 'moderator']);

        // Default timeout is 120 minutes (2 hours)
        $inactiveSession = AdminSession::create([
            'user_id' => $user->id,
            'token_id' => 'inactive-token',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test Agent',
            'last_activity_at' => now()->subMinutes(121),
            'expires_at' => now()->addHours(24),
        ]);

        $this->assertTrue($inactiveSession->isInactive());
    }

    /** @test */
    public function it_detects_active_session_within_timeout(): void
    {
        $user = User::factory()->create(['role' => 'admin']);

        $activeSession = AdminSession::create([
            'user_id' => $user->id,
            'token_id' => 'active-token',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test Agent',
            'last_activity_at' => now()->subMinutes(30),
            'expires_at' => now()->addHours(24),
        ]);

        $this->assertFalse($activeSession->isInactive());
    }

    /** @test */
    public function it_updates_activity_timestamp(): void
    {
        $user = User::factory()->create(['role' => 'super_admin']);

        $session = AdminSession::create([
            'user_id' => $user->id,
            'token_id' => 'update-token',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test Agent',
            'last_activity_at' => now()->subHour(),
            'expires_at' => now()->addHours(24),
        ]);

        $oldActivity = $session->last_activity_at;

        // Wait a moment to ensure timestamp difference
        sleep(1);

        $session->updateActivity();
        $session->refresh();

        $this->assertNotEquals($oldActivity, $session->last_activity_at);
        $this->assertTrue($session->last_activity_at->greaterThan($oldActivity));
    }

    /** @test */
    public function it_respects_custom_inactivity_timeout_from_config(): void
    {
        config(['admin.session.inactivity_timeout_minutes' => 60]);

        $user = User::factory()->create(['role' => 'admin']);

        $session = AdminSession::create([
            'user_id' => $user->id,
            'token_id' => 'config-token',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test Agent',
            'last_activity_at' => now()->subMinutes(61),
            'expires_at' => now()->addHours(24),
        ]);

        $this->assertTrue($session->isInactive());

        $activeSession = AdminSession::create([
            'user_id' => $user->id,
            'token_id' => 'config-token-2',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test Agent',
            'last_activity_at' => now()->subMinutes(59),
            'expires_at' => now()->addHours(24),
        ]);

        $this->assertFalse($activeSession->isInactive());
    }
}
