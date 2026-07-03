# Implementation Plan: `POST /auth/check-company-domain` Endpoint

## Problem

The mobile frontend (`frontend/mobile/app/(auth)/register.tsx`, line ~888) calls `POST /auth/check-company-domain` when an HR/Company user enters their email during registration. This endpoint does not exist on the backend, causing a **404 Resource Not Found** error.

The purpose of this endpoint is a **pre-check**: before the user fills out the lengthy company registration form, the frontend needs to know whether the email's domain already belongs to an existing company — so it can redirect the user to the invite-code flow instead.

## Context: What Already Exists

The backend already has all the underlying logic. **No new services or repositories need to be created.** You are wiring up existing code to a new route.

### Existing Services (DO NOT MODIFY)

| Service | File | Method | What it does |
|---|---|---|---|
| `CompanyEmailValidator` | `backend/app/Services/CompanyEmailValidator.php` | `extractDomain(string $email): string` | Extracts the domain from an email (e.g. `user@acme.com` → `acme.com`) |
| `CompanyProfileRepository` | `backend/app/Repositories/PostgreSQL/CompanyProfileRepository.php` | `findByDomain(string $domain)` | Queries PostgreSQL for a company profile matching the given domain. Returns the model or `null`. |

### Existing Usage Reference

See `backend/app/Services/AuthService.php`, lines 46–61. The `initiateRegistration()` method already does this exact check during `POST /auth/register`:

```php
// Lines 47-60 of AuthService.php
if (in_array($role, ['hr', 'company_admin'], true)) {
    $domain = $this->emailValidator->extractDomain($email);
    $existingCompany = app(\App\Repositories\PostgreSQL\CompanyProfileRepository::class)
        ->findByDomain($domain);

    if ($existingCompany) {
        if (! $companyInviteToken) {
            return 'company_invite_required';
        }
        // ... invite validation continues
    }
}
```

The new endpoint replicates this lookup as a **read-only, unauthenticated pre-check**.

---

## Implementation Steps

### SWE Recommendation

Choose **Option B** (inject `CompanyEmailValidator` directly into `AuthController::checkCompanyDomain()`).

Why this is recommended:
- Keeps `AuthService` focused on auth workflows, instead of exposing internal dependencies for a one-off read endpoint.
- Uses Laravel container DI cleanly for a read-only pre-check.
- Reduces blast radius to only route + controller for this change.

### Step 1: Add the Route

**File:** `backend/routes/api.php`

Add the following route in the **unauthenticated auth group** (alongside `/auth/register`, `/auth/login`, `/auth/verify-email`, etc.):

```php
Route::post('auth/check-company-domain', [AuthController::class, 'checkCompanyDomain']);
```

> **Important:** This route must NOT be inside any `auth:sanctum` middleware group. It is called before the user has an account.

### Step 2: Add the Controller Method

**File:** `backend/app/Http/Controllers/Auth/AuthController.php`

Add the following method to the existing `AuthController` class:

```php
public function checkCompanyDomain(
    Request $request,
    CompanyEmailValidator $emailValidator,
    CompanyProfileRepository $companyProfiles
): JsonResponse
{
    $request->validate([
        'email' => ['required', 'email'],
    ]);

    $domain = $emailValidator->extractDomain($request->input('email'));
    $companyProfile = $companyProfiles->findByDomain($domain);

    return $this->success(data: [
        'company_exists' => $companyProfile !== null,
        'company_name' => $companyProfile?->company_name ?? null,
        'requires_invite' => $companyProfile !== null,
    ]);
}
```

### Step 2a: Option Review (A vs B)

The `AuthController` constructor already injects `AuthService`. However, `CompanyEmailValidator` is a **private** dependency of `AuthService`. You have two options:

**Option A:** Add a getter to `AuthService`:

**File:** `backend/app/Services/AuthService.php`

```php
public function getEmailValidator(): CompanyEmailValidator
{
    return $this->emailValidator;
}
```

**Option B (recommended):** Inject `CompanyEmailValidator` directly into the controller method via Laravel's service container:

```php
public function checkCompanyDomain(Request $request, CompanyEmailValidator $emailValidator): JsonResponse
{
    // Use $emailValidator->extractDomain($email) directly
}
```

Either option is acceptable, but Option B is cleaner for this endpoint because it avoids widening `AuthService`’s public API.

---

## Expected Request / Response Contract

### Request

```
POST /api/v1/auth/check-company-domain
Content-Type: application/json

{
  "email": "john@acme.com"
}
```

### Response — Company Exists

```json
{
  "success": true,
  "data": {
    "company_exists": true,
    "company_name": "Acme Corporation",
    "requires_invite": true
  }
}
```

### Response — No Company Found

```json
{
  "success": true,
  "data": {
    "company_exists": false,
    "company_name": null,
    "requires_invite": false
  }
}
```

### Response — Validation Error (no email)

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "The email field is required."
}
```

> **Note:** The `success` wrapper comes from the base `Controller` class's `$this->success()` and `$this->error()` helper methods already used throughout the codebase.

---

## Frontend Reference (DO NOT MODIFY)

The frontend already calls this endpoint and handles the response. For reference, see `frontend/mobile/app/(auth)/register.tsx`, lines 884–920:

```typescript
const result = await api.post('/auth/check-company-domain', { email }) as {
  company_exists: boolean;
  company_name?: string;
  requires_invite: boolean;
};

if (result.company_exists && result.requires_invite) {
  // Redirect to HR invite form
} else {
  // Proceed to company admin registration
}
```

**No frontend changes are needed.**

---

## Files Changed Summary

| File | Action | Change |
|---|---|---|
| `backend/routes/api.php` | Edit | Add one `Route::post` line |
| `backend/app/Http/Controllers/Auth/AuthController.php` | Edit | Add `checkCompanyDomain()` method (~15 lines) |
| `backend/app/Services/AuthService.php` | No change | Not needed when using Option B |

**Total change: ~20 lines of code across 2–3 files.**
