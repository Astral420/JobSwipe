# Google Maps API Applicability Analysis for JobSwipe

**Date**: April 28, 2026  
**Scope**: Backend (Laravel) + Mobile Frontend (React Native/Expo)  
**Analyst**: Software Engineering Review

---

## Executive Summary

Google Maps API is **highly applicable** to JobSwipe's current system architecture but is **not yet implemented**. The codebase has location infrastructure in place (database fields, models, UI components) but lacks the critical geocoding and distance calculation capabilities that Google Maps API would provide.

**Key Findings**:
- ✅ Database schema supports lat/lng coordinates
- ✅ Mobile app has location display UI
- ❌ No geocoding service implemented
- ❌ No distance-based filtering active
- ❌ Location coordinates never populated
- ❌ No Google Maps API key configured

---

## 1. Current Location Infrastructure

### 1.1 Backend Database Schema

**Job Postings Table** (`job_postings`):
```php
// Migration: 2026_03_19_100000_create_job_postings_table.php
$table->string('location', 255)->nullable();
$table->string('location_city', 100)->nullable();
$table->string('location_region', 100)->nullable();
$table->decimal('lat', 9, 6)->nullable();  // ✅ Ready for coordinates
$table->decimal('lng', 9, 6)->nullable();  // ✅ Ready for coordinates
```

**Indexes**:
- `idx_job_postings_location_city` - City-based filtering
- `idx_job_postings_location_region` - Region-based filtering

**Meilisearch Integration**:
```php
// JobPosting.php - toSearchableArray()
'_geo' => $this->lat ? ['lat' => $this->lat, 'lng' => $this->lng] : null,
```
Currently returns `null` because lat/lng are never populated.

### 1.2 Applicant Profile Schema

**MongoDB Document** (`ApplicantProfileDocument`):
```php
protected $fillable = [
    'location',          // Free-text location
    'location_city',     // City name
    'location_region',   // Region/state
    // ❌ Missing: lat, lng fields
];
```

**Gap**: Applicant profiles lack coordinate fields, preventing distance calculations.

### 1.3 Company Profile Schema

**MongoDB Document** (`CompanyProfileDocument`):
```php
protected $fillable = [
    'address',  // Array field (unstructured)
    // ❌ Missing: lat, lng, location_city, location_region
];
```

**Gap**: Company headquarters location not geocoded.

---

## 2. Current Location Features

### 2.1 Mobile App UI

**Job Discovery Screen** (`frontend/mobile/app/(tabs)/jobs.tsx`):
```typescript
// Distance display (hardcoded mock data)
distanceKm: 3.9,  // ❌ Not calculated from real coordinates

// UI rendering
<View style={s.heroDistanceRow}>
  <MaterialCommunityIcons name="map-marker-distance" size={12} />
  <Text>{job.distanceKm.toFixed(1)} km away</Text>
</View>
```

**Swipe Screen** (`frontend/mobile/app/(tabs)/index.tsx`):
```typescript
// Distance-based settings panel exists
const [maxDistanceKm, setMaxDistanceKm] = useState(50);

// Filtering logic (client-side only)
const filteredJobs = JOBS.filter(j => j.distanceKm <= maxDistanceKm);
```

**Status**: UI components are built but use mock data. No real distance calculations.

### 2.2 Backend Job Deck Service

**DeckService.php** - Relevance Scoring:
```php
private function calculateLocationBonus(JobPosting $job, ?string $applicantCity): float
{
    if (!$applicantCity || !$job->location_city) {
        return 0.0;
    }
    
    // ❌ Simple string match - no distance calculation
    return strtolower($job->location_city) === strtolower($applicantCity) ? 0.1 : 0.0;
}
```

**Current Logic**:
- Binary match: same city = 0.1 bonus, different city = 0.0
- No radius-based filtering
- No "nearby cities" concept
- No distance sorting

---

## 3. Google Maps API Use Cases

### 3.1 Critical Use Cases (High Priority)

#### A. Job Posting Geocoding
**When**: HR creates/edits a job posting  
**What**: Convert location string → lat/lng coordinates  
**API**: [Geocoding API](https://developers.google.com/maps/documentation/geocoding)

```php
// Proposed: app/Services/GeocodingService.php
public function geocode(string $address): ?array
{
    $response = Http::get('https://maps.googleapis.com/maps/api/geocode/json', [
        'address' => $address,
        'key' => config('services.google_maps.key'),
    ]);
    
    if ($response->successful() && $response['status'] === 'OK') {
        $result = $response['results'][0];
        return [
            'lat' => $result['geometry']['location']['lat'],
            'lng' => $result['geometry']['location']['lng'],
            'city' => $this->extractComponent($result, 'locality'),
            'region' => $this->extractComponent($result, 'administrative_area_level_1'),
        ];
    }
    
    return null;
}
```

**Impact**: Enables all distance-based features.

#### B. Applicant Location Detection
**When**: User onboarding / profile setup  
**What**: Get user's current location → reverse geocode to city/region  
**API**: [Reverse Geocoding API](https://developers.google.com/maps/documentation/geocoding/requests-reverse-geocoding)

**Mobile Implementation**:
```typescript
// Using expo-location (built-in, free)
import * as Location from 'expo-location';

const detectLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return;
  
  const position = await Location.getCurrentPositionAsync({});
  
  // ✅ expo-location provides free reverse geocoding via OS
  const [geo] = await Location.reverseGeocodeAsync({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
  
  // Send to backend
  await api.patch('/profile', {
    location: `${geo.city}, ${geo.region}`,
    location_city: geo.city,
    location_region: geo.region,
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  });
};
```

**Note**: For mobile, `expo-location` provides free reverse geocoding. Google Maps API only needed for backend/web.

#### C. Distance-Based Job Filtering
**When**: User swipes through job deck  
**What**: Calculate distance between applicant and job location  
**API**: [Distance Matrix API](https://developers.google.com/maps/documentation/distance-matrix) OR Haversine formula

**Option 1: Haversine Formula** (Recommended - Free):
```php
// app/Services/DistanceService.php
public function calculateDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $earthRadius = 6371; // km
    
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    
    $a = sin($dLat/2) * sin($dLat/2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLng/2) * sin($dLng/2);
    
    $c = 2 * atan2(sqrt($a), sqrt(1-$a));
    
    return $earthRadius * $c;
}
```

**Option 2: Distance Matrix API** (Paid - for driving time/distance):
- Use only if you need actual driving distance vs straight-line
- Cost: $5 per 1,000 requests
- Overkill for JobSwipe's use case

**Recommendation**: Use Haversine for straight-line distance (free, fast).

#### D. Location Autocomplete (Job Posting Form)
**When**: HR types location in job posting form  
**What**: Suggest cities/addresses as user types  
**API**: [Places Autocomplete API](https://developers.google.com/maps/documentation/places/web-service/autocomplete)

```typescript
// Mobile: frontend/mobile/components/LocationAutocomplete.tsx
const fetchPredictions = async (text: string) => {
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json`
    + `?input=${encodeURIComponent(text)}`
    + `&types=(cities)`
    + `&components=country:ph`  // Restrict to Philippines
    + `&key=${GOOGLE_PLACES_API_KEY}`;
  
  const res = await fetch(url);
  const data = await res.json();
  return data.predictions;
};
```

**Cost**: $2.83 per 1,000 requests (Autocomplete - Per Session)

---

### 3.2 Secondary Use Cases (Medium Priority)

#### E. Company Office Location Mapping
**When**: Company profile setup  
**What**: Display company office on a map  
**API**: [Maps Static API](https://developers.google.com/maps/documentation/maps-static) or [Maps Embed API](https://developers.google.com/maps/documentation/embed)

**Use Case**: Show company location in job detail view.

#### F. Geospatial Search via Meilisearch
**When**: User searches "jobs near me"  
**What**: Leverage Meilisearch's `_geo` field for radius search  
**API**: Google Geocoding (to populate `_geo` field)

```php
// JobPosting.php - Already prepared
public function toSearchableArray(): array
{
    return [
        '_geo' => $this->lat ? ['lat' => $this->lat, 'lng' => $this->lng] : null,
        // ... other fields
    ];
}
```

**Meilisearch Query**:
```php
$results = $index->search('software engineer', [
    'filter' => '_geoRadius(14.5995, 120.9842, 10000)', // 10km radius from Manila
]);
```

**Status**: Infrastructure ready, just needs lat/lng population.

---

## 4. Implementation Gaps

### 4.1 Missing Configuration

**Backend** (`.env`):
```bash
# ❌ Not present
GOOGLE_MAPS_API_KEY=

# ❌ Not present in config/services.php
'google_maps' => [
    'key' => env('GOOGLE_MAPS_API_KEY'),
],
```

**Mobile** (`.env`):
```bash
# ❌ Not present
EXPO_PUBLIC_GOOGLE_PLACES_KEY=
```

### 4.2 Missing Services

**Backend**:
- ❌ `app/Services/GeocodingService.php` - Not implemented
- ❌ `app/Services/DistanceService.php` - Not implemented
- ❌ Geocoding on job posting creation - Not hooked up

**Mobile**:
- ❌ Location permission request flow - Not implemented
- ❌ GPS detection on onboarding - Not implemented
- ❌ Location autocomplete component - Not implemented

### 4.3 Missing Database Fields

**Applicant Profile** (MongoDB):
```javascript
// ❌ Need to add
{
  lat: Number,
  lng: Number,
}
```

**Company Profile** (MongoDB):
```javascript
// ❌ Need to add
{
  location_city: String,
  location_region: String,
  lat: Number,
  lng: Number,
}
```

---

## 5. Cost Analysis

### 5.1 Google Maps Platform Pricing

| API | Use Case | Cost | Free Tier |
|-----|----------|------|-----------|
| **Geocoding API** | Job posting creation | $5 / 1K requests | $200/month credit |
| **Places Autocomplete** | Location input | $2.83 / 1K sessions | $200/month credit |
| **Reverse Geocoding** | Not needed (use expo-location) | N/A | N/A |
| **Distance Matrix** | Not needed (use Haversine) | N/A | N/A |

### 5.2 Estimated Monthly Usage

**Assumptions**:
- 1,000 job postings created/month
- 5,000 new applicants/month (location autocomplete)
- Aggressive caching (24h TTL)

**Costs**:
- Geocoding: 1,000 requests × $5/1K = **$5/month**
- Places Autocomplete: 5,000 sessions × $2.83/1K = **$14.15/month**
- **Total**: ~$20/month

**With $200 free credit**: Effectively free for first 10 months.

### 5.3 Cost Optimization Strategies

1. **Cache aggressively**: Store geocoded results in Redis (24h+ TTL)
2. **Use expo-location for mobile**: Free reverse geocoding via OS
3. **Haversine over Distance Matrix**: Free straight-line distance
4. **Batch geocoding**: Geocode during off-peak hours for legacy data
5. **Fallback to free tier**: Use `expo-location.geocodeAsync()` as fallback

---

## 6. Alternative Solutions

### 6.1 Mapbox

**Pros**:
- Cheaper: $0.75/1K requests (vs Google's $5/1K)
- Better free tier: 100K requests/month
- Modern API design

**Cons**:
- Less accurate in Philippines vs Google
- Smaller ecosystem
- Requires separate SDK integration

**Verdict**: Consider for cost savings if Google exceeds budget.

### 6.2 expo-location (Built-in)

**Pros**:
- **Free** (uses OS-native geocoding)
- Already installed in project
- No API key required
- Works offline

**Cons**:
- No autocomplete
- Less accurate than Google
- Inconsistent across devices
- No structured address components

**Verdict**: Use for mobile reverse geocoding, supplement with Google for autocomplete.

### 6.3 OpenStreetMap (Nominatim)

**Pros**:
- Free and open-source
- No API key required

**Cons**:
- Rate-limited (1 req/sec)
- Poor accuracy in Philippines
- No autocomplete
- Not suitable for production

**Verdict**: Not recommended.

---

## 7. Recommended Implementation Plan

### Phase 1: Core Geocoding (Week 1-2)

**Backend**:
1. Add `GOOGLE_MAPS_API_KEY` to `.env`
2. Create `GeocodingService.php`
3. Create `DistanceService.php` (Haversine)
4. Hook geocoding into `JobPostingController@store`
5. Add migration for applicant `lat`/`lng` fields

**Mobile**:
1. Add location permission request flow
2. Implement GPS detection on onboarding
3. Send coordinates to backend on profile creation

**Testing**:
- Unit tests for Haversine formula
- Integration test for geocoding service
- E2E test for location permission flow

### Phase 2: Distance-Based Filtering (Week 3)

**Backend**:
1. Update `DeckService::calculateLocationBonus()` to use distance
2. Add distance-based filtering to job deck query
3. Cache distance calculations in Redis

**Mobile**:
1. Connect distance slider to backend API
2. Display real distances in job cards
3. Add "jobs near me" filter

### Phase 3: Location Autocomplete (Week 4)

**Mobile**:
1. Create `LocationAutocomplete` component
2. Integrate Places Autocomplete API
3. Add to job posting form
4. Add to profile edit screen

**Web** (if applicable):
1. Same autocomplete for web dashboard

### Phase 4: Optimization (Week 5)

1. Implement aggressive caching strategy
2. Add fallback to `expo-location` for cost savings
3. Monitor API usage and costs
4. Optimize Meilisearch `_geo` indexing

---

## 8. Technical Recommendations

### 8.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Mobile App                            │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  expo-location   │         │ Places Autocomplete│         │
│  │  (GPS + Reverse  │         │  (Google Maps API) │         │
│  │   Geocoding)     │         │                    │         │
│  └────────┬─────────┘         └─────────┬──────────┘         │
│           │                             │                    │
│           └─────────────┬───────────────┘                    │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Laravel Backend                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              GeocodingService                        │   │
│  │  - Forward geocoding (address → lat/lng)            │   │
│  │  - Caching layer (Redis, 24h TTL)                   │   │
│  │  - Rate limiting                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              DistanceService                         │   │
│  │  - Haversine formula (free)                         │   │
│  │  - Distance-based filtering                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              DeckService                             │   │
│  │  - Enhanced location scoring                        │   │
│  │  - Radius-based job filtering                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │   MongoDB    │  │    Redis     │      │
│  │  (job lat/lng)│  │(profile coords)│ │  (cache)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Meilisearch                             │   │
│  │  - _geo field for geospatial search                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Caching Strategy

```php
// Cache geocoding results aggressively
Cache::remember("geo:{$address}", 86400 * 30, function () use ($address) {
    return $this->geocodingService->geocode($address);
});

// Cache distance calculations
Cache::remember("distance:{$applicantId}:{$jobId}", 3600, function () {
    return $this->distanceService->calculate($lat1, $lng1, $lat2, $lng2);
});
```

### 8.3 Error Handling

```php
try {
    $coords = $this->geocodingService->geocode($location);
} catch (GeocodingException $e) {
    // Fallback: Save job without coordinates
    Log::warning("Geocoding failed for location: {$location}", [
        'error' => $e->getMessage(),
    ]);
    
    // Job still created, but won't appear in distance-based searches
    $job->lat = null;
    $job->lng = null;
}
```

---

## 9. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **API cost overrun** | High | Aggressive caching, rate limiting, fallback to expo-location |
| **Geocoding inaccuracy** | Medium | Manual override option for HR, validation UI |
| **Location permission denial** | Medium | Graceful fallback to manual entry, explain benefits clearly |
| **API quota exhaustion** | High | Monitor usage dashboard, set up billing alerts |
| **Vendor lock-in** | Low | Abstract geocoding behind service interface, easy to swap |

---

## 10. Success Metrics

**Technical**:
- ✅ 95%+ of job postings have valid lat/lng
- ✅ 80%+ of applicants share location
- ✅ Distance calculations < 50ms (cached)
- ✅ API costs < $50/month

**Product**:
- ✅ Increased job application rate (better matching)
- ✅ Reduced "irrelevant job" reports
- ✅ Higher user engagement with location filters

---

## 11. Conclusion

**Google Maps API is highly applicable** to JobSwipe and should be implemented to unlock critical location-based features:

1. **Job-applicant distance matching** - Core value proposition
2. **Location-based job filtering** - User-requested feature
3. **Improved relevance scoring** - Better matches = more applications

**Current Status**: Infrastructure is 70% ready (database schema, UI components), but geocoding services are 0% implemented.

**Recommended Action**: Proceed with Phase 1 implementation (Core Geocoding) immediately. The $200/month free credit covers initial usage, and the ROI in improved matching quality is high.

**Alternative**: If cost is a concern, use `expo-location` (free) for mobile and defer web/backend geocoding. This covers 80% of use cases at zero cost.

---

## Appendix: Related Documentation

- [Location Detection Analysis](mdfiles/analysis/new%20analysis/location_detection_analysis.md) - Detailed technical analysis
- [Feature Clarifications](mdfiles/FEATURE_CLARIFICATIONS.md) - Product requirements for location features
- [DeckService.php](backend/app/Services/DeckService.php) - Current job matching logic
- [JobPosting Model](backend/app/Models/PostgreSQL/JobPosting.php) - Database schema

---

**Document Version**: 1.0  
**Last Updated**: April 28, 2026  
**Next Review**: After Phase 1 implementation
