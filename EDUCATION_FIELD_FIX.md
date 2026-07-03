# Education Field Validation Fix

## Issue
When adding education entries in the profile edit form, the API was returning a validation error:
```
ERROR Add education error: {"code": "VALIDATION_ERROR", "errors": {"field": ["The field field is required."]}, "message": "Validation failed.", "success": false}
```

## Root Cause
The profile edit form was sending the field of study as `field` instead of `field_of_study`, which didn't match the API's expected field name used in the registration form.

## Solution
Updated the `handleAddEducation` function in `frontend/mobile/app/(tabs)/profile.tsx` to send the correct field name:

**Before:**
```typescript
await api.post('/profile/applicant/education', {
  degree: data.degree,
  institution: data.school,
  field: data.fieldOfStudy,  // ❌ Wrong field name
  start_date: data.startDate,
  end_date: data.endDate,
});
```

**After:**
```typescript
await api.post('/profile/applicant/education', {
  degree: data.degree,
  institution: data.school,
  field_of_study: data.fieldOfStudy,  // ✅ Correct field name
  start_date: data.startDate,
  end_date: data.endDate,
});
```

## Files Modified
1. **frontend/mobile/app/(tabs)/profile.tsx**
   - Fixed field name from `field` to `field_of_study`
   - Removed debug console.log statements

2. **frontend/mobile/components/profile/EditEducationSheet.tsx**
   - Removed debug console.log statements
   - Already had correct field structure

## Verification
The fix aligns with the registration form implementation which uses:
```typescript
type EducationEntry = {
  school: string;
  degree: string;
  field_of_study: string;  // ✅ Matches API expectation
  start_date: string;
  end_date: string;
};
```

## Testing
To test the fix:
1. Go to Profile tab
2. Click "Edit" dropdown → "Education"
3. Click "Add Education"
4. Fill in:
   - School: "STI"
   - Degree: "SHS"
   - Field of Study: "BSTM"
   - Start: "2022-01-26"
   - End: "2024-09-12"
5. Click "Add"
6. Should see success message and education entry added to profile

## Status
✅ **COMPLETED** - Education entries can now be added successfully without validation errors.
