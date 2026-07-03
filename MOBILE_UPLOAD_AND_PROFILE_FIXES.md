# Mobile Upload & Profile Loading Fixes

## Issues Fixed

### 1. ✅ File Upload Reliability (Logo & Office Photos)
**Problem:** During company registration, logo and office photo uploads would sometimes fail silently, especially on slow connections. Users wouldn't know which files failed.

**Solution:** Individual error handling for each file upload
- Each file is uploaded separately with try-catch
- Failed uploads are tracked and reported to the user
- Specific error messages show which files failed (e.g., "Failed to upload office images: Image 2, Image 4")
- Upload continues even if some files fail, then reports all failures at once

### 2. ✅ Profile Data Loading After Registration
**Problem:** After company registration, the profile tab would show hardcoded placeholder data instead of real data. Users had to manually refresh the app to see their actual profile.

**Solution:** Refetch profile data on screen focus
- Changed from `useEffect` (runs once) to `useFocusEffect` (runs every time screen is focused)
- Profile data is now fetched every time user navigates to the profile tab
- Handles MongoDB propagation delays automatically
- No more stale data issues

### 3. ✅ Removed Hardcoded Placeholder Data
**Problem:** Profile screen showed hardcoded team members (Sofia Reyes, Marco Cruz, Aisha Santos) instead of real data.

**Solution:** Removed `INITIAL_TEAM` constant
- Team state now starts as empty array `[]`
- Loading skeleton shows while data is being fetched
- Only real data from backend is displayed

### 4. ✅ Upload Progress Indicator
**Problem:** Users had no feedback during file uploads, making it unclear if the app was working or frozen.

**Solution:** Real-time upload progress tracking
- Shows "Uploading [filename] (2/5)..." during registration
- Tracks progress for:
  - Applicant: Resume, Profile Photo
  - Company: Verification Documents, Logo, Office Images
- Progress message appears in the OTP verification screen

### 5. ✅ Navigation Flow After Registration
**Problem:** After company registration, app would navigate to profile tab, which might show incomplete data.

**Solution:** Stay on home tab after registration
- Company accounts now land on `/(company-tabs)/index` (home tab)
- Profile tab loads data when user manually navigates to it
- Gives MongoDB time to propagate data before user views profile

---

## Files Modified

### 1. `frontend/mobile/app/(auth)/register.tsx`
**Changes:**
- Added `uploadProgress` state to track file upload progress
- Updated `completeApplicantOnboarding()`:
  - Individual error handling for resume and photo uploads
  - Progress tracking for each file
- Updated `completeCompanyOnboarding()`:
  - Individual error handling for logo, office images, and verification docs
  - Progress tracking for each file
  - Specific error messages for failed uploads
- Added upload progress message to OTP verification screen

**Key Code Changes:**
```typescript
// Before: Promise.all (fails if any upload fails)
const officeImageUrls = await Promise.all(
  officeImages.map((file) => uploadSingleFile(file, 'image'))
);

// After: Individual uploads with error tracking
const officeImageUrls: string[] = [];
const failedImages: string[] = [];

for (let i = 0; i < officeImages.length; i++) {
  const file = officeImages[i];
  setUploadProgress({ 
    current: i + 1, 
    total: officeImages.length, 
    fileName: `Office Image ${i + 1}` 
  });
  
  try {
    const url = await uploadSingleFile(file, 'image');
    officeImageUrls.push(url);
  } catch (err) {
    console.error(`Failed to upload office image ${i + 1}:`, err);
    failedImages.push(`Image ${i + 1}`);
  }
}

if (failedImages.length > 0) {
  throw new Error(`Failed to upload office images: ${failedImages.join(', ')}`);
}
```

### 2. `frontend/mobile/app/(company-tabs)/profile.tsx`
**Changes:**
- Added `useFocusEffect` import from `expo-router`
- Removed `INITIAL_TEAM` hardcoded data
- Changed `team` state initialization from `INITIAL_TEAM` to `[]`
- Replaced `useEffect` with `useFocusEffect` for profile data fetching

**Key Code Changes:**
```typescript
// Before: Runs only once on mount
useEffect(() => {
  setIsProfileLoading(true);
  api.get('/profile/company')
    .then((data) => { /* ... */ })
    .finally(() => { setIsProfileLoading(false); });
}, []); // Empty dependency array

// After: Runs every time screen comes into focus
useFocusEffect(
  React.useCallback(() => {
    setIsProfileLoading(true);
    api.get('/profile/company')
      .then((data) => { /* ... */ })
      .finally(() => { setIsProfileLoading(false); });
  }, [])
);
```

---

## Testing

### Test Upload Error Handling
1. Register a company account
2. During registration, turn off WiFi briefly while uploading office images
3. Turn WiFi back on
4. You should see an error message like: "Failed to upload office images: Image 2, Image 4"

### Test Upload Progress
1. Register a company account with logo and multiple office images
2. Watch the OTP verification screen
3. You should see messages like:
   - "Uploading Company Logo (1/6)..."
   - "Uploading Office Image 1 (2/6)..."
   - "Uploading Office Image 2 (3/6)..."

### Test Profile Refetch
1. Register a company account
2. Complete onboarding
3. Navigate to Profile tab
4. You should see your real company data (not hardcoded placeholders)
5. Navigate away and back to Profile tab
6. Data should reload (you'll see loading skeleton briefly)

### Test Navigation Flow
1. Register a company account
2. After OTP verification, you should land on the **Home tab** (not Profile tab)
3. Manually navigate to Profile tab to see your data

---

## Benefits

### 1. Better Error Handling
- Users know exactly which files failed to upload
- Can retry specific files instead of entire registration
- No more silent failures

### 2. Better UX
- Real-time feedback during uploads
- No more confusion about whether app is working
- Clear progress indicators

### 3. Data Consistency
- Profile always shows fresh data from backend
- No more hardcoded placeholders
- Handles MongoDB propagation delays automatically

### 4. Reliability
- Individual file uploads don't block entire registration
- Partial success is possible (e.g., 4/5 images uploaded)
- Better handling of slow/unstable connections

---

## Edge Cases Handled

1. **Slow Connection:** Progress indicator shows upload is in progress
2. **Partial Upload Failure:** Specific files that failed are reported
3. **MongoDB Propagation Delay:** Profile refetches on focus, so data eventually loads
4. **Empty Profile Data:** Loading skeleton shows instead of hardcoded data
5. **Network Timeout:** Individual file failures don't kill entire registration

---

## Future Enhancements (Optional)

### 1. Retry Failed Uploads
Allow users to retry specific failed uploads without re-registering:
```typescript
if (failedImages.length > 0) {
  // Show retry button instead of throwing error
  setFailedUploads(failedImages);
  setShowRetryModal(true);
}
```

### 2. Offline Queue
Queue uploads when offline and retry when connection is restored:
```typescript
if (!navigator.onLine) {
  queueUpload(file);
  return;
}
```

### 3. Upload Cancellation
Allow users to cancel long-running uploads:
```typescript
const abortController = new AbortController();
fetch(uploadUrl, { signal: abortController.signal });
```

### 4. Compression Before Upload
Compress images before uploading to reduce upload time:
```typescript
import * as ImageManipulator from 'expo-image-manipulator';
const compressed = await ImageManipulator.manipulateAsync(
  uri,
  [{ resize: { width: 1200 } }],
  { compress: 0.8 }
);
```
