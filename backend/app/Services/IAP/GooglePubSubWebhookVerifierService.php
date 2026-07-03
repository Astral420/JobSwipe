<?php

namespace App\Services\IAP;

use App\Exceptions\IAPException;
use Carbon\Carbon;

class GooglePubSubWebhookVerifierService
{
    public function __construct(private GooglePubSubTokenVerifierService $tokenVerifier) {}

    /**
     * Verify and normalize Google Pub/Sub push payload for RTDN.
     *
     * @throws IAPException
     */
    public function verify(?string $authorizationHeader, array $payload): array
    {
        $bearerToken = $this->extractBearerToken($authorizationHeader);
        $audience = trim((string) config('iap.google.webhook.audience', ''));
        $claims = $this->tokenVerifier->verify($bearerToken, $audience === '' ? null : $audience);
        $this->assertAuthClaims($claims, $audience);

        $message = $payload['message'] ?? null;
        if (! is_array($message)) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub payload is missing message envelope',
                400
            );
        }

        $eventId = trim((string) ($message['messageId'] ?? ''));
        if ($eventId === '') {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub payload is missing messageId',
                400
            );
        }

        $encodedData = trim((string) ($message['data'] ?? ''));
        if ($encodedData === '') {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub payload is missing message data',
                400
            );
        }

        $decodedDataRaw = base64_decode($encodedData, true);
        if ($decodedDataRaw === false) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub payload has invalid base64 data',
                400
            );
        }

        $decodedData = json_decode($decodedDataRaw, true);
        if (! is_array($decodedData)) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub message data is malformed',
                400
            );
        }

        $packageName = trim((string) ($decodedData['packageName'] ?? ''));
        $expectedPackageName = trim((string) config('iap.google.package_name', ''));
        if ($expectedPackageName !== '' && $packageName !== $expectedPackageName) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub packageName does not match configured package',
                401
            );
        }

        $subscriptionNotification = $decodedData['subscriptionNotification'] ?? [];
        if (! is_array($subscriptionNotification)) {
            $subscriptionNotification = [];
        }

        $notificationType = $this->coerceInt($subscriptionNotification['notificationType'] ?? null);
        $purchaseToken = trim((string) ($subscriptionNotification['purchaseToken'] ?? ''));
        $subscriptionId = trim((string) ($subscriptionNotification['subscriptionId'] ?? ''));
        $eventTime = $this->resolveEventTimestamp($decodedData['eventTimeMillis'] ?? null, $message['publishTime'] ?? null);

        return [
            'event_id' => $eventId,
            'event_type' => $notificationType === null ? 'unknown' : (string) $notificationType,
            'notification_type' => $notificationType,
            'purchase_token' => $purchaseToken,
            'subscription_id' => $subscriptionId,
            'package_name' => $packageName,
            'event_time' => $eventTime,
            'claims' => [
                'iss' => (string) ($claims['iss'] ?? ''),
                'aud' => (string) ($claims['aud'] ?? ''),
                'email' => (string) ($claims['email'] ?? ''),
            ],
            'raw' => $decodedData,
        ];
    }

    /**
     * @throws IAPException
     */
    private function extractBearerToken(?string $authorizationHeader): string
    {
        if (! is_string($authorizationHeader) || trim($authorizationHeader) === '') {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub request is missing Authorization bearer token',
                401
            );
        }

        if (! preg_match('/^Bearer\s+(.+)$/i', trim($authorizationHeader), $matches)) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub request Authorization header is invalid',
                401
            );
        }

        $token = trim((string) ($matches[1] ?? ''));
        if ($token === '') {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub request bearer token is empty',
                401
            );
        }

        return $token;
    }

    /**
     * @param  array<string, mixed>  $claims
     *
     * @throws IAPException
     */
    private function assertAuthClaims(array $claims, string $audience): void
    {
        $issuer = trim((string) ($claims['iss'] ?? ''));
        if (! in_array($issuer, ['accounts.google.com', 'https://accounts.google.com'], true)) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub bearer token issuer is invalid',
                401
            );
        }

        if ($audience !== '' && (string) ($claims['aud'] ?? '') !== $audience) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub bearer token audience is invalid',
                401
            );
        }

        if ((bool) config('iap.google.webhook.require_email_verified', true)
            && array_key_exists('email_verified', $claims)
            && ! filter_var($claims['email_verified'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub bearer token email is not verified',
                401
            );
        }

        $expectedServiceAccount = trim((string) config('iap.google.webhook.expected_service_account', ''));
        $tokenEmail = trim((string) ($claims['email'] ?? ''));
        if ($expectedServiceAccount !== '' && $tokenEmail !== $expectedServiceAccount) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub bearer token service account is invalid',
                401
            );
        }
    }

    private function coerceInt(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value;
        }

        if (is_string($value) && is_numeric($value)) {
            return (int) $value;
        }

        return null;
    }

    private function resolveEventTimestamp(mixed $eventTimeMillis, mixed $publishTime): int
    {
        $eventMillis = $this->coerceInt($eventTimeMillis);
        if ($eventMillis !== null && $eventMillis > 0) {
            if ($eventMillis > 1000000000000) {
                return (int) floor($eventMillis / 1000);
            }

            return $eventMillis;
        }

        if (is_string($publishTime) && trim($publishTime) !== '') {
            try {
                return Carbon::parse($publishTime)->timestamp;
            } catch (\Throwable) {
                // Ignore and use fallback below.
            }
        }

        return now()->timestamp;
    }
}
