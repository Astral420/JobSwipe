# Company Trust & Verification System — Implementation Plan

> **Scope**: Overhaul the company onboarding, verification, and subscription model from "pay-to-play" to "trust-based access with premium upsell."

---

## Table of Contents

- [Design Decisions](#design-decisions)
- [Phase 1: Decouple Payment from Onboarding](#phase-1-decouple-payment-from-onboarding)
- [Phase 2: Trust Score Engine](#phase-2-trust-score-engine)
- [Phase 3: Premium Subscription Redesign](#phase-3-premium-subscription-redesign)
- [Phase 4: Company Membership & Invite-Gated Domain Association (Planned)](#phase-4-company-membership--invite-gated-domain-association-planned)
- [Verification Plan](#verification-plan)
- [Migration & Rollback Strategy](#migration--rollback-strategy)

---

## Design Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Free email providers (gmail, etc.) for HR roles | **Allow, but lower trust score** (0/10 email pts) | Doesn't block legit startups; scoring self-balances |
| 2 | New company job moderation | **Limited visibility** (lower deck relevance) | No admin bottleneck; DeckService handles via multiplier |
| 3 | Trust score visibility | **Internal only** — companies never see the number | Prevents gaming; they see effects (caps, visibility) |
| 4 | Same-domain HR auto-association | **Require invite from existing admin** | Prevents unauthorized access; admin controls team |
| 5 | Existing companies with subscriptions | **Grandfather with minimum 60 trust score** | Respects paying customers; recalculates on next event |
| 6 | Minimum reviews for trust score | **3+ reviews required** to count toward score | Prevents gaming with fake single reviews |

---

## Phase 1: Decouple Payment from Onboarding

### Goal
Remove payment from the onboarding flow. Make verification required. Gate job posting on `verification_status === 'approved'` instead of `subscription_status === 'active'`.

---

### 1.1 Migration: Alter `company_profiles` table

#### [NEW] `database/migrations/2026_04_14_000001_add_trust_columns_to_company_profiles.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'pgsql';

    public function up(): void
    {
        Schema::table('company_profiles', function (Blueprint $table) {
            $table->string('company_domain', 255)->nullable()->after('company_name');
            $table->boolean('is_free_email_domain')->default(false)->after('company_domain');
            $table->integer('trust_score')->default(0)->after('subscription_status');
            $table->string('trust_level', 15)->default('untrusted')->after('trust_score');
            $table->integer('listing_cap')->default(0)->after('trust_level');
        });

        // Update subscription_tier constraint to include 'free'
        DB::statement("ALTER TABLE company_profiles DROP CONSTRAINT company_profiles_subscription_tier_check");
        DB::statement("ALTER TABLE company_profiles ADD CONSTRAINT company_profiles_subscription_tier_check CHECK (subscription_tier IN ('none', 'free', 'basic', 'pro'))");

        // Add trust_level constraint
        DB::statement("ALTER TABLE company_profiles ADD CONSTRAINT company_profiles_trust_level_check CHECK (trust_level IN ('untrusted', 'new', 'established', 'trusted'))");

        // Index for trust-based queries
        DB::statement("CREATE INDEX idx_company_profiles_trust_level ON company_profiles(trust_level)");
        DB::statement("CREATE INDEX idx_company_profiles_company_domain ON company_profiles(company_domain) WHERE company_domain IS NOT NULL");
    }

    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS idx_company_profiles_company_domain");
        DB::statement("DROP INDEX IF EXISTS idx_company_profiles_trust_level");
        DB::statement("ALTER TABLE company_profiles DROP CONSTRAINT IF EXISTS company_profiles_trust_level_check");
        DB::statement("ALTER TABLE company_profiles DROP CONSTRAINT company_profiles_subscription_tier_check");
        DB::statement("ALTER TABLE company_profiles ADD CONSTRAINT company_profiles_subscription_tier_check CHECK (subscription_tier IN ('none', 'basic', 'pro'))");

        Schema::table('company_profiles', function (Blueprint $table) {
            $table->dropColumn(['company_domain', 'is_free_email_domain', 'trust_score', 'trust_level', 'listing_cap']);
        });
    }
};
```

---

### 1.2 Migration: Create `trust_events` table

#### [NEW] `database/migrations/2026_04_14_000002_create_trust_events_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'pgsql';

    public function up(): void
    {
        Schema::create('trust_events', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('company_id');
            $table->string('event_type', 50);
            $table->integer('score_delta');
            $table->integer('score_after');
            $table->jsonb('metadata')->default(DB::raw("'{}'::jsonb"));
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));

            $table->foreign('company_id')->references('id')->on('company_profiles')->onDelete('cascade');
        });

        DB::statement("CREATE INDEX idx_trust_events_company_id ON trust_events(company_id)");
        DB::statement("CREATE INDEX idx_trust_events_event_type ON trust_events(event_type)");
        DB::statement("CREATE INDEX idx_trust_events_created_at ON trust_events(created_at DESC)");
    }

    public function down(): void
    {
        Schema::dropIfExists('trust_events');
    }
};
```

---

### 1.3 Migration: Create `blocked_email_domains` table

#### [NEW] `database/migrations/2026_04_14_000003_create_blocked_email_domains_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'pgsql';

    public function up(): void
    {
        Schema::create('blocked_email_domains', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('domain', 255)->unique();
            $table->string('reason', 50)->default('free_provider');
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_email_domains');
    }
};
```

---

### 1.4 Seeder: Blocked Email Domains

#### [NEW] `database/seeders/BlockedEmailDomainSeeder.php`

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BlockedEmailDomainSeeder extends Seeder
{
    public function run(): void
    {
        $freeProviders = [
            'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk',
            'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
            'aol.com', 'icloud.com', 'me.com', 'mac.com',
            'protonmail.com', 'proton.me', 'mail.com', 'ymail.com',
            'zoho.com', 'gmx.com', 'gmx.net', 'tutanota.com',
            'fastmail.com', 'hushmail.com',
        ];

        $disposable = [
            'mailinator.com', 'guerrillamail.com', 'tempmail.com',
            'throwaway.email', 'sharklasers.com', 'guerrillamailblock.com',
            'grr.la', 'yopmail.com', 'trashmail.com', '10minutemail.com',
            'temp-mail.org', 'dispostable.com', 'maildrop.cc',
        ];

        $now = now();

        $rows = [];
        foreach ($freeProviders as $domain) {
            $rows[] = ['domain' => $domain, 'reason' => 'free_provider', 'created_at' => $now];
        }
        foreach ($disposable as $domain) {
            $rows[] = ['domain' => $domain, 'reason' => 'disposable', 'created_at' => $now];
        }

        DB::connection('pgsql')->table('blocked_email_domains')->insertOrIgnore($rows);
    }
}
```

---

### 1.5 Service: Company Email Validator

#### [NEW] `app/Services/CompanyEmailValidator.php`

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class CompanyEmailValidator
{
    /**
     * Extract the domain from an email address.
     */
    public function extractDomain(string $email): string
    {
        $parts = explode('@', strtolower(trim($email)));

        return $parts[1] ?? '';
    }

    /**
     * Check if a domain is in the blocked list (free/disposable providers).
     */
    public function isBlockedDomain(string $domain): bool
    {
        if ($domain === '') {
            return true;
        }

        return DB::connection('pgsql')
            ->table('blocked_email_domains')
            ->where('domain', strtolower($domain))
            ->exists();
    }

    /**
     * Validate a company email and return domain info.
     *
     * Returns: ['domain' => string, 'is_free' => bool, 'trust_points' => int]
     */
    public function validate(string $email): array
    {
        $domain = $this->extractDomain($email);
        $isFree = $this->isBlockedDomain($domain);

        return [
            'domain' => $domain,
            'is_free' => $isFree,
            'trust_points' => $isFree ? 0 : 10,
        ];
    }
}
```

---

### 1.6 Model Update: `CompanyProfile`

#### [MODIFY] `app/Models/PostgreSQL/CompanyProfile.php`

```diff
 protected $fillable = [
-    'user_id', 'company_name', 'is_verified', 'verification_status',
-    'subscription_tier', 'subscription_status', 'active_listings_count',
+    'user_id', 'company_name', 'company_domain', 'is_free_email_domain',
+    'is_verified', 'verification_status',
+    'subscription_tier', 'subscription_status',
+    'trust_score', 'trust_level', 'listing_cap',
+    'active_listings_count',
 ];

 protected $casts = [
     'is_verified' => 'boolean',
+    'is_free_email_domain' => 'boolean',
     'active_listings_count' => 'integer',
+    'trust_score' => 'integer',
+    'listing_cap' => 'integer',
 ];

+public function isApproved(): bool
+{
+    return $this->verification_status === 'approved';
+}
+
+public function canPostJobs(): bool
+{
+    return $this->isApproved()
+        && $this->listing_cap > 0
+        && $this->active_listings_count < $this->listing_cap;
+}
```

---

### 1.7 Service Update: `AuthService` — Extract domain on registration

#### [MODIFY] `app/Services/AuthService.php`

Add `CompanyEmailValidator` to constructor and extract domain during registration.

```diff
 public function __construct(
     private UserRepository $users,
     private OTPService $otp,
     private ProfileService $profiles,
     private TokenService $tokens,
     private PasswordResetService $passwordResetService,
+    private CompanyEmailValidator $emailValidator,
 ) {}

 public function completeRegistration(string $email, string $code): array
 {
     // ... existing verification logic ...

     DB::transaction(function () use ($email, $storedData, &$user, &$token) {
         $user = $this->users->create([
             'email' => strtolower(trim($email)),
             'password_hash' => $storedData['password_hash'],
             'role' => $storedData['role'],
             'email_verified_at' => now(),
         ]);

-        $this->profiles->createProfileForUser($user);
+        $this->profiles->createProfileForUser($user);
+
+        // Extract and store company email domain for trust scoring
+        if (in_array($user->role, ['hr', 'company_admin'], true)) {
+            $this->profiles->setCompanyEmailDomain($user->id, $email);
+        }

         $token = $this->tokens->generateToken($user);
     });

     // ... rest unchanged ...
 }
```

---

### 1.8 Service Update: `ProfileService` — New company defaults + email domain

#### [MODIFY] `app/Services/ProfileService.php`

```diff
+use App\Services\CompanyEmailValidator;

+public function setCompanyEmailDomain(string $userId, string $email): void
+{
+    $companyProfile = $this->companyProfiles->findByUserId($userId);
+    if (! $companyProfile) {
+        return;
+    }
+
+    $validation = app(CompanyEmailValidator::class)->validate($email);
+
+    $this->companyProfiles->update($companyProfile, [
+        'company_domain' => $validation['domain'],
+        'is_free_email_domain' => $validation['is_free'],
+    ]);
+}

 private function createCompanyProfile(User $user): void
 {
     $companyProfile = $this->companyProfiles->create([
         'user_id' => $user->id,
         'company_name' => '',
         'is_verified' => false,
-        'verification_status' => 'pending',
-        'subscription_tier' => 'none',
-        'subscription_status' => 'inactive',
+        'verification_status' => 'unverified',
+        'subscription_tier' => 'free',
+        'subscription_status' => 'active',
+        'trust_score' => 0,
+        'trust_level' => 'untrusted',
+        'listing_cap' => 0,
         'active_listings_count' => 0,
     ]);
     // ... rest of MongoDB doc creation unchanged ...
 }
```

---

### 1.9 Service Update: `ProfileOnboardingService` — Remove payment step

#### [MODIFY] `app/Services/ProfileOnboardingService.php`

```diff
-public const COMPANY_ONBOARDING_STEPS = 4;
+public const COMPANY_ONBOARDING_STEPS = 3;

 private function applyCompanyOnboardingStep(string $userId, int $step, array $data): void
 {
     match ($step) {
         1 => $this->completeCompanyStepDetails($userId, $data),
-        2 => $this->completeCompanyStepPayment($userId),
-        3 => $this->completeCompanyStepMedia($userId, $data),
-        4 => $this->completeCompanyStepVerification($userId, $data),
+        2 => $this->completeCompanyStepVerification($userId, $data),
+        3 => $this->completeCompanyStepMedia($userId, $data),
         default => throw new InvalidArgumentException('INVALID_ONBOARDING_STEP'),
     };
 }

-private function completeCompanyStepPayment(string $userId): void
-{
-    $companyProfile = $this->findCompanyProfileByUserId($userId);
-
-    if ($companyProfile->subscription_status !== 'active') {
-        throw new InvalidArgumentException('SUBSCRIPTION_REQUIRED');
-    }
-}

 private function completeCompanyStepVerification(string $userId, array $data): void
 {
-    if (! isset($data['verification_documents']) || ! is_array($data['verification_documents'])) {
-        return;
-    }
+    // Verification documents are now required during onboarding
+    if (! isset($data['verification_documents']) || ! is_array($data['verification_documents']) || count($data['verification_documents']) < 1) {
+        throw new InvalidArgumentException('STEP_DATA_INVALID');
+    }

     $companyProfile = $this->findCompanyProfileByUserId($userId);
     $document = $this->ensureCompanyDocument($userId, $companyProfile);

     $this->companyProfiles->update($companyProfile, ['verification_status' => 'pending']);
     $this->companyDocs->update($document, [
         'verification_documents' => array_values($data['verification_documents']),
     ]);
 }

 private function companyOnboardingSteps(): array
 {
     return [
         ['step' => 1, 'key' => 'company_details', 'required' => true],
-        ['step' => 2, 'key' => 'payment', 'required' => true],
-        ['step' => 3, 'key' => 'media', 'required' => true],
-        ['step' => 4, 'key' => 'verification_documents', 'required' => false],
+        ['step' => 2, 'key' => 'verification_documents', 'required' => true],
+        ['step' => 3, 'key' => 'media', 'required' => true],
     ];
 }
```

---

### 1.10 Controller Update: `JobPostingController` — Verification + trust gate

#### [MODIFY] `app/Http/Controllers/Company/JobPostingController.php`

```diff
 public function store(CreateJobPostingRequest $request): JsonResponse
 {
     // ... getCompany check unchanged ...

     $job = null;

     try {
         DB::transaction(function () use ($request, $company, &$job) {
             $locked = CompanyProfile::lockForUpdate()->find($company->id);

-            if (! $locked || $locked->subscription_status !== 'active') {
-                throw new \RuntimeException('SUBSCRIPTION_REQUIRED');
+            if (! $locked) {
+                throw new \RuntimeException('COMPANY_NOT_FOUND');
+            }
+
+            // Verification gate: company must be admin-approved
+            if ($locked->verification_status !== 'approved') {
+                throw new \RuntimeException('VERIFICATION_REQUIRED');
             }

-            if ($locked->subscription_tier === 'basic' && $locked->active_listings_count >= 5) {
+            // Trust-based listing cap
+            if ($locked->active_listings_count >= $locked->listing_cap) {
                 throw new ListingLimitReachedException;
             }

             // ... rest of job creation unchanged ...

             $locked->increment('active_listings_count');
         });
     } catch (\RuntimeException $e) {
-        if ($e->getMessage() === 'SUBSCRIPTION_REQUIRED') {
-            return $this->error('SUBSCRIPTION_REQUIRED', 'An active subscription is required to post jobs.', 402);
+        if ($e->getMessage() === 'VERIFICATION_REQUIRED') {
+            return $this->error('VERIFICATION_REQUIRED', 'Your company must be verified to post jobs.', 403);
+        }
+        if ($e->getMessage() === 'COMPANY_NOT_FOUND') {
+            return $this->error('NO_COMPANY_PROFILE', 'No company profile found.', 403);
         }

         throw $e;
     } catch (ListingLimitReachedException) {
-        return $this->error('LISTING_LIMIT_REACHED', 'Active listing limit reached for your subscription tier', 403);
+        return $this->error('LISTING_LIMIT_REACHED', 'Active listing limit reached for your current trust level.', 403);
     }

     // ... rest unchanged ...
 }
```

---

### 1.11 Service Update: `SubscriptionService` — Decouple from job posting

#### [MODIFY] `app/Services/SubscriptionService.php`

```diff
 public function canPostJobs(User $user): bool
 {
     $companyProfile = $this->companyProfiles->findByUserId($user->id);

-    return $companyProfile?->subscription_status === 'active';
+    return $companyProfile !== null && $companyProfile->canPostJobs();
 }

 public function getSubscriptionStatus(User $user): array
 {
     $companyProfile = $this->companyProfiles->findByUserId($user->id);

     if (! $companyProfile) {
         throw new SubscriptionException('COMPANY_PROFILE_NOT_FOUND', 'Company profile not found.', 404);
     }

     return [
         'tier' => $companyProfile->subscription_tier,
         'status' => $companyProfile->subscription_status,
-        'can_post_jobs' => $companyProfile->subscription_status === 'active',
+        'can_post_jobs' => $companyProfile->canPostJobs(),
+        'verification_status' => $companyProfile->verification_status,
+        'listing_cap' => $companyProfile->listing_cap,
+        'active_listings_count' => $companyProfile->active_listings_count,
     ];
 }
```

---

### 1.12 Service Update: `ProfileCompletionService` — Swap subscription for verification

#### [MODIFY] `app/Services/ProfileCompletionService.php`

```diff
-    if ($companyProfile->subscription_status === 'active') {
+    // Verification documents submitted counts toward completion
+    if (in_array($companyProfile->verification_status, ['pending', 'approved'], true)) {
         $requiredFilled++;
     }
```

---

## Phase 2: Trust Score Engine

### Goal
Implement a `TrustScoreService` that calculates and caches a 0-100 trust score from 6 weighted components, mapping to 4 trust levels with dynamic capability limits.

---

### 2.1 Config: Trust Score Configuration

#### [NEW] `config/trust.php`

```php
<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Trust Score Component Weights
    |--------------------------------------------------------------------------
    */
    'weights' => [
        'email_domain' => 10,
        'document_verification' => 30,
        'account_age' => 10,
        'company_reviews' => 20,
        'behavioral' => 20,
        'subscription' => 10,
    ],

    /*
    |--------------------------------------------------------------------------
    | Trust Levels -> Capability Mapping
    |--------------------------------------------------------------------------
    */
    'levels' => [
        'untrusted' => [
            'min_score' => 0,
            'listing_cap' => 0,
            'visibility_multiplier' => 0.0,
        ],
        'new' => [
            'min_score' => 31,
            'listing_cap' => 2,
            'visibility_multiplier' => 0.6,
        ],
        'established' => [
            'min_score' => 51,
            'listing_cap' => 5,
            'visibility_multiplier' => 1.0,
        ],
        'trusted' => [
            'min_score' => 76,
            'listing_cap' => 15,
            'visibility_multiplier' => 1.1,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Premium Subscription Listing Bonus
    |--------------------------------------------------------------------------
    */
    'premium_listing_bonus' => [
        'basic' => 3,
        'pro' => 8,
    ],

    /*
    |--------------------------------------------------------------------------
    | Review Score Configuration
    |--------------------------------------------------------------------------
    */
    'reviews' => [
        'minimum_count' => 3,
    ],

    /*
    |--------------------------------------------------------------------------
    | Behavioral Score Configuration
    |--------------------------------------------------------------------------
    */
    'behavioral' => [
        'base_score' => 15,
        'max_score' => 20,
        'clean_month_bonus' => 1,
        'job_flagged_penalty' => -5,
        'spam_confirmed_penalty' => -10,
        'warning_penalty' => -8,
    ],

    /*
    |--------------------------------------------------------------------------
    | Cache Configuration
    |--------------------------------------------------------------------------
    */
    'cache' => [
        'ttl_seconds' => 3600,
        'prefix' => 'trust:score:',
    ],

    /*
    |--------------------------------------------------------------------------
    | Grandfathering
    |--------------------------------------------------------------------------
    */
    'grandfather_min_score' => 60,
];
```

---

### 2.2 Service: Trust Score Engine

#### [NEW] `app/Services/TrustScoreService.php`

```php
<?php

namespace App\Services;

use App\Models\PostgreSQL\CompanyProfile;
use App\Repositories\MongoDB\CompanyReviewDocumentRepository;
use App\Repositories\PostgreSQL\CompanyProfileRepository;
use App\Repositories\PostgreSQL\CompanyReviewRepository;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class TrustScoreService
{
    public function __construct(
        private CompanyProfileRepository $companyProfiles,
        private CompanyReviewRepository $reviewRepository,
        private CompanyReviewDocumentRepository $reviewDocs,
    ) {}

    /**
     * Calculate and persist the trust score for a company.
     */
    public function recalculate(string $companyId): array
    {
        $company = $this->companyProfiles->findById($companyId);

        if (! $company) {
            return [];
        }

        $components = $this->calculateComponents($company);
        $totalScore = min(100, max(0, array_sum($components)));
        $trustLevel = $this->resolveLevel($totalScore);
        $listingCap = $this->resolveListingCap($trustLevel, $company->subscription_tier);

        $this->companyProfiles->update($company, [
            'trust_score' => $totalScore,
            'trust_level' => $trustLevel,
            'listing_cap' => $listingCap,
        ]);

        $this->cacheScore($companyId, $totalScore, $trustLevel, $listingCap);

        return [
            'company_id' => $companyId,
            'components' => $components,
            'total_score' => $totalScore,
            'trust_level' => $trustLevel,
            'listing_cap' => $listingCap,
        ];
    }

    /**
     * Get cached trust score, or recalculate if stale.
     */
    public function getScore(string $companyId): array
    {
        $cached = $this->getCachedScore($companyId);

        if ($cached !== null) {
            return $cached;
        }

        return $this->recalculate($companyId);
    }

    /**
     * Record a trust-affecting event and recalculate.
     */
    public function recordEvent(string $companyId, string $eventType, int $scoreDelta, array $metadata = []): void
    {
        $company = $this->companyProfiles->findById($companyId);

        if (! $company) {
            return;
        }

        $result = $this->recalculate($companyId);

        DB::connection('pgsql')->table('trust_events')->insert([
            'company_id' => $companyId,
            'event_type' => $eventType,
            'score_delta' => $scoreDelta,
            'score_after' => $result['total_score'] ?? 0,
            'metadata' => json_encode($metadata),
            'created_at' => now(),
        ]);

        Log::info('Trust event recorded', [
            'company_id' => $companyId,
            'event_type' => $eventType,
            'score_delta' => $scoreDelta,
            'score_after' => $result['total_score'] ?? 0,
        ]);
    }

    /**
     * Get the visibility multiplier for a company's jobs in the deck.
     */
    public function getVisibilityMultiplier(string $companyId): float
    {
        $score = $this->getScore($companyId);
        $trustLevel = $score['trust_level'] ?? 'untrusted';
        $levels = config('trust.levels', []);

        return (float) ($levels[$trustLevel]['visibility_multiplier'] ?? 0.0);
    }

    /**
     * Invalidate the cached trust score for a company.
     */
    public function invalidateCache(string $companyId): void
    {
        $prefix = config('trust.cache.prefix', 'trust:score:');
        Redis::del("{$prefix}{$companyId}");
    }

    // ── Private: Score Component Calculations ─────────────────────────────

    private function calculateComponents(CompanyProfile $company): array
    {
        return [
            'email_domain' => $this->scoreEmailDomain($company),
            'document_verification' => $this->scoreDocumentVerification($company),
            'account_age' => $this->scoreAccountAge($company),
            'company_reviews' => $this->scoreCompanyReviews($company),
            'behavioral' => $this->scoreBehavioral($company),
            'subscription' => $this->scoreSubscription($company),
        ];
    }

    private function scoreEmailDomain(CompanyProfile $company): int
    {
        if ($company->is_free_email_domain || $company->company_domain === null) {
            return 0;
        }

        return (int) config('trust.weights.email_domain', 10);
    }

    private function scoreDocumentVerification(CompanyProfile $company): int
    {
        $max = (int) config('trust.weights.document_verification', 30);

        return match ($company->verification_status) {
            'approved' => $max,
            'pending' => (int) round($max * 0.33),  // 10
            'rejected' => (int) round($max * 0.17), // 5
            default => 0,
        };
    }

    private function scoreAccountAge(CompanyProfile $company): int
    {
        $max = (int) config('trust.weights.account_age', 10);
        $monthsOld = Carbon::parse($company->created_at)->diffInMonths(now());

        return match (true) {
            $monthsOld >= 12 => $max,
            $monthsOld >= 6 => 7,
            $monthsOld >= 3 => 5,
            $monthsOld >= 1 => 3,
            default => 1,
        };
    }

    private function scoreCompanyReviews(CompanyProfile $company): int
    {
        $max = (int) config('trust.weights.company_reviews', 20);
        $minReviews = (int) config('trust.reviews.minimum_count', 3);

        $visibleReviewIds = $this->reviewRepository
            ->getVisibleReviewIds($company->id)
            ->toArray();

        $reviewCount = count($visibleReviewIds);

        if ($reviewCount < $minReviews) {
            return 0;
        }

        $stats = $this->reviewDocs->getAggregateStats($company->id, $visibleReviewIds);
        $avgRating = (float) ($stats['average_rating'] ?? 0);

        return match (true) {
            $avgRating >= 4.5 && $reviewCount >= 10 => $max,
            $avgRating >= 4.0 && $reviewCount >= 5 => 15,
            $avgRating >= 3.5 && $reviewCount >= 3 => 10,
            $avgRating >= 3.0 && $reviewCount >= 1 => 5,
            default => 0,
        };
    }

    private function scoreBehavioral(CompanyProfile $company): int
    {
        $baseScore = (int) config('trust.behavioral.base_score', 15);
        $maxScore = (int) config('trust.behavioral.max_score', 20);

        $eventDelta = (int) DB::connection('pgsql')
            ->table('trust_events')
            ->where('company_id', $company->id)
            ->whereIn('event_type', [
                'job_flagged', 'spam_confirmed', 'warning_issued',
                'clean_month',
            ])
            ->sum('score_delta');

        return max(0, min($maxScore, $baseScore + $eventDelta));
    }

    private function scoreSubscription(CompanyProfile $company): int
    {
        if ($company->subscription_status !== 'active') {
            return 0;
        }

        return match ($company->subscription_tier) {
            'pro' => 10,
            'basic' => 7,
            default => 0,
        };
    }

    // ── Private: Level & Cap Resolution ───────────────────────────────────

    private function resolveLevel(int $score): string
    {
        $levels = config('trust.levels', []);

        foreach (['trusted', 'established', 'new'] as $level) {
            if ($score >= ($levels[$level]['min_score'] ?? PHP_INT_MAX)) {
                return $level;
            }
        }

        return 'untrusted';
    }

    private function resolveListingCap(string $trustLevel, string $subscriptionTier): int
    {
        $levels = config('trust.levels', []);
        $baseCap = (int) ($levels[$trustLevel]['listing_cap'] ?? 0);
        $bonus = (int) (config("trust.premium_listing_bonus.{$subscriptionTier}") ?? 0);

        return $baseCap + $bonus;
    }

    // ── Private: Redis Cache ──────────────────────────────────────────────

    private function cacheScore(string $companyId, int $score, string $level, int $cap): void
    {
        $prefix = config('trust.cache.prefix', 'trust:score:');
        $ttl = (int) config('trust.cache.ttl_seconds', 3600);

        $data = json_encode([
            'total_score' => $score,
            'trust_level' => $level,
            'listing_cap' => $cap,
        ]);

        Redis::setex("{$prefix}{$companyId}", $ttl, $data);
    }

    private function getCachedScore(string $companyId): ?array
    {
        $prefix = config('trust.cache.prefix', 'trust:score:');
        $cached = Redis::get("{$prefix}{$companyId}");

        if ($cached === null) {
            return null;
        }

        $data = json_decode($cached, true);

        return is_array($data) ? $data : null;
    }
}
```

---

### 2.3 Integration Points: Trigger Recalculation

#### Admin approves verification — [MODIFY] `app/Repositories/PostgreSQL/CompanyProfileRepository.php`

```diff
 public function markAsVerified(string $companyId): void
 {
     CompanyProfile::where('id', $companyId)->update([
         'is_verified' => true,
         'verification_status' => 'approved',
     ]);
+
+    app(\App\Services\TrustScoreService::class)->recordEvent(
+        $companyId, 'docs_approved', 30, ['action' => 'admin_verification_approved']
+    );
 }
```

#### Review submitted — [MODIFY] `app/Services/ReviewService.php`

```diff
 // Notify company
 $this->notificationService->notifyCompanyOfReview($data['company_id'], $reviewId);

+// Recalculate trust score (review count/rating may affect it)
+app(\App\Services\TrustScoreService::class)->recalculate($data['company_id']);
```

#### Subscription activated — [MODIFY] `app/Services/SubscriptionService.php` in `activateSubscription()`

```diff
 $this->companyProfiles->update($companyProfile, [
     'subscription_tier' => 'basic',
     'subscription_status' => 'active',
 ]);

+app(\App\Services\TrustScoreService::class)->recalculate($companyProfile->id);
```

#### Subscription deactivated — [MODIFY] `app/Services/SubscriptionService.php` in `deactivateSubscription()`

```diff
 $this->companyProfiles->update($companyProfile, [
     'subscription_status' => 'cancelled',
 ]);

+app(\App\Services\TrustScoreService::class)->recalculate($companyProfile->id);
```

---

### 2.4 DeckService Integration: Visibility Multiplier

#### [MODIFY] `app/Services/DeckService.php`

```diff
+use App\Services\TrustScoreService;

 class DeckService
 {
     public function __construct(
         private SwipeCacheRepository $cache,
         private SwipeHistoryRepository $swipeHistory,
+        private TrustScoreService $trustScore,
     ) {}

     // In the scoring lambda inside getJobDeck():

-    $job->relevance_score = ($skillScore * 0.7) + ($recencyScore * 0.3) + $locationBonus + $remoteBonus;
+    $visibilityMultiplier = $this->trustScore->getVisibilityMultiplier($job->company_id);
+    $baseScore = ($skillScore * 0.7) + ($recencyScore * 0.3) + $locationBonus + $remoteBonus;
+    $job->relevance_score = $baseScore * $visibilityMultiplier;
```

---

### 2.5 Artisan Command: Monthly Trust Score Refresh

#### [NEW] `app/Console/Commands/RefreshTrustScores.php`

```php
<?php

namespace App\Console\Commands;

use App\Models\PostgreSQL\CompanyProfile;
use App\Services\TrustScoreService;
use Illuminate\Console\Command;

class RefreshTrustScores extends Command
{
    protected $signature = 'trust:refresh {--company= : Specific company ID to refresh}';

    protected $description = 'Recalculate trust scores for all verified companies';

    public function handle(TrustScoreService $trustScore): int
    {
        $companyId = $this->option('company');

        if ($companyId) {
            $result = $trustScore->recalculate($companyId);
            $this->info("Recalculated: score={$result['total_score']}, level={$result['trust_level']}");

            return self::SUCCESS;
        }

        $companies = CompanyProfile::whereIn('verification_status', ['pending', 'approved'])
            ->pluck('id');

        $bar = $this->output->createProgressBar($companies->count());

        foreach ($companies as $id) {
            $trustScore->recalculate($id);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Refreshed {$companies->count()} company trust scores.");

        return self::SUCCESS;
    }
}
```

---

### 2.6 Artisan Command: Award Clean Month Bonus

#### [NEW] `app/Console/Commands/AwardCleanMonthBonus.php`

```php
<?php

namespace App\Console\Commands;

use App\Models\PostgreSQL\CompanyProfile;
use App\Services\TrustScoreService;
use Illuminate\Console\Command;

class AwardCleanMonthBonus extends Command
{
    protected $signature = 'trust:clean-month';

    protected $description = 'Award +1 behavioral trust point to companies with no incidents in the past month';

    public function handle(TrustScoreService $trustScore): int
    {
        $oneMonthAgo = now()->subMonth();

        $eligibleCompanies = CompanyProfile::where('verification_status', 'approved')
            ->whereNotExists(function ($query) use ($oneMonthAgo) {
                $query->selectRaw('1')
                    ->from('trust_events')
                    ->whereColumn('trust_events.company_id', 'company_profiles.id')
                    ->whereIn('trust_events.event_type', ['job_flagged', 'spam_confirmed', 'warning_issued'])
                    ->where('trust_events.created_at', '>=', $oneMonthAgo);
            })
            ->pluck('id');

        $bonus = (int) config('trust.behavioral.clean_month_bonus', 1);
        $count = 0;

        foreach ($eligibleCompanies as $companyId) {
            $trustScore->recordEvent($companyId, 'clean_month', $bonus, [
                'period' => $oneMonthAgo->toDateString() . ' to ' . now()->toDateString(),
            ]);
            $count++;
        }

        $this->info("Awarded clean month bonus to {$count} companies.");

        return self::SUCCESS;
    }
}
```

**Scheduler registration** (in `routes/console.php` or `app/Console/Kernel.php`):

```php
Schedule::command('trust:refresh')->monthlyOn(1, '02:00');
Schedule::command('trust:clean-month')->monthlyOn(1, '03:00');
```

---

### 2.7 Post-Implementation Hardening Fixes (Applied)

The following Phase 2 hardening fixes were applied after implementation review:

1. **Trust event ordering fixed**
   - `recordEvent()` now inserts event first, then recalculates, then updates `score_after`.
   - Fixes delayed behavioral scoring and stale `score_after` values.

2. **Listing cap bonus now requires active subscription**
   - Premium cap bonus is now gated by `subscription_status === 'active'`, not tier alone.
   - Prevents stale premium caps after cancellation.

3. **Webhook path now recalculates trust immediately**
   - Stripe webhook updates now trigger trust recalculation after profile updates.
   - Keeps `trust_score`, `trust_level`, and `listing_cap` in sync with billing state.

4. **Cancellation now normalizes company tier to `free`**
   - Manual and webhook cancellation paths both normalize tier when not active.
   - Keeps badge/cap logic consistent with entitlement state.

5. **Verification-to-approved now has a guaranteed trust trigger**
   - Added `CompanyProfile` observer so approval transitions reliably trigger trust recalculation/event recording even outside a single service path.

6. **Operational hardening**
   - `trust:refresh --company=<id>` now fails gracefully when company is missing.
   - Migration rollback now maps `free -> none` before restoring legacy constraint.
   - `DatabaseSeeder` now includes `BlockedEmailDomainSeeder` by default.

---

## Phase 3: Premium Subscription Redesign

### Goal
Reposition subscription as optional premium upgrade. Verified badge requires trust + subscription.

---

### 3.1 Verified Badge Logic

#### [MODIFY] `app/Models/PostgreSQL/CompanyProfile.php`

```diff
 public function isVerified(): bool
 {
-    return $this->is_verified;
+    // Verified badge requires admin approval + active paid subscription
+    return $this->is_verified
+        && $this->subscription_status === 'active'
+        && in_array($this->subscription_tier, ['basic', 'pro'], true);
 }
```

### 3.2 No Route Changes Needed

Subscription routes remain identical — they are just no longer part of onboarding. Companies access them from the dashboard as an optional upgrade.

---

## Phase 4: Company Membership & Invite-Gated Domain Association (Planned)

### Goal
Implement Design Decision #4 end-to-end: same-domain HR users must be invited by an existing company admin, not auto-associated by domain.

### Current Gap
Current registration creates a fresh `company_profile` per HR/company_admin user. This does not enforce invite-required collaboration and can fragment one company into multiple isolated records.

### 4.1 Data Model Changes

#### [NEW] `database/migrations/2026_XX_XX_000001_create_company_memberships_table.php`

Create `company_memberships`:
- `id` UUID PK
- `company_id` UUID FK -> `company_profiles.id`
- `user_id` UUID FK -> `users.id`
- `membership_role` (`company_admin`, `hr`)
- `status` (`active`, `inactive`)
- `invited_by_user_id` UUID nullable FK -> `users.id`
- `joined_at` timestamptz
- timestamps
- unique index on (`company_id`, `user_id`)
- index on (`user_id`, `status`)

#### [NEW] `database/migrations/2026_XX_XX_000002_create_company_invites_table.php`

Create `company_invites`:
- `id` UUID PK
- `company_id` UUID FK -> `company_profiles.id`
- `email` varchar(255) (normalized lowercase)
- `email_domain` varchar(255)
- `invite_role` (`company_admin`, `hr`)
- `token_hash` varchar(255) unique
- `invited_by_user_id` UUID FK -> `users.id`
- `expires_at` timestamptz
- `accepted_at` timestamptz nullable
- `revoked_at` timestamptz nullable
- timestamps
- index on (`email`, `expires_at`)
- index on (`company_id`, `accepted_at`)

#### [MODIFY] `company_profiles` ownership strategy

Transitional approach:
1. Add `owner_user_id` nullable
2. Backfill from current `user_id`
3. Keep legacy `user_id` during transition for compatibility
4. Migrate read paths to memberships
5. Remove legacy coupling in final cleanup migration

### 4.2 New Service Layer

#### [NEW] `app/Services/CompanyInvitationService.php`

Methods:
- `createInvite(companyId, inviterUserId, email, role)`
- `listInvites(companyId, inviterUserId)`
- `revokeInvite(companyId, inviterUserId, inviteId)`
- `acceptInvite(token, registeringUserId, registeringEmail)`

Rules:
- only active `company_admin` can invite/revoke
- invite email must match accepting account email exactly
- token is hashed-at-rest and single-use
- invite has TTL (recommended: 7 days)

#### [NEW] `app/Services/CompanyMembershipService.php`

Methods:
- `addMember(companyId, userId, role, invitedByUserId)`
- `isAdmin(companyId, userId)`
- `getPrimaryCompanyForUser(userId)`
- `getMembership(companyId, userId)`

### 4.3 Registration / Onboarding Flow Changes

#### [MODIFY] `AuthService::completeRegistration()`

For `hr` / `company_admin`:
1. Extract email domain
2. Detect existing companies with same domain
3. If no existing company: create new company profile + bootstrap membership as founding `company_admin`
4. If existing company found: require valid invite token, otherwise reject with `COMPANY_INVITE_REQUIRED`
5. On valid invite: add membership to invited company (no new company profile)

#### [MODIFY] Company profile resolution paths

Replace direct `findByUserId()` assumptions in company-facing services/controllers with membership-aware resolution (`getPrimaryCompanyForUser()`), then fall back to legacy field during transition.

### 4.4 API Endpoints (Planned)

#### [NEW] Company Invite Management
- `POST /api/v1/company/invites`
- `GET /api/v1/company/invites`
- `DELETE /api/v1/company/invites/{invite_id}`
- `POST /api/v1/company/invites/accept`

#### [MODIFY] Auth registration contract
- allow optional `company_invite_token` for `hr` / `company_admin`
- return `COMPANY_INVITE_REQUIRED` when domain-matched company exists and token is missing/invalid

### 4.5 Security Requirements

1. Token stored only as hash, never plaintext in DB.
2. Accept endpoint rate-limited.
3. Token invalidated on first successful acceptance.
4. Expired/revoked tokens rejected with non-enumerating error.
5. Invite cannot escalate role unless inviter is `company_admin`.
6. Domain alone never grants access to an existing company.

### 4.6 Testing Plan (Phase 4)

#### Unit tests
- `CompanyInvitationServiceTest::test_admin_can_create_invite`
- `CompanyInvitationServiceTest::test_hr_cannot_create_invite`
- `CompanyInvitationServiceTest::test_token_is_single_use`
- `CompanyInvitationServiceTest::test_invite_expires`
- `CompanyMembershipServiceTest::test_add_member`

#### Integration tests
- `AuthRegistrationTest::test_same_domain_without_invite_is_blocked`
- `AuthRegistrationTest::test_same_domain_with_valid_invite_joins_company`
- `AuthRegistrationTest::test_no_existing_domain_creates_new_company`
- `CompanyInviteApiTest::test_invite_accept_flow`

### 4.7 Rollout Strategy

1. Ship schema + services + APIs behind feature flag `COMPANY_INVITES_ENABLED`.
2. Backfill existing company owners into `company_memberships`.
3. Switch company lookup to membership-first reads.
4. Enforce invite requirement for new registrations.
5. Remove legacy `company_profiles.user_id` dependency in cleanup release.

---

## File Change Summary

> Note: Phase 4 is planned and not yet implemented in code at this point.

### New Files (10)

| File | Purpose |
|------|---------|
| `database/migrations/2026_04_14_000001_add_trust_columns_to_company_profiles.php` | Add trust_score, trust_level, listing_cap, company_domain columns |
| `database/migrations/2026_04_14_000002_create_trust_events_table.php` | Audit trail for trust-affecting events |
| `database/migrations/2026_04_14_000003_create_blocked_email_domains_table.php` | Blocklist for free/disposable email providers |
| `database/seeders/BlockedEmailDomainSeeder.php` | Seed common free/disposable domains |
| `config/trust.php` | Trust score weights, levels, caps configuration |
| `app/Services/CompanyEmailValidator.php` | Email domain extraction + blocklist check |
| `app/Services/TrustScoreService.php` | Core trust engine — scoring, caching, events |
| `app/Console/Commands/RefreshTrustScores.php` | Monthly full recalculation command |
| `app/Console/Commands/AwardCleanMonthBonus.php` | Monthly behavioral reward command |
| `app/Observers/CompanyProfileObserver.php` | Guarantees trust recalc/eventing on verification status transitions |

### Modified Files (12)

| File | Change Summary |
|------|---------------|
| `app/Models/PostgreSQL/CompanyProfile.php` | Add trust columns to fillable/casts, `canPostJobs()`, `isApproved()`, updated `isVerified()` |
| `app/Services/AuthService.php` | Add `CompanyEmailValidator` DI, extract domain on HR registration |
| `app/Services/ProfileService.php` | New `setCompanyEmailDomain()`, change defaults to `free`/`active`/`unverified` |
| `app/Services/ProfileOnboardingService.php` | Remove payment step, reorder to 3 steps, make verification required |
| `app/Services/ProfileCompletionService.php` | Swap subscription check for verification_status check |
| `app/Services/SubscriptionService.php` | Use `canPostJobs()` model method, add trust recalc triggers |
| `app/Services/ReviewService.php` | Trigger trust recalculation after review submitted |
| `app/Services/DeckService.php` | Apply trust visibility multiplier to relevance scoring |
| `app/Http/Controllers/Company/JobPostingController.php` | Replace subscription gate with verification + trust cap gate |
| `app/Repositories/PostgreSQL/CompanyProfileRepository.php` | Trigger trust recalculation on `markAsVerified()` |
| `app/Providers/AppServiceProvider.php` | Register `CompanyProfileObserver` to guarantee approval transition hooks |
| `database/seeders/DatabaseSeeder.php` | Include `BlockedEmailDomainSeeder` in default seed flow |

### Deleted Code

| Location | What's Removed |
|----------|---------------|
| `ProfileOnboardingService::completeCompanyStepPayment()` | Entire method deleted |
| `JobPostingController::store()` | `SUBSCRIPTION_REQUIRED` error path |
| Hard-coded `>= 5` listing limit | Replaced by dynamic `listing_cap` |

---

## Verification Plan

### Automated Tests

```bash
# Smoke test existing tests still pass
php artisan test --filter=SubscriptionService
php artisan test --filter=ProfileOnboarding
php artisan test --filter=JobPosting

# Run new trust-specific tests
php artisan test --filter=TrustScoreService
php artisan test --filter=CompanyEmailValidator
```

### Unit Tests to Write

| Test | Validates |
|------|-----------|
| `TrustScoreServiceTest::test_new_company_scores_zero` | Fresh company: score 0, trust_level untrusted |
| `TrustScoreServiceTest::test_approved_company_reaches_new_level` | Approved docs + base behavioral = 31+ |
| `TrustScoreServiceTest::test_premium_subscriber_gets_listing_bonus` | Basic sub adds +3 to listing cap |
| `TrustScoreServiceTest::test_free_email_gets_zero_domain_points` | gmail.com = 0 points |
| `TrustScoreServiceTest::test_corporate_email_gets_full_points` | acme.com.ph = 10 points |
| `CompanyEmailValidatorTest::test_blocklist_check` | Known domains are flagged |
| `CompanyEmailValidatorTest::test_corporate_domain_passes` | Corporate domain is not blocked |
| `JobPostingTest::test_unverified_company_cannot_post` | Returns VERIFICATION_REQUIRED |
| `JobPostingTest::test_verified_company_within_cap_can_post` | Posts successfully |
| `JobPostingTest::test_listing_cap_enforced` | Returns LISTING_LIMIT_REACHED |
| `OnboardingTest::test_3_step_flow_no_payment` | Steps 1-2-3 complete without payment |

### Manual Verification Checklist

1. Register new HR user -> confirm `subscription_tier = 'free'`, `subscription_status = 'active'`
2. Complete onboarding Steps 1-3 (no payment step) -> confirm `verification_status = 'pending'`
3. Attempt to post a job -> confirm `VERIFICATION_REQUIRED` error
4. Admin approves -> confirm trust recalculates, `trust_level = 'new'`, `listing_cap = 2`
5. Post a job -> confirm success
6. Post until cap -> confirm `LISTING_LIMIT_REACHED`
7. Subscribe to basic -> confirm listing cap increases by 3

---

## Migration & Rollback Strategy

### Forward Migration

```bash
php artisan migrate
php artisan db:seed --class=BlockedEmailDomainSeeder
php artisan trust:refresh  # One-time: calculate scores for all existing companies
```

### Grandfathering Existing Companies

Run once after migration:

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

Then run `php artisan trust:refresh` to recalculate all scores properly.

### Rollback

```bash
php artisan migrate:rollback --step=3
```

> **Warning**: Rollback removes trust columns. The old subscription_tier constraint is restored but 'free' values need manual cleanup. Prepare a data migration script if rollback is needed after going live.
