# Trust Metrics Dashboard Implementation

## Problem
The admin dashboard was not tracking trust events or displaying low trust companies, even though the backend endpoints existed.

## Solution
Added trust metrics tracking to the admin dashboard stats endpoint and updated the frontend to display them.

---

## Backend Changes

### 1. TrustEventRepository (`backend/app/Repositories/PostgreSQL/TrustEventRepository.php`)
Added three new methods to count trust-related metrics:

- `countLowTrustCompanies(int $threshold = 40): int` - Count companies below a trust score threshold
- `countRecentTrustEvents(int $days = 30): int` - Count companies with recent trust score changes
- `countByTrustLevel(string $level): int` - Count companies by trust level (untrusted, new, established, trusted)

### 2. AdminService (`backend/app/Services/AdminService.php`)
Updated `dashboardStats()` method to include a new `trust` section:

```php
'trust' => [
    'low_trust_companies' => $this->trustEvents->countLowTrustCompanies(
        config('admin.trust.low_trust_threshold', 40)
    ),
    'critical_trust_companies' => $this->trustEvents->countLowTrustCompanies(20),
    'recent_events' => $this->trustEvents->countRecentTrustEvents(30),
    'by_level' => [
        'untrusted' => $this->trustEvents->countByTrustLevel('untrusted'),
        'new' => $this->trustEvents->countByTrustLevel('new'),
        'established' => $this->trustEvents->countByTrustLevel('established'),
        'trusted' => $this->trustEvents->countByTrustLevel('trusted'),
    ],
],
```

### 3. Tests (`backend/tests/Feature/Admin/AdminDashboardControllerTest.php`)
Created comprehensive test suite with 5 test cases:
- Authentication requirement
- Role-based access control
- Complete metrics structure validation
- Trust metrics accuracy verification
- Super admin access

---

## Frontend Changes

### 1. Types (`frontend/web/src/types/index.ts`)
- Updated `DashboardStats` interface to include trust metrics:
  - `criticalTrustCompanies: number`
  - `recentTrustEvents: number`
  - `trustByLevel: { untrusted, new, established, trusted }`
- Added `DashboardStatsApiResponse` interface to match backend structure

### 2. Dashboard Service (`frontend/web/src/services/dashboardService.ts`)
Updated `stats()` method to map the nested backend response to the flat frontend structure:
- Maps `data.trust.lowTrustCompanies` → `lowTrustCompanies`
- Maps `data.trust.criticalTrustCompanies` → `criticalTrustCompanies`
- Maps `data.trust.recentEvents` → `recentTrustEvents`
- Maps `data.trust.byLevel` → `trustByLevel`

### 3. Dashboard Page (`frontend/web/src/app/(dashboard)/dashboard/page.tsx`)
Enhanced the dashboard with trust metrics:

**New Stat Cards:**
- Low Trust Companies (clickable → `/trust/low-trust`)
- Critical Trust (clickable → `/trust/low-trust`)
- Recent Trust Events (clickable → `/trust/events`)

**New Section: Trust Level Distribution**
Visual breakdown of companies by trust level with color-coded cards:
- 🔴 Untrusted (red)
- 🟡 New (yellow)
- 🔵 Established (blue)
- 🟢 Trusted (green)

---

## Trust Metrics Explained

| Metric | Description | Threshold |
|--------|-------------|-----------|
| **Low Trust Companies** | Companies below the low trust threshold | < 40 |
| **Critical Trust Companies** | Companies in critical trust range | < 20 |
| **Recent Trust Events** | Companies with trust score changes in last 30 days | Last 30 days |
| **Trust Level Breakdown** | Distribution across all trust levels | By level |

---

## API Response Structure

### Before (Missing Trust Data)
```json
{
  "users": { "total": 100, ... },
  "companies": { "total": 50, ... },
  "reviews": { "total": 200, ... },
  "jobs": { "total": 150, ... }
}
```

### After (With Trust Data)
```json
{
  "users": { "total": 100, ... },
  "companies": { "total": 50, ... },
  "reviews": { "total": 200, ... },
  "jobs": { "total": 150, ... },
  "trust": {
    "low_trust_companies": 5,
    "critical_trust_companies": 2,
    "recent_events": 12,
    "by_level": {
      "untrusted": 2,
      "new": 15,
      "established": 20,
      "trusted": 13
    }
  }
}
```

---

## Testing

All tests pass:
```bash
cd JobSwipe/backend
php artisan test --filter=AdminDashboardControllerTest
# ✓ 5 passed (45 assertions)
```

---

## Configuration

Trust thresholds are configurable in `backend/config/admin.php`:
```php
'trust' => [
    'low_trust_threshold' => 40,
],
```

Trust levels are defined in `backend/config/trust.php`:
```php
'levels' => [
    'untrusted' => ['min_score' => 0, ...],
    'new' => ['min_score' => 31, ...],
    'established' => ['min_score' => 51, ...],
    'trusted' => ['min_score' => 76, ...],
],
```

---

## Next Steps (Optional Enhancements)

1. **Add Charts**: Visualize trust score distribution over time
2. **Add Alerts**: Notify admins when companies drop below critical trust
3. **Add Filters**: Filter companies by trust level in the companies page
4. **Add Trends**: Show trust score trends (improving/declining)
5. **Add Actions**: Quick actions to recalculate or adjust trust scores from dashboard

---

## Files Modified

**Backend:**
- `backend/app/Repositories/PostgreSQL/TrustEventRepository.php`
- `backend/app/Services/AdminService.php`
- `backend/tests/Feature/Admin/AdminDashboardControllerTest.php` (new)

**Frontend:**
- `frontend/web/src/types/index.ts`
- `frontend/web/src/services/dashboardService.ts`
- `frontend/web/src/app/(dashboard)/dashboard/page.tsx`
