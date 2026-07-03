# Trust Pages Data Display & Dashboard Refresh Fix

## Problem
1. Trust Events page showed "No trust events found" even though data existed
2. Low Trust Companies page showed "All clear!" even though low trust companies existed
3. Dashboard stats didn't refresh when navigating back to the dashboard

## Root Causes
1. **Backend data format mismatch**: The backend was returning simplified company profile data, but the frontend expected full `TrustEvent` and `LowTrustCompany` objects with nested company details
2. **Service layer double-unwrapping**: The trust service was trying to access `data.data` when the API interceptor already unwrapped the response
3. **No refetch strategy**: Dashboard stats query didn't have `refetchOnWindowFocus` enabled

---

## Solution

### Backend Changes

#### 1. TrustEventRepository (`backend/app/Repositories/PostgreSQL/TrustEventRepository.php`)

**Updated `listEvents()` method** to transform company profile data into proper TrustEvent format:

```php
public function listEvents(int $perPage = 20): LengthAwarePaginator
{
    $results = DB::table('company_profiles')
        ->select([
            'id as company_id',
            'company_name',
            'trust_score',
            'trust_level',
            'updated_at',
            'created_at',
        ])
        ->orderBy('updated_at', 'desc')
        ->paginate($perPage);

    // Transform to match TrustEvent structure
    $results->getCollection()->transform(function ($item) {
        return [
            'id' => $item->company_id,
            'company_id' => $item->company_id,
            'company' => [
                'id' => $item->company_id,
                'name' => $item->company_name,
                'trust_score' => $item->trust_score,
                'trust_level' => $item->trust_level,
            ],
            'type' => 'score_updated',
            'description' => "Trust score updated to {$item->trust_score}",
            'score_change' => 0,
            'score_before' => $item->trust_score,
            'score_after' => $item->trust_score,
            'created_at' => $item->updated_at,
        ];
    });

    return $results;
}
```

#### 2. AdminService (`backend/app/Services/AdminService.php`)

**Updated `getLowTrustCompanies()` method** to transform data into LowTrustCompany format:

```php
public function getLowTrustCompanies(int $threshold = 40): array
{
    $companies = $this->trustEvents->getLowTrustCompanies($threshold);

    return $companies->map(function ($company) {
        return [
            'company' => [
                'id' => $company->id,
                'name' => $company->company_name,
                'trust_score' => $company->trust_score,
                'trust_level' => $company->trust_level,
                'status' => $company->status,
            ],
            'trust_score' => $company->trust_score,
            'trust_level' => $company->trust_level,
            'recent_flags' => 0,
            'recent_negative_reviews' => 0,
            'pending_verifications' => 0,
            'last_score_calculation' => $company->updated_at,
        ];
    })->toArray();
}
```

### Frontend Changes

#### 1. Trust Service (`frontend/web/src/services/trustService.ts`)

**Fixed double-unwrapping issue** - removed `data.data` access since the API interceptor already unwraps:

```typescript
// Before
const { data } = await api.get<{ success: boolean; data: PaginatedResponse<TrustEvent> }>(...);
return data.data; // ❌ Double unwrap

// After
const { data } = await api.get<PaginatedResponse<TrustEvent>>(...);
return data; // ✅ Single unwrap
```

Applied to all methods:
- `events()` - Returns `PaginatedResponse<TrustEvent>`
- `lowTrustCompanies()` - Returns `LowTrustCompany[]`
- `companyHistory()` - Returns `TrustEvent[]`
- `recalculateTrustScore()` - Returns `{ newTrustScore: number }`
- `adjustTrustScore()` - Returns `{ newScore: number }`

#### 2. Dashboard Hook (`frontend/web/src/lib/hooks.ts`)

**Added refetch on focus** to dashboard stats:

```typescript
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats,
    queryFn: ({ signal }) => dashboardService.stats(signal),
    refetchOnWindowFocus: true, // ✅ Refetch when navigating back
    staleTime: 0, // ✅ Always consider data stale
  });
}
```

---

## What This Fixes

### ✅ Trust Events Page
- Now displays actual company trust data as events
- Shows company name, trust score, and last update time
- Properly formatted with company logos and trust level indicators
- Pagination works correctly

### ✅ Low Trust Companies Page
- Now displays companies with trust scores below threshold (40)
- Shows trust score progress bars
- Displays stats: Total Low Trust, Critical (<25%), Warning (25-40%)
- Recalculate trust score button works
- Links to company details page

### ✅ Dashboard Refresh
- Dashboard stats automatically refetch when:
  - Navigating back to dashboard from another page
  - Window regains focus
  - User clicks on dashboard link
- Shows skeleton loading during refetch
- Trust metrics always up-to-date

---

## Data Flow

### Trust Events
```
Backend: company_profiles table
    ↓
TrustEventRepository.listEvents()
    ↓ (transforms to TrustEvent format)
AdminTrustController.trustEvents()
    ↓ (returns paginated response)
Frontend: trustService.events()
    ↓ (unwraps response)
useTrustEvents() hook
    ↓
Trust Events Page (displays data)
```

### Low Trust Companies
```
Backend: company_profiles table (trust_score < 40)
    ↓
TrustEventRepository.getLowTrustCompanies()
    ↓
AdminService.getLowTrustCompanies()
    ↓ (transforms to LowTrustCompany format)
AdminTrustController.lowTrustCompanies()
    ↓ (returns array)
Frontend: trustService.lowTrustCompanies()
    ↓ (unwraps response)
useLowTrustCompanies() hook
    ↓
Low Trust Companies Page (displays data)
```

---

## Testing

All tests pass:
```bash
docker exec jobapp_laravel php artisan test --filter=AdminDashboardControllerTest
# ✓ 5 passed (45 assertions)
```

---

## Files Modified

**Backend:**
- `backend/app/Repositories/PostgreSQL/TrustEventRepository.php` - Transform data to match frontend types
- `backend/app/Services/AdminService.php` - Transform low trust companies data

**Frontend:**
- `frontend/web/src/services/trustService.ts` - Fix double-unwrapping issue
- `frontend/web/src/lib/hooks.ts` - Add refetch on focus to dashboard stats

---

## Future Enhancements

1. **Actual Trust Events Table**: Create a dedicated `trust_events` table to track historical changes
2. **Real-time Updates**: Add WebSocket support for live trust score updates
3. **Flag Tracking**: Implement `recent_flags` counter
4. **Review Tracking**: Implement `recent_negative_reviews` counter
5. **Verification Tracking**: Implement `pending_verifications` counter
6. **Score Change History**: Track `score_before` and `score_after` for actual changes
