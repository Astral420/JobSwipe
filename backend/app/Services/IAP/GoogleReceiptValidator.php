<?php

namespace App\Services\IAP;

use App\Exceptions\IAPException;
use Google\Client as Google_Client;
use Google\Service\AndroidPublisher;
use Google\Service\AndroidPublisher\ProductPurchase;

class GoogleReceiptValidator
{
    private const PURCHASE_STATE_PURCHASED = 0;

    private const TIMEOUT_SECONDS = 10;

    private ?Google_Client $googleClient = null;

    private ?string $packageName;

    public function __construct()
    {
        $this->packageName = config('iap.google.package_name');
    }

    /**
     * Verify Google Play purchase with Google Play Developer API
     *
     * @param  string  $purchaseToken  Purchase token from Google Play
     * @param  string  $productId  Product ID being verified
     * @return array Contains transaction_id, product_id, purchase_date, provider_sub_id
     *
     * @throws IAPException
     */
    public function verify(string $purchaseToken, string $productId): array
    {
        try {
            $androidPublisher = new AndroidPublisher($this->googleClient());

            // Call Google Play Developer API to verify purchase
            /** @var ProductPurchase $purchase */
            $purchase = $androidPublisher->purchases_products->get(
                $this->packageName,
                $productId,
                $purchaseToken
            );

            // Validate purchase state (0 = purchased, 1 = canceled)
            if ($purchase->getPurchaseState() !== self::PURCHASE_STATE_PURCHASED) {
                throw new IAPException(
                    'INVALID_RECEIPT',
                    "Google Play purchase has invalid state: {$purchase->getPurchaseState()}",
                    400
                );
            }

            // Extract order details from API response
            return $this->extractOrderDetails($purchase, $productId, $purchaseToken);

        } catch (\Google\Service\Exception $e) {
            // Handle Google API errors
            $statusCode = $e->getCode();

            if ($statusCode >= 500) {
                throw new IAPException(
                    'VERIFICATION_SERVICE_UNAVAILABLE',
                    'Google Play verification service returned server error',
                    503
                );
            }

            throw new IAPException(
                'INVALID_RECEIPT',
                "Google Play verification failed: {$e->getMessage()}",
                400
            );

        } catch (\GuzzleHttp\Exception\ConnectException $e) {
            // Handle timeout or connection errors
            throw new IAPException(
                'VERIFICATION_SERVICE_UNAVAILABLE',
                'Google Play verification service is unavailable or timed out',
                503
            );
        }
    }

    /**
     * Lazily initialize Google client only when a receipt verification is requested.
     *
     * @throws IAPException
     */
    private function googleClient(): Google_Client
    {
        if ($this->googleClient instanceof Google_Client) {
            return $this->googleClient;
        }

        $serviceAccountJson = config('iap.google.service_account_json');

        if (empty($serviceAccountJson) || ! file_exists($serviceAccountJson)) {
            throw new IAPException(
                'IAP_NOT_CONFIGURED',
                'Google Play service account credentials not found or not configured',
                500
            );
        }

        $this->googleClient = new Google_Client;
        $this->googleClient->setAuthConfig($serviceAccountJson);
        $this->googleClient->addScope(AndroidPublisher::ANDROIDPUBLISHER);
        $this->googleClient->setHttpClient(new \GuzzleHttp\Client([
            'timeout' => self::TIMEOUT_SECONDS,
        ]));

        return $this->googleClient;
    }

    /**
     * Extract order details from Google Play API response
     *
     * @param  ProductPurchase  $purchase  Purchase object from Google API
     * @param  string  $productId  Product ID
     * @param  string  $purchaseToken  Purchase token from Google Play
     * @return array Contains transaction_id, product_id, purchase_date, provider_sub_id
     */
    private function extractOrderDetails(ProductPurchase $purchase, string $productId, string $purchaseToken): array
    {
        $transactionId = (string) $purchase->getOrderId();
        if ($transactionId === '') {
            throw new IAPException(
                'INVALID_RECEIPT',
                'Google Play verification response missing order ID',
                400
            );
        }

        $purchaseTimeMillis = (int) $purchase->getPurchaseTimeMillis();
        if ($purchaseTimeMillis <= 0) {
            throw new IAPException(
                'INVALID_RECEIPT',
                'Google Play verification response missing purchase time',
                400
            );
        }

        return [
            'transaction_id' => $transactionId,
            'product_id' => $productId,
            'purchase_date' => (int) ($purchaseTimeMillis / 1000),
            'provider_sub_id' => $purchaseToken,
        ];
    }
}
