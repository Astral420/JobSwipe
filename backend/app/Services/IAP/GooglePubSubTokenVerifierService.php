<?php

namespace App\Services\IAP;

use App\Exceptions\IAPException;
use Google\Auth\AccessToken;
use Throwable;

class GooglePubSubTokenVerifierService
{
    /**
     * @return array<string, mixed>
     *
     * @throws IAPException
     */
    public function verify(string $jwt, ?string $audience = null): array
    {
        try {
            $accessToken = new AccessToken;
            $options = [
                'throwException' => true,
            ];

            if (is_string($audience) && trim($audience) !== '') {
                $options['audience'] = trim($audience);
            }

            $payload = $accessToken->verify($jwt, $options);
        } catch (Throwable $exception) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub bearer token verification failed',
                401
            );
        }

        if ($payload === false) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub bearer token verification failed',
                401
            );
        }

        if (is_object($payload)) {
            $payload = json_decode(json_encode($payload), true);
        }

        if (! is_array($payload)) {
            throw new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub bearer token payload is malformed',
                401
            );
        }

        return $payload;
    }
}
