# Profile Photo & Data Saving Fixes

## Problems Identified

### Problem 1: Backend - Missing MongoDB Fields
The `ApplicantProfileDocument` model was missing fields that the frontend was trying to save:
- ❌ `cover_url` - Cover photo URL
- ❌ `photos` - Array of portfolio photo URLs
- ⚠️ `job_preferences` - Field existed but no endpoint to update it

### Problem 2: Frontend - Incomplete Save Logic
The mobile profile screen had photo picker UI but incomplete save functionality:
- ❌ Cover photo upload logic missing
- ❌ Portfolio photos (3 boxes) upload logic missing
- ❌ Job preferences not being saved

## Solutions Implemented

### Backend Changes

#### 1. Updated MongoDB Model (`backend/app/Models/MongoDB/ApplicantProfileDocument.php`)
- ✅ Added `cover_url` to `$fillable` array
- ✅ Added `photos` to `$fillable` array
- ✅ Added `photos` to `$casts` array (as array type)

#### 2. New Controller Methods (`backend/app/Http/Controllers/Profile/ProfileController.php`)
- ✅ `updateApplicantCoverPhoto()` - Handles cover photo updates
- ✅ `updateApplicantPhotos()` - Handles portfolio photos array (max 6 photos)
- ✅ Updated `signFileUrls()` to sign `cover_url` and `photos` array

#### 3. New Service Methods (`backend/app/Services/ProfileService.php`)
- ✅ `updateApplicantCoverPhoto()` - Business logic for cover photo
- ✅ `updateApplicantPhotos()` - Business logic for photos array
- ✅ Updated `createApplicantProfile()` to initialize `cover_url` and `photos` fields

#### 4. New API Routes (`backend/routes/api.php`)
- ✅ `PATCH /api/v1/profile/applicant/cover-photo` - Update cover photo
- ✅ `PATCH /api/v1/profile/applicant/photos` - Update portfolio photos array

### Frontend Changes

#### Updated Profile Save Logic (`frontend/mobile/app/(tabs)/profile.tsx`)

The `handleSaveProfile()` function now includes:

1. ✅ **Avatar Photo Upload** (already existed, kept as-is)
   - Uploads to storage if changed
   - Sends URL to `PATCH /profile/applicant/photo`

2. ✅ **Cover Photo Upload** (NEW)
   - Uploads to storage if changed
   - Sends URL to `PATCH /profile/applicant/cover-photo`

3. ✅ **Portfolio Photos Upload** (NEW)
   - Loops through all 3 photos
   - Uploads new photos to storage
   - Keeps existing URLs for unchanged photos
   - Sends array to `PATCH /profile/applicant/photos`

4. ✅ **Job Preferences Save** (NEW)
   - Converts UI prefs to structured format
   - Sends to `PATCH /profile/applicant/job-preferences`

5. ✅ **Profile Reload** (ENHANCED)
   - Now reloads `cover_url` and `photos` after save
   - Updates local state with fresh data

## API Endpoints Summary

### Existing Endpoints (Already Working)
- `GET /api/v1/profile/applicant` - Get full profile
- `PATCH /api/v1/profile/applicant/basic-info` - Update name, location, bio
- `PATCH /api/v1/profile/applicant/skills` - Update hard/soft skills
- `PATCH /api/v1/profile/applicant/photo` - Update profile photo
- `PATCH /api/v1/profile/applicant/job-preferences` - Update job preferences

### New Endpoints (Added)
- `PATCH /api/v1/profile/applicant/cover-photo` - Update cover photo
- `PATCH /api/v1/profile/applicant/photos` - Update portfolio photos

## Data Flow

### Cover Photo
```
User picks cover photo
  → Frontend uploads to storage (uploadSingleFile)
  → Gets signed URL
  → PATCH /profile/applicant/cover-photo { cover_url: "..." }
  → Backend validates URL
  → Saves to MongoDB ApplicantProfileDocument.cover_url
  → Returns updated profile with signed URL
```

### Portfolio Photos
```
User picks photos (up to 3)
  → Frontend tracks changes in photos array
  → On save, uploads each new photo to storage
  → Keeps existing URLs for unchanged photos
  → PATCH /profile/applicant/photos { photos: ["url1", "url2", null] }
  → Backend validates each URL
  → Saves array to MongoDB ApplicantProfileDocument.photos
  → Returns updated profile with signed URLs
```

### Job Preferences
```
User toggles preferences in UI
  → Frontend converts to structured format:
    {
      desired_position: string,
      preferred_locations: string[],
      work_type: ['remote', 'hybrid', 'onsite'],
      employment_type: ['full-time', 'part-time', ...],
      willing_to_relocate: boolean
    }
  → PATCH /profile/applicant/job-preferences
  → Backend validates structure
  → Saves to MongoDB ApplicantProfileDocument.job_preferences
```

## Testing Checklist

### Backend
- [ ] Test `PATCH /profile/applicant/cover-photo` with valid URL
- [ ] Test `PATCH /profile/applicant/photos` with array of URLs
- [ ] Test `PATCH /profile/applicant/photos` with null values
- [ ] Verify MongoDB documents have `cover_url` and `photos` fields
- [ ] Verify signed URLs are returned for cover_url and photos array

### Frontend
- [ ] Test avatar photo upload and save
- [ ] Test cover photo upload and save
- [ ] Test portfolio photos upload (all 3 boxes)
- [ ] Test mixed scenario (some photos new, some existing)
- [ ] Test job preferences save
- [ ] Verify profile reload shows all saved photos
- [ ] Test error handling for failed uploads

## Notes

- **Photo Limits**: Backend accepts up to 6 photos in the array, frontend uses 3
- **Null Handling**: Photos array can contain null values for empty slots
- **URL Signing**: All photo URLs are signed for secure S3 access
- **Upload Strategy**: Photos are uploaded sequentially to avoid overwhelming the server
- **Error Handling**: Individual photo upload failures don't block other saves

## Migration Considerations

Existing users won't have `cover_url` or `photos` fields in their MongoDB documents. These will be:
- Automatically initialized as `null` and `[]` respectively when accessed
- Properly set when users update their profiles
- No migration script needed due to MongoDB's flexible schema
