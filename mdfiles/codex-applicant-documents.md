# Codex Prompt: Implement Applicant Documents Tab + Portfolio Endpoint

---

## Codex Prompt

Copy-paste this as your Codex prompt:

---

```
Implement the Documents tab in the applicant profile and add a missing portfolio update endpoint. There are three tasks:

**Task 1: Add `PATCH /profile/applicant/portfolio` backend endpoint**

The `portfolio_url` field already exists in the MongoDB ApplicantProfileDocument model (`backend/app/Models/MongoDB/ApplicantProfileDocument.php`, in `$fillable`), but there is no dedicated update endpoint for it post-onboarding.

1. In `backend/routes/api.php`, inside the `role:applicant` applicant profile group (around line 112, after the `social-links` route), add:
   ```php
   Route::patch('portfolio', [ProfileController::class, 'updateApplicantPortfolio']);
   ```

2. In `backend/app/Services/ProfileService.php`, add a new method after `updateApplicantCoverLetter` (around line 195):
   ```php
   public function updateApplicantPortfolio(string $userId, string $portfolioUrl): array
   {
       $profile = $this->ensureApplicantDocument($userId);
       $updated = $this->applicantDocs->update($profile, ['portfolio_url' => $portfolioUrl]);
       return $this->withApplicantCompletion($updated);
   }
   ```

3. In `backend/app/Http/Controllers/Profile/ProfileController.php`, add a new method after `updateApplicantCoverLetter` (around line 157):
   ```php
   public function updateApplicantPortfolio(Request $request): JsonResponse
   {
       $validated = $request->validate([
           'portfolio_url' => ['required', 'url', 'max:2000'],
       ]);

       $result = $this->profiles->updateApplicantPortfolio($request->user()->id, (string) $validated['portfolio_url']);

       return $this->successSigned($result, 'Portfolio updated.');
   }
   ```

   Note: Portfolio URLs are external links (e.g. Behance, Dribbble), so do NOT call `$this->fileUploads->validateFileUrl()` — that method validates R2 bucket origin, which would reject external URLs.

**Task 2: Load document data from profile API response**

In `frontend/mobile/app/(tabs)/profile.tsx`, inside the `loadProfile` function (around line 79–154), add state variables and load the document data from the existing `GET /profile/applicant` response:

1. Add three new state variables after the existing profile data state (around line 68):
   ```tsx
   const [resumeUrl, setResumeUrl] = useState<string | null>(null);
   const [coverLetterUrl, setCoverLetterUrl] = useState<string | null>(null);
   const [portfolioUrl, setPortfolioUrl] = useState<string | null>(null);
   ```

2. Inside `loadProfile()`, after the skills loading block (around line 147), add:
   ```tsx
   // Load document URLs
   if (profile.resume_url) setResumeUrl(profile.resume_url);
   if (profile.cover_letter_url) setCoverLetterUrl(profile.cover_letter_url);
   if (profile.portfolio_url) setPortfolioUrl(profile.portfolio_url);
   ```

**Task 3: Implement the Documents tab UI**

Replace the placeholder Documents tab content in `frontend/mobile/app/(tabs)/profile.tsx` (lines 854–861). The current code is:

```tsx
{activeTab === 'documents' && (
  <View style={[styles.section, { marginTop: 20 }]}>
    <Text style={[styles.sectionTitle, { color: T.textHint }]}>DOCUMENTS</Text>
    <Text style={[styles.emptyText, { color: T.textHint }]}>
      Documents section coming soon
    </Text>
  </View>
)}
```

Replace it with a proper Documents section that shows three document cards: Resume, Cover Letter, and Portfolio URL. Each card should:

- Show an icon, label, and current status (uploaded filename or "Not uploaded")
- Have an upload/replace button for Resume and Cover Letter (using `expo-document-picker`)
- Have a text input + save button for Portfolio URL
- Have a "View" button if the document exists (open the URL using `Linking.openURL`)
- Show an upload progress indicator while uploading

The upload flow for Resume and Cover Letter must use the existing `uploadSingleFile` utility from `../../utils/fileUpload` (already imported in profile.tsx). After uploading:
- Resume: call `api.patch('/profile/applicant/resume', { resume_url: uploadedUrl })`
- Cover Letter: call `api.patch('/profile/applicant/cover-letter', { cover_letter_url: uploadedUrl })`
- Portfolio: call `api.patch('/profile/applicant/portfolio', { portfolio_url: inputUrl })`

Use the existing theme (T) for colors and follow the same styling patterns used elsewhere in profile.tsx (e.g. the experience cards, skills chips). Use `MaterialCommunityIcons` which is already imported. Use `expo-document-picker` for file picking (install if not already available).

Design the cards with:
- A colored icon container on the left (similar to `styles.expIcon`)
- Document name/status in the middle
- Action buttons on the right
- Use icons: "file-pdf-box" for resume, "file-document-outline" for cover letter, "link-variant" for portfolio

After any successful upload/save, call `loadProfile()` to refresh the data and show `AlertHelper.success()`.

Do NOT modify any other existing functionality. Do NOT change the tab definitions or the ProfileTabBar component.
```

---

## Implementation Plan

### Task 1 — Backend: Add Portfolio Update Endpoint

#### File 1: `backend/routes/api.php`

**Line 112 — Add after `social-links` route:**
```diff
                     Route::patch('social-links', [ProfileController::class, 'updateSocialLinks']);
+                    Route::patch('portfolio', [ProfileController::class, 'updateApplicantPortfolio']);
                 });
```

#### File 2: `backend/app/Services/ProfileService.php`

**Line 195 — Add after `updateApplicantCoverLetter`:**
```diff
     public function updateApplicantCoverLetter(string $userId, string $coverLetterUrl): array
     {
         $profile = $this->ensureApplicantDocument($userId);
         $updated = $this->applicantDocs->update($profile, ['cover_letter_url' => $coverLetterUrl]);
         return $this->withApplicantCompletion($updated);
     }
+
+    public function updateApplicantPortfolio(string $userId, string $portfolioUrl): array
+    {
+        $profile = $this->ensureApplicantDocument($userId);
+        $updated = $this->applicantDocs->update($profile, ['portfolio_url' => $portfolioUrl]);
+        return $this->withApplicantCompletion($updated);
+    }
```

#### File 3: `backend/app/Http/Controllers/Profile/ProfileController.php`

**Line 157 — Add after `updateApplicantCoverLetter`:**
```diff
         return $this->successSigned($result, 'Cover letter updated.');
     }
+
+    public function updateApplicantPortfolio(Request $request): JsonResponse
+    {
+        $validated = $request->validate([
+            'portfolio_url' => ['required', 'url', 'max:2000'],
+        ]);
+
+        $result = $this->profiles->updateApplicantPortfolio($request->user()->id, (string) $validated['portfolio_url']);
+
+        return $this->successSigned($result, 'Portfolio updated.');
+    }
```

> **Important:** Do NOT call `$this->fileUploads->validateFileUrl()` here. Portfolio URLs are external links (Behance, Dribbble, GitHub, etc.), not R2 bucket URLs. The `validateFileUrl()` method checks R2 bucket origin and would reject external URLs.

---

### Task 2 — Frontend: Load Document State

#### File: `frontend/mobile/app/(tabs)/profile.tsx`

**Line 68 — Add state variables:**
```diff
   const [education, setEducation] = useState<EducationItem[]>([]);
+
+  // Document URLs
+  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
+  const [coverLetterUrl, setCoverLetterUrl] = useState<string | null>(null);
+  const [portfolioUrl, setPortfolioUrl] = useState<string | null>(null);
```

**Line 147 — Add loading logic inside `loadProfile()`:**
```diff
       }
+
+      // Load document URLs
+      setResumeUrl(profile.resume_url || null);
+      setCoverLetterUrl(profile.cover_letter_url || null);
+      setPortfolioUrl(profile.portfolio_url || null);
+
     } catch (err) {
```

---

### Task 3 — Frontend: Documents Tab UI

#### File: `frontend/mobile/app/(tabs)/profile.tsx`

**Lines 854–861 — Replace placeholder with document cards:**

The new Documents tab should render three cards:

1. **Resume** — File upload via `expo-document-picker` → `uploadSingleFile(file, 'document')` → `api.patch('/profile/applicant/resume', { resume_url })` → `loadProfile()`
2. **Cover Letter** — Same flow → `api.patch('/profile/applicant/cover-letter', { cover_letter_url })` → `loadProfile()`
3. **Portfolio URL** — Text input → `api.patch('/profile/applicant/portfolio', { portfolio_url })` → `loadProfile()`

**Key references for the upload flow:**
- The `uploadSingleFile` function is already imported from `../../utils/fileUpload`
- It handles: presigned URL generation → R2 upload → confirm upload → returns `public_url`
- For document picker, use `expo-document-picker` with type filter `['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']`

---

### Dependency Check

The frontend needs `expo-document-picker`. Check if it's already installed:

```bash
# Check if already in package.json
grep "expo-document-picker" frontend/mobile/package.json
```

If not installed, add to imports and install:
```bash
cd frontend/mobile && npx expo install expo-document-picker
```

---

## Files Changed Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `backend/routes/api.php` | Edit | +1 line (add route) |
| `backend/app/Http/Controllers/Profile/ProfileController.php` | Edit | +12 lines (add method) |
| `backend/app/Services/ProfileService.php` | Edit | +7 lines (add method) |
| `frontend/mobile/app/(tabs)/profile.tsx` | Edit | ~100 lines (state + UI) |

**Total estimated change: ~120 lines across 4 files.**

---

## Verification Checklist

- [ ] `PATCH /api/v1/profile/applicant/portfolio` returns 200 with `{ portfolio_url: "..." }` in the profile response
- [ ] Documents tab shows current resume/cover-letter status from `GET /profile/applicant`
- [ ] Tapping "Upload" on Resume opens document picker filtered to PDF/DOCX
- [ ] After upload, resume URL is saved and displayed with a "View" button
- [ ] Cover letter upload/replace works the same way
- [ ] Portfolio URL text input saves via the new PATCH endpoint
- [ ] "View" buttons open the document in the device browser/viewer
- [ ] Profile completion percentage updates after adding documents
- [ ] Existing profile functionality (photos, experience, skills, etc.) is unaffected
