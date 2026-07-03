# IAP Webhook Signature Setup (Apple + Google)

This document covers how to configure webhook signature verification for:
- Apple App Store Server Notifications V2 (JWS + certificate chain)
- Google Play Real-time Developer Notifications (Pub/Sub push OIDC token)

## 1. What Was Implemented

Backend now verifies webhook authenticity before business logic runs:
- `AppleWebhookVerifierService` verifies `signedPayload` JWS and validates `x5c` chain.
- `GooglePubSubWebhookVerifierService` verifies Pub/Sub OIDC bearer token and payload integrity.
- `GooglePlaySubscriptionStateResolverService` fetches canonical subscription state via Google Play API (`subscriptionsv2.get`) before applying status updates.
- Webhook controllers now reject invalid signatures/claims and only pass verified, normalized payloads to `IAPService`.

## 2. Environment Variables

Set these in `backend/.env`:

```env
# Apple IAP
APPLE_IAP_SHARED_SECRET=
APPLE_IAP_BUNDLE_ID=com.your.app
APPLE_IAP_WEBHOOK_ENV=PROD
APPLE_IAP_WEBHOOK_APP_APPLE_ID=
APPLE_IAP_WEBHOOK_STRICT_CERT_VALIDATION=true
APPLE_IAP_WEBHOOK_ROOT_CERT_PATHS=/var/www/html/storage/certs/apple_root_ca_g3.pem

# Google Play IAP
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=/var/www/html/storage/keys/google-play-service-account.json
GOOGLE_PLAY_PACKAGE_NAME=com.your.app
GOOGLE_PUBSUB_WEBHOOK_AUDIENCE=https://api.yourdomain.com/api/v1/webhooks/google-play
GOOGLE_PUBSUB_WEBHOOK_SERVICE_ACCOUNT=your-pubsub-push-sa@your-project.iam.gserviceaccount.com
GOOGLE_PUBSUB_REQUIRE_EMAIL_VERIFIED=true
```

## 3. Apple Setup

1. Enable App Store Server Notifications V2 in App Store Connect.
2. Set webhook URL to:
   - `https://<your-api-domain>/api/v1/webhooks/apple-iap`
3. Download Apple root certificate(s) and place PEM files in your backend runtime, for example:
   - `/var/www/html/storage/certs/apple_root_ca_g3.pem`
4. Set `APPLE_IAP_WEBHOOK_ROOT_CERT_PATHS` to one or more comma-separated PEM paths.
5. Configure:
   - `APPLE_IAP_BUNDLE_ID` = your iOS app bundle ID
   - `APPLE_IAP_WEBHOOK_ENV` = `PROD` for production, `SANDBOX` for test environment
   - `APPLE_IAP_WEBHOOK_APP_APPLE_ID` for production checks

Notes:
- If strict certificate validation is enabled and no root cert path is configured, verification fails by design.
- Apple webhook payload must contain `signedPayload`; unsigned payloads are rejected.

## 4. Google Setup

1. In Google Play Console, configure Real-time Developer Notifications and Pub/Sub topic.
2. Create a Pub/Sub **push subscription** to:
   - `https://<your-api-domain>/api/v1/webhooks/google-play`
3. Enable OIDC token on push subscription.
4. Set audience in Pub/Sub to exactly match `GOOGLE_PUBSUB_WEBHOOK_AUDIENCE`.
5. Set optional hard-check service account:
   - `GOOGLE_PUBSUB_WEBHOOK_SERVICE_ACCOUNT`
6. Ensure your Play service account JSON path is valid in `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.

Notes:
- Request must include `Authorization: Bearer <OIDC token>`.
- Notification payload is verified, decoded, and package name is matched against `GOOGLE_PLAY_PACKAGE_NAME`.
- Canonical state is reconciled from Google Play API before mutation.

## 5. Apply Config Changes

Run after env/config updates:

```bash
docker compose exec -T laravel php artisan config:clear
docker compose exec -T laravel php artisan cache:clear
```

## 6. Verification Checklist

1. Apple invalid payload test:
   - Send webhook without `signedPayload` and expect `WEBHOOK_VERIFICATION_FAILED`.
2. Apple valid payload test:
   - Send a real signed notification from Apple test/prod and expect `Webhook received`.
3. Google invalid auth test:
   - Send payload without bearer token and expect `WEBHOOK_VERIFICATION_FAILED`.
4. Google invalid package test:
   - Send mismatched `packageName` and expect verification failure.
5. Google valid RTDN test:
   - Publish real RTDN via Play billing flow and verify status mutation + webhook event dedup.

## 7. Troubleshooting

- `Apple webhook root certificate configuration is missing`
  - Set `APPLE_IAP_WEBHOOK_ROOT_CERT_PATHS` to readable PEM files.

- `Google Play service account credentials not found`
  - Confirm `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` path exists inside the Laravel runtime/container.

- `Google Pub/Sub bearer token audience is invalid`
  - Ensure Pub/Sub push audience exactly matches `GOOGLE_PUBSUB_WEBHOOK_AUDIENCE`.

- `Google Pub/Sub bearer token service account is invalid`
  - Verify `GOOGLE_PUBSUB_WEBHOOK_SERVICE_ACCOUNT` matches token email claim.
