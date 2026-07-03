# OAuth Mobile Onboarding Fix

## Problem
OAuth users were being redirected directly to the app tabs instead of going through the applicant onboarding flow, even when they needed to complete onboarding.

## Root Causes
1. **HTML Entity Encoding**: `http_build_query()` was creating query strings with `&` separators, which were being parsed as `&amp;` by the mobile app, breaking parameter extraction
2. **Routing Conflict**: When OAuth users had their token set in the auth store, `_layout.tsx` would immediately redirect them to tabs, preventing them from staying on the register screen for onboarding
3. **No OAuth Onboarding Flow**: There was no mechanism to distinguish between OAuth users who needed onboarding vs. regular registration flow

## Solutions Implemented

### 1. Fixed Query String Encoding (Backend)
**File**: `JobSwipe/backend/app/Http/Controllers/Auth/OAuthController.php`

Changed `http_build_query()` calls to use `PHP_QUERY_RFC3986` encoding:

```php
$deepLink = 'jobapp://auth?' . http_build_query([
    'token' => $result['token'],
    'is_new_user' => $result['is_new_user'] ? '1' : '0',
    'needs_onboarding' => $result['needs_onboarding'] ? '1' : '0',
], '', '&', PHP_QUERY_RFC3986);
```

This ensures proper URL encoding without HTML entity issues.

### 2. Added Onboarding Flag to Auth Store
**File**: `JobSwipe/frontend/mobile/store/authStore.ts`

Added `isOnboarding` flag to track when users are in the middle of onboarding:

```typescript
type AuthState = {
  token: string | null;
  role: AuthRole | null;
  hydrated: boolean;
  isOnboarding: boolean;  // NEW
  
  setOnboarding: (isOnboarding: boolean) => void;  // NEW
  // ... other methods
};
```

### 3. Updated Layout Routing Logic
**File**: `JobSwipe/frontend/mobile/app/_layout.tsx`

Modified the redirect logic to respect the `isOnboarding` flag:

```typescript
if (inAuthGroup && !isOnRegister && !isOnboarding) {
  router.replace(isCompanyRole ? '/(company-tabs)' : '/(tabs)');
  return;
}
```

This prevents authenticated users from being redirected away from the register screen when they're completing onboarding.

### 4. Enhanced OAuth Handler
**File**: `JobSwipe/frontend/mobile/app/(auth)/register.tsx`

#### a. Improved Parameter Parsing
Added fallback parsing for both normal and `amp;` prefixed parameters:

```typescript
const needsOnboarding = 
  queryParams?.needs_onboarding === '1' || 
  queryParams?.needs_onboarding === 'true' ||
  queryParams?.['amp;needs_onboarding'] === '1' ||
  queryParams?.['amp;needs_onboarding'] === 'true';
```

#### b. OAuth Onboarding Flow
When OAuth user needs onboarding:
1. Set `isOnboarding = true` to prevent layout redirect
2. Set `isOAuthOnboarding = true` to track OAuth flow
3. Set token for API calls during onboarding
4. Start onboarding at step 0

```typescript
if (needsOnboarding) {
  setOnboarding(true);
  setIsOAuthOnboarding(true);
  await setToken(token, 'applicant');
  setOtpSent(false);
  setEmailDone(true);
  setCurrentStep(0);
}
```

#### c. Modified handleNext Function
Updated to handle OAuth onboarding completion differently from regular registration:

```typescript
const handleNext = async () => {
  if (!validateCurrentStep()) return;
  
  if (currentStep < totalSteps - 1) {
    setCurrentStep((value) => value + 1);
  } else {
    if (isOAuthOnboarding) {
      // OAuth users skip registration, just complete onboarding
      await completeApplicantOnboarding();
      setOnboarding(false);
      router.replace('/(tabs)');
    } else {
      // Normal registration flow
      handleSubmit();
    }
  }
};
```

## Flow Comparison

### Before Fix
```
OAuth Sign In → Backend creates user → Returns JSON → User goes to tabs (skips onboarding)
```

### After Fix
```
OAuth Sign In → Backend creates user → Returns deep link with needs_onboarding=1
→ Mobile app sets isOnboarding=true → User stays on register screen
→ User completes onboarding steps → completeApplicantOnboarding()
→ Clear isOnboarding flag → Navigate to tabs
```

## Testing Checklist

- [ ] New OAuth user (never signed in before)
  - [ ] Should go through all 6 onboarding steps
  - [ ] Should not be redirected to tabs until onboarding complete
  - [ ] Should see profile data after onboarding

- [ ] Returning OAuth user (already completed onboarding)
  - [ ] Should skip onboarding
  - [ ] Should go directly to tabs
  - [ ] Should see existing profile data

- [ ] Regular email/password registration
  - [ ] Should still work as before
  - [ ] Should go through OTP verification
  - [ ] Should complete onboarding after verification

## Files Modified

1. `JobSwipe/backend/app/Http/Controllers/Auth/OAuthController.php`
2. `JobSwipe/backend/app/Services/AuthService.php` (already had needs_onboarding logic)
3. `JobSwipe/frontend/mobile/store/authStore.ts`
4. `JobSwipe/frontend/mobile/app/_layout.tsx`
5. `JobSwipe/frontend/mobile/app/(auth)/register.tsx`

## Notes

- The `needs_onboarding` detection logic in `AuthService::handleGoogleCallback()` checks if `onboarding_step < 6` or `onboarding_completed_at === null`
- MongoDB profile is created automatically during OAuth with Google profile photo URL
- PostgreSQL user and applicant_profile are also created during OAuth
- The onboarding flag prevents layout redirects but still allows API calls to work
