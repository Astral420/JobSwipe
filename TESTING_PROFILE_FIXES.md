# Testing Guide: Profile Photo & Data Saving Fixes

## Quick Test Commands

### Backend Testing

```bash
# From JobSwipe/ directory
cd backend

# Run backend tests
php artisan test --filter Profile

# Or test manually with curl (after starting server)
php artisan serve

# In another terminal:
# 1. Login and get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 2. Test cover photo update
curl -X PATCH http://localhost:8000/api/v1/profile/applicant/cover-photo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cover_url":"https://example.com/cover.jpg"}'

# 3. Test photos array update
curl -X PATCH http://localhost:8000/api/v1/profile/applicant/photos \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"photos":["https://example.com/photo1.jpg","https://example.com/photo2.jpg",null]}'

# 4. Get profile to verify
curl -X GET http://localhost:8000/api/v1/profile/applicant \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Testing (Mobile)

```bash
# From JobSwipe/frontend/mobile/ directory

# Start Metro bundler
npm start

# In another terminal, run on device/simulator
npm run android
# or
npm run ios
```

## Manual Testing Checklist

### Test Scenario 1: Avatar Photo
- [ ] Open profile tab
- [ ] Tap "Edit" button
- [ ] Tap avatar photo circle
- [ ] Select a photo from gallery
- [ ] Tap "Save"
- [ ] Verify "Uploading..." indicator shows
- [ ] Verify success message appears
- [ ] Verify avatar photo displays correctly after save
- [ ] Close and reopen app
- [ ] Verify avatar photo persists

### Test Scenario 2: Cover Photo (NEW)
- [ ] Open profile tab in edit mode
- [ ] Tap cover photo area (top banner)
- [ ] Select a photo from gallery
- [ ] Tap "Save"
- [ ] Verify "Uploading..." indicator shows
- [ ] Verify success message appears
- [ ] Verify cover photo displays correctly
- [ ] Close and reopen app
- [ ] Verify cover photo persists

### Test Scenario 3: Portfolio Photos (NEW)
- [ ] Open profile tab in edit mode
- [ ] Scroll to "Photos" section (3 boxes)
- [ ] Tap first photo box
- [ ] Select a photo from gallery
- [ ] Tap second photo box
- [ ] Select another photo
- [ ] Leave third box empty
- [ ] Tap "Save"
- [ ] Verify "Uploading..." indicator shows
- [ ] Verify success message appears
- [ ] Verify both photos display correctly
- [ ] Verify third box remains empty
- [ ] Close and reopen app
- [ ] Verify photos persist

### Test Scenario 4: Skills
- [ ] Open profile tab in edit mode
- [ ] Add hard skills (e.g., "React", "TypeScript")
- [ ] Add soft skills (e.g., "Communication", "Leadership")
- [ ] Tap "Save"
- [ ] Verify success message
- [ ] Verify skills display correctly
- [ ] Close and reopen app
- [ ] Verify skills persist

### Test Scenario 5: Job Preferences (NEW)
- [ ] Open profile tab in edit mode
- [ ] Scroll to preferences section
- [ ] Toggle some preferences (e.g., "Remote", "Full-time")
- [ ] Tap "Save"
- [ ] Verify success message
- [ ] Close and reopen app
- [ ] Verify preferences persist

### Test Scenario 6: Mixed Updates
- [ ] Open profile tab in edit mode
- [ ] Change avatar photo
- [ ] Change cover photo
- [ ] Add 2 portfolio photos
- [ ] Update bio text
- [ ] Add skills
- [ ] Toggle preferences
- [ ] Tap "Save"
- [ ] Verify "Uploading..." shows for photos
- [ ] Verify success message
- [ ] Verify all changes saved correctly
- [ ] Close and reopen app
- [ ] Verify all changes persist

### Test Scenario 7: Error Handling
- [ ] Turn off internet connection
- [ ] Try to save profile changes
- [ ] Verify error message appears
- [ ] Turn on internet
- [ ] Try again
- [ ] Verify save succeeds

### Test Scenario 8: Partial Upload Failure
- [ ] Edit profile with multiple photos
- [ ] During save, simulate network interruption
- [ ] Verify error message indicates which upload failed
- [ ] Verify other changes were saved
- [ ] Retry save
- [ ] Verify all changes eventually save

## Database Verification

### Check MongoDB Documents

```bash
# Connect to MongoDB
mongosh

# Switch to database
use jobswipe

# Find an applicant profile
db.applicant_profiles.findOne({ user_id: "USER_ID_HERE" })

# Verify fields exist:
# - cover_url: should be a string URL or null
# - photos: should be an array of URLs or empty array
# - job_preferences: should be an object with preferences
# - skills: should be { hard_skills: [], soft_skills: [] }
```

### Expected Document Structure

```json
{
  "_id": "...",
  "user_id": "...",
  "first_name": "John",
  "last_name": "Doe",
  "profile_photo_url": "https://...",
  "cover_url": "https://...",
  "photos": [
    "https://...",
    "https://...",
    null
  ],
  "bio": "...",
  "location": "...",
  "skills": {
    "hard_skills": ["React", "TypeScript"],
    "soft_skills": ["Communication"]
  },
  "job_preferences": {
    "desired_position": "Software Engineer",
    "preferred_locations": ["San Francisco"],
    "work_type": ["remote", "hybrid"],
    "employment_type": ["full-time"],
    "willing_to_relocate": null
  },
  "work_experience": [],
  "education": [],
  "social_links": [],
  "notification_preferences": [],
  "onboarding_step": 1,
  "profile_completion_percentage": 45
}
```

## Common Issues & Solutions

### Issue: "Failed to upload profile photo"
**Solution**: Check file upload service configuration and S3 credentials

### Issue: Photos not displaying after save
**Solution**: Check that signed URLs are being generated correctly

### Issue: "Validation error: photos"
**Solution**: Ensure photos array doesn't exceed 6 items and all URLs are valid

### Issue: Job preferences not saving
**Solution**: Check that preference values match allowed enums (remote/hybrid/onsite, etc.)

### Issue: Cover photo endpoint returns 404
**Solution**: Verify routes are registered and backend server restarted

## Performance Notes

- Photo uploads happen sequentially to avoid overwhelming the server
- Each photo upload takes ~2-5 seconds depending on file size and network
- Total save time with 3 new photos: ~10-20 seconds
- Progress indicator shows "Uploading..." during photo uploads
- Other profile data saves immediately (< 1 second)

## API Response Examples

### Successful Cover Photo Update
```json
{
  "success": true,
  "data": {
    "profile": {
      "user_id": "...",
      "cover_url": "https://signed-url...",
      ...
    },
    "profile_completion_percentage": 55
  },
  "message": "Cover photo updated."
}
```

### Successful Photos Update
```json
{
  "success": true,
  "data": {
    "profile": {
      "user_id": "...",
      "photos": [
        "https://signed-url-1...",
        "https://signed-url-2...",
        null
      ],
      ...
    },
    "profile_completion_percentage": 60
  },
  "message": "Photos updated."
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation error: photos",
  "code": "VALIDATION_ERROR"
}
```
