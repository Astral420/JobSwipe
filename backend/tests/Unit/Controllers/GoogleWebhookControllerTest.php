<?php

namespace Tests\Unit\Controllers;

use App\Exceptions\IAPException;
use App\Http\Controllers\Webhook\GoogleWebhookController;
use App\Services\IAP\GooglePubSubWebhookVerifierService;
use App\Services\IAPService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PHPUnit\Framework\MockObject\MockObject;
use Tests\TestCase;

class GoogleWebhookControllerTest extends TestCase
{
    public function test_handle_notification_processes_verified_payload(): void
    {
        /** @var IAPService&MockObject $iapService */
        $iapService = $this->createMock(IAPService::class);
        /** @var GooglePubSubWebhookVerifierService&MockObject $verifier */
        $verifier = $this->createMock(GooglePubSubWebhookVerifierService::class);

        $verifiedPayload = [
            'event_id' => 'pubsub-msg-1',
            'notification_type' => 2,
            'purchase_token' => 'purchase-token-1',
            'event_time' => time(),
        ];

        $verifier->expects($this->once())
            ->method('verify')
            ->with(
                $this->isType('string'),
                $this->isType('array')
            )
            ->willReturn($verifiedPayload);

        $iapService->expects($this->once())
            ->method('processGoogleWebhook')
            ->with($verifiedPayload);

        $controller = new TestableGoogleWebhookController($iapService, $verifier);
        $request = Request::create(
            '/api/v1/webhooks/google-play',
            'POST',
            ['message' => ['messageId' => 'pubsub-msg-1', 'data' => base64_encode('{}')]],
            [],
            [],
            ['HTTP_AUTHORIZATION' => 'Bearer test-token']
        );

        $response = $controller->handleNotification($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
    }

    public function test_handle_notification_returns_verification_error_for_invalid_token(): void
    {
        /** @var IAPService&MockObject $iapService */
        $iapService = $this->createMock(IAPService::class);
        /** @var GooglePubSubWebhookVerifierService&MockObject $verifier */
        $verifier = $this->createMock(GooglePubSubWebhookVerifierService::class);

        $verifier->expects($this->once())
            ->method('verify')
            ->willThrowException(new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Google Pub/Sub request is missing Authorization bearer token',
                401
            ));

        $iapService->expects($this->never())->method('processGoogleWebhook');

        $controller = new TestableGoogleWebhookController($iapService, $verifier);
        $request = Request::create('/api/v1/webhooks/google-play', 'POST', []);

        $response = $controller->handleNotification($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(401, $response->getStatusCode());
        $this->assertFalse($payload['success']);
        $this->assertSame('WEBHOOK_VERIFICATION_FAILED', $payload['code']);
    }
}

class TestableGoogleWebhookController extends GoogleWebhookController
{
    protected function success(mixed $data = null, string $message = 'OK', int $status = 200, array $meta = []): JsonResponse
    {
        $payload = [
            'success' => true,
            'data' => $data,
            'message' => $message,
        ];

        if ($meta !== []) {
            $payload['meta'] = $meta;
        }

        return new JsonResponse($payload, $status);
    }

    protected function error(string $code, string $message, int $status, array $errors = []): JsonResponse
    {
        $payload = [
            'success' => false,
            'message' => $message,
            'code' => $code,
        ];

        if ($errors !== []) {
            $payload['errors'] = $errors;
        }

        return new JsonResponse($payload, $status);
    }
}
