<?php

namespace App\Services\IAP;

use App\Exceptions\IAPException;
use Carbon\Carbon;
use Google\Client as Google_Client;
use Google\Service\AndroidPublisher;
use Google\Service\AndroidPublisher\SubscriptionPurchaseLineItem;
use Google\Service\AndroidPublisher\SubscriptionPurchaseV2;

class GooglePlaySubscriptionStateResolverService
{
    private const TIMEOUT_SECONDS = 10;

    private ?Google_Client $googleClient = null;

    /**
     * Resolve canonical subscription state for a purchase token from Google Play.
     *
     * @return array<string, mixed>
     *
     * @throws IAPException
     */
    public function resolve(string $purchaseToken): array
    {
        $packageName = trim((string) config('iap.google.package_name', ''));
        if ($packageName === '') {
            throw new IAPException(
                'IAP_NOT_CONFIGURED',
                'Google Play package name is missing for webhook reconciliation',
                500
            );
        }

        try {
            $androidPublisher = new AndroidPublisher($this->googleClient());
            /** @var SubscriptionPurchaseV2 $purchase */
            $purchase = $androidPublisher
                ->purchases_subscriptionsv2
                ->get($packageName, $purchaseToken);

            $canonicalState = (string) $purchase->getSubscriptionState();
            $lineItems = $purchase->getLineItems() ?? [];

            $latestOrderId = trim((string) $purchase->getLatestOrderId());
            $expiryTimestamp = $this->latestExpiryTimestamp($lineItems);

            if ($latestOrderId === '') {
                $latestOrderId = $this->latestLineItemOrderId($lineItems);
            }

            return [
                'canonical_state' => $canonicalState,
                'canonical_action' => $this->mapStateToAction($canonicalState),
                'latest_order_id' => $latestOrderId !== '' ? $latestOrderId : null,
                'expiry_timestamp' => $expiryTimestamp,
                'linked_purchase_token' => trim((string) $purchase->getLinkedPurchaseToken()) ?: null,
            ];
        } catch (\Google\Service\Exception $exception) {
            $statusCode = (int) $exception->getCode();
            $isProviderFailure = $statusCode >= 500;

            throw new IAPException(
                $isProviderFailure ? 'VERIFICATION_SERVICE_UNAVAILABLE' : 'INVALID_RECEIPT',
                $isProviderFailure
                    ? 'Google Play subscription reconciliation failed due to provider unavailability'
                    : 'Google Play subscription reconciliation failed with invalid token or payload',
                $isProviderFailure ? 503 : 400
            );
        } catch (\GuzzleHttp\Exception\ConnectException $exception) {
            throw new IAPException(
                'VERIFICATION_SERVICE_UNAVAILABLE',
                'Google Play subscription reconciliation timed out',
                503
            );
        }
    }

    /**
     * @param  array<int, SubscriptionPurchaseLineItem>|null  $lineItems
     */
    private function latestExpiryTimestamp(?array $lineItems): ?int
    {
        if (! is_array($lineItems) || $lineItems === []) {
            return null;
        }

        $timestamps = [];
        foreach ($lineItems as $lineItem) {
            if (! $lineItem instanceof SubscriptionPurchaseLineItem) {
                continue;
            }

            $expiryTime = trim((string) $lineItem->getExpiryTime());
            if ($expiryTime === '') {
                continue;
            }

            try {
                $timestamps[] = Carbon::parse($expiryTime)->timestamp;
            } catch (\Throwable) {
                // Ignore malformed values; we still return other valid entries.
            }
        }

        return $timestamps === [] ? null : max($timestamps);
    }

    /**
     * @param  array<int, SubscriptionPurchaseLineItem>|null  $lineItems
     */
    private function latestLineItemOrderId(?array $lineItems): string
    {
        if (! is_array($lineItems) || $lineItems === []) {
            return '';
        }

        foreach ($lineItems as $lineItem) {
            if (! $lineItem instanceof SubscriptionPurchaseLineItem) {
                continue;
            }

            $orderId = trim((string) $lineItem->getLatestSuccessfulOrderId());
            if ($orderId !== '') {
                return $orderId;
            }
        }

        return '';
    }

    private function mapStateToAction(string $canonicalState): string
    {
        return match ($canonicalState) {
            SubscriptionPurchaseV2::SUBSCRIPTION_STATE_SUBSCRIPTION_STATE_ACTIVE => 'active',
            SubscriptionPurchaseV2::SUBSCRIPTION_STATE_SUBSCRIPTION_STATE_CANCELED => 'cancelled',
            SubscriptionPurchaseV2::SUBSCRIPTION_STATE_SUBSCRIPTION_STATE_EXPIRED,
            SubscriptionPurchaseV2::SUBSCRIPTION_STATE_SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED => 'expired',
            SubscriptionPurchaseV2::SUBSCRIPTION_STATE_SUBSCRIPTION_STATE_PENDING,
            SubscriptionPurchaseV2::SUBSCRIPTION_STATE_SUBSCRIPTION_STATE_PAUSED,
            SubscriptionPurchaseV2::SUBSCRIPTION_STATE_SUBSCRIPTION_STATE_IN_GRACE_PERIOD,
            SubscriptionPurchaseV2::SUBSCRIPTION_STATE_SUBSCRIPTION_STATE_ON_HOLD => 'past_due',
            default => 'unknown',
        };
    }

    /**
     * @throws IAPException
     */
    private function googleClient(): Google_Client
    {
        if ($this->googleClient instanceof Google_Client) {
            return $this->googleClient;
        }

        $serviceAccountJson = trim((string) config('iap.google.service_account_json', ''));
        if ($serviceAccountJson === '' || ! is_file($serviceAccountJson)) {
            throw new IAPException(
                'IAP_NOT_CONFIGURED',
                'Google Play service account credentials not found for webhook reconciliation',
                500
            );
        }

        $googleClient = new Google_Client;
        $googleClient->setAuthConfig($serviceAccountJson);
        $googleClient->addScope(AndroidPublisher::ANDROIDPUBLISHER);
        $googleClient->setHttpClient(new \GuzzleHttp\Client([
            'timeout' => self::TIMEOUT_SECONDS,
        ]));

        $this->googleClient = $googleClient;

        return $this->googleClient;
    }
}
