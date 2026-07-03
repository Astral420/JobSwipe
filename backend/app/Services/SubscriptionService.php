<?php

namespace App\Services;

use App\Exceptions\SubscriptionException;
use App\Models\PostgreSQL\Subscription;
use App\Models\PostgreSQL\User;
use App\Repositories\PostgreSQL\CompanyProfileRepository;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Stripe\StripeClient;
use Throwable;

class SubscriptionService
{
    public const BASIC_TIER_AMOUNT = 120.00;

    private const CHECKOUT_IDEMPOTENCY_TTL_SECONDS = 86400;

    private const CHECKOUT_IDEMPOTENCY_PENDING_TIMEOUT_SECONDS = 30;

    protected TrustScoreService $trustScoreService;

    public function __construct(
        private CompanyProfileRepository $companyProfiles,
        TrustScoreService $trustScoreService
    ) {
        $this->trustScoreService = $trustScoreService;
    }

    public function createCheckoutSession(
        User $user,
        string $successUrl,
        string $cancelUrl,
        ?string $idempotencyKey = null
    ): array {
        if (! in_array($user->role, ['hr', 'company_admin'], true)) {
            throw new SubscriptionException('UNAUTHORIZED', 'Only company users can create subscriptions.', 403);
        }

        $companyProfile = $this->companyProfiles->findByUserId($user->id);

        if (! $companyProfile) {
            throw new SubscriptionException('COMPANY_PROFILE_NOT_FOUND', 'Company profile not found.', 404);
        }

        $reservation = null;

        try {
            $stripe = $this->stripeClient();
            $priceId = (string) config('services.stripe.basic_price_id', '');
            $resolvedIdempotencyKey = $this->resolveCheckoutIdempotencyKey($user->id, $successUrl, $cancelUrl, $idempotencyKey);
            $requestFingerprint = $this->buildCheckoutFingerprint($user->id, $successUrl, $cancelUrl, $priceId);

            $reservation = $this->reserveCheckoutRequest(
                $user->id,
                $resolvedIdempotencyKey,
                $requestFingerprint,
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
                    'A checkout request with this idempotency key is still processing. Retry shortly.',
                    409
                );
            }

            $params = [
                'mode' => 'subscription',
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'customer_email' => $user->email,
                'metadata' => [
                    'user_id' => $user->id,
                    'company_id' => $companyProfile->id,
                    'tier' => 'basic',
                ],
            ];

            if ($priceId !== '') {
                $params['line_items'] = [
                    [
                        'price' => $priceId,
                        'quantity' => 1,
                    ],
                ];
            } else {
                $params['line_items'] = [
                    [
                        'price_data' => [
                            'currency' => 'php',
                            'product_data' => [
                                'name' => 'JobSwipe Verified',
                            ],
                            'recurring' => [
                                'interval' => 'month',
                            ],
                            'unit_amount' => 12000,
                        ],
                        'quantity' => 1,
                    ],
                ];
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
        } catch (SubscriptionException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            if (is_array($reservation) && isset($reservation['record_id'])) {
                $this->releaseCheckoutReservation((int) $reservation['record_id']);
            }

            throw new SubscriptionException('SUBSCRIPTION_CHECKOUT_FAILED', $exception->getMessage(), 500);
        }
    }

    public function activateSubscription(User $user, ?string $providerSubscriptionId = null, string $stripeStatus = 'active'): void
    {
        $companyProfile = $this->companyProfiles->findByUserId($user->id);

        if (! $companyProfile) {
            throw new SubscriptionException('COMPANY_PROFILE_NOT_FOUND', 'Company profile not found.', 404);
        }

        $this->companyProfiles->update($companyProfile, [
            'subscription_tier' => 'basic',
            'subscription_status' => 'active',
        ]);

        $this->trustScoreService->recalculate($companyProfile->id);

        $subscription = Subscription::query()
            ->where('user_id', $user->id)
            ->where('payment_provider', 'stripe')
            ->latest('created_at')
            ->first();

        $payload = [
            'user_id' => $user->id,
            'subscriber_type' => 'company',
            'tier' => 'basic',
            'billing_cycle' => 'monthly',
            'amount_paid' => self::BASIC_TIER_AMOUNT,
            'currency' => 'PHP',
            'payment_provider' => 'stripe',
            'provider_sub_id' => $providerSubscriptionId,
            'status' => 'active',
            'stripe_status' => $stripeStatus,
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
        ];

        if ($subscription) {
            $subscription->update($payload);

            return;
        }

        Subscription::create($payload);
    }

    public function deactivateSubscription(User $user): void
    {
        $companyProfile = $this->companyProfiles->findByUserId($user->id);

        if (! $companyProfile) {
            throw new SubscriptionException('COMPANY_PROFILE_NOT_FOUND', 'Company profile not found.', 404);
        }

        $subscription = Subscription::query()
            ->where('user_id', $user->id)
            ->where('payment_provider', 'stripe')
            ->latest('created_at')
            ->first();

        if ($subscription && is_string($subscription->provider_sub_id) && $subscription->provider_sub_id !== '') {
            try {
                $stripe = $this->stripeClient();
                $remoteSubscription = $stripe->subscriptions->retrieve($subscription->provider_sub_id, []);
                $remoteStatus = (string) ($remoteSubscription->status ?? '');

                if (! in_array($remoteStatus, ['canceled', 'incomplete_expired'], true)) {
                    $stripe->subscriptions->cancel($subscription->provider_sub_id, []);
                }
            } catch (Throwable $exception) {
                throw new SubscriptionException(
                    'STRIPE_CANCELLATION_FAILED',
                    'Failed to cancel subscription with Stripe: '.$exception->getMessage(),
                    502
                );
            }
        }

        DB::transaction(function () use ($companyProfile, $user): void {
            $this->companyProfiles->update($companyProfile, [
                'subscription_tier' => 'free',
                'subscription_status' => 'cancelled',
            ]);

            Subscription::query()
                ->where('user_id', $user->id)
                ->where('payment_provider', 'stripe')
                ->latest('created_at')
                ->limit(1)
                ->update([
                    'status' => 'cancelled',
                    'stripe_status' => 'canceled',
                ]);
        });

        $this->trustScoreService->recalculate($companyProfile->id);
    }

    public function handleSubscriptionUpdated(array $event): void
    {
        $eventId = (string) ($event['id'] ?? '');
        $eventType = (string) ($event['type'] ?? '');
        $object = $event['data']['object'] ?? [];

        if ($eventId === '' || ! is_array($object)) {
            return;
        }

        $eventRecordId = $this->reserveWebhookEvent($eventId, $eventType, $event);

        if ($eventRecordId === null) {
            return;
        }

        try {
            if ($eventType === 'checkout.session.completed') {
                $metadata = $object['metadata'] ?? [];
                $userId = is_array($metadata) ? ($metadata['user_id'] ?? null) : null;
                $providerSubscriptionId = $object['subscription'] ?? null;

                if (is_string($userId) && $userId !== '') {
                    $user = User::find($userId);
                    if ($user) {
                        $this->activateSubscription(
                            $user,
                            is_string($providerSubscriptionId) ? $providerSubscriptionId : null,
                            'active'
                        );
                    }
                }

                $this->markWebhookEventCompleted($eventRecordId);

                return;
            }

            if (! in_array($eventType, ['customer.subscription.updated', 'customer.subscription.deleted'], true)) {
                $this->markWebhookEventCompleted($eventRecordId);

                return;
            }

            $providerSubscriptionId = $object['id'] ?? null;

            if (! is_string($providerSubscriptionId) || $providerSubscriptionId === '') {
                $this->markWebhookEventCompleted($eventRecordId);

                return;
            }

            $status = $this->mapStripeStatus((string) ($object['status'] ?? 'inactive'));
            $stripeStatus = (string) ($object['status'] ?? 'inactive');

            $subscription = Subscription::query()
                ->where('provider_sub_id', $providerSubscriptionId)
                ->latest('created_at')
                ->first();

            if (! $subscription) {
                $this->markWebhookEventCompleted($eventRecordId);

                return;
            }

            $currentPeriodEnd = null;
            if (isset($object['current_period_end']) && is_int($object['current_period_end'])) {
                $currentPeriodEnd = Carbon::createFromTimestampUTC($object['current_period_end']);
            }

            $subscription->update(array_filter([
                'status' => $status,
                'stripe_status' => $stripeStatus,
                'current_period_end' => $currentPeriodEnd,
            ], static fn ($value) => $value !== null));

            $companyProfile = $this->companyProfiles->findByUserId((string) $subscription->user_id);

            if ($companyProfile) {
                $companySubscriptionStatus = match ($status) {
                    'active' => 'active',
                    'cancelled' => 'cancelled',
                    default => 'inactive',
                };

                $this->companyProfiles->update($companyProfile, [
                    'subscription_status' => $companySubscriptionStatus,
                    'subscription_tier' => $companySubscriptionStatus === 'active' ? 'basic' : 'free',
                ]);

                $this->trustScoreService->recalculate($companyProfile->id);
            }

            $this->markWebhookEventCompleted($eventRecordId);
        } catch (Throwable $exception) {
            $this->markWebhookEventFailed($eventRecordId, $exception->getMessage());

            throw $exception;
        }
    }

    public function canPostJobs(User $user): bool
    {
        $companyProfile = $this->companyProfiles->findByUserId($user->id);

        return $companyProfile !== null && $companyProfile->canPostJobs();
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
            'can_post_jobs' => $companyProfile->canPostJobs(),
            'verification_status' => $companyProfile->verification_status,
            'listing_cap' => $companyProfile->listing_cap,
            'active_listings_count' => $companyProfile->active_listings_count,
        ];
    }

    private function stripeClient(): StripeClient
    {
        $secret = (string) (config('services.stripe.secret') ?: config('cashier.secret', ''));

        if ($secret === '') {
            throw new SubscriptionException('STRIPE_NOT_CONFIGURED', 'Stripe secret key is missing.', 500);
        }

        return new StripeClient($secret);
    }

    private function mapStripeStatus(string $stripeStatus): string
    {
        return match ($stripeStatus) {
            'active', 'trialing' => 'active',
            'past_due', 'incomplete', 'incomplete_expired', 'unpaid' => 'past_due',
            'canceled' => 'cancelled',
            default => 'expired',
        };
    }

    private function resolveCheckoutIdempotencyKey(
        string $userId,
        string $successUrl,
        string $cancelUrl,
        ?string $idempotencyKey
    ): string {
        $providedKey = trim((string) $idempotencyKey);

        if ($providedKey !== '') {
            return Str::limit($providedKey, 255, '');
        }

        $window = (string) floor(now()->timestamp / 600);

        return hash('sha256', implode('|', [
            $userId,
            'basic',
            hash('sha256', $successUrl),
            hash('sha256', $cancelUrl),
            $window,
        ]));
    }

    private function buildCheckoutFingerprint(
        string $userId,
        string $successUrl,
        string $cancelUrl,
        string $priceId
    ): string {
        return hash('sha256', implode('|', [
            $userId,
            $successUrl,
            $cancelUrl,
            $priceId,
            'basic',
            'monthly',
        ]));
    }

    private function reserveCheckoutRequest(
        string $userId,
        string $idempotencyKey,
        string $requestFingerprint
    ): array {
        $expiresAt = now()->addSeconds($this->checkoutIdempotencyTtlSeconds());

        return DB::transaction(function () use ($userId, $idempotencyKey, $requestFingerprint, $expiresAt) {
            DB::table('stripe_checkout_idempotency_keys')->insertOrIgnore([
                'user_id' => $userId,
                'idempotency_key' => $idempotencyKey,
                'request_fingerprint' => $requestFingerprint,
                'expires_at' => $expiresAt,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $record = DB::table('stripe_checkout_idempotency_keys')
                ->where('idempotency_key', $idempotencyKey)
                ->lockForUpdate()
                ->first();

            if (! $record) {
                throw new SubscriptionException(
                    'IDEMPOTENCY_RESERVATION_FAILED',
                    'Unable to reserve checkout idempotency key.',
                    500
                );
            }

            if ($record->expires_at !== null && Carbon::parse((string) $record->expires_at)->isPast()) {
                DB::table('stripe_checkout_idempotency_keys')
                    ->where('id', $record->id)
                    ->update([
                        'user_id' => $userId,
                        'request_fingerprint' => $requestFingerprint,
                        'session_id' => null,
                        'checkout_url' => null,
                        'expires_at' => $expiresAt,
                        'updated_at' => now(),
                    ]);

                return [
                    'status' => 'reserved',
                    'record_id' => (int) $record->id,
                ];
            }

            if ((string) $record->user_id !== $userId || (string) $record->request_fingerprint !== $requestFingerprint) {
                throw new SubscriptionException(
                    'IDEMPOTENCY_KEY_REUSED',
                    'Idempotency key already used with a different request payload.',
                    409
                );
            }

            if ($record->session_id !== null && $record->checkout_url !== null) {
                return [
                    'status' => 'cached',
                    'record_id' => (int) $record->id,
                    'session_id' => (string) $record->session_id,
                    'checkout_url' => (string) $record->checkout_url,
                ];
            }

            if ($record->updated_at !== null && Carbon::parse((string) $record->updated_at)->gt(now()->subSeconds(self::CHECKOUT_IDEMPOTENCY_PENDING_TIMEOUT_SECONDS))) {
                return [
                    'status' => 'in_progress',
                    'record_id' => (int) $record->id,
                ];
            }

            DB::table('stripe_checkout_idempotency_keys')
                ->where('id', $record->id)
                ->update([
                    'expires_at' => $expiresAt,
                    'updated_at' => now(),
                ]);

            return [
                'status' => 'reserved',
                'record_id' => (int) $record->id,
            ];
        }, 3);
    }

    private function persistCheckoutResult(int $recordId, string $sessionId, string $checkoutUrl): void
    {
        DB::table('stripe_checkout_idempotency_keys')
            ->where('id', $recordId)
            ->update([
                'session_id' => $sessionId,
                'checkout_url' => $checkoutUrl,
                'expires_at' => now()->addSeconds($this->checkoutIdempotencyTtlSeconds()),
                'updated_at' => now(),
            ]);
    }

    private function releaseCheckoutReservation(int $recordId): void
    {
        DB::table('stripe_checkout_idempotency_keys')
            ->where('id', $recordId)
            ->whereNull('session_id')
            ->delete();
    }

    private function checkoutIdempotencyTtlSeconds(): int
    {
        return max((int) config('services.stripe.checkout_idempotency_ttl_seconds', self::CHECKOUT_IDEMPOTENCY_TTL_SECONDS), 300);
    }

    private function reserveWebhookEvent(string $eventId, string $eventType, array $payload): ?int
    {
        $staleProcessingCutoff = now()->subMinutes(
            max((int) config('services.stripe.webhook_processing_timeout_minutes', 5), 1)
        );

        return DB::transaction(function () use ($eventId, $eventType, $payload, $staleProcessingCutoff): ?int {
            DB::table('stripe_webhook_events')->insertOrIgnore([
                'stripe_event_id' => $eventId,
                'event_type' => $eventType,
                'payload' => json_encode($payload),
                'status' => 'pending',
                'attempts' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $record = DB::table('stripe_webhook_events')
                ->where('stripe_event_id', $eventId)
                ->lockForUpdate()
                ->first();

            if (! $record) {
                throw new SubscriptionException(
                    'WEBHOOK_RESERVATION_FAILED',
                    'Unable to reserve Stripe webhook event.',
                    500
                );
            }

            if ((string) $record->status === 'completed') {
                return null;
            }

            $isFreshlyProcessing = (string) $record->status === 'processing'
                && $record->processing_started_at !== null
                && Carbon::parse((string) $record->processing_started_at)->gt($staleProcessingCutoff);

            if ($isFreshlyProcessing) {
                return null;
            }

            DB::table('stripe_webhook_events')
                ->where('id', $record->id)
                ->update([
                    'event_type' => $eventType,
                    'payload' => json_encode($payload),
                    'status' => 'processing',
                    'attempts' => DB::raw('attempts + 1'),
                    'processing_started_at' => now(),
                    'completed_at' => null,
                    'failed_at' => null,
                    'last_error' => null,
                    'updated_at' => now(),
                ]);

            return (int) $record->id;
        }, 3);
    }

    private function markWebhookEventCompleted(int $eventRecordId): void
    {
        DB::table('stripe_webhook_events')
            ->where('id', $eventRecordId)
            ->update([
                'status' => 'completed',
                'completed_at' => now(),
                'processing_started_at' => null,
                'last_error' => null,
                'updated_at' => now(),
            ]);
    }

    private function markWebhookEventFailed(int $eventRecordId, string $errorMessage): void
    {
        DB::table('stripe_webhook_events')
            ->where('id', $eventRecordId)
            ->update([
                'status' => 'failed',
                'failed_at' => now(),
                'processing_started_at' => null,
                'last_error' => Str::limit($errorMessage, 1000, ''),
                'updated_at' => now(),
            ]);

        Log::warning('Stripe webhook marked as failed', [
            'stripe_webhook_event_id' => $eventRecordId,
            'error' => Str::limit($errorMessage, 250),
        ]);
    }
}
