# Preferred Locations Fix

## Problem Identified

The mobile app was **overwriting** `preferred_locations` on every profile save because:

1. ❌ The app never loaded existing `job_preferences.preferred_locations` from the API
2. ❌ It reconstructed `preferred_locations` from the single `profileLocation` field
3. ❌ This caused any existing preferred locations to be lost and replaced with just the current location

### Data Flow Issue

**Before Fix:**
```
API Response: { job_preferences: { preferred_locations: ["Makati", "BGC", "Quezon City"] } }
                                    ↓
Frontend: IGNORED - never parsed
                                    ↓
On Save: preferred_locations = [profileLocation] // Only 1 location
                                    ↓
Result: Data loss - all preferred locations replaced with current location
```

## Solution Implemented

### 1. Added State Management
- Added `preferredLocations` state (separate from `profileLocation`)
- `profileLocation` = Current/home location (single, for display)
- `preferredLocations` = Where user wants to work (multiple, for job matching)

### 2. Load Existing Data
Updated the profile loading logic to parse `job_preferences`:
```typescript
// Load job preferences (including preferred_locations)
if (profile.job_preferences && typeof profile.job_preferences === 'object') {
  if (Array.isArray(profile.job_preferences.preferred_locations)) {
    setPreferredLocations(profile.job_preferences.preferred_locations);
  }
  
  // Also load work_type and employment_type as prefs
  // ...
}
```

### 3. Save Correctly
Updated the save logic to use the separate state:
```typescript
const jobPreferences = {
  desired_position: profileHeadline || null,
  preferred_locations: preferredLocations.length > 0 ? preferredLocations : [],
  work_type: [...],
  employment_type: [...],
  willing_to_relocate: null,
};
```

### 4. Added UI for Multiple Locations
- New section: "Preferred Work Locations"
- Add/remove multiple locations
- Visual chips showing all preferred locations
- Duplicate detection

## Data Model

```json
{
  "location": "Makati, Metro Manila",  // Current location (single, for profile display)
  "location_city": "Makati",
  "location_region": "Metro Manila",
  "job_preferences": {
    "desired_position": "Full Stack Developer",
    "preferred_locations": [           // Multiple locations for job matching
      "Makati, Metro Manila",
      "BGC, Taguig",
      "Quezon City"
    ],
    "work_type": ["remote", "hybrid"],
    "employment_type": ["full-time"]
  }
}
```

## Job Matching Strategy (Soft Preference)

`preferred_locations` works as a **soft preference**, not a hard filter:

1. **Remote jobs**: Always shown (location doesn't matter)
2. **Hybrid/Onsite jobs**: 
   - Jobs in `preferred_locations` → Higher priority/score
   - Jobs NOT in `preferred_locations` → Still shown, lower priority
3. **Empty `preferred_locations`**: User is open to any location

This allows users to still see all jobs while the app can prioritize matches based on location preferences.

## Files Changed

- `frontend/mobile/app/(tabs)/profile.tsx`
  - Added `preferredLocations` state
  - Added `showAddLocation`, `newLocation` state
  - Added `addPreferredLocation()` and `removePreferredLocation()` functions
  - Updated profile loading to parse `job_preferences.preferred_locations`
  - **Fixed**: Load `job_preferences.desired_position` as `profileHeadline` (was incorrectly looking for `profile.headline`)
  - Updated save logic to use `preferredLocations` state
  - Added "Preferred Work Locations" UI section

## Bug Fixes

### Issue: Role/Headline Not Loading
**Problem**: The profile screen was looking for `profile.headline` which doesn't exist in the backend model.

**Root Cause**: The role/headline is stored in `job_preferences.desired_position`, not as a top-level `headline` field.

**Fix**: Updated the loading logic to correctly read from `job_preferences.desired_position`:
```typescript
// Load desired_position as profileHeadline
if (profile.job_preferences.desired_position) {
  setProfileHeadline(profile.job_preferences.desired_position);
}
```

## Testing

### Test Case 1: Load Existing Preferred Locations
1. User with existing `preferred_locations: ["Makati", "BGC"]`
2. Open profile screen
3. ✅ Should display both locations in the "Preferred Work Locations" section

### Test Case 2: Add New Location
1. Enter edit mode
2. Click "Add" in Preferred Work Locations
3. Enter "Quezon City"
4. Click "Add Location"
5. Save profile
6. ✅ Should save all 3 locations

### Test Case 3: Remove Location
1. Enter edit mode
2. Click X on a location chip
3. Save profile
4. ✅ Should remove that location from the array

### Test Case 4: Duplicate Prevention
1. Try to add a location that already exists
2. ✅ Should show "Duplicate" alert

### Test Case 5: Empty State
1. User with no preferred locations
2. ✅ Should show "No preferred locations set" message

## Backend Compatibility

✅ No backend changes needed - the backend already:
- Stores `job_preferences.preferred_locations` as an array
- Validates it correctly in `ProfileController`
- Returns it in the API response

## Next Steps (Optional Enhancements)

1. **Location Autocomplete**: Integrate Google Places API for location suggestions
2. **Current Location Quick Add**: Button to add current location to preferred locations
3. **Location Radius**: Allow users to set a radius around each location
4. **Job Feed Integration**: Use `preferred_locations` in job matching algorithm to boost relevant jobs
