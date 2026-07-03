<?php

namespace Tests\Unit\Services;

use App\Models\PostgreSQL\User;
use App\Services\PermissionService;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class PermissionServiceTest extends TestCase
{
    private PermissionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PermissionService;

        // Clear Redis cache before each test
        Redis::flushdb();
    }

    protected function tearDown(): void
    {
        Redis::flushdb();
        parent::tearDown();
    }

    public function test_has_permission_returns_true_for_valid_permission(): void
    {
        $user = new User;
        $user->id = 'user-1';
        $user->role = 'super_admin';

        $result = $this->service->hasPermission($user, 'users.ban');

        $this->assertTrue($result);
    }

    public function test_has_permission_returns_false_for_invalid_permission(): void
    {
        $user = new User;
        $user->id = 'user-2';
        $user->role = 'moderator';

        $result = $this->service->hasPermission($user, 'users.ban');

        $this->assertFalse($result);
    }

    public function test_has_permission_returns_false_for_non_admin_user(): void
    {
        $user = new User;
        $user->id = 'user-3';
        $user->role = 'applicant';

        $result = $this->service->hasPermission($user, 'dashboard.view');

        $this->assertFalse($result);
    }

    public function test_has_role_returns_true_for_matching_role(): void
    {
        $user = new User;
        $user->role = 'admin';

        $result = $this->service->hasRole($user, 'admin');

        $this->assertTrue($result);
    }

    public function test_has_role_returns_true_for_matching_role_in_array(): void
    {
        $user = new User;
        $user->role = 'moderator';

        $result = $this->service->hasRole($user, ['admin', 'moderator']);

        $this->assertTrue($result);
    }

    public function test_has_role_returns_false_for_non_matching_role(): void
    {
        $user = new User;
        $user->role = 'moderator';

        $result = $this->service->hasRole($user, 'super_admin');

        $this->assertFalse($result);
    }

    public function test_get_role_permissions_returns_correct_permissions_for_super_admin(): void
    {
        $permissions = $this->service->getRolePermissions('super_admin');

        $this->assertIsArray($permissions);
        $this->assertContains('users.ban', $permissions);
        $this->assertContains('companies.suspend', $permissions);
        $this->assertContains('admin_users.create', $permissions);
    }

    public function test_get_role_permissions_returns_correct_permissions_for_admin(): void
    {
        $permissions = $this->service->getRolePermissions('admin');

        $this->assertIsArray($permissions);
        $this->assertContains('companies.verify', $permissions);
        $this->assertContains('jobs.flag', $permissions);
        $this->assertNotContains('users.ban', $permissions);
        $this->assertNotContains('admin_users.create', $permissions);
    }

    public function test_get_role_permissions_returns_correct_permissions_for_moderator(): void
    {
        $permissions = $this->service->getRolePermissions('moderator');

        $this->assertIsArray($permissions);
        $this->assertContains('dashboard.view', $permissions);
        $this->assertContains('users.view', $permissions);
        $this->assertNotContains('users.ban', $permissions);
        $this->assertNotContains('companies.verify', $permissions);
    }

    public function test_get_role_permissions_caches_result(): void
    {
        // First call - should cache
        $permissions1 = $this->service->getRolePermissions('admin');

        // Check cache exists
        $cacheKey = 'admin:permissions:role:admin';
        $cached = Redis::get($cacheKey);
        $this->assertNotNull($cached);

        // Second call - should use cache
        $permissions2 = $this->service->getRolePermissions('admin');

        $this->assertEquals($permissions1, $permissions2);
    }

    public function test_can_perform_action_returns_true_for_valid_action(): void
    {
        $user = new User;
        $user->id = 'user-1';
        $user->role = 'super_admin';

        $result = $this->service->canPerformAction($user, 'user_ban');

        $this->assertTrue($result);
    }

    public function test_can_perform_action_returns_false_for_invalid_permission(): void
    {
        $user = new User;
        $user->id = 'user-2';
        $user->role = 'moderator';

        $result = $this->service->canPerformAction($user, 'user_ban');

        $this->assertFalse($result);
    }

    public function test_can_perform_action_prevents_self_modification(): void
    {
        $user = new User;
        $user->id = 'user-1';
        $user->role = 'super_admin';

        $target = new User;
        $target->id = 'user-1';
        $target->role = 'admin';

        $result = $this->service->canPerformAction($user, 'user_ban', $target);

        $this->assertFalse($result);
    }

    public function test_can_perform_action_prevents_non_super_admin_from_banning_super_admin(): void
    {
        $user = new User;
        $user->id = 'user-1';
        $user->role = 'admin';

        $target = new User;
        $target->id = 'user-2';
        $target->role = 'super_admin';

        $result = $this->service->canPerformAction($user, 'user_ban', $target);

        $this->assertFalse($result);
    }

    public function test_can_perform_action_allows_super_admin_to_modify_admin(): void
    {
        $user = new User;
        $user->id = 'user-1';
        $user->role = 'super_admin';

        $target = new User;
        $target->id = 'user-2';
        $target->role = 'admin';

        $result = $this->service->canPerformAction($user, 'admin_user_update', $target);

        $this->assertTrue($result); // Super admin can modify admin users
    }

    public function test_can_perform_action_returns_false_for_unknown_action(): void
    {
        $user = new User;
        $user->id = 'user-1';
        $user->role = 'super_admin';

        $result = $this->service->canPerformAction($user, 'unknown_action');

        $this->assertFalse($result);
    }

    public function test_get_permission_matrix_returns_full_matrix(): void
    {
        $matrix = $this->service->getPermissionMatrix();

        $this->assertIsArray($matrix);
        $this->assertArrayHasKey('dashboard.view', $matrix);
        $this->assertArrayHasKey('users.ban', $matrix);
        $this->assertArrayHasKey('companies.verify', $matrix);
    }

    public function test_get_permission_matrix_caches_result(): void
    {
        // First call - should cache
        $matrix1 = $this->service->getPermissionMatrix();

        // Check cache exists
        $cacheKey = 'admin:permissions:matrix';
        $cached = Redis::get($cacheKey);
        $this->assertNotNull($cached);

        // Second call - should use cache
        $matrix2 = $this->service->getPermissionMatrix();

        $this->assertEquals($matrix1, $matrix2);
    }

    public function test_clear_permission_cache_removes_all_caches(): void
    {
        // Create some cached data
        $this->service->getRolePermissions('admin');
        $this->service->getPermissionMatrix();

        // Verify caches exist
        $this->assertNotNull(Redis::get('admin:permissions:role:admin'));
        $this->assertNotNull(Redis::get('admin:permissions:matrix'));

        // Clear cache
        $this->service->clearPermissionCache();

        // Verify caches are cleared
        $this->assertNull(Redis::get('admin:permissions:role:admin'));
        $this->assertNull(Redis::get('admin:permissions:matrix'));
    }

    public function test_moderator_has_read_only_permissions(): void
    {
        $user = new User;
        $user->role = 'moderator';

        // Should have view permissions
        $this->assertTrue($this->service->hasPermission($user, 'dashboard.view'));
        $this->assertTrue($this->service->hasPermission($user, 'users.view'));
        $this->assertTrue($this->service->hasPermission($user, 'companies.view'));

        // Should not have write permissions
        $this->assertFalse($this->service->hasPermission($user, 'users.ban'));
        $this->assertFalse($this->service->hasPermission($user, 'companies.verify'));
        $this->assertFalse($this->service->hasPermission($user, 'jobs.flag'));
    }

    public function test_admin_has_mid_level_permissions(): void
    {
        $user = new User;
        $user->role = 'admin';

        // Should have view permissions
        $this->assertTrue($this->service->hasPermission($user, 'dashboard.view'));
        $this->assertTrue($this->service->hasPermission($user, 'dashboard.analytics'));

        // Should have write permissions
        $this->assertTrue($this->service->hasPermission($user, 'companies.verify'));
        $this->assertTrue($this->service->hasPermission($user, 'jobs.flag'));
        $this->assertTrue($this->service->hasPermission($user, 'trust.recalculate'));

        // Should not have destructive permissions
        $this->assertFalse($this->service->hasPermission($user, 'users.ban'));
        $this->assertFalse($this->service->hasPermission($user, 'companies.suspend'));
        $this->assertFalse($this->service->hasPermission($user, 'admin_users.create'));
    }

    public function test_super_admin_has_all_permissions(): void
    {
        $user = new User;
        $user->role = 'super_admin';

        // Should have all permissions
        $this->assertTrue($this->service->hasPermission($user, 'dashboard.view'));
        $this->assertTrue($this->service->hasPermission($user, 'dashboard.system_health'));
        $this->assertTrue($this->service->hasPermission($user, 'users.ban'));
        $this->assertTrue($this->service->hasPermission($user, 'companies.suspend'));
        $this->assertTrue($this->service->hasPermission($user, 'jobs.delete'));
        $this->assertTrue($this->service->hasPermission($user, 'admin_users.create'));
        $this->assertTrue($this->service->hasPermission($user, 'audit.export'));
    }
}
