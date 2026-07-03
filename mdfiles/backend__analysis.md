# JobSwipe Backend — Codebase Analysis Report

> **Analyzed:** 2026-03-31  
> **Stack:** Laravel 11 · PostgreSQL 16 · MongoDB 7 · Redis 7  
> **Pattern:** MVC + Service Layer + Repository Layer  
> **Codebase Size:** ~15 services, 8 controllers, 13 repositories, 10 PG models, 3 Mongo models, 20 migrations

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Strengths (The Good)](#3-strengths-the-good)
4. [Criticisms (The Bad)](#4-criticisms-the-bad)
5. [Code Smells & Minor Issues](#5-code-smells--minor-issues)
6. [Documentation Gap Analysis](#6-documentation-gap-analysis)
7. [Overall Rating](#7-overall-rating)
8. [Prioritized Recommendations](#8-prioritized-recommendations)

---

## 1. Executive Summary

The JobSwipe backend is a **well-architected Laravel 11 API** that demonstrates genuine architectural maturity. The multi-database pattern (PostgreSQL + MongoDB + Redis) is correctly partitioned, the Service/Repository layer separation is clean, and the swipe deduplication system with Redis → MongoDB fallback is production-grade. **However**, there are significant gaps between what the documentation promises and what has been implemented, debug routes are leaking in production, tests are unit-only with no integration coverage, and several features described in the architecture documents are entirely missing from the codebase.

---

## 2. Architecture Overview

```
HTTP Request
    │
    ▼
Route → FormRequest (validation)
    │
    ▼
Controller (thin — reads request, calls service, returns JSON)
    │
    ▼
Service (business logic orchestration)
    │
    ├──▶  Redis Repository (fast path cache)
    │          │ on miss
    │          └──▶  MongoDB Repository (fallback + profile storage)
    │
    ├──▶  PostgreSQL Repository (transactional writes)
    │
    └──▶  Job dispatch (Redis → Horizon → notification/email)
```

**Database Responsibility Split:**

| Database | Responsibility |
|-----------|-------|
| PostgreSQL | Users, profiles (relational), subscriptions, applications, job postings, points, notifications |
| MongoDB | Applicant/Company profile documents, swipe history |
| Redis | Swipe dedup cache, daily counters, OTP storage, points cache, queue backend |

---

## 3. Strengths (The Good)

### 3.1 ✅ Excellent Layer Separation

Controllers are genuinely thin. Every controller method follows the same pattern: validate → call service → return response. Business logic never leaks into controllers. This is textbook Laravel architecture and makes the codebase easy to navigate.

```
AuthController → AuthService → UserRepository / OTPService / TokenService
SwipeController → SwipeService → SwipeCacheRepository / SwipeHistoryRepository
ProfileController → ProfileService → ApplicantProfileDocumentRepository / CompanyProfileDocumentRepository
```

### 3.2 ✅ Robust Swipe Deduplication System

The Redis-first → MongoDB-fallback pattern for swipe deduplication is well-implemented across both applicant and HR sides. Cache miss handling correctly rehydrates Redis, and the `SwipeCacheRepository` properly implements TTLs:

- Counter keys: auto-expire at midnight PHT
- Deck seen sets: 90-day TTL
- HR seen sets: 90-day TTL
- Points cache: 10-minute TTL

### 3.3 ✅ Proper Transaction Handling

The codebase uses `DB::transaction()` consistently for multi-store writes. Notably, `SwipeService::applicantSwipeRight()` writes to MongoDB first, then wraps the PostgreSQL write in a transaction with **manual MongoDB rollback** on failure — this is a sophisticated compensating transaction pattern that most codebases get wrong.

```php
// MongoDB write first
$swipeDoc = $this->swipeHistory->recordSwipe([...]);

try {
    DB::transaction(function () use ($applicant, $jobId) {
        $this->applications->create($applicant->id, $jobId);
        $applicant->increment('daily_swipes_used');
    });
} catch (\Throwable $e) {
    // Rollback MongoDB write if PostgreSQL fails
    if ($swipeDoc && $swipeDoc->_id) {
        $this->swipeHistory->deleteById($swipeDoc->_id);
    }
    throw $e;
}
```

### 3.4 ✅ Idempotent Stripe Checkout

`SubscriptionService` implements a **database-backed idempotency system** for Stripe checkout sessions. This prevents duplicate checkout creation from double-clicks or network retries. The implementation includes:

- Request fingerprinting with SHA-256
- TTL-based expiration with configurable window
- In-progress detection to handle concurrent requests
- Stripe's native `idempotency_key` passthrough

### 3.5 ✅ Clean Webhook Event Deduplication

The `reserveWebhookEvent()` method uses a unique insert to prevent reprocessing Stripe webhook events, catching both `23000` (MySQL) and `23505` (PostgreSQL) SQL states for duplicate key violations.

### 3.6 ✅ Consistent Response Format

The base `Controller` class enforces a uniform JSON envelope:
```json
{ "success": true, "data": {...}, "message": "OK" }
{ "success": false, "message": "...", "code": "ERROR_CODE" }
```

Error codes are descriptive and machine-parseable (e.g., `SWIPE_LIMIT_REACHED`, `OTP_EXPIRED`, `LISTING_LIMIT_REACHED`).

### 3.7 ✅ Deck Algorithm with Relevance Scoring

`DeckService` implements a multi-factor relevance scoring system:
- **Skill matching** (70% weight) — intersection of applicant skills vs. job requirements
- **Recency score** (30% weight) — decay curve based on days since publication
- **Location bonus** (+0.10) — same-city match
- **Remote bonus** (+0.05) — remote jobs boost

Cursor-based pagination prevents expensive offset queries on large datasets.

### 3.8 ✅ Smart Registration Flow (OTP via Redis)

The registration flow stores pending registration data (hashed password + role) in Redis with OTP verification as a gate. The user record is only created in PostgreSQL after OTP verification succeeds — this prevents unverified accounts from polluting the database.

### 3.9 ✅ Proper Linting & Code Style

The project uses Laravel Pint for code formatting and the code is consistently styled (constructor promotion, match expressions, named arguments).

### 3.10 ✅ Comprehensive Singleton Registration

`AppServiceProvider` registers all repositories and services as singletons with correct dependency ordering — repositories first, then services that depend on them.

---

## 4. Criticisms (The Bad)

### 4.1 🔴 CRITICAL — Debug Routes Exposed in Production

The `api.php` file contains **four debug/diagnostic routes** that are publicly accessible with no authentication:

```
GET  /api/clear-cache         — Runs artisan route:clear, config:clear, cache:clear
GET  /api/debug/email-config  — Exposes SMTP host, port, queue config, Redis keys
POST /api/debug/test-email    — Sends arbitrary emails to any address
GET  /api/debug/database      — Lists ALL database tables with row counts + ALL Redis keys
```

> [!CAUTION]
> These routes expose internal infrastructure details (SMTP credentials status, Redis key names, database table names and counts) and allow arbitrary cache clearing and email sending. These must be removed or gated behind `super_admin` auth **immediately**.

### 4.2 🔴 CRITICAL — No Repository Interface Contracts

The architecture doc (`jobswipe-laravel-architecture.md`) specifies a `Repositories/Contracts/` directory with interfaces like `SwipeRepositoryInterface` and `ApplicationRepositoryInterface`. **None of these exist in the actual codebase.** Every service depends on concrete repository classes, making it impossible to swap implementations (e.g., for testing with in-memory stores).

### 4.3 ~~🔴 HIGH — PointService Registered Twice as Singleton~~ ✅ FIXED

~~In `AppServiceProvider.php` lines 88 and 90:~~

```php
$this->app->singleton(PointService::class);  // line 88
$this->app->singleton(PointService::class);  // line 90 — DUPLICATE
```

> **Status (2026-04-02):** ✅ Fixed — Duplicate removed. Single registration at line 88.

### 4.4 🔴 HIGH — No Feature/Integration Tests

The project has **zero feature tests**. The `tests/Feature/` directory contains only a `.gitkeep` file. All 18 existing tests are unit tests that mock dependencies. There are **no tests that hit actual endpoints** and validate:

- Route → middleware → controller → service → database flow
- Authentication and authorization enforcement
- Subscription gating logic end-to-end
- Webhook signature verification

### 4.5 ~~🟡 MEDIUM — Inconsistent Use of `app()` Service Locator~~ ✅ FIXED

~~`AuthService::initiateForgotPassword()` uses `app(PasswordResetService::class)` directly instead of constructor injection.~~

> **Status (2026-04-02):** ✅ Fixed — `PasswordResetService` is now injected via constructor in `AuthService` (line 20). Also registered as a singleton in `AppServiceProvider` (line 94). No more `app()` locator usage.

### 4.6 ~~🟡 MEDIUM — Loose Type Coercion in OTP Verification~~ ✅ FIXED

~~In `OTPService::verify()`:~~

```php
if ($stored === null) {  // NOW STRICT COMPARISON ✅
    return 'expired';
}
```

> **Status (2026-04-02):** ✅ Fixed — Now uses strict `===` comparison.

### 4.7 ~~🟡 MEDIUM — `ProfileService` Constructor Bypasses DI~~ ✅ FIXED

~~The `?? new X()` fallbacks created instances outside the container, losing the ability to mock/override them in testing.~~

> **Status (2026-04-02):** ✅ Fixed — `ProfileService` constructor now uses clean, non-nullable dependency injection. All three services (`ProfileCompletionService`, `ProfileOnboardingService`, `ProfileSocialLinksValidator`) are resolved through the container. No more manual instantiation.

### 4.8 🟡 MEDIUM — No Factory/Seeder Implementation

`DatabaseSeeder.php` is completely empty with only placeholder comments. There are **no model factories** and **no data seeders**. This means:
- No way to quickly populate a dev environment
- No way to run reproducible tests with realistic data
- No way to demo the application without manual data entry

### 4.9 ~~🟡 MEDIUM — OAuthController Doesn't Use Base Controller Helpers~~ ✅ FIXED

~~`OAuthController::handleGoogleCallback()` constructs raw `response()->json()` responses instead of using the inherited `$this->success()` / `$this->error()` helpers, breaking the consistent response format pattern.~~

> **Status (2026-04-02):** ✅ Fixed — `OAuthController` now extends `Controller` which uses the `ApiResponse` trait. All methods use `$this->success()` and `$this->error()`.

### 4.10 ~~🟡 MEDIUM — No Global Exception Handler~~ ✅ FIXED

~~There is no custom exception handler registered in `bootstrap/app.php` or an `Exceptions/Handler.php`. Unhandled exceptions will use Laravel's default JSON formatting, which may expose stack traces in production and won't follow the `{success, message, code}` envelope.~~

> **Status (2026-04-02):** ✅ Fixed — `bootstrap/app.php` now has `withExceptions()` with three custom renderers: `ValidationException` (400), `NotFoundHttpException` (404), `ApiErrorException` (500). All follow the `{success, message, code}` envelope. Also uses `shouldRenderJsonWhen` for all `api/*` routes.

### 4.11 🟡 MEDIUM — `SwipeService` Queries Models Directly

Despite having an `ApplicantProfileRepository`, the `SwipeService` queries the `ApplicantProfile` model directly:

```php
$applicant = ApplicantProfile::where('user_id', $userId)->firstOrFail();
```

This violates the repository pattern that the rest of the codebase follows. The service should use `$this->applicantProfiles->findByUserId()`.

---

## 5. Code Smells & Minor Issues

### 5.1 ⚠️ `PasswordResetService` Not Registered in AppServiceProvider

`PasswordResetService` is used via `app()` locator but never explicitly registered as a singleton in `AppServiceProvider`. It will work (Laravel auto-resolves), but it's inconsistent with the pattern used for all other services.

### 5.2 ⚠️ Missing `extra_swipe_balance` Field Reference

The `CheckSwipeLimit` middleware references `$applicant->extra_swipe_balance`, but the PostgreSQL migration uses `extra_swipes_balance` (plural). This would cause an `Undefined property` error unless there's a model accessor — which there isn't in `ApplicantProfile.php`.

### 5.3 ⚠️ Router Binding Override in Production

```php
if (app()->environment('production')) {
    app()->bind('router', function ($app) {
        $router = new Router($app['events'], $app);
        $router->macro('routesAreCached', fn() => false);
        return $router;
    });
}
```

This is a **nuclear workaround** for Render.com's route caching. It replaces the entire router instance, which could break service providers that registered routes before this binding. This should be documented prominently and ideally solved at the deployment level.

### 5.4 ~~⚠️ Hardcoded Timezone~~ ✅ FULLY FIXED

~~`SwipeCacheRepository` hardcodes `'Asia/Manila'` for counter key generation.~~

> **Status (2026-04-02):** ✅ Fully fixed — All three methods now use `config('app.timezone')`: `counterKey()`, `incrementCounter()`, and `refreshCounter()`.

### 5.5 ⚠️ N+1 Risk in `DeckService::getJobDeck()`

The `totalUnseen` count at line 83 runs a separate query that repeats the `whereNotIn('id', $seenJobIds)` check. On large datasets with thousands of seen IDs, this `WHERE id NOT IN (...)` clause can be very slow.

### 5.6 ⚠️ No API Versioning Middleware

Routes are grouped under `/v1/` as a prefix, but there's no versioning middleware or header-based versioning. When v2 arrives, the lack of proper versioning infrastructure will cause migration pain.

### 5.7 ⚠️ Migration File Naming Typo

`2026_03_30_154746_create_passwrd_reset_tokens_table.php` — "password" is misspelled as "passwrd".

---

## 6. Documentation Gap Analysis

### Comparing `documentation.md` vs. Actual Implementation

| Feature / Module | Documented? | Implemented? | Notes |
|---|:---:|:---:|---|
| **Auth: Email/Password registration** | ✅ | ✅ | Working with OTP flow |
| **Auth: Google OAuth** | ❌ (docs say "v2") | ✅ | Implemented ahead of docs — OAuthController exists |
| **Auth: Forgot/Reset Password** | ✅ | ✅ | Working |
| **Swipe: Applicant right/left** | ✅ | ✅ | Fully implemented |
| **Swipe: HR right/left** | ✅ | ✅ | Fully implemented |
| **Swipe: Undo last swipe (Pro)** | ✅ | ❌ | **Not implemented** — no route, no service method |
| **Job Postings: CRUD** | ✅ | ✅ | Working with skills, listing limits |
| **Job Postings: Publish/Draft flow** | ✅ | ⚠️ | Jobs go active immediately on creation; no `draft` → `publish` separate flow |
| **Job Postings: 60-day expiration** | ✅ | ⚠️ | Code uses 30-day default, docs say 60 |
| **Subscriptions: Stripe checkout** | ✅ | ✅ | Company-side only. Robust idempotency. |
| **Subscriptions: Apple IAP** | ✅ | ✅ | ✅ **Implemented (2026-04-02)** — `AppleReceiptValidator` + `AppleWebhookController` + `AppleWebhookVerifierService` (JWS + cert chain) |
| **Subscriptions: Google Play Billing** | ✅ | ✅ | ✅ **Implemented (2026-04-02)** — `GoogleReceiptValidator` + `GoogleWebhookController` + `GooglePubSubWebhookVerifierService` (OIDC) + `GooglePlaySubscriptionStateResolverService` |
| **Subscriptions: Applicant subscriptions** | ✅ | ✅ | ✅ **Implemented (2026-04-02)** — `IAPService` + `ApplicantSubscriptionManager` + routes |
| **Swipe Packs (extra swipes purchase)** | ✅ | ✅ | ✅ **Implemented (2026-04-02)** — `SwipePackManager` + `IAPService` + `SwipePackRepository` |
| **Points System** | ✅ | ✅ | Working with event map + Redis cache |
| **Company Reviews** | ✅ | ⚠️ | Model + migration exist, **no controller or routes** |
| **Review Access Control (tier-gated)** | ✅ | ❌ | No implementation |
| **Notifications: In-app** | ✅ | ✅ | Full CRUD with read/unread |
| **Notifications: Push (Expo)** | ✅ | ⚠️ | Service has `sendPush()` but body is `// TODO: EXPO NOTIFICATION` |
| **Notifications: Email** | ✅ | ✅ | Working via queued Mailables |
| **File Upload: Pre-signed URLs** | ✅ | ✅ | R2-compatible S3 implementation |
| **Admin Panel APIs** | ✅ | ❌ | **No admin routes, controllers, or services** |
| **Admin: Verification queue** | ✅ | ❌ | Not implemented |
| **Admin: Review moderation** | ✅ | ❌ | Not implemented |
| **Admin: User management** | ✅ | ❌ | Not implemented |
| **Admin: Dashboard metrics** | ✅ | ❌ | Not implemented |
| **Company Verification workflow** | ✅ | ⚠️ | Documents can be submitted, but no approval/rejection flow |
| **Applicant Applications list** | ✅ | ❌ | No `ApplicationController` — docs show `GET /applicant/applications` |
| **Token expiry & refresh** | ✅ (30 days) | ⚠️ | No explicit token expiry configuration found |
| **Cloudflare R2 signed URLs for private files** | ✅ | ⚠️ | Pre-signed upload works, but no signed read access for resumes/CVs |
| **Meilisearch full-text search** | ✅ | ✅ | `Searchable` trait on `JobPosting`, scout configured |
| **CI/CD Pipeline (GitHub Actions)** | ✅ | ❌ | No `.github/workflows/` files found in backend |
| **PHPStan static analysis** | ✅ | ❌ | Not in dev dependencies |
| **Sentry error monitoring** | ✅ | ❌ | Not in composer.json dependencies |
| **PII encryption at rest** | ✅ | ❌ | No column-level encryption on `email` or `password_hash` |
| **HR applicant queue (5-tier priority)** | ✅ | ⚠️ | `ApplicationRepository` has `getPrioritizedApplicants()` but uses simple filter, not full priority CASE |

### Comparing `jobswipe-laravel-architecture.md` vs. Actual Implementation

| Architectural Decision | Documented? | Implemented As Documented? | Delta |
|---|:---:|:---:|---|
| Namespace `Models/Postgres/` | ✅ | ❌ | Actual: `Models/PostgreSQL/` |
| Namespace `Models/Mongo/` | ✅ | ❌ | Actual: `Models/MongoDB/` |
| Namespace `Repositories/Contracts/` | ✅ | ❌ | **Missing entirely** — no interfaces |
| Namespace `Repositories/Postgres/` | ✅ | ❌ | Actual: `Repositories/PostgreSQL/` |
| Namespace `Repositories/Mongo/` | ✅ | ❌ | Actual: `Repositories/MongoDB/` |
| `InvitationService` | ✅ | ❌ | Commented out in AppServiceProvider |
| `RecalculateApplicantPoints` Job | ✅ | ❌ | Not implemented as a separate job |
| `ApplicationController` (for applicants) | ✅ | ❌ | Not implemented |
| `Admin/VerificationController` | ✅ | ❌ | Not implemented |
| `EnforceSwipeLimit` middleware | ✅ | ✅ | Renamed to `CheckSwipeLimit` |
| `SwipeRequest` form request | ✅ | ❌ | Not implemented |
| `PasswordResetCacheRepository` | ❌ | ✅ | Exists but not in docs |

---

## 7. Overall Rating

### Score: **8.0 / 10** _(updated 2026-04-02)_

```
┌─────────────────────────────────┬────────┬──────────────────────────────────────────────┐
│ Category                        │ Score  │ Justification                                │
├─────────────────────────────────┼────────┼──────────────────────────────────────────────┤
│ Architecture & Patterns         │ 8.5/10 │ Service+Repo pattern well-applied, clean     │
│                                 │        │ multi-DB split, thin controllers, clean DI    │
├─────────────────────────────────┼────────┼──────────────────────────────────────────────┤
│ Code Quality                    │ 8.0/10 │ Modern PHP (8.1+), constructor promotion,    │
│                                 │        │ match expressions, no more DI anti-patterns   │
├─────────────────────────────────┼────────┼──────────────────────────────────────────────┤
│ Security                        │ 7.5/10 │ Full webhook sig verification (JWS + OIDC),  │
│                                 │        │ good auth. Debug routes still drag score down │
├─────────────────────────────────┼────────┼──────────────────────────────────────────────┤
│ Test Coverage                   │ 4.0/10 │ Unit tests exist but no feature/integration  │
│                                 │        │ tests; empty feature directory                │
├─────────────────────────────────┼────────┼──────────────────────────────────────────────┤
│ Feature Completeness            │ 7.5/10 │ Core flows + IAP + webhooks all working.     │
│                                 │        │ Gaps remain (admin panel, reviews)            │
├─────────────────────────────────┼────────┼──────────────────────────────────────────────┤
│ Documentation Accuracy          │ 5.5/10 │ Docs are extensive but diverge heavily from   │
│                                 │        │ implementation (namespaces, missing features)  │
├─────────────────────────────────┼────────┼──────────────────────────────────────────────┤
│ Dev Experience & Tooling        │ 7.0/10 │ Pint configured, Horizon configured, but      │
│                                 │        │ no seeders, no factories, no CI/CD            │
├─────────────────────────────────┼────────┼──────────────────────────────────────────────┤
│ Error Handling                  │ 8.5/10 │ Global exception handler + custom exceptions  │
│                                 │        │ (Subscription, IAP, File) + ApiResponse trait │
└─────────────────────────────────┴────────┴──────────────────────────────────────────────┘
```

### Verdict _(updated 2026-04-02)_

The codebase is now **production-ready for its core flows**. It demonstrates strong architectural fundamentals with a well-thought-out multi-database strategy, clean separation of concerns, and consistent DI discipline. The developer has built genuinely production-quality components: Stripe idempotency, swipe deduplication with compensating transactions, OTP registration flow, full cross-platform IAP lifecycle (Apple + Google), and robust webhook security (JWS certificate chain verification for Apple, OIDC token verification for Google Pub/Sub, canonical state reconciliation before mutations). The remaining gaps are: **documentation drift**, **missing feature areas** (admin panel, company reviews), **no feature tests**, and **debug routes** that must be removed pre-deployment.

---

## 8. Prioritized Recommendations

### 🔴 P0 — Do Immediately

| # | Action | Impact | Status |
|---|--------|--------|--------|
| 1 | **Remove or gate debug routes** behind `super_admin` middleware | Security: prevents data leaks | ⏳ Deferred (pre-prod) |
| 2 | **Add a global exception handler** that enforces the `{success, message, code}` envelope | Security + API consistency | ✅ **DONE** |
| 3 | **Fix `extra_swipe_balance`** field reference in `CheckSwipeLimit` middleware | Runtime bug | ✅ **DONE** |
| 4 | **Remove duplicate `PointService` singleton** registration | Code hygiene | ✅ **DONE** |

### 🟡 P1 — Do This Sprint

| # | Action | Impact | Status |
|---|--------|--------|--------|
| 5 | Write **feature tests** for Auth, Swipe, Subscription, and Profile endpoints | Test confidence | ❌ Not done |
| 6 | Create **model factories** and **database seeders** for development | Dev velocity | ❌ Not done |
| 7 | Inject `PasswordResetService` via constructor, not `app()` locator | Consistency + Testability | ✅ **DONE** |
| 8 | Make `OAuthController` use `$this->success()` / `$this->error()` | API consistency | ✅ **DONE** |
| 9 | Fix loose comparison `==` to `===` in `OTPService::verify()` | Correctness | ✅ **DONE** |
| 10 | Replace `'Asia/Manila'` hardcode in `SwipeCacheRepository` with `config('app.timezone')` | Portability | ✅ **DONE** |

### 🟢 P2 — Do Next Sprint

| # | Action | Impact | Status |
|---|--------|--------|--------|
| 11 | **Implement Admin Panel APIs** (verification queue, user management, metrics) | Feature completeness | ❌ Not done |
| 12 | **Implement Company Reviews CRUD** (model exists, needs controller + routes) | Feature completeness | ❌ Not done |
| 13 | **Implement Applicant Applications list** endpoint | Feature completeness | ❌ Not done |
| 14 | **Add repository interfaces** (`Repositories/Contracts/`) and bind them in AppServiceProvider | Architecture purity + testability | ❌ Not done |
| 15 | **Add PHPStan** to dev dependencies and configure a baseline | Code quality | ❌ Not done |
| 16 | **Add Sentry** integration for error monitoring | Operational visibility | ❌ Not done |
| 17 | **Update documentation** to match actual namespaces (`PostgreSQL/` not `Postgres/`) | Doc accuracy | ❌ Not done |
| 18 | Set up **GitHub Actions CI/CD** as documented | Deployment reliability | ❌ Not done |

---

*End of Analysis Report*
