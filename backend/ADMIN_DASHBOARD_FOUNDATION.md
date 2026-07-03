# Admin Dashboard Foundation Setup

This document describes the foundation infrastructure for admin dashboard endpoints.

## Database Optimization

### Indexes Created

The migration `2026_04_20_000001_add_admin_dashboard_indexes.php` creates the following indexes for optimal admin query performance:

#### Company Profiles
- `idx_company_profiles_subscription_status` - Filter by subscription status
- `idx_company_profiles_created_at` - Sort by creation date
- `idx_company_profiles_subscription_tier` - Filter by subscription tier
- `idx_company_profiles_trust_level` - Filter by trust level (from trust migration)

#### Job Postings
- `idx_job_postings_status` - Filter by job status
- `idx_job_postings_company_status` - Composite index for company + status queries
- `idx_job_postings_created_at` - Sort by creation date

#### Subscriptions
- `idx_subscriptions_status` - Filter by subscription status
- `idx_subscriptions_tier` - Filter by subscription tier
- `idx_subscriptions_created_at` - Sort by creation date
- `idx_subscriptions_subscriber_type` - Filter by subscriber type (applicant/company)

#### IAP Transactions
- `idx_iap_transactions_provider` - Filter by payment provider
- `idx_iap_transactions_created_at` - Sort by creation date

#### Matches
- `idx_matches_status` - Filter by match status
- `idx_matches_created_at` - Sort by creation date
- `idx_matches_matched_at` - Sort by match date

#### Applications
- `idx_applications_status` - Filter by application status
- `idx_applications_created_at` - Sort by creation date

#### Users
- `idx_users_role` - Filter by user role
- `idx_users_created_at` - Sort by creation date
- `idx_users_is_banned` - Filter by banned status

### Performance Targets

With these indexes in place, admin endpoints should achieve:
- List endpoints: < 500ms response time for datasets under 10,000 records
- Detail endpoints: < 200ms response time for single record retrieval
- Analytics endpoints: < 1000ms response time for complex aggregations

## Redis Caching Configuration

### Configuration File

The `config/admin.php` file defines caching TTL values and cache key prefixes for admin endpoints.

### Cache TTL Values

- **Dashboard Statistics**: 15 minutes (900 seconds)
- **Company Lists**: 5 minutes (300 seconds)
- **Revenue Data**: 1 hour (3600 seconds)
- **Trust Events**: 10 minutes (600 seconds)
- **Match Statistics**: 15 minutes (900 seconds)
- **Application Statistics**: 15 minutes (900 seconds)
- **User Growth Data**: 15 minutes (900 seconds)
- **Recent Activity**: 5 minutes (300 seconds)

### Cache Key Prefixes

All admin cache keys use the `admin:` prefix to organize data:

```
admin:dashboard:stats
admin:dashboard:user_growth:{days}
admin:dashboard:revenue:{months}
admin:dashboard:activity
admin:companies:list:{hash}
admin:company:{id}:details
admin:trust:low_companies
admin:matches:stats
admin:applications:stats
admin:subscriptions:revenue
```

### AdminCacheable Trait

The `App\Support\AdminCacheable` trait provides convenient caching methods:

```php
use App\Support\AdminCacheable;

class AdminService
{
    use AdminCacheable;
    
    public function getDashboardStats(): array
    {
        return $this->cacheDashboardStats(function () {
            // Expensive query here
            return $this->calculateStats();
        });
    }
    
    public function suspendCompany(string $companyId): void
    {
        // Perform suspension
        
        // Invalidate related caches
        $this->invalidateCompanyCache($companyId);
    }
}
```

### Cache Invalidation

The trait provides methods to invalidate caches when data changes:

- `invalidateCompanyCache($companyId)` - Clear company-related caches
- `invalidateTrustCache()` - Clear trust-related caches
- `invalidateAnalyticsCache()` - Clear analytics caches
- `invalidateAllAdminCache()` - Clear all admin caches

## Response Helpers

Admin controllers use the existing `ApiResponse` trait from `App\Support\ApiResponse`:

```php
// Success response
return $this->success($data, 'Companies retrieved successfully.');

// Error response
return $this->error('COMPANY_NOT_FOUND', 'Company not found', 404);

// Validation error
return $this->validationError($errors);
```

### Response Format

All responses follow the standardized format:

**Success:**
```json
{
  "success": true,
  "data": {},
  "message": "Success message"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

**Paginated:**
```json
{
  "success": true,
  "data": {
    "data": [],
    "current_page": 1,
    "per_page": 20,
    "total": 100,
    "last_page": 5
  },
  "message": "Success message"
}
```

## Middleware Configuration

### Role-Based Authorization

The existing `CheckRole` middleware is used for admin endpoints:

```php
// Read-only operations (moderator or super_admin)
Route::middleware(['auth:sanctum', 'role:moderator,super_admin'])
    ->get('/admin/companies', [AdminCompanyController::class, 'index']);

// Destructive operations (super_admin only)
Route::middleware(['auth:sanctum', 'role:super_admin'])
    ->post('/admin/companies/{id}/suspend', [AdminCompanyController::class, 'suspend']);
```

### Middleware Aliases

Available middleware aliases (from `bootstrap/app.php`):
- `auth:sanctum` - Token-based authentication
- `role:moderator,super_admin` - Role-based authorization
- `verified` - Email verification check
- `membership.active` - Active membership check

## Pagination Configuration

Default pagination settings from `config/admin.php`:

- **Default per page**: 20 records
- **Maximum per page**: 100 records

Controllers should validate and enforce these limits:

```php
$perPage = min($request->input('pageSize', 20), 100);
```

## Trust Score Thresholds

From `config/admin.php`:

- **Low trust threshold**: 40 (companies below this are flagged)
- **Job posting threshold**: 20 (companies below this cannot create jobs)

## Webhook Configuration

- **Maximum retry attempts**: 3 (before flagging for manual review)

## Testing

A unit test verifies all indexes exist:

```bash
php artisan test --filter=AdminIndexesTest
```

## Next Steps

With the foundation in place, you can now:

1. Create admin controllers extending the base `Controller` class
2. Use the `AdminCacheable` trait in services for caching
3. Apply role-based middleware to routes
4. Follow the standardized response format
5. Leverage database indexes for optimal query performance

## Environment Variables

Optional environment variables for cache TTL customization:

```env
ADMIN_CACHE_DASHBOARD_STATS=900
ADMIN_CACHE_COMPANY_LISTS=300
ADMIN_CACHE_REVENUE_DATA=3600
ADMIN_CACHE_TRUST_EVENTS=600
ADMIN_CACHE_MATCH_STATS=900
ADMIN_CACHE_APPLICATION_STATS=900
ADMIN_CACHE_USER_GROWTH=900
ADMIN_CACHE_RECENT_ACTIVITY=300
```
