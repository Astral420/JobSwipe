# Company Admin & HR Registration Flow
## End-to-End Documentation

**Project:** JobSwipe  
**Document Type:** Technical Specification & Flow Documentation  
**Last Updated:** 2026-04-16  
**Authors:** Engineering Team  
**Status:** Living Document — Subject to Change

---

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation (As-Is)](#current-implementation-as-is)
   - 2.1 [Company Admin Registration Flow (E2E)](#21-company-admin-registration-flow-e2e)
   - 2.2 [HR Registration Flow (E2E)](#22-hr-registration-flow-e2e)
   - 2.3 [Backend Endpoints & Services](#23-backend-endpoints--services)
   - 2.4 [Frontend Screens (Mobile App)](#24-frontend-screens-mobile-app)
   - 2.5 [Data Flow Diagrams](#25-data-flow-diagrams)
   - 2.6 [What's Working & What's Missing](#26-whats-working--whats-missing)
3. [Proposed Implementation (To-Be)](#proposed-implementation-to-be)
   - 3.1 [Enhanced Company Admin Flow](#31-enhanced-company-admin-flow)
   - 3.2 [Enhanced HR Registration Flow](#32-enhanced-hr-registration-flow)
   - 3.3 [Admin Notification & Revoke System](#33-admin-notification--revoke-system)
   - 3.4 [Complete E2E Flow Diagrams](#34-complete-e2e-flow-diagrams)
4. [Technical Specifications](#technical-specifications)
   - 4.1 [Backend Changes](#41-backend-changes)
   - 4.2 [Database Schema Changes](#42-database-schema-changes)
   - 4.3 [Email Templates](#43-email-templates)
   - 4.4 [Frontend Screens — Mobile App (React Native)](#44-frontend-screens--mobile-app-react-native)
   - 4.5 [Frontend Screens — Web App (Next.js)](#45-frontend-screens--web-app-nextjs)
   - 4.6 [API Request/Response Examples](#46-api-requestresponse-examples)
5. [Security Considerations](#security-considerations)
6. [Implementation Checklist](#implementation-checklist)

---

## Overview

JobSwipe supports two primary company-side user roles:

| Role | Description |
|---|---|
| `company_admin` | The founding/owner user of a company. Full access, can invite team members, manage HR members, revoke access. |
| `hr` | An invited HR team member. Limited to their company's scope. Cannot manage other HR members. |

The registration paths diverge significantly:

- **Company Admin** self-registers using their work email. The backend auto-detects a new domain and creates a fresh company profile. Onboarding (3 steps) must be completed before the admin can post jobs or invite HR members.
- **HR** cannot self-register for an existing company domain — they must be invited by a `company_admin`. Currently, this invite is delivered as a raw token; the **proposed flow** replaces this with a branded magic-link email.

> **Security Model:** HR/company_admin accounts cannot use OAuth (Google). Email + password only. This is enforced at both the controller and service layers.

---

## Current Implementation (As-Is)

### 2.1 Company Admin Registration Flow (E2E)

#### Step-by-Step

```
Step 1 — POST /api/v1/auth/register
  ├── Payload: { email, password, role: "company_admin" }
  ├── AuthController → AuthService::initiateRegistration()
  │   ├── Check email uniqueness (UserRepository::emailExists)
  │   ├── Extract email domain (CompanyEmailValidator::extractDomain)
  │   ├── Look up existing company for domain (CompanyProfileRepository::findByDomain)
  │   │   └── [NEW DOMAIN] → No company found → no invite required
  │   ├── Hash password (bcrypt, configurable rounds)
  │   └── Dispatch OTP to Redis + send EmailVerificationMail
  └── Response: { email } + message "Verification code sent successfully"

Step 2 — POST /api/v1/auth/verify-email
  ├── Payload: { email, code }
  ├── AuthController → AuthService::completeRegistration()
  │   ├── OTPService::verify() — checks Redis hash + attempt counter
  │   ├── OTPService::getStoredData() — retrieve password_hash, role from Redis
  │   ├── DB Transaction:
  │   │   ├── UserRepository::create() — UUID, email, role, email_verified_at: now()
  │   │   ├── ProfileService::createProfileForUser() — creates:
  │   │   │   ├── PostgreSQL: company_profiles row (company_name defaults to email domain)
  │   │   │   └── MongoDB: CompanyProfileDocument (onboarding_step: 1)
  │   │   ├── ProfileService::setCompanyEmailDomain() — stores domain on profile
  │   │   └── TokenService::generateToken() — Sanctum token created
  │   └── OTPService::clearStoredData() — flush Redis key
  └── Response 201: { token, user }

Step 3 — Onboarding (3 steps, POST /api/v1/profile/onboarding/complete-step)
  ├── Step 1 — company_details: { company_name, description, industry, company_size }
  ├── Step 2 — verification_documents: { verification_documents: [url, ...] }
  └── Step 3 — media: { logo_url, office_images: [url, ...] }
      └── Marks onboarding_step = "completed" in MongoDB

Post-Onboarding — Admin can now:
  ├── POST /api/v1/company/jobs          (create job postings)
  └── POST /api/v1/company/invites       (invite HR members)
```

#### Key Validations

- Email must not already exist in `users` table.
- Domain must NOT match an existing `company_profiles.company_domain` (otherwise an invite is required).
- OAuth registration blocked for `hr` and `company_admin` roles.
- OTP: 6-digit code, max 5 attempts, stored in Redis with TTL.

---

### 2.2 HR Registration Flow (E2E)

#### Pre-Condition: Admin Must Issue Invite

```
Admin Action — POST /api/v1/company/invites
  ├── Payload: { email: "hr@corp.com", role: "hr" }
  ├── Auth: company_admin only (middleware: role:company_admin)
  ├── CompanyInviteController → CompanyInvitationService::createInvite()
  │   ├── Verifies caller isAdmin() via CompanyMembershipService
  │   ├── Revokes any prior pending invites for same email+company
  │   ├── Generates raw token: bin2hex(random_bytes(32)) → 64-char hex
  │   ├── Stores hashed token (sha256) in company_invites table
  │   └── Sets expires_at = now() + 7 days
  └── Response: { invite: { id, email, role, expires_at }, token: "<raw_token>" }
      ⚠️  TOKEN IS RETURNED RAW IN API RESPONSE — Admin must manually share it
```

#### HR Registration Steps (Current)

```
Step 1 — Validate Token (optional, public) — POST /api/v1/company/invites/validate
  ├── Payload: { email, token }
  └── Response: { valid: true, company_name, role, expires_at }

Step 2 — Register — POST /api/v1/auth/register
  ├── Payload: { email, password, role: "hr", company_invite_token: "<token>" }
  ├── AuthService::initiateRegistration()
  │   ├── Check email uniqueness
  │   ├── Extract domain → FINDS existing company → requires invite
  │   ├── CompanyInvitationService::resolvePendingInvite(email, token) — lookup by hash
  │   ├── Validates invite role matches requested role
  │   └── Dispatches OTP

Step 3 — Verify Email — POST /api/v1/auth/verify-email
  ├── Payload: { email, code }
  ├── AuthService::completeRegistration()
  │   ├── OTP verification
  │   ├── DB Transaction:
  │   │   ├── UserRepository::create() — creates user
  │   │   ├── CompanyInvitationService::acceptInviteForUser()
  │   │   │   ├── Lock invite row FOR UPDATE
  │   │   │   ├── Validate role match again (double-check)
  │   │   │   ├── CompanyMembershipService::addMember() → inserts/updates company_memberships
  │   │   │   └── Sets invite.accepted_at = now()
  │   │   ├── NO new company_profile created (joins existing)
  │   │   └── TokenService::generateToken()
  │   └── OTP cleared
  └── Response 201: { token, user }

Post-Registration — HR can now:
  ├── POST/GET /api/v1/company/jobs
  ├── GET/POST /api/v1/company/jobs/{id}/applicants
  └── GET/POST /api/v1/company/matches
  (No onboarding steps defined for HR currently)
```

---

### 2.3 Backend Endpoints & Services

#### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Initiate registration (all roles) |
| `POST` | `/api/v1/auth/verify-email` | Public | Verify OTP → complete registration |
| `POST` | `/api/v1/auth/login` | Public | Login (email + password) |
| `POST` | `/api/v1/auth/logout` | 🔒 Sanctum | Revoke current token |
| `GET` | `/api/v1/auth/me` | 🔒 Sanctum+verified | Get current user + profile |
| `POST` | `/api/v1/auth/resend-verification` | Public | Resend OTP |
| `POST` | `/api/v1/auth/forgot-password` | Public | Initiate password reset |
| `POST` | `/api/v1/auth/reset-password` | Public | Complete password reset |

#### Company Invite Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/company/invites` | 🔒 `company_admin` | Create new HR/admin invite |
| `GET` | `/api/v1/company/invites` | 🔒 `company_admin` | List all company invites |
| `DELETE` | `/api/v1/company/invites/{id}` | 🔒 `company_admin` | Revoke pending invite |
| `POST` | `/api/v1/company/invites/validate` | Public | Validate invite token |

#### Profile / Onboarding Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/profile/onboarding/status` | 🔒 Sanctum+verified | Get onboarding progress |
| `POST` | `/api/v1/profile/onboarding/complete-step` | 🔒 Sanctum+verified | Submit a step |
| `GET` | `/api/v1/profile/completion` | 🔒 Sanctum+verified | Profile completion % |

#### Core Services Involved

| Service | Responsibility |
|---|---|
| `AuthService` | Registration orchestration, login, password reset |
| `OTPService` | OTP generation, storage (Redis), verification, cleanup |
| `CompanyInvitationService` | Invite CRUD, token hashing, invite acceptance |
| `CompanyMembershipService` | Membership CRUD, admin check |
| `ProfileService` | Profile creation, photo updates |
| `ProfileOnboardingService` | Onboarding step state machine |
| `TokenService` | Sanctum token generation & revocation |
| `CompanyEmailValidator` | Domain extraction and validation |
| `TrustScoreService` | Initial trust score calculation post-registration |

#### Middleware Chain

```
throttle:api-tiered
  └── /api/v1/...
        ├── [Public routes — no auth]
        └── auth:sanctum
              └── verified (email_verified_at NOT NULL)
                    ├── role:company_admin
                    ├── role:hr,company_admin
                    └── role:applicant
```

---

### 2.4 Frontend Screens (Mobile App)

> **Note:** The mobile frontend (`frontend/mobile`) is a React Native application. Screen implementations are not yet in this repository; the following describes the **expected screens** based on backend contract.

#### Screen: Registration Entry (`RegisterScreen`)
- **Purpose:** Role selection + email/password entry
- **UI Elements:**
  - Role selector: "I'm a Job Seeker" / "I'm a Company/HR"
  - Email input (keyboard type: email)
  - Password input (secure text entry)
  - Confirm password input
  - Optional: `company_invite_token` field shown when `hr` role selected
  - "Register" CTA button

#### Screen: Email Verification (`VerifyEmailScreen`)
- **Purpose:** OTP entry after registration
- **UI Elements:**
  - 6-digit OTP input (auto-advance between cells)
  - Countdown timer (OTP TTL remaining)
  - "Resend Code" button (calls `POST /auth/resend-verification`)
  - Display of email address being verified

#### Screen: Company Onboarding Step 1 (`CompanyDetailsScreen`)
- **Purpose:** Collect company_name, description, industry, company_size
- 3-step progress indicator
- Required fields validation before next

#### Screen: Company Onboarding Step 2 (`VerificationDocumentsScreen`)
- **Purpose:** Upload verification documents
- File picker → S3 presigned upload flow
- Min 1 document required

#### Screen: Company Onboarding Step 3 (`CompanyMediaScreen`)
- **Purpose:** Upload company logo and office images
- Logo: required (1 image)
- Office images: 1–6 required

#### Screen: Admin Dashboard (`AdminDashboardScreen`)
- Post-onboarding home
- Quick links: Post Job, Invite HR, View Applicants

---

### 2.5 Data Flow Diagrams

#### Company Admin Registration Flow (Current)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPANY ADMIN REGISTRATION (CURRENT)                      │
└─────────────────────────────────────────────────────────────────────────────┘

  Mobile App              Laravel Backend             External Services
  ──────────              ───────────────             ─────────────────
      │                         │                            │
      │  POST /auth/register    │                            │
      │ {email,password,        │                            │
      │  role:"company_admin"}  │                            │
      │────────────────────────>│                            │
      │                         │ Check email uniqueness     │
      │                         │────────────────────> PostgreSQL
      │                         │                      (users table)
      │                         │<────────────────────       │
      │                         │ Check domain→company  │    │
      │                         │────────────────────> PostgreSQL
      │                         │              (company_profiles)
      │                         │<────────────────────       │
      │                         │ Hash password        │     │
      │                         │ Generate OTP         │     │
      │                         │────────────────────────> Redis
      │                         │    (store OTP + password_hash)
      │                         │                      │     │
      │                         │ Queue email          │     │
      │                         │────────────────────────────────> SES/SMTP
      │                         │                      │     │  (OTP email)
      │<────────────────────────│                      │     │
      │  { email }              │                      │     │
      │  "Verification code     │                      │     │
      │   sent"                 │                      │     │
      │                         │                      │     │
      │  [User reads email]     │                      │     │
      │                         │                      │     │
      │  POST /auth/verify-email│                      │     │
      │ {email, code}           │                      │     │
      │────────────────────────>│                      │     │
      │                         │ Verify OTP vs Redis  │     │
      │                         │────────────────────> Redis │
      │                         │<────────────────────       │
      │                         │ BEGIN TRANSACTION    │     │
      │                         │ Create user          │     │
      │                         │────────────────────> PostgreSQL (users)
      │                         │ Create company_profile    │
      │                         │────────────────────> PostgreSQL (company_profiles)
      │                         │ Create company doc   │     │
      │                         │────────────────────────────────> MongoDB
      │                         │ Create Sanctum token │     │
      │                         │────────────────────> PostgreSQL (personal_access_tokens)
      │                         │ COMMIT               │     │
      │                         │ Clear Redis OTP      │     │
      │<────────────────────────│                      │     │
      │  201 { token, user }    │                      │     │
      │                         │                      │     │
      │  [Onboarding: 3 steps]  │                      │     │
      │                         │                      │     │
```

#### HR Registration Flow (Current)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HR REGISTRATION (CURRENT)                             │
└─────────────────────────────────────────────────────────────────────────────┘

  Admin App            Laravel Backend        Database       HR candidate
  ─────────            ───────────────        ────────       ────────────
      │                      │                   │                │
      │ POST /company/invites │                   │                │
      │ {email, role:"hr"}   │                   │                │
      │─────────────────────>│                   │                │
      │                      │ Validate admin     │                │
      │                      │────────────────> PgSQL             │
      │                      │     (company_memberships)          │
      │                      │<────────────────   │                │
      │                      │ Revoke old invites │                │
      │                      │────────────────> PgSQL             │
      │                      │     (company_invites)              │
      │                      │ Generate token     │                │
      │                      │ Hash & store       │                │
      │                      │────────────────> PgSQL             │
      │                      │   (company_invites row)            │
      │<─────────────────────│                   │                │
      │ { invite, token }    │                   │                │
      │                      │                   │                │
      │ [Admin copies token  │                   │                │
      │  & shares manually   │                   │                │
      │  via Slack/email]    │                   │                │
      │                      │                   │                │
      │                      │                   │         [HR receives token]
      │                      │                   │                │
      │                      │                   │  POST /auth/register
      │                      │<────────────────────────────────────
      │                      │ { email, password, role:"hr",      │
      │                      │   company_invite_token }            │
      │                      │                   │                │
      │                      │ Validate token     │                │
      │                      │────────────────> PgSQL             │
      │                      │   (company_invites by hash)        │
      │                      │<────────────────   │                │
      │                      │ Send OTP                           │
      │                      │──────────────────────────────────────> Email
      │                      │                   │                │
      │                      │<─────────────────────────────────── │
      │                      │   POST /auth/verify-email           │
      │                      │    { email, code }                  │
      │                      │                   │                │
      │                      │ BEGIN TRANSACTION  │                │
      │                      │ Create user        │                │
      │                      │────────────────> PgSQL (users)     │
      │                      │ Accept invite      │                │
      │                      │ Create membership  │                │
      │                      │────────────────> PgSQL             │
      │                      │   (company_memberships)            │
      │                      │ Generate token     │                │
      │                      │────────────────> PgSQL             │
      │                      │ COMMIT             │                │
      │                      │──────────────────────────────────── │
      │                      │   201 { token, user }               │
      │                      │                   │                │
```

---

### 2.6 What's Working & What's Missing

#### ✅ What's Working

| Feature | Status |
|---|---|
| Company admin self-registration with domain detection | ✅ Implemented |
| Email OTP verification (Redis-backed) | ✅ Implemented |
| Invite token generation and hashing (sha256) | ✅ Implemented |
| Invite expiry (7 days) | ✅ Implemented |
| Invite revocation (revoked_at) | ✅ Implemented |
| Invite re-issue (old pending invites auto-revoked) | ✅ Implemented |
| HR registration via invite token | ✅ Implemented |
| CompanyMembership row created on HR join | ✅ Implemented |
| Role mismatch validation on invite acceptance | ✅ Implemented |
| Double-check with `lockForUpdate()` in transaction | ✅ Implemented |
| Company Admin 3-step onboarding | ✅ Implemented |
| OAuth blocked for HR/company_admin | ✅ Implemented |
| Domain-based duplicate company prevention | ✅ Implemented |

#### ❌ What's Missing / Gaps

| Gap | Impact | Priority |
|---|---|---|
| **No invite email sent** — Token is returned in API response only, admin must share manually | High — no usable HR invite flow | P0 |
| **No magic link** — HR must manually copy/paste the raw token into the registration form | High — poor UX | P0 |
| **No admin notification** when HR completes registration | Medium — admin has no visibility | P1 |
| **No HR-specific onboarding** — HR users land with no guided setup | Medium — incomplete UX | P1 |
| **Profile info not collected** for HR (first name, last name, job title, photo) | Medium — blank HR identity | P1 |
| **No membership revoke** for active members (only pre-registration invites) | High — no way to remove HR | P0 |
| **No session termination** on revoke — if revoked, existing tokens stay valid | Critical — security gap | P0 |
| **No web registration flow** — there is no Next.js web app for HR onboarding | High — enterprise HR uses web | P1 |
| **Invite list missing user info** — no way to see which HR members are active | Low | P2 |

---

## Proposed Implementation (To-Be)

### 3.1 Enhanced Company Admin Flow

The Company Admin flow remains largely the same but gains:

1. **Team Management Dashboard** — view all active HR members, their profiles, last activity.
2. **Revoke Member** capability — soft-delete a membership and instantly terminate all sessions.
3. **Invite status tracking** — see pending / accepted / expired / revoked invites with HR profile thumbnails once accepted.

#### New Admin Flow Steps

```
Registration → Email Verification → 3-Step Onboarding (unchanged)
                                              │
                                              ▼
                                 ┌────────────────────────┐
                                 │   Admin Dashboard Home  │
                                 │  ┌──────────────────┐  │
                                 │  │ Team Management  │  │
                                 │  │ ┌──────────────┐ │  │
                                 │  │ │ HR Members  │ │  │
                                 │  │ │ [Revoke]    │ │  │
                                 │  │ └──────────────┘ │  │
                                 │  │ ┌──────────────┐ │  │
                                 │  │ │ Invite HR   │ │  │
                                 │  │ │ [Send Email]│ │  │
                                 │  │ └──────────────┘ │  │
                                 │  └──────────────────┘  │
                                 └────────────────────────┘
```

---

### 3.2 Enhanced HR Registration Flow

#### Overview of Changes

| Aspect | Current | Proposed |
|---|---|---|
| Invite delivery | Raw token in API — admin shares manually | Branded magic-link email sent directly to HR |
| Platform detection | None | Auto-detect: web browser vs. mobile deep link |
| HR profile | Empty (no onboarding) | First name, last name, job title, profile photo |
| Email verification | OTP email sent during registration | Pre-verified by magic link OR OTP on mobile |
| Admin notification | None | Email + in-app notification when HR joins |
| Revoke post-join | Not possible | Soft-delete membership + token revocation |

#### Phase 1 — Admin Sends Invite (Enhanced)

```
POST /api/v1/company/invites
{
  "email": "hr@corp.com",
  "role": "hr"
}

Backend Actions:
  1. Validate admin role
  2. Revoke existing pending invites for same email+company
  3. Generate cryptographic token
  4. Store invite with hashed token + expires_at
  5. ← NEW → Dispatch HRInvitationMail job (queue: "emails")
     Email includes:
       - Personalized magic link (see below)
       - Company name & inviter name
       - Expiry date
       - Fallback: manual token shown if link expires

Response: { invite: { id, email, role, expires_at, invite_sent: true } }
  (Raw token NO LONGER returned in response for security)
```

#### Phase 2 — Magic Link Click & Platform Detection

```
Magic Link URL:  https://app.jobswipe.com/invite?token=<raw>&email=<email>

Platform Detection Logic:
  ┌─────────────────────────────┐
  │     User clicks link        │
  └────────────┬────────────────┘
               │
       ┌───────▼───────┐
       │  Is mobile?   │
       │ (User-Agent   │
       │  detection or │
       │  Universal    │
       │  Link)        │
       └───────┬───────┘
               │
       ┌───────┼──────────────┐
       │       │              │
       ▼       │              ▼
   Mobile App  │        Web Browser
   Deep Link   │      Next.js Web App
   Opens:      │      Opens:
   jobswipe:// │   /invite?token=&email=
   /invite?... │
               │
        Both redirect to:
        Token Validation → HR Profile Setup → Done
```

#### Phase 3 — HR Profile Collection (New Screens)

```
Screen 1: Welcome / Token Validation
  - Display: "You've been invited to join {CompanyName}"
  - Auto-validate token (or show error if expired)
  - "Get Started" CTA

Screen 2: Create Account
  - Email: pre-filled from invite (read-only)
  - Password + Confirm Password
  - Terms acceptance checkbox

Screen 3: Verify Email (mobile only — magic link pre-verifies on web)
  - OTP entry (6-digit)
  - "Resend Code" option

Screen 4: Personal Information
  - First Name * (required)
  - Last Name * (required)
  - Job Title * (required)
    ├── Dropdown presets: ["HR Manager", "Recruiter", "Talent Acquisition Specialist",
    │                      "People & Culture Lead", "Hiring Manager", "Other"]
    └── If "Other" selected → free-text input appears
  - (Optional) Profile Photo upload

Screen 5: Confirmation / Welcome
  - "You're now part of {CompanyName}!"
  - Quick links to HR dashboard
  - Admin notified in background
```

#### Phase 4 — Admin Notified

```
When HR completes:
  1. NotificationService::notify(adminUserId, "HR_JOINED") → stored in notifications table
  2. Dispatch HRJoinedMail to admin (queue: "emails")
  3. Push notification (future: FCM)
```

---

### 3.3 Admin Notification & Revoke System

#### Admin Revoke Flow

```
Admin Action — DELETE /api/v1/company/members/{userId}

Backend Actions:
  1. Validate caller is company_admin
  2. Look up CompanyMembership where company_id + user_id
  3. Verify target is NOT the company owner (cannot self-revoke or revoke owner)
  4. Soft-delete: update status = 'inactive'  (NOT user.is_banned)
  5. Immediately revoke ALL Sanctum tokens for that user
     → $user->tokens()->delete()
  6. Record audit: revoked_by_user_id, revoked_at on membership
  7. Notify revoked user (optional, configurable)

Response: { message: "Member access revoked. All sessions terminated." }
```

#### Soft-Delete Behavior (Security-Critical)

> **Important:** Revocation is a **membership-level** soft delete, **not** a user account ban.

| Field | Value After Revoke | Meaning |
|---|---|---|
| `company_memberships.status` | `'inactive'` | No longer authorized to act for this company |
| `users.is_banned` | unchanged (`false`) | User account still exists, not globally banned |
| `personal_access_tokens` | ALL DELETED | All sessions immediately invalidated |
| `company_invites` | unchanged | Historical record preserved |

The revoked HR user can still:
- Log in (they'll get a new token)
- Be re-invited later if admin chooses
- Access the app as a non-company user (no role-gated endpoints accessible)

#### Membership Status Check (Middleware Required)

All `role:hr,company_admin` endpoints must also validate `company_memberships.status = 'active'`. Without this check, a revoked but logged-in HR user could still call HR endpoints if their cached token exists.

```php
// Proposed: new middleware MembershipActiveMiddleware
// Checks: CompanyMembership where user_id = auth()->id() AND status = 'active'
// Applied to: role:hr,company_admin middleware group
```

---

### 3.4 Complete E2E Flow Diagrams

#### Proposed HR Registration Flow (Full)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HR REGISTRATION — PROPOSED (TO-BE)                        │
└─────────────────────────────────────────────────────────────────────────────┘

  Admin (Mobile/Web)       Backend            Email Service    HR Candidate
  ──────────────────       ───────            ─────────────    ────────────
         │                    │                    │                │
  POST /company/invites       │                    │                │
  { email, role:"hr" }        │                    │                │
  ───────────────────────────>│                    │                │
                              │ Validate admin      │                │
                              │ Revoke old invites  │                │
                              │ Store hashed token  │                │
                              │ Dispatch job ────────────────────>  │
                              │              HRInvitationMail       │
                              │                    │ Send email ──> │
  <───────────────────────────│                    │     [Branded Magic Link]
  { invite: {id,email,role,   │                    │                │
    expires_at,               │                    │                │
    invite_sent:true} }       │                    │                │
         │                    │                    │   [HR clicks link]
         │                    │                    │                │
         │                    │                    │         ┌──────▼──────┐
         │                    │                    │         │Platform Detect│
         │                    │                    │         └──────┬──────┘
         │                    │                    │         Mobile │  Web
         │                    │                    │           ▼    │   ▼
         │                    │                    │      Deep Link │ Browser
         │                    │                    │           ▼    │   ▼
         │                    │                    │      ┌─────────────────┐
         │                    │                    │      │  Token Validate  │
         │                    │                    │      │POST /invites/val.│
         │                    │                    │      └────────┬────────┘
         │                    │<───────────────────────── valid/invalid
         │                    │                    │                │
         │                    │                    │   ┌────────────▼───────────┐
         │                    │                    │   │  Screen: Create Account │
         │                    │                    │   │  email (prefilled)      │
         │                    │                    │   │  password               │
         │                    │                    │   └────────────┬───────────┘
         │                    │<─────────────────────── POST /auth/register
         │                    │  { email, password,│  role:"hr",    │
         │                    │    company_invite_token }           │
         │                    │ Validate token again│               │
         │                    │ [Mobile] Send OTP  │               │
         │                    │──────────────────────────────────> │
         │   (Web: magic link pre-verifies; skip OTP on web)       │
         │                    │<─────────────────────────────────── │
         │                    │   [Mobile] POST /auth/verify-email  │
         │                    │   [Web]    auto-verified by link    │
         │                    │                    │                │
         │                    │ BEGIN TRANSACTION  │                │
         │                    │ Create user        │                │
         │                    │ Accept invite      │                │
         │                    │ Create membership  │                │
         │                    │ Generate token     │                │
         │                    │ COMMIT             │                │
         │                    │──────────────────────────────────> │
         │                    │   { token, user }  │                │
         │                    │                    │                │
         │                    │                    │  ┌─────────────▼──────────┐
         │                    │                    │  │  Screen: Profile Setup  │
         │                    │                    │  │  - First Name           │
         │                    │                    │  │  - Last Name            │
         │                    │                    │  │  - Job Title (dropdown) │
         │                    │                    │  │  - Profile Photo        │
         │                    │                    │  └─────────────┬──────────┘
         │                    │<────────────────────────────────────│
         │                    │  POST /profile/hr/setup             │
         │                    │  { first_name, last_name,           │
         │                    │    job_title, photo_url }           │
         │                    │ Save HR profile    │                │
         │                    │ Notify admin ──────────────────────>│ (admin)
         │<────────────────── │ HRJoinedMail       │                │
   [Admin notification]       │                    │                │
   "HR joined!"               │──────────────────────────────────> │
                              │   HR Welcome Screen│                │
```

#### Admin Revoke Flow (Proposed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ADMIN REVOKE HR ACCESS                                │
└─────────────────────────────────────────────────────────────────────────────┘

  Admin App              Backend            PostgreSQL         HR User
  ─────────              ───────            ──────────         ───────
      │                     │                   │                 │
      │ DELETE /company/     │                   │                 │
      │ members/{userId}    │                   │                 │
      │────────────────────>│                   │                 │
      │                     │ Validate: admin    │                 │
      │                     │ Validate: target ≠ owner│           │
      │                     │ Update membership  │                 │
      │                     │ status='inactive' ─────────────────>│
      │                     │                   │                 │
      │                     │ Delete ALL tokens  │                 │
      │                     │ for target user   ─────────────────> (tokens gone)
      │                     │                   │                 │
      │                     │ Record: revoked_by,│                 │
      │                     │ revoked_at         │                 │
      │<────────────────────│                   │                 │
      │ { success: true,    │                   │  [HR next API call]
      │   "All sessions     │                   │        │        │
      │    terminated" }    │                   │  401 Unauthenticated
      │                     │                   │  (token deleted)
```

---

## Technical Specifications

### 4.1 Backend Changes

#### New Endpoints Required

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/company/members/{userId}/revoke` | 🔒 `company_admin` | Revoke HR membership + terminate sessions |
| `GET` | `/api/v1/company/members` | 🔒 `company_admin` | List active HR members with profile info |
| `POST` | `/api/v1/profile/hr/setup` | 🔒 Sanctum+verified (`hr`) | HR profile setup (name, job title, photo) |
| `POST` | `/api/v1/auth/magic-link/verify` | Public | Validate magic link token pre-registration |

#### New Service Methods Required

**`CompanyInvitationService`**
```php
// Send invitation email with magic link
public function sendInviteEmail(CompanyInvite $invite, string $rawToken, User $inviter): void;
```

**`CompanyMembershipService`**
```php
// Revoke membership and terminate sessions
public function revokeMember(string $companyId, string $adminUserId, string $targetUserId): void;

// List all active members with profile data
public function listMembers(string $companyId): Collection;

// Check if membership is active (for new middleware)
public function isActiveMember(string $companyId, string $userId): bool;
```

**`HRProfileService` (new service)**
```php
// Save HR personal profile (first name, last name, job title, photo)
public function saveHRProfile(string $userId, array $data): void;

// Get HR profile
public function getHRProfile(string $userId): array;
```

**`NotificationService` (extend)**
```php
// Notify admin of HR join
public function notifyHRJoined(string $adminUserId, string $hrUserId, string $companyId): void;
```

#### New Mail Classes Required

| Class | Queue | Purpose |
|---|---|---|
| `HRInvitationMail` | `emails` | Sends magic link to invited HR email |
| `HRJoinedMail` | `emails` | Notifies admin when HR completes registration |
| `MembershipRevokedMail` | `emails` | Optionally notifies revoked HR (configurable) |

#### New Middleware

```php
// app/Http/Middleware/MembershipActiveMiddleware.php
// Verifies that the authenticated user's membership in their company is 'active'
// Applied after role:hr,company_admin middleware
// Returns 403 if membership is 'inactive'
```

---

### 4.2 Database Schema Changes

#### New Column: `company_memberships`

```sql
-- Add audit columns for revoke tracking
ALTER TABLE company_memberships
  ADD COLUMN revoked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN revoked_at TIMESTAMPTZ NULL;

CREATE INDEX idx_company_memberships_revoked ON company_memberships(revoked_at)
  WHERE revoked_at IS NOT NULL;
```

#### New Table: `hr_profiles` (PostgreSQL)

```sql
CREATE TABLE hr_profiles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id   UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    first_name   VARCHAR(100) NOT NULL DEFAULT '',
    last_name    VARCHAR(100) NOT NULL DEFAULT '',
    job_title    VARCHAR(150) NOT NULL DEFAULT '',
    photo_url    TEXT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE INDEX idx_hr_profiles_company ON hr_profiles(company_id);
```

#### Updated `company_invites` Table

```sql
-- Track whether invite email was sent
ALTER TABLE company_invites
  ADD COLUMN invite_email_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN magic_link_clicked_at TIMESTAMPTZ NULL;
```

#### Laravel Migration (Proposed)

```php
// 2026_XX_XX_000001_add_revoke_audit_to_company_memberships.php
Schema::table('company_memberships', function (Blueprint $table) {
    $table->uuid('revoked_by_user_id')->nullable()->after('invited_by_user_id');
    $table->timestampTz('revoked_at')->nullable()->after('joined_at');
    $table->foreign('revoked_by_user_id')
          ->references('id')->on('users')
          ->onDelete('set null');
});

// 2026_XX_XX_000002_create_hr_profiles_table.php
Schema::create('hr_profiles', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
    $table->uuid('user_id')->unique();
    $table->uuid('company_id');
    $table->string('first_name', 100)->default('');
    $table->string('last_name', 100)->default('');
    $table->string('job_title', 150)->default('');
    $table->text('photo_url')->nullable();
    $table->timestampsTz();
    $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
    $table->foreign('company_id')->references('id')->on('company_profiles')->onDelete('cascade');
});
```

---

### 4.3 Email Templates

#### `HRInvitationMail` — Template Content

```
Subject: You've been invited to join {CompanyName} on JobSwipe

─────────────────────────────────────────────────────
  [JobSwipe Logo]

  Hi {HREmail},

  {InviterName} has invited you to join {CompanyName}
  as a member of their hiring team on JobSwipe.

  ┌──────────────────────────────┐
  │   Accept Invite & Get Started │ ← Magic Link Button
  └──────────────────────────────┘

  This invite link expires on {ExpiresAt}.

  If the button doesn't work, copy this link:
  https://app.jobswipe.com/invite?token={rawToken}&email={email}

  —
  JobSwipe Team
─────────────────────────────────────────────────────
```

#### `HRJoinedMail` — Template Content

```
Subject: {HRName} has joined your team on JobSwipe

─────────────────────────────────────────────────────
  [JobSwipe Logo]

  Hi {AdminName},

  Great news! {HRName} ({HREmail}) has accepted
  your invite and joined {CompanyName} as {Role}.

  [View Team] ← Links to team management dashboard

  —
  JobSwipe Team
─────────────────────────────────────────────────────
```

#### `MembershipRevokedMail` — Template Content

```
Subject: Your access to {CompanyName} on JobSwipe has been updated

─────────────────────────────────────────────────────
  [JobSwipe Logo]

  Hi {HRName},

  Your access to {CompanyName} on JobSwipe has been
  removed by an administrator.

  If you believe this is an error, please contact
  your company administrator.

  —
  JobSwipe Team
─────────────────────────────────────────────────────
```

---

### 4.4 Frontend Screens — Mobile App (React Native)

#### Screen: `InviteWelcomeScreen`

**Route:** Deep link `jobswipe://invite?token=&email=`  
**Purpose:** Entry point when HR user clicks magic link on mobile

**UI Elements:**
- Company logo (fetched via validate endpoint)
- Heading: "You've been invited to join [CompanyName]"
- Subtext: "As [Role] · Expires [Date]"
- Primary button: "Accept & Create Account"
- Secondary link: "I already have an account → Sign In"
- Error state: "This invite link is invalid or has expired." with support CTA

**API Call on mount:**
```
POST /api/v1/company/invites/validate
{ email: <from deep link>, token: <from deep link> }
```

---

#### Screen: `HRCreateAccountScreen`

**Route:** After welcome screen
**Purpose:** Email/password entry for new HR account

**UI Elements:**
- Email field (pre-filled from invite, read-only, grayed out)
- Password field (secure, min 8 chars, strength indicator)
- Confirm password field
- Terms & Privacy checkbox (required)
- "Create Account" button

**API Call:**
```
POST /api/v1/auth/register
{
  "email": "<invite email>",
  "password": "<user input>",
  "role": "hr",
  "company_invite_token": "<token from deep link>"
}
```

---

#### Screen: `HRVerifyEmailScreen`

**Route:** After successful registration (mobile only)
**Purpose:** OTP verification

**UI Elements:**
- 6-cell OTP input (auto-advance)
- "Resend Code" with 60s cooldown timer
- Email displayed: "Code sent to {email}"
- Info text: "Check your inbox for a 6-digit code"

**API Calls:**
```
POST /api/v1/auth/verify-email  { email, code }
POST /api/v1/auth/resend-verification  { email }
```

---

#### Screen: `HRProfileSetupScreen`

**Route:** After email verification
**Purpose:** Collect HR personal information

**UI Elements:**
- Progress bar (1 step, optional)
- First Name input (required, max 100 chars)
- Last Name input (required, max 100 chars)
- Job Title field:
  - Dropdown (presets):
    ```
    [ HR Manager, Recruiter, Talent Acquisition Specialist,
      People & Culture Lead, Hiring Manager, HR Generalist, Other ]
    ```
  - When "Other" selected: text input appears below (max 150 chars)
- Profile Photo (optional):
  - Camera icon / placeholder avatar
  - "Upload Photo" CTA → triggers S3 presigned URL flow
  - Preview of selected photo
- "Complete Setup" button (disabled until first_name + last_name + job_title filled)

**API Call:**
```
POST /api/v1/profile/hr/setup
Authorization: Bearer <token>
{
  "first_name": "Jane",
  "last_name": "Smith",
  "job_title": "Recruiter",
  "photo_url": "https://cdn.jobswipe.com/..."  // optional
}
```

---

#### Screen: `HRWelcomeScreen`

**Route:** After profile setup
**Purpose:** Onboarding complete confirmation

**UI Elements:**
- Animated check icon / celebration lottie
- Heading: "Welcome to [CompanyName]!"
- Subtext: "You're ready to start reviewing candidates."
- Button: "Go to Dashboard"

---

#### Screen: `AdminTeamManagementScreen` (Enhanced)

**Route:** Admin dashboard → Team tab
**Purpose:** View and manage HR team members

**UI Elements:**
- Section: Active Members
  - List of HR profiles: avatar, name, job title, email, "Joined [date]"
  - Per-member actions: "Revoke Access" button
- Section: Pending Invites
  - List: email, role, "Sent [date]", "Expires [date]", status badge
  - Per-invite actions: "Revoke Invite" (if pending), re-send button
- "Invite HR Member" FAB button

**Revoke Confirmation Modal:**
```
⚠ Revoke Access
"Remove Jane Smith from [CompanyName]?
 All active sessions will be terminated immediately."
[ Cancel ]  [ Revoke Access ]
```

**API Calls:**
```
GET  /api/v1/company/members
DELETE /api/v1/company/members/{userId}/revoke
GET  /api/v1/company/invites
DELETE /api/v1/company/invites/{inviteId}
```

---

### 4.5 Frontend Screens — Web App (Next.js)

> The web app targets HR professionals who may receive the invite on a desktop/laptop. Routes below follow Next.js App Router convention.

#### Page: `/invite` — Invite Landing Page

**File:** `app/invite/page.tsx`  
**Purpose:** Magic link landing — validate token and begin HR registration

**UI Elements:**
- Auto-reads `?token=` and `?email=` from URL query params
- Loading state while validating token
- On success: company branding, role badge, "Get Started" CTA
- On failure: error card with "Contact your administrator"

**Interaction:**
```typescript
// On mount
const res = await fetch('/api/v1/company/invites/validate', {
  method: 'POST',
  body: JSON.stringify({ email, token })
});
// If valid → redirect to /invite/register
```

---

#### Page: `/invite/register` — HR Account Creation (Web)

**File:** `app/invite/register/page.tsx`  
**Purpose:** Email/password form (email pre-filled)

**UI Elements:**
- Company logo header
- "You're registering as [Role] at [CompanyName]"
- Email: read-only, pre-filled
- Password with strength meter
- Confirm Password
- Terms checkbox
- "Create Account" button

---

#### Page: `/invite/profile` — HR Profile Setup (Web)

**File:** `app/invite/profile/page.tsx`  
**Purpose:** Collect name, job title, photo

**UI Elements:**
- Two-column layout (desktop)
  - Left: form fields (first name, last name, job title dropdown + custom)
  - Right: photo upload with drag-and-drop + preview
- "Next: Go to Dashboard" button

> **Note:** On web, email is pre-verified by the magic link, so the OTP step is skipped. The registration flow should pass a `magic_link_verified: true` flag (or a pre-auth token) to skip OTP on the backend.

---

#### Page: `/invite/success` — Onboarding Complete (Web)

**File:** `app/invite/success/page.tsx`  
**Purpose:** Confirmation screen with dashboard link

---

#### Admin Web Pages (Within Company Dashboard)

**Page:** `/dashboard/team`
- Similar to mobile team management screen
- Richer table view with sortable columns
- Bulk invite capability (paste multiple emails)
- Export team list to CSV

**Page:** `/dashboard/team/invite`
- Invite form: email(s), role selector, custom message (optional)

---

### 4.6 API Request/Response Examples

#### Create Invite (Enhanced — No Raw Token in Response)

```http
POST /api/v1/company/invites
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "jane@corp.com",
  "role": "hr"
}
```

```json
{
  "success": true,
  "message": "Invite sent successfully.",
  "data": {
    "invite": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "jane@corp.com",
      "role": "hr",
      "status": "pending",
      "expires_at": "2026-04-23T05:30:00Z",
      "invite_email_sent_at": "2026-04-16T05:30:00Z",
      "created_at": "2026-04-16T05:30:00Z"
    }
  }
}
```

#### Validate Magic Link Token

```http
POST /api/v1/company/invites/validate
Content-Type: application/json

{
  "email": "jane@corp.com",
  "token": "a3f8b2c1..."
}
```

```json
{
  "success": true,
  "data": {
    "valid": true,
    "company_name": "TechCorp Inc.",
    "company_logo_url": "https://cdn.jobswipe.com/logos/techcorp.png",
    "role": "hr",
    "inviter_name": "John Admin",
    "expires_at": "2026-04-23T05:30:00Z"
  }
}
```

#### HR Register with Invite Token

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "jane@corp.com",
  "password": "securePassword123!",
  "role": "hr",
  "company_invite_token": "a3f8b2c1..."
}
```

```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "data": {
    "email": "jane@corp.com"
  }
}
```

#### HR Profile Setup

```http
POST /api/v1/profile/hr/setup
Authorization: Bearer <hr_token>
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith",
  "job_title": "Recruiter",
  "photo_url": "https://cdn.jobswipe.com/photos/abc123.jpg"
}
```

```json
{
  "success": true,
  "message": "Profile saved successfully.",
  "data": {
    "first_name": "Jane",
    "last_name": "Smith",
    "job_title": "Recruiter",
    "photo_url": "https://cdn.jobswipe.com/photos/abc123.jpg",
    "company_id": "550e8400-e29b-41d4-a716-446655440000",
    "company_name": "TechCorp Inc."
  }
}
```

#### List Team Members

```http
GET /api/v1/company/members
Authorization: Bearer <admin_token>
```

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440010",
        "email": "jane@corp.com",
        "first_name": "Jane",
        "last_name": "Smith",
        "job_title": "Recruiter",
        "photo_url": "https://cdn.jobswipe.com/photos/abc123.jpg",
        "membership_role": "hr",
        "status": "active",
        "joined_at": "2026-04-16T06:00:00Z"
      }
    ],
    "total": 1
  }
}
```

#### Revoke Member

```http
DELETE /api/v1/company/members/550e8400-e29b-41d4-a716-446655440010/revoke
Authorization: Bearer <admin_token>
```

```json
{
  "success": true,
  "message": "Member access revoked. All sessions terminated immediately.",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440010",
    "status": "inactive",
    "revoked_at": "2026-04-16T07:00:00Z"
  }
}
```

#### Error Responses

```json
// 403 — Not an admin
{
  "success": false,
  "error": "INVITE_FORBIDDEN",
  "message": "Only company admins can create invites."
}

// 400 — Cannot revoke company owner
{
  "success": false,
  "error": "CANNOT_REVOKE_OWNER",
  "message": "The company owner cannot be revoked."
}

// 404 — Member not found
{
  "success": false,
  "error": "MEMBER_NOT_FOUND",
  "message": "Member not found in this company."
}
```

---

## Security Considerations

### Token Security

| Concern | Mitigation |
|---|---|
| Invite token brute-force | Token is 32 random bytes (64-hex), sha256-hashed in DB — computationally infeasible |
| Token replay attack | Token can only be used once (`accepted_at` set atomically in transaction) |
| Raw token exposure | **Proposed:** Token no longer returned in API response — only delivered via email |
| Token expiry | Hard expiry at 7 days (`expires_at`), checked on every validation |
| Old invite re-use | Previous pending invites auto-revoked before new one issued |

### Session Termination on Revoke

- All Sanctum tokens for the revoked user are deleted immediately: `$user->tokens()->delete()`
- This covers tokens from all devices/sessions simultaneously
- Revoked HR user will receive 401 on their next API call
- **No grace period** — termination is instant

### Membership Active Check

The current role-checking middleware (`role:hr,company_admin`) only validates `users.role`. It does **not** check if the user's `company_memberships.status` is `'active'`. This means a revoked HR user with a cached token could still call HR endpoints between revocation and their next 401.

**Fix Required:** Add `MembershipActiveMiddleware` to check `company_memberships.status = 'active'` for every authenticated HR/admin request.

### Magic Link Security

- Links include both `token` and `email` — both must match
- Platform-aware routing prevents token interception via URL redirects
- HTTPS enforced
- Magic links should work only once per email (re-clicking re-validates but re-uses same invite)

### OTP Security

- 6-digit codes, max 5 attempts, then blocked
- Attempt counter persisted in Redis
- `hash_equals()` used for constant-time comparison
- OTP data cleared after successful verification

---

## Implementation Checklist

### Backend Tasks

#### Phase 1 — Email Invite (P0)
- [ ] Create `HRInvitationMail` Mailable class
  - [ ] Blade email template with magic link
  - [ ] Company name, inviter name, expiry date
- [ ] Modify `CompanyInvitationService::createInvite()` to dispatch `HRInvitationMail`
- [ ] Update `company_invites` table: add `invite_email_sent_at`, `magic_link_clicked_at`
- [ ] **Remove raw token from API response** (return only invite metadata)
- [ ] Add `POST /api/v1/auth/magic-link/verify` endpoint (public, pre-registration validation)

#### Phase 2 — HR Profile (P1)
- [ ] Create migration: `create_hr_profiles_table`
- [ ] Create `HRProfile` Eloquent model with relationships
- [ ] Create `HRProfileService` with `saveHRProfile()` and `getHRProfile()`
- [ ] Create route: `POST /api/v1/profile/hr/setup` (auth: `hr`)
- [ ] Create `HRProfileController`
- [ ] Validate: first_name, last_name required; job_title required (dropdown values or custom)
- [ ] Add `hr_profile` relationship to `User` model

#### Phase 3 — Admin Team Management (P0)
- [ ] Create route: `GET /api/v1/company/members`
- [ ] Implement `CompanyMembershipService::listMembers()` — joins `hr_profiles` for profile data
- [ ] Create route: `DELETE /api/v1/company/members/{userId}/revoke`
- [ ] Implement `CompanyMembershipService::revokeMember()`:
  - [ ] Validate admin & ownership rules
  - [ ] Set `status = 'inactive'`, `revoked_at`, `revoked_by_user_id`
  - [ ] `$user->tokens()->delete()` — instant session termination
- [ ] Migration: add `revoked_by_user_id`, `revoked_at` to `company_memberships`

#### Phase 4 — Admin Notification (P1)
- [ ] Create `HRJoinedMail` Mailable class + Blade template
- [ ] Extend `NotificationService` with `notifyHRJoined()`
- [ ] Dispatch notification + mail at the end of `AuthService::completeRegistration()` for HR invites

#### Phase 5 — Membership Active Guard (P0 — Security)
- [ ] Create `MembershipActiveMiddleware`
  - [ ] Look up `CompanyMembership` for `auth()->id()` + company resolved from profile
  - [ ] Return 403 `MEMBERSHIP_INACTIVE` if status = 'inactive'
- [ ] Register middleware in `Kernel.php`
- [ ] Apply to `role:hr,company_admin` middleware group

#### Phase 6 — Web Magic Link Support (P1)
- [ ] Decide on web URL scheme: `https://app.jobswipe.com/invite?token=&email=`
- [ ] Implement platform detection logic in email (or use Universal Links)
- [ ] Backend: support `magic_link_verified = true` flag on registration to skip OTP on web
- [ ] OR: issue a short-lived pre-auth token on magic link validation used in registration

---

### Frontend Tasks (Mobile — React Native)

- [ ] `InviteWelcomeScreen` — deep link entry, token validation
- [ ] `HRCreateAccountScreen` — registration form (email pre-filled)
- [ ] `HRVerifyEmailScreen` — OTP entry
- [ ] `HRProfileSetupScreen` — name, job title dropdown (with "Other" custom input), photo
- [ ] `HRWelcomeScreen` — onboarding complete confirmation
- [ ] `AdminTeamManagementScreen` — HR member list with revoke, invite list with revoke
- [ ] Revoke confirmation modal (with warning copy)
- [ ] Deep link configuration (`jobswipe://invite`) in `app.json` and Universal Links entitlements
- [ ] Photo upload flow: request `POST /files/upload-url`, upload to S3, confirm via `POST /files/confirm-upload`

### Frontend Tasks (Web — Next.js)

- [ ] `app/invite/page.tsx` — magic link landing page
- [ ] `app/invite/register/page.tsx` — account creation
- [ ] `app/invite/profile/page.tsx` — HR profile setup (name, job title, photo)
- [ ] `app/invite/success/page.tsx` — confirmation
- [ ] `app/dashboard/team/page.tsx` — admin team management table
- [ ] `app/dashboard/team/invite/page.tsx` — invite form (single + bulk)
- [ ] API client updates: new endpoints for members, revoke, HR profile

---

### Testing Requirements

#### Backend (PHPUnit Feature Tests)

| Test | Description |
|---|---|
| `HRInvitationEmailTest` | Verify email is queued when invite created; verify template content |
| `MagicLinkValidationTest` | Valid token, expired token, already-accepted token, wrong email |
| `HRRegistrationWithMagicLinkTest` | Full E2E: invite → register → verify → profile setup |
| `MembershipRevokeTest` | Admin revokes HR; tokens deleted; HR gets 401 on next call |
| `CannotRevokeOwnerTest` | Admin cannot revoke the company owner |
| `RevokedMemberCannotCallHREndpointsTest` | After revoke, cached token still returns 403 |
| `MembershipActiveMiddlewareTest` | Active member: passes; inactive member: 403 |
| `HRProfileSetupTest` | Valid setup; missing first_name; invalid job_title |
| `ListMembersTest` | Only admins can list; includes HR profile data |
| `AdminNotificationOnHRJoinTest` | Notification record created + mail dispatched |

#### Manual Testing Scenarios

1. **Happy path:** Admin invites → HR receives email → clicks magic link on mobile → registeres → fills profile → admin sees notification
2. **Expired invite:** HR clicks link after 7 days → sees error screen
3. **Already accepted invite:** HR clicks link again → handled gracefully (re-validate and show already-joined state)
4. **Revoke while HR is online:** Admin revokes → HR's next API call returns 401
5. **Owner revoke attempt:** Admin tries to revoke the company owner → 400 error
6. **Cross-company attack:** HR of Company A tries to call Company B's endpoints → 403

---

### Deployment Considerations

- **Queue workers:** Ensure `emails` queue worker is running in production. New mail jobs are dispatched to the `emails` queue.
- **Environment variable:** Add `APP_URL` / `WEB_APP_URL` for magic link base URL generation.
- **Deep link setup:** iOS Universal Link entitlement file (`apple-app-site-association`) and Android App Links config must include the `/invite` path.
- **Migration order:** Run migrations in order — `revoke_audit` columns first, then `hr_profiles` table. Both are additive, no destructive changes.
- **Feature flag:** Consider gating the enhanced invite email behind a feature flag (`FEATURE_INVITE_EMAIL=true`) to allow phased rollout.
- **Redis:** OTP TTL should be reviewed — ensure HR invite OTPs don't expire before HR finishes profile setup (current TTL should be ≥ 15 mins).
- **Rate limiting:** The new `POST /profile/hr/setup` endpoint should be rate-limited to prevent DoS via profile updates.
- **CORS:** If the web app is on a different domain from the API, ensure CORS policy allows the web origin for invite endpoints.

---

*End of Document*

---

> **Document maintained by:** Engineering Team  
> **Review cycle:** Before each sprint that touches auth or membership flows  
> **Related documents:**  
> - `mdfiles/documentation.md` — Platform-wide API documentation  
> - `mdfiles/implementations.md` — Implementation history  
> - `backend/ROUTES_REFERENCE.md` — Complete route listing
