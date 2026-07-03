# JobSwipe Backend — Manual Testing Guide (Part 3 of 3)

> Continues from Part 2. Same base URL and conventions.

---

## 12. Job Postings (HR/Company)

🔒 `auth:sanctum` + `verified` + `role:hr,company_admin`

---

### 12.1 List Jobs — `GET /company/jobs` 🔒

**Headers**:
```
Accept: application/json
Authorization: Bearer {company_token}
```

**Body**: None. **Query**: `?page=1` (paginated at 20).

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Success | `200` | — | Paginated list with skills eager-loaded |
| ❌ No profile | `403` | `NO_COMPANY_PROFILE` | `"No company profile found for this user"` |

---

### 12.2 Create Job — `POST /company/jobs` 🔒

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {company_token}
```

**Request Body**:
```json
{
  "title": "Senior React Developer",
  "description": "We are looking for a Senior React Developer to join our growing team. You will be responsible for building and maintaining complex web applications using React, TypeScript, and modern frontend tooling. Must have 5+ years experience.",
  "work_type": "remote",
  "location": null,
  "location_city": null,
  "location_region": null,
  "salary_min": 80000,
  "salary_max": 120000,
  "salary_is_hidden": false,
  "interview_template": "Hi {{applicant_name}}, we are excited about your application for {{job_title}} at {{company_name}}. Let's schedule a call to discuss the role further.",
  "skills": [
    { "name": "React", "type": "hard" },
    { "name": "TypeScript", "type": "hard" },
    { "name": "Node.js", "type": "hard" },
    { "name": "Communication", "type": "soft" },
    { "name": "Problem Solving", "type": "soft" }
  ]
}
```

**Alternative (hybrid/on_site — location required)**:
```json
{
  "title": "Backend Engineer",
  "description": "Join our backend team to build scalable APIs and microservices. You will work with Laravel, PostgreSQL, and Redis in a fast-paced environment. We value clean code and thorough testing.",
  "work_type": "hybrid",
  "location": "BGC, Taguig, Philippines",
  "location_city": "Taguig",
  "location_region": "Metro Manila",
  "salary_min": 60000,
  "salary_max": 90000,
  "salary_is_hidden": false,
  "interview_template": "Hello {{applicant_name}}, great to see your interest in {{job_title}}!",
  "skills": [
    { "name": "Laravel", "type": "hard" },
    { "name": "PostgreSQL", "type": "hard" }
  ]
}
```

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Created | `201` | — | `{ "message": "Job posting created and published", "data": { "id": "uuid", "status": "active", "published_at": "...", "expires_at": "...", "skills": [...] } }` |
| ❌ No subscription | `402` | `SUBSCRIPTION_REQUIRED` | `"An active subscription is required to post jobs."` |
| ❌ Listing limit (basic, ≥5) | `403` | `LISTING_LIMIT_REACHED` | `"Active listing limit reached for your subscription tier"` |
| ❌ No profile | `403` | `NO_COMPANY_PROFILE` | `"No company profile found for this user"` |
| ❌ Short description | `422` | validation | `"Job description must be at least 100 characters"` |
| ❌ Missing location (hybrid) | `422` | validation | `"Location is required for hybrid and on-site positions."` |
| ❌ salary_max < salary_min | `422` | validation | `"Maximum salary must be greater than or equal to minimum salary."` |

---

### 12.3 Show Job — `GET /company/jobs/{id}` 🔒

**URL**: `GET /company/jobs/550e8400-e29b-41d4-a716-446655440000`
**Body**: None.

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | Job with skills |
| ❌ Not owner | `403` | `UNAUTHORIZED` |
| ❌ Not found | `404` | ModelNotFoundException |

---

### 12.4 Update Job — `PUT /company/jobs/{id}` 🔒

**Request Body** (partial update):
```json
{
  "title": "Senior React Developer (Updated)",
  "salary_max": 130000,
  "skills": [
    { "name": "React", "type": "hard" },
    { "name": "Next.js", "type": "hard" },
    { "name": "Leadership", "type": "soft" }
  ]
}
```

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Updated | `200` | — | `"Job posting updated"` — re-indexed in Meilisearch |
| ❌ Not active | `422` | `INVALID_STATUS` | `"Only active job postings can be edited."` |
| ❌ Not owner | `403` | `UNAUTHORIZED` | — |

---

### 12.5 Delete Job — `DELETE /company/jobs/{id}` 🔒

**Body**: None.

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Deleted | `200` | — | `"Job posting deleted"` |
| ❌ Still active | `422` | `INVALID_STATUS` | `"Cannot delete an active job posting. Close it first."` |
| ❌ Not owner | `403` | `UNAUTHORIZED` | — |

---

### 12.6 Close Job — `POST /company/jobs/{id}/close` 🔒

**Body**: None (empty `{}`).

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Closed | `200` | — | `"Job posting closed"` — removed from search, listing count decremented |
| ❌ Not active | `422` | `INVALID_STATUS` | `"Only active job postings can be closed"` |
| ❌ Not owner | `403` | `UNAUTHORIZED` | — |

---

## 13. Applicant Swipe

🔒 `auth:sanctum` + `verified` + `role:applicant`

---

### 13.1 Get Deck — `GET /applicant/swipe/deck` 🔒

**Query**: `?per_page=20&cursor=eyJpZCI6MTB9`
**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "data": [{ "id": "job-uuid", "title": "...", "company": {...}, "skills": [...], ... }] }` |

---

### 13.2 Get Limits — `GET /applicant/swipe/limits` 🔒

**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "data": { "daily_swipes_used": 5, "daily_swipe_limit": 20, "extra_swipe_balance": 10, "has_swipes_remaining": true, "swipe_reset_at": "2026-04-08T00:00:00Z" } }` |
| ❌ No profile | `404` | `PROFILE_NOT_FOUND` |

---

### 13.3 Swipe Right (Apply) — `POST /applicant/swipe/right/{jobId}` 🔒

**URL**: `POST /applicant/swipe/right/550e8400-e29b-41d4-a716-446655440000`
**Body**: None (empty `{}`).

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Applied | `200` | — | `{ "message": "Application submitted successfully" }` |
| ❌ Limit reached | `429` | `SWIPE_LIMIT_REACHED` | `"Daily swipe limit reached. Upgrade or purchase swipe packs."` |
| ❌ Already swiped | `409` | `ALREADY_SWIPED` | `"You have already swiped on this job"` |
| ❌ Server error | `500` | `SWIPE_FAILED` | `"Failed to process swipe"` |

---

### 13.4 Swipe Left (Dismiss) — `POST /applicant/swipe/left/{jobId}` 🔒

**URL**: `POST /applicant/swipe/left/550e8400-e29b-41d4-a716-446655440000`
**Body**: None (empty `{}`).

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Dismissed | `200` | `"Job dismissed"` |
| ❌ Limit reached | `429` | `SWIPE_LIMIT_REACHED` |
| ❌ Already swiped | `409` | `ALREADY_SWIPED` |

---

## 14. Applicant Applications

🔒 `auth:sanctum` + `verified` + `role:applicant`

### 14.1 List — `GET /applicant/applications` 🔒

**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "message": "Applications retrieved.", "data": [{ "id": "...", "job_posting_id": "...", "status": "pending", "created_at": "..." }] }` |

### 14.2 Show — `GET /applicant/applications/{id}` 🔒

**URL**: `GET /applicant/applications/app-uuid-here`
**Body**: None.

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Success | `200` | — | Application with `jobPosting.company` and `matchRecord` loaded |
| ❌ Not owner | `403` | `FORBIDDEN` | `"You do not own this application."` |
| ❌ Not found | `404` | ModelNotFound | — |

---

## 15. HR Applicant Review

🔒 `auth:sanctum` + `verified` + `role:hr,company_admin`

---

### 15.1 List Applicants — `GET /company/jobs/{jobId}/applicants` 🔒

**URL**: `GET /company/jobs/job-uuid/applicants?page=1`
**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | Paginated applicants with `profile_data`, `skill_match_percentage` |
| ❌ Not owner | `403` | abort |

---

### 15.2 Applicant Detail — `GET /company/jobs/{jobId}/applicants/{applicantId}` 🔒

**Body**: None.

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | Full detail with skill match |
| ❌ Incomplete profile | `400` | `INCOMPLETE_PROFILE` |
| ❌ Not found | `404` | ModelNotFound |

---

### 15.3 HR Swipe Right (Match) — `POST /company/jobs/{jobId}/applicants/{applicantId}/right` 🔒

**Request Body**:
```json
{
  "message": "Hi {{applicant_name}}, we were impressed by your profile and would love to discuss the {{job_title}} position at {{company_name}}. Are you available for a chat this week?"
}
```

**Alternative (custom message)**:
```json
{
  "message": "Hello! Your React and TypeScript skills are exactly what we need. I'd like to schedule a technical discussion at your earliest convenience."
}
```

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Matched | `200` | — | `{ "message": "Match created. Applicant can now respond within 24 hours." }` |
| ✅ Invited | `200` | — | `{ "message": "Interview invitation sent" }` |
| ❌ Already swiped | `409` | `ALREADY_SWIPED` | `"Already swiped on this applicant"` |
| ❌ No application | `404` | `APPLICATION_NOT_FOUND` | `"Applicant has no active application for this job"` |
| ❌ Message too short | `422` | validation | `message` must be min 10 chars |
| ❌ Not owner | `403` | abort | — |

> [!IMPORTANT]
> This creates a MatchRecord with `status: pending` and a 24-hour `response_deadline`. The initial message becomes the first chat message. A push notification is dispatched to the applicant.

---

### 15.4 HR Swipe Left — `POST /company/jobs/{jobId}/applicants/{applicantId}/left` 🔒

**Body**: None (empty `{}`).

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Dismissed | `200` | `"Applicant dismissed"` |
| ❌ Already swiped | `409` | `ALREADY_SWIPED` |

---

## 16. Match System — Applicant

🔒 `auth:sanctum` + `verified` + `role:applicant`

---

### 16.1 List Matches — `GET /applicant/matches` 🔒

**Query**: `?status=pending&per_page=20`
**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | Paginated matches (stale pending matches auto-expired) |

---

### 16.2 Match Detail — `GET /applicant/matches/{id}` 🔒

**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "data": { "match": {...}, "time_remaining": "23h 15m", "seconds_remaining": 83700, "is_chat_active": false } }` |
| ❌ Not participant | `403` | AccessDenied |

---

### 16.3 Accept Match — `POST /applicant/matches/{id}/accept` 🔒

**Body**: None (empty `{}`).

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Accepted | `200` | — | `{ "message": "Match accepted! You can now start chatting.", "data": { "status": "accepted", ... } }` |
| ✅ Already accepted | `200` | — | Idempotent — returns same success |
| ❌ Deadline passed | `409` | `MATCH_RESPONSE_DEADLINE_PASSED` | `"Match response deadline has passed."` |
| ❌ Already declined | `409` | `MATCH_ALREADY_DECLINED` | `"Match was already declined."` |
| ❌ Not applicant | `403` | `NOT_MATCH_APPLICANT` | `"You are not the applicant for this match."` |

---

### 16.4 Decline Match — `POST /applicant/matches/{id}/decline` 🔒

**Body**: None (empty `{}`).

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Declined | `200` | — | `{ "message": "Match declined.", "data": { "status": "declined" } }` |
| ✅ Already declined | `200` | — | Idempotent |
| ❌ Deadline passed | `409` | `MATCH_RESPONSE_DEADLINE_PASSED` | — |
| ❌ Already accepted | `409` | `MATCH_ALREADY_ACCEPTED` | — |
| ❌ Not applicant | `403` | `NOT_MATCH_APPLICANT` | — |

---

## 17. Match System — Company

🔒 `auth:sanctum` + `verified` + `role:hr,company_admin`

### 17.1 List Matches — `GET /company/matches` 🔒

**Query**: `?job_posting_id=uuid&status=accepted&per_page=20`
**Body**: None.

### 17.2 Match Detail — `GET /company/matches/{id}` 🔒

**Body**: None. Same response as applicant side.

### 17.3 Close Match — `POST /company/matches/{id}/close` 🔒

**Body**: None (empty `{}`).

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Closed | `200` | — | `{ "message": "Match chat closed. Message history is still viewable." }` |
| ❌ Not accepted | `409` | Conflict | `"Only accepted matches can be closed."` |
| ❌ Not HR user | `403` | AccessDenied | — |

---

## 18. Match Messaging

🔒 `auth:sanctum` + `verified` — both applicant and HR

---

### 18.1 List Messages — `GET /matches/{matchId}/messages` 🔒

**Query**: `?per_page=50`
**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | Paginated messages |
| ❌ Not participant | `403` | abort |

---

### 18.2 Send Message — `POST /matches/{matchId}/messages` 🔒

**Request Body**:
```json
{
  "body": "Hi! Thanks for reaching out. I'm very interested in this position. When would be a good time for a call?",
  "client_message_id": "550e8400-e29b-41d4-a716-446655440099"
}
```

**Alternative (without dedup key)**:
```json
{
  "body": "Looking forward to discussing the role further!"
}
```

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Sent (new) | `201` | — | `{ "message": "Message sent.", "data": { "id": "...", "body": "...", "sender_id": "...", "created_at": "..." }, "meta": { "match_status": "accepted", "accepted_now": true } }` |
| ✅ Duplicate | `200` | — | Returns existing message (idempotent via `client_message_id`) |
| ❌ Not participant | `403` | `NOT_MATCH_PARTICIPANT` | — |
| ❌ Deadline passed | `409` | `MATCH_RESPONSE_DEADLINE_PASSED` | — |
| ❌ Chat not active | `422` | `CHAT_NOT_ACTIVE` | `"This match chat is not active."` |
| ❌ Too long | `422` | validation | `"Message body cannot exceed 2000 characters."` |
| ❌ Bad UUID | `422` | validation | `"Client message ID must be a valid UUID."` |

> [!IMPORTANT]
> **Auto-accept**: When the applicant sends their first message on a `pending` match before deadline, `accepted_now: true` is returned and match status becomes `accepted`. This is the "reply = accept" pattern.

---

### 18.3 Typing Indicator — `POST /matches/{matchId}/messages/typing` 🔒

**Body**: None (empty `{}`).

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "message": "Typing indicator sent." }` — broadcasts WebSocket event |

---

### 18.4 Mark As Read — `PATCH /matches/{matchId}/messages/read` 🔒

**Body**: None (empty `{}`).

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "data": { "marked_read": 5 }, "message": "5 messages marked as read." }` — broadcasts WebSocket read receipt |

---

## 19. Company Reviews

### 19.1 Submit Review — `POST /reviews` 🔒 (`role:applicant`)

**Request Body**:
```json
{
  "company_id": "550e8400-e29b-41d4-a716-446655440010",
  "job_posting_id": "550e8400-e29b-41d4-a716-446655440011",
  "rating": 4,
  "review_text": "Great company culture with supportive management. The interview process was smooth and professional. Would recommend to other developers."
}
```

| Outcome | HTTP | Code | Response |
|---------|------|------|----------|
| ✅ Created | `201` | — | `{ "message": "Review submitted successfully.", "data": { "id": "...", "rating": 4, "applicant_name": "John D.", ... } }` |
| ❌ Not allowed | `403` | `REVIEW_NOT_ALLOWED` | Must have interacted with company |
| ❌ Duplicate | `409` | `REVIEW_ALREADY_EXISTS` | One review per company per applicant |
| ❌ Company not found | `422` | validation | `"Company not found."` |
| ❌ Bad rating | `422` | validation | `"Rating must be between 1 and 5."` |
| ❌ No profile | `404` | `PROFILE_NOT_FOUND` | — |

---

### 19.2 Get Company Reviews — `GET /reviews/company/{companyId}` 🔒

**URL**: `GET /reviews/company/550e8400-e29b-41d4-a716-446655440010`
**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | `{ "message": "Reviews retrieved successfully.", "data": { "reviews": [...], "average_rating": 4.2, ... } }` |

---

### 19.3 Flag Review — `POST /reviews/{id}/flag` 🔒

**URL**: `POST /reviews/review-uuid/flag`
**Body**: None (empty `{}`).

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Flagged | `200` | `"Review flagged successfully."` |
| ❌ Not found | `404` | `REVIEW_NOT_FOUND` |

---

## 20. Admin Review Moderation

🔒 `auth:sanctum` + `verified` + `role:moderator,super_admin`

### 20.1 Get Flagged — `GET /admin/reviews/flagged` 🔒

**Query**: `?per_page=20`
**Body**: None.

| Outcome | HTTP | Response |
|---------|------|----------|
| ✅ Success | `200` | Paginated flagged reviews |

### 20.2 Unflag — `POST /admin/reviews/{id}/unflag` 🔒

**Body**: None (empty `{}`).

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Success | `200` | `"Review unflagged successfully."` |
| ❌ Not found | `404` | `REVIEW_NOT_FOUND` |

### 20.3 Remove — `DELETE /admin/reviews/{id}` 🔒

**Body**: None.

| Outcome | HTTP | Code |
|---------|------|------|
| ✅ Removed | `200` | `"Review removed successfully."` — records moderator_id |
| ❌ Not found | `404` | `REVIEW_NOT_FOUND` |

---

## 21. Full E2E Flow Scenarios

### Scenario A: Applicant → Swipe → Match → Chat

| Step | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 1 | POST | `/auth/register` | Register as applicant |
| 2 | POST | `/auth/verify-email` | Verify & get token |
| 3 | GET | `/auth/me` | Load user state |
| 4 | POST | `/profile/onboarding/complete-step` | Steps 1–4 |
| 5 | POST | `/files/upload-url` | Get presigned URL |
| 6 | — | PUT to S3 | Upload resume |
| 7 | POST | `/files/confirm-upload` | Confirm upload |
| 8 | PATCH | `/profile/applicant/resume` | Set resume URL |
| 9 | PATCH | `/profile/applicant/skills` | Add skills |
| 10 | GET | `/profile/completion` | Verify 100% |
| 11 | GET | `/applicant/swipe/limits` | Check swipes |
| 12 | GET | `/applicant/swipe/deck` | Get job cards |
| 13 | POST | `/applicant/swipe/right/{jobId}` | Apply |
| 14 | GET | `/applicant/applications` | Verify application |
| 15 | — | *Wait for HR swipe right* | Match created |
| 16 | GET | `/applicant/matches` | See pending match |
| 17 | POST | `/matches/{matchId}/messages` | Reply (auto-accepts) |
| 18 | GET | `/matches/{matchId}/messages` | Read history |
| 19 | POST | `/reviews` | Review the company |

### Scenario B: Company → Post Job → Match → Chat → Close

| Step | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 1 | POST | `/auth/register` | Register as company_admin |
| 2 | POST | `/auth/verify-email` | Verify & get token |
| 3 | PATCH | `/profile/company/details` | Fill company info |
| 4 | POST | `/profile/company/verification` | Upload docs |
| 5 | POST | `/subscriptions/checkout` | Get Stripe URL |
| 6 | — | *Complete Stripe payment* | Webhook fires |
| 7 | GET | `/subscriptions/status` | Verify active |
| 8 | POST | `/company/jobs` | Create posting |
| 9 | — | *Wait for applicant swipes* | Applications arrive |
| 10 | GET | `/company/jobs/{id}/applicants` | Review applicants |
| 11 | POST | `/company/jobs/{id}/applicants/{id}/right` | Create match |
| 12 | GET | `/company/matches` | See matches |
| 13 | — | *Applicant accepts/replies* | Chat opens |
| 14 | POST | `/matches/{matchId}/messages` | Chat |
| 15 | POST | `/company/matches/{id}/close` | Close chat |
| 16 | POST | `/company/jobs/{id}/close` | Close posting |

### Scenario C: Match Timeout

| Step | Event | Expected |
|------|-------|----------|
| 1 | HR swipes right | Match created, `status: pending`, `response_deadline: +24h` |
| 2 | 24 hours pass | Scheduler expires match |
| 3 | Applicant tries accept | `409 MATCH_RESPONSE_DEADLINE_PASSED` |
| 4 | Both get notification | `match_expired` notification |

### Scenario D: Password Recovery

| Step | Method | Endpoint |
|------|--------|----------|
| 1 | POST | `/auth/forgot-password` |
| 2 | — | Check email for 6-digit code |
| 3 | POST | `/auth/reset-password` |
| 4 | POST | `/auth/login` (new password) |

### Scenario E: Review Moderation

| Step | Method | Endpoint | Actor |
|------|--------|----------|-------|
| 1 | POST | `/reviews` | Applicant submits review |
| 2 | POST | `/reviews/{id}/flag` | Another user flags it |
| 3 | GET | `/admin/reviews/flagged` | Moderator sees it |
| 4 | DELETE | `/admin/reviews/{id}` | Moderator removes it |

---

## 22. Cross-Cutting Test Checklist

| Concern | How to Test |
|---------|-------------|
| **Rate Limiting** | Hit any endpoint rapidly — expect `429 Too Many Requests` |
| **Wrong Role** | Use applicant token on `/company/*` → `403 UNAUTHORIZED` |
| **Unverified Email** | Register but skip verify, call `/auth/me` → `403 EMAIL_NOT_VERIFIED` |
| **Expired Token** | Use an old/revoked token → `401 Unauthenticated` |
| **Missing Token** | Call any 🔒 endpoint without `Authorization` header → `401` |
| **Invalid UUID** | Pass `abc123` as an ID → `404` or `422` |
| **Empty Body** | POST to endpoints expecting body with `{}` → `422` validation errors |
| **Idempotency** | Accept match twice → same `200`; send message with same `client_message_id` → same response |
| **Concurrency** | Two simultaneous job creates when at listing limit → only one succeeds |
| **WebSocket Events** | After sending message, verify `MatchMessageSent` event fires; after read, verify `MatchReadReceipt` |
| **File URL Signing** | Profile GET responses should return signed URLs, not raw S3 paths |
| **XSS Prevention** | Submit `<script>alert(1)</script>` in `review_text` → HTML tags stripped |
