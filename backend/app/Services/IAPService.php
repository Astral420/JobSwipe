<?php

namespace App\Services;

use App\Exceptions\IAPException;
use App\Models\PostgreSQL\User;
use App\Repositories\PostgreSQL\ApplicantProfileRepository;
use App\Repositories\PostgreSQL\IAPIdempotencyRepository;
use App\Repositories\PostgreSQL\IAPReceiptRepository;
use App\Repositories\PostgreSQL\IAPTransactionRepository;
use App\Repositories\PostgreSQL\SubscriptionRepository;
use App\Repositories\PostgreSQL\SwipePackRepository;
use App\Repositories\PostgreSQL\WebhookEventRepository;
use App\Services\IAP\AppleReceiptValidator;
use App\Services\IAP\ApplicantSubscriptionManager;
use App\Services\IAP\GooglePlaySubscriptionStateResolverService;
use App\Services\IAP\GoogleReceiptValidator;
use App\Services\IAP\SwipePackManager;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class IAPService
{
    public function __construct(
        private AppleReceiptValidator $appleValidator,
        private GoogleReceiptValidator $googleValidator,
        private ApplicantSubscriptionManager $subscriptionManager,
        private SwipePackManager $swipePackManager,
        private IAPTransactionRepository $transactions,
        private IAPReceiptRepository $receipts,
        private IAPIdempotencyRepository $idempotency,
        private WebhookEventRepository $webhookEvents,
        private SubscriptionRepository $subscriptions,
        private ApplicantProfileRepository $applicantProfiles,
        private SwipePackRepository $swipePacks,
        private GooglePlaySubscriptionStateResolverService $googleSubscriptionStateResolver,
    ) {}

    /**
     * Process purchase from mobile app
     *
     * @param  User  $user  Authenticated user
     * @param  string  $paymentProvider  'apple_iap' or 'google_play'
     * @param  string  $productId  Product identifier
     * @param  array  $receiptData  Receipt data from mobile app
     * @param  string|null  $idempotencyKey  Optional idempotency key
     * @return array Purchase result with subscription status or swipe balance
     *
     * @throws IAPException
     */
    public function processPurchase(
        User $user,
        string $paymentProvider,
        string $productId,
        array $receiptData,
        ?string $idempotencyKey = null
    ): array {
        // Log purchase initiation
        Log::info('IAP purchase initiated', [
            'user_id' => $user->id,
            'product_id' => $productId,
            'payment_provider' => $paymentProvider,
        ]);

        // Generate idempotency key if not provided
        if (! $idempotencyKey) {
            $idempotencyKey = $this->generateIdempotencyKey($user->id, $productId, $receiptData);
        }

        // Create request fingerprint for idempotency check
        $requestFingerprint = hash('sha256', json_encode([
            'user_id' => $user->id,
            'product_id' => $productId,
            'payment_provider' => $paymentProvider,
        ]));

        // Check idempotency
        $idempotencyResult = $this->idempotency->reserve(
            $user->id,
            $idempotencyKey,
            $requestFingerprint,
            config('iap.idempotency_ttl_seconds', 86400)
        );

        // Return cached result if exists
        if ($idempotencyResult['status'] === 'cached') {
            Log::info('IAP purchase returned from cache', [
                'user_id' => $user->id,
                'idempotency_key' => $idempotencyKey,
            ]);

            return $idempotencyResult['result'];
        }

        // Handle in-progress request
        if ($idempotencyResult['status'] === 'in_progress') {
            throw new IAPException(
                'IDEMPOTENCY_KEY_IN_PROGRESS',
                'Request is still being processed, please retry shortly',
                409
            );
        }

        try {
            // Validate product exists in catalog
            $productConfig = $this->validateProduct($productId);

            // Verify receipt with appropriate validator
            $verificationResult = $this->verifyReceipt($paymentProvider, $productId, $receiptData);

            $transactionId = $verificationResult['transaction_id'];
            $purchaseDate = Carbon::createFromTimestamp($verificationResult['purchase_date']);
            $providerSubId = $verificationResult['provider_sub_id'] ?? $transactionId;

            // Check transaction deduplication
            if ($this->transactions->exists($transactionId, $paymentProvider)) {
                throw new IAPException(
                    'DUPLICATE_TRANSACTION',
                    'This transaction has already been processed',
                    409
                );
            }

            // Store receipt data for audit
            $this->receipts->store(
                $transactionId,
                $paymentProvider,
                $user->id,
                $productId,
                $receiptData,
                $verificationResult
            );

            Log::info('IAP receipt verified', [
                'transaction_id' => $transactionId,
                'product_id' => $productId,
                'payment_provider' => $paymentProvider,
                'user_id' => $user->id,
            ]);

            // Process based on product type
            $result = $this->processVerifiedPurchase(
                $user,
                $productConfig,
                $paymentProvider,
                $transactionId,
                $purchaseDate,
                $providerSubId
            );

            // Store transaction ID for deduplication
            $this->transactions->store(
                $transactionId,
                $paymentProvider,
                $user->id,
                $productId
            );

            // Persist idempotency result
            $this->idempotency->persistResult($idempotencyResult['record_id'], $result);

            return $result;

        } catch (IAPException $e) {
            // Release idempotency reservation on failure
            $this->idempotency->release($idempotencyResult['record_id']);

            Log::warning('IAP purchase failed', [
                'user_id' => $user->id,
                'product_id' => $productId,
                'payment_provider' => $paymentProvider,
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Get applicant subscription status
     */
    public function getApplicantSubscriptionStatus(User $user): array
    {
        $applicantProfile = $this->applicantProfiles->findByUserId($user->id);

        if (! $applicantProfile) {
            return [
                'subscription_tier' => 'free',
                'subscription_status' => 'inactive',
                'current_period_end' => null,
                'daily_swipe_limit' => config('iap.free_tier_daily_limit', 20),
                'extra_swipe_balance' => 0,
            ];
        }

        // Get active subscription if exists
        $activeSubscription = $this->subscriptions->findActiveForUser($user->id);

        return [
            'subscription_tier' => $applicantProfile->subscription_tier ?? 'free',
            'subscription_status' => $applicantProfile->subscription_status ?? 'inactive',
            'current_period_end' => $activeSubscription?->current_period_end?->toIso8601String(),
            'daily_swipe_limit' => $applicantProfile->daily_swipe_limit ?? config('iap.free_tier_daily_limit', 20),
            'extra_swipe_balance' => $applicantProfile->extra_swipe_balance ?? 0,
        ];
    }

    /**
     * Get purchase history for user
     */
    public function getPurchaseHistory(User $user): array
    {
        $applicantProfile = $this->applicantProfiles->findByUserId($user->id);

        if (! $applicantProfile) {
            return [
                'subscriptions' => [],
                'swipe_packs' => [],
            ];
        }

        $subscriptions = $this->subscriptions->getAllForUser($user->id);
        $swipePacks = $this->swipePacks->getAllForApplicant($applicantProfile->id);

        return [
            'subscriptions' => $subscriptions->map(fn ($sub) => [
                'id' => $sub->id,
                'tier' => $sub->tier,
                'amount_paid' => $sub->amount_paid,
                'currency' => $sub->currency,
                'payment_provider' => $sub->payment_provider,
                'status' => $sub->status,
                'current_period_start' => $sub->current_period_start?->toIso8601String(),
                'current_period_end' => $sub->current_period_end?->toIso8601String(),
                'created_at' => $sub->created_at?->toIso8601String(),
            ])->toArray(),
            'swipe_packs' => $swipePacks->map(fn ($pack) => [
                'id' => $pack->id,
                'quantity' => $pack->quantity,
                'amount_paid' => $pack->amount_paid,
                'currency' => $pack->currency,
                'payment_provider' => $pack->payment_provider,
                'created_at' => $pack->created_at?->toIso8601String(),
            ])->toArray(),
        ];
    }

    /**
     * Cancel applicant subscription
     */
    public function cancelApplicantSubscription(User $user): void
    {
        $activeSubscription = $this->subscriptions->findActiveForUser($user->id);

        if (! $activeSubscription) {
            throw new IAPException(
                'NO_ACTIVE_SUBSCRIPTION',
                'No active subscription found for this user',
                404
            );
        }

        $this->subscriptionManager->cancel($activeSubscription);

        Log::info('Applicant subscription cancelled via API', [
            'user_id' => $user->id,
            'subscription_id' => $activeSubscription->id,
        ]);
    }

    /**
     * Process Apple webhook notification
     */
    public function processAppleWebhook(array $notification): void
    {
        $eventId = trim((string) ($notification['event_id'] ?? $notification['notification_uuid'] ?? ''));
        if ($eventId === '') {
            Log::warning('Apple webhook missing event identifier');

            return;
        }

        $eventType = trim((string) ($notification['event_type'] ?? $notification['notification_type'] ?? 'unknown'));
        $providerSubId = trim((string) ($notification['provider_sub_id']
            ?? data_get($notification, 'data.original_transaction_id', '')));
        $transactionId = trim((string) ($notification['transaction_id']
            ?? data_get($notification, 'data.transaction_id', '')));
        $eventTime = $this->coerceEventTimestamp($notification['event_time'] ?? null);

        if (! $this->webhookEvents->reserve($eventId, 'apple_iap', $eventType)) {
            Log::info('Apple webhook already processed', ['event_id' => $eventId]);

            return;
        }

        Log::info('Apple webhook received', [
            'event_id' => $eventId,
            'event_type' => $eventType,
        ]);

        if ($providerSubId === '') {
            Log::warning('Apple webhook missing provider subscription ID', ['event_id' => $eventId]);

            return;
        }

        try {
            match ($eventType) {
                'DID_RENEW' => $this->subscriptionManager->renew(
                    $providerSubId,
                    'apple_iap',
                    Carbon::createFromTimestamp($eventTime)
                ),
                'DID_FAIL_TO_RENEW' => $this->subscriptionManager->markPastDue($providerSubId, 'apple_iap'),
                'EXPIRED' => $this->handleAppleExpiration($providerSubId),
                'REFUND', 'REVOKE' => $this->handleAppleRefund(['transaction_id' => $transactionId]),
                default => Log::info('Apple webhook type not handled', ['type' => $eventType]),
            };

            Log::info('Apple webhook processed successfully', [
                'event_id' => $eventId,
                'event_type' => $eventType,
            ]);
        } catch (\Exception $e) {
            Log::error('Apple webhook processing failed', [
                'event_id' => $eventId,
                'event_type' => $eventType,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Process Google Play webhook notification
     */
    public function processGoogleWebhook(array $notification): void
    {
        $normalized = $this->normalizeGoogleWebhookNotification($notification);
        $eventId = trim((string) ($normalized['event_id'] ?? ''));

        if ($eventId === '') {
            Log::warning('Google webhook missing event identifier');

            return;
        }

        $notificationType = $normalized['notification_type'] ?? null;
        $purchaseToken = trim((string) ($normalized['purchase_token'] ?? ''));

        if (! $this->webhookEvents->reserve($eventId, 'google_play', (string) $notificationType)) {
            Log::info('Google webhook already processed', ['event_id' => $eventId]);

            return;
        }

        Log::info('Google webhook received', [
            'event_id' => $eventId,
            'event_type' => $notificationType,
        ]);

        if ($purchaseToken === '') {
            Log::warning('Google webhook missing purchaseToken', ['event_id' => $eventId]);

            return;
        }

        try {
            $canonical = $this->googleSubscriptionStateResolver->resolve($purchaseToken);
            $resolvedAction = $this->resolveGoogleWebhookAction(
                is_int($notificationType) ? $notificationType : null,
                (string) ($canonical['canonical_action'] ?? 'unknown')
            );

            match ($resolvedAction) {
                'renew' => $this->subscriptionManager->renew(
                    $purchaseToken,
                    'google_play',
                    Carbon::createFromTimestamp($this->coerceEventTimestamp($normalized['event_time'] ?? null))
                ),
                'cancel' => $this->handleGoogleCancellation($purchaseToken),
                'expire' => $this->handleGoogleExpiration($purchaseToken),
                'past_due' => $this->subscriptionManager->markPastDue($purchaseToken, 'google_play'),
                'refund' => $this->handleGoogleRefund($purchaseToken),
                default => Log::info('Google webhook type not handled', [
                    'event_id' => $eventId,
                    'notification_type' => $notificationType,
                    'canonical_state' => $canonical['canonical_state'] ?? null,
                    'canonical_action' => $canonical['canonical_action'] ?? null,
                ]),
            };

            Log::info('Google webhook processed successfully', [
                'event_id' => $eventId,
                'event_type' => $notificationType,
                'resolved_action' => $resolvedAction,
                'canonical_state' => $canonical['canonical_state'] ?? null,
            ]);
        } catch (\Exception $e) {
            Log::error('Google webhook processing failed', [
                'event_id' => $eventId,
                'event_type' => $notificationType,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $notification
     * @return array<string, mixed>
     */
    private function normalizeGoogleWebhookNotification(array $notification): array
    {
        if (isset($notification['event_id'])) {
            return $notification;
        }

        $eventId = trim((string) data_get($notification, 'message.messageId', ''));
        $notificationType = null;
        $purchaseToken = '';
        $eventTime = now()->timestamp;

        $encodedData = data_get($notification, 'message.data');
        if (is_string($encodedData) && trim($encodedData) !== '') {
            $decodedRaw = base64_decode($encodedData, true);
            $decodedData = is_string($decodedRaw) ? json_decode($decodedRaw, true) : null;

            if (is_array($decodedData)) {
                $notificationType = $this->coerceNullableInt(
                    data_get($decodedData, 'subscriptionNotification.notificationType')
                );
                $purchaseToken = trim((string) data_get($decodedData, 'subscriptionNotification.purchaseToken', ''));
                $eventTime = $this->coerceEventTimestamp($decodedData['eventTimeMillis'] ?? null);
            }
        }

        return [
            'event_id' => $eventId,
            'notification_type' => $notificationType,
            'purchase_token' => $purchaseToken,
            'event_time' => $eventTime,
            'raw' => $notification,
        ];
    }

    private function resolveGoogleWebhookAction(?int $notificationType, string $canonicalAction): string
    {
        if ($notificationType === 12) {
            return 'refund';
        }

        if ($canonicalAction === 'expired') {
            return 'expire';
        }

        if ($canonicalAction === 'cancelled') {
            return 'cancel';
        }

        if ($canonicalAction === 'past_due') {
            return 'past_due';
        }

        return match ($notificationType) {
            2 => $canonicalAction === 'active' ? 'renew' : 'ignore',
            3 => in_array($canonicalAction, ['active', 'cancelled'], true) ? 'cancel' : 'ignore',
            13 => $canonicalAction !== 'active' ? 'expire' : 'ignore',
            default => 'ignore',
        };
    }

    private function coerceEventTimestamp(mixed $value): int
    {
        if (is_int($value)) {
            if ($value > 1000000000000) {
                return (int) floor($value / 1000);
            }

            return $value;
        }

        if (is_string($value) && is_numeric($value)) {
            $numeric = (int) $value;

            if ($numeric > 1000000000000) {
                return (int) floor($numeric / 1000);
            }

            return $numeric;
        }

        return now()->timestamp;
    }

    private function coerceNullableInt(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value;
        }

        if (is_string($value) && is_numeric($value)) {
            return (int) $value;
        }

        return null;
    }

    /**
     * Validate product exists in catalog
     */
    private function validateProduct(string $productId): array
    {
        $products = config('iap.products', []);

        if (! isset($products[$productId])) {
            throw new IAPException(
                'INVALID_PRODUCT_ID',
                "Product ID '{$productId}' not found in catalog",
                400
            );
        }

        return $products[$productId];
    }

    /**
     * Verify receipt with appropriate validator
     */
    private function verifyReceipt(string $paymentProvider, string $productId, array $receiptData): array
    {
        return match ($paymentProvider) {
            'apple_iap' => $this->appleValidator->verify($receiptData['receipt_data'] ?? ''),
            'google_play' => $this->googleValidator->verify(
                $receiptData['purchase_token'] ?? '',
                $productId
            ),
            default => throw new IAPException(
                'INVALID_PAYMENT_PROVIDER',
                "Payment provider '{$paymentProvider}' is not supported",
                400
            ),
        };
    }

    /**
     * Process verified purchase based on product type
     */
    private function processVerifiedPurchase(
        User $user,
        array $productConfig,
        string $paymentProvider,
        string $transactionId,
        Carbon $purchaseDate,
        string $providerSubId
    ): array {
        $productType = $productConfig['type'];

        if ($productType === 'subscription') {
            return $this->processSubscriptionPurchase(
                $user,
                $productConfig,
                $paymentProvider,
                $transactionId,
                $purchaseDate,
                $providerSubId
            );
        }

        if ($productType === 'swipe_pack') {
            return $this->processSwipePackPurchase(
                $user,
                $productConfig,
                $paymentProvider,
                $transactionId
            );
        }

        throw new IAPException(
            'INVALID_PRODUCT_TYPE',
            "Product type '{$productType}' is not supported",
            400
        );
    }

    /**
     * Process subscription purchase
     */
    private function processSubscriptionPurchase(
        User $user,
        array $productConfig,
        string $paymentProvider,
        string $transactionId,
        Carbon $purchaseDate,
        string $providerSubId
    ): array {
        $tier = $productConfig['tier'];
        $amountPaid = $productConfig['price'];

        $subscription = $this->subscriptionManager->activate(
            $user->id,
            $tier,
            $paymentProvider,
            $providerSubId,
            $transactionId,
            $amountPaid,
            $purchaseDate
        );

        return [
            'success' => true,
            'type' => 'subscription',
            'subscription' => [
                'id' => $subscription->id,
                'tier' => $subscription->tier,
                'status' => $subscription->status,
                'current_period_end' => $subscription->current_period_end?->toIso8601String(),
            ],
            'subscription_status' => $this->getApplicantSubscriptionStatus($user),
        ];
    }

    /**
     * Process swipe pack purchase
     */
    private function processSwipePackPurchase(
        User $user,
        array $productConfig,
        string $paymentProvider,
        string $transactionId
    ): array {
        $applicantProfile = $this->applicantProfiles->findByUserId($user->id);

        if (! $applicantProfile) {
            throw new IAPException(
                'APPLICANT_PROFILE_NOT_FOUND',
                'Applicant profile not found for this user',
                404
            );
        }

        $quantity = $productConfig['quantity'];
        $amountPaid = $productConfig['price'];
        $currency = $productConfig['currency'] ?? 'PHP';

        $swipePack = $this->swipePackManager->purchase(
            $applicantProfile,
            $quantity,
            $paymentProvider,
            $transactionId,
            $amountPaid,
            $currency
        );

        // Refresh applicant profile to get updated balance
        $applicantProfile = $this->applicantProfiles->findByUserId($user->id);

        return [
            'success' => true,
            'type' => 'swipe_pack',
            'swipe_pack' => [
                'id' => $swipePack->id,
                'quantity' => $swipePack->quantity,
                'amount_paid' => $swipePack->amount_paid,
            ],
            'extra_swipe_balance' => $applicantProfile->extra_swipe_balance ?? 0,
        ];
    }

    /**
     * Generate idempotency key from transaction data
     */
    private function generateIdempotencyKey(string $userId, string $productId, array $receiptData): string
    {
        return hash('sha256', json_encode([
            'user_id' => $userId,
            'product_id' => $productId,
            'receipt_hash' => hash('sha256', json_encode($receiptData)),
        ]));
    }

    /**
     * Handle Apple subscription expiration
     */
    private function handleAppleExpiration(string $providerSubId): void
    {
        $subscription = $this->subscriptions->findByProviderSubId($providerSubId, 'apple_iap');

        if ($subscription) {
            $this->subscriptionManager->expire($subscription);
        }
    }

    /**
     * Handle Apple refund
     */
    private function handleAppleRefund(array $data): void
    {
        $transactionId = $data['transaction_id'] ?? null;

        if ($transactionId) {
            $this->subscriptionManager->refund($transactionId);
            $this->swipePackManager->refund($transactionId, $transactionId);
        }
    }

    /**
     * Handle Google subscription expiration
     */
    private function handleGoogleExpiration(string $subscriptionToken): void
    {
        $subscription = $this->subscriptions->findByProviderSubId($subscriptionToken, 'google_play');

        if ($subscription) {
            $this->subscriptionManager->expire($subscription);
        }
    }

    /**
     * Handle Google refund
     */
    private function handleGoogleRefund(string $subscriptionToken): void
    {
        $subscription = $this->subscriptions->findByProviderSubId($subscriptionToken, 'google_play');

        if ($subscription) {
            $this->subscriptionManager->refundSubscription($subscription, $subscriptionToken);
        }

        // Some Google refund payloads identify purchases by token only.
        // If the token maps to a swipe-pack payment reference, refund it as well.
        $this->swipePackManager->refund($subscriptionToken, $subscriptionToken);
    }

    /**
     * Handle Google subscription cancellation
     */
    private function handleGoogleCancellation(string $subscriptionToken): void
    {
        $subscription = $this->subscriptions->findByProviderSubId($subscriptionToken, 'google_play');

        if ($subscription) {
            $this->subscriptionManager->cancel($subscription);
        }
    }
}
