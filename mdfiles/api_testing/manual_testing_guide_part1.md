# JobSwipe Backend — Manual Testing Guide (Part 1 of 3)

> **Base URL**: `http://localhost:8000/api/v1`
> **All requests**: `Content-Type: application/json`, `Accept: application/json`
> 🔒 = Requires `Authorization: Bearer {token}` from login/register

---

## 1. Health Check

### `GET /health`

**Headers**: None required.
**Body**: None.

```
GET {{base_url}}/health
```

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "status": "ok", "timestamp": "...", "app": "JobSwipe", "env": "local" }` |

---

## 2. Authentication

---

### 2.1 Register — `POST /auth/register`

**Headers**:
```
Content-Type: application/json
Accept: application/json
```

**Request Body (Applicant)**:
```json
{
  "role": "applicant",
  "email": "john.doe@gmail.com",
  "password": "Str0ng!Pass#2026"
}
```

**Request Body (HR)**:
```json
{
  "role": "hr",
  "email": "hr@techcorp.com",
  "password": "Str0ng!Pass#2026"
}
```

**Request Body (Company Admin)**:
```json
{
  "role": "company_admin",
  "email": "admin@techcorp.com",
  "password": "Str0ng!Pass#2026"
}
```

| Outcome | HTTP | Code | Response Body |
|---------|------|------|---------------|
| ✅ Success | `200` | — | `{ "success": true, "message": "Verification code sent successfully", "data": { "email": "john.doe@gmail.com" } }` |
| ❌ Weak password | `422` | validation | `{ "message": "...", "errors": { "password": ["The password must be at least 8 characters.", ...] } }` |
| ❌ Invalid role | `422` | validation | `{ "errors": { "role": ["Role must be applicant, hr, or company_admin."] } }` |
| ❌ Missing email | `422` | validation | `{ "errors": { "email": ["The email field is required."] } }` |
| ❌ Email taken | `409` | `EMAIL_TAKEN` | `{ "success": false, "code": "EMAIL_TAKEN", "message": "An account already existed with this email" }` |
| ❌ HR+OAuth | `422` | `OAUTH_NOT_PERMITTED` | `{ "success": false, "code": "OAUTH_NOT_PERMITTED", "message": "HR/Company accounts must register with email and password." }` |

**E2E Context**: Entry point for every user. After success, must verify email (2.2) before any authenticated action.

---

### 2.2 Verify Email — `POST /auth/verify-email`

**Headers**:
```
Content-Type: application/json
Accept: application/json
```

**Request Body**:
```json
{
  "email": "john.doe@gmail.com",
  "code": "482913"
}
```

| Outcome | HTTP | Code | Response Body |
|---------|------|------|---------------|
| ✅ Verified | `201` | — | `{ "success": true, "message": "Email verified successfully. Account created.", "data": { "token": "1|abc123...", "user": { "id": "uuid", "email": "...", "role": "applicant", ... } } }` |
| ❌ Wrong code | `422` | `OTP_INVALID` | `{ "success": false, "code": "OTP_INVALID", "message": "Incorrect verification code." }` |
| ❌ Expired | `422` | `OTP_EXPIRED` | `{ "success": false, "code": "OTP_EXPIRED", "message": "Verification code has expired. Please request a new one." }` |
| ❌ Max attempts | `429` | `OTP_MAX_ATTEMPTS` | `{ "success": false, "code": "OTP_MAX_ATTEMPTS", "message": "Too many incorrect attempts. Please request a new code." }` |
| ❌ Bad format | `422` | validation | `{ "errors": { "code": ["Verification code must be exactly 6 characters."] } }` |

**E2E Context**: Returns the Sanctum `token` — save this for all subsequent requests.

---

### 2.3 Resend Verification — `POST /auth/resend-verification`

**Headers**:
```
Content-Type: application/json
Accept: application/json
```

**Request Body**:
```json
{
  "email": "john.doe@gmail.com"
}
```

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Always | `200` | `{ "success": true, "message": "If that email is registered, a new code has been sent." }` |

> [!NOTE]
> Always returns 200 regardless of whether the email exists — prevents email enumeration attacks.

---

### 2.4 Login — `POST /auth/login`

**Headers**:
```
Content-Type: application/json
Accept: application/json
```

**Request Body**:
```json
{
  "email": "john.doe@gmail.com",
  "password": "Str0ng!Pass#2026"
}
```

| Outcome | HTTP | Code | Response Body |
|---------|------|------|---------------|
| ✅ Success | `200` | — | `{ "success": true, "data": { "token": "2|xyz789...", "user": { "id": "uuid", "email": "...", "role": "applicant" } } }` |
| ❌ Bad credentials | `401` | `INVALID_CREDENTIALS` | `{ "success": false, "code": "INVALID_CREDENTIALS", "message": "Invalid email or password." }` |
| ❌ Unverified | `403` | `EMAIL_UNVERIFIED` | `{ "success": false, "code": "EMAIL_UNVERIFIED", "message": "Please verify your email. A new code has been sent." }` |
| ❌ Banned | `403` | `ACCOUNT_BANNED` | `{ "success": false, "code": "ACCOUNT_BANNED", "message": "Your account has been suspended." }` |
| ❌ Missing fields | `422` | validation | `{ "errors": { "email": [...], "password": [...] } }` |

---

### 2.5 Forgot Password — `POST /auth/forgot-password`

**Headers**:
```
Content-Type: application/json
Accept: application/json
```

**Request Body**:
```json
{
  "email": "john.doe@gmail.com"
}
```

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Always | `200` | `{ "success": true, "message": "If that email is registered, a password reset code has been sent." }` |

---

### 2.6 Reset Password — `POST /auth/reset-password`

**Headers**:
```
Content-Type: application/json
Accept: application/json
```

**Request Body**:
```json
{
  "email": "john.doe@gmail.com",
  "code": "572841",
  "password": "N3w$ecure!Pass99"
}
```

| Outcome | HTTP | Code | Response Body |
|---------|------|------|---------------|
| ✅ Success | `200` | — | `{ "success": true, "message": "Password reset successfully. Please login with your new password." }` |
| ❌ Expired | `422` | `CODE_EXPIRED` | `{ "success": false, "code": "CODE_EXPIRED", "message": "Reset code has expired. Please request a new one." }` |
| ❌ Wrong code | `422` | `CODE_INVALID` | `{ "success": false, "code": "CODE_INVALID", "message": "Incorrect reset code." }` |
| ❌ Max attempts | `429` | `CODE_MAX_ATTEMPTS` | `{ "success": false, "code": "CODE_MAX_ATTEMPTS", "message": "Too many incorrect attempts. Please request a new code." }` |
| ❌ Weak password | `422` | validation | `{ "errors": { "password": [...] } }` |
| ❌ Bad code format | `422` | validation | `{ "errors": { "code": ["Verification code must contain only numbers."] } }` |

**E2E Flow**: `forgot-password` → check email → `reset-password` → `login` with new password.

---

### 2.7 Logout — `POST /auth/logout` 🔒

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
```

**Request Body**: None (empty `{}`).

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Success | `200` | `{ "success": true, "message": "Logged out successfully." }` |
| ❌ No token | `401` | `{ "message": "Unauthenticated." }` |

---

### 2.8 Get Current User — `GET /auth/me` 🔒

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Request Body**: None.

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Applicant | `200` | `{ "success": true, "data": { "id": "uuid", "email": "...", "role": "applicant", "applicant_profile": { ... } } }` |
| ✅ HR/Company | `200` | `{ "success": true, "data": { "id": "uuid", "email": "...", "role": "hr", "company_profile": { ... } } }` |
| ❌ No token | `401` | `{ "message": "Unauthenticated." }` |
| ❌ Unverified | `403` | `{ "success": false, "code": "EMAIL_NOT_VERIFIED", "message": "Your email address is not verified." }` |

---

## 3. Google OAuth

### 3.1 Redirect — `GET /auth/google/redirect`

**Headers**: None required.  
**Body**: None.

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Success | `200` | `{ "success": true, "data": { "redirect_url": "https://accounts.google.com/o/oauth2/..." } }` |

### 3.2 Callback — `GET /auth/google/callback`

**Headers**: None.  
**Query Params**: `code` and `state` (set by Google redirect).

| Outcome | HTTP | Code | Response Body |
|---------|------|------|---------------|
| ✅ New user | `200` | — | `{ "data": { "token": "...", "user": {...}, "is_new_user": true }, "message": "Account created via Google. Please complete your profile." }` |
| ✅ Returning | `200` | — | `{ "data": { "token": "...", "user": {...}, "is_new_user": false }, "message": "Logged in with Google." }` |
| ❌ OAuth fail | `422` | `OAUTH_FAILED` | `{ "code": "OAUTH_FAILED", "message": "Google authentication failed. Please try again." }` |
| ❌ HR/Company | `403` | `OAUTH_NOT_PERMITTED` | `{ "code": "OAUTH_NOT_PERMITTED", "message": "Google OAuth is only available for applicant accounts." }` |
| ❌ Banned | `403` | `ACCOUNT_BANNED` | `{ "code": "ACCOUNT_BANNED", "message": "Your account has been suspended." }` |

---

## 4. File Upload

🔒 All endpoints require `Authorization: Bearer {token}`

---

### 4.1 Generate Upload URL — `POST /files/upload-url` 🔒

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
```

**Request Body**:
```json
{
  "file_name": "my-resume.pdf",
  "file_type": "application/pdf",
  "file_size": 204800,
  "upload_type": "document"
}
```

**Alternative (image)**:
```json
{
  "file_name": "profile-photo.jpg",
  "file_type": "image/jpeg",
  "file_size": 512000,
  "upload_type": "image"
}
```

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Success | `200` | `{ "success": true, "message": "Upload URL generated.", "data": { "upload_url": "https://s3.amazonaws.com/...?X-Amz-Signature=...", "file_url": "s3://jobswipe-uploads/users/uuid/documents/my-resume.pdf" } }` |
| ❌ Missing fields | `422` | `{ "errors": { "file_name": ["The file name field is required."], ... } }` |
| ❌ Invalid type | `422` | `{ "errors": { "upload_type": ["The selected upload type is invalid."] } }` |

---

### 4.2 Generate Read URL — `POST /files/read-url` 🔒

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
```

**Request Body**:
```json
{
  "file_url": "s3://jobswipe-uploads/users/uuid/documents/my-resume.pdf"
}
```

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Success | `200` | `{ "success": true, "message": "Read URL generated.", "data": { "read_url": "https://s3.amazonaws.com/...?X-Amz-Signature=..." } }` |
| ❌ Invalid URL | `422` | `{ "errors": { "file_url": ["The file url field must be a valid URL."] } }` |

---

### 4.3 Confirm Upload — `POST /files/confirm-upload` 🔒

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
```

**Request Body**:
```json
{
  "file_url": "s3://jobswipe-uploads/users/uuid/documents/my-resume.pdf"
}
```

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Success | `200` | `{ "success": true, "message": "Upload confirmed.", "data": { "file_url": "s3://...", "confirmed": true } }` |

**E2E Flow**: `upload-url` → PUT file to S3 using the presigned URL → `confirm-upload` → use `file_url` in profile updates.

---

## 5. Notifications

🔒 All endpoints require `Authorization: Bearer {token}`

---

### 5.1 List All — `GET /notifications` 🔒

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Body**: None.

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Success | `200` | `{ "success": true, "data": { "data": [...], "current_page": 1, ... } }` |

---

### 5.2 List Unread — `GET /notifications/unread` 🔒

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Body**: None.

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Success | `200` | `{ "success": true, "data": { "notifications": [...], "unread_count": 3 } }` |

---

### 5.3 Mark As Read — `PATCH /notifications/{id}/read` 🔒

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Body**: None.

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Success | `200` | `{ "success": true, "message": "Notification marked as read" }` |

---

### 5.4 Mark All As Read — `PATCH /notifications/read-all` 🔒

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Body**: None.

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Success | `200` | `{ "success": true, "message": "All notifications marked as read" }` |

---

### 5.5 Get Preferences — `GET /notifications/preferences` 🔒

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Body**: None.

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Success | `200` | `{ "success": true, "data": { "email_enabled": true, "push_enabled": true, "channels": { "match_accepted": { "email": true, "push": true }, ... } } }` |

---

### 5.6 Update Preferences — `PATCH /notifications/preferences` 🔒

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
```

**Request Body**:
```json
{
  "email_enabled": true,
  "push_enabled": false,
  "channels": {
    "match_accepted": { "email": true, "push": true },
    "match_declined": { "email": true, "push": false },
    "match_expired": { "email": false, "push": false }
  }
}
```

| Outcome | HTTP | Response Body |
|---------|------|---------------|
| ✅ Success | `200` | `{ "success": true, "message": "Notification preferences updated" }` |
| ❌ Invalid values | `422` | `{ "errors": { "email_enabled": ["Email enabled must be true or false"] } }` |
