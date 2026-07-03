# Frontend-Backend Integration Test Checklist

## Pre-Test Setup

### Backend Setup
- [ ] Backend server running: `cd JobSwipe/backend && php artisan serve`
- [ ] Database migrated: `php artisan migrate:fresh --seed`
- [ ] Admin user created with proper role (moderator or super_admin)
- [ ] Test data seeded (companies, jobs, subscriptions, etc.)

### Frontend Setup
- [ ] Frontend dev server running: `cd JobSwipe/frontend/web && npm run dev`
- [ ] Environment variable set: `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
- [ ] Logged in as admin user

## Dashboard Analytics

### User Growth Data
- [ ] Navigate to `/dashboard`
- [ ] Verify user growth chart loads
- [ ] Check data shows daily user registration counts
- [ ] Verify growth percentages display correctly

### Revenue Data
- [ ] Verify revenue chart loads
- [ ] Check monthly revenue breakdown (subscriptions + IAP)
- [ ] Verify currency formatting is correct

### Activity Feed
- [ ] Verify recent activity list loads
- [ ] Check activity items show type and description
- [ ] Verify timestamps are formatted correctly

### Dashboard Stats Cards
- [ ] Total Users count displays
- [ ] Active Companies count displays
- [ ] Active Listings count displays
- [ ] Monthly Revenue displays with currency
- [ ] Active Subscriptions count displays
- [ ] Pending Verifications count displays
- [ ] Flagged Content count displays
- [ ] Low Trust Companies count displays

## User Management

### List Users
- [ ] Navigate to `/users`
- [ ] Verify user list loads with pagination
- [ ] Test role filter (admin, moderator, user)
- [ ] Test status filter (active, banned, suspended)
- [ ] Test search functionality
- [ ] Verify pagination works (next/prev)

### User Details
- [ ] Click on a user to view details
- [ ] Verify all user information displays
- [ ] Check last login timestamp
- [ ] Verify ban status and reason (if banned)

### Ban User
- [ ] Click ban button on active user
- [ ] Enter ban reason in dialog
- [ ] Confirm ban action
- [ ] Verify success message displays
- [ ] Verify user list refreshes
- [ ] Verify user status changes to "banned"

### Unban User
- [ ] Click unban button on banned user
- [ ] Confirm unban action
- [ ] Verify success message displays
- [ ] Verify user status changes to "active"

## Company Management

### List Companies
- [ ] Navigate to `/companies`
- [ ] Verify company list loads with pagination
- [ ] Test verification status filter
- [ ] Test trust level filter (low, medium, high)
- [ ] Test subscription tier filter
- [ ] Test status filter (active, suspended)
- [ ] Test search functionality

### Company Details
- [ ] Click on a company to view details
- [ ] Verify company profile information
- [ ] Check trust score and trust level
- [ ] Verify subscription tier and status
- [ ] Check listing cap

### Suspend Company
- [ ] Click suspend button on active company
- [ ] Enter suspension reason
- [ ] Confirm suspension
- [ ] Verify success message
- [ ] Verify company status changes to "suspended"
- [ ] Check that email notification was sent (check logs)

### Unsuspend Company
- [ ] Click unsuspend button on suspended company
- [ ] Confirm unsuspension
- [ ] Verify success message
- [ ] Verify company status changes to "active"

### Company Verifications
- [ ] Navigate to `/companies/verifications`
- [ ] Verify pending verifications list loads
- [ ] Check verification documents display

### Approve Verification
- [ ] Click approve on pending verification
- [ ] Confirm approval
- [ ] Verify success message
- [ ] Verify verification status changes

### Reject Verification
- [ ] Click reject on pending verification
- [ ] Enter rejection reason
- [ ] Confirm rejection
- [ ] Verify success message

## Job Management

### List Jobs
- [ ] Navigate to `/jobs`
- [ ] Verify job list loads with pagination
- [ ] Test status filter (active, closed, flagged)
- [ ] Test type filter (full_time, part_time, etc.)
- [ ] Test location type filter (remote, onsite, hybrid)
- [ ] Test search functionality

### Job Details
- [ ] Click on a job to view details
- [ ] Verify job information displays
- [ ] Check company information
- [ ] Verify salary range (if present)
- [ ] Check application count

### Flag Job
- [ ] Click flag button on active job
- [ ] Enter flag reason
- [ ] Confirm flagging
- [ ] Verify success message
- [ ] Verify job status changes to "flagged"

### Unflag Job
- [ ] Click unflag button on flagged job
- [ ] Confirm unflagging
- [ ] Verify success message
- [ ] Verify job status changes to "active"

### Close Job
- [ ] Click close button on active job
- [ ] Confirm closure
- [ ] Verify success message
- [ ] Verify job status changes to "closed"

## Subscription Management

### List Subscriptions
- [ ] Navigate to `/subscriptions`
- [ ] Verify subscription list loads
- [ ] Test status filter (active, cancelled, past_due)
- [ ] Test tier filter (free, basic, premium, enterprise)
- [ ] Verify pagination works

### Subscription Details
- [ ] Click on a subscription to view details
- [ ] Verify subscription information
- [ ] Check company information
- [ ] Verify billing cycle dates
- [ ] Check payment method

### Cancel Subscription
- [ ] Click cancel button on active subscription
- [ ] Enter cancellation reason
- [ ] Confirm cancellation
- [ ] Verify success message
- [ ] Verify subscription status updates
- [ ] Check Stripe integration (if configured)

### Revenue Statistics
- [ ] Navigate to revenue stats page (if separate)
- [ ] Verify MRR (Monthly Recurring Revenue) displays
- [ ] Check churn rate calculation
- [ ] Verify tier distribution chart/data

## IAP Transaction Management

### List Transactions
- [ ] Navigate to `/iap/transactions`
- [ ] Verify transaction list loads
- [ ] Test provider filter (apple, google, stripe)
- [ ] Test status filter (completed, pending, failed, refunded)
- [ ] Test user search
- [ ] Test date range filter

### Transaction Details
- [ ] Click on a transaction to view details
- [ ] Verify transaction information
- [ ] Check receipt data
- [ ] Verify validation status
- [ ] Check processing history

### Webhook Events
- [ ] Navigate to `/iap/webhooks`
- [ ] Verify webhook event list loads
- [ ] Check event types display
- [ ] Verify processing status
- [ ] Check retry counts

### Webhook Metrics
- [ ] Verify webhook metrics display
- [ ] Check total events count
- [ ] Verify success rate percentage
- [ ] Check average processing time
- [ ] Verify failed events count

### Retry Webhook
- [ ] Click retry on failed webhook
- [ ] Confirm retry action
- [ ] Verify success message
- [ ] Check webhook status updates
- [ ] Verify retry count increments

## Trust System Management

### Trust Events
- [ ] Navigate to `/trust/events`
- [ ] Verify trust event list loads
- [ ] Check event types display
- [ ] Verify score changes show
- [ ] Check timestamps

### Low Trust Companies
- [ ] Navigate to `/trust/low-trust`
- [ ] Verify low trust company list loads
- [ ] Check trust scores display (< 40)
- [ ] Verify trust levels show
- [ ] Check recent flags count

### Company Trust History
- [ ] Navigate to company details
- [ ] View trust history tab/section
- [ ] Verify chronological trust events
- [ ] Check score changes over time

### Recalculate Trust Score
- [ ] Click recalculate on a company
- [ ] Confirm recalculation
- [ ] Verify success message
- [ ] Check new trust score displays
- [ ] Verify trust level updates

### Adjust Trust Score
- [ ] Click adjust trust score
- [ ] Enter new score (0-100)
- [ ] Enter adjustment reason
- [ ] Confirm adjustment
- [ ] Verify success message
- [ ] Check score updates
- [ ] Verify audit log created

## Match & Application Analytics

### List Matches
- [ ] Navigate to `/matches`
- [ ] Verify match list loads
- [ ] Test status filter
- [ ] Test date range filter
- [ ] Verify pagination works

### Match Statistics
- [ ] Verify match stats display
- [ ] Check total matches count
- [ ] Verify acceptance rate percentage
- [ ] Check average response time
- [ ] Verify conversion metrics

### List Applications
- [ ] Navigate to applications page
- [ ] Verify application list loads
- [ ] Test status filter
- [ ] Test company filter
- [ ] Verify pagination works

### Application Statistics
- [ ] Verify application stats display
- [ ] Check total applications count
- [ ] Verify conversion rate
- [ ] Check average time to apply
- [ ] Verify status distribution

## Error Handling

### Network Errors
- [ ] Stop backend server
- [ ] Try to load any page
- [ ] Verify error message displays
- [ ] Check retry mechanism works
- [ ] Restart backend and verify recovery

### Validation Errors
- [ ] Try to submit form with invalid data
- [ ] Verify validation error messages display
- [ ] Check field-specific errors show
- [ ] Verify form doesn't submit

### Authorization Errors
- [ ] Try to access super_admin endpoint as moderator
- [ ] Verify 403 error displays
- [ ] Check appropriate error message

### 401 Unauthorized
- [ ] Clear auth token from localStorage
- [ ] Try to access any admin page
- [ ] Verify redirect to login page

## Performance

### Loading States
- [ ] Verify loading skeletons display while fetching
- [ ] Check loading spinners on buttons during mutations
- [ ] Verify smooth transitions

### Caching
- [ ] Navigate to a page
- [ ] Navigate away
- [ ] Navigate back
- [ ] Verify data loads from cache (instant)

### Pagination
- [ ] Load page with 100+ records
- [ ] Verify pagination controls work
- [ ] Check page size selector (if present)
- [ ] Verify performance is acceptable

## Browser Compatibility

- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge

## Mobile Responsiveness

- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Verify tables are responsive
- [ ] Check navigation works on mobile

## Summary

Total Tests: ~150+
- [ ] All critical paths tested
- [ ] All CRUD operations verified
- [ ] All filters and search tested
- [ ] Error handling verified
- [ ] Performance acceptable

## Issues Found

Document any issues found during testing:

1. 
2. 
3. 

## Notes

- Backend must be running with seeded data
- Admin user must have appropriate role
- Check browser console for any errors
- Check network tab for failed requests
- Verify backend logs for errors
