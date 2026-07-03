# Phase 1: Trust System Implementation - Complete

## Overview
Successfully implemented Phase 1 of the Company Trust & Verification System, decoupling payment from onboarding and establishing the foundation for trust-based access control.

## What Was Implemented

### 1. Database Migrations (3 new files)

#### `2026_04_14_000001_add_trust_columns_to_company_profiles.php`
- Added `company_domain` (varchar 255, nullable)
- Added `is_free_email_domain` (boolean, default false)
- Added `trust_score` (integer, default 0)
- Added `trust_level` (varchar 15, default 'untrusted')
- Added `listing_cap` (integer, default 0)
- Updated `subscription_tier` constraint to include 'free'
- Added `trust_level` constraint (untrusted, new, established, trusted)
- Created indexes for trust_level and company_domain

#### `2026_04_14_000002_create_trust_events_table.php`
- Audit trail for trust-affecting events
- Tracks company_id, event_type, score_delta, score_after, metadata
- Foreign key to company_profiles with cascade delete
- Indexes on company_id, event_type, created_at

#### `2026_04_14_000003_create_blocked_email_domains_table.php`
- Stores free/disposable email provider domains
- Unique constraint on domain
- Reason field (free_provider, disposable)

### 2. Seeders (1 new file)

#### `BlockedEmailDomainSeeder.php`
- Seeds 22 free email providers (gmail, yahoo, outlook, etc.)
- Seeds 13 disposable email providers (mailinator, tempmail, etc.)
- Uses insertOrIgnore for idempotency

### 3. Services (1 new file)

#### `CompanyEmailValidator.php`
- `extractDomain()` - extracts domain from email
- `isBlockedDomain()` - checks against blocklist
- `validate()` - returns domain info with trust points (0 for free, 10 for corporate)

### 4. Model Updates

#### `CompanyProfile.php`
- Added trust fields to `$fillable` and `$casts`
- New method: `isApproved()` - checks if verification_status === 'approved'
- New method: `canPostJobs()` - checks approval + listing cap + active count

### 5. Service Updates

#### `ProfileService.php`
- New method: `setCompanyEmailDomain()` - validates and stores company email domain
- Updated `createCompanyProfile()`:
  - Changed `verification_status` from 'pending' to 'unverified'
  - Changed `subscription_tier` from 'none' to 'free'
  - Changed `subscription_status` from 'inactive' to 'active'
  - Added trust_score: 0, trust_level: 'untrusted', listing_cap: 0

#### `AuthService.php`
- Added `CompanyEmailValidator` to constructor
- Updated `completeRegistration()` to extract and store email domain for HR/company_admin roles

#### `ProfileOnboardingService.php`
- Changed `COMPANY_ONBOARDING_STEPS` from 4 to 3
- Removed step 2 (payment) entirely
- Reordered steps:
  1. Company details
  2. Verification documents (now required)
  3. Media (logo + office images)
- Deleted `completeCompanyStepPayment()` method
- Updated `completeCompanyStepVerification()` to require at least 1 document

#### `JobPostingController.php`
- Replaced subscription gate with verification + trust cap gate
- Changed error from `SUBSCRIPTION_REQUIRED` to `VERIFICATION_REQUIRED`
- Changed listing limit check from hardcoded 5 to dynamic `listing_cap`
- Updated error message to reference "trust level" instead of "subscription tier"

#### `SubscriptionService.php`
- Updated `canPostJobs()` to use `$companyProfile->canPostJobs()` method
- Updated `getSubscriptionStatus()` to include:
  - `verification_status`
  - `listing_cap`
  - `active_listings_count`
  - Uses `canPostJobs()` method instead of direct subscription check

#### `ProfileCompletionService.php`
- Replaced subscription status check with verification status check
- Now counts verification as complete if status is 'pending' or 'approved'

## Breaking Changes

### API Response Changes
- `GET /api/v1/company/subscription/status` now includes:
  - `verification_status`
  - `listing_cap`
  - `active_listings_count`

### Error Code Changes
- `POST /api/v1/company/jobs` now returns:
  - `VERIFICATION_REQUIRED` (403) instead of `SUBSCRIPTION_REQUIRED` (402)
  - Error message references "trust level" instead of "subscription tier"

### Onboarding Flow Changes
- Company onboarding reduced from 4 steps to 3
- Step 2 is now verification documents (required) instead of payment
- Payment is no longer part of onboarding

### Default Values Changes
- New companies start with:
  - `subscription_tier: 'free'` (was 'none')
  - `subscription_status: 'active'` (was 'inactive')
  - `verification_status: 'unverified'` (was 'pending')
  - `trust_score: 0`
  - `trust_level: 'untrusted'`
  - `listing_cap: 0`

## Migration Instructions

### 1. Run Migrations
```bash
cd JobSwipe/backend
php artisan migrate
php artisan db:seed --class=BlockedEmailDomainSeeder
```

### 2. Grandfather Existing Companies (Optional)
If you have existing companies in production, run this SQL to grandfather them:

```sql
-- Existing paid companies get minimum 60 trust score
UPDATE company_profiles 
SET trust_score = 60, 
    trust_level = 'established', 
    listing_cap = 5,
    subscription_tier = CASE 
        WHEN subscription_tier = 'none' THEN 'free' 
        ELSE subscription_tier 
    END
WHERE subscription_status = 'active' 
  AND subscription_tier IN ('basic', 'pro');

-- All other companies default to free tier
UPDATE company_profiles 
SET subscription_tier = 'free', 
    subscription_status = 'active'
WHERE subscription_tier = 'none';
```

### 3. Clear Route Cache
```bash
php artisan route:clear
php artisan config:clear
php artisan cache:clear
```

## Testing Checklist

### Manual Tests
- [ ] Register new HR user → verify free tier, unverified status
- [ ] Complete 3-step onboarding → verify pending verification
- [ ] Try posting job while unverified → verify VERIFICATION_REQUIRED error
- [ ] Admin approves company → verify listing_cap updates
- [ ] Post job successfully → verify active_listings_count increments
- [ ] Hit listing cap → verify LISTING_LIMIT_REACHED error
- [ ] Check subscription status endpoint → verify new fields present

### Unit Tests Needed
- [ ] `CompanyEmailValidatorTest::test_free_email_gets_zero_points`
- [ ] `CompanyEmailValidatorTest::test_corporate_email_gets_full_points`
- [ ] `CompanyEmailValidatorTest::test_blocklist_check`
- [ ] `JobPostingTest::test_unverified_company_cannot_post`
- [ ] `JobPostingTest::test_verified_company_within_cap_can_post`
- [ ] `JobPostingTest::test_listing_cap_enforced`
- [ ] `OnboardingTest::test_3_step_flow_no_payment`

## Next Steps (Phase 2)

Phase 2 will implement the Trust Score Engine:
- Create `config/trust.php` with scoring weights
- Implement `TrustScoreService` with 6-component scoring
- Add trust recalculation triggers
- Integrate visibility multiplier into `DeckService`
- Create artisan commands for monthly refresh and clean month bonus

## Files Changed

### New Files (5)
- `database/migrations/2026_04_14_000001_add_trust_columns_to_company_profiles.php`
- `database/migrations/2026_04_14_000002_create_trust_events_table.php`
- `database/migrations/2026_04_14_000003_create_blocked_email_domains_table.php`
- `database/seeders/BlockedEmailDomainSeeder.php`
- `app/Services/CompanyEmailValidator.php`

### Modified Files (8)
- `app/Models/PostgreSQL/CompanyProfile.php`
- `app/Services/ProfileService.php`
- `app/Services/AuthService.php`
- `app/Services/ProfileOnboardingService.php`
- `app/Http/Controllers/Company/JobPostingController.php`
- `app/Services/SubscriptionService.php`
- `app/Services/ProfileCompletionService.php`

## Rollback Instructions

If you need to rollback:

```bash
php artisan migrate:rollback --step=3
```

Note: This will remove trust columns. You'll need to manually update any 'free' tier values back to 'none' if rolling back after data has been created.
