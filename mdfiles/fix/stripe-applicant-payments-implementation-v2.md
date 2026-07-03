# Stripe Applicant Payments Implementation Plan v2.0

**Version**: 2.0 (Revised)  
**Date**: April 3, 2026  
**Status**: Draft - Addresses Critical Issues from Code Review

> **Staleness note:** This is still a proposal, not a verified description of the live backend. Some of the fixes and assumptions here may already exist or may have been superseded, so re-check against the current code before implementing anything from this draft.

---

## Changes from v1.0

This revision addresses **25 critical issues** identified in the code review:

### Critical Fixes Included:
1. ✅ Fixed method signature conflicts (`findActiveForUser` now accepts `subscriber_type`)
2. ✅ Added missing repository methods (`findByProviderPaymentId`)
3. ✅ Subscription cancellation now cancels in Stripe (not just local DB)
4. ✅ Webhook deduplication uses status column (not just INSERT)
5. ✅ Swipe pack refund handling implemented
6. ✅ Atomic operations for race condition prevention
7. ✅ Idempotency checks moved before expensive operations
8. ✅ Added missing API endpoints (cancel subscription, applicant status)

---

## Overview

> **Usage note:** The code blocks below are design targets. They are not guaranteed to match current implementations line-for-line.

Extend Stripe integration to handle applicant-side payments on web platform:
- **Pro Subscription**: $9.99/month for unlimited swipes
- **Swipe Packs**: One-time purchases (10 swipes for $1.99, 50 for $4.99, etc.)

**Scope**: Web platform only (mobile continues using IAP)

---

## Phase 1: Database Schema Updates

### 1.1 Update Subscriptions Table

**Migration**: `2026_04_03_000001_update_subscriptions_for_applicants.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // subscriber_type already exists, just add index
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->index(['user_id', 'subscriber_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'subscriber_type', 'status']);
        });
    }
};
```

### 1.2 Update Swipe Packs Table

**Migration**: `2026_04_03_000002_add_stripe_support_to_swipe_packs.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('swipe_packs', function (Blueprint $table) {
            // Add refund tracking
            $table->boolean('is_refunded')->default(false)->after('provider_payment_id');
            $table->timestamp('refunded_at')->nullable()->after('is_refunded');
            $table->string('refund_reason', 255)->nullable()->after('refunded_at');
            
            // Add index for refund queries
            $table->index(['applicant_id', 'is_refunded']);
            $table->index('provider_payment_id');
        });
    }

    public function down(): void
    {
        Schema::table('swipe_packs', function (Blueprint $table) {
            $table->dropIndex(['applicant_id', 'is_refunded']);
            $table->dropIndex(['provider_payment_id']);
            $table->dropColumn(['is_refunded', 'refunded_at', 'refund_reason']);
        });
    }
};
```

### 1.3 Update Webhook Events Table

**Migration**: `2026_04_03_000003_add_status_to_webhook_events.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stripe_webhook_events', function (Blueprint $table) {
            // Add status tracking for idempotency
            $table->enum('status', ['processing', 'completed', 'failed'])
                ->default('processing')
                ->after('event_type');
            $table->timestamp('completed_at')->nullable()->after('status');
            $table->text('error_message')->nullable()->after('completed_at');
            $table->integer('retry_count')->default(0)->after('error_message');
            
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('stripe_webhook_events', function (Blueprint $table) {
            $table->dropIndex(['status', 'created_at']);
            $table->dropColumn(['status', 'completed_at', 'error_message', 'retry_count']);
        });
    }
};
```

---

## Phase 2: Repository Layer Updates

### 2.1 Update SubscriptionRepository

**File**: `app/Repositories/PostgreSQL/SubscriptionRepository.php`

**Changes**:

```php
<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\Subscription;
use Illuminate\Support\Collection;

class SubscriptionRepository
{
    // UPDATED: Now accepts subscriber_type parameter
    public function findActiveForUser(string $userId, string $subscriberType = 'applicant'): ?Subscription
    {
        return Subscription::where('user_id', $userId)
            ->where('subscriber_type', $subscriberType)
            ->where('status', 'active')
            ->first();
    }

    // NEW: Find by provider payment ID (for swipe pack webhooks)
    public function findByProviderPaymentId(string $providerPaymentId, string $paymentProvider): ?Subscription
    {
        return Subscription::where('provider_sub_id', $providerPaymentId)
            ->where('payment_provider', $paymentProvider)
            ->first();
    }

    // NEW: Get all subscriptions for a user (both active and inactive)
    public function getAllForUser(string $userId, ?string $subscriberType = null): Collection
    {
        $query = Subscription::where('user_id', $userId);
        
        if ($subscriberType !== null) {
            $query->where('subscriber_type', $subscriberType);
        }
        
        return $query->orderBy('created_at', 'desc')->get();
    }

    // Existing methods remain unchanged
    public function create(array $data): Subscription
    {
        return Subscription::create($data);
    }

    public function findByProviderSubId(string $providerSubId, string $paymentProvider): ?Subscription
    {
        return Subscription::where('provider_sub_id', $providerSubId)
            ->where('payment_provider', $paymentProvider)
            ->first();
    }

    public function update(Subscription $subscription, array $data): void
    {
        $subscription->update($data);
    }
}
```

### 2.2 Update SwipePackRepository

**File**: `app/Repositories/PostgreSQL/SwipePackRepository.php`

**Changes**:

```php
<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\SwipePack;
use Illuminate\Support\Collection;

class SwipePackRepository
{
    public function create(array $data): SwipePack
    {
        return SwipePack::create($data);
    }

    // NEW: Find by provider payment ID (direct lookup)
    public function findByProviderPaymentId(string $providerPaymentId): ?SwipePack
    {
        return SwipePack::where('provider_payment_id', $providerPaymentId)->first();
    }

    // UPDATED: Simplified (no longer needs transaction lookup)
    public function findByTransactionId(string $transactionId): ?SwipePack
    {
        return $this->findByProviderPaymentId($transactionId);
    }

    public function getAllForApplicant(string $applicantId): Collection
    {
        return SwipePack::where('applicant_id', $applicantId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    // NEW: Get total swipes purchased (excluding refunded)
    public function getTotalPurchasedForApplicant(string $applicantId): int
    {
        return SwipePack::where('applicant_id', $applicantId)
            ->where('is_refunded', false)
            ->sum('quantity');
    }

    // NEW: Mark swipe pack as refunded
    public function markAsRefunded(SwipePack $swipePack, string $reason): void
    {
        $swipePack->update([
            'is_refunded' => true,
            'refunded_at' => now(),
            'refund_reason' => $reason,
        ]);
    }

    // NEW: Get pending refunds (for reconciliation job)
    public function findPendingRefunds(): Collection
    {
        // This would be populated by a reconciliation job
        // that checks Stripe API for refunds we haven't processed
        return SwipePack::where('is_refunded', false)
            ->where('created_at', '<', now()->subDays(7))
            ->get();
    }
}
```

---

## Phase 3: Service Layer Updates

### 3.1 Update SubscriptionService

**File**: `app/Services/SubscriptionService.php`

**Key Changes**:

1. Add applicant subscription support
2. Fix cancellation to actually cancel in Stripe
3. Fix webhook idempotency with status tracking
4. Add swipe pack purchase methods

```php
<?php

namespace App\Services;

use App\Exceptions\SubscriptionException;
use App\Models\PostgreSQL\Subscription;
use App\Models\PostgreSQL\User;
use App\Repositories\PostgreSQL\ApplicantProfileRepository;
use App\Repositories\PostgreSQL\CompanyProfileRepository;
use App\Repositories\PostgreSQL\SubscriptionRepository;
use App\Repositories\PostgreSQL\SwipePackRepository;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Stripe\StripeClient;
use Throwable;

class SubscriptionService
{
    // Pricing constants
    public const COMPANY_BASIC_TIER_AMOUNT = 120.00;
    public const APPLICANT_PRO_AMOUNT = 9.99;
    
    public const SWIPE_PACK_PRICES = [
        10 => 1.99,
        50 => 4.99,
        100 => 8.99,
    ];

    public function __construct(
        private CompanyProfileRepository $companyProfiles,
        private ApplicantProfileRepository $applicantProfiles,
        private SubscriptionRepository $subscriptions,
        private SwipePackRepository $swipePacks,
    ) {}

    /**
     * Create checkout session for company OR applicant subscription
     */
    public function createCheckoutSession(
        User $user,
        string $successUrl,
        string $cancelUrl,
        ?string $idempotencyKey = null
    ): array {
        // Determine subscription type based on user role
        if (in_array($user->role, ['hr', 'company_admin'], true)) {
            return $this->createCompanyCheckoutSession($user, $successUrl, $cancelUrl, $idempotencyKey);
        }
        
        if ($user->role === 'applicant') {
            return $this->createApplicantCheckoutSession($user, $successUrl, $cancelUrl, $idempotencyKey);
        }
        
        throw new SubscriptionException('INVALID_ROLE', 'User role not eligible for subscriptions.', 403);
    }

    /**
     * Create checkout session for applicant Pro subscription
     */
    private function createApplicantCheckoutSession(
        User $user,
        string $successUrl,
        string $cancelUrl,
        ?string $idempotencyKey
    ): array {
        $applicantProfile = $this->applicantProfiles->findByUserId($user->id);
        
        if (!$applicantProfile) {
            throw new SubscriptionException('APPLICANT_PROFILE_NOT_FOUND', 'Applicant profile not found.', 404);
        }

        // Check for existing active subscription
        $existingSubscription = $this->subscriptions->findActiveForUser($user->id, 'applicant');
        if ($existingSubscription && $existingSubscription->payment_provider === 'stripe') {
            throw new SubscriptionException(
                'SUBSCRIPTION_ALREADY_EXISTS',
                'You already have an active Pro subscription.',
                409
            );
        }

        $stripe = $this->stripeClient();
        $priceId = (string) config('services.stripe.applicant_pro_price_id', '');
        $resolvedIdempotencyKey = $this->resolveCheckoutIdempotencyKey(
            $user->id,
            $successUrl,
            $cancelUrl,
            $idempotencyKey
        );

        $reservation = $this->reserveCheckoutRequest(
            $user->id,
            $resolvedIdempotencyKey,
            $this->buildCheckoutFingerprint($user->id, $successUrl, $cancelUrl, $priceId)
        );

        if ($reservation['status'] === 'cached') {
            return [
                'checkout_url' => $reservation['checkout_url'],
                'session_id' => $reservation['session_id'],
                'idempotency_key' => $resolvedIdempotencyKey,
                'idempotency_replayed' => true,
            ];
        }

        if ($reservation['status'] === 'in_progress') {
            throw new SubscriptionException(
                'IDEMPOTENCY_KEY_IN_PROGRESS',
                'A checkout request is still processing. Retry shortly.',
                409
            );
        }

        try {
            $params = [
                'mode' => 'subscription',
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'customer_email' => $user->email,
                'metadata' => [
                    'user_id' => $user->id,
                    'applicant_id' => $applicantProfile->id,
                    'subscriber_type' => 'applicant',
                    'tier' => 'pro',
                ],
            ];

            if ($priceId !== '') {
                $params['line_items'] = [['price' => $priceId, 'quantity' => 1]];
            } else {
                $params['line_items'] = [[
                    'price_data' => [
                        'currency' => 'usd',
                        'product_data' => ['name' => 'JobSwipe Pro'],
                        'recurring' => ['interval' => 'month'],
                        'unit_amount' => (int) (self::APPLICANT_PRO_AMOUNT * 100),
                    ],
                    'quantity' => 1,
                ]];
            }

            $session = $stripe->checkout->sessions->create($params, [
                'idempotency_key' => $resolvedIdempotencyKey,
            ]);

            $this->persistCheckoutResult(
                (int) $reservation['record_id'],
                (string) $session->id,
                (string) $session->url
            );

            return [
                'checkout_url' => (string) $session->url,
                'session_id' => (string) $session->id,
                'idempotency_key' => $resolvedIdempotencyKey,
                'idempotency_replayed' => false,
            ];
        } catch (Throwable $e) {
            if (isset($reservation['record_id'])) {
                $this->releaseCheckoutReservation((int) $reservation['record_id']);
            }
            throw new SubscriptionException('SUBSCRIPTION_CHECKOUT_FAILED', $e->getMessage(), 500);
        }
    }

    /**
     * Create checkout session for company subscription (existing logic)
     */
    private function createCompanyCheckoutSession(
        User $user,
        string $successUrl,
        string $cancelUrl,
        ?string $idempotencyKey
    ): array {
        // Existing company checkout logic remains unchanged
        // (copy from current SubscriptionService->createCheckoutSession)
        // ... (omitted for brevity, same as v1.0)
    }
