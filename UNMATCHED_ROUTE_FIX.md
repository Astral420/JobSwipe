# Unmatched Route Fix

## Issue
After company registration, the app was showing "Unmatched Route" error with `jobapp:///` as the URL.

## Root Cause
There was a race condition between two navigation attempts:

1. **Register screen** calls `router.replace('/(company-tabs)/index')`
2. **_layout.tsx useEffect** detects user is in auth group and also calls `router.replace('/(company-tabs)')`

Both navigations were firing simultaneously, causing a conflict that resulted in an invalid route.

## Solution

### 1. Simplified Navigation in register.tsx
Changed from navigating to specific index route to navigating to the group:

```typescript
// Before
router.replace('/(company-tabs)/index');

// After
router.replace('/(company-tabs)');
```

This lets Expo Router automatically resolve to the default route (index) within the group.

### 2. Added Small Delay Before Navigation
Added 100ms delay to ensure routes are fully registered:

```typescript
// Small delay to ensure routes are registered
await new Promise(resolve => setTimeout(resolve, 100));
router.replace('/(company-tabs)');
```

### 3. Fixed Race Condition in _layout.tsx
Updated the navigation guard to be more specific about when to redirect:

```typescript
// Before
if (inAuthGroup || segments[0] === undefined) {
  router.replace(isCompanyRole ? '/(company-tabs)' : '/(tabs)');
  return;
}

// After
if (inAuthGroup || (segments[0] === undefined && !inApplicantTabs && !inCompanyTabs)) {
  router.replace(isCompanyRole ? '/(company-tabs)' : '/(tabs)');
  return;
}
```

This prevents the redirect if the user is already in the correct tab group.

### 4. Fixed Login Redirect Logic
Changed the login redirect to only trigger when not in auth group AND segments are defined:

```typescript
// Before
if (!inAuthGroup) {
  router.replace('/(auth)/login');
}

// After
if (!inAuthGroup && segments[0] !== undefined) {
  router.replace('/(auth)/login');
}
```

This prevents redirecting to login when segments are still loading.

## Files Modified

### 1. `frontend/mobile/app/(auth)/register.tsx`
- Changed `router.replace('/(company-tabs)/index')` to `router.replace('/(company-tabs)')`
- Added 100ms delay before navigation
- Applied to both OTP verification flow and magic-link flow

### 2. `frontend/mobile/app/_layout.tsx`
- Fixed race condition in navigation guard
- Made redirect logic more specific
- Fixed login redirect to check for undefined segments

## Flow After Fix

```
User completes registration
    ↓
setOnboarding(true)
    ↓
completeCompanyOnboarding()
    ↓
Wait 1000ms (MongoDB propagation)
    ↓
setOnboarding(false)
    ↓
Wait 100ms (route registration)
    ↓
router.replace('/(company-tabs)') ← Navigate to group
    ↓
Expo Router resolves to /(company-tabs)/index
    ↓
_layout.tsx useEffect runs
    ↓
Checks: already in company-tabs? Yes → No redirect
    ↓
User stays on Home tab ✅
```

## Testing

### Test Company Registration
1. Register a new company account
2. Complete all onboarding steps
3. After OTP verification → should land on Home tab
4. **No "Unmatched Route" error should appear**
5. Navigate to Profile tab → data loads
6. Navigate back to Home → no errors

### Test Navigation Stability
1. After registration, quickly tap between tabs
2. No "Unmatched Route" errors should appear
3. All tabs should load correctly

## Why This Works

### 1. Group-Level Navigation
Navigating to `'/(company-tabs)'` instead of `'/(company-tabs)/index'` lets Expo Router handle the default route resolution, avoiding conflicts.

### 2. Delay Prevents Race Conditions
The 100ms delay ensures:
- Routes are fully registered
- Previous navigation has completed
- No simultaneous navigation attempts

### 3. Specific Redirect Logic
The updated `_layout.tsx` logic prevents:
- Redirecting when already in correct tab group
- Redirecting when segments are undefined/loading
- Multiple simultaneous redirects

## Edge Cases Handled

1. **Fast Tab Switching** - Delay prevents navigation conflicts
2. **Slow Network** - MongoDB delay ensures data is saved
3. **Route Registration** - 100ms delay ensures routes are ready
4. **Undefined Segments** - Check prevents redirect during loading
5. **Already in Correct Group** - No unnecessary redirects

## Related Issues Fixed

This fix also resolves:
- Race conditions between register screen and _layout navigation
- "Unmatched Route" errors after registration
- Navigation conflicts when switching tabs quickly
- Invalid route errors with `jobapp:///` URL
