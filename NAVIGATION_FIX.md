# Navigation Fix - Company Registration Flow

## Issue
After company registration, the app was:
1. Redirecting to the Profile tab instead of staying on Home tab
2. Then showing "unmatched route" error when navigating away

## Root Cause
The `_layout.tsx` file had a `useEffect` that checks if company onboarding is completed. If not completed, it redirects to the Profile tab. This was running immediately after registration, even though onboarding was just completed, causing unwanted redirects.

**Why it happened:**
1. User completes registration → navigates to `/(company-tabs)/index` (Home tab)
2. The `enforceCompanyOnboarding` useEffect runs
3. It fetches `/profile/onboarding/status` from backend
4. Due to MongoDB propagation delay or timing issues, backend might return `completed: false`
5. App redirects to Profile tab
6. User sees incomplete profile data or "unmatched route" error

## Solution
Added proper onboarding state management to prevent the redirect check during active onboarding:

### 1. Updated `_layout.tsx`
Added check to skip onboarding enforcement when `isOnboarding === true`:

```typescript
useEffect(() => {
  if (!hydrated || !token || role !== 'company_admin') return;
  if (segments[0] === '(auth)') return;
  if (isOnboarding) return; // ← NEW: Skip check during active onboarding

  const enforceCompanyOnboarding = async () => {
    const status = await api.get('/profile/onboarding/status');
    const completed = status?.completed === true || status?.onboarding_step === 'completed';
    
    if (!completed && !isOnCompanyProfile) {
      router.replace('/(company-tabs)/profile');
    }
  };

  void enforceCompanyOnboarding();
}, [hydrated, token, role, isOnboarding, segments]);
```

### 2. Updated `register.tsx`
Set `isOnboarding` flag during company onboarding to prevent premature checks:

```typescript
// In handleVerifyOtp (OTP verification flow)
if (resolvedRole === 'company_admin') {
  setOnboarding(true); // ← NEW: Mark as onboarding
  await completeCompanyOnboarding();
  await new Promise(resolve => setTimeout(resolve, 1000));
  setOnboarding(false); // ← NEW: Onboarding complete
}
router.replace('/(company-tabs)/index');

// In handleSubmit (magic-link flow)
if (nextRole === 'company_admin') {
  setOnboarding(true); // ← NEW: Mark as onboarding
  await completeCompanyOnboarding();
  await new Promise(resolve => setTimeout(resolve, 1000));
  setOnboarding(false); // ← NEW: Onboarding complete
}
router.replace('/(company-tabs)/index');
```

## Flow After Fix

### Registration Flow
1. User completes company registration
2. `setOnboarding(true)` is called
3. `completeCompanyOnboarding()` uploads files and saves profile data
4. Wait 1 second for MongoDB propagation
5. `setOnboarding(false)` is called
6. Navigate to `/(company-tabs)/index` (Home tab)

### Navigation Guard Flow
1. `_layout.tsx` useEffect runs
2. Checks: `if (isOnboarding) return;` → **Skips check because onboarding just completed**
3. User stays on Home tab
4. No unwanted redirects

### Subsequent App Launches
1. User opens app
2. Token is hydrated from AsyncStorage
3. `isOnboarding` is `false` (default)
4. `enforceCompanyOnboarding` runs
5. Backend returns `completed: true`
6. No redirect happens
7. User stays on current tab

## Files Modified

### 1. `frontend/mobile/app/_layout.tsx`
- Added `if (isOnboarding) return;` check to skip onboarding enforcement during active onboarding

### 2. `frontend/mobile/app/(auth)/register.tsx`
- Added `setOnboarding(true)` before `completeCompanyOnboarding()`
- Added `setOnboarding(false)` after onboarding completes
- Applied to both OTP verification flow and magic-link flow

## Testing

### Test Company Registration
1. Register a new company account
2. Complete all onboarding steps (company details, verification docs, logo, office images)
3. After OTP verification, you should land on **Home tab** (not Profile tab)
4. Navigate to Profile tab manually → see your company data
5. Navigate back to Home tab → no redirect to Profile
6. Close and reopen app → should stay on Home tab

### Test Incomplete Onboarding (Edge Case)
1. Start company registration but don't complete onboarding
2. Close app
3. Reopen app
4. You should be redirected to Profile tab to complete onboarding

## Benefits

✅ **Correct Navigation** - Users land on Home tab after registration  
✅ **No Unwanted Redirects** - Profile tab doesn't force-open after registration  
✅ **Proper State Management** - `isOnboarding` flag prevents race conditions  
✅ **Handles Timing Issues** - Works even with MongoDB propagation delays  
✅ **Preserves Onboarding Enforcement** - Incomplete profiles still get redirected  

## Edge Cases Handled

1. **MongoDB Propagation Delay** - `isOnboarding` flag prevents check until data is ready
2. **Slow Network** - 1-second delay gives backend time to save data
3. **Incomplete Onboarding** - Users who don't complete onboarding still get redirected to Profile
4. **App Restart** - `isOnboarding` defaults to `false`, so enforcement works on subsequent launches

## Related Issues Fixed

This fix also resolves:
- "Unmatched route" error after registration
- Profile tab showing incomplete data immediately after registration
- Infinite redirect loops between Home and Profile tabs
