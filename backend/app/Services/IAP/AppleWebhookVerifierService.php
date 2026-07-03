<?php

namespace App\Services\IAP;

use App\Exceptions\IAPException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Throwable;

class AppleWebhookVerifierService
{
    private const APPLE_JWS_ALGORITHM = 'ES256';

    private const APPLE_ENVIRONMENT_PRODUCTION = 'PROD';

    private const APPLE_ENVIRONMENT_SANDBOX = 'SANDBOX';

    /**
     * Verify and normalize Apple Server Notification V2 payload.
     *
     * @throws IAPException
     */
    public function verify(array $notification): array
    {
        $signedPayload = trim((string) ($notification['signedPayload'] ?? ''));

        if ($signedPayload === '') {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook payload is missing signedPayload',
                400
            );
        }

        $payload = $this->decodeAndVerifyJws($signedPayload);
        $data = is_array($payload['data'] ?? null) ? $payload['data'] : [];

        $eventId = trim((string) ($payload['notificationUUID'] ?? ''));
        $eventType = trim((string) ($payload['notificationType'] ?? ''));

        if ($eventId === '' || $eventType === '') {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook payload is missing notification metadata',
                400
            );
        }

        $bundleId = trim((string) ($data['bundleId'] ?? ''));
        $environment = $this->normalizeAppleEnvironment((string) ($data['environment'] ?? ''));
        $appAppleId = $data['appAppleId'] ?? null;

        $this->assertExpectedBundleAndEnvironment($bundleId, $environment, $appAppleId);

        $transactionInfo = [];
        $signedTransactionInfo = trim((string) ($data['signedTransactionInfo'] ?? ''));
        if ($signedTransactionInfo !== '') {
            $transactionInfo = $this->decodeAndVerifyJws($signedTransactionInfo);
            $this->assertNestedClaims($transactionInfo, $bundleId, $environment);
        }

        $renewalInfo = [];
        $signedRenewalInfo = trim((string) ($data['signedRenewalInfo'] ?? ''));
        if ($signedRenewalInfo !== '') {
            $renewalInfo = $this->decodeAndVerifyJws($signedRenewalInfo);
            $this->assertNestedClaims($renewalInfo, $bundleId, $environment);
        }

        $providerSubId = trim((string) ($transactionInfo['originalTransactionId']
            ?? $renewalInfo['originalTransactionId']
            ?? ''));
        $transactionId = trim((string) ($transactionInfo['transactionId'] ?? ''));

        return [
            'event_id' => $eventId,
            'event_type' => $eventType,
            'subtype' => $payload['subtype'] ?? null,
            'provider_sub_id' => $providerSubId,
            'transaction_id' => $transactionId,
            'bundle_id' => $bundleId,
            'environment' => $environment,
            'event_time' => $this->resolveEventTimestamp($payload, $transactionInfo),
            'raw' => $payload,
            'transaction_info' => $transactionInfo,
            'renewal_info' => $renewalInfo,
        ];
    }

    /**
     * @throws IAPException
     */
    private function decodeAndVerifyJws(string $jws): array
    {
        $header = $this->decodeJwsHeader($jws);
        $algorithm = (string) ($header['alg'] ?? '');

        if ($algorithm !== self::APPLE_JWS_ALGORITHM) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook JWS uses unsupported signing algorithm',
                401
            );
        }

        $x5c = $header['x5c'] ?? null;
        if (! is_array($x5c) || $x5c === []) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook JWS is missing x5c certificate chain',
                401
            );
        }

        $certificateChain = $this->buildCertificateChain($x5c);
        $this->verifyCertificateChain($certificateChain);

        try {
            $decoded = JWT::decode(
                $jws,
                new Key($certificateChain[0], self::APPLE_JWS_ALGORITHM)
            );
        } catch (Throwable $exception) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook JWS signature verification failed',
                401
            );
        }

        $payload = json_decode(json_encode($decoded), true);

        if (! is_array($payload)) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook payload is malformed',
                400
            );
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $claims
     *
     * @throws IAPException
     */
    private function assertNestedClaims(array $claims, string $bundleId, string $environment): void
    {
        $claimBundle = trim((string) ($claims['bundleId'] ?? ''));
        if ($bundleId !== '' && $claimBundle !== '' && $claimBundle !== $bundleId) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook nested JWS bundleId does not match top-level payload',
                401
            );
        }

        $claimEnvironment = $this->normalizeAppleEnvironment((string) ($claims['environment'] ?? ''));
        if ($environment !== '' && $claimEnvironment !== '' && $claimEnvironment !== $environment) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook nested JWS environment does not match top-level payload',
                401
            );
        }
    }

    /**
     * @throws IAPException
     */
    private function decodeJwsHeader(string $jws): array
    {
        $parts = explode('.', $jws);

        if (count($parts) !== 3) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook JWS format is invalid',
                400
            );
        }

        $headerJson = $this->decodeBase64Url($parts[0]);
        $header = json_decode($headerJson, true);

        if (! is_array($header)) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook JWS header is malformed',
                400
            );
        }

        return $header;
    }

    /**
     * @param  list<string>  $x5c
     * @return list<string>
     *
     * @throws IAPException
     */
    private function buildCertificateChain(array $x5c): array
    {
        $certificates = [];

        foreach ($x5c as $certificateDer) {
            if (! is_string($certificateDer) || trim($certificateDer) === '') {
                throw new IAPException(
                    'WEBHOOK_VERIFICATION_FAILED',
                    'Apple webhook certificate chain is invalid',
                    401
                );
            }

            $certificates[] = $this->convertDerToPem($certificateDer);
        }

        return $certificates;
    }

    /**
     * @param  list<string>  $certificateChain
     *
     * @throws IAPException
     */
    private function verifyCertificateChain(array $certificateChain): void
    {
        if ($certificateChain === []) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook certificate chain is empty',
                401
            );
        }

        foreach ($certificateChain as $certificate) {
            $this->assertCertificateIsTimeValid($certificate);
        }

        for ($index = 0; $index < count($certificateChain) - 1; $index++) {
            $child = $certificateChain[$index];
            $issuer = $certificateChain[$index + 1];
            $issuerPublicKey = openssl_pkey_get_public($issuer);

            if ($issuerPublicKey === false || openssl_x509_verify($child, $issuerPublicKey) !== 1) {
                throw new IAPException(
                    'WEBHOOK_VERIFICATION_FAILED',
                    'Apple webhook certificate chain signature is invalid',
                    401
                );
            }
        }

        if (! (bool) config('iap.apple.webhook.strict_certificate_validation', true)) {
            return;
        }

        $trustedRoots = $this->trustedRootCertificates();
        if ($trustedRoots === []) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook root certificate configuration is missing',
                500
            );
        }

        $lastChainCert = $certificateChain[count($certificateChain) - 1];
        $lastFingerprint = openssl_x509_fingerprint($lastChainCert, 'sha256');
        $isTrusted = false;

        foreach ($trustedRoots as $rootCert) {
            $rootFingerprint = openssl_x509_fingerprint($rootCert, 'sha256');
            if (is_string($lastFingerprint)
                && is_string($rootFingerprint)
                && hash_equals($rootFingerprint, $lastFingerprint)) {
                $isTrusted = true;
                break;
            }

            $rootPublicKey = openssl_pkey_get_public($rootCert);
            if ($rootPublicKey !== false && openssl_x509_verify($lastChainCert, $rootPublicKey) === 1) {
                $isTrusted = true;
                break;
            }
        }

        if (! $isTrusted) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook certificate chain is not anchored to a trusted root',
                401
            );
        }
    }

    /**
     * @return list<string>
     *
     * @throws IAPException
     */
    private function trustedRootCertificates(): array
    {
        $rootCerts = [];

        /** @var array<int, string> $rootPaths */
        $rootPaths = config('iap.apple.webhook.root_cert_paths', []);

        foreach ($rootPaths as $path) {
            $normalizedPath = trim((string) $path);

            if ($normalizedPath === '') {
                continue;
            }

            if (! is_file($normalizedPath) || ! is_readable($normalizedPath)) {
                throw new IAPException(
                    'WEBHOOK_VERIFICATION_FAILED',
                    "Apple webhook root certificate file not readable: {$normalizedPath}",
                    500
                );
            }

            $contents = file_get_contents($normalizedPath);
            if (! is_string($contents) || trim($contents) === '') {
                throw new IAPException(
                    'WEBHOOK_VERIFICATION_FAILED',
                    "Apple webhook root certificate file is empty: {$normalizedPath}",
                    500
                );
            }

            $rootCerts[] = trim($contents);
        }

        return $rootCerts;
    }

    /**
     * @throws IAPException
     */
    private function assertCertificateIsTimeValid(string $certificate): void
    {
        $metadata = openssl_x509_parse($certificate);

        if (! is_array($metadata)) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook certificate metadata is invalid',
                401
            );
        }

        $validFrom = (int) ($metadata['validFrom_time_t'] ?? 0);
        $validTo = (int) ($metadata['validTo_time_t'] ?? 0);
        $now = time();

        if ($validFrom <= 0 || $validTo <= 0 || $now < $validFrom || $now > $validTo) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook certificate is expired or not yet valid',
                401
            );
        }
    }

    /**
     * @throws IAPException
     */
    private function assertExpectedBundleAndEnvironment(string $bundleId, string $environment, mixed $appAppleId): void
    {
        $expectedBundleId = trim((string) config('iap.apple.webhook.bundle_id', ''));
        if ($expectedBundleId !== '' && $bundleId !== $expectedBundleId) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook bundleId does not match configured application bundleId',
                401
            );
        }

        $expectedEnvironment = $this->normalizeAppleEnvironment((string) config('iap.apple.webhook.environment', ''));
        if ($expectedEnvironment !== ''
            && ! in_array($expectedEnvironment, [self::APPLE_ENVIRONMENT_PRODUCTION, self::APPLE_ENVIRONMENT_SANDBOX], true)) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook environment configuration is invalid',
                500
            );
        }

        if ($expectedEnvironment !== '' && $environment !== '' && $expectedEnvironment !== $environment) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook environment does not match expected environment',
                401
            );
        }

        $expectedAppAppleId = trim((string) config('iap.apple.webhook.app_apple_id', ''));
        if ($expectedAppAppleId !== ''
            && $environment === self::APPLE_ENVIRONMENT_PRODUCTION
            && (string) $appAppleId !== $expectedAppAppleId) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook appAppleId does not match expected appAppleId',
                401
            );
        }
    }

    private function normalizeAppleEnvironment(string $environment): string
    {
        $normalized = strtoupper(trim($environment));

        return match ($normalized) {
            'PRODUCTION' => self::APPLE_ENVIRONMENT_PRODUCTION,
            'SANDBOX' => self::APPLE_ENVIRONMENT_SANDBOX,
            default => $normalized,
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $transactionInfo
     */
    private function resolveEventTimestamp(array $payload, array $transactionInfo): int
    {
        $signedDateMillis = $this->coerceToInt($payload['signedDate'] ?? null);
        if ($signedDateMillis > 0) {
            return (int) floor($signedDateMillis / 1000);
        }

        $purchaseDateMillis = $this->coerceToInt($transactionInfo['purchaseDate'] ?? null);
        if ($purchaseDateMillis > 0) {
            return (int) floor($purchaseDateMillis / 1000);
        }

        return now()->timestamp;
    }

    private function coerceToInt(mixed $value): int
    {
        if (is_int($value)) {
            return $value;
        }

        if (is_string($value) && is_numeric($value)) {
            return (int) $value;
        }

        return 0;
    }

    private function convertDerToPem(string $certificateDerBase64): string
    {
        $wrapped = chunk_split($certificateDerBase64, 64, PHP_EOL);

        return '-----BEGIN CERTIFICATE-----'.PHP_EOL
            .$wrapped
            .'-----END CERTIFICATE-----'.PHP_EOL;
    }

    /**
     * @throws IAPException
     */
    private function decodeBase64Url(string $value): string
    {
        $remainder = strlen($value) % 4;
        if ($remainder > 0) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        if ($decoded === false) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook JWS contains invalid base64 data',
                400
            );
        }

        return $decoded;
    }
}
