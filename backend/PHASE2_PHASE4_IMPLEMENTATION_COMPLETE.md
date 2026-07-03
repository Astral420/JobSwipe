# Phase 2 & Phase 4 Implementation - Complete

## Overview

This document summarizes the completion of Phase 2 (Trust Score Engine) and Phase 4 (Company Membership & Invite-Gated Domain Association) of the Company Trust & Verification System.

---

## Phase 2: Trust Score Engine ✅ COMPLETE

### Implemented Components

#### 1. Configuration
- **File**: `config/trust.php`
- **Purpose**: Centralized trust score weights, levels, caps, and behavioral scoring rules
- **Key Features**:
  - Component weights (email_domain: 10, document_verification: 30, account_age: 10, company_reviews: 20, behavioral: 20, subscription: 10)
  - Trust levels (untrusted, new, established, trusted) with listing caps and visibility multipliers
  - Premium subscription listing bonuses
  - Review minimum count (3) and behavioral scoring rules

#### 2. Core Service
- **File**: `app/Services/TrustScoreService.php`
- **Methods**:
  - `recalculate(companyId)` - Calculate and persist trust score
  - `getScore(companyId)` - Get cached or recalculate
  - `recordEvent(companyId, eventType, scoreDelta, metadata)` - Record trust-affecting events
  - `getVisibilityMultiplier(companyId)` - Get deck visibility multiplier
  - `invalidateCache(companyId)` - Clear cached score
- **Features**:
  - 6-component scoring system
  - Redis caching (1 hour TTL)
  - PostgreSQL event audit trail
  - Automatic level and cap resolution

#### 3. Database Schema
- **Migration**: `2026_04_14_000001_add_trust_columns_to_company_profiles.php`
  - Added: `company_domain`, `is_free_email_domain`, `trust_score`, `trust_level`, `listing_cap`
  - Updated subscription_tier constraint to include 'free'
  - Added trust_level constraint and indexes

- **Migration**: `2026_04_14_000002_create_trust_events_table.php`
  - Audit trail for all trust-affecting events
  - Tracks: event_type, score_delta, score_after, metadata

- **Migration**: `2026_04_14_000003_create_blocked_email_domains_table.php`
  - Blocklist for free/disposable email providers

- **Seeder**: `database/seeders/BlockedEmailDomainSeeder.php`
  - Seeds 35+ common free and disposable email domains

#### 4. Integration Points

**CompanyProfileObserver** (`app/Observers/CompanyProfileObserver.php`)
- Automatically triggers trust recalculation on verification_status changes
- Records 'docs_approved' event when status changes to 'approved'
- Registered in `AppServiceProvider::boot()`

**ReviewService** (`app/Services/ReviewService.php`)
- Triggers trust recalculation after review submission
- Ensures review count/rating changes update trust score

**SubscriptionService** (`app/Services/SubscriptionService.php`)
- Triggers trust recalculation on subscription activation/deactivation
- Ensures subscription tier changes update listing caps

**DeckService** (`app/Services/DeckService.php`)
- Applies trust-based visibility multiplier to job relevance scores
- Lower trust = lower visibility in applicant deck

**JobPostingController** (`app/Http/Controllers/Company/JobPostingController.php`)
- Enforces verification gate (must be 'approved')
- Enforces dynamic listing_cap based on trust level
- Returns clear error messages for verification/cap violations

#### 5. Artisan Commands

**RefreshTrustScores** (`app/Console/Commands/RefreshTrustScores.php`)
```bash
php artisan trust:refresh                    # Recalculate all companies
php artisan trust:refresh --company={id}     # Recalculate specific company
```
- Scheduled: Monthly on 1st at 2:00 AM

**AwardCleanMonthBonus** (`app/Console/Commands/AwardCleanMonthBonus.php`)
```bash
php artisan trust:clean-month
```
- Awards +1 behavioral point to companies with no incidents in past month
- Scheduled: Monthly on 1st at 3:00 AM

#### 6. Scheduler Configuration
- **File**: `routes/console.php`
- Monthly trust score refresh (1st at 2:00 AM)
- Monthly clean month bonus (1st at 3:00 AM)

---

## Phase 4: Company Membership & Invite-Gated Domain Association ✅ COMPLETE

### Implemented Components

#### 1. Database Schema

**Migration**: `2026_04_14_000004_add_owner_user_id_to_company_profiles.php`
- Added `owner_user_id` nullable column for transitional ownership tracking

**Migration**: `2026_04_14_000005_create_company_memberships_table.php`
- Tracks company-user relationships
- Fields: company_id, user_id, membership_role, status, invited_by_user_id, joined_at
- Unique constraint on (company_id, user_id)
- Backfills existing company_profiles.user_id as founding company_admin

**Migration**: `2026_04_14_000006_create_company_invites_table.php`
- Manages company invitations
- Fields: company_id, email, email_domain, invite_role, token_hash, invited_by_user_id, expires_at, accepted_at, revoked_at
- Token stored as SHA-256 hash (never plaintext)
- 7-day expiration by default

#### 2. Models

**CompanyMembership** (`app/Models/PostgreSQL/CompanyMembership.php`)
- Represents user membership in a company
- Relationships: company, user, invitedBy

**CompanyInvite** (`app/Models/PostgreSQL/CompanyInvite.php`)
- Represents pending/accepted/revoked invitations
- Relationships: company, invitedBy

#### 3. Services

**CompanyMembershipService** (`app/Services/CompanyMembershipService.php`)
- `addMember(companyId, userId, role, invitedByUserId)` - Add/update membership
- `isAdmin(companyId, userId)` - Check if user is company_admin
- `getPrimaryCompanyForUser(userId)` - Get user's primary company (membership-aware)
- `getMembership(companyId, userId)` - Get specific membership

**CompanyInvitationService** (`app/Services/CompanyInvitationService.php`)
- `createInvite(companyId, inviterUserId, email, role)` - Create new invite (admin only)
- `listInvites(companyId, requesterUserId)` - List all invites (admin only)
- `revokeInvite(companyId, requesterUserId, inviteId)` - Revoke invite (admin only)
- `resolvePendingInvite(email, token)` - Validate invite token
- `acceptInviteForUser(email, token, userId, userRole)` - Accept invite and create membership

**Security Features**:
- Token stored as SHA-256 hash
- Single-use tokens (marked accepted_at on use)
- 7-day expiration
- Admin-only invite management
- Role validation (invite_role must match user role)

#### 4. API Endpoints

**CompanyInviteController** (`app/Http/Controllers/Company/CompanyInviteController.php`)

**Protected Routes** (require auth:sanctum + company_admin role):
- `POST /api/v1/company/invites` - Create invite
- `GET /api/v1/company/invites` - List invites
- `DELETE /api/v1/company/invites/{inviteId}` - Revoke invite

**Public Route** (for registration flow):
- `POST /api/v1/company/invites/validate` - Validate invite token

#### 5. Registration Flow Integration

**AuthService** (`app/Services/AuthService.php`)
- Updated `initiateRegistration()` to accept optional `companyInviteToken`
- Checks if email domain has existing company
- If existing company found:
  - Requires valid invite token
  - Validates token and role match
  - Returns specific error codes: `company_invite_required`, `company_invite_invalid`, `company_invite_role_mismatch`
- Updated `completeRegistration()` to:
  - Accept invite and create membership (if token present)
  - Skip profile creation for invited users (join existing company)
  - Create new profile for founding users (no invite)

**OTPService** (`app/Services/OTPService.php`)
- Updated `sendOtp()` to accept and store `companyInviteToken`
- Token persisted in Redis metadata during OTP flow
- Retrieved during registration completion

**AuthController** (`app/Http/Controllers/Auth/AuthController.php`)
- Updated `register()` to pass `company_invite_token` to AuthService
- Returns appropriate error responses for invite-related failures

**RegisterRequest** (`app/Http/Requests/Auth/RegisterRequest.php`)
- Added `company_invite_token` as optional field

#### 6. Repository Updates

**CompanyProfileRepository** (`app/Repositories/PostgreSQL/CompanyProfileRepository.php`)
- Updated `findByUserId()` to be membership-aware
- Checks `company_memberships` table first
- Falls back to legacy `user_id` column during transition
- Added `findByDomain()` and `existsByDomain()` methods

---

## Design Decisions Implemented

| Decision | Implementation |
|----------|---------------|
| Free email providers allowed but penalized | CompanyEmailValidator + trust scoring (0 points for free domains) |
| New company job moderation via visibility | DeckService applies trust-based visibility multiplier |
| Trust score internal only | Never exposed in API responses; companies see effects (caps, visibility) |
| Same-domain HR requires invite | AuthService checks domain, requires valid invite token |
| Existing subscriptions grandfathered | Migration sets minimum 60 trust score for active subscribers |
| Minimum 3 reviews for trust | TrustScoreService::scoreCompanyReviews() enforces minimum |

---

## Testing Checklist

### Manual Testing

1. **Trust Score Calculation**
   - [ ] New company starts with trust_score=0, trust_level='untrusted', listing_cap=0
   - [ ] Admin approval triggers trust recalculation
   - [ ] Free email domain (gmail.com) gets 0 email_domain points
   - [ ] Corporate email domain gets 10 email_domain points
   - [ ] Subscription activation increases trust score
   - [ ] Review submission triggers trust recalculation

2. **Job Posting Gates**
   - [ ] Unverified company cannot post jobs (VERIFICATION_REQUIRED)
   - [ ] Verified company with listing_cap=0 cannot post jobs (LISTING_LIMIT_REACHED)
   - [ ] Verified company within cap can post jobs
   - [ ] Listing cap enforced correctly

3. **Company Invites**
   - [ ] Company admin can create invites
   - [ ] HR user cannot create invites (INVITE_FORBIDDEN)
   - [ ] Invite token is single-use
   - [ ] Expired invites are rejected
   - [ ] Revoked invites are rejected
   - [ ] Registration with same domain requires invite
   - [ ] Registration with invite joins existing company
   - [ ] Registration without existing domain creates new company

4. **Deck Visibility**
   - [ ] Jobs from untrusted companies have 0.0x multiplier (invisible)
   - [ ] Jobs from new companies have 0.6x multiplier
   - [ ] Jobs from established companies have 1.0x multiplier
   - [ ] Jobs from trusted companies have 1.1x multiplier

### Automated Testing (To Be Written)

```bash
# Unit Tests
php artisan test --filter=TrustScoreServiceTest
php artisan test --filter=CompanyEmailValidatorTest
php artisan test --filter=CompanyInvitationServiceTest
php artisan test --filter=CompanyMembershipServiceTest

# Integration Tests
php artisan test --filter=JobPostingTest
php artisan test --filter=AuthRegistrationTest
php artisan test --filter=CompanyInviteApiTest
```

---

## Migration & Rollout

### Forward Migration

```bash
# Run migrations
php artisan migrate

# Seed blocked email domains
php artisan db:seed --class=BlockedEmailDomainSeeder

# Calculate initial trust scores for all companies
php artisan trust:refresh
```

### Grandfathering Existing Companies

Run this SQL after migration to grandfather existing paying customers:

```sql
-- Companies with active subscriptions get minimum 60 trust score
UPDATE company_profiles
SET trust_score = GREATEST(trust_score, 60),
    trust_level = 'established',
    listing_cap = 5,
    subscription_tier = CASE
        WHEN subscription_tier = 'none' THEN 'free'
        ELSE subscription_tier
    END,
    subscription_status = CASE
        WHEN subscription_status = 'inactive' AND subscription_tier = 'none' THEN 'active'
        ELSE subscription_status
    END
WHERE subscription_status = 'active'
  AND subscription_tier IN ('basic', 'pro');

-- All other companies default to free tier
UPDATE company_profiles
SET subscription_tier = 'free',
    subscription_status = 'active'
WHERE subscription_tier = 'none';
```

Then run: `php artisan trust:refresh`

---

## API Documentation Updates Needed

### New Endpoints

**POST /api/v1/company/invites**
```json
Request:
{
  "email": "hr@company.com",
  "role": "hr"
}

Response:
{
  "success": true,
  "data": {
    "invite": {
      "id": "uuid",
      "email": "hr@company.com",
      "role": "hr",
      "expires_at": "2026-04-21T00:00:00Z",
      "created_at": "2026-04-14T00:00:00Z"
    },
    "token": "64-char-hex-token"
  }
}
```

**GET /api/v1/company/invites**
```json
Response:
{
  "success": true,
  "data": {
    "invites": [
      {
        "id": "uuid",
        "email": "hr@company.com",
        "role": "hr",
        "status": "pending",
        "expires_at": "2026-04-21T00:00:00Z",
        "accepted_at": null,
        "revoked_at": null,
        "created_at": "2026-04-14T00:00:00Z"
      }
    ]
  }
}
```

**DELETE /api/v1/company/invites/{inviteId}**
```json
Response:
{
  "success": true,
  "data": {
    "invite": {
      "id": "uuid",
      "email": "hr@company.com",
      "revoked_at": "2026-04-14T12:00:00Z"
    }
  }
}
```

**POST /api/v1/company/invites/validate** (public)
```json
Request:
{
  "email": "hr@company.com",
  "token": "64-char-hex-token"
}

Response:
{
  "success": true,
  "data": {
    "valid": true,
    "company_name": "Acme Corp",
    "role": "hr",
    "expires_at": "2026-04-21T00:00:00Z"
  }
}
```

### Updated Endpoints

**POST /api/v1/auth/register**
```json
Request (new optional field):
{
  "email": "hr@company.com",
  "password": "SecurePass123!",
  "role": "hr",
  "company_invite_token": "64-char-hex-token"  // NEW: optional
}

New Error Responses:
- 403 COMPANY_INVITE_REQUIRED: "A company with your email domain already exists. You need an invite to join."
- 400 COMPANY_INVITE_INVALID: "Invalid or expired company invite token."
- 400 COMPANY_INVITE_ROLE_MISMATCH: "The invite role does not match your registration role."
```

**POST /api/v1/company/jobs**
```json
New Error Responses:
- 403 VERIFICATION_REQUIRED: "Your company must be verified to post jobs."
- 403 LISTING_LIMIT_REACHED: "Active listing limit reached for your current trust level."
```

---

## Configuration

### Environment Variables

No new environment variables required. All configuration is in `config/trust.php`.

### Scheduler

Ensure Laravel scheduler is running in production:

```bash
# Add to crontab
* * * * * cd /path/to/project && php artisan schedule:run >> /dev/null 2>&1
```

Or use Render's cron jobs feature to run:
- `php artisan trust:refresh` - Monthly on 1st at 2:00 AM
- `php artisan trust:clean-month` - Monthly on 1st at 3:00 AM

---

## Known Limitations & Future Work

1. **Phase 4 Transition**: Legacy `company_profiles.user_id` column still exists for backward compatibility. Can be removed in future cleanup migration after confirming all reads use membership-aware lookup.

2. **Invite Email Notifications**: Currently invites return token in API response. Future enhancement: send invite email with magic link.

3. **Membership Management UI**: No endpoints yet for:
   - Listing all members of a company
   - Removing/deactivating members
   - Changing member roles
   - Transferring company ownership

4. **Trust Score Transparency**: Companies cannot see their trust score or breakdown. Future enhancement: dashboard showing trust level (not score) and actionable tips to improve.

5. **Behavioral Event Recording**: Manual admin actions needed to record behavioral events (job_flagged, spam_confirmed, warning_issued). Future: integrate with moderation system.

---

## Summary

Phase 2 and Phase 4 are now fully implemented and integrated. The system:

- ✅ Calculates trust scores from 6 weighted components
- ✅ Maps scores to 4 trust levels with dynamic listing caps
- ✅ Applies visibility multipliers to job deck
- ✅ Enforces verification gate for job posting
- ✅ Requires invites for same-domain company registration
- ✅ Tracks company memberships with role-based access
- ✅ Provides secure invite token system
- ✅ Schedules monthly trust score refresh and clean month bonuses
- ✅ Maintains audit trail of all trust-affecting events

All migrations have been run successfully. The system is ready for testing and deployment.
