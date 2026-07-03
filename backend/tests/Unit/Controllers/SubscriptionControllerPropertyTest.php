<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\Subscription\SubscriptionController;
use App\Models\PostgreSQL\User;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use PHPUnit\Framework\MockObject\MockObject;
use Tests\TestCase;

class SubscriptionControllerPropertyTest extends TestCase
{
    public function test_property_subscription_status_response_shape_is_stable(): void
    {
        /** @var SubscriptionService&MockObject $service */
        $service = $this->createMock(SubscriptionService::class);

        $service->expects($this->exactly(4))
            ->method('getSubscriptionStatus')
            ->willReturnOnConsecutiveCalls(
                ['tier' => 'none', 'status' => 'inactive', 'can_post_jobs' => false],
                ['tier' => 'basic', 'status' => 'active', 'can_post_jobs' => true],
                ['tier' => 'basic', 'status' => 'cancelled', 'can_post_jobs' => false],
                ['tier' => 'basic', 'status' => 'inactive', 'can_post_jobs' => false],
            );

        $controller = new SubscriptionController($service);

        for ($i = 0; $i < 4; $i++) {
            $request = Request::create('/api/v1/subscriptions/status', 'GET');

            $user = new User;
            $user->id = 'u1';
            $user->role = 'company_admin';
            $request->setUserResolver(static fn () => $user);

            $response = $controller->getSubscriptionStatus($request);
            $payload = json_decode($response->getContent(), true);

            $this->assertSame(200, $response->getStatusCode());
            $this->assertTrue($payload['success']);
            $this->assertArrayHasKey('tier', $payload['data']);
            $this->assertArrayHasKey('status', $payload['data']);
            $this->assertArrayHasKey('can_post_jobs', $payload['data']);
        }
    }

    public function test_property_invalid_webhook_signature_always_rejected(): void
    {
        /** @var SubscriptionService&MockObject $service */
        $service = $this->createMock(SubscriptionService::class);

        $service->expects($this->never())->method('handleSubscriptionUpdated');

        config()->set('cashier.webhook.secret', 'whsec_property_test_secret');

        $controller = new SubscriptionController($service);

        for ($i = 0; $i < 5; $i++) {
            $request = Request::create('/api/v1/webhooks/stripe', 'POST');
            $request->headers->set('Stripe-Signature', 't='.(123 + $i).',v1=invalid'.$i);
            $request->initialize([], [], [], [], [], [], '{"id":"evt_test","type":"customer.subscription.updated"}');

            $response = $controller->handleWebhook($request);
            $payload = json_decode($response->getContent(), true);

            $this->assertSame(400, $response->getStatusCode());
            $this->assertFalse($payload['success']);
            $this->assertSame('WEBHOOK_VERIFICATION_FAILED', $payload['code']);
        }
    }
}
