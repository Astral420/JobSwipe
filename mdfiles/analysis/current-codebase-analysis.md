# Current Codebase Analysis - Edge Cases, Missing Implementations & E2E Flows

**Analysis Date**: April 3, 2026  
**Analyzed By**: Software Engineer Review  
**Scope**: Current implementation state (not future plans)

> **Staleness note:** Treat this as a living audit snapshot, not a frozen spec. Some claims below were already superseded by later changes in the backend, so the safest way to use this file is as a checklist that still needs verification.

---

## Executive Summary

This analysis identifies **critical edge cases**, **missing implementations**, and documents **E2E flows** in the current JobSwipe codebase. The analysis reveals several production-critical issues that need immediate attention before extending functionality.

### Critical Findings
- 🔴 **7 Critical Edge Cases** requiring immediate fixes
- 🟡 **5 Missing Implementations** that could cause runtime failures
- 🟢 **3 E2E Flows** documented with identified gaps

### Older Findings That Are Already Superseded

The following items are called out here so they are not mistaken for current truth:
- `Stripe webhook verification` is already implemented in the current backend, so any older note claiming it is missing is stale.
- `Daily swipe reset` is already scheduled in `routes/console.php`, so any older note saying it is absent is stale.
- `GoogleReceiptValidator` now returns the `transaction_id` / `purchase_date` shape expected by `IAPService`, so older contract-mismatch notes are stale.
- `PointService` and `PasswordResetService` are registered in `AppServiceProvider`, so older singleton-registration warnings are stale.
- `SwipeCacheRepository` now uses `config('app.timezone')`, so the old hardcoded timezone warning is stale.

### Implementation Update (April 7, 2026)

The following fixes were implemented after this analysis snapshot and should be treated as current behavior:
- Swipe limit enforcement is now authoritative in `SwipeService` with row-level locking and atomic consume logic; middleware pre-check is advisory only.
- Job posting creation now re-validates `subscription_status` after `lockForUpdate()` before creating a posting.
- Company subscription cancellation now attempts remote Stripe cancellation before local status updates.
- Stripe webhook processing now tracks state (`pending/processing/completed/failed`) with attempts, timestamps, and persisted payload for retries.
- A retry job (`RetryStripeWebhookEventsJob`) is scheduled to reprocess failed/stale Stripe webhook events.
- Swipe-pack refunds now support tracking fields (`refunded_at`, `refund_reference`) and are invoked from IAP refund handlers.

---

## Part 1: Critical Edge Cases in Current Implementation

### 1.1 Swipe Limit Race Conditions

**Location**: `CheckSwipeLimit` middleware + `ApplicantProfile` model

**Issue**: The swipe limit check has a TOCTOU (Time-of-Check-Time-of-Use) race condition:

```php
// CheckSwipeLimit.php - Line 28-35
$profile = $user->applicantProfile;
if ($profile->daily_swipes_remaining <= 0) {
    return response()->json([...], 429);
}
```

**Problem**: Between the middleware check and the actual swipe decrement in `SwipeService`, another concurrent request can pass the check, leading to negative swipe counts.

**Scenario**:
1. User has 1 swipe remaining
2. Two concurrent requests both pass middleware check (both see 1 remaining)
3. Both proceed to `SwipeService->swipe()`
4. First swipe: 1 → 0 (valid)
5. Second swipe: 0 → -1 (INVALID, but allowed)

**Impact**: Users can exceed their swipe limits, especially on mobile with poor network (retry storms)

**Fix Required**: Use database-level atomic decrement with constraint check:
```php
// In SwipeService->swipe()
$updated = DB::update(
    'UPDATE applicant_profiles 
     SET daily_swipes_remaining = daily_swipes_remaining - 1 
     WHERE id = ? AND daily_swipes_remaining > 0',
    [$applicantId]
);
if ($updated === 0) {
    throw new SwipeLimitException();
}
```

---

### 1.2 Job Posting Listing Limit Race Condition

**Location**: `JobPostingController->store()` - Line 56-60

**Issue**: Despite using `lockForUpdate()`, there's still a race condition window:

```php
$locked = CompanyProfile::lockForUpdate()->find($company->id);
if ($locked->subscription_tier === 'basic' && $locked->active_listings_count >= 5) {
    throw new ListingLimitReachedException;
}
// ... create job ...
$locked->increment('active_listings_count');
```

**Problem**: The lock is acquired AFTER the initial `$company` fetch in line 48. If subscription status changes between line 48 and line 56, the check at line 48 becomes stale.

**Scenario**:
1. Company subscription expires at 10:00:00.000
2. Request A at 09:59:59.999 passes subscription check (line 48)
3. Subscription expires
4. Request A acquires lock and creates job (should have been rejected)

**Impact**: Companies can create jobs after subscription expires

**Fix Required**: Move subscription check inside the transaction after lock:
```php
DB::transaction(function () use ($request, $company, &$job) {
    $locked = CompanyProfile::lockForUpdate()->find($company->id);
    
    // Check subscription AFTER lock
    if ($locked->subscription_status !== 'active') {
        throw new SubscriptionRequiredException();
    }
    
    if ($locked->subscription_tier === 'basic' && $locked->active_listings_count >= 5) {
        throw new ListingLimitReachedException;
    }
    // ... rest of logic
});
```

---

### 1.3 Subscription Webhook Idempotency Race Condition

**Location**: `SubscriptionService->reserveWebhookEvent()` - Line 398-415

**Issue**: The webhook deduplication uses `INSERT` without proper race condition handling:

```php
private function reserveWebhookEvent(string $eventId, string $eventType): bool
{
    try {
        DB::table('stripe_webhook_events')->insert([...]);
        return true;
    } catch (QueryException $exception) {
        $sqlState = $exception->errorInfo[0] ?? null;
        if (in_array($sqlState, ['23000', '23505'], true)) {
            return false;  // Duplicate, skip processing
        }
        throw $exception;
    }
}
```

**Problem**: Between the INSERT attempt and the catch block, if Stripe sends duplicate webhooks (which they do), both might throw exceptions simultaneously, but the error handling doesn't guarantee exactly-once processing.

**Scenario**:
1. Webhook A arrives, inserts event_id=evt_123
2. Webhook B (duplicate) arrives 50ms later, INSERT fails with 23505
3. Webhook B returns false, skips processing ✓ (correct)
4. BUT: If webhook A crashes AFTER insert but BEFORE processing completes, event is marked as "processed" but subscription wasn't actually updated

**Impact**: Subscription state can become inconsistent with Stripe

**Fix Required**: Use a status column with atomic updates:
```php
// Insert with status='processing'
DB::table('stripe_webhook_events')->insert([
    'stripe_event_id' => $eventId,
    'status' => 'processing',
    'created_at' => now(),
]);

// After successful processing:
DB::table('stripe_webhook_events')
    ->where('stripe_event_id', $eventId)
    ->update(['status' => 'completed', 'completed_at' => now()]);

// Add a cron job to retry 'processing' events older than 5 minutes
```

---

### 1.4 Daily Swipe Reset Job Race Condition

**Location**: `ResetDailySwipesJob` + concurrent swipe operations

**Issue**: The daily reset job doesn't coordinate with active swipe operations:

```php
// ResetDailySwipesJob.php
ApplicantProfile::query()->update([
    'daily_swipes_remaining' => DB::raw('daily_swipes_limit'),
    'last_swipe_reset_at' => now(),
]);
```

**Problem**: If a user is actively swiping when the reset job runs, their swipe count could be reset mid-operation, leading to incorrect counts.

**Scenario**:
1. User has 0 swipes remaining at 23:59:59
2. Reset job runs at 00:00:00, sets remaining = 10
3. User's pending swipe from 23:59:59 completes, decrements: 10 → 9
4. User now has 9 swipes instead of 10 (lost 1 swipe)

**Impact**: Users randomly lose swipes during the reset window

**Fix Required**: Use row-level locking or check `last_swipe_reset_at` before decrementing:
```php
// In SwipeService->swipe()
$profile = ApplicantProfile::lockForUpdate()->find($applicantId);
$profile->decrement('daily_swipes_remaining');
$profile->save();
```

---

### 1.5 IAP Receipt Validation Replay Attack

**Location**: `IAPService` + `AppleReceiptValidator` / `GoogleReceiptValidator`

**Issue**: Receipt validation doesn't prevent replay attacks where a user submits the same receipt multiple times.

**Current Flow**:
1. User purchases swipe pack on mobile
2. App sends receipt to backend
3. Backend validates with Apple/Google
4. Backend credits swipes
5. **User can submit same receipt again** (if idempotency check fails)

**Problem**: The `IAPIdempotencyRepository` uses `transaction_id` as the key, but the check happens AFTER validation, not before. This means expensive API calls to Apple/Google happen even for duplicate receipts.

**Staleness note**: Keep this item under review if the IAP flow changes again. The surrounding validator and repository code has already evolved since earlier drafts of this analysis.

**Impact**: 
- Users can potentially get double credits if timing is right
- Unnecessary API calls to Apple/Google (costs money)
- Potential for abuse with automated scripts

**Fix Required**: Check idempotency BEFORE validation:
```php
// In IAPService->processPurchase()
if ($this->idempotency->exists($transactionId)) {
    throw new IAPException('DUPLICATE_TRANSACTION', 'Already processed', 409);
}

// Then validate receipt
$validationResult = $this->validator->validate($receipt);
```

---

### 1.6 Swipe Pack Refund Handling Missing

**Location**: `IAPService` + webhook controllers

**Issue**: There's no handling for refunded swipe packs. If Apple/Google issues a refund, the user keeps the swipes.

**Current State**:
- `SwipePack` model has no `refunded` status field
- Webhook handlers don't process refund notifications
- No mechanism to deduct swipes after refund

**Scenario**:
1. User buys 50 swipes for $4.99
2. User uses all 50 swipes
3. User requests refund from Apple/Google
4. Refund is granted
5. User keeps the swipes they already used (fraud)

**Impact**: Revenue loss from refund abuse

**Fix Required**:
1. Add `refunded_at` column to `swipe_packs` table
2. Implement refund webhook handlers
3. Deduct swipes from user's balance (can go negative)
4. Flag accounts with negative balances for review

---

### 1.7 Match Notification Race Condition

**Location**: `SwipeService->swipe()` - match detection logic

**Issue**: When both users swipe right simultaneously, duplicate match notifications can be sent.

**Current Flow** (from `SwipeService->swipe()`):
```php
// Check if other party already swiped right
$reciprocalSwipe = $this->swipeHistory->findSwipe($targetId, $swiperId, 'right');

if ($reciprocalSwipe) {
    // It's a match!
    $this->createApplication($swiperId, $targetId);
    SendMatchNotification::dispatch($swiperId, $targetId);
}
```

**Problem**: If Applicant A and Company B swipe right on each other at the same time:
1. Request A checks for reciprocal swipe (doesn't exist yet)
2. Request B checks for reciprocal swipe (doesn't exist yet)
3. Request A creates swipe record
4. Request B creates swipe record
5. Request A checks again, finds B's swipe, creates application
6. Request B checks again, finds A's swipe, creates application (DUPLICATE)

**Impact**: Duplicate applications, duplicate notifications, database constraint violations

**Fix Required**: Use unique constraint + idempotent application creation:
```sql
-- Migration
ALTER TABLE applications ADD CONSTRAINT unique_applicant_job 
UNIQUE (applicant_id, job_posting_id);
```

```php
// In SwipeService
try {
    $application = $this->applications->create([...]);
    SendMatchNotification::dispatch($swiperId, $targetId);
} catch (QueryException $e) {
    if ($e->getCode() === '23505') {
        // Duplicate, other request won the race - that's fine
        return;
    }
    throw $e;
}
```

---

## Part 2: Missing Implementations

### 2.1 Subscription Cancellation Doesn't Cancel in Stripe

**Location**: `SubscriptionService->deactivateSubscription()`

**Issue**: The method only updates local database, doesn't actually cancel the subscription in Stripe.

**Current Code**:
```php
public function deactivateSubscription(User $user): void
{
    $companyProfile = $this->companyProfiles->findByUserId($user->id);
    // ... updates local DB only ...
    Subscription::query()
        ->where('user_id', $user->id)
        ->update(['status' => 'cancelled', 'stripe_status' => 'canceled']);
}
```

**Problem**: 
- User cancels subscription in app
- Local DB shows "cancelled"
- Stripe still charges them next month
- User gets angry, disputes charge

**Impact**: Chargebacks, customer complaints, potential legal issues

**Fix Required**:
```php
public function deactivateSubscription(User $user): void
{
    $subscription = Subscription::where('user_id', $user->id)
        ->where('payment_provider', 'stripe')
        ->latest()
        ->first();
    
    if ($subscription && $subscription->provider_sub_id) {
        $stripe = $this->stripeClient();
        $stripe->subscriptions->cancel($subscription->provider_sub_id);
    }
    
    // Then update local DB
    // ...
}
```

---

### 2.2 No Endpoint to Cancel Subscription

**Location**: `routes/api.php` + `SubscriptionController`

**Issue**: There's no API endpoint for users to cancel their subscription.

**Current State**:
- `POST /api/v1/subscription/checkout` - create subscription ✓
- `GET /api/v1/subscription/status` - check status ✓
- **Missing**: `DELETE /api/v1/subscription` - cancel subscription ✗

**Impact**: Users cannot cancel subscriptions through the app, must contact support or dispute charges

**Fix Required**: Add endpoint and controller method:
```php
// routes/api.php
Route::delete('/subscription', [SubscriptionController::class, 'cancel'])
    ->middleware(['auth:sanctum', 'role:hr,company_admin']);

// SubscriptionController.php
public function cancel(Request $request): JsonResponse
{
    $this->subscriptionService->cancelSubscription($request->user());
    return $this->success(message: 'Subscription cancelled');
}
```

---

### 2.3 Missing SwipePackRepository Methods

**Location**: `SwipePackRepository`

**Issue**: The repository is missing critical methods that are referenced in other parts of the codebase.

**Missing Methods**:
1. `findByProviderPaymentId(string $providerPaymentId): ?SwipePack`
   - Referenced in: IAP webhook handlers (implied)
   - Current workaround: Uses `findByTransactionId()` which does a double lookup

2. `getTotalPurchasedForApplicant(string $applicantId): int`
   - Needed for: Analytics, fraud detection
   - Current state: No way to get total swipes purchased by user

3. `findPendingRefunds(): Collection`
   - Needed for: Refund processing job
   - Current state: No refund handling at all

**Impact**: Code that needs these methods will fail at runtime

**Fix Required**: Implement missing methods:
```php
public function findByProviderPaymentId(string $providerPaymentId): ?SwipePack
{
    return SwipePack::where('provider_payment_id', $providerPaymentId)->first();
}

public function getTotalPurchasedForApplicant(string $applicantId): int
{
    return SwipePack::where('applicant_id', $applicantId)
        ->sum('quantity');
}
```

---

### 2.4 No Mechanism to Handle Expired Subscriptions

**Location**: Scheduled jobs

**Issue**: There's no job to handle subscriptions that expire without renewal.

**Current State**:
- `ExpireJobPostingsJob` - expires old job postings ✓
- `ResetDailySwipesJob` - resets daily swipe limits ✓
- **Missing**: `ExpireSubscriptionsJob` - handles expired subscriptions ✗

**Problem**:
- Company subscription expires
- `current_period_end` passes
- Subscription status remains "active" in local DB
- Company continues posting jobs (should be blocked)

**Impact**: Companies get free access after subscription expires

**Fix Required**: Create scheduled job:
```php
// app/Jobs/ExpireSubscriptionsJob.php
class ExpireSubscriptionsJob implements ShouldQueue
{
    public function handle(): void
    {
        $expired = Subscription::where('status', 'active')
            ->where('current_period_end', '<', now())
            ->get();
        
        foreach ($expired as $subscription) {
            $subscription->update(['status' => 'expired']);
            
            // Update company profile
            if ($subscription->subscriber_type === 'company') {
                $company = CompanyProfile::where('user_id', $subscription->user_id)->first();
                $company?->update(['subscription_status' => 'expired']);
            }
        }
    }
}

// routes/console.php
Schedule::job(new ExpireSubscriptionsJob)->hourly();
```

---

### 2.5 Missing Applicant Subscription Status Endpoint

**Location**: `routes/api.php` + controllers

**Issue**: Applicants have no way to check their subscription status via API.

**Current State**:
- `GET /api/v1/subscription/status` - only works for companies (checks `CompanyProfile`)
- Applicants need to check: Pro subscription status, swipe pack balance, daily swipes remaining
- **No unified endpoint for applicant subscription info**

**Impact**: Mobile app cannot display subscription status to applicants

**Fix Required**: Add applicant-specific endpoint:
```php
// routes/api.php
Route::get('/applicant/subscription', [ApplicantController::class, 'subscriptionStatus'])
    ->middleware(['auth:sanctum', 'role:applicant']);

// ApplicantController.php
public function subscriptionStatus(Request $request): JsonResponse
{
    $profile = $request->user()->applicantProfile;
    $subscription = Subscription::where('user_id', $request->user()->id)
        ->where('subscriber_type', 'applicant')
        ->where('status', 'active')
        ->first();
    
    return $this->success(data: [
        'has_pro' => $subscription !== null,
        'pro_expires_at' => $subscription?->current_period_end,
        'daily_swipes_remaining' => $profile->daily_swipes_remaining,
        'daily_swipes_limit' => $profile->daily_swipes_limit,
        'total_swipe_packs_purchased' => SwipePack::where('applicant_id', $profile->id)->sum('quantity'),
    ]);
}
```

---

## Part 3: End-to-End Flow Analysis

### 3.1 Applicant Registration → Swipe → Match Flow

**Happy Path**:

```
1. Registration (POST /api/v1/auth/register)
   ├─ User submits: email, password, role=applicant
   ├─ AuthService->register() creates User + ApplicantProfile
   ├─ OTP sent to email
   └─ Returns: user_id, message="Check email for OTP"

2. Email Verification (POST /api/v1/auth/verify-email)
   ├─ User submits: email, otp_code
   ├─ AuthService->verifyEmail() checks OTP from Redis
   ├─ Sets email_verified_at timestamp
   └─ Returns: success=true

3. Login (POST /api/v1/auth/login)
   ├─ User submits: email, password
   ├─ AuthService->login() validates credentials
   ├─ Creates Sanctum token
   └─ Returns: token, user data

4. Profile Setup (PUT /api/v1/profile/applicant/basic-info)
   ├─ User submits: full_name, phone, location, etc.
   ├─ ProfileService->updateApplicantBasicInfo()
   ├─ Updates ApplicantProfile (PostgreSQL)
   ├─ Updates ApplicantProfileDocument (MongoDB)
   └─ Returns: updated profile

5. Get Job Deck (GET /api/v1/applicant/deck)
   ├─ DeckService->getJobDeck() called
   ├─ Fetches jobs from Meilisearch (location-based, skill-matched)
   ├─ Filters out already-seen jobs (applicant_seen_jobs table)
   ├─ Returns: array of 10 job postings
   └─ Frontend displays first job

6. Swipe Right (POST /api/v1/applicant/swipe)
   ├─ Middleware: CheckSwipeLimit (checks daily_swipes_remaining > 0)
   ├─ User submits: job_posting_id, direction="right"
   ├─ SwipeService->swipe() called
   ├─ Decrements daily_swipes_remaining
   ├─ Records swipe in MongoDB (SwipeHistoryDocument)
   ├─ Marks job as seen (applicant_seen_jobs table)
   ├─ Checks if company already swiped right on this applicant
   │  └─ If YES: Match detected!
   │     ├─ Creates Application record (status="pending")
   │     ├─ Dispatches SendMatchNotification job
   │     └─ Returns: match=true, application_id
   └─ Returns: match=false

7. Match Notification (Background Job)
   ├─ SendMatchNotification job processes
   ├─ Creates Notification records for both parties
   ├─ Sends push notification (if configured)
   └─ Sends email notification

8. Company Reviews Match (GET /api/v1/company/applicants)
   ├─ Company sees matched applicants
   ├─ Can view full applicant profile
   └─ Can send interview invitation

9. Interview Invitation (POST /api/v1/company/applicants/{id}/invite)
   ├─ Company submits: invitation_message
   ├─ Updates Application: status="interview_scheduled", invited_at=now()
   ├─ Dispatches SendInterviewInvitation job
   └─ Applicant receives email with interview details
```

**Edge Cases in This Flow**:

1. **OTP Expiration**: OTP expires after 10 minutes (Redis TTL)
   - If user waits too long, must request new OTP
   - **Missing**: No endpoint to resend OTP (`POST /api/v1/auth/resend-otp`)

2. **Profile Incomplete**: User can swipe without completing profile
   - No validation that profile is "complete" before allowing swipes
   - Companies see incomplete profiles (bad UX)
   - **Fix**: Add `profile_completed` flag and check in middleware

3. **Deck Exhaustion**: User swipes through all available jobs
   - `DeckService->getJobDeck()` returns empty array
   - Frontend should show "No more jobs, check back later"
   - **Current**: No handling for empty deck state

4. **Concurrent Swipes**: User rapidly taps "swipe right" multiple times
   - Multiple requests sent for same job
   - Race condition in swipe limit check (see 1.1)
   - **Fix**: Frontend debouncing + backend atomic decrement

5. **Match During Swipe**: Company swipes right while applicant is viewing job
   - Applicant swipes right
   - Match is created
   - But applicant's UI doesn't know about match until next API call
   - **Fix**: Return match status in swipe response (already implemented ✓)

---

### 3.2 Company Registration → Job Posting → Applicant Review Flow

**Happy Path**:

```
1. Registration (POST /api/v1/auth/register)
   ├─ User submits: email, password, role=hr
   ├─ AuthService->register() creates User + CompanyProfile
   ├─ OTP sent to email
   └─ Returns: user_id

2. Email Verification (POST /api/v1/auth/verify-email)
   └─ Same as applicant flow

3. Login (POST /api/v1/auth/login)
   └─ Same as applicant flow

4. Profile Setup (PUT /api/v1/profile/company)
   ├─ User submits: company_name, industry, size, etc.
   ├─ ProfileService->updateCompanyDetails()
   ├─ Updates CompanyProfile (PostgreSQL)
   ├─ Updates CompanyProfileDocument (MongoDB)
   └─ Returns: updated profile

5. Subscribe (POST /api/v1/subscription/checkout)
   ├─ User submits: success_url, cancel_url
   ├─ SubscriptionService->createCheckoutSession()
   ├─ Creates Stripe Checkout Session
   ├─ Returns: checkout_url
   └─ Frontend redirects to Stripe

6. Stripe Webhook (POST /webhook/stripe)
   ├─ Stripe sends checkout.session.completed event
   ├─ SubscriptionService->handleSubscriptionUpdated()
   ├─ Creates Subscription record (status="active")
   ├─ Updates CompanyProfile: subscription_status="active"
   └─ User can now post jobs

7. Create Job Posting (POST /api/v1/company/jobs)
   ├─ User submits: title, description, skills, location, etc.
   ├─ Middleware: auth:sanctum, role:hr,company_admin
   ├─ JobPostingController->store()
   ├─ Checks: subscription_status === "active"
   ├─ Checks: active_listings_count < 5 (for basic tier)
   ├─ Transaction:
   │  ├─ Locks CompanyProfile row
   │  ├─ Creates JobPosting (status="active")
   │  ├─ Creates JobSkill records
   │  └─ Increments active_listings_count
   ├─ Indexes job in Meilisearch
   └─ Returns: job posting data

8. Applicants Swipe on Job
   └─ (See flow 3.1 above)

9. Review Matched Applicants (GET /api/v1/company/applicants)
   ├─ ApplicantReviewController->index()
   ├─ Fetches Applications where job_posting.company_id = company.id
   ├─ Filters by status (pending, interview_scheduled, etc.)
   ├─ Eager-loads applicant profiles
   └─ Returns: paginated list of matched applicants

10. Swipe on Applicant (POST /api/v1/company/applicants/{id}/swipe)
    ├─ User submits: direction="right" or "left"
    ├─ If direction="right":
    │  ├─ Checks if applicant already swiped right on this job
    │  └─ If YES: Creates match (Application record)
    └─ Returns: match status
```

**Edge Cases in This Flow**:

1. **Subscription Expires During Job Creation**: 
   - User starts creating job at 11:59 PM (subscription expires at midnight)
   - Submits form at 12:01 AM
   - Subscription check passes (cached), but should fail
   - **Fix**: Check subscription inside transaction (see 1.2)

2. **Listing Limit Race Condition**:
   - Two HR users from same company create jobs simultaneously
   - Both see active_listings_count = 4
   - Both create job (now count = 6, exceeds limit of 5)
   - **Fix**: Already using lockForUpdate(), but need to re-check after lock (see 1.2)

3. **Job Expires While Applicant is Viewing**:
   - Applicant loads job at 11:59 PM
   - Job expires at midnight (30 days after creation)
   - Applicant swipes right at 12:01 AM
   - Swipe is recorded, but job is expired
   - **Fix**: Check job status in SwipeService before creating swipe

4. **Company Cancels Subscription with Active Jobs**:
   - Company has 3 active job postings
   - Cancels subscription
   - Jobs remain active (should be closed)
   - **Fix**: Close all active jobs when subscription is cancelled

5. **Duplicate Interview Invitations**:
   - HR user clicks "Send Invitation" button twice (slow network)
   - Two invitations sent to same applicant
   - **Fix**: Add `invited_at` check before sending invitation

---

### 3.3 Applicant Subscription Purchase Flow (Mobile IAP)

**Happy Path**:

```
1. User Opens Subscription Screen
   ├─ Mobile app displays: "Pro" subscription ($9.99/month)
   ├─ Shows benefits: Unlimited swipes, priority matching, etc.
   └─ User taps "Subscribe"

2. Mobile App Initiates Purchase
   ├─ App calls Apple/Google IAP SDK
   ├─ User authenticates with Face ID / fingerprint
   ├─ Apple/Google processes payment
   └─ Returns: receipt data + transaction_id

3. App Sends Receipt to Backend (POST /api/v1/iap/purchase)
   ├─ User submits: receipt_data, transaction_id, platform="apple"
   ├─ IAPController->purchase() called
   ├─ IAPService->processPurchase() called
   ├─ Validates receipt with Apple/Google API
   ├─ Checks idempotency (transaction_id already processed?)
   ├─ Creates IAPTransaction record
   ├─ Creates IAPReceipt record
   ├─ Determines product type (subscription vs swipe pack)
   ├─ If subscription:
   │  ├─ Creates/updates Subscription record
   │  ├─ Updates ApplicantProfile: daily_swipes_limit = 999
   │  └─ Returns: subscription_id, expires_at
   └─ If swipe pack:
      ├─ Creates SwipePack record
      ├─ Adds swipes to ApplicantProfile
      └─ Returns: swipes_added, new_balance

4. Apple/Google Sends Webhook (Background)
   ├─ POST /webhook/apple or /webhook/google
   ├─ Webhook contains: transaction updates, renewals, cancellations
   ├─ AppleWebhookController / GoogleWebhookController
   ├─ Validates webhook signature
   ├─ Processes event:
   │  ├─ RENEWAL: Extends subscription period
   │  ├─ CANCELLATION: Marks subscription as cancelled
   │  ├─ REFUND: Marks transaction as refunded (NOT IMPLEMENTED)
   │  └─ EXPIRED: Marks subscription as expired
   └─ Updates local database to match Apple/Google state

5. Subscription Auto-Renewal (Monthly)
   ├─ Apple/Google charges user automatically
   ├─ Sends webhook to backend
   ├─ Backend extends current_period_end by 1 month
   └─ User continues to have Pro benefits

6. Subscription Expiration
   ├─ User cancels subscription in Apple/Google settings
   ├─ Webhook received: subscription will expire at period end
   ├─ Backend marks: status="active", will_expire=true
   ├─ At period end:
   │  ├─ Webhook received: subscription expired
   │  ├─ Backend updates: status="expired"
   │  └─ ApplicantProfile: daily_swipes_limit = 10 (back to free tier)
   └─ User loses Pro benefits
```

**Edge Cases in This Flow**:

1. **Receipt Validation Timeout**:
   - Apple/Google API is slow or down
   - Request times out after 30 seconds
   - User's payment went through, but backend doesn't know
   - **Fix**: Implement retry mechanism with exponential backoff

2. **Duplicate Receipt Submission**:
   - User taps "Subscribe" button multiple times
   - Multiple requests sent with same receipt
   - Idempotency check prevents double-crediting (✓ implemented)
   - But: Multiple validation API calls to Apple/Google (expensive)
   - **Fix**: Check idempotency BEFORE validation (see 1.5)

3. **Webhook Arrives Before Purchase Response**:
   - User purchases subscription
   - Apple/Google webhook arrives at backend (fast network)
   - User's app still waiting for purchase response (slow network)
   - Webhook creates subscription record
   - Purchase response tries to create subscription (duplicate)
   - **Fix**: Use upsert logic instead of create

4. **Refund Without Webhook**:
   - User requests refund from Apple/Google
   - Refund is granted
   - Webhook is never sent (Apple/Google bug)
   - User keeps Pro benefits forever
   - **Fix**: Implement periodic reconciliation job that checks Apple/Google API

5. **Subscription Expires During Active Session**:
   - User has Pro subscription, opens app at 11:59 PM
   - Subscription expires at midnight
   - User tries to swipe at 12:01 AM
   - CheckSwipeLimit middleware uses cached profile (still shows Pro)
   - User gets unlimited swipes despite expired subscription
   - **Fix**: Check subscription expiry in real-time, not just profile field

6. **Cross-Platform Subscription**:
   - User subscribes on iOS
   - Logs in on Android
   - Android app doesn't know about iOS subscription
   - **Current**: Backend tracks subscription by user_id (works ✓)
   - **Edge case**: User subscribes on both platforms (double charge)
   - **Fix**: Check for existing active subscription before allowing new purchase

---

## Part 4: Critical Bugs Summary

### High Priority (Fix Immediately)

| # | Issue | Impact | Affected Users | Fix Complexity |
|---|-------|--------|----------------|----------------|
| 1.1 | Swipe limit race condition | Users exceed daily limits | All applicants | Medium |
| 1.2 | Job posting limit race condition | Companies exceed listing limits | All companies | Low |
| 2.1 | Subscription cancellation doesn't cancel in Stripe | Users charged after cancellation | All companies | Low |
| 2.2 | No endpoint to cancel subscription | Users cannot cancel | All companies | Low |
| 1.6 | No refund handling | Revenue loss from fraud | All applicants (mobile) | High |

### Medium Priority (Fix Soon)

| # | Issue | Impact | Affected Users | Fix Complexity |
|---|-------|--------|----------------|----------------|
| 1.3 | Webhook idempotency race condition | Inconsistent subscription state | All subscribers | Medium |
| 1.4 | Daily swipe reset race condition | Users lose swipes | All applicants | Low |
| 1.7 | Match notification race condition | Duplicate notifications | All users | Low |
| 2.4 | No expired subscription handling | Free access after expiry | All companies | Low |

### Low Priority (Fix Eventually)

| # | Issue | Impact | Affected Users | Fix Complexity |
|---|-------|--------|----------------|----------------|
| 1.5 | IAP receipt replay attack | Unnecessary API calls | Mobile users | Low |
| 2.3 | Missing repository methods | Future feature blockers | Developers | Low |
| 2.5 | No applicant subscription status endpoint | Poor UX | Mobile applicants | Low |

---

## Part 5: Recommendations

### Immediate Actions (This Week)

1. **Fix Subscription Cancellation** (2.1 + 2.2)
   - Add Stripe cancellation API call
   - Create cancel endpoint
   - Test thoroughly with Stripe test mode
   - **Risk**: High (legal/financial)

2. **Add Atomic Swipe Decrement** (1.1)
   - Replace middleware check with atomic DB operation
   - Add constraint to prevent negative values
   - **Risk**: High (user experience)

3. **Fix Job Posting Race Condition** (1.2)
   - Move subscription check inside transaction
   - Re-verify after acquiring lock
   - **Risk**: Medium (business logic)

### Short-term Actions (Next 2 Weeks)

4. **Implement Refund Handling** (1.6)
   - Add refund webhook handlers
   - Create refund reconciliation job
   - Add fraud detection for repeat refunders
   - **Risk**: High (revenue protection)

5. **Add Expired Subscription Job** (2.4)
   - Create scheduled job to expire subscriptions
   - Close active jobs when subscription expires
   - **Risk**: Medium (business logic)

6. **Fix Match Race Condition** (1.7)
   - Add unique constraint on applications table
   - Handle duplicate gracefully
   - **Risk**: Low (UX improvement)

### Long-term Actions (Next Month)

7. **Implement Missing Endpoints**
   - Applicant subscription status (2.5)
   - Resend OTP endpoint
   - Profile completion check

8. **Add Monitoring & Alerts**
   - Alert on negative swipe balances
   - Alert on failed webhook processing
   - Alert on Stripe API errors

9. **Improve Idempotency**
   - Check idempotency before expensive operations
   - Add request fingerprinting
   - Implement retry logic with exponential backoff

---

## Part 6: Testing Recommendations

### Critical Test Cases to Add

1. **Concurrency Tests**
   ```php
   // Test: Two users swipe simultaneously with 1 swipe remaining
   // Expected: One succeeds, one fails with 429
   ```

2. **Subscription Lifecycle Tests**
   ```php
   // Test: Create → Cancel → Verify Stripe cancellation
   // Test: Expire → Verify jobs are closed
   // Test: Webhook arrives before purchase response
   ```

3. **IAP Refund Tests**
   ```php
   // Test: Purchase → Refund → Verify swipes deducted
   // Test: Refund with negative balance
   ```

4. **Race Condition Tests**
   ```php
   // Test: Concurrent job creation at listing limit
   // Test: Concurrent swipes on same job
   // Test: Daily reset during active swipe
   ```

### Load Testing Scenarios

1. **Swipe Storm**: 1000 users swiping simultaneously
2. **Webhook Flood**: 100 webhooks arriving in 1 second
3. **Subscription Rush**: 50 companies subscribing at once

---

## Conclusion

The current codebase has a solid foundation with good architecture (Controller → Service → Repository pattern), but suffers from several critical race conditions and missing implementations that could cause production issues.

**Priority**: Fix high-priority issues (subscription cancellation, swipe limits, refund handling) before launching to production or adding new features like Stripe applicant payments or RESTful API refactoring.

**Estimated Effort**: 
- High priority fixes: 3-5 days
- Medium priority fixes: 5-7 days
- Low priority fixes: 2-3 days
- **Total**: ~2-3 weeks of focused development

**Next Steps**: Review this analysis with the team, prioritize fixes, and create GitHub issues for tracking.


---

## Appendix A: Files Analyzed

### Controllers
- `JobSwipe/backend/app/Http/Controllers/Applicant/SwipeController.php`
- `JobSwipe/backend/app/Http/Controllers/Company/ApplicantReviewController.php`
- `JobSwipe/backend/app/Http/Controllers/Company/JobPostingController.php`
- `JobSwipe/backend/app/Http/Controllers/Auth/AuthController.php`
- `JobSwipe/backend/app/Http/Controllers/IAP/IAPController.php`

### Services
- `JobSwipe/backend/app/Services/DeckService.php`
- `JobSwipe/backend/app/Services/SwipeService.php`
- `JobSwipe/backend/app/Services/ProfileService.php`
- `JobSwipe/backend/app/Services/AuthService.php`
- `JobSwipe/backend/app/Services/IAPService.php`
- `JobSwipe/backend/app/Services/SubscriptionService.php`
- `JobSwipe/backend/app/Services/IAP/SwipePackManager.php`
- `JobSwipe/backend/app/Services/IAP/ApplicantSubscriptionManager.php`

### Repositories
- `JobSwipe/backend/app/Repositories/PostgreSQL/SubscriptionRepository.php`
- `JobSwipe/backend/app/Repositories/PostgreSQL/SwipePackRepository.php`
- `JobSwipe/backend/app/Repositories/PostgreSQL/ApplicantProfileRepository.php`

### Models
- `JobSwipe/backend/app/Models/PostgreSQL/User.php`
- `JobSwipe/backend/app/Models/PostgreSQL/ApplicantProfile.php`
- `JobSwipe/backend/app/Models/PostgreSQL/CompanyProfile.php`
- `JobSwipe/backend/app/Models/PostgreSQL/JobPosting.php`
- `JobSwipe/backend/app/Models/PostgreSQL/Application.php`
- `JobSwipe/backend/app/Models/PostgreSQL/Subscription.php`
- `JobSwipe/backend/app/Models/PostgreSQL/SwipePack.php`

### Middleware
- `JobSwipe/backend/app/Http/Middleware/CheckSwipeLimit.php`

### Jobs
- `JobSwipe/backend/app/Jobs/ResetDailySwipesJob.php`

### Routes
- `JobSwipe/backend/routes/api.php`

---

## Appendix B: Glossary

- **TOCTOU**: Time-of-Check-Time-of-Use race condition
- **IAP**: In-App Purchase (Apple/Google)
- **OTP**: One-Time Password
- **Idempotency**: Ensuring an operation can be performed multiple times with the same result
- **Atomic Operation**: Database operation that completes entirely or not at all
- **Webhook**: HTTP callback from external service (Stripe, Apple, Google)
- **Sanctum**: Laravel's token-based authentication system
- **Meilisearch**: Fast, typo-tolerant search engine
- **Scout**: Laravel's search abstraction layer

---

**Document End**
