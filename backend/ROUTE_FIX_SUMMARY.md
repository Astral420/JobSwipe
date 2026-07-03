# Route Fix Summary

## Issue
The `/api/v1/admin/users` endpoint was returning 404 "Resource not found" error.

## Root Cause
The admin user routes (along with subscription, IAP, and trust routes) were not properly wrapped in a middleware + prefix group. They were missing the `prefix('admin')` wrapper, causing them to be registered without the `/admin` prefix.

## Fix Applied
Wrapped the following route groups in a proper middleware + prefix structure:

```php
// Before (incorrect - missing prefix and middleware)
Route::prefix('subscriptions')->group(function () {
    // routes...
});
Route::get('users', [AdminUserController::class, 'index']);

// After (correct - properly wrapped)
Route::middleware('role:moderator,admin,super_admin')->prefix('admin')->group(function () {
    Route::prefix('subscriptions')->group(function () {
        // routes...
    });
    Route::get('users', [AdminUserController::class, 'index']);
});
```

## Routes Fixed
The following routes are now properly registered:

### User Management
- `GET /api/v1/admin/users` - List users (moderator, admin, super_admin)
- `GET /api/v1/admin/users/{id}` - View user details (moderator, admin, super_admin)
- `POST /api/v1/admin/users/{id}/ban` - Ban user (super_admin only)
- `POST /api/v1/admin/users/{id}/unban` - Unban user (super_admin only)

### Subscription Management
- `GET /api/v1/admin/subscriptions` - List subscriptions
- `GET /api/v1/admin/subscriptions/revenue-stats` - Revenue statistics
- `GET /api/v1/admin/subscriptions/{id}` - View subscription details

### IAP Management
- `GET /api/v1/admin/iap/transactions` - List IAP transactions
- `GET /api/v1/admin/iap/transactions/{transactionId}` - Transaction details
- `GET /api/v1/admin/iap/webhooks` - Webhook events
- `GET /api/v1/admin/iap/webhooks/metrics` - Webhook metrics
- `POST /api/v1/admin/iap/webhooks/{eventId}/retry` - Retry webhook

### Trust System Management
- `GET /api/v1/admin/trust/events` - Trust events
- `GET /api/v1/admin/trust/low-trust-companies` - Low trust companies
- `GET /api/v1/admin/trust/companies/{companyId}/history` - Company trust history
- `POST /api/v1/admin/trust/companies/{companyId}/recalculate` - Recalculate trust score
- `POST /api/v1/admin/trust/companies/{companyId}/adjust` - Adjust trust score

## Verification
Run the following command to verify routes are registered:
```bash
php artisan route:list --path=admin/users
```

Expected output:
```
GET|HEAD   api/v1/admin/users .............. Admin\AdminUserController@index
GET|HEAD   api/v1/admin/users/{id} .......... Admin\AdminUserController@show
POST       api/v1/admin/users/{id}/ban ....... Admin\AdminUserController@ban
POST       api/v1/admin/users/{id}/unban ... Admin\AdminUserController@unban
```

## Files Modified
- `routes/api.php` - Fixed route grouping structure

## Testing
After clearing caches:
```bash
php artisan route:clear
php artisan config:clear
php artisan cache:clear
```

The endpoint should now work correctly:
```bash
GET http://localhost:8000/api/v1/admin/users?page=1&pageSize=20
```
