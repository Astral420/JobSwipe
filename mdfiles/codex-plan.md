# Codex Prompt & Implementation Plan: Edit Basic Information Fixes

---

## Codex Prompt

Copy-paste this as your Codex prompt:

---

```
Fix two issues with the "Edit Basic Information" applicant profile form:

**Issue 1: ScrollView not scrollable in the edit sheet modal**

In `JobSwipe/frontend/mobile/components/profile/EditBasicInfoSheet.tsx`, the bottom sheet modal's ScrollView (line 89) does not scroll because it lacks `flex: 1`. The form has 8 fields (Name, Headline, Country, Region, Province, City, Street, About) but the sheet is capped at `maxHeight: '85%'`, so users can't reach fields at the bottom.

Fix: Add `flex: 1` to the ScrollView's style. Change `style={styles.content}` to `style={[styles.content, { flex: 1 }]}`.

**Issue 2: `location_country` is not persisted to MongoDB**

The frontend sends `location_country` in the PATCH request to `/profile/applicant/basic-info`, but the backend silently drops it at three levels. Add `location_country` support:

1. In `JobSwipe/backend/app/Http/Requests/Profile/UpdateApplicantBasicInfoRequest.php`, add `'location_country' => ['nullable', 'string', 'max:100']` to the rules array.

2. In `JobSwipe/backend/app/Services/ProfileService.php`, in the `updateApplicantBasicInfo` method (around line 67-74), add `'location_country'` to the `array_flip` allow-list array alongside the existing keys.

3. In `JobSwipe/backend/app/Models/MongoDB/ApplicantProfileDocument.php`, add `'location_country'` to the `$fillable` array.

Do NOT modify any other files or logic. These are surgical, additive changes only.
```

---

## Implementation Plan

### Fix 1 — Frontend: Make ScrollView scrollable

**File:** `JobSwipe/frontend/mobile/components/profile/EditBasicInfoSheet.tsx`

**Line 89 — Change:**
```diff
-          <ScrollView showsVerticalScrollIndicator={false} style={styles.content} keyboardShouldPersistTaps="handled">
+          <ScrollView showsVerticalScrollIndicator={false} style={[styles.content, { flex: 1 }]} keyboardShouldPersistTaps="handled">
```

**Why:** The sheet View has `maxHeight: '85%'` and contains a header, ScrollView, and action buttons. Without `flex: 1`, the ScrollView renders at its natural content height and gets clipped instead of becoming scrollable within the remaining space.

---

### Fix 2 — Backend: Persist `location_country` to MongoDB

#### File 1: `JobSwipe/backend/app/Http/Requests/Profile/UpdateApplicantBasicInfoRequest.php`

**Line 22 — Add after `location_region` rule:**
```diff
             'location_city' => ['nullable', 'string', 'max:100'],
             'location_region' => ['nullable', 'string', 'max:100'],
+            'location_country' => ['nullable', 'string', 'max:100'],
         ];
```

#### File 2: `JobSwipe/backend/app/Services/ProfileService.php`

**Line 67-74 — Add `location_country` to the allow-list:**
```diff
         $allowed = array_intersect_key($data, array_flip([
             'first_name',
             'last_name',
             'bio',
             'location',
             'location_city',
             'location_region',
+            'location_country',
         ]));
```

#### File 3: `JobSwipe/backend/app/Models/MongoDB/ApplicantProfileDocument.php`

**Line 23 — Add after `location_region`:**
```diff
         'location_city',
         'location_region',
+        'location_country',
         'linkedin_url',
```

---

### Verification Checklist

- [ ] Open Edit Basic Information sheet → form scrolls smoothly to reveal About field and action buttons
- [ ] Fill all fields including Country → tap Save → verify `location_country` is stored in MongoDB `applicant_profiles` collection
- [ ] Reopen the form → verify country value loads back correctly from the persisted data
