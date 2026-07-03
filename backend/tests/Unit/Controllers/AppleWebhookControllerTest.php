<?php

namespace Tests\Unit\Controllers;

use App\Exceptions\IAPException;
use App\Http\Controllers\Webhook\AppleWebhookController;
use App\Services\IAP\AppleWebhookVerifierService;
use App\Services\IAPService;
use Illuminate\Container\Container;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Facade;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class AppleWebhookControllerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $container = new Container;
        $container->instance('log', new class
        {
            public function info(string $message, array $context = []): void {}

            public function warning(string $message, array $context = []): void {}

            public function error(string $message, array $context = []): void {}
        });

        Facade::setFacadeApplication($container);
    }

    protected function tearDown(): void
    {
        Facade::clearResolvedInstances();

        parent::tearDown();
    }

    public function test_handle_notification_processes_verified_payload(): void
    {
        /** @var IAPService&MockObject $iapService */
        $iapService = $this->createMock(IAPService::class);
        /** @var AppleWebhookVerifierService&MockObject $verifier */
        $verifier = $this->createMock(AppleWebhookVerifierService::class);

        $verifiedPayload = [
            'event_id' => 'evt-apple-1',
            'event_type' => 'DID_RENEW',
            'provider_sub_id' => 'orig-tx-1',
            'transaction_id' => 'tx-1',
            'event_time' => time(),
        ];

        $verifier->expects($this->once())
            ->method('verify')
            ->willReturn($verifiedPayload);

        $iapService->expects($this->once())
            ->method('processAppleWebhook')
            ->with($verifiedPayload);

        $controller = new TestableAppleWebhookController($iapService, $verifier);
        $request = Request::create('/api/v1/webhooks/apple-iap', 'POST', [
            'signedPayload' => 'dummy',
        ]);

        $response = $controller->handleNotification($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
    }

    public function test_handle_notification_returns_verification_error_for_invalid_payload(): void
    {
        /** @var IAPService&MockObject $iapService */
        $iapService = $this->createMock(IAPService::class);
        /** @var AppleWebhookVerifierService&MockObject $verifier */
        $verifier = $this->createMock(AppleWebhookVerifierService::class);

        $verifier->expects($this->once())
            ->method('verify')
            ->willThrowException(new IAPException(
                'WEBHOOK_VERIFICATION_FAILED',
                'Apple webhook payload is missing signedPayload',
                400
            ));

        $iapService->expects($this->never())->method('processAppleWebhook');

        $controller = new TestableAppleWebhookController($iapService, $verifier);
        $request = Request::create('/api/v1/webhooks/apple-iap', 'POST', []);

        $response = $controller->handleNotification($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(400, $response->getStatusCode());
        $this->assertFalse($payload['success']);
        $this->assertSame('WEBHOOK_VERIFICATION_FAILED', $payload['code']);
    }
}

class TestableAppleWebhookController extends AppleWebhookController
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
