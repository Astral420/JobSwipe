# Phase 2 & Phase 4 Quick Reference

## Trust Score System

### Trust Levels & Caps

| Level | Min Score | Base Listing Cap | Visibility Multiplier |
|-------|-----------|------------------|----------------------|
| untrusted | 0-30 | 0 | 0.0x (invisible) |
| new | 31-50 | 2 | 0.6x |
| established | 51-75 | 5 | 1.0x |
| trusted | 76-100 | 15 | 1.1x |

### Premium Listing Bonuses

- Basic subscription: +3 listings
- Pro subscription: +8 listings

**Example**: Established company (base cap: 5) with Basic subscription = 8 total listings

### Score Components

| Component | Max Points | Criteria |
|-----------|-----------|----------|
| Email Domain | 10 | Corporate domain = 10, Free email = 0 |
| Document Verification | 30 | Approved = 30, Pending = 10, Rejected = 5 |
| Account Age | 10 | 12+ months = 10, 6+ = 7, 3+ = 5, 1+ = 3 |
| Company Reviews | 20 | 4.5★ + 10 reviews = 20, 4.0★ + 5 = 15, 3.5★ + 3 = 10 |
| Behavioral | 20 | Base 15 + clean months - penalties |
| Subscription | 10 | Pro = 10, Basic = 7, Free = 0 |

### Behavioral Events

| Event | Score Delta |
|-------|-------------|
| clean_month | +1 |
| job_flagged | -5 |
| warning_issued | -8 |
| spam_confirmed | -10 |

---

## Company Invite Flow

### 1. Admin Creates Invite

```bash
POST /api/v1/company/invites
Authorization: Bearer {admin_token}

{
  "email": "newhr@company.com",
  "role": "hr"
}

Response:
{
  "invite": { "id": "...", "expires_at": "..." },
  "token": "abc123..."  // Share this with the invitee
}
```

### 2. Invitee Registers

```bash
POST /api/v1/auth/register

{
  "email": "newhr@company.com",
  "password": "SecurePass123!",
  "role": "hr",
  "company_invite_token": "abc123..."
}
```

### 3. System Behavior

- If domain has existing company + no token → `COMPANY_INVITE_REQUIRED`
- If domain has existing company + valid token → joins existing company
- If domain has no existing company → creates new company (founding admin)

---

## Artisan Commands

### Trust Score Management

```bash
# Recalculate all company trust scores
php artisan trust:refresh

# Recalculate specific company
php artisan trust:refresh --company={uuid}

# Award clean month bonus (run monthly)
php artisan trust:clean-month
```

### Scheduled Jobs

```bash
# Monthly on 1st at 2:00 AM
trust:refresh

# Monthly on 1st at 3:00 AM
trust:clean-month
```

---

## Common Scenarios

### New Company Registration

1. HR user registers with `hr@newcompany.com`
2. No existing company with domain `newcompany.com`
3. System creates:
   - User account
   - Company profile (trust_score=0, trust_level='untrusted', listing_cap=0)
   - Company membership (role='company_admin')
4. User completes onboarding (3 steps, no payment)
5. Admin reviews verification documents
6. Admin approves → trust recalculates
7. Company reaches 'new' level (score 31+, cap 2)
8. Company can now post up to 2 jobs

### Adding Team Member

1. Company admin creates invite for `hr2@company.com`
2. System generates token, stores hash
3. Admin shares token with HR user
4. HR user registers with token
5. System validates:
   - Email matches invite
   - Token is valid and not expired
   - Role matches invite role
6. User joins existing company (no new profile created)
7. Membership created with role='hr'

### Trust Score Increase

**Scenario**: New company wants to post more jobs

Current state:
- trust_score: 35 (new level)
- listing_cap: 2
- Components: email=10, docs=10, age=3, reviews=0, behavioral=15, subscription=0

Actions to increase:
1. Wait for admin approval → docs=30 (+20 points) → score=55 (established, cap=5)
2. Get 3+ reviews with 3.5★+ → reviews=10 (+10 points) → score=65
3. Subscribe to Basic → subscription=7 (+7 points) → score=72, cap=5+3=8
4. Wait 6 months → age=7 (+4 points) → score=76 (trusted, cap=15+3=18)

---

## Error Codes

### Registration

| Code | HTTP | Meaning |
|------|------|---------|
| EMAIL_TAKEN | 409 | Email already registered |
| COMPANY_INVITE_REQUIRED | 403 | Domain exists, invite needed |
| COMPANY_INVITE_INVALID | 400 | Token invalid/expired |
| COMPANY_INVITE_ROLE_MISMATCH | 400 | Invite role ≠ registration role |

### Job Posting

| Code | HTTP | Meaning |
|------|------|---------|
| VERIFICATION_REQUIRED | 403 | Company not admin-approved |
| LISTING_LIMIT_REACHED | 403 | Hit listing_cap for trust level |

### Invites

| Code | HTTP | Meaning |
|------|------|---------|
| INVITE_FORBIDDEN | 403 | Only admins can manage invites |
| INVITE_NOT_FOUND | 404 | Invite doesn't exist |
| INVITE_ALREADY_ACCEPTED | 400 | Cannot revoke accepted invite |

---

## Database Queries

### Check Company Trust Status

```sql
SELECT 
  company_name,
  trust_score,
  trust_level,
  listing_cap,
  active_listings_count,
  verification_status,
  subscription_tier
FROM company_profiles
WHERE id = 'company-uuid';
```

### View Trust Events

```sql
SELECT 
  event_type,
  score_delta,
  score_after,
  metadata,
  created_at
FROM trust_events
WHERE company_id = 'company-uuid'
ORDER BY created_at DESC
LIMIT 10;
```

### List Company Members

```sql
SELECT 
  u.email,
  cm.membership_role,
  cm.status,
  cm.joined_at
FROM company_memberships cm
JOIN users u ON u.id = cm.user_id
WHERE cm.company_id = 'company-uuid'
  AND cm.status = 'active';
```

### Pending Invites

```sql
SELECT 
  email,
  invite_role,
  expires_at,
  created_at
FROM company_invites
WHERE company_id = 'company-uuid'
  AND accepted_at IS NULL
  AND revoked_at IS NULL
  AND expires_at > NOW();
```

---

## Testing Checklist

### Trust Score

- [ ] New company: score=0, level='untrusted', cap=0
- [ ] Admin approval: score increases, level changes
- [ ] Free email (gmail): email_domain=0
- [ ] Corporate email: email_domain=10
- [ ] Subscription activation: score increases
- [ ] Review submission: score recalculates
- [ ] Job flagged: behavioral score decreases
- [ ] Clean month: behavioral score increases

### Job Posting

- [ ] Unverified company: VERIFICATION_REQUIRED
- [ ] Verified, cap=0: LISTING_LIMIT_REACHED
- [ ] Verified, within cap: success
- [ ] Hit cap: LISTING_LIMIT_REACHED

### Invites

- [ ] Admin creates invite: success
- [ ] HR creates invite: INVITE_FORBIDDEN
- [ ] Register with same domain, no token: COMPANY_INVITE_REQUIRED
- [ ] Register with valid token: joins company
- [ ] Register with expired token: COMPANY_INVITE_INVALID
- [ ] Register with wrong role: COMPANY_INVITE_ROLE_MISMATCH
- [ ] Token is single-use: second use fails

### Deck Visibility

- [ ] Untrusted company jobs: invisible (0.0x)
- [ ] New company jobs: reduced visibility (0.6x)
- [ ] Established company jobs: normal visibility (1.0x)
- [ ] Trusted company jobs: boosted visibility (1.1x)

---

## Troubleshooting

### Company can't post jobs

1. Check verification status: `SELECT verification_status FROM company_profiles WHERE id = '...'`
   - If not 'approved': Admin needs to approve verification documents
2. Check listing cap: `SELECT listing_cap, active_listings_count FROM company_profiles WHERE id = '...'`
   - If cap=0: Trust score too low (need admin approval)
   - If active_listings_count >= listing_cap: Hit limit, need higher trust or subscription

### Trust score not updating

1. Check if observer is registered: `grep CompanyProfileObserver app/Providers/AppServiceProvider.php`
2. Check trust_events table: `SELECT * FROM trust_events WHERE company_id = '...' ORDER BY created_at DESC LIMIT 5`
3. Manually trigger: `php artisan trust:refresh --company={uuid}`
4. Check Redis cache: `redis-cli GET trust:score:{uuid}`

### Invite not working

1. Check invite exists: `SELECT * FROM company_invites WHERE email = '...' AND accepted_at IS NULL`
2. Check expiration: `expires_at > NOW()`
3. Check token hash: Token must be hashed with SHA-256
4. Check domain match: `email_domain` must match company's `company_domain`

---

## Configuration

All trust score configuration is in `config/trust.php`:

```php
// Adjust component weights
'weights' => [
    'email_domain' => 10,
    'document_verification' => 30,
    // ...
],

// Adjust trust levels
'levels' => [
    'new' => [
        'min_score' => 31,
        'listing_cap' => 2,
        'visibility_multiplier' => 0.6,
    ],
    // ...
],

// Adjust premium bonuses
'premium_listing_bonus' => [
    'basic' => 3,
    'pro' => 8,
],
```

---

## Next Steps

1. Write automated tests (see PHASE2_PHASE4_IMPLEMENTATION_COMPLETE.md)
2. Update API documentation
3. Create admin dashboard for trust score management
4. Implement behavioral event recording from moderation system
5. Add invite email notifications
6. Build membership management UI
