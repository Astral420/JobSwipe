# CORS Fix - Cross-Origin Request Blocked

## Problem

The frontend (running on `http://localhost:3000`) was unable to make requests to the backend API (running on `http://localhost:8000`) due to CORS (Cross-Origin Resource Sharing) errors:

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:8000/api/auth/login. (Reason: CORS header 'Access-Control-Allow-Origin' missing). Status code: 204.
```

## Root Causes

### Issue 1: Wrong Frontend URL in .env
The backend's `.env` file had `FRONTEND_WEB_URL=https://jobswipe.site` (production URL) instead of the local development URL `http://localhost:3000`.

### Issue 2: CORS Middleware Not Registered
Laravel 11's `HandleCors` middleware was not explicitly registered in the API middleware stack in `bootstrap/app.php`.

## Solutions

### Fix 1: Update Frontend URL
Updated `backend/.env` to use the correct local development URL:

**Before:**
```env
FRONTEND_WEB_URL=https://jobswipe.site
```

**After:**
```env
FRONTEND_WEB_URL=http://localhost:3000
```

### Fix 2: Register CORS Middleware
Added `HandleCors` middleware to the API middleware stack in `bootstrap/app.php`:

**Before:**
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->prepend(ClearStaleRouteCache::class);
    $middleware->redirectGuestsTo(fn () => null);
    
    $middleware->alias([
        'swipe.limit' => CheckSwipeLimit::class,
        'role' => CheckRole::class,
        'verified' => EnsureEmailVerified::class,
        'membership.active' => MembershipActiveMiddleware::class,
    ]);
})
```

**After:**
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->prepend(ClearStaleRouteCache::class);
    $middleware->redirectGuestsTo(fn () => null);
    
    // Enable CORS for API routes
    $middleware->api(prepend: [
        \Illuminate\Http\Middleware\HandleCors::class,
    ]);
    
    $middleware->alias([
        'swipe.limit' => CheckSwipeLimit::class,
        'role' => CheckRole::class,
        'verified' => EnsureEmailVerified::class,
        'membership.active' => MembershipActiveMiddleware::class,
    ]);
})
```

### Fix 3: Clear Caches
Cleared Laravel's config and route caches to ensure the new settings are loaded:

```bash
php artisan config:clear
php artisan route:clear
```

## Files Modified

- `backend/.env`
  - Changed `FRONTEND_WEB_URL` from `https://jobswipe.site` to `http://localhost:3000`
- `backend/bootstrap/app.php`
  - Added `HandleCors` middleware to API middleware stack
- `backend/config/cors.php` (already correct)
  - Paths: `['api/*', 'sanctum/csrf-cookie']`
  - Allowed origins: Uses `FRONTEND_WEB_URL` and `FRONTEND_MOBILE_URL` from .env
  - Supports credentials: `true`

## CORS Configuration

The `config/cors.php` file is configured to:

- **Paths**: `api/*` and `sanctum/csrf-cookie`
- **Allowed Methods**: All (`*`)
- **Allowed Origins**: 
  - `http://localhost:3000` (web frontend)
  - `http://localhost:8080` (mobile frontend)
- **Allowed Headers**: `Content-Type`, `Authorization`, `Accept`, `Idempotency-Key`
- **Supports Credentials**: `true` (required for Sanctum authentication)
- **Max Age**: 3600 seconds (1 hour)

## Testing

To verify the fix:

1. **Restart the Laravel backend** (if running):
   ```bash
   # Stop the server (Ctrl+C if running in terminal)
   # Then start it again:
   cd JobSwipe/backend
   php artisan serve
   ```

2. **Ensure frontend is running**:
   ```bash
   cd JobSwipe/frontend/web
   npm run dev
   ```

3. **Clear browser cache and localStorage**:
   ```javascript
   // In browser console:
   localStorage.clear();
   // Then refresh the page
   ```

4. **Try logging in**:
   - Navigate to `http://localhost:3000/login`
   - Enter credentials:
     - Email: `superadmin@jobswipe.local`
     - Password: `Super@Admin123!`
   - Click "Sign in"
   - Should successfully log in without CORS errors

5. **Check browser console**:
   - Open DevTools (F12) → Console tab
   - Should see no CORS errors
   - Network tab should show successful API requests with status 200

## Common CORS Issues

### Issue: Still seeing CORS errors after fix
**Solution**: 
- Restart the Laravel backend server
- Clear browser cache and localStorage
- Check that `.env` has the correct `FRONTEND_WEB_URL`
- Run `php artisan config:clear` and `php artisan route:clear`

### Issue: CORS works in development but not production
**Solution**:
- Update production `.env` with correct production frontend URL
- Ensure production server has CORS middleware registered
- Check that production frontend URL matches exactly (including protocol and port)

### Issue: Preflight OPTIONS requests failing
**Solution**:
- Ensure `allowed_methods` includes `OPTIONS` (or use `*`)
- Check that `allowed_headers` includes all headers your frontend sends
- Verify `supports_credentials` is `true` if using authentication

## Environment-Specific Configuration

### Local Development
```env
FRONTEND_WEB_URL=http://localhost:3000
FRONTEND_MOBILE_URL=http://localhost:8080
```

### Production
```env
FRONTEND_WEB_URL=https://jobswipe.site
FRONTEND_MOBILE_URL=https://mobile.jobswipe.site
```

## Additional Notes

- CORS is a browser security feature that prevents unauthorized cross-origin requests
- The backend must explicitly allow the frontend's origin
- Credentials (cookies, authorization headers) require `supports_credentials: true`
- Laravel 11 uses `HandleCors` middleware from the framework (no external package needed)
- Always restart the backend server after changing `.env` or middleware configuration

## Related Documentation

- [Laravel CORS Documentation](https://laravel.com/docs/11.x/routing#cors)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Laravel Sanctum CORS Requirements](https://laravel.com/docs/11.x/sanctum#cors-and-cookies)
