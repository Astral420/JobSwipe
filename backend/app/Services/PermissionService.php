<?php

namespace App\Services;

use App\Models\PostgreSQL\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Redis;

class PermissionService
{
    private const CACHE_PREFIX = 'admin:permissions';

    private const CACHE_TTL = 1800; // 30 minutes

    /**
     * Check if a user has a specific permission.
     */
    public function hasPermission(User $user, string $permission): bool
    {
        // Non-admin users have no admin permissions
        if (! $this->isAdminUser($user)) {
            return false;
        }

        // Get permissions for user's role
        $rolePermissions = $this->getRolePermissions($user->role);

        return in_array($permission, $rolePermissions, true);
    }

    /**
     * Check if a user has one of the specified roles.
     */
    public function hasRole(User $user, string|array $roles): bool
    {
        $roles = is_array($roles) ? $roles : [$roles];

        return in_array($user->role, $roles, true);
    }

    /**
     * Get all permissions for a specific role.
     */
    public function getRolePermissions(string $role): array
    {
        // Try to get from cache first
        $cacheKey = $this->getCacheKey("role:{$role}");
        $cached = Redis::get($cacheKey);

        if ($cached !== null) {
            return json_decode($cached, true);
        }

        // Load from config
        $permissionMatrix = config('admin.permissions', []);
        $permissions = [];

        foreach ($permissionMatrix as $permission => $allowedRoles) {
            if (in_array($role, $allowedRoles, true)) {
                $permissions[] = $permission;
            }
        }

        // Cache the result
        Redis::setex($cacheKey, self::CACHE_TTL, json_encode($permissions));

        return $permissions;
    }

    /**
     * Context-aware permission check with additional validation.
     *
     * @param  User  $user  The user performing the action
     * @param  string  $action  The action being performed (e.g., 'user_ban', 'company_suspend')
     * @param  Model|null  $target  The target resource (optional)
     */
    public function canPerformAction(User $user, string $action, ?Model $target = null): bool
    {
        // Map actions to permissions
        $actionPermissionMap = [
            'user_ban' => 'users.ban',
            'user_unban' => 'users.unban',
            'company_verify' => 'companies.verify',
            'company_reject_verification' => 'companies.reject_verification',
            'company_suspend' => 'companies.suspend',
            'company_unsuspend' => 'companies.unsuspend',
            'job_flag' => 'jobs.flag',
            'job_unflag' => 'jobs.unflag',
            'job_close' => 'jobs.close',
            'job_delete' => 'jobs.delete',
            'review_unflag' => 'reviews.unflag',
            'review_remove' => 'reviews.remove',
            'subscription_cancel' => 'subscriptions.cancel',
            'webhook_retry' => 'iap.retry_webhook',
            'trust_recalculate' => 'trust.recalculate',
            'trust_adjust' => 'trust.adjust',
            'admin_user_create' => 'admin_users.create',
            'admin_user_update' => 'admin_users.update',
            'admin_user_deactivate' => 'admin_users.deactivate',
            'admin_user_reactivate' => 'admin_users.reactivate',
        ];

        $permission = $actionPermissionMap[$action] ?? null;

        if ($permission === null) {
            return false;
        }

        // Check base permission
        if (! $this->hasPermission($user, $permission)) {
            return false;
        }

        // Context-aware checks
        if ($target instanceof User) {
            // Prevent self-modification
            if ($target->id === $user->id) {
                return false;
            }

            // Prevent modifying other super_admins (unless actor is also super_admin)
            if ($target->role === 'super_admin' && $user->role !== 'super_admin') {
                return false;
            }

            // For ban/unban actions, prevent non-super_admins from targeting super_admins
            if (in_array($action, ['user_ban', 'user_unban'], true)) {
                if ($target->role === 'super_admin') {
                    return false;
                }
            }

            // For admin user management actions
            if (in_array($action, ['admin_user_update', 'admin_user_deactivate'], true)) {
                // Prevent modifying other super_admins unless actor is super_admin
                if ($target->role === 'super_admin' && $user->role !== 'super_admin') {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Get the complete permission matrix from config.
     */
    public function getPermissionMatrix(): array
    {
        // Try to get from cache first
        $cacheKey = $this->getCacheKey('matrix');
        $cached = Redis::get($cacheKey);

        if ($cached !== null) {
            return json_decode($cached, true);
        }

        // Load from config
        $matrix = config('admin.permissions', []);

        // Cache the result
        Redis::setex($cacheKey, self::CACHE_TTL, json_encode($matrix));

        return $matrix;
    }

    /**
     * Clear all permission caches.
     */
    public function clearPermissionCache(): void
    {
        // Clear specific known cache keys
        $roles = ['super_admin', 'admin', 'moderator'];

        foreach ($roles as $role) {
            Redis::del($this->getCacheKey("role:{$role}"));
        }

        Redis::del($this->getCacheKey('matrix'));
    }

    /**
     * Check if a user is an admin user (has any admin role).
     */
    private function isAdminUser(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'moderator'], true);
    }

    /**
     * Generate cache key with prefix.
     */
    private function getCacheKey(string $suffix): string
    {
        return self::CACHE_PREFIX.':'.$suffix;
    }
}
