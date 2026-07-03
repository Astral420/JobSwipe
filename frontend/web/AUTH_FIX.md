# Authentication Fix - Login Spinner Issue

## Problem

The admin login button was stuck in a loading spinner state ("Signing in...") and never completing the login process, even after page refresh.

## Root Causes

### Issue 1: Response Format Mismatch
The backend API returns all responses in this format:
```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": {...}
  },
  "message": "..."
}
```

However, the frontend `authStore.ts` was expecting the response in this format:
```json
{
  "token": "...",
  "user": {...}
}
```

### Issue 2: Persisted Loading State
The `isLoading` state was being persisted to localStorage via Zustand's `persist` middleware. When the login failed, `isLoading: true` was saved and remained stuck even after page refresh.

### Issue 3: Role Type Mismatch
The frontend TypeScript types defined `UserRole` as `'admin' | 'moderator'`, but the backend uses `'super_admin' | 'moderator'`. This caused TypeScript type errors and potential runtime issues when the backend returned a user with role `'super_admin'`.

## Solutions

### Fix 1: Response Unwrapping
Updated `src/lib/authStore.ts` to properly unwrap the backend response format:

**Before:**
```typescript
const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
  email,
  password,
});
set({
  user: data.user,  // ❌ Wrong - data.user doesn't exist
  token: data.token, // ❌ Wrong - data.token doesn't exist
  ...
});
```

**After:**
```typescript
const { data } = await api.post<{ success: boolean; data: { token: string; user: AuthUser } }>('/auth/login', {
  email,
  password,
});
set({
  user: data.data.user,  // ✅ Correct - unwraps nested data
  token: data.data.token, // ✅ Correct - unwraps nested data
  ...
});
```

### Fix 2: Prevent Loading State Persistence
Added `onRehydrateStorage` callback to always reset `isLoading` to `false` after rehydration:

```typescript
{
  name: 'auth-storage',
  partialize: (state) => ({ 
    token: state.token, 
    user: state.user,
    isAuthenticated: state.isAuthenticated,
  }),
  onRehydrateStorage: () => (state) => {
    // Always reset isLoading to false after rehydration
    if (state) {
      state.isLoading = false;
    }
  },
}
```

### Fix 3: Initial State
Changed initial `isLoading` from `true` to `false`:

```typescript
isLoading: false, // ✅ Start as false, not true
```

### Fix 4: Role Type Alignment
Updated `UserRole` type to match backend role values:

**Before:**
```typescript
// src/lib/authStore.ts
export type UserRole = 'admin' | 'moderator'; // ❌ Wrong - backend uses 'super_admin'

// src/types/index.ts
export type UserRole = 'admin' | 'moderator' | 'user'; // ❌ Wrong - missing backend roles
```

**After:**
```typescript
// src/lib/authStore.ts
export type UserRole = 'super_admin' | 'moderator'; // ✅ Matches backend

// src/types/index.ts
export type UserRole = 'super_admin' | 'moderator' | 'applicant' | 'hr' | 'company_admin'; // ✅ All backend roles
```

## Files Modified

- `src/lib/authStore.ts`
  - Fixed `login()` method to unwrap `data.data`
  - Fixed `restoreSession()` method to unwrap `data.data`
  - Changed initial `isLoading` to `false`
  - Added `onRehydrateStorage` to reset loading state
  - Updated `partialize` to exclude `isLoading` from persistence
  - Fixed `UserRole` type to use `'super_admin'` instead of `'admin'`
- `src/types/index.ts`
  - Updated `UserRole` type to include all backend roles: `'super_admin' | 'moderator' | 'applicant' | 'hr' | 'company_admin'`

## User Action Required

If you're still seeing the stuck spinner, clear your browser's localStorage:

**Option 1: Via Browser Console**
```javascript
localStorage.clear();
// Then refresh the page
```

**Option 2: Via Browser DevTools**
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Local Storage" → your domain
4. Right-click → "Clear"
5. Refresh the page

## Testing

To verify the fix:

1. Clear localStorage (if needed - see "User Action Required" section above)
2. Refresh the page
3. Navigate to `/login`
4. Enter admin credentials:
   - **Super Admin**: `superadmin@jobswipe.local` / `Super@Admin123!`
   - **Moderator**: `moderator@jobswipe.local` / `Moderator@123!`
5. Click "Sign in"
6. Button should show "Signing in..." briefly
7. Should redirect to `/dashboard` on success
8. Should show error message on failure
9. Refresh page - button should show "Sign in" (not stuck in loading)

## Related Issues

This same pattern applies to all API calls. The admin endpoints were already fixed in the service layer, but the auth endpoints were missed because they're in a separate store file.

## Prevention

All future API calls should follow this pattern:
```typescript
const { data } = await api.post<{ success: boolean; data: T }>('/endpoint', payload);
return data.data; // Always unwrap the nested data property
```

Or for mutations:
```typescript
const { data } = await api.post<{ success: boolean; message: string }>('/endpoint', payload);
return { message: data.message }; // Extract message from response
```

## Additional Notes

- `isLoading` should never be persisted to localStorage
- Always use `onRehydrateStorage` to reset transient state
- Initial state should reflect the actual initial state (not loading)
- The `partialize` function now explicitly lists what to persist
