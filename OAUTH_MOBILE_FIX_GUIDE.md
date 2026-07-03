# Google OAuth Mobile Deep Link Fix Guide

## Problem
Google OAuth returns JSON instead of redirecting back to the mobile app.

## Root Causes Identified
1. Google Console redirect URI was pointing to `/redirect` instead of `/callback`
2. Deep link scheme not properly configured in Expo
3. Mobile app deep link listener has timing issues

## Complete Solution

### 1. Google Cloud Console Configuration

**CRITICAL:** Update your Google OAuth redirect URI:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: APIs & Services → Credentials
3. Click on your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", ensure you have:
   ```
   http://localhost:8000/api/v1/auth/google/callback
   ```
   **NOT** `/redirect` - it must be `/callback`

5. For production, also add:
   ```
   https://your-production-domain.com/api/v1/auth/google/callback
   ```

### 2. Backend Configuration (Already Fixed)

✅ `.env` file updated:
```env
GOOGLE_REDIRECT_URI="http://localhost:8000/api/v1/auth/google/callback"
```

✅ `OAuthController` updated to:
- Accept `platform=mobile` parameter
- Return HTML redirect page for mobile
- Return JSON for web

### 3. Expo Deep Link Configuration

#### Update `app.json`:
```json
{
  "expo": {
    "scheme": "jobapp",
    "ios": {
      "bundleIdentifier": "com.jobapp.mobile",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["jobapp"]
          }
        ]
      }
    },
    "android": {
      "package": "com.jobapp.mobile",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "jobapp",
              "host": "auth"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### 4. Testing Steps

#### A. Test Deep Link Directly (iOS Simulator)
```bash
xcrun simctl openurl booted "jobapp://auth?token=test123&is_new_user=1"
```

#### B. Test Deep Link Directly (Android)
```bash
adb shell am start -W -a android.intent.action.VIEW -d "jobapp://auth?token=test123&is_new_user=1"
```

#### C. Test Full OAuth Flow
1. Start your backend: `cd JobSwipe/backend && php artisan serve`
2. Start Expo: `cd JobSwipe/frontend/mobile && npm start`
3. Open app on device/simulator
4. Tap "Sign up with Google"
5. Complete Google authentication
6. You should see the redirect HTML page
7. Tap "Open JobSwipe" button
8. App should open with token

### 5. Debugging

#### Check if deep link is caught:
Add console.log to `register.tsx`:
```typescript
useEffect(() => {
  const completeGoogleAuth = async (url: string | null) => {
    console.log('🔗 Deep link received:', url);
    
    if (!url || !url.startsWith('jobapp://')) {
      console.log('❌ Not a jobapp deep link');
      return;
    }
    
    // ... rest of code
  };
  
  // ...
}, [setToken]);
```

#### Check backend logs:
```bash
tail -f JobSwipe/backend/storage/logs/laravel.log
```

#### Check if state parameter is passed:
In browser, after clicking "Sign up with Google", check the Google OAuth URL - it should contain:
```
&state=eyJwbGF0Zm9ybSI6Im1vYmlsZSJ9
```
(This is base64 encoded `{"platform":"mobile"}`)

### 6. Common Issues

| Issue | Solution |
|-------|----------|
| "Authentication failed" error | Check if deep link listener is running before OAuth completes |
| Deep link opens browser, not app | Rebuild app after changing app.json: `npx expo prebuild --clean` |
| Token not received | Check browser console/network tab for the actual deep link URL |
| Google Console error | Verify redirect URI matches exactly (including http/https) |

### 7. Production Considerations

For production deployment:

1. **Update Google Console** with production callback URL
2. **Update backend `.env`**:
   ```env
   GOOGLE_REDIRECT_URI="https://api.yourapp.com/api/v1/auth/google/callback"
   ```
3. **Update mobile `.env`**:
   ```env
   EXPO_PUBLIC_API_URL=https://api.yourapp.com/api
   ```
4. **Configure Universal Links** (iOS) and **App Links** (Android) for better deep linking

### 8. Alternative: Use Expo AuthSession

If deep links continue to be problematic, consider using Expo's built-in AuthSession:

```typescript
import * as AuthSession from 'expo-auth-session';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const [request, response, promptAsync] = AuthSession.useAuthRequest(
  {
    clientId: 'YOUR_GOOGLE_CLIENT_ID',
    redirectUri: AuthSession.makeRedirectUri({ scheme: 'jobapp' }),
    scopes: ['openid', 'profile', 'email'],
  },
  discovery
);
```

This handles deep links automatically and is more reliable.
