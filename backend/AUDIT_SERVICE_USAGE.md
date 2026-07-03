# AuditService Usage Guide

## Overview

The `AuditService` provides comprehensive audit logging for all admin actions in the JobSwipe platform. It creates immutable audit log records with complete context including actor, target, before/after states, and metadata.

## Features

- **Comprehensive Logging**: Captures all required fields (action type, resource type, resource ID, actor details, metadata, before/after states, IP, user agent)
- **Immutability**: Audit logs cannot be updated or deleted after creation
- **Flexible Querying**: Filter by admin user, action type, resource type, date range
- **CSV Export**: Generate CSV files for audit log exports
- **Automatic Context**: Automatically captures IP address and user agent from current request

## Basic Usage

### Logging an Admin Action

```php
use App\Services\AuditService;

class AdminService
{
    public function __construct(
        private AuditService $auditService,
        // ... other dependencies
    ) {}

    public function banUser(string $userId, User $actor): User
    {
        $user = $this->users->findById($userId);
        
        // Capture before state
        $beforeState = [
            'is_banned' => $user->is_banned,
            'role' => $user->role,
        ];
        
        // Perform the action
        $updated = $this->users->update($user, ['is_banned' => true]);
        $updated->tokens()->delete();
        
        // Capture after state
        $afterState = [
            'is_banned' => $updated->is_banned,
            'role' => $updated->role,
        ];
        
        // Log the action
        $this->auditService->log(
            actionType: 'user_ban',
            resourceType: 'user',
            resourceId: $userId,
            actor: $actor,
            metadata: ['reason' => 'Violation of terms'],
            beforeState: $beforeState,
            afterState: $afterState
        );
        
        return $updated;
    }
}
```

### Minimal Logging (without before/after states)

```php
// For actions that don't modify state
$this->auditService->log(
    actionType: 'company_verification_view',
    resourceType: 'company',
    resourceId: $companyId,
    actor: $actor
);
```

### Querying Audit Logs

```php
// Get all audit logs with pagination
$logs = $this->auditService->query(['per_page' => 20]);

// Filter by actor (admin user)
$logs = $this->auditService->query([
    'actor_id' => $adminUserId,
    'per_page' => 20
]);

// Filter by action type
$logs = $this->auditService->query([
    'action_type' => 'user_ban',
    'per_page' => 20
]);

// Filter by resource type
$logs = $this->auditService->query([
    'resource_type' => 'company',
    'per_page' => 20
]);

// Filter by date range
$logs = $this->auditService->query([
    'date_from' => '2026-01-01',
    'date_to' => '2026-12-31',
    'per_page' => 20
]);

// Combine multiple filters
$logs = $this->auditService->query([
    'actor_id' => $adminUserId,
    'action_type' => 'user_ban',
    'date_from' => '2026-01-01',
    'per_page' => 20
]);
```

### Exporting Audit Logs to CSV

```php
// Export all logs
$csvPath = $this->auditService->export([]);

// Export with filters
$csvPath = $this->auditService->export([
    'actor_id' => $adminUserId,
    'date_from' => '2026-01-01',
    'date_to' => '2026-12-31'
]);

// The CSV file is saved to storage/app/exports/
// You can then send it as a download response
return response()->download($csvPath);
```

### Getting Available Action Types

```php
$actionTypes = $this->auditService->getActionTypes();
// Returns array from config('admin.audit.action_types')
```

## Action Types

The following action types are configured in `config/admin.php`:

- `user_ban` - User account banned
- `user_unban` - User account unbanned
- `company_suspend` - Company account suspended
- `company_unsuspend` - Company account unsuspended
- `company_verification_approve` - Company verification approved
- `company_verification_reject` - Company verification rejected
- `job_flag` - Job posting flagged
- `job_unflag` - Job posting unflagged
- `job_close` - Job posting closed
- `job_force_delete` - Job posting force deleted
- `review_unflag` - Review unflagged
- `review_remove` - Review removed
- `subscription_cancel` - Subscription cancelled
- `webhook_retry` - Webhook event retried
- `trust_score_recalculate` - Trust score recalculated
- `trust_score_adjust` - Trust score manually adjusted
- `admin_user_create` - Admin user created
- `admin_user_update` - Admin user updated
- `admin_user_deactivate` - Admin user deactivated
- `admin_user_reactivate` - Admin user reactivated
- `admin_role_change` - Admin user role changed
- `admin_session_terminate` - Admin session terminated

## Resource Types

Common resource types:

- `user` - User accounts
- `company` - Company profiles
- `job` - Job postings
- `review` - Company reviews
- `subscription` - Subscriptions
- `webhook` - Webhook events
- `admin_user` - Admin users
- `admin_session` - Admin sessions

## Audit Log Structure

Each audit log contains:

```php
[
    'id' => 'uuid',
    'action_type' => 'user_ban',
    'resource_type' => 'user',
    'resource_id' => 'uuid',
    'actor_id' => 'uuid',
    'actor_role' => 'super_admin',
    'metadata' => ['reason' => 'Violation of terms'],
    'before_state' => ['is_banned' => false],
    'after_state' => ['is_banned' => true],
    'ip_address' => '192.168.1.1',
    'user_agent' => 'Mozilla/5.0...',
    'created_at' => '2026-04-28T12:00:00Z',
]
```

## Immutability

Audit logs are immutable by design. Any attempt to update or delete an audit log will throw a `RuntimeException`:

```php
$log = AuditLog::find($id);
$log->action_type = 'different_action'; // This will throw RuntimeException
$log->save();

$log->delete(); // This will also throw RuntimeException
```

## Best Practices

1. **Always log admin actions**: Every admin action that modifies data should be logged
2. **Capture before/after states**: For data modifications, always capture the state before and after
3. **Use meaningful metadata**: Include relevant context in the metadata field (e.g., reason for ban)
4. **Use consistent action types**: Use the configured action types from `config/admin.php`
5. **Log asynchronously**: For high-volume actions, consider dispatching audit logging to a queue
6. **Regular exports**: Periodically export audit logs for long-term archival

## Controller Example

```php
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;

class AdminUserController extends Controller
{
    public function __construct(
        private AuditService $auditService
    ) {}

    public function banUser(string $userId): JsonResponse
    {
        $actor = auth()->user();
        $user = User::findOrFail($userId);
        
        // Capture before state
        $beforeState = ['is_banned' => $user->is_banned];
        
        // Perform action
        $user->update(['is_banned' => true]);
        $user->tokens()->delete();
        
        // Capture after state
        $afterState = ['is_banned' => $user->is_banned];
        
        // Log the action
        $this->auditService->log(
            actionType: 'user_ban',
            resourceType: 'user',
            resourceId: $userId,
            actor: $actor,
            metadata: ['reason' => request('reason')],
            beforeState: $beforeState,
            afterState: $afterState
        );
        
        return response()->json([
            'success' => true,
            'message' => 'User banned successfully'
        ]);
    }
}
```

## Testing

The AuditService includes comprehensive unit tests. Run them with:

```bash
php artisan test --filter=AuditServiceTest
```

## Requirements Satisfied

This implementation satisfies the following requirements from the admin RBAC system spec:

- **Requirement 12.1**: Log all admin actions with complete context
- **Requirement 12.2**: Query audit logs with filtering
- **Requirement 12.3**: View audit log details
- **Requirement 12.5**: Protect audit logs from modification/deletion
- **Requirement 12.8**: Export audit logs to CSV
