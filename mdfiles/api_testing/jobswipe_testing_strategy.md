# JobSwipe — Testing Strategy & Implementation Plan

> **Context:** 29 test files, ~128 test methods exist (all pure PHPUnit unit tests extending `PHPUnit\Framework\TestCase`). No feature/integration tests hitting the database. No `tests/TestCase.php` base class.

---

## 1. Current State Assessment

### What You Have ✅
| Layer | Files | Methods | Coverage |
|---|---|---|---|
| Services (Unit) | 6 | 25 | Subscription, Profile, FileUpload |
| Controllers (Unit) | 11 | 37 | Profile, Subscription, FileUpload, Onboarding, Webhook, HR Review |
| Repositories (Unit) | 5 | 34 | IAP, Subscription, Webhook, CompanyProfileDocument |
| Middleware (Unit) | 1 | 3 | CheckRole |
| Requests (Unit) | 1 | 6 | Profile validation |
| Routes (Unit) | 1 | 3 | API route integration |
| Exceptions (Unit) | 2 | 4 | API format, global handler |
| Infrastructure | 2 | 10 | Bug condition, preservation |
| **Total** | **29** | **~128** | |

### What's Missing ❌
| Gap | Impact | Priority |
|---|---|---|
| **Feature tests** (HTTP request → response through full stack) | Can't verify routes, middleware, auth, validation, DB end-to-end | 🔴 Critical |
| **Auth flow tests** | Registration, OTP, login, password reset are completely untested | 🔴 Critical |
| **Swipe/Deck tests** | Core product feature — atomicity, limits, deduplication untested | 🔴 Critical |
| **Match lifecycle tests** | State machine (pending→accepted/declined/expired/closed) untested | 🔴 Critical |
| **Stripe webhook integration tests** | Payment state transitions untested | 🟡 High |
| **IAP service tests** (with mocked Apple/Google) | Purchase + webhook processing untested | 🟡 High |
| **Trust Score Engine tests** | Config-driven scoring logic untested | 🟡 High |
| **Review Service tests** | Cross-DB transaction + tier-gating untested | 🟡 Medium |
| **Notification Service tests** | Preference-gated notifications untested | 🟢 Low |
| **Database factory classes** | No factories → no way to generate test data efficiently | 🔴 Blocker |
| **`tests/TestCase.php`** | No base class for feature tests | 🔴 Blocker |

---

## 2. Strategic Options

### Option A: PHPUnit Only (Recommended ✅)
**Keep your current PHPUnit setup. Add Feature tests using Laravel's built-in `TestCase`.**

| Pros | Cons |
|---|---|
| Zero migration cost — your 128 tests stay exactly as-is | PHPUnit syntax is slightly more verbose than Pest |
| Team familiarity — standard Laravel documentation uses PHPUnit | Less "modern" feel |
| Mockery already in `composer.json` | — |
| PHPUnit 10.5 is already installed | — |

**Effort:** Low. You just need to create `tests/TestCase.php` and start writing Feature tests.

### Option B: Migrate to Pest PHP
**Replace PHPUnit with Pest for a more expressive, less boilerplate syntax.**

| Pros | Cons |
|---|---|
| Cleaner syntax (`it('...')`, `expect()->toBe()`) | Must rewrite all 128 existing tests |
| First-class architecture testing (enforce patterns) | Learning curve for Pest-specific features |
| Better parallel test support | Pest v3 requires PHPUnit 11 (you have 10.5) |
| Built-in coverage reporting | Migration effort: ~2-3 days |

**Effort:** Medium. Install Pest, migrate existing tests, then write new ones.

```bash
# Pest installation (if you choose this)
composer require pestphp/pest --dev --with-all-dependencies
./vendor/bin/pest --init
```

### Option C: Hybrid (PHPUnit Unit + Pest Feature)
**Keep existing PHPUnit unit tests. Write new Feature tests in Pest.**

| Pros | Cons |
|---|---|
| No migration of existing tests | Two different test syntaxes in one codebase |
| Pest for new, expressive integration tests | Team must know both |
| Gradual adoption | — |

**Effort:** Low-Medium.

---

> [!TIP]
> **My recommendation: Option A (PHPUnit only).** Your 128 existing tests already use PHPUnit. Laravel's test tooling (`actingAs()`, `assertJson()`, `RefreshDatabase`) works perfectly with PHPUnit. Adding Pest adds complexity without proportional benefit at your stage. If you later want to migrate to Pest, it's a straightforward find-and-replace operation.

---

## 3. Infrastructure Setup (Do This First)

### 3.1 Create the Base `TestCase.php`

```php
<?php
// tests/TestCase.php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    //
}
```

### 3.2 Fix `phpunit.xml.dist` for Your Multi-DB Architecture

Your current config uses `DB_CONNECTION=sqlite` + `DB_DATABASE=:memory:`. This won't work for your app because:
1. PostgreSQL-specific features (`lockForUpdate()`, `upsert()`, `orderByRaw()` with `CASE`) don't exist in SQLite.
2. You have a separate MongoDB connection that SQLite can't simulate.

**You have two sub-options here:**

#### Option 3.2a: SQLite for Fast Unit/Feature Tests, PostgreSQL for Integration (Recommended)

Use SQLite in-memory for most Feature tests (fast, ~2s total), but have a separate `Integration` test suite that runs against real PostgreSQL + MongoDB + Redis via Docker.

```xml
<!-- phpunit.xml.dist -->
<testsuites>
    <testsuite name="Unit">
        <directory>tests/Unit</directory>
    </testsuite>
    <testsuite name="Feature">
        <directory>tests/Feature</directory>
    </testsuite>
    <testsuite name="Integration">
        <directory>tests/Integration</directory>
    </testsuite>
</testsuites>
<php>
    <env name="APP_ENV" value="testing"/>
    <env name="BCRYPT_ROUNDS" value="4"/>
    <env name="CACHE_STORE" value="array"/>
    <env name="DB_CONNECTION" value="sqlite"/>
    <env name="DB_DATABASE" value=":memory:"/>
    <env name="MAIL_MAILER" value="array"/>
    <env name="QUEUE_CONNECTION" value="sync"/>
    <env name="SESSION_DRIVER" value="array"/>
    <!-- Disable MongoDB for SQLite-based tests -->
    <env name="MONGODB_ENABLED" value="false"/>
</php>
```

Then create a separate config for integration tests:

```xml
<!-- phpunit.integration.xml -->
<testsuites>
    <testsuite name="Integration">
        <directory>tests/Integration</directory>
    </testsuite>
</testsuites>
<php>
    <env name="APP_ENV" value="testing"/>
    <env name="BCRYPT_ROUNDS" value="4"/>
    <env name="DB_CONNECTION" value="pgsql"/>
    <env name="DB_HOST" value="127.0.0.1"/>
    <env name="DB_PORT" value="5433"/>
    <env name="DB_DATABASE" value="jobapp_test"/>
    <env name="DB_USERNAME" value="postgres"/>
    <env name="DB_PASSWORD" value="testing"/>
    <env name="REDIS_HOST" value="127.0.0.1"/>
    <env name="QUEUE_CONNECTION" value="sync"/>
    <env name="MAIL_MAILER" value="array"/>
</php>
```

```bash
# Run fast tests (SQLite)
php artisan test --testsuite=Unit,Feature

# Run integration tests (requires Docker services running)
php artisan test --configuration=phpunit.integration.xml
```

#### Option 3.2b: PostgreSQL for Everything (Simpler, Slower)

Use real PostgreSQL for all tests. Requires Docker services running for every test run.

```xml
<!-- phpunit.xml.dist — replace SQLite lines -->
<env name="DB_CONNECTION" value="pgsql"/>
<env name="DB_HOST" value="127.0.0.1"/>
<env name="DB_PORT" value="5433"/>
<env name="DB_DATABASE" value="jobapp_test"/>
<env name="DB_USERNAME" value="postgres"/>
<env name="DB_PASSWORD" value="testing"/>
```

```bash
# Create test database
docker exec jobapp_postgres psql -U postgres -c "CREATE DATABASE jobapp_test;"

# Run all tests
php artisan test
```

> [!IMPORTANT]
> **For SQLite-based Feature tests (Option 3.2a),** you'll need to handle the PostgreSQL-specific syntax in your migrations. Common approach: wrap PostgreSQL-only statements in `if (Schema::getConnection()->getDriverName() !== 'sqlite')` guards, or create separate SQLite-compatible migration stubs for testing.

---

### 3.3 Create Model Factories

You need factories to generate test data efficiently. Create these in `database/factories/`:

```php
<?php
// database/factories/UserFactory.php

namespace Database\Factories;

use App\Models\PostgreSQL\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'email' => fake()->unique()->safeEmail(),
            'password_hash' => bcrypt('password'),
            'role' => 'applicant',
            'is_active' => true,
            'is_banned' => false,
            'email_verified_at' => now(),
        ];
    }

    public function unverified(): static
    {
        return $this->state(['email_verified_at' => null]);
    }

    public function banned(): static
    {
        return $this->state(['is_banned' => true]);
    }

    public function hr(): static
    {
        return $this->state(['role' => 'hr']);
    }

    public function companyAdmin(): static
    {
        return $this->state(['role' => 'company_admin']);
    }

    public function applicant(): static
    {
        return $this->state(['role' => 'applicant']);
    }
}
```

```php
<?php
// database/factories/ApplicantProfileFactory.php

namespace Database\Factories;

use App\Models\PostgreSQL\ApplicantProfile;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ApplicantProfileFactory extends Factory
{
    protected $model = ApplicantProfile::class;

    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'user_id' => Str::uuid()->toString(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'subscription_tier' => 'free',
            'subscription_status' => 'inactive',
            'daily_swipe_limit' => 15,
            'daily_swipes_used' => 0,
            'extra_swipe_balance' => 0,
        ];
    }

    public function pro(): static
    {
        return $this->state([
            'subscription_tier' => 'pro',
            'subscription_status' => 'active',
            'daily_swipe_limit' => 999,
        ]);
    }
}
```

```php
<?php
// database/factories/CompanyProfileFactory.php

namespace Database\Factories;

use App\Models\PostgreSQL\CompanyProfile;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class CompanyProfileFactory extends Factory
{
    protected $model = CompanyProfile::class;

    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'user_id' => Str::uuid()->toString(),
            'company_name' => fake()->company(),
            'company_domain' => fake()->domainName(),
            'verification_status' => 'unverified',
            'trust_score' => 0,
            'trust_level' => 'untrusted',
            'listing_cap' => 0,
            'active_listings_count' => 0,
            'subscription_tier' => 'none',
            'subscription_status' => 'inactive',
        ];
    }

    public function verified(): static
    {
        return $this->state([
            'verification_status' => 'approved',
            'trust_score' => 60,
            'trust_level' => 'established',
            'listing_cap' => 5,
        ]);
    }

    public function withSubscription(string $tier = 'basic'): static
    {
        return $this->state([
            'subscription_tier' => $tier,
            'subscription_status' => 'active',
        ]);
    }
}
```

```php
<?php
// database/factories/JobPostingFactory.php

namespace Database\Factories;

use App\Models\PostgreSQL\JobPosting;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class JobPostingFactory extends Factory
{
    protected $model = JobPosting::class;

    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'company_id' => Str::uuid()->toString(),
            'title' => fake()->jobTitle(),
            'description' => fake()->paragraphs(3, true),
            'salary_min' => 30000,
            'salary_max' => 60000,
            'salary_is_hidden' => false,
            'work_type' => fake()->randomElement(['remote', 'hybrid', 'on_site']),
            'location' => fake()->city(),
            'location_city' => fake()->city(),
            'location_region' => fake()->state(),
            'status' => 'active',
            'published_at' => now(),
            'expires_at' => now()->addDays(30),
        ];
    }

    public function closed(): static
    {
        return $this->state(['status' => 'closed']);
    }

    public function expired(): static
    {
        return $this->state([
            'status' => 'expired',
            'expires_at' => now()->subDay(),
        ]);
    }
}
```

```php
<?php
// database/factories/MatchRecordFactory.php

namespace Database\Factories;

use App\Models\PostgreSQL\MatchRecord;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class MatchRecordFactory extends Factory
{
    protected $model = MatchRecord::class;

    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'application_id' => Str::uuid()->toString(),
            'applicant_id' => Str::uuid()->toString(),
            'job_posting_id' => Str::uuid()->toString(),
            'hr_user_id' => Str::uuid()->toString(),
            'initial_message' => fake()->sentence(),
            'status' => 'pending',
            'matched_at' => now(),
            'response_deadline' => now()->addHours(24),
        ];
    }

    public function accepted(): static
    {
        return $this->state([
            'status' => 'accepted',
            'responded_at' => now(),
        ]);
    }

    public function expired(): static
    {
        return $this->state([
            'status' => 'expired',
            'response_deadline' => now()->subHour(),
        ]);
    }

    public function deadlinePassed(): static
    {
        return $this->state([
            'status' => 'pending',
            'response_deadline' => now()->subMinutes(5),
        ]);
    }
}
```

> [!IMPORTANT]
> You also need to add the `HasFactory` trait to each model:
> ```php
> use Illuminate\Database\Eloquent\Factories\HasFactory;
> class User extends Authenticatable {
>     use Billable, HasApiTokens, HasFactory;
> }
> ```

---

### 3.4 Add `HasFactory` Trait to Models

Each model that needs a factory must `use HasFactory`. Add it to:
- `User`
- `ApplicantProfile`
- `CompanyProfile`
- `JobPosting`
- `MatchRecord`
- `MatchMessage`
- `Application`

---

## 4. Test Categories & What Goes Where

```
tests/
├── Unit/                          ← Pure logic, no DB, no HTTP, mocks only
│   ├── Services/                  ← Service method logic with mocked repos
│   ├── Repositories/              ← Query builder assertions (mocked DB)
│   ├── Middleware/                 ← Middleware handle() with mocked request
│   ├── Controllers/               ← Controller return values with mocked services
│   ├── Exceptions/                ← Exception rendering
│   └── Requests/                  ← Validation rule assertions
│
├── Feature/                       ← HTTP tests through Laravel's app (SQLite OK)
│   ├── Auth/                      ← Register, login, OTP, password reset
│   ├── Profile/                   ← Applicant + Company profile CRUD
│   ├── Swipe/                     ← Deck, swipe right/left, limits
│   ├── Match/                     ← Match lifecycle, messaging
│   ├── Job/                       ← Job CRUD, close, listing cap
│   ├── Subscription/              ← Checkout, status, cancel
│   ├── Review/                    ← Submit, tier-gating, flag
│   ├── Notification/              ← CRUD, preferences
│   └── IAP/                       ← Purchase, status, cancel
│
├── Integration/                   ← Real DB (PostgreSQL/MongoDB/Redis via Docker)
│   ├── SwipeAtomicityTest.php     ← Concurrent swipe race conditions
│   ├── MatchStateMachineTest.php  ← Full lifecycle with real DB locks
│   ├── TrustScoreTest.php         ← Real Redis caching + PG queries
│   ├── WebhookIdempotencyTest.php ← Stripe/IAP replay with real DB
│   └── DeckPaginationTest.php     ← Cursor pagination with real data
│
└── TestCase.php                   ← Base class for Feature tests
```

---

## 5. Priority-Ordered Test Roadmap

### Phase 1: Foundation + Critical Path (Week 1) 🔴

> This phase enables all subsequent testing. Do this first.

#### 1a. Infrastructure (Day 1)
- [ ] Create `tests/TestCase.php`
- [ ] Create all Model Factories (User, ApplicantProfile, CompanyProfile, JobPosting, MatchRecord, Application, MatchMessage)
- [ ] Add `HasFactory` trait to all models
- [ ] Verify `php artisan test --testsuite=Unit` still passes

#### 1b. Auth Feature Tests (Days 2-3)

```php
<?php
// tests/Feature/Auth/RegistrationTest.php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_applicant_can_register_with_valid_data(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'test@example.com',
            'password' => 'StrongP@ss123',
            'role' => 'applicant',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Verification code sent successfully',
                'data' => ['email' => 'test@example.com'],
            ]);
    }

    public function test_registration_fails_with_duplicate_email(): void
    {
        // First registration
        $this->postJson('/api/v1/auth/register', [
            'email' => 'dupe@example.com',
            'password' => 'StrongP@ss123',
            'role' => 'applicant',
        ]);

        // Second registration with same email
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'dupe@example.com',
            'password' => 'StrongP@ss123',
            'role' => 'applicant',
        ]);

        $response->assertStatus(409)
            ->assertJson(['code' => 'EMAIL_TAKEN']);
    }

    public function test_hr_cannot_register_with_oauth(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'hr@company.com',
            'password' => 'StrongP@ss123',
            'role' => 'hr',
            'oauth_provider' => 'google',
        ]);

        $response->assertStatus(422)
            ->assertJson(['code' => 'OAUTH_NOT_PERMITTED']);
    }

    public function test_registration_validates_required_fields(): void
    {
        $response = $this->postJson('/api/v1/auth/register', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password', 'role']);
    }
}
```

```php
<?php
// tests/Feature/Auth/LoginTest.php

namespace Tests\Feature\Auth;

use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_user_can_login(): void
    {
        $user = User::factory()->create([
            'password_hash' => bcrypt('StrongP@ss123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'StrongP@ss123',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'data' => ['token', 'user'],
            ]);
    }

    public function test_unverified_user_gets_403(): void
    {
        $user = User::factory()->unverified()->create([
            'password_hash' => bcrypt('StrongP@ss123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'StrongP@ss123',
        ]);

        $response->assertStatus(403)
            ->assertJson(['code' => 'EMAIL_UNVERIFIED']);
    }

    public function test_banned_user_gets_403(): void
    {
        $user = User::factory()->banned()->create([
            'password_hash' => bcrypt('StrongP@ss123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'StrongP@ss123',
        ]);

        $response->assertStatus(403)
            ->assertJson(['code' => 'ACCOUNT_BANNED']);
    }

    public function test_wrong_password_gets_401(): void
    {
        $user = User::factory()->create([
            'password_hash' => bcrypt('correct'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong',
        ]);

        $response->assertStatus(401)
            ->assertJson(['code' => 'INVALID_CREDENTIALS']);
    }

    public function test_login_is_rate_limited(): void
    {
        $user = User::factory()->create();

        // Exceed the 5/minute limit
        for ($i = 0; $i < 6; $i++) {
            $response = $this->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'wrong',
            ]);
        }

        $response->assertStatus(429);
    }
}
```

#### 1c. Swipe Feature Tests (Day 3)

```php
<?php
// tests/Feature/Swipe/SwipeTest.php

namespace Tests\Feature\Swipe;

use App\Models\PostgreSQL\ApplicantProfile;
use App\Models\PostgreSQL\JobPosting;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SwipeTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private ApplicantProfile $profile;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->applicant()->create();
        $this->profile = ApplicantProfile::factory()->create([
            'user_id' => $this->user->id,
        ]);
    }

    public function test_applicant_can_swipe_right(): void
    {
        $job = JobPosting::factory()->create();

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/applicant/swipe/right/{$job->id}");

        $response->assertOk()
            ->assertJson(['message' => 'Application submitted successfully']);
    }

    public function test_duplicate_swipe_returns_409(): void
    {
        $job = JobPosting::factory()->create();

        $this->actingAs($this->user)
            ->postJson("/api/v1/applicant/swipe/right/{$job->id}");

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/applicant/swipe/right/{$job->id}");

        $response->assertStatus(409)
            ->assertJson(['code' => 'ALREADY_SWIPED']);
    }

    public function test_swipe_limit_returns_429(): void
    {
        $this->profile->update([
            'daily_swipes_used' => 15,
            'daily_swipe_limit' => 15,
            'extra_swipe_balance' => 0,
        ]);

        $job = JobPosting::factory()->create();

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/applicant/swipe/right/{$job->id}");

        $response->assertStatus(429)
            ->assertJson(['code' => 'SWIPE_LIMIT_REACHED']);
    }

    public function test_get_swipe_limits(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/applicant/swipe/limits');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'daily_swipes_used',
                    'daily_swipe_limit',
                    'extra_swipe_balance',
                    'has_swipes_remaining',
                ],
            ]);
    }

    public function test_hr_cannot_access_swipe_endpoints(): void
    {
        $hr = User::factory()->hr()->create();

        $response = $this->actingAs($hr)
            ->getJson('/api/v1/applicant/swipe/deck');

        $response->assertStatus(403);
    }
}
```

#### 1d. Match Lifecycle Feature Tests (Days 4-5)

```php
<?php
// tests/Feature/Match/MatchLifecycleTest.php

namespace Tests\Feature\Match;

use App\Models\PostgreSQL\ApplicantProfile;
use App\Models\PostgreSQL\Application;
use App\Models\PostgreSQL\MatchRecord;
use App\Models\PostgreSQL\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MatchLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $applicantUser;
    private User $hrUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->applicantUser = User::factory()->applicant()->create();
        ApplicantProfile::factory()->create(['user_id' => $this->applicantUser->id]);
        $this->hrUser = User::factory()->hr()->create();
    }

    public function test_applicant_can_accept_pending_match(): void
    {
        $match = MatchRecord::factory()->create([
            'applicant_id' => $this->applicantUser->applicantProfile->id,
            'hr_user_id' => $this->hrUser->id,
            'status' => 'pending',
            'response_deadline' => now()->addHours(23),
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/applicant/matches/{$match->id}/accept");

        $response->assertOk();
        $this->assertDatabaseHas('matches', [
            'id' => $match->id,
            'status' => 'accepted',
        ]);
    }

    public function test_cannot_accept_expired_match(): void
    {
        $match = MatchRecord::factory()->deadlinePassed()->create([
            'applicant_id' => $this->applicantUser->applicantProfile->id,
            'hr_user_id' => $this->hrUser->id,
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/applicant/matches/{$match->id}/accept");

        $response->assertStatus(409);
    }

    public function test_applicant_can_decline_pending_match(): void
    {
        $match = MatchRecord::factory()->create([
            'applicant_id' => $this->applicantUser->applicantProfile->id,
            'hr_user_id' => $this->hrUser->id,
            'response_deadline' => now()->addHours(23),
        ]);

        $response = $this->actingAs($this->applicantUser)
            ->postJson("/api/v1/applicant/matches/{$match->id}/decline");

        $response->assertOk();
        $this->assertDatabaseHas('matches', [
            'id' => $match->id,
            'status' => 'declined',
        ]);
    }

    public function test_hr_can_close_accepted_match(): void
    {
        $match = MatchRecord::factory()->accepted()->create([
            'applicant_id' => $this->applicantUser->applicantProfile->id,
            'hr_user_id' => $this->hrUser->id,
        ]);

        $response = $this->actingAs($this->hrUser)
            ->postJson("/api/v1/company/matches/{$match->id}/close");

        $response->assertOk();
        $this->assertDatabaseHas('matches', [
            'id' => $match->id,
            'status' => 'closed',
        ]);
    }

    public function test_cannot_close_pending_match(): void
    {
        $match = MatchRecord::factory()->create([
            'applicant_id' => $this->applicantUser->applicantProfile->id,
            'hr_user_id' => $this->hrUser->id,
        ]);

        $response = $this->actingAs($this->hrUser)
            ->postJson("/api/v1/company/matches/{$match->id}/close");

        $response->assertStatus(409);
    }

    public function test_other_user_cannot_access_match(): void
    {
        $otherUser = User::factory()->applicant()->create();
        $match = MatchRecord::factory()->create([
            'applicant_id' => $this->applicantUser->applicantProfile->id,
            'hr_user_id' => $this->hrUser->id,
        ]);

        $response = $this->actingAs($otherUser)
            ->postJson("/api/v1/applicant/matches/{$match->id}/accept");

        $response->assertStatus(403);
    }
}
```

---

### Phase 2: Core Business Logic (Week 2) 🟡

#### Job Posting Tests

```php
<?php
// tests/Feature/Job/JobPostingTest.php (key tests)

public function test_verified_company_can_create_job(): void
{
    $user = User::factory()->companyAdmin()->create();
    CompanyProfile::factory()->verified()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->postJson('/api/v1/company/jobs', [
        'title' => 'Senior Laravel Dev',
        'description' => str_repeat('a', 100),
        'work_type' => 'remote',
        'skills' => [['name' => 'PHP', 'type' => 'hard']],
    ]);

    $response->assertStatus(201);
}

public function test_unverified_company_cannot_create_job(): void
{
    $user = User::factory()->companyAdmin()->create();
    CompanyProfile::factory()->create(['user_id' => $user->id]); // unverified

    $response = $this->actingAs($user)->postJson('/api/v1/company/jobs', [
        'title' => 'Dev',
        'description' => str_repeat('a', 100),
        'work_type' => 'remote',
        'skills' => [['name' => 'PHP', 'type' => 'hard']],
    ]);

    $response->assertStatus(403)
        ->assertJson(['code' => 'VERIFICATION_REQUIRED']);
}

public function test_listing_cap_prevents_excess_jobs(): void
{
    $user = User::factory()->companyAdmin()->create();
    $company = CompanyProfile::factory()->verified()->create([
        'user_id' => $user->id,
        'listing_cap' => 2,
        'active_listings_count' => 2,
    ]);

    $response = $this->actingAs($user)->postJson('/api/v1/company/jobs', [
        'title' => 'Dev',
        'description' => str_repeat('a', 100),
        'work_type' => 'remote',
        'skills' => [['name' => 'PHP', 'type' => 'hard']],
    ]);

    $response->assertStatus(403)
        ->assertJson(['code' => 'LISTING_LIMIT_REACHED']);
}
```

#### Trust Score Unit Tests

```php
<?php
// tests/Unit/Services/TrustScoreServiceTest.php

public function test_email_domain_score_returns_full_weight_for_custom_domain(): void
{
    $company = new CompanyProfile;
    $company->is_free_email_domain = false;
    $company->company_domain = 'acme-corp.com';

    $score = $this->invokePrivateMethod($this->service, 'scoreEmailDomain', [$company]);

    $this->assertEquals(10, $score);
}

public function test_email_domain_score_returns_zero_for_free_domain(): void
{
    $company = new CompanyProfile;
    $company->is_free_email_domain = true;

    $score = $this->invokePrivateMethod($this->service, 'scoreEmailDomain', [$company]);

    $this->assertEquals(0, $score);
}

public function test_resolve_level_returns_trusted_above_76(): void
{
    $level = $this->invokePrivateMethod($this->service, 'resolveLevel', [80]);
    $this->assertEquals('trusted', $level);
}

public function test_listing_cap_includes_premium_bonus(): void
{
    $cap = $this->invokePrivateMethod(
        $this->service,
        'resolveListingCap',
        ['established', 'pro', 'active']
    );

    // established base (5) + pro bonus (8) = 13
    $this->assertEquals(13, $cap);
}
```

#### Stripe Webhook Feature Tests

```php
<?php
// tests/Feature/Webhook/StripeWebhookTest.php

public function test_webhook_rejects_invalid_signature(): void
{
    $response = $this->postJson('/api/v1/webhooks/stripe', [], [
        'Stripe-Signature' => 'invalid',
        'Content-Type' => 'application/json',
    ]);

    $response->assertStatus(400)
        ->assertJson(['code' => 'WEBHOOK_VERIFICATION_FAILED']);
}

public function test_webhook_rejects_when_secret_missing(): void
{
    config(['services.stripe.webhook_secret' => '']);
    config(['cashier.webhook.secret' => '']);

    $response = $this->postJson('/api/v1/webhooks/stripe');

    $response->assertStatus(500)
        ->assertJson(['code' => 'WEBHOOK_NOT_CONFIGURED']);
}
```

---

### Phase 3: Supporting Features (Week 3) 🟡

| Test File | Key Cases |
|---|---|
| `tests/Feature/Match/MatchMessageTest.php` | Send message, auto-accept on first message, duplicate client_message_id, typing indicator, mark read, non-participant blocked |
| `tests/Feature/Review/ReviewTest.php` | Submit review, duplicate blocked, must-have-applied check, tier-gated access, flag review |
| `tests/Feature/Profile/ApplicantProfileTest.php` | Basic info update, skills CRUD, experience CRUD, education CRUD, photo/resume upload |
| `tests/Feature/Profile/CompanyProfileTest.php` | Details update, logo, office images (max 10), verification submission |
| `tests/Feature/Notification/NotificationTest.php` | List, unread, mark read, preferences |
| `tests/Feature/IAP/IAPPurchaseTest.php` | Purchase with mocked validator, duplicate transaction, invalid product |

---

### Phase 4: Hardening (Week 4) 🟢

#### Integration Tests (Real PostgreSQL + Redis)

```php
<?php
// tests/Integration/SwipeAtomicityTest.php

namespace Tests\Integration;

use App\Models\PostgreSQL\ApplicantProfile;
use App\Models\PostgreSQL\JobPosting;
use App\Models\PostgreSQL\User;
use App\Services\SwipeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SwipeAtomicityTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Simulate concurrent swipes to verify lockForUpdate prevents double consumption.
     */
    public function test_concurrent_swipes_do_not_double_consume(): void
    {
        $user = User::factory()->applicant()->create();
        $profile = ApplicantProfile::factory()->create([
            'user_id' => $user->id,
            'daily_swipes_used' => 14,
            'daily_swipe_limit' => 15,
            'extra_swipe_balance' => 0,
        ]);

        $job1 = JobPosting::factory()->create();
        $job2 = JobPosting::factory()->create();

        $service = app(SwipeService::class);

        // Both swipes try to consume the last remaining swipe
        $result1 = $service->applicantSwipeRight($user->id, $job1->id);
        $result2 = $service->applicantSwipeRight($user->id, $job2->id);

        // One should succeed, one should hit the limit
        $statuses = [$result1['status'], $result2['status']];
        $this->assertContains('applied', $statuses);
        $this->assertContains('limit_reached', $statuses);

        // Verify only 1 swipe was consumed
        $profile->refresh();
        $this->assertEquals(15, $profile->daily_swipes_used);
    }
}
```

#### Scheduled Job Tests

```php
<?php
// tests/Feature/Jobs/ExpireMatchesJobTest.php

public function test_expire_matches_job_expires_past_deadline(): void
{
    $match = MatchRecord::factory()->create([
        'status' => 'pending',
        'response_deadline' => now()->subHours(1),
    ]);

    (new ExpireMatchesJob)->handle();

    $this->assertDatabaseHas('matches', [
        'id' => $match->id,
        'status' => 'expired',
    ]);
}

public function test_expire_matches_job_ignores_future_deadline(): void
{
    $match = MatchRecord::factory()->create([
        'status' => 'pending',
        'response_deadline' => now()->addHours(12),
    ]);

    (new ExpireMatchesJob)->handle();

    $this->assertDatabaseHas('matches', [
        'id' => $match->id,
        'status' => 'pending',
    ]);
}
```

---

## 6. CI Pipeline Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-and-feature:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: pdo_sqlite, mbstring, bcmath, zip
      - run: composer install --no-interaction --prefer-dist
        working-directory: backend
      - run: cp .env.example .env && php artisan key:generate
        working-directory: backend
      - run: php artisan test --testsuite=Unit,Feature
        working-directory: backend

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: jobapp_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: testing
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: --health-cmd "redis-cli ping"
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: pdo_pgsql, mbstring, bcmath, zip, redis
      - run: composer install --no-interaction --prefer-dist
        working-directory: backend
      - run: php artisan test --configuration=phpunit.integration.xml
        working-directory: backend
        env:
          DB_HOST: 127.0.0.1
          DB_PORT: 5432
          REDIS_HOST: 127.0.0.1
```

---

## 7. Coverage Targets

| Phase | Target | Metric |
|---|---|---|
| Phase 1 complete | **60%** line coverage | Auth, Swipe, Match — happy + error paths |
| Phase 2 complete | **75%** line coverage | + Jobs, Trust, Webhooks |
| Phase 3 complete | **85%** line coverage | + Reviews, Profiles, Notifications, IAP |
| Phase 4 complete | **90%+** line coverage | + Concurrency, Scheduled Jobs, Edge Cases |

```bash
# Generate coverage report
php artisan test --coverage --min=60
# or
XDEBUG_MODE=coverage ./vendor/bin/phpunit --coverage-html=coverage-report
```

---

## 8. Quick Reference — Test Commands

```bash
# Run all tests
php artisan test

# Run only unit tests
php artisan test --testsuite=Unit

# Run only feature tests
php artisan test --testsuite=Feature

# Run a specific test file
php artisan test --filter=MatchLifecycleTest

# Run a specific test method
php artisan test --filter=test_applicant_can_accept_pending_match

# Run with coverage
php artisan test --coverage

# Run in parallel (faster)
php artisan test --parallel

# Run integration tests (Docker services must be running)
php artisan test --configuration=phpunit.integration.xml
```

---

## 9. Summary Decision Matrix

| Question | Option A (PHPUnit) | Option B (Pest) | Option C (Hybrid) |
|---|---|---|---|
| Migration effort | **None** | ~2-3 days | Minimal |
| Test syntax | `$this->assert*` | `expect()->toBe()` | Mixed |
| Existing 128 tests | ✅ Unchanged | ❌ Must rewrite | ✅ Unchanged |
| Learning curve | None | Medium | Low |
| Laravel ecosystem fit | ✅ Native | ✅ Supported | ✅ Both |
| Architecture testing | Manual | Built-in `arch()` | Pest for arch only |
| **Recommendation** | ✅ **Best for you** | If starting fresh | If team loves Pest |
