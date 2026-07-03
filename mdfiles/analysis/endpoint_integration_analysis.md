# Endpoint ↔ Frontend Integration Analysis

> Full audit of every backend route vs. what's actually wired up in the mobile app and admin dashboard.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | **Integrated** — Frontend makes real API calls to this endpoint |
| 🟡 | **Easy Drop-in** — Backend exists, frontend screen exists but uses mock/local data. Straightforward to wire up |
| 🔴 | **Needs Correlation** — Requires changes on both frontend and backend, or the frontend screen/flow doesn't exist yet |
| ⚪ | **Backend-only** — No frontend surface exists or is planned for this endpoint |

---

## Part 1 — Mobile App

### Auth (`/auth/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `auth/register` | POST | ✅ | [register.tsx:400,416](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(auth)/register.tsx#L400) |
| `auth/login` | POST | ✅ | [login.tsx:48](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(auth)/login.tsx#L48) |
| `auth/verify-email` | POST | ✅ | [register.tsx:647](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(auth)/register.tsx#L647) |
| `auth/resend-verification` | POST | ✅ | [register.tsx:696](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(auth)/register.tsx#L696) |
| `auth/logout` | POST | ✅ | [profile.tsx:357](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/profile.tsx#L357) |
| `auth/me` | GET | ✅ | Used in `_layout.tsx` for session check |
| `auth/forgot-password` | POST | 🔴 | **No forgot-password screen exists in mobile** |
| `auth/reset-password` | POST | 🔴 | **No reset-password screen exists in mobile** |
| `auth/google/redirect` | GET | ✅ | OAuth flow handled in register |
| `auth/google/callback` | GET | ✅ | OAuth callback handled |

### Onboarding & Profile — Applicant (`/profile/applicant/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `profile/onboarding/status` | GET | ✅ | [_layout.tsx:66](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/_layout.tsx#L66), [register.tsx:520](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(auth)/register.tsx#L520) |
| `profile/onboarding/complete-step` | POST | ✅ | [register.tsx:515,529,578,628](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(auth)/register.tsx#L515) |
| `profile/completion` | GET | 🟡 | Backend exists. No mobile screen calls it yet, but could easily be shown on profile |
| `profile/applicant` | GET | ✅ | [profile.tsx:216,495](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/profile.tsx#L216) |
| `profile/applicant/basic-info` | PATCH | ✅ | [profile.tsx:371](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/profile.tsx#L371) |
| `profile/applicant/skills` | PATCH | ✅ | [profile.tsx:382](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/profile.tsx#L382) |
| `profile/applicant/job-preferences` | PATCH | ✅ | [profile.tsx:478](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/profile.tsx#L478) |
| `profile/applicant/photo` | PATCH | ✅ | [profile.tsx:396](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/profile.tsx#L396) |
| `profile/applicant/cover-photo` | PATCH | ✅ | [profile.tsx:417](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/profile.tsx#L417) |
| `profile/applicant/photos` | PATCH | ✅ | [profile.tsx:451](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/profile.tsx#L451) |
| `profile/applicant/experience` | POST/PATCH/DELETE | 🟡 | Backend has full CRUD. Profile screen exists but doesn't call these yet |
| `profile/applicant/education` | POST/PATCH/DELETE | 🟡 | Same as above — backend CRUD ready, profile UI needs wiring |
| `profile/applicant/resume` | PATCH | 🟡 | Backend exists. Profile screen doesn't call it separately |
| `profile/applicant/cover-letter` | PATCH | 🟡 | Backend exists. No UI surface yet |
| `profile/applicant/social-links` | PATCH | 🟡 | Backend exists. No UI surface yet |

### Onboarding & Profile — Company (`/profile/company/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `profile/company` | GET | ✅ | [company profile.tsx:680,763](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(company-tabs)/profile.tsx#L680) |
| `profile/company/details` | PATCH | ✅ | [company profile.tsx:671](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(company-tabs)/profile.tsx#L671) |
| `profile/company/logo` | PATCH | ✅ | [company profile.tsx:675](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(company-tabs)/profile.tsx#L675) |
| `profile/company/office-images` | POST/DELETE | 🟡 | Backend exists. Company profile screen doesn't manage office images yet |
| `profile/company/verification` | POST | 🔴 | Backend exists. **No mobile verification upload flow** |

### HR Profile (`/profile/hr/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `profile/hr/setup` | POST | 🔴 | Backend exists. **No HR profile setup screen in mobile** |
| `profile/hr/photo-upload-url` | POST | 🔴 | Same — no HR profile photo flow |

### Files (`/files/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `files/upload-url` | POST | ✅ | [register.tsx:215](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(auth)/register.tsx#L215), [company profile.tsx:605](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(company-tabs)/profile.tsx#L605) |
| `files/confirm-upload` | POST | ✅ | [register.tsx:234](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(auth)/register.tsx#L234), [company profile.tsx:622](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(company-tabs)/profile.tsx#L622) |
| `files/read-url` | POST | 🟡 | Backend exists, not called yet — can drop in when needed to show private files |

### Applicant Swipe (`/applicant/swipe/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `applicant/swipe/deck` | GET | ✅ | [index.tsx:586](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/index.tsx#L586) |
| `applicant/swipe/limits` | GET | ✅ | [index.tsx:587](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/index.tsx#L587) |
| `applicant/swipe/right/{jobId}` | POST | ✅ | [index.tsx:792](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/index.tsx#L792) |
| `applicant/swipe/left/{jobId}` | POST | ✅ | Same handler, direction-based |

### Applicant Applications (`/applicant/applications`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `applicant/applications` | GET | 🔴 | Backend exists. **No "My Applications" screen in mobile** |
| `applicant/applications/{id}` | GET | 🔴 | Same — no application detail view |

### Applicant Matches (`/applicant/matches/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `applicant/matches` | GET | ✅ | [matches.tsx:818](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/matches.tsx#L818) |
| `applicant/matches/{id}` | GET | 🟡 | Backend exists. Chat opens by match but doesn't fetch detail separately |
| `applicant/matches/{id}/accept` | POST | 🔴 | Backend exists. **No accept/decline UI in mobile matches screen** |
| `applicant/matches/{id}/decline` | POST | 🔴 | Same |

### Match Messages (`/matches/{matchId}/messages/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `matches/{matchId}/messages` | GET | ✅ | [matches.tsx:424](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/matches.tsx#L424) |
| `matches/{matchId}/messages` | POST | ✅ | [matches.tsx:493](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(tabs)/matches.tsx#L493) |
| `matches/{matchId}/messages/typing` | POST | 🟡 | Backend exists. Typing indicator UI exists but doesn't call endpoint |
| `matches/{matchId}/messages/read` | PATCH | 🟡 | Backend exists. No read-receipt call wired up |

### Company Jobs (`/company/jobs/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `company/jobs` (index) | GET | 🟡 | Backend has apiResource. **applicants.tsx uses INITIAL_JOBS mock data** |
| `company/jobs` (store) | POST | 🟡 | Backend exists. **CreateJobScreen.tsx builds form but doesn't POST to API** |
| `company/jobs/{id}` (show) | GET | 🟡 | Backend exists. Not fetched |
| `company/jobs/{id}` (update) | PUT | 🟡 | Backend exists. Not called |
| `company/jobs/{id}` (destroy) | DELETE | 🟡 | Backend exists. Delete is local state only |
| `company/jobs/{id}/close` | POST | 🟡 | Backend exists. Pause/close is local state |
| `company/jobs/{id}/restore` | POST | 🟡 | Backend exists. Not called |

### Company Applicant Review / Swipe (`/company/jobs/{jobId}/applicants/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `company/jobs/{jobId}/applicants` | GET | 🟡 | Backend exists. **Company home (swipe deck) uses hardcoded APPLICANTS array** |
| `company/jobs/{jobId}/applicants/{id}` | GET | 🟡 | Same |
| `company/jobs/{jobId}/applicants/{id}/right` | POST | 🟡 | Backend exists. Swipe is local only |
| `company/jobs/{jobId}/applicants/{id}/left` | POST | 🟡 | Same |

### Company Matches (`/company/matches/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `company/matches` | GET | 🟡 | Backend exists. **Company matches.tsx uses NEW_MATCHES + PIPELINE mock arrays** |
| `company/matches/{id}` | GET | 🟡 | Same |
| `company/matches/{id}/close` | POST | 🟡 | Same |

### Company Invites & Members (`/company/invites/*`, `/company/members/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `company/invites` (store) | POST | 🟡 | Backend exists. **team-management.tsx handles invite locally** |
| `company/invites/bulk` | POST | 🟡 | Backend exists. No bulk UI |
| `company/invites` (index) | GET | 🟡 | Backend exists. Team list uses INITIAL_TEAM mock |
| `company/invites/{id}` (destroy) | DELETE | 🟡 | Backend exists. Not called |
| `company/invites/{id}/resend` | POST | 🟡 | Backend exists. Not called |
| `company/invites/validate` | POST | ✅ | [register.tsx:822](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/mobile/app/(auth)/register.tsx#L822) |
| `company/members` (index) | GET | 🟡 | Backend exists. Team list is mock data |
| `company/members/{userId}/revoke` | DELETE | 🟡 | Backend exists. Revoke is local state |

### Reviews (`/reviews/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `reviews` (store) | POST | 🟡 | Backend exists. **Company matches review tab submits locally** |
| `reviews/company/{companyId}` | GET | 🟡 | Backend exists. Job detail shows hardcoded reviews |
| `reviews/{id}/flag` | POST | 🟡 | Backend exists. No UI for flagging |

### Notifications (`/notifications/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `notifications` | GET | 🔴 | Backend exists. **No notifications screen in mobile** |
| `notifications/unread` | GET | 🔴 | Same |
| `notifications/{id}/read` | PATCH | 🔴 | Same |
| `notifications/read-all` | PATCH | 🔴 | Same |
| `notifications/preferences` | GET/PATCH | 🔴 | Same |

### Subscriptions & IAP (`/subscriptions/*`, `/iap/*`, `/applicant/subscription/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `subscriptions/checkout` | POST | 🟡 | Backend exists. **subscription.tsx has full UI but `handleSubscribe` only console.logs** |
| `subscriptions/status` | GET | 🟡 | Backend exists. Not fetched |
| `subscriptions/cancel` | POST | 🟡 | Backend exists. Not called |
| `iap/purchase` | POST | 🟡 | Backend exists. `handleBuySwipes` only console.logs |
| `applicant/subscription/status` | GET | 🟡 | Backend exists. Not fetched |
| `applicant/purchases` | GET | 🟡 | Backend exists. No purchase history UI |
| `applicant/subscription/cancel` | POST | 🟡 | Backend exists. Not called |

---

## Part 2 — Admin Dashboard (Next.js)

### Dashboard & Analytics (`/admin/dashboard/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `admin/dashboard/stats` | GET | ✅ | `dashboardService.stats()` |
| `admin/dashboard/user-growth` | GET | ✅ | `dashboardService.userGrowth()` |
| `admin/dashboard/revenue` | GET | ✅ | `dashboardService.revenue()` |
| `admin/dashboard/activity` | GET | ✅ | `dashboardService.activity()` |

### Users (`/admin/users/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `admin/users` | GET | ✅ | `userService.list()` |
| `admin/users/{id}` | GET | ✅ | `userService.get()` |
| `admin/users/{id}/ban` | POST | ✅ | `userService.ban()` |
| `admin/users/{id}/unban` | POST | ✅ | `userService.unban()` |

### Companies (`/admin/companies/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `admin/companies` | GET | ✅ | `companyService.list()` |
| `admin/companies/{id}` | GET | ✅ | `companyService.get()` |
| `admin/companies/{id}/suspend` | POST | ✅ | `companyService.suspend()` |
| `admin/companies/{id}/unsuspend` | POST | ✅ | `companyService.unsuspend()` |
| `admin/companies/verifications` | GET | ✅ | `companyService.verifications()` |
| `admin/companies/verifications/{id}/approve` | POST | ✅ | `companyService.approveVerification()` |
| `admin/companies/verifications/{id}/reject` | POST | ✅ | `companyService.rejectVerification()` |

### Jobs (`/admin/jobs/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `admin/jobs` | GET | ✅ | `jobService.list()` |
| `admin/jobs/{id}` | GET | ✅ | `jobService.get()` |
| `admin/jobs/{id}/flag` | POST | ✅ | `jobService.flag()` |
| `admin/jobs/{id}/unflag` | POST | ✅ | `jobService.unflag()` |
| `admin/jobs/{id}/close` | POST | ✅ | `jobService.close()` |
| `admin/jobs/{id}/force` (DELETE) | DELETE | ⚪ | Backend exists. No dashboard UI for force-delete |

### Subscriptions (`/admin/subscriptions/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `admin/subscriptions` | GET | ✅ | `subscriptionService.list()` |
| `admin/subscriptions/revenue-stats` | GET | ✅ | `subscriptionService.revenueStats()` |
| `admin/subscriptions/{id}` | GET | ✅ | `subscriptionService.get()` |
| `admin/subscriptions/{id}/cancel` | POST | ✅ | `subscriptionService.cancel()` |

### IAP (`/admin/iap/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `admin/iap/transactions` | GET | ✅ | `iapService.transactions()` |
| `admin/iap/transactions/{id}` | GET | ✅ | `iapService.transactionDetail()` |
| `admin/iap/webhooks` | GET | ✅ | `iapService.webhookEvents()` |
| `admin/iap/webhooks/metrics` | GET | ✅ | `iapService.webhookMetrics()` |
| `admin/iap/webhooks/{id}/retry` | POST | ✅ | `iapService.retryWebhook()` |

### Trust (`/admin/trust/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `admin/trust/events` | GET | ✅ | `trustService.events()` |
| `admin/trust/low-trust-companies` | GET | ✅ | `trustService.lowTrustCompanies()` |
| `admin/trust/companies/{id}/history` | GET | ✅ | `trustService.companyHistory()` |
| `admin/trust/companies/{id}/recalculate` | POST | ✅ | `trustService.recalculateTrustScore()` |
| `admin/trust/companies/{id}/adjust` | POST | ✅ | `trustService.adjustTrustScore()` |

### Reviews (`/admin/reviews/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `admin/reviews` | GET | ✅ | Via `useReviews()` hook in [hooks.ts:298](file:///Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/frontend/web/src/lib/hooks.ts#L298) |
| `admin/reviews/flagged` | GET | ⚪ | Backend exists. Dashboard filters via query param instead |
| `admin/reviews/{id}/unflag` | POST | ✅ | Via `useUnflagReview()` hook |
| `admin/reviews/{id}` (DELETE) | DELETE | ✅ | Via `useRemoveReview()` hook |

### Matches (`/admin/matches/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `admin/matches` | GET | ✅ | `matchService.list()` |
| `admin/matches/stats` | GET | ✅ | `matchService.stats()` |
| `admin/matches/{id}` | GET | ✅ | Service exists but no detail page found |

### Admin User Management (`/admin/admin-users/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `admin/admin-users` | GET | ✅ | `adminUserService.list()` |
| `admin/admin-users/{id}` | GET | ✅ | `adminUserService.get()` |
| `admin/admin-users` (store) | POST | ✅ | `adminUserService.create()` |
| `admin/admin-users/{id}/role` | PATCH | ✅ | `adminUserService.updateRole()` |
| `admin/admin-users/{id}/deactivate` | POST | ✅ | `adminUserService.deactivate()` |
| `admin/admin-users/{id}/reactivate` | POST | ✅ | `adminUserService.reactivate()` |
| `admin/admin-users/{id}/resend-invitation` | POST | ✅ | `adminUserService.resendInvitation()` |
| `admin/admin-users/{id}/revoke-invitation` | POST | ✅ | `adminUserService.revokeInvitation()` |

### Audit Logs (`/admin/audit/*`)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `admin/audit` | GET | ✅ | `auditService.list()` |
| `admin/audit/action-types` | GET | ✅ | `auditService.getActionTypes()` |
| `admin/audit/{id}` | GET | ✅ | `auditService.get()` |
| `admin/audit/export` | POST | ✅ | `auditService.export()` |

### Dashboard Services with No Backend Route

| Service Call | Notes |
|-------------|-------|
| `matchService.applications()` → `GET /admin/applications` | ❌ **Backend route does not exist** |
| `matchService.applicationStats()` → `GET /admin/applications/stats` | ❌ **Backend route does not exist** |

---

## Summary

### Mobile — By Priority

| Category | Count | Description |
|----------|-------|-------------|
| ✅ Integrated | ~25 | Auth, applicant swipe, applicant profile CRUD, matches + messages, file upload, company profile basics |
| 🟡 Easy Drop-in | ~28 | All company-side screens (job CRUD, applicant deck, matches, invites, team mgmt, reviews, subscription/IAP). These screens exist with full UI but use mock data — just need `api.get/post` calls wired in |
| 🔴 Needs Correlation | ~12 | Forgot/reset password, applicant accept/decline match, notifications, "My Applications", HR profile setup, company verification upload |

### Dashboard — By Priority

| Category | Count | Description |
|----------|-------|-------------|
| ✅ Integrated | ~40 | Virtually all admin endpoints are wired up via service files |
| ⚪ Backend-only | 2 | `admin/jobs/{id}/force` DELETE, `admin/reviews/flagged` (uses query param) |
| ❌ Missing Backend | 2 | `matchService.applications()` and `matchService.applicationStats()` call routes that don't exist |

### Key Takeaways

1. **The admin dashboard is nearly fully integrated.** Only 2 phantom endpoints in `matchService` need either the backend routes created or the service methods removed.

2. **The mobile company-side is the biggest gap.** Every company screen (swipe deck, job listings, matches/messaging, team management, reviews, subscription) has polished UI but runs entirely on hardcoded mock data. The backend endpoints all exist — this is purely a wiring task.

3. **Mobile applicant-side is mostly done.** The main gaps are: no "My Applications" list, no accept/decline match flow, and no notifications screen.
