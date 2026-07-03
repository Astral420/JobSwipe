# JobSwipe Mobile ↔ Backend API Integration Audit

> **Scope**: All mobile frontend screens vs `backend/routes/api.php` endpoints.
> **Goal**: Replace every mock constant / hardcoded flow with a real API call.

---

## 0 — Infrastructure Issues (Fix First)

### 0.1 `services/api.ts` — Syntax Error
The interceptor has a **broken parenthesis** on line 13:
```diff
-api.interceptors.request.use((config)) => {
+api.interceptors.request.use((config) => {
     const token = useAuthStore.getState().token;
     if (token) config.headers.Authorization = `Bearer ${token}`;
     return config;
-}
+});
```

### 0.2 Response Envelope Unwrapping
The backend wraps all responses in `{ success, data, message }`. Add a **response interceptor** to auto-unwrap:
```ts
api.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  (err) => Promise.reject(err.response?.data ?? err),
);
```

### 0.3 Auth Store Role Values
`authStore.ts` types `AuthRole = 'applicant' | 'hr'` — the backend also uses `company_admin`. Add it:
```ts
export type AuthRole = 'applicant' | 'hr' | 'company_admin';
```

---

## 1 — Authentication

### Screen: `(auth)/login.tsx`

| Item | Detail |
|---|---|
| **Current state** | `MOCK_AUTH = true` bypasses API. Real path uses raw `fetch`. |
| **Backend endpoint** | `POST /v1/auth/login` (throttle: 5/min) |
| **Revision needed** | Flip `MOCK_AUTH` → `false`; replace `fetch` with `api.post('/auth/login', …)` |

**Request**
```json
{ "email": "string", "password": "string" }
```
**Response**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "user": { "id": 1, "name": "…", "email": "…", "role": "applicant|hr|company_admin" }
  }
}
```

**Post-login**: call `setToken(token, role)` on `authStore`, then route to `(tabs)` or `(company-tabs)` based on `role`.

### Screen: `(auth)/register.tsx`

| Item | Detail |
|---|---|
| **Current state** | Multi-step state machine with `MOCK_APPLICANT_OTP`, `MOCK_HR_INVITE_CODES`. Uses raw `fetch`. |
| **Backend endpoints** | `POST /v1/auth/register`, `POST /v1/auth/verify-email`, `POST /v1/auth/resend-verification`, `POST /v1/company/invites/validate` |
| **Revision needed** | Replace mock OTP map → real `verify-email` call. Replace `MOCK_HR_INVITE_CODES` → real `invites/validate`. Migrate all `fetch` → `api.post(…)`. |

**Register Request**
```json
{
  "name": "string", "email": "string", "password": "string",
  "password_confirmation": "string", "role": "applicant|hr",
  "invite_code": "string|null"
}
```
**Register Response** → `{ success, data: { token, user } }`

**Verify Email Request** → `{ "email": "string", "code": "string" }`

**Validate Invite Request** → `{ "code": "string" }`
**Validate Invite Response** → `{ success, data: { company_name, role, valid: true } }`

### Sign Out (both profile screens)

| Endpoint | `POST /v1/auth/logout` |
|---|---|
| **Current state** | Calls `clearToken()` locally — works but doesn't invalidate server token. |
| **Revision** | Call `api.post('/auth/logout')` **before** `clearToken()`. |

### Google OAuth

| Endpoint | `GET /v1/auth/google/redirect` → `GET /v1/auth/google/callback` |
|---|---|
| **Current state** | Login screen has Google button, no wiring. |
| **Revision** | Open WebBrowser to redirect URL, intercept callback deep-link, extract token. |

---

## 2 — Applicant Swipe Deck

### Screen: `(tabs)/index.tsx` (HomeTab)

| Item | Detail |
|---|---|
| **Current state** | Static `JOBS` array (6 items) with hardcoded images, tags, reviews. |
| **Backend endpoints** | `GET /v1/applicant/swipe/deck`, `GET /v1/applicant/swipe/limits`, `POST /v1/applicant/swipe/right/{jobId}`, `POST /v1/applicant/swipe/left/{jobId}` |
| **Revision needed** | Replace `JOBS` → fetch from `deck` endpoint. Replace local `swipesUsed` counter → sync with `limits` endpoint. Call `swipe/right` or `swipe/left` on each swipe. |

**GET deck Response**
```json
{
  "data": [
    {
      "id": 1, "company": { "name": "…", "logo_url": "…", "abbr": "TF" },
      "role": "…", "salary_range": "…", "location": "…",
      "tags": [{ "label": "Remote", "variant": "remote" }],
      "match_percent": 92, "distance_km": 3.9,
      "about_role": "…", "requirements": "…",
      "company_photos": ["url1", "url2"],
      "reviews": [{ "name": "…", "rating": 4, "text": "…" }]
    }
  ]
}
```

**GET limits Response**
```json
{ "data": { "used": 5, "limit": 15, "resets_at": "ISO-8601" } }
```

**POST swipe/right/{jobId}** → `{ "data": { "match": true|false, "match_id": "…|null" } }`

### Screen: `jobs/[id].tsx` (Job Detail)

| Item | Detail |
|---|---|
| **Current state** | Duplicate `JOBS` array, `require()` images. |
| **Revision** | Receive job data via route params or fetch `GET /v1/applicant/swipe/deck` cached data. The "Quick Apply" button should call `POST /v1/applicant/swipe/right/{jobId}`. |

---

## 3 — Applicant Profile

### Screen: `(tabs)/profile.tsx`

| Item | Detail |
|---|---|
| **Current state** | All data hardcoded: `'John Doe'`, `HARD_SKILLS`, `SOFT_SKILLS`, `INITIAL_EXPERIENCE`, `INITIAL_EDUCATION`, `INITIAL_PREFS`. Stats (`12`, `4`, `1`) are static. |
| **Backend endpoints** | See table below |

| Feature | Endpoint | Method |
|---|---|---|
| Load profile | `GET /v1/profile/applicant` | GET |
| Update name/headline/location | `PATCH /v1/profile/applicant/basic-info` | PATCH |
| Update skills | `PATCH /v1/profile/applicant/skills` | PATCH |
| Add experience | `POST /v1/profile/applicant/experience` | POST |
| Remove experience | `DELETE /v1/profile/applicant/experience/{index}` | DELETE |
| Add education | `POST /v1/profile/applicant/education` | POST |
| Remove education | `DELETE /v1/profile/applicant/education/{index}` | DELETE |
| Update photo/avatar | `PATCH /v1/profile/applicant/photo` | PATCH |
| Upload file | `POST /v1/files/upload-url` → `POST /v1/files/confirm-upload` | POST |
| Profile completion | `GET /v1/profile/completion` | GET |

**GET profile Response (key fields)**
```json
{
  "data": {
    "name": "…", "headline": "…", "location": "…", "about": "…",
    "avatar_url": "…", "cover_url": "…",
    "hard_skills": ["React", "…"], "soft_skills": ["Leadership", "…"],
    "experience": [{ "role": "…", "company": "…", "period": "…" }],
    "education": [{ "degree": "…", "school": "…", "period": "…" }],
    "preferences": [{ "label": "Remote", "enabled": true }],
    "stats": { "applied": 12, "pending_messages": 4, "closed_messages": 1 },
    "photos": ["url1", "url2", "url3"]
  }
}
```

**PATCH basic-info Request** → `{ "name": "…", "headline": "…", "location": "…", "about": "…" }`

**Save flow**: The "Edit → Save" toggle should `PATCH` relevant endpoints, not just update local state.

---

## 4 — Applicant Matches & Messaging

### Screen: `(tabs)/matches.tsx`

| Item | Detail |
|---|---|
| **Current state** | `MATCH_COMPANIES` (3 items), `INITIAL_CONVERSATIONS` (2 items), `INITIAL_MESSAGES`, `AUTO_REPLIES` — all hardcoded. Chat uses local auto-reply simulation. |
| **Backend endpoints** | See table below |

| Feature | Endpoint | Method |
|---|---|---|
| List matches | `GET /v1/applicant/matches` | GET |
| Accept match (first message) | `POST /v1/applicant/matches/{id}/accept` | POST |
| Decline match | `POST /v1/applicant/matches/{id}/decline` | POST |
| List messages | `GET /v1/matches/{matchId}/messages` | GET |
| Send message | `POST /v1/matches/{matchId}/messages` | POST |
| Mark read | `PATCH /v1/matches/{matchId}/messages/read` | PATCH |
| Typing indicator | `POST /v1/matches/{matchId}/messages/typing` | POST |

**GET matches Response**
```json
{
  "data": {
    "new_matches": [
      {
        "id": 10, "company": { "name": "…", "abbr": "IL", "color": "#7c3aed" },
        "role": "…", "status": "pending|active|expired|closed",
        "created_at": "ISO-8601", "reply_window_ms": 86400000,
        "unread_count": 1, "prompt": "…"
      }
    ],
    "conversations": [
      {
        "id": 201, "match_id": 13, "company": { … },
        "role": "…", "status": "screening|interview|offer",
        "state": "active|closed|expired",
        "last_message": "…", "last_message_at": "…", "unread": 0
      }
    ]
  }
}
```

**POST message Request** → `{ "text": "string" }`
**POST message Response** → `{ "data": { "id": 1, "from": "me", "text": "…", "time": "…" } }`

> **Note**: The `AUTO_REPLIES` simulation and `INITIAL_MESSAGES` map must be fully removed. Real-time updates should eventually use WebSockets/Pusher, but initial integration can use polling.

### Review Screen (within matches)

| Feature | Endpoint |
|---|---|
| Submit review | `POST /v1/reviews` |
| Get company reviews | `GET /v1/reviews/company/{companyId}` |

**POST review Request**
```json
{ "company_id": 14, "rating": 5, "title": "…", "body": "…" }
```

---

## 5 — Company Swipe Deck

### Screen: `(company-tabs)/index.tsx`

| Item | Detail |
|---|---|
| **Current state** | `APPLICANTS` array (3 items) with hardcoded photos, reviews, skills. `REPORT_REASONS` local. Distance filter is local-only. |
| **Backend endpoints** | `GET /v1/company/jobs/{jobId}/applicants`, `POST /v1/company/jobs/{jobId}/applicants/{applicantId}/right`, `POST /v1/company/jobs/{jobId}/applicants/{applicantId}/left` |

**Revision needed**:
- Replace `APPLICANTS` → fetch from `getApplicants` with active job context.
- The `MAX_SWIPES = 15` local limit should sync with subscription status.
- Report/Block modals need a backend endpoint — **currently missing**. Minor: can defer or use a generic `POST /v1/reports` if added.
- Distance filter should be sent as query param: `GET …/applicants?max_distance_km=50`.

**GET applicants Response**
```json
{
  "data": [
    {
      "id": 1, "name": "Maria Santos", "avatar_url": "…",
      "role": "Frontend Developer", "experience": "3 years",
      "location": "…", "distance_km": 3.5, "match_percent": 94,
      "tags": [{ "label": "React Native", "variant": "primary" }],
      "bio": "…", "hard_skills": [], "soft_skills": [],
      "photos": ["url1", "url2"],
      "reviews": [{ "company": "…", "rating": 5, "text": "…" }]
    }
  ]
}
```

> [!WARNING]
> **Missing Backend Endpoint**: There is no `POST /v1/reports` for report/block. The frontend has full UI for this but no backend route. **Action**: Add `POST /v1/reports` with `{ target_type, target_id, reason }`.

---

## 6 — Company Job Posts

### Screen: `(company-tabs)/applicants.tsx`

| Item | Detail |
|---|---|
| **Current state** | `INITIAL_JOBS` array (3 items). CRUD is local state only (`toggleStatus`, `removeJob`). "New Post" navigates to `CreateJobScreen`. |
| **Backend endpoints** | Full `apiResource('jobs')`: `GET`, `POST`, `PUT`, `DELETE /v1/company/jobs`, plus `POST /v1/company/jobs/{id}/close`, `POST /v1/company/jobs/{id}/restore` |

| Action | Endpoint |
|---|---|
| List jobs | `GET /v1/company/jobs` |
| Create job | `POST /v1/company/jobs` |
| Update job | `PUT /v1/company/jobs/{id}` |
| Delete job | `DELETE /v1/company/jobs/{id}` |
| Pause (close) | `POST /v1/company/jobs/{id}/close` |
| Reopen (restore) | `POST /v1/company/jobs/{id}/restore` |

**POST create job Request**
```json
{
  "title": "Frontend Developer", "department": "Engineering",
  "description": "…", "location": "…",
  "salary_min": 120000, "salary_max": 150000,
  "employment_type": "full_time|part_time|contract",
  "work_mode": "remote|hybrid|onsite",
  "requirements": ["React", "TypeScript"]
}
```

---

## 7 — Company Matches & Messaging

### Screen: `(company-tabs)/matches.tsx`

| Item | Detail |
|---|---|
| **Current state** | `NEW_MATCHES`, `PIPELINE`, `SEED_MESSAGES`, `AUTO_REPLIES` — all hardcoded. Tabs: Matches / Messages / Review. Chat is simulated. |
| **Backend endpoints** | `GET /v1/company/matches`, `GET /v1/company/matches/{id}`, `POST /v1/company/matches/{id}/close`, plus shared messaging endpoints. |

| Feature | Endpoint |
|---|---|
| List matches + pipeline | `GET /v1/company/matches` |
| Match detail | `GET /v1/company/matches/{id}` |
| Close match | `POST /v1/company/matches/{id}/close` |
| List messages | `GET /v1/matches/{matchId}/messages` |
| Send message | `POST /v1/matches/{matchId}/messages` |
| Mark read | `PATCH /v1/matches/{matchId}/messages/read` |
| Submit review (of applicant) | `POST /v1/reviews` |

**Revision**: Remove `PIPELINE_STAGES` hardcoded theme `T` object (lines 15-31) — this screen defines its own `T` constant instead of using `useTheme()` consistently. The hardcoded `T` should be removed and `useTheme()` used everywhere.

---

## 8 — Company Profile & Team Management

### Screen: `(company-tabs)/profile.tsx`

| Item | Detail |
|---|---|
| **Current state** | Company name `'Accenture PH'`, tech stack, perks, team members, subscription plans — all hardcoded. |
| **Backend endpoints** | See table below |

| Feature | Endpoint |
|---|---|
| Load company profile | `GET /v1/profile/company` |
| Update details | `PATCH /v1/profile/company/details` |
| Update logo | `PATCH /v1/profile/company/logo` |
| Add office image | `POST /v1/profile/company/office-images` |
| Remove office image | `DELETE /v1/profile/company/office-images/{index}` |
| Get subscription | `GET /v1/subscriptions/status` |

### Screen: `team-management.tsx`

| Item | Detail |
|---|---|
| **Current state** | `INITIAL_TEAM` array. Invite uses local validation (hardcoded `accenture.com` domain check). |
| **Backend endpoints** | See table below |

| Feature | Endpoint |
|---|---|
| List members | `GET /v1/company/members` |
| Send invite | `POST /v1/company/invites` |
| List invites | `GET /v1/company/invites` |
| Revoke member | `DELETE /v1/company/members/{userId}/revoke` |
| Resend invite | `POST /v1/company/invites/{inviteId}/resend` |
| Delete invite | `DELETE /v1/company/invites/{inviteId}` |

**POST invite Request**
```json
{ "email": "hr@company.com", "role": "hr|company_admin" }
```

**Revision**: Remove hardcoded `accenture.com` domain check — the backend validates domain match against the company's registered domain.

---

## 9 — Subscriptions & IAP

### Screen: `subscription.tsx`

| Item | Detail |
|---|---|
| **Current state** | `PLANS` and `SWIPE_PACKS` arrays fully hardcoded. CTA buttons only `console.log`. |
| **Backend endpoints** | Applicant: `POST /v1/iap/purchase`, `GET /v1/applicant/subscription/status`. Company: `POST /v1/subscriptions/checkout`, `GET /v1/subscriptions/status`, `POST /v1/subscriptions/cancel`. |

| Action | Endpoint (Applicant) | Endpoint (Company) |
|---|---|---|
| Get current plan | `GET /v1/applicant/subscription/status` | `GET /v1/subscriptions/status` |
| Purchase/subscribe | `POST /v1/iap/purchase` | `POST /v1/subscriptions/checkout` |
| Cancel | `POST /v1/applicant/subscription/cancel` | `POST /v1/subscriptions/cancel` |
| Purchase history | `GET /v1/applicant/purchases` | — |

**POST iap/purchase Request** (Applicant)
```json
{ "product_id": "gold_monthly|swipes_15", "receipt": "…", "platform": "ios|android" }
```

**Revision**: The `handleSubscribe` / `handleBuySwipes` handlers should call the real endpoint and show confirmation/error.

---

## 10 — Notifications

### Accessed from: Settings sheet on both profile screens

| Feature | Endpoint |
|---|---|
| List notifications | `GET /v1/notifications` |
| Unread count | `GET /v1/notifications/unread` |
| Mark as read | `PATCH /v1/notifications/{id}/read` |
| Mark all read | `PATCH /v1/notifications/read-all` |
| Get prefs | `GET /v1/notifications/preferences` |
| Update prefs | `PATCH /v1/notifications/preferences` |

**Current state**: Settings sheet has `Notifications` row but no navigation target. **Revision**: Create a `NotificationsScreen` or inline the preferences.

---

## 11 — File Uploads (Cross-cutting)

All photo uploads (avatar, cover, gallery, office images) should use the **pre-signed URL flow**:

1. `POST /v1/files/upload-url` → `{ "filename": "avatar.jpg", "content_type": "image/jpeg" }` → returns `{ upload_url, file_key }`
2. `PUT` the file to the `upload_url` (direct to S3/GCS)
3. `POST /v1/files/confirm-upload` → `{ "file_key": "…" }` → returns `{ url }`
4. `PATCH` the relevant profile endpoint with the final `url`

**Current state**: `ImagePicker` sets local `uri` only. No upload to backend.

---

## 12 — Summary: Mock Data Removal Checklist

| File | Mock Constant(s) | Replace With |
|---|---|---|
| `(auth)/login.tsx` | `MOCK_AUTH` | `api.post('/auth/login')` |
| `(auth)/register.tsx` | `MOCK_APPLICANT_OTP`, `MOCK_HR_INVITE_CODES` | `api.post('/auth/verify-email')`, `api.post('/company/invites/validate')` |
| `(tabs)/index.tsx` | `JOBS` array | `api.get('/applicant/swipe/deck')` |
| `(tabs)/matches.tsx` | `MATCH_COMPANIES`, `INITIAL_CONVERSATIONS`, `INITIAL_MESSAGES`, `AUTO_REPLIES`, `COMPANY_REVIEW_DETAILS` | `api.get('/applicant/matches')`, `api.get('/matches/{id}/messages')` |
| `(tabs)/profile.tsx` | `HARD_SKILLS`, `SOFT_SKILLS`, `INITIAL_EXPERIENCE`, `INITIAL_EDUCATION`, `INITIAL_PREFS`, hardcoded stats | `api.get('/profile/applicant')` |
| `jobs/[id].tsx` | Duplicate `JOBS` array | Route params or cached deck data |
| `(company-tabs)/index.tsx` | `APPLICANTS`, `REPORT_REASONS` | `api.get('/company/jobs/{id}/applicants')` |
| `(company-tabs)/applicants.tsx` | `INITIAL_JOBS` | `api.get('/company/jobs')` |
| `(company-tabs)/matches.tsx` | `NEW_MATCHES`, `PIPELINE`, `SEED_MESSAGES`, `AUTO_REPLIES`, hardcoded `T` theme | `api.get('/company/matches')`, `useTheme()` |
| `(company-tabs)/profile.tsx` | `INITIAL_TEAM`, `TECH_STACK`, `PERKS`, hardcoded company info | `api.get('/profile/company')`, `api.get('/company/members')` |
| `team-management.tsx` | `INITIAL_TEAM`, hardcoded domain check | `api.get('/company/members')`, `api.post('/company/invites')` |
| `subscription.tsx` | `PLANS`, `SWIPE_PACKS` | `api.get('/applicant/subscription/status')` + static plan catalog |
| `messages/[conversationId].tsx` | Placeholder stub (17 lines) | Full chat UI or redirect to match conversation |

---

## 13 — Missing Backend Endpoints

| Feature | Suggested Endpoint | Priority |
|---|---|---|
| Report user/profile | `POST /v1/reports` | Medium |
| Block user | `POST /v1/blocks` | Medium |
| Applicant saved/bookmarked jobs | `POST/DELETE /v1/applicant/saved-jobs/{jobId}` | Low |
| Applicant stats (for profile) | Embed in `GET /v1/profile/applicant` | High |

---

## 14 — Recommended Implementation Order

| Phase | Scope | Effort |
|---|---|---|
| **P0** | Fix `api.ts` syntax + response interceptor | 30 min |
| **P1** | Auth (login, register, OTP, sign-out) | 1 day |
| **P2** | Applicant swipe deck + job detail | 1 day |
| **P3** | Applicant profile (read + edit) | 1 day |
| **P4** | Applicant matches + messaging | 1.5 days |
| **P5** | Company job posts CRUD | 0.5 day |
| **P6** | Company swipe deck | 1 day |
| **P7** | Company matches + messaging | 1 day |
| **P8** | Company profile + team management | 1 day |
| **P9** | Subscriptions / IAP | 1 day |
| **P10** | File uploads, notifications, reviews | 1 day |

**Total estimated effort: ~9–10 days**
