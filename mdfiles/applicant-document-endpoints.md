# Applicant Profile — Document Handling Endpoints

## Overview

The applicant profile has a "Documents" tab in the mobile app (`profile.tsx` line 854) that is currently a placeholder. The backend endpoints for managing applicant documents (resume, cover letter, portfolio) are **already fully implemented** — the gap is entirely on the frontend, plus one missing backend endpoint for portfolio URL updates.

---

## Backend Endpoints (All Implemented)

### Document Update Routes

All routes live under `profile/applicant/` with `auth:sanctum` + `role:applicant` middleware.

| Method | Route | Controller Method | Request Body | Purpose |
|--------|-------|-------------------|-------------|---------|
| `PATCH` | `/profile/applicant/resume` | `ProfileController::updateApplicantResume` | `{ resume_url: string }` | Upload/replace resume |
| `PATCH` | `/profile/applicant/cover-letter` | `ProfileController::updateApplicantCoverLetter` | `{ cover_letter_url: string }` | Upload/replace cover letter |
| `PATCH` | `/profile/applicant/photo` | `ProfileController::updateApplicantPhoto` | `{ profile_photo_url: string }` | Update profile photo |
| `PATCH` | `/profile/applicant/cover-photo` | `ProfileController::updateApplicantCoverPhoto` | `{ cover_url: string }` | Update cover photo |
| `PATCH` | `/profile/applicant/photos` | `ProfileController::updateApplicantPhotos` | `{ photos: string[] }` | Update showcase photos (max 6) |

**Route definitions:** `backend/routes/api.php`, lines 96–113.

### File Upload Infrastructure

These endpoints handle the presigned-URL upload flow to Cloudflare R2:

| Method | Route | Controller | Request Body | Purpose |
|--------|-------|------------|-------------|---------|
| `POST` | `/files/upload-url` | `FileUploadController::generateUploadUrl` | `{ file_name, file_type, file_size, upload_type }` | Get presigned R2 upload URL |
| `POST` | `/files/read-url` | `FileUploadController::generateReadUrl` | `{ file_url }` | Get presigned R2 read URL |
| `POST` | `/files/confirm-upload` | `FileUploadController::confirmUpload` | `{ file_url }` | Confirm file upload succeeded |

**Route definitions:** `backend/routes/api.php`, lines 80–84.

---

## Upload Flow (How It Works)

The app uses a **presigned URL pattern** — files go directly to Cloudflare R2, not through the Laravel server:

```
Step 1:  Frontend → POST /files/upload-url
         Body: { file_name: "resume.pdf", file_type: "application/pdf", file_size: 204800, upload_type: "document" }
         Response: { upload_url, file_key, public_url, expires_in: 900 }

Step 2:  Frontend → PUT <upload_url>
         Body: raw file binary (direct to R2, not through backend)

Step 3:  Frontend → PATCH /profile/applicant/resume
         Body: { resume_url: "<public_url from step 1>" }
         Backend validates URL belongs to authorized R2 bucket, saves to MongoDB
```

### Upload Type Constraints

| `upload_type` | Max Size | Allowed Extensions | Allowed MIME Types |
|---------------|----------|-------------------|--------------------|
| `image` | 10 MB | jpg, jpeg, png, webp, heic, heif | image/jpeg, image/png, image/webp, image/heic, image/heif |
| `document` | 5 MB | pdf, docx | application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document |

**Validation logic:** `backend/app/Services/FileUploadService.php`, lines 147–172.

---

## MongoDB Schema (ApplicantProfileDocument)

**File:** `backend/app/Models/MongoDB/ApplicantProfileDocument.php`

Document-related fields in the `$fillable` array:

| Field | Type | Stored As | Used By |
|-------|------|-----------|---------|
| `resume_url` | `string` | R2 public URL | Resume endpoint |
| `cover_letter_url` | `string` | R2 public URL | Cover letter endpoint |
| `portfolio_url` | `string` | External URL | Onboarding only (no dedicated update endpoint) |
| `profile_photo_url` | `string` | R2 public URL | Photo endpoint |
| `cover_url` | `string` | R2 public URL | Cover photo endpoint |
| `photos` | `array` | Array of R2 public URLs | Photos endpoint |

---

## Backend Implementation Details

### ProfileController (Lines 137–157)

The resume and cover letter handlers follow the same pattern:

```php
// Resume handler (line 137)
public function updateApplicantResume(UpdateApplicantResumeRequest $request): JsonResponse
{
    $validated = $request->validated();
    $this->fileUploads->validateFileUrl((string) $validated['resume_url']);  // Validates R2 bucket origin
    $result = $this->profiles->updateApplicantResume($request->user()->id, (string) $validated['resume_url']);
    return $this->successSigned($result, 'Resume updated.');
}

// Cover letter handler (line 147)
public function updateApplicantCoverLetter(Request $request): JsonResponse
{
    $validated = $request->validate(['cover_letter_url' => ['required', 'url', 'max:2000']]);
    $this->fileUploads->validateFileUrl((string) $validated['cover_letter_url']);
    $result = $this->profiles->updateApplicantCoverLetter($request->user()->id, (string) $validated['cover_letter_url']);
    return $this->successSigned($result, 'Cover letter updated.');
}
```

### ProfileService (Lines 181–195)

Both service methods do the same thing — update the MongoDB document and recalculate profile completion:

```php
public function updateApplicantResume(string $userId, string $resumeUrl): array
{
    $profile = $this->ensureApplicantDocument($userId);
    $updated = $this->applicantDocs->update($profile, ['resume_url' => $resumeUrl]);
    return $this->withApplicantCompletion($updated);
}

public function updateApplicantCoverLetter(string $userId, string $coverLetterUrl): array
{
    $profile = $this->ensureApplicantDocument($userId);
    $updated = $this->applicantDocs->update($profile, ['cover_letter_url' => $coverLetterUrl]);
    return $this->withApplicantCompletion($updated);
}
```

### URL Signing (ProfileController Lines 390–458)

All file URLs returned from profile endpoints are **automatically signed** via `successSigned()`. The controller replaces raw R2 public URLs with time-limited presigned read URLs. The frontend receives ready-to-use URLs.

Signed single-file fields: `resume_url`, `cover_letter_url`, `portfolio_url`, `profile_photo_url`, `logo_url`, `cover_photo`, `cover_url`.

Signed array fields: `office_images`, `verification_documents`, `photos`.

### Request Validation (UpdateApplicantResumeRequest)

**File:** `backend/app/Http/Requests/Profile/UpdateApplicantResumeRequest.php`

```php
public function rules(): array
{
    return [
        'resume_url' => ['required', 'url', 'max:2000'],
    ];
}
```

> Note: The cover letter endpoint uses inline validation in the controller instead of a FormRequest class.

---

## Implementation Status

### ✅ Fully Working (Backend + Frontend)

| Feature | Backend | Frontend |
|---------|---------|----------|
| Profile photo | `PATCH /profile/applicant/photo` | `profile.tsx` — `handleEditPhotos` |
| Cover photo | `PATCH /profile/applicant/cover-photo` | `profile.tsx` — `handleEditPhotos` |
| Resume (onboarding) | `POST /profile/onboarding/complete-step` (step 2) | `register.tsx` — onboarding flow |

### ❌ Gaps (Backend Ready, Frontend Missing)

| Feature | Backend | Frontend |
|---------|---------|----------|
| Resume update (post-onboarding) | ✅ `PATCH /profile/applicant/resume` | ❌ Documents tab is a placeholder |
| Cover letter | ✅ `PATCH /profile/applicant/cover-letter` | ❌ Documents tab is a placeholder |
| Portfolio URL | ⚠️ Field in MongoDB, no update endpoint | ❌ Not in Documents tab |

### Frontend Placeholder (profile.tsx lines 854–861)

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

---

## Expected Response Contract

### PATCH /profile/applicant/resume

**Request:**
```json
{
  "resume_url": "https://cdn.jobswipe.app/document/user-abc/uuid.pdf"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "resume_url": "https://r2-endpoint/document/user-abc/uuid.pdf?X-Amz-Signature=...",
      "cover_letter_url": null,
      "..."
    },
    "profile_completion_percentage": 85
  },
  "message": "Resume updated."
}
```

### PATCH /profile/applicant/cover-letter

**Request:**
```json
{
  "cover_letter_url": "https://cdn.jobswipe.app/document/user-abc/uuid.pdf"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": { "..." },
    "profile_completion_percentage": 90
  },
  "message": "Cover letter updated."
}
```

---

## Files Reference

| File | What It Contains |
|------|-----------------|
| `backend/routes/api.php` (lines 96–113) | Route definitions |
| `backend/app/Http/Controllers/Profile/ProfileController.php` (lines 137–200) | Controller handlers |
| `backend/app/Services/ProfileService.php` (lines 181–219) | Service layer |
| `backend/app/Services/FileUploadService.php` | Presigned URL generation + validation |
| `backend/app/Http/Controllers/File/FileUploadController.php` | File upload controller |
| `backend/app/Http/Requests/Profile/UpdateApplicantResumeRequest.php` | Resume request validation |
| `backend/app/Models/MongoDB/ApplicantProfileDocument.php` | MongoDB schema |
| `frontend/mobile/app/(tabs)/profile.tsx` (lines 854–861) | Documents tab placeholder |
| `frontend/mobile/app/(auth)/register.tsx` (lines 269–285, 306, 557–570) | Upload flow reference (onboarding) |
