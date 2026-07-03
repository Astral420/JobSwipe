# JobSwipe Backend — Report Validation & Fix Plan (2026-04-02)

## Scope
This document validates `mdfiles/backend_code_analysis_report.md` sections:
- `2. Criticisms & Anti-Patterns`
- `3. Logic Bugs`

Validation source: direct inspection of current backend code under `backend/app`, `backend/routes`, and `backend/database/migrations`.

---

## A) Validation of Criticisms (Section 2)

### 2.1 `ProfileService` constructor bypasses DI
- **Verdict:** `Partially accurate`
- **Accuracy notes:**
  - The nullable + fallback pattern exists in `backend/app/Services/ProfileService.php` (lines 23-35).
  - In normal container resolution, Laravel can still inject dependencies; fallback paths are mostly redundant.
  - Still a design smell and complicates tests/manual instantiation.
- **Problem level:** `Medium`

### 2.2 `AuthService` uses `app()` service locator for `PasswordResetService`
- **Verdict:** `Accurate`
- **Accuracy notes:**
  - Found in `backend/app/Services/AuthService.php` lines 107 and 120.
  - Hidden dependency and weaker DI clarity.
- **Problem level:** `Medium` (maintainability), `Low` (runtime risk)

### 2.3 `GoogleReceiptValidator` throws in constructor
- **Verdict:** `Partially accurate`
- **Accuracy notes:**
  - Throw exists in `backend/app/Services/IAP/GoogleReceiptValidator.php` lines 26-31.
  - Report overstates impact: this does **not** crash every request at app boot; it impacts requests resolving IAP paths/controllers.
- **Problem level:** `Medium`

### 2.4 `IAPController` has redundant role checks
- **Verdict:** `Accurate`
- **Accuracy notes:**
  - Manual checks in `backend/app/Http/Controllers/IAP/IAPController.php` lines 43, 66, 89.
  - Routes already apply `role:applicant` in `backend/routes/api.php` lines 274-276.
- **Problem level:** `Low`

### 2.5 `SwipeService` directly queries model instead of repository
- **Verdict:** `Accurate`
- **Accuracy notes:**
  - Direct query in `backend/app/Services/SwipeService.php` lines 24 and 76.
- **Problem level:** `Low` to `Medium` (architecture consistency)

### 2.6 `Subscription` model missing UUID `boot()` generation
- **Verdict:** `Inaccurate`
- **Accuracy notes:**
  - `subscriptions.id` has DB default UUID generation: `gen_random_uuid()` in migration `backend/database/migrations/2026_03_19_103721_create_subscriptions_table.php` line 13.
  - Missing model `boot()` is not a functional blocker here.
- **Problem level:** `Low`

### 2.7 Webhook controllers have inconsistent error envelope / message leakage
- **Verdict:** `Accurate`
- **Accuracy notes:**
  - Raw JSON responses in webhook controllers:
    - `backend/app/Http/Controllers/Webhook/AppleWebhookController.php` lines 30 and 38
    - `backend/app/Http/Controllers/Webhook/GoogleWebhookController.php` lines 30 and 38
  - Internal exception message is returned to caller.
- **Problem level:** `Medium` (info leakage + inconsistency)

### 2.8 `SubscriptionRepository::findByTransactionId()` weak linkage
- **Verdict:** `Accurate`
- **Accuracy notes:**
  - Finds transaction, then returns most recent subscription for user:
    - `backend/app/Repositories/PostgreSQL/SubscriptionRepository.php` lines 30-45
  - Can map refunds to wrong subscription if user has multiple records.
- **Problem level:** `High`

### 2.9 No `PasswordResetService` singleton registration
- **Verdict:** `Technically accurate, low impact`
- **Accuracy notes:**
  - Not explicitly registered in `AppServiceProvider`.
  - Auto-resolution works; class is stateless, so correctness risk is low.
- **Problem level:** `Low`

---

## B) Validation of Logic Bugs (Section 3)

### 3.1 Google validator returns wrong key names for IAPService contract
- **Verdict:** `Accurate (Critical)`
- **Accuracy notes:**
  - Google returns `order_id` + `purchase_time`:
    - `backend/app/Services/IAP/GoogleReceiptValidator.php` lines 117-121
  - IAPService expects `transaction_id` + `purchase_date`:
    - `backend/app/Services/IAPService.php` lines 109-110
- **Impact:** Google purchase flow can fail at runtime due to missing expected keys.
- **Problem level:** `Critical`

### 3.2 Expire job logs wrong field (`subscriber_id`)
- **Verdict:** `Accurate`
- **Accuracy notes:**
  - Uses non-existent field in logs:
    - `backend/app/Jobs/ExpireApplicantSubscriptionsJob.php` lines 44 and 71
  - Correct field is `user_id`.
- **Problem level:** `Low`

### 3.3 Double swipe-limit checks (middleware + service) and TOCTOU risk
- **Verdict:** `Partially accurate`
- **Accuracy notes:**
  - Duplicate checks exist:
    - middleware check: `backend/app/Http/Middleware/CheckSwipeLimit.php` line 38
    - service check: `backend/app/Services/SwipeService.php` lines 27 and 79
  - TOCTOU concern is valid broadly for concurrent swipes; duplicate check itself is mostly redundancy/noise.
- **Problem level:** `Medium`

### 3.4 `hrSwipeRight()` wraps Mongo + PG in one PG transaction block
- **Verdict:** `Accurate`
- **Accuracy notes:**
  - Mongo write inside `DB::transaction()` in `backend/app/Services/SwipeService.php` lines 130-141.
  - If PG update fails, Mongo write is not rolled back.
- **Problem level:** `High`

### 3.5 `SwipeCacheRepository` timezone inconsistency
- **Verdict:** `Inaccurate (already fixed in current code)`
- **Accuracy notes:**
  - Current code consistently uses `config('app.timezone')` in:
    - `backend/app/Repositories/Redis/SwipeCacheRepository.php` lines 14, 33, 43
- **Problem level:** `None (current workspace)`

### 3.6 Subscription missing UUID boot
- **Verdict:** `Inaccurate`
- **Accuracy notes:**
  - Same reason as 2.6: DB-level UUID default exists in migration.
- **Problem level:** `None`

### 3.7 Deck relevance sort + cursor pagination mismatch
- **Verdict:** `Accurate`
- **Accuracy notes:**
  - Candidate pool fetched by recency, then re-sorted by relevance for output:
    - `backend/app/Services/DeckService.php` lines 48-51, 77-79
  - Cursor generated from recency window boundary (`$jobs->last()`), not relevance output:
    - line 82
  - This can skip unseen jobs permanently across pages.
- **Problem level:** `High`

---

## C) Additional Critical Issue Not Explicitly Called Out

### Google webhook identifier mismatch for subscription lookup
- **Finding:**
  - On purchase, `provider_sub_id` is saved as transaction ID:
    - `backend/app/Services/IAPService.php` lines 495-500
  - Google webhook handlers look up by `purchaseToken`:
    - lines 376, 606, 618, 632
- **Impact:**
  - Google renewal/cancel/expire/refund events may fail to find the intended subscription.
- **Severity:** `Critical`

---

## D) Proposed Fix Plan (Review First, Then Implement)

### Phase 0 — Hotfixes (correctness + production safety)
1. Standardize Google verification contract to return:
   - `transaction_id`
   - `purchase_date`
   - optional `provider_sub_id` (purchase token)
2. Update IAP purchase flow to persist canonical `provider_sub_id` for Google (purchase token), not order ID.
3. Fix refund linkage:
   - Replace `findByTransactionId()` heuristic with deterministic mapping table/column.
4. Fix `ExpireApplicantSubscriptionsJob` logging field (`subscriber_id` → `user_id`).
5. Fix `hrSwipeRight()` dual-store consistency:
   - mirror applicant flow compensation (delete Mongo swipe on PG failure), or reorder writes with explicit compensation.

### Phase 1 — Behavior & architecture cleanup
1. Remove redundant role checks from `IAPController` methods behind `role:applicant`.
2. Convert `AuthService` to constructor injection for `PasswordResetService`.
3. Simplify `ProfileService` constructor to pure DI (remove nullable fallback instantiation).
4. Normalize webhook response payloads:
   - keep HTTP 200 behavior, but return generic error messages only.
5. Refactor deck pagination algorithm so ranking and cursor are based on the same ordering model.

### Phase 2 — Documentation and regression tests
1. Add an IAP data contract doc:
   - validator output schema
   - subscription identity mapping rules by provider
   - webhook lookup keys
2. Add tests:
   - Google purchase path contract test (`transaction_id`/`purchase_date`)
   - Google webhook lookup test
   - refund links correct subscription
   - deck pagination non-skipping invariant
   - HR swipe compensation test for PG failure.

---

## E) Recommended Implementation Order
1. IAP contract + Google identifier mapping (highest blast radius).
2. Refund linkage fix.
3. HR dual-store consistency fix.
4. Deck pagination fix.
5. DI/controller cleanup and docs/tests.

