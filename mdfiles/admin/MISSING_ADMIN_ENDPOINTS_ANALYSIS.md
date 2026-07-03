# Missing Admin Endpoints - Complete Analysis

## Executive Summary

This document provides a comprehensive analysis of missing admin endpoints by comparing:
1. **ADMIN_DASHBOARD_REQUIREMENTS.md** - Backend requirements document
2. **ADMIN_DASHBOARD_BUILD_PROMPT.md** - Frontend build specifications
3. **Web Frontend Implementation** - Actual React components and hooks
4. **Existing Backend Routes** - Current API implementation

---

## Endpoint Status Matrix

### ✅ Already Implemented

| Endpoint | Method | Purpose | Middleware |
|----------|--------|---------|------------|
| `/api/v1/admin/dashboard/stats` | GET | Dashboard overview statistics | `role:moderator,super_admin` |
| `/api/v1/admin/users` | GET | List users with filters | `role:moderator,super_admin` |
| `/api/v1/admin/users/{id}` | GET | Get user details | `role:moderator,super_admin` |
| `/api/v1/admin/users/{id}/ban` | POST | Ban user | `role:super_admin` |
| `/api/v1/admin/users/{id}/unban` | POST | Unban user | `role:super_admin` |
| `/api/v1/admin/companies/verifications` | GET | List verification requests | `role:moderator,super_admin` |
| `/api/v1/admin/companies/verifications/{companyId}` | GET | Get verification details | `role:moderator,super_admin` |
| `/api/v1/admin/companies/verifications/{companyId}/approve` | POST | Approve verification | `role:moderator,super_admin` |
| `/api/v1/admin/companies/verifications/{companyId}/reject` | POST | Reject verification | `role:moderator,super_admin` |
| `/api/v1/admin/reviews/flagged` | GET | Get flagged reviews | `role:moderator,super_admin` |
| `/api/v1/admin/reviews/{id}/unflag` | POST | Unflag review | `role:moderator,super_admin` |
| `/api/v1/admin/reviews/{id}` | DELETE | Remove review | `role:moderator,super_admin` |
| `/api/v1/admin/jobs/{id}/force` | DELETE | Force delete job posting | `role:moderator,super_admin` |

---

## ❌ Missing Endpoints (Required by Frontend)

### Priority 1: Critical (Frontend is Broken Without These)

#### 1. Dashboard Analytics Endpoints

**Frontend Usage:** `JobSwipe/frontend/web/src/app/(dashboard)/dashboard/page.tsx`

| Endpoint | Method | Purpose | Expected Response | Frontend Hook |
|----------|--------|---------|-------------------|---------------|
| `/api/v1/admin/dashboard/user-growth` | GET | User growth over time | `UserGrowthData[]` | `useUserGrowthData()` |
| `/api/v1/admin/dashboard/revenue` | GET | Revenue breakdown | `RevenueData[]` | `useRevenueData()` |
| `/api/v1/admin/dashboard/activity` | GET | Recent activity feed | `Activity[]` | `useDashboardActivity()` |

**Response Schemas:**
```typescript
// UserGrowthData
{
  date: string;           // "2024-01-15"
  applicants: number;     // New applicants count
  companies: number;      // New companies count
  total: number;          // Total new users
}

// RevenueData
{
  date: string;           // "2024-01"
  subscriptions: number;  // Revenue from Stripe subscriptions
  iap: number;            // Revenue from IAP
  total: number;          // Total revenue
}

// Activity
{
  id: string;
  type: string;           // "user_banned", "company_verified", etc.
  description: string;    // Human-readable description
  createdAt: string;      // ISO timestamp
}
```

#### 2. Company Management Endpoints

**Frontend Usage:** `JobSwipe/frontend/web/src/app/(dashboard)/companies/page.tsx`

| Endpoint | Method | Purpose | Expected Response | Frontend Hook |
|----------|--------|---------|-------------------|---------------|
| `/api/v1/admin/companies` | GET | List companies with filters | `PaginatedResponse<Company>` | `useCompanies()` |
| `/api/v1/admin/companies/{id}` | GET | Get company details | `Company` | `useCompany()` |
| `/api/v1/admin/companies/{id}/suspend` | POST | Suspend company account | `{ message: string }` | `useSuspendCompany()` |
| `/api/v1/admin/companies/{id}/unsuspend` | POST | Unsuspend company account | `{ message: string }` | `useUnsuspendCompany()` |

**Query Parameters for `/admin/companies`:**
- `page` (number): Page number
- `pageSize` (number): Items per page (default: 20)
- `verificationStatus` (string): "pending" | "verified" | "rejected"
- `trustLevel` (string): "high" | "medium" | "low"
- `subscriptionTier` (string): "free" | "basic" | "premium" | "enterprise"
- `status` (string): "active" | "suspended"
- `search` (string): Search by company name

**Company Response Schema:**
```typescript
{
  id: string;
  name: string;
  industry: string | null;
  logoUrl: string | null;
  verificationStatus: "pending" | "verified" | "rejected";
  trustLevel: "high" | "medium" | "low";
  trustScore: number;              // 0-100
  subscriptionTier: "free" | "basic" | "premium" | "enterprise";
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
}
```

---

### Priority 2: High (Core Admin Functions)

#### 3. Job Posting Management (Extended)

**Frontend Usage:** `JobSwipe/frontend/web/src/lib/hooks.ts` (useJobs, useFlagJob, useCloseJob)

| Endpoint | Method | Purpose | Middleware |
|----------|--------|---------|------------|
| `/api/v1/admin/jobs` | GET | List all job postings with filters | `role:moderator,super_admin` |
| `/api/v1/admin/jobs/{id}` | GET | Get job posting details | `role:moderator,super_admin` |
| `/api/v1/admin/jobs/{id}/flag` | POST | Flag suspicious job posting | `role:moderator,super_admin` |
| `/api/v1/admin/jobs/{id}/unflag` | POST | Unflag false positive | `role:moderator,super_admin` |
| `/api/v1/admin/jobs/{id}/close` | PATCH | Admin-initiated job closure | `role:moderator,super_admin` |

**Query Parameters:**
- `page`, `pageSize`
- `status`: "active" | "closed" | "flagged"
- `companyId`: Filter by company
- `startDate`, `endDate`: Date range filter
- `search`: Search by title

#### 4. Subscription Management

**Frontend Usage:** `JobSwipe/frontend/web/src/lib/hooks.ts` (useSubscriptions, useCancelSubscription)

| Endpoint | Method | Purpose | Middleware |
|----------|--------|---------|------------|
| `/api/v1/admin/subscriptions` | GET | List all subscriptions | `role:moderator,super_admin` |
| `/api/v1/admin/subscriptions/{id}` | GET | Get subscription details | `role:moderator,super_admin` |
| `/api/v1/admin/subscriptions/{id}/cancel` | POST | Admin-initiated cancellation | `role:super_admin` |
| `/api/v1/admin/subscriptions/revenue-stats` | GET | Revenue statistics | `role:moderator,super_admin` |

**Query Parameters:**
- `page`, `pageSize`
- `status`: "active" | "cancelled" | "expired" | "refunded"
- `tier`: "free" | "basic" | "premium" | "enterprise"
- `subscriberType`: "applicant" | "company"
- `search`: Search by user email or company name

#### 5. IAP Transaction Management

**Frontend Usage:** `JobSwipe/frontend/web/src/lib/hooks.ts` (useIAPTransactions, useWebhookEvents, useRetryWebhook)

| Endpoint | Method | Purpose | Middleware |
|----------|--------|---------|------------|
| `/api/v1/admin/iap/transactions` | GET | List IAP transactions | `role:moderator,super_admin` |
| `/api/v1/admin/iap/transactions/{id}` | GET | Get transaction details | `role:moderator,super_admin` |
| `/api/v1/admin/iap/webhook-events` | GET | List webhook events | `role:moderator,super_admin` |
| `/api/v1/admin/iap/webhook-events/{id}/retry` | POST | Retry failed webhook | `role:super_admin` |

**Query Parameters for transactions:**
- `page`, `pageSize`
- `provider`: "apple" | "google"
- `status`: "pending" | "completed" | "failed" | "refunded"
- `userId`: Filter by user
- `startDate`, `endDate`

---

### Priority 3: Medium (Analytics & Monitoring)

#### 6. Trust System Management

**Frontend Usage:** `JobSwipe/frontend/web/src/lib/hooks.ts` (useTrustEvents, useLowTrustCompanies, useRecalculateTrustScore)

| Endpoint | Method | Purpose | Middleware |
|----------|--------|---------|------------|
| `/api/v1/admin/trust/events` | GET | View all trust events | `role:moderator,super_admin` |
| `/api/v1/admin/trust/low-trust` | GET | List low trust companies | `role:moderator,super_admin` |
| `/api/v1/admin/trust/{companyId}/recalculate` | POST | Recalculate trust score | `role:super_admin` |
| `/api/v1/admin/companies/{id}/trust-events` | GET | Company trust history | `role:moderator,super_admin` |
| `/api/v1/admin/companies/{id}/trust-score` | PATCH | Manually adjust trust score | `role:super_admin` |

#### 7. Match & Application Analytics

**Frontend Usage:** `JobSwipe/frontend/web/src/lib/hooks.ts` (useMatches, useMatchStats)

| Endpoint | Method | Purpose | Middleware |
|----------|--------|---------|------------|
| `/api/v1/admin/matches` | GET | List all matches | `role:moderator,super_admin` |
| `/api/v1/admin/matches/stats` | GET | Match statistics | `role:moderator,super_admin` |
| `/api/v1/admin/applications` | GET | List all applications | `role:moderator,super_admin` |
| `/api/v1/admin/applications/stats` | GET | Application statistics | `role:moderator,super_admin` |

---

### Priority 4: Low (Advanced Features)

#### 8. Blocked Email Domain Management

| Endpoint | Method | Purpose | Middleware |
|----------|--------|---------|------------|
| `/api/v1/admin/blocked-domains` | GET | List blocked domains | `role:moderator,super_admin` |
| `/api/v1/admin/blocked-domains` | POST | Add blocked domain | `role:super_admin` |
| `/api/v1/admin/blocked-domains/{id}` | DELETE | Remove blocked domain | `role:super_admin` |

#### 9. Point System Management

| Endpoint | Method | Purpose | Middleware |
|----------|--------|---------|------------|
| `/api/v1/admin/points/events` | GET | View all point events | `role:moderator,super_admin` |
| `/api/v1/admin/points/grant` | POST | Manually grant points | `role:super_admin` |
| `/api/v1/admin/applicants/{id}/points` | GET | View applicant point history | `role:moderator,super_admin` |

#### 10. Notification Management

| Endpoint | Method | Purpose | Middleware |
|----------|--------|---------|------------|
| `/api/v1/admin/notifications` | GET | View all notifications | `role:moderator,super_admin` |
| `/api/v1/admin/notifications/broadcast` | POST | Send broadcast notification | `role:super_admin` |
| `/api/v1/admin/notifications/stats` | GET | Notification statistics | `role:moderator,super_admin` |

#### 11. Audit Logs (Requires New Table)

| Endpoint | Method | Purpose | Middleware |
|----------|--------|---------|------------|
| `/api/v1/admin/audit-logs` | GET | View admin actions | `role:moderator,super_admin` |
| `/api/v1/admin/audit-logs/{id}` | GET | View audit log details | `role:moderator,super_admin` |

**Note:** Requires creating `admin_audit_logs` table

#### 12. System Health & Monitoring

| Endpoint | Method | Purpose | Middleware |
|----------|--------|---------|------------|
| `/api/v1/admin/system/health` | GET | System health check | `role:moderator,super_admin` |
| `/api/v1/admin/system/jobs` | GET | View queued jobs | `role:moderator,super_admin` |
| `/api/v1/admin/system/failed-jobs` | GET | View failed jobs | `role:moderator,super_admin` |
| `/api/v1/admin/system/jobs/{id}/retry` | POST | Retry failed job | `role:super_admin` |

---

## Middleware Requirements

### Existing Middleware (Already Implemented)

1. **`auth:sanctum`** - Token-based authentication
2. **`role:moderator,super_admin`** - Allow moderators and super admins
3. **`role:super_admin`** - Super admin only (destructive actions)

### Middleware Usage Pattern

```php
// Read-only operations (moderator + super_admin)
Route::middleware('role:moderator,super_admin')->group(function () {
    Route::get('/admin/companies', [AdminCompanyController::class, 'index']);
    Route::get('/admin/companies/{id}', [AdminCompanyController::class, 'show']);
});

// Destructive operations (super_admin only)
Route::middleware('role:super_admin')->group(function () {
    Route::post('/admin/companies/{id}/suspend', [AdminCompanyController::class, 'suspend']);
    Route::delete('/admin/companies/{id}', [AdminCompanyController::class, 'destroy']);
});
```

---

## Implementation Checklist

### Phase 1: Critical Endpoints (Week 1)
- [ ] `GET /api/v1/admin/dashboard/user-growth`
- [ ] `GET /api/v1/admin/dashboard/revenue`
- [ ] `GET /api/v1/admin/dashboard/activity`
- [ ] `GET /api/v1/admin/companies`
- [ ] `GET /api/v1/admin/companies/{id}`
- [ ] `POST /api/v1/admin/companies/{id}/suspend`
- [ ] `POST /api/v1/admin/companies/{id}/unsuspend`

### Phase 2: Core Admin Functions (Week 2)
- [ ] `GET /api/v1/admin/jobs`
- [ ] `GET /api/v1/admin/jobs/{id}`
- [ ] `POST /api/v1/admin/jobs/{id}/flag`
- [ ] `POST /api/v1/admin/jobs/{id}/unflag`
- [ ] `PATCH /api/v1/admin/jobs/{id}/close`
- [ ] `GET /api/v1/admin/subscriptions`
- [ ] `GET /api/v1/admin/subscriptions/{id}`
- [ ] `POST /api/v1/admin/subscriptions/{id}/cancel`
- [ ] `GET /api/v1/admin/subscriptions/revenue-stats`

### Phase 3: IAP & Trust (Week 3)
- [ ] `GET /api/v1/admin/iap/transactions`
- [ ] `GET /api/v1/admin/iap/transactions/{id}`
- [ ] `GET /api/v1/admin/iap/webhook-events`
- [ ] `POST /api/v1/admin/iap/webhook-events/{id}/retry`
- [ ] `GET /api/v1/admin/trust/events`
- [ ] `GET /api/v1/admin/trust/low-trust`
- [ ] `POST /api/v1/admin/trust/{companyId}/recalculate`
- [ ] `GET /api/v1/admin/companies/{id}/trust-events`
- [ ] `PATCH /api/v1/admin/companies/{id}/trust-score`

### Phase 4: Analytics (Week 4)
- [ ] `GET /api/v1/admin/matches`
- [ ] `GET /api/v1/admin/matches/stats`
- [ ] `GET /api/v1/admin/applications`
- [ ] `GET /api/v1/admin/applications/stats`

### Phase 5: Advanced Features (Optional)
- [ ] Blocked domain management endpoints
- [ ] Point system management endpoints
- [ ] Notification management endpoints
- [ ] Audit logs (requires new table)
- [ ] System health monitoring endpoints

---

## Required Service Methods

### AdminService Methods to Implement

```php
// Dashboard
public function getUserGrowthData(int $days = 30): array
public function getRevenueData(int $months = 12): array
public function getRecentActivity(int $limit = 50): array

// Companies
public function listCompanies(array $filters, int $perPage = 20): LengthAwarePaginator
public function getCompanyDetails(string $companyId): array
public function suspendCompany(string $companyId, string $reason): bool
public function unsuspendCompany(string $companyId): bool

// Jobs
public function listJobs(array $filters, int $perPage = 20): LengthAwarePaginator
public function getJobDetails(string $jobId): array
public function flagJob(string $jobId, string $reason): bool
public function unflagJob(string $jobId): bool
public function closeJob(string $jobId): bool

// Subscriptions
public function listSubscriptions(array $filters, int $perPage = 20): LengthAwarePaginator
public function getSubscriptionDetails(string $subscriptionId): array
public function cancelSubscription(string $subscriptionId, string $reason): bool
public function getRevenueStats(): array

// IAP
public function listIAPTransactions(array $filters, int $perPage = 20): LengthAwarePaginator
public function getIAPTransactionDetails(string $transactionId): array
public function listWebhookEvents(int $perPage = 20): LengthAwarePaginator
public function retryWebhookEvent(string $eventId): bool

// Trust
public function listTrustEvents(int $perPage = 20): LengthAwarePaginator
public function getLowTrustCompanies(): array
public function recalculateTrustScore(string $companyId): float
public function getCompanyTrustEvents(string $companyId): array
public function adjustTrustScore(string $companyId, float $newScore, string $reason): bool

// Matches
public function listMatches(array $filters, int $perPage = 20): LengthAwarePaginator
public function getMatchStats(): array
```

---

## Required Repository Methods

### Repositories to Create/Extend

1. **AdminDashboardRepository** (new)
   - `getUserGrowthData()`
   - `getRevenueData()`
   - `getRecentActivity()`

2. **CompanyProfileRepository** (extend existing)
   - `listForAdmin()`
   - `suspendCompany()`
   - `unsuspendCompany()`

3. **JobPostingRepository** (extend existing)
   - `listForAdmin()`
   - `flagJob()`
   - `unflagJob()`

4. **SubscriptionRepository** (extend existing)
   - `listForAdmin()`
   - `getRevenueStats()`

5. **IAPTransactionRepository** (extend existing)
   - `listForAdmin()`

6. **TrustEventRepository** (new)
   - `listAll()`
   - `getByCompany()`

7. **MatchRepository** (extend existing)
   - `listForAdmin()`
   - `getStats()`

---

## Database Considerations

### Existing Tables (No Changes Needed)
- `users`
- `company_profiles`
- `job_postings`
- `subscriptions`
- `iap_transactions`
- `iap_webhook_events`
- `trust_events`
- `match_records`
- `applications`

### New Tables Needed (Optional)
- `admin_audit_logs` (for audit logging feature)

### Indexes to Add (Performance)
```sql
-- For admin queries
ALTER TABLE company_profiles ADD INDEX idx_verification_status (verification_status);
ALTER TABLE company_profiles ADD INDEX idx_trust_level (trust_level);
ALTER TABLE company_profiles ADD INDEX idx_status (status);
ALTER TABLE job_postings ADD INDEX idx_status (status);
ALTER TABLE subscriptions ADD INDEX idx_status (status);
ALTER TABLE iap_transactions ADD INDEX idx_provider_status (provider, status);
```

---

## Testing Requirements

### Feature Tests to Write

1. **AdminCompanyControllerTest**
   - Test listing companies with filters
   - Test company details retrieval
   - Test suspend/unsuspend functionality
   - Test authorization (moderator vs super_admin)

2. **AdminDashboardControllerTest**
   - Test user growth data
   - Test revenue data
   - Test activity feed

3. **AdminJobControllerTest**
   - Test listing jobs with filters
   - Test flag/unflag functionality
   - Test admin job closure

4. **AdminSubscriptionControllerTest**
   - Test listing subscriptions
   - Test admin cancellation
   - Test revenue stats

5. **AdminIAPControllerTest**
   - Test transaction listing
   - Test webhook event listing
   - Test webhook retry

6. **AdminTrustControllerTest**
   - Test trust event listing
   - Test low trust companies
   - Test trust score recalculation

---

## API Response Format

All endpoints follow the standard format:

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE_IN_SCREAMING_SNAKE_CASE"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "data": [],
    "current_page": 1,
    "per_page": 20,
    "total": 100,
    "last_page": 5,
    "from": 1,
    "to": 20
  },
  "message": "Success"
}
```

---

## Frontend-Backend Discrepancies

### 1. Endpoint Path Differences

**Frontend expects:**
```typescript
api.get('/admin/companies')
api.get('/admin/stats')
```

**Backend should provide:**
```php
Route::get('/api/v1/admin/companies', ...)
Route::get('/api/v1/admin/dashboard/stats', ...)
```

**Note:** Frontend API client should be configured with base URL `/api/v1` to match backend routes.

### 2. Response Structure Alignment

Frontend hooks expect the response to be unwrapped:
```typescript
const { data } = await api.get<Company>('/admin/companies/123');
// data should be the Company object directly
```

Backend should return:
```json
{
  "success": true,
  "data": { /* Company object */ },
  "message": "Success"
}
```

The Axios interceptor in frontend should unwrap `response.data.data`.

---

## Next Steps

1. **Review this analysis** with the team
2. **Prioritize endpoints** based on immediate frontend needs
3. **Create controllers** for missing endpoints
4. **Implement service methods** in AdminService
5. **Add repository methods** as needed
6. **Write tests** for new endpoints
7. **Update API documentation**
8. **Verify frontend integration** after backend implementation

---

## Estimated Implementation Time

- **Phase 1 (Critical):** 3-5 days
- **Phase 2 (Core):** 5-7 days
- **Phase 3 (IAP & Trust):** 5-7 days
- **Phase 4 (Analytics):** 3-5 days
- **Phase 5 (Advanced):** 5-7 days (optional)

**Total:** 3-4 weeks for full implementation

---

## Conclusion

The frontend admin dashboard is well-designed and follows best practices, but it requires **27 missing backend endpoints** to be fully functional. The most critical endpoints are:

1. Dashboard analytics (user growth, revenue, activity)
2. Company management (list, details, suspend/unsuspend)
3. Job posting management (list, flag, close)
4. Subscription management (list, details, cancel)

These should be implemented first to unblock frontend development.
