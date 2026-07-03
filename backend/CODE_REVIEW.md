# Backend Code Review (Laravel API)

Date reviewed: 2026-04-07  
Scope: `JobSwipe/backend` (plus repo-adjacent security items that impact backend deployment)

## TL;DR (highest priority)

1. **Remove/rotate leaked secrets immediately**: OpenSSH private keys are present in `certs/JobSwipe-1.pem:1` and `certs/JobSwipe-gerald.pem:1`.
2. **Delete or strongly lock down debug/admin HTTP endpoints**:
   - Public DB/Redis introspection: `JobSwipe/backend/routes/web.php:13`
   - Public cache-clearing endpoint: `JobSwipe/backend/routes/api.php:36`
3. **Tighten production surface area**: reduce info leaks in health checks, restrict WebSocket origins, and remove stack traces from logs in prod.

## What’s working well

- **Clear domain separation in many areas**: controllers are thin and delegate to services/repositories (e.g. `JobSwipe/backend/app/Services/AuthService.php:23`, `JobSwipe/backend/app/Services/SubscriptionService.php:28`).
- **Consistent “envelope” API responses** via `App\Support\ApiResponse` (`JobSwipe/backend/app/Support/ApiResponse.php:7`) and custom domain exceptions with `render()` (e.g. `JobSwipe/backend/app/Exceptions/SubscriptionException.php:18`).
- **Solid Stripe idempotency + webhook de-dupe** design:
  - checkout request reservation + replay cache: `JobSwipe/backend/app/Services/SubscriptionService.php:369`
  - webhook event reservation: `JobSwipe/backend/app/Services/SubscriptionService.php:480`
- **Good access control primitives**: role middleware and verified-email middleware are explicit and return JSON (`JobSwipe/backend/app/Http/Middleware/CheckRole.php:12`, `JobSwipe/backend/app/Http/Middleware/EnsureEmailVerified.php:11`).
- **WebSocket channel authorization checks membership** (`JobSwipe/backend/routes/channels.php:20`, `JobSwipe/backend/app/WebSocket/MatchChatHandler.php:38`).


## High-impact improvements

### API consistency and error handling

- **Validation errors return HTTP 400** for API routes (`JobSwipe/backend/bootstrap/app.php:42`). Most clients/tools expect **422** for validation failures.
  - If you intentionally chose 400, consider documenting it and keeping all validations consistent.
- Avoid `abort()` in API controllers because it can bypass your normal API envelope:
  - `abort(403, ...)` in `JobSwipe/backend/app/Http/Controllers/Match/MatchMessageController.php:124`
  - Prefer returning `ApiResponse::error(...)` or throwing a domain exception that renders the standard JSON shape.

### Information leakage in “health”

- **File**: `JobSwipe/backend/routes/api.php:24`
- The health response includes `app` and `env`. Consider returning only `status` + `timestamp` for public checks.

### CORS headers likely block legitimate browser requests

- **File**: `JobSwipe/backend/config/cors.php:15`
- `allowed_headers` omits `Idempotency-Key`, but the checkout endpoint reads it (`JobSwipe/backend/app/Http/Controllers/Subscription/SubscriptionController.php:23`).
- Recommendation: include `Idempotency-Key` (and any other custom headers your web client sends).

### Webhooks under the same global throttle bucket

- Webhook routes live under `throttle:api-tiered` (`JobSwipe/backend/routes/api.php:33`).
- Recommendation: give webhooks their own limiter (higher burst / different keying) or exclude them from the general API limiter to avoid accidental drops.

### WebSocket origin restrictions

- **File**: `JobSwipe/backend/config/reverb.php:85`
- `allowed_origins` is `['*']`. Recommendation: restrict to your web origins (and document how mobile clients connect).

### Logging: PII + stack traces in app logs

- Example stack-trace logging: `JobSwipe/backend/app/Http/Controllers/Auth/AuthController.php:57`, `JobSwipe/backend/app/Http/Controllers/Webhook/GoogleWebhookController.php:48`
- Recommendation: in production, avoid logging full traces and minimize PII (hash or partially redact emails).

## Medium-impact improvements

### Cross-database “transaction” complexity (Postgres + Mongo + Redis)

- **File**: `JobSwipe/backend/app/Services/SwipeService.php:39`
- You do a Mongo write, then a Postgres transaction, then Redis writes, with compensating deletion if Postgres fails.
- This is a reasonable MVP pattern, but it’s not truly atomic and can drift (e.g., if the Mongo rollback fails, or if Redis write fails after DB commit).
- Recommendation: consider an **outbox/event** approach for side effects (Mongo/Redis) so the source-of-truth (Postgres) remains consistent and async repairable.

### Profile mutations by array index

- **File**: `JobSwipe/backend/app/Services/ProfileService.php:84`
- Updating/deleting work experience and education by numeric index can be racey if clients reorder arrays.
- Recommendation: give items stable IDs (UUID per entry) and address by ID.

### Domain errors via stringly-typed exception messages

- **File**: `JobSwipe/backend/app/Http/Controllers/Profile/ProfileController.php:313`
- Mapping `InvalidArgumentException` message strings to API codes is brittle.
- Recommendation: use a small custom exception type with explicit `code/status` fields (similar to `SubscriptionException`).

### Model serialization safety

- `User` hides only `password_hash` (`JobSwipe/backend/app/Models/PostgreSQL/User.php:38`), but responses like `/auth/me` return the whole model (`JobSwipe/backend/app/Http/Controllers/Auth/AuthController.php:171`).
- Recommendation: ensure fields like `stripe_id`, billing metadata, etc. are hidden or returned via dedicated Resources/DTOs.

## Tests and CI notes

- You have a lot of fast “contract” style tests that validate routes and response envelopes by inspection (e.g. `JobSwipe/backend/tests/Unit/Routes/ApiRoutesIntegrationTest.php:9`). These are good guardrails.
- **Backend unit tests are disabled in CI**: `JobSwipe/.github/workflows/ci.yml:121` (`if: false`).
- CI “integration tests” run the Feature suite (`JobSwipe/.github/workflows/ci.yml:299`), but `JobSwipe/backend/tests/Feature/.gitkeep` suggests there may be no real Feature tests yet.
- Recommendation:
  - Re-enable unit tests in CI, and/or add real Feature tests that hit endpoints with an in-memory DB where feasible.

## Suggested next steps (order)

1. Remove/rotate secrets; delete `certs/*.pem` from anywhere near the repo root.
2. Remove or gate `/debug/database` and `/api/clear-cache`.
3. Restrict Reverb `allowed_origins`, trim health output, and tighten logging in production.
4. Fix CORS headers for `Idempotency-Key` (and document required headers).
5. Re-enable CI unit tests and add minimal Feature tests for auth + critical flows (swipe, match, checkout webhook).

