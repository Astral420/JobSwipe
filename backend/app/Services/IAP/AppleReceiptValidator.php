<?php

namespace App\Services\IAP;

use App\Exceptions\IAPException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AppleReceiptValidator
{
    private const STATUS_SUCCESS = 0;

    private const STATUS_SANDBOX_RECEIPT_IN_PRODUCTION = 21007;

    private ?string $productionUrl;

    private ?string $sandboxUrl;

    private ?string $sharedSecret;

    private int $timeout;

    public function __construct()
    {
        $this->productionUrl = config('iap.apple.production_url');
        $this->sandboxUrl = config('iap.apple.sandbox_url');
        $this->sharedSecret = config('iap.apple.shared_secret');
        $this->timeout = config('iap.apple.timeout', 10);
    }

    /**
     * Verify Apple receipt with production endpoint, fallback to sandbox on 21007
     *
     * @param  string  $receiptData  Base64-encoded receipt string
     * @return array Contains transaction_id, product_id, purchase_date, provider_sub_id
     *
     * @throws IAPException
     */
    public function verify(string $receiptData): array
    {
        // Try production endpoint first
        $response = $this->callVerificationEndpoint($this->productionUrl, $receiptData);

        // Handle sandbox receipt in production (status 21007)
        if ($response['status'] === self::STATUS_SANDBOX_RECEIPT_IN_PRODUCTION) {
            Log::warning('Apple sandbox receipt detected in production environment', [
                'receipt_hash' => hash('sha256', $receiptData),
            ]);

            // Retry with sandbox endpoint once
            $response = $this->callVerificationEndpoint($this->sandboxUrl, $receiptData);
        }

        // Validate status code
        if ($response['status'] !== self::STATUS_SUCCESS) {
            throw new IAPException(
                'INVALID_RECEIPT',
                "Apple receipt verification failed with status {$response['status']}",
                400
            );
        }

        // Extract transaction details
        return $this->extractTransactionDetails($response);
    }

    /**
     * Call Apple verification endpoint with timeout handling
     *
     * @param  string  $url  Verification endpoint URL
     * @param  string  $receiptData  Base64-encoded receipt
     * @return array Verification response
     *
     * @throws IAPException
     */
    private function callVerificationEndpoint(string $url, string $receiptData): array
    {
        try {
            $response = Http::timeout($this->timeout)
                ->post($url, [
                    'receipt-data' => $receiptData,
                    'password' => $this->sharedSecret,
                    'exclude-old-transactions' => true,
                ]);

            // Handle HTTP 500 errors
            if ($response->serverError()) {
                throw new IAPException(
                    'VERIFICATION_SERVICE_UNAVAILABLE',
                    'Apple verification service returned server error',
                    503
                );
            }

            return $response->json();

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            // Handle timeout or connection errors
            throw new IAPException(
                'VERIFICATION_SERVICE_UNAVAILABLE',
                'Apple verification service is unavailable or timed out',
                503
            );
        }
    }

    /**
     * Extract transaction details from Apple verification response
     *
     * @param  array  $response  Verification response from Apple
     * @return array Contains transaction_id, product_id, purchase_date, provider_sub_id
     *
     * @throws IAPException
     */
    private function extractTransactionDetails(array $response): array
    {
        // Get the latest receipt info
        $receiptInfo = $response['latest_receipt_info'][0] ?? $response['receipt']['in_app'][0] ?? null;

        if (! $receiptInfo) {
            throw new IAPException(
                'INVALID_RECEIPT',
                'No transaction data found in Apple receipt',
                400
            );
        }

        $transactionId = (string) ($receiptInfo['transaction_id'] ?? $receiptInfo['original_transaction_id'] ?? '');
        $providerSubId = (string) ($receiptInfo['original_transaction_id'] ?? $transactionId);
        $productId = (string) ($receiptInfo['product_id'] ?? '');
        $purchaseDate = null;

        if (isset($receiptInfo['purchase_date_ms'])) {
            $purchaseDate = (int) (((int) $receiptInfo['purchase_date_ms']) / 1000);
        } elseif (isset($receiptInfo['purchase_date'])) {
            $parsed = strtotime((string) $receiptInfo['purchase_date']);
            $purchaseDate = $parsed === false ? null : $parsed;
        }

        if ($transactionId === '' || $productId === '' || $purchaseDate === null) {
            throw new IAPException(
                'INVALID_RECEIPT',
                'Apple receipt verification returned incomplete transaction data',
                400
            );
        }

        return [
            'transaction_id' => $transactionId,
            'product_id' => $productId,
            'purchase_date' => $purchaseDate,
            'provider_sub_id' => $providerSubId,
        ];
    }
}
