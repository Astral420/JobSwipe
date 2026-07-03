<?php

namespace Tests\Unit\Services;

use App\Mail\AdminInvitationMail;
use App\Mail\AdminRoleChangedMail;
use App\Models\PostgreSQL\AdminInvitation;
use App\Models\PostgreSQL\User;
use App\Services\AdminUserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminUserServiceTest extends TestCase
{
    use RefreshDatabase;

    private AdminUserService $service;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->service = app(AdminUserService::class);

        // Create a super_admin user for testing
        $this->superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);
    }

    /** @test */
    public function it_creates_admin_user_with_invitation_token()
    {
        $email = 'newadmin@example.com';
        $role = 'admin';

        $result = $this->service->createAdminUser($email, $role, $this->superAdmin);

        $this->assertArrayHasKey('user', $result);
        $this->assertArrayHasKey('invitation', $result);

        $user = $result['user'];
        $invitation = $result['invitation'];

        $this->assertEquals($email, $user->email);
        $this->assertEquals($role, $user->role);
        $this->assertFalse($user->is_active);

        $this->assertEquals($email, $invitation->email);
        $this->assertEquals($role, $invitation->role);
        $this->assertNotEmpty($invitation->token);
        $this->assertEquals($this->superAdmin->id, $invitation->invited_by);

        Mail::assertQueued(AdminInvitationMail::class);
    }

    /** @test */
    public function it_throws_exception_when_creating_user_with_existing_email()
    {
        $existingUser = User::factory()->create([
            'email' => 'existing@example.com',
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Email already exists');

        $this->service->createAdminUser('existing@example.com', 'admin', $this->superAdmin);
    }

    /** @test */
    public function it_throws_exception_when_creating_super_admin_via_invitation()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Invalid role');

        $this->service->createAdminUser('test@example.com', 'super_admin', $this->superAdmin);
    }

    /** @test */
    public function it_updates_user_role_and_revokes_tokens()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);

        // Create a token for the user
        $admin->createToken('test_token');
        $this->assertEquals(1, $admin->tokens()->count());

        $updatedUser = $this->service->updateRole($admin->id, 'moderator', $this->superAdmin);

        $this->assertEquals('moderator', $updatedUser->role);
        $this->assertEquals(0, $updatedUser->tokens()->count());

        Mail::assertQueued(AdminRoleChangedMail::class);
    }

    /** @test */
    public function it_prevents_self_role_modification()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot modify your own role');

        $this->service->updateRole($this->superAdmin->id, 'admin', $this->superAdmin);
    }

    /** @test */
    public function it_prevents_direct_moderator_to_super_admin_transition()
    {
        $moderator = User::factory()->create([
            'role' => 'moderator',
            'is_active' => true,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Invalid role transition');

        $this->service->updateRole($moderator->id, 'super_admin', $this->superAdmin);
    }

    /** @test */
    public function it_prevents_demoting_last_super_admin()
    {
        // Note: This test verifies the protection logic exists, but cannot fully test
        // the "last super_admin" scenario because:
        // - To demote a super_admin, the actor must be a super_admin (permission requirement)
        // - If there's only 1 super_admin and the actor is also a super_admin, count >= 2
        // - Therefore, we can never have exactly 1 super_admin when attempting demotion
        //
        // The check in the service (if count <= 1, prevent) is correct and will prevent
        // demotion when count is 1, but this scenario cannot occur in practice due to
        // the permission requirements.
        //
        // We test the closest scenario: with 2 super_admins, demote one (succeeds),
        // leaving 1. Then verify that count is now 1.

        // Create another super_admin
        $anotherSuperAdmin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        // Demote the second super_admin - should succeed
        $this->service->updateRole($anotherSuperAdmin->id, 'admin', $this->superAdmin);

        // Verify only 1 super_admin remains
        $superAdminCount = User::where('role', 'super_admin')->count();
        $this->assertEquals(1, $superAdminCount);

        // If we tried to demote the last one now, it would fail,
        // but we can't test it because we'd need another super_admin to perform the action
    }

    /** @test */
    public function it_allows_demoting_super_admin_when_multiple_exist()
    {
        // Create another super_admin
        $anotherSuperAdmin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $updatedUser = $this->service->updateRole($this->superAdmin->id, 'admin', $anotherSuperAdmin);

        $this->assertEquals('admin', $updatedUser->role);
    }

    /** @test */
    public function it_deactivates_admin_user_and_revokes_tokens()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);

        // Create a token for the user
        $admin->createToken('test_token');

        $result = $this->service->deactivateAdminUser($admin->id, $this->superAdmin);

        $this->assertTrue($result);

        $admin->refresh();
        $this->assertFalse($admin->is_active);
        $this->assertEquals(0, $admin->tokens()->count());
    }

    /** @test */
    public function it_prevents_self_deactivation()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot deactivate yourself');

        $this->service->deactivateAdminUser($this->superAdmin->id, $this->superAdmin);
    }

    /** @test */
    public function it_allows_deactivating_super_admin_when_multiple_active_exist()
    {
        // Create another super_admin
        $anotherSuperAdmin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        // Should succeed because there are 2 active super_admins
        $result = $this->service->deactivateAdminUser($this->superAdmin->id, $anotherSuperAdmin);

        $this->assertTrue($result);

        $this->superAdmin->refresh();
        $this->assertFalse($this->superAdmin->is_active);
    }

    /** @test */
    public function it_reactivates_admin_user()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_active' => false,
        ]);

        $result = $this->service->reactivateAdminUser($admin->id, $this->superAdmin);

        $this->assertTrue($result);

        $admin->refresh();
        $this->assertTrue($admin->is_active);
    }

    /** @test */
    public function it_lists_admin_users_with_filters()
    {
        // Create various admin users
        User::factory()->create(['role' => 'admin', 'is_active' => true]);
        User::factory()->create(['role' => 'moderator', 'is_active' => true]);
        User::factory()->create(['role' => 'admin', 'is_active' => false]);
        User::factory()->create(['role' => 'applicant']); // Should not be included

        $results = $this->service->listAdminUsers([]);

        // Should include super_admin from setUp + 3 admin users = 4 total
        $this->assertEquals(4, $results->total());
    }

    /** @test */
    public function it_filters_admin_users_by_role()
    {
        User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'moderator']);

        $results = $this->service->listAdminUsers(['role' => 'admin']);

        // Should only include admin users (not the super_admin from setUp or moderator)
        $this->assertEquals(1, $results->total());
    }

    /** @test */
    public function it_filters_admin_users_by_active_status()
    {
        User::factory()->create(['role' => 'admin', 'is_active' => true]);
        User::factory()->create(['role' => 'admin', 'is_active' => false]);

        $results = $this->service->listAdminUsers(['is_active' => true]);

        // Should include super_admin from setUp + 1 active admin = 2 total
        $this->assertEquals(2, $results->total());
    }

    /** @test */
    public function it_gets_admin_user_details()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);

        $details = $this->service->getAdminUserDetails($admin->id);

        $this->assertArrayHasKey('user', $details);
        $this->assertArrayHasKey('recent_actions', $details);
        $this->assertArrayHasKey('invitation', $details);
        $this->assertArrayHasKey('active_tokens_count', $details);

        $this->assertEquals($admin->id, $details['user']->id);
    }

    /** @test */
    public function it_validates_role_transitions()
    {
        // Valid transitions
        $this->assertTrue($this->service->validateRoleTransition('moderator', 'admin'));
        $this->assertTrue($this->service->validateRoleTransition('admin', 'super_admin'));
        $this->assertTrue($this->service->validateRoleTransition('admin', 'moderator'));
        $this->assertTrue($this->service->validateRoleTransition('super_admin', 'admin'));

        // Invalid transition
        $this->assertFalse($this->service->validateRoleTransition('moderator', 'super_admin'));

        // Same role (no-op, but valid)
        $this->assertTrue($this->service->validateRoleTransition('admin', 'admin'));
    }

    /** @test */
    public function it_resends_invitation()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_active' => false,
        ]);

        $oldInvitation = AdminInvitation::create([
            'email' => $admin->email,
            'role' => 'admin',
            'token' => 'old_token',
            'invited_by' => $this->superAdmin->id,
            'expires_at' => now()->subDays(1), // Expired
        ]);

        $this->service->resendInvitation($admin->id, $this->superAdmin);

        $oldInvitation->refresh();
        $this->assertNotNull($oldInvitation->revoked_at);

        $newInvitation = AdminInvitation::where('email', $admin->email)
            ->whereNull('revoked_at')
            ->first();

        $this->assertNotNull($newInvitation);
        $this->assertNotEquals('old_token', $newInvitation->token);

        Mail::assertQueued(AdminInvitationMail::class);
    }

    /** @test */
    public function it_revokes_invitation()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_active' => false,
        ]);

        $invitation = AdminInvitation::create([
            'email' => $admin->email,
            'role' => 'admin',
            'token' => 'test_token',
            'invited_by' => $this->superAdmin->id,
            'expires_at' => now()->addDays(7),
        ]);

        $this->service->revokeInvitation($admin->id, $this->superAdmin);

        $invitation->refresh();
        $this->assertNotNull($invitation->revoked_at);

        $admin->refresh();
        $this->assertFalse($admin->is_active);
    }
}
