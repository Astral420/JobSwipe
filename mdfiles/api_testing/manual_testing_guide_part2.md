# JobSwipe Backend — Manual Testing Guide (Part 2 of 3)

> Continues from Part 1. Same base URL and conventions.

---

## 6. Profile — Applicant

🔒 `auth:sanctum` + `verified` + `role:applicant`

---

### 6.1 Get Profile — `GET /profile/applicant` 🔒

**Headers**:
```
Accept: application/json
Authorization: Bearer {applicant_token}
```

**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | Full profile object with signed file URLs for `resume_url`, `profile_photo_url`, etc. |

---

### 6.2 Update Basic Info — `PATCH /profile/applicant/basic-info` 🔒

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {applicant_token}
```

**Request Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+639171234567",
  "location": "Manila, Philippines",
  "headline": "Senior Full-Stack Developer",
  "bio": "Passionate developer with 5 years of experience building scalable web applications.",
  "date_of_birth": "1995-06-15",
  "gender": "male"
}
```

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "success": true, "message": "Applicant basic info updated.", "data": { ...updated profile } }` |
| ❌ Validation | `422` | Field-specific errors |
| ❌ Wrong role | `403` | `{ "code": "UNAUTHORIZED", "message": "You are not allowed to access this resource." }` |

---

### 6.3 Update Skills — `PATCH /profile/applicant/skills` 🔒

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {applicant_token}
```

**Request Body**:
```json
{
  "skills": [
    { "name": "React", "proficiency": "advanced" },
    { "name": "Node.js", "proficiency": "advanced" },
    { "name": "TypeScript", "proficiency": "intermediate" },
    { "name": "PostgreSQL", "proficiency": "intermediate" },
    { "name": "Communication", "proficiency": "advanced" }
  ]
}
```

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "success": true, "message": "Applicant skills updated.", "data": { ... } }` |

---

### 6.4 Add Work Experience — `POST /profile/applicant/experience` 🔒

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {applicant_token}
```

**Request Body**:
```json
{
  "company": "Tech Corp Inc.",
  "position": "Senior Developer",
  "start_date": "2022-01",
  "end_date": null,
  "is_current": true,
  "description": "Led a team of 5 developers building a SaaS platform using React and Node.js."
}
```

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "success": true, "message": "Work experience added.", "data": { ... } }` |
| ❌ Missing required | `422` | `{ "errors": { "company": ["The company field is required."], ... } }` |

---

### 6.5 Update Work Experience — `PATCH /profile/applicant/experience/{index}` 🔒

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {applicant_token}
```

**URL**: `PATCH /profile/applicant/experience/0` (0-indexed)

**Request Body**:
```json
{
  "position": "Lead Developer",
  "description": "Promoted to lead. Now managing 10 engineers."
}
```

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Success | `200` | — | `{ "message": "Work experience updated." }` |
| ❌ Invalid index | `404` | `WORK_EXPERIENCE_NOT_FOUND` | `{ "code": "WORK_EXPERIENCE_NOT_FOUND", "message": "Work experience not found." }` |

---

### 6.6 Remove Work Experience — `DELETE /profile/applicant/experience/{index}` 🔒

**Headers**:
```
Accept: application/json
Authorization: Bearer {applicant_token}
```

**URL**: `DELETE /profile/applicant/experience/0`
**Body**: None.

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | `"Work experience removed."` |
| ❌ Invalid index | `404` | `WORK_EXPERIENCE_NOT_FOUND` |

---

### 6.7 Add Education — `POST /profile/applicant/education` 🔒

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {applicant_token}
```

**Request Body**:
```json
{
  "institution": "University of the Philippines",
  "degree": "Bachelor of Science",
  "field": "Computer Science",
  "graduation_year": 2020
}
```

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "message": "Education added." }` |
| ❌ Future year | `422` | `{ "errors": { "graduation_year": ["The graduation year field must not be greater than 2026."] } }` |

---

### 6.8 Update Education — `PATCH /profile/applicant/education/{index}` 🔒

**URL**: `PATCH /profile/applicant/education/0`

**Request Body**:
```json
{
  "degree": "Master of Science",
  "graduation_year": 2022
}
```

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | `"Education updated."` |
| ❌ Invalid index | `404` | `EDUCATION_NOT_FOUND` |

---

### 6.9 Remove Education — `DELETE /profile/applicant/education/{index}` 🔒

**URL**: `DELETE /profile/applicant/education/0`
**Body**: None.

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | `"Education removed."` |
| ❌ Invalid index | `404` | `EDUCATION_NOT_FOUND` |

---

### 6.10 Update Resume — `PATCH /profile/applicant/resume` 🔒

**Request Body**:
```json
{
  "resume_url": "s3://jobswipe-uploads/users/uuid/documents/my-resume.pdf"
}
```

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | `"Resume updated."` |
| ❌ Invalid URL | `400` | `INVALID_URL` |
| ❌ Missing | `422` | Validation error |

---

### 6.11 Update Cover Letter — `PATCH /profile/applicant/cover-letter` 🔒

**Request Body**:
```json
{
  "cover_letter_url": "s3://jobswipe-uploads/users/uuid/documents/cover-letter.pdf"
}
```

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | `"Cover letter updated."` |
| ❌ Invalid URL | `400` | `INVALID_URL` |

---

### 6.12 Update Photo — `PATCH /profile/applicant/photo` 🔒

**Request Body**:
```json
{
  "profile_photo_url": "s3://jobswipe-uploads/users/uuid/images/headshot.jpg"
}
```

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | `"Profile photo updated."` |
| ❌ Invalid URL | `400` | `INVALID_URL` |

---

### 6.13 Update Social Links — `PATCH /profile/applicant/social-links` 🔒

**Request Body**:
```json
{
  "social_links": {
    "linkedin": "https://linkedin.com/in/johndoe",
    "github": "https://github.com/johndoe",
    "portfolio": "https://johndoe.dev",
    "twitter": "https://twitter.com/johndoe"
  }
}
```

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "message": "Social links updated." }` |
| ❌ Invalid data | `400` | Domain-specific error |

---

## 7. Profile — Company

🔒 `auth:sanctum` + `verified` + `role:hr,company_admin`

---

### 7.1 Get Profile — `GET /profile/company` 🔒

**Headers**:
```
Accept: application/json
Authorization: Bearer {company_token}
```

**Body**: None.

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | Company profile with signed URLs |
| ❌ No profile | `404` | `COMPANY_PROFILE_NOT_FOUND` |

---

### 7.2 Update Details — `PATCH /profile/company/details` 🔒

**Request Body**:
```json
{
  "company_name": "TechCorp Inc.",
  "industry": "Technology",
  "company_size": "51-200",
  "website": "https://techcorp.com",
  "description": "Leading technology company specializing in SaaS solutions for enterprise clients worldwide.",
  "founded_year": 2015,
  "headquarters": "Manila, Philippines"
}
```

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | `"Company details updated."` |
| ❌ No profile | `404` | `COMPANY_PROFILE_NOT_FOUND` |

---

### 7.3 Update Logo — `PATCH /profile/company/logo` 🔒

**Request Body**:
```json
{
  "logo_url": "s3://jobswipe-uploads/companies/uuid/logo.png"
}
```

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | `"Company logo updated."` |
| ❌ Invalid URL | `400` | `INVALID_URL` |

---

### 7.4 Add Office Image — `POST /profile/company/office-images` 🔒

**Request Body**:
```json
{
  "image_url": "s3://jobswipe-uploads/companies/uuid/office-1.jpg"
}
```

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | `"Office image added."` |
| ❌ Max exceeded | `409` | `MAX_IMAGES_EXCEEDED` |

---

### 7.5 Remove Office Image — `DELETE /profile/company/office-images/{index}` 🔒

**URL**: `DELETE /profile/company/office-images/2`
**Body**: None.

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | `"Office image removed."` |
| ❌ Invalid index | `404` | `OFFICE_IMAGE_NOT_FOUND` |

---

### 7.6 Submit Verification — `POST /profile/company/verification` 🔒 (`role:company_admin` only)

**Request Body**:
```json
{
  "verification_documents": [
    "s3://jobswipe-uploads/companies/uuid/docs/business-permit.pdf",
    "s3://jobswipe-uploads/companies/uuid/docs/sec-registration.pdf"
  ]
}
```

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | `"Verification documents submitted."` |
| ❌ Empty array | `422` | `{ "errors": { "verification_documents": ["...min:1"] } }` |
| ❌ HR (not admin) | `403` | `UNAUTHORIZED` |

---

## 8. Onboarding & Completion

🔒 `auth:sanctum` + `verified` (any role)

---

### 8.1 Get Status — `GET /profile/onboarding/status` 🔒

**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "data": { "current_step": 2, "total_steps": 4, "steps": [...], "is_complete": false } }` |

---

### 8.2 Complete Step — `POST /profile/onboarding/complete-step` 🔒

**Request Body**:
```json
{
  "step": 1,
  "step_data": {
    "first_name": "John",
    "last_name": "Doe",
    "location": "Manila, Philippines"
  }
}
```

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | `"Onboarding step completed."` |
| ❌ Invalid step | `400` | `INVALID_ONBOARDING_STEP` |
| ❌ Bad data | `400` | `STEP_DATA_INVALID` |

---

### 8.3 Profile Completion — `GET /profile/completion` 🔒

**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "data": { "profile_completion_percentage": 75 } }` |

---

## 9. Subscriptions (Stripe — HR/Company)

---

### 9.1 Checkout — `POST /subscriptions/checkout` 🔒 (`role:hr,company_admin`)

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {company_token}
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

**Request Body**:
```json
{
  "success_url": "https://app.jobswipe.com/subscription/success",
  "cancel_url": "https://app.jobswipe.com/subscription/cancel"
}
```

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Success | `200` | — | `{ "message": "Checkout session created.", "data": { "checkout_url": "https://checkout.stripe.com/..." } }` |
| ❌ Bad idempotency key | `422` | `INVALID_IDEMPOTENCY_KEY` | Key exceeds 255 chars |
| ❌ Applicant tries | `403` | `UNAUTHORIZED` | Wrong role |

---

### 9.2 Status — `GET /subscriptions/status` 🔒 (`role:hr,company_admin`)

**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "data": { "is_active": true, "tier": "premium", "provider": "stripe", "expires_at": "2026-05-08...", ... } }` |

---

### 9.3 Cancel — `POST /subscriptions/cancel` 🔒 (`role:company_admin` only)

**Body**: None (empty `{}`).

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "message": "Subscription cancelled." }` |
| ❌ HR tries | `403` | Only `company_admin` can cancel |

---

## 10. In-App Purchase (Applicant)

---

### 10.1 Purchase — `POST /iap/purchase` 🔒 (`role:applicant`)

**Request Body (Apple)**:
```json
{
  "payment_provider": "apple_iap",
  "product_id": "com.jobswipe.premium_monthly",
  "receipt_data": {
    "receipt": "MIIbngYJKoZIhvcNAQcCoIIbj...",
    "transaction_id": "1000000123456789"
  },
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Request Body (Google)**:
```json
{
  "payment_provider": "google_play",
  "product_id": "com.jobswipe.swipe_pack_50",
  "receipt_data": {
    "purchase_token": "opaque-token-string",
    "subscription_id": "com.jobswipe.premium_monthly"
  },
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440002"
}
```

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "message": "Purchase processed successfully", "data": { "purchase_id": "...", "product_id": "...", "status": "active" } }` |
| ❌ Invalid provider | `422` | `{ "errors": { "payment_provider": ["The selected payment provider is invalid."] } }` |
| ❌ IAP error | varies | IAPException rendered with specific code |

---

### 10.2 Subscription Status — `GET /applicant/subscription/status` 🔒 (`role:applicant`)

**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "data": { "is_premium": true, "tier": "premium", "daily_swipe_limit": 100, "expires_at": "..." } }` |

---

### 10.3 Purchase History — `GET /applicant/purchases` 🔒 (`role:applicant`)

**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "data": [{ "id": "...", "product_id": "...", "provider": "apple_iap", "status": "active", "purchased_at": "..." }] }` |

---

### 10.4 Cancel Subscription — `POST /applicant/subscription/cancel` 🔒 (`role:applicant`)

**Body**: None (empty `{}`).

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "message": "Subscription cancelled successfully" }` |

---

## 11. Webhooks (Server-to-Server)

---

### 11.1 Stripe — `POST /webhooks/stripe`

**Headers**:
```
Content-Type: application/json
Stripe-Signature: t=1618884000,v1=abc123...
```

**Request Body** (sent by Stripe):
```json
{
  "id": "evt_1234567890",
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_abc123",
      "status": "active",
      "customer": "cus_xyz789",
      "current_period_end": 1621476000
    }
  }
}
```

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Valid | `200` | `"Webhook processed."` |
| ❌ No secret configured | `500` | `WEBHOOK_NOT_CONFIGURED` |
| ❌ Bad signature | `400` | `WEBHOOK_VERIFICATION_FAILED` |

---

### 11.2 Apple IAP — `POST /webhooks/apple-iap`

**Headers**:
```
Content-Type: application/json
```

**Request Body** (sent by Apple):
```json
{
  "signedPayload": "eyJhbGciOiJFUzI1NiIsIng1YyI6WyJNSUlF..."
}
```

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Valid | `200` | `"Webhook received"` |
| ❌ Verification fail | varies | IAPException error code |
| ❌ Processing fail | `200` | `WEBHOOK_PROCESSING_FAILED` (200 to prevent Apple retries) |

---

### 11.3 Google Play — `POST /webhooks/google-play`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {google_pubsub_token}
```

**Request Body** (sent by Google Pub/Sub):
```json
{
  "message": {
    "data": "eyJwYWNrYWdlTmFtZSI6ImNvbS5qb2Jzd2lwZS...",
    "messageId": "1234567890",
    "publishTime": "2026-04-08T10:00:00Z"
  },
  "subscription": "projects/jobswipe/subscriptions/play-billing"
}
```

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Valid | `200` | `"Webhook received"` |
| ❌ Verification fail | varies | IAPException error code |
| ❌ Processing fail | `200` | `WEBHOOK_PROCESSING_FAILED` (200 to prevent Google retries) |

> [!TIP]
> For local Stripe testing: `stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe`
