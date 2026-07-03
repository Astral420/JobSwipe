# Admin Dashboard Requirements

## Overview
This document outlines missing admin endpoints and features needed for a comprehensive admin dashboard. The analysis is based on the existing backend codebase and identifies gaps in administrative functionality.

## Current Admin Endpoints (Existing)

### Dashboard Stats
- `GET /api/v1/admin/dashboard/stats` - Get overview statistics

### User Management
- `GET /api/v1/admin/users` - List users with filters
- `GET /api/v1/admin/users/{id}` - Get user details
- `POST /api/v1/admin/users/{id}/ban` - Ban user (super_admin only)
- `POST /api/v1/admin/users/{id}/unban` - Unban user (super_admin only)

### Company Verification
- `GET /api/v1/admin/companies/verifications` - List verification requests
- `GET /api/v1/admin/companies/verifications/{companyId}` - Get verification details
- `POST /api/v1/admin/companies/verifications/{companyId}/approve` - Approve verification
- `POST /api/v1/admin/companies/verifications/{companyId}/reject` - Reject verification

### Review Moderation
- `GET /api/v1/admin/reviews/flagged` - Get flagged reviews
- `POST /api/v1/admin/reviews/{id}/unflag` - Unflag review
- `DELETE /api/v1/admin/reviews/{id}` - Remove review

### Job Posting Management
- `DELETE /api/v1/admin/jobs/{id}/force` - Force delete job posting

---

## Missing Admin Endpoints

### 1. Company Management
**Purpose:** Manage companies beyond just verification

#### Endpoints Needed:
```
GET    /api/v1/admin/companies
GET    /api/v1/admin/companies/{id}
PATCH  /api/v1/admin/companies/{id}/trust-score
GET    /api/v1/admin/companies/{id}/trust-events
POST   /api/v1/admin/companies/{id}/suspend
POST   /api/v1/admin/companies/{id}/unsuspend
```

**Features:**
- List all companies with filters (verified status, trust level, subscription tier)
- View detailed company profile including trust score and listing cap
- Manually adjust trust score with reason
- View trust event history for a company
- Suspend/unsuspend company accounts

---

### 2. Trust System Management
**Purpose:** Monitor and manage the trust scoring system

#### Endpoints Needed:
```
GET    /api/v1/admin/trust/events
GET    /api/v1/admin/trust/companies/low-score
POST   /api/v1/admin/trust/recalculate/{companyId}
```

**Features:**
- View all trust events across the platform
- List companies with low trust scores
- Manually trigger trust score recalculation

---

### 3. Subscription Management
**Purpose:** Monitor and manage subscriptions (both Stripe and IAP)

#### Endpoints Needed:
```
GET    /api/v1/admin/subscriptions
GET    /api/v1/admin/subscriptions/{id}
POST   /api/v1/admin/subscriptions/{id}/cancel
GET    /api/v1/admin/subscriptions/revenue-stats
```

**Features:**
- List all active subscriptions with filters
- View subscription details and payment history
- Admin-initiated subscription cancellation
- Revenue statistics and analytics

---

### 4. IAP Transaction Management
**Purpose:** Monitor in-app purchases and troubleshoot issues

#### Endpoints Needed:
```
GET    /api/v1/admin/iap/transactions
GET    /api/v1/admin/iap/transactions/{id}
GET    /api/v1/admin/iap/webhook-events
POST   /api/v1/admin/iap/webhook-events/{id}/retry
```

**Features:**
- List all IAP transactions with filters (provider, status, user)
- View transaction details including receipt data
- Monitor webhook event processing
- Manually retry failed webhook events

---

### 5. Match & Application Analytics
**Purpose:** Monitor platform engagement and match quality

#### Endpoints Needed:
```
GET    /api/v1/admin/matches
GET    /api/v1/admin/matches/stats
GET    /api/v1/admin/applications
GET    /api/v1/admin/applications/stats
```

**Features:**
- List all matches with filters (status, date range)
- Match statistics (acceptance rate, response time, etc.)
- List all applications
- Application statistics (conversion rates, etc.)

---

### 6. Job Posting Management (Extended)
**Purpose:** Enhanced job posting moderation

#### Endpoints Needed:
```
GET    /api/v1/admin/jobs
GET    /api/v1/admin/jobs/{id}
POST   /api/v1/admin/jobs/{id}/flag
POST   /api/v1/admin/jobs/{id}/unflag
PATCH  /api/v1/admin/jobs/{id}/close
```

**Features:**
- List all job postings with filters
- View job posting details
- Flag suspicious job postings
- Unflag false positives
- Admin-initiated job closure

---

### 7. Blocked Email Domain Management
**Purpose:** Manage blocked email domains for company registration

#### Endpoints Needed:
```
GET    /api/v1/admin/blocked-domains
POST   /api/v1/admin/blocked-domains
DELETE /api/v1/admin/blocked-domains/{id}
```

**Features:**
- List all blocked email domains
- Add new blocked domain with reason
- Remove blocked domain

---

### 8. Point System Management
**Purpose:** Monitor applicant point system

#### Endpoints Needed:
```
GET    /api/v1/admin/points/events
POST   /api/v1/admin/points/grant
GET    /api/v1/admin/applicants/{id}/points
```

**Features:**
- View all point events
- Manually grant points to applicant
- View applicant point history

---

### 9. Notification Management
**Purpose:** Monitor and manage platform notifications

#### Endpoints Needed:
```
GET    /api/v1/admin/notifications
POST   /api/v1/admin/notifications/broadcast
GET    /api/v1/admin/notifications/stats
```

**Features:**
- View all notifications sent
- Send broadcast notifications to user segments
- Notification delivery statistics

---

### 10. Audit Logs
**Purpose:** Track admin actions for accountability

#### Endpoints Needed:
```
GET    /api/v1/admin/audit-logs
GET    /api/v1/admin/audit-logs/{id}
```

**Features:**
- View all admin actions with filters
- View detailed audit log entry
- Track who did what and when

**Note:** This requires creating a new `admin_audit_logs` table

---

### 11. System Health & Monitoring
**Purpose:** Monitor system health and background jobs

#### Endpoints Needed:
```
GET    /api/v1/admin/system/health
GET    /api/v1/admin/system/jobs
GET    /api/v1/admin/system/failed-jobs
POST   /api/v1/admin/system/jobs/{id}/retry
```

**Features:**
- System health check (DB connections, Redis, etc.)
- View queued and processing jobs
- View failed jobs
- Retry failed jobs

---

## Priority Recommendations

### High Priority (Core Admin Functions)
1. Company Management (list, view, suspend)
2. Subscription Management (monitoring and cancellation)
3. Job Posting Management (extended moderation)
4. IAP Transaction Management (troubleshooting)

### Medium Priority (Analytics & Monitoring)
5. Match & Application Analytics
6. Trust System Management
7. Point System Management
8. Notification Management

### Low Priority (Advanced Features)
9. Blocked Email Domain Management (can be managed via DB initially)
10. Audit Logs (nice-to-have for compliance)
11. System Health & Monitoring (can use Laravel Horizon for now)

---

## Data Models Reference

### Existing Models (PostgreSQL)
- `User` - All users (applicants, HR, admins)
- `CompanyProfile` - Company information and trust scores
- `ApplicantProfile` - Applicant information
- `JobPosting` - Job listings
- `Application` - Job applications
- `MatchRecord` - Matches between applicants and jobs
- `Subscription` - Stripe subscriptions
- `IAPTransaction` - In-app purchase transactions
- `CompanyReview` - Company reviews
- `Notification` - User notifications
- `PointEvent` - Applicant point events

### Existing Models (MongoDB)
- `ApplicantProfileDocument` - Extended applicant profile data
- `CompanyProfileDocument` - Extended company profile data
- `SwipeHistory` - Swipe records

### Tables Without Models
- `trust_events` - Trust score change events
- `blocked_email_domains` - Blocked email domains
- `stripe_webhook_events` - Stripe webhook processing
- `iap_webhook_events` - IAP webhook processing

---

## Technical Notes

### Authentication & Authorization
- All admin endpoints require `auth:sanctum` middleware
- Most endpoints require `role:moderator,super_admin` middleware
- Destructive actions require `role:super_admin` only

### Response Format
All endpoints follow the standard API response format:
```json
{
  "success": true,
  "data": {},
  "message": "Success message"
}
```

### Pagination
List endpoints should support pagination with `per_page` parameter (default: 20)

### Filtering
List endpoints should support common filters:
- Date ranges (`start_date`, `end_date`)
- Status filters
- Search by name/email
- Role filters (for users)

---

## Next Steps

1. Review and prioritize endpoints based on immediate admin needs
2. Implement high-priority endpoints first
3. Create corresponding service methods in `AdminService`
4. Add necessary repository methods
5. Write tests for new endpoints
6. Update API documentation
