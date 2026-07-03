# Phase 2: Applicant-Side Mobile Integration - ACTUAL STATUS

**Date**: May 7, 2026  
**Status**: Re-analyzed and verified

## Re-Analysis Summary

After carefully reviewing the actual codebase, here's what's **REALLY** implemented:

---

## ✅ ALREADY FULLY IMPLEMENTED

### 1. My Applications Screen ✅
**File**: `frontend/mobile/app/applications.tsx`

**What's Working:**
- ✅ Full screen exists and is functional
- ✅ Fetches from `GET /applicant/applications`
- ✅ Displays application list with:
  - Job title, company name
  - Status badges (pending/reviewed/accepted/rejected) with color coding
  - Application date with smart formatting (Today, Yesterday, X days ago)
  - Location and work type
  - Company logo placeholder
- ✅ Pull-to-refresh functionality
- ✅ Empty state ("No applications yet")
- ✅ Loading state with spinner
- ✅ Error state with retry button
- ✅ Navigation button in profile screen (`router.push('/applications')`)

**Conclusion**: NO WORK NEEDED - This is complete!

---

### 2. Match Accept ✅
**File**: `frontend/mobile/app/(tabs)/matches.tsx`

**What's Working:**
- ✅ Automatically accepts match when applicant sends first message
- ✅ Calls `POST /applicant/matches/{id}/accept`
- ✅ Updates local state after acceptance
- ✅ Backend status mapping for `declined` and `expired`

**Conclusion**: Accept flow is complete!

---

## ❌ NOT IMPLEMENTED (Need Work)

### 1. Experience & Education CRUD ❌
**File**: `frontend/mobile/app/(tabs)/profile.tsx`

**What's Working:**
- ✅ Displays experience from API (`profile.work_experience`)
- ✅ Displays education from API (`profile.education`)
- ✅ Has modal UI to add new items locally
- ✅ Local state management (`addExperience()`, `addEducation()`)

**What's Missing:**
- ❌ No API call in `addExperience()` - just updates local state
- ❌ No API call in `addEducation()` - just updates local state
- ❌ No edit button on existing experience/education cards
- ❌ No delete button on existing experience/education cards
- ❌ No `POST /profile/applicant/experience` integration
- ❌ No `PATCH /profile/applicant/experience/{index}` integration
- ❌ No `DELETE /profile/applicant/experience/{index}` integration
- ❌ Same for education endpoints

**Backend Endpoints Available:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/profile/applicant/experience` | Add work experience |
| PATCH | `/profile/applicant/experience/{index}` | Update work experience |
| DELETE | `/profile/applicant/experience/{index}` | Remove work experience |
| POST | `/profile/applicant/education` | Add education |
| PATCH | `/profile/applicant/education/{index}` | Update education |
| DELETE | `/profile/applicant/education/{index}` | Remove education |

**What Needs to be Done:**
1. Wire up `addExperience()` to call `POST /profile/applicant/experience`
2. Wire up `addEducation()` to call `POST /profile/applicant/education`
3. Add edit icon to each experience card
4. Add edit modal with pre-filled data
5. Wire up edit to call `PATCH /profile/applicant/experience/{index}`
6. Add delete icon to each experience card
7. Add delete confirmation dialog
8. Wire up delete to call `DELETE /profile/applicant/experience/{index}`
9. Repeat steps 3-8 for education
10. Reload profile after each CRUD operation

---

### 2. Resume & Cover Letter Updates ❌
**File**: `frontend/mobile/app/(tabs)/profile.tsx`

**What's Working:**
- ✅ Resume and cover letter uploaded during onboarding
- ✅ Stored in backend (presumably)

**What's Missing:**
- ❌ **NO UI section for documents in profile screen**
- ❌ No way to view current resume filename/status
- ❌ No way to view current cover letter filename/status
- ❌ No "Update Resume" button
- ❌ No "Update Cover Letter" button
- ❌ No file picker integration for updates
- ❌ No download/view functionality

**Backend Endpoints Available:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| PATCH | `/profile/applicant/resume` | Update resume file |
| PATCH | `/profile/applicant/cover-letter` | Update cover letter file |

**What Needs to be Done:**
1. Add "Resume & Documents" section to profile screen
2. Fetch current resume/cover letter URLs from profile API
3. Display current resume status (filename, upload date, or "Not uploaded")
4. Display current cover letter status
5. Add "Update Resume" button with file picker
6. Add "Update Cover Letter" button with file picker
7. Upload file using existing `uploadSingleFile()` utility
8. Call `PATCH /profile/applicant/resume` with new file URL
9. Call `PATCH /profile/applicant/cover-letter` with new file URL
10. Show upload progress indicator
11. Handle errors gracefully
12. Optional: Add "View" button to open document (if supported)

---

### 3. Match Manual Decline ❌
**File**: `frontend/mobile/app/(tabs)/matches.tsx`

**What's Working:**
- ✅ Backend handles `declined` status
- ✅ UI maps `declined` to "expired" conversation state
- ✅ Status mapping function exists

**What's Missing:**
- ❌ **NO decline button in UI**
- ❌ No way for applicant to manually decline a match
- ❌ No confirmation dialog for decline

**Backend Endpoint Available:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/applicant/matches/{id}/decline` | Manually decline a match |

**What Needs to be Done:**
1. Add subtle "Not Interested" button to match cards
2. Style as small gray text link (not prominent)
3. Add confirmation dialog: "Are you sure? This action cannot be undone."
4. Call `POST /applicant/matches/{id}/decline` on confirm
5. Remove match from local state after successful decline
6. Show brief feedback message ("Match declined")
7. Handle API errors gracefully

**Design Considerations:**
- **Subtle placement**: Bottom of match card, small gray text
- **Not prominent**: Should not encourage declining
- **Confirmation required**: Prevent accidental declines
- **No undo**: Once declined, match is permanently gone

---

## Revised Implementation Plan

### Phase 2.1: Experience & Education CRUD (Priority 1)
**Estimated Time**: 2-3 hours  
**Files**: `frontend/mobile/app/(tabs)/profile.tsx`

### Phase 2.2: Resume & Cover Letter Updates (Priority 2)
**Estimated Time**: 2-3 hours  
**Files**: `frontend/mobile/app/(tabs)/profile.tsx`

### Phase 2.3: Match Manual Decline (Priority 3)
**Estimated Time**: 1 hour  
**Files**: `frontend/mobile/app/(tabs)/matches.tsx`

### ~~Phase 2.4: My Applications Screen~~ ✅ SKIP - Already Done!

---

## Summary

**Total Work Needed**: 3 features (down from 4)

| Feature | Status | Work Required |
|---------|--------|---------------|
| Experience & Education CRUD | ❌ Not Implemented | Wire up API calls, add edit/delete UI |
| Resume & Cover Letter Updates | ❌ Not Implemented | Create entire UI section + API integration |
| Match Manual Decline | ❌ Not Implemented | Add decline button + confirmation |
| My Applications Screen | ✅ Already Done | None - fully functional |

---

## Next Steps

Ready to implement Phase 2.1 (Experience & Education CRUD) when you give the go signal.

