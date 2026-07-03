# JobSwipe Backend - End of Day Priority

**Based on:**
- [current-codebase-analysis.md](/Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/mdfiles/analysis/current-codebase-analysis.md)
- [stripe-applicant-payments-implementation-v2.md](/Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/mdfiles/fix/stripe-applicant-payments-implementation-v2.md)

> **Purpose:** This is the short list of what should actually be acted on today, after re-checking the live backend. It also lists items that should not be reworked right now because they are already fixed, already scheduled, or are architectural preferences rather than urgent bugs.

---

## Do By End Of Day

> **User note applied:** debug routes are intentionally excluded from the same-day list because they are being removed in production.

After re-checking the current backend against the v2 plan and the current analysis, there are no other clear same-day fixes that rise to the level of an end-of-day blocker.

The remaining items are better treated as backlog, cleanup, or product decisions rather than urgent bug fixes.

---

## Do Not Rework Today

These items are already fixed or no longer match the live backend, so they should not be reopened as “urgent bugs”:

- `Stripe webhook verification` is already implemented in [SubscriptionController.php](/Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/backend/app/Http/Controllers/Subscription/SubscriptionController.php).
- `Global exception handling` is already configured in [bootstrap/app.php](/Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/backend/bootstrap/app.php).
- `EnsureEmailVerified` middleware already exists and is registered in [bootstrap/app.php](/Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/backend/bootstrap/app.php).
- `GoogleReceiptValidator` now returns the `transaction_id` / `purchase_date` shape expected by [IAPService.php](/Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/backend/app/Services/IAPService.php).
- `Subscription` cancellation and applicant subscription status endpoints already exist in [routes/api.php](/Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/backend/routes/api.php).
- `Daily swipe reset` is already scheduled in [routes/console.php](/Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/backend/routes/console.php).
- `PointService` and `PasswordResetService` are already registered in [AppServiceProvider.php](/Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/backend/app/Providers/AppServiceProvider.php).
- `SwipeCacheRepository` already uses `config('app.timezone')` in [SwipeCacheRepository.php](/Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/backend/app/Repositories/Redis/SwipeCacheRepository.php).

### Items from v2 that are already handled or should wait

- Do not refactor `ProfileService` into smaller services today unless a new regression appears.
- Do not change `findActiveForUser()` / subscription lookup behavior unless you are actively adding a new subscription flow.
- Do not remove the production route-cache workaround in [AppServiceProvider.php](/Users/apple/Desktop/DevWork/Project/JobSwipe/JobSwipe/backend/app/Providers/AppServiceProvider.php) until the deployment behavior has been changed.
- Do not reopen the swipe/IAP transaction flow for redesign today; the live code already has compensating logic and the newer IAP contract is aligned.

---

## Suggested Interpretation

If you need a one-line rule:

**Today:** no backend-critical code change is required from the v2/current-analysis set once debug routes are excluded.

Everything else from the v2 plan and older analysis docs should be treated as already resolved, stale, or non-urgent unless a new test failure proves otherwise.
