<?php

namespace App\Http\Controllers\Subscription;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subscription\CreateCheckoutSessionRequest;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use UnexpectedValueException;

class SubscriptionController extends Controller
{
    public function __construct(private SubscriptionService $subscriptions) {}

    public function createCheckoutSession(CreateCheckoutSessionRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $idempotencyKey = trim((string) $request->header('Idempotency-Key', ''));

        if ($idempotencyKey !== '' && strlen($idempotencyKey) > 255) {
            return $this->error(
                'INVALID_IDEMPOTENCY_KEY',
                'Idempotency key must be 255 characters or fewer.',
                422
            );
        }

        $result = $this->subscriptions->createCheckoutSession(
            $request->user(),
            (string) $validated['success_url'],
            (string) $validated['cancel_url'],
            $idempotencyKey !== '' ? $idempotencyKey : null
        );

        return $this->success(data: $result, message: 'Checkout session created.');
    }

    public function getSubscriptionStatus(Request $request): JsonResponse
    {
        $status = $this->subscriptions->getSubscriptionStatus($request->user());

        return $this->success(data: $status);
    }

    public function cancelSubscription(Request $request): JsonResponse
    {
        $this->subscriptions->deactivateSubscription($request->user());

        return $this->success(message: 'Subscription cancelled.');
    }

    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = (string) $request->header('Stripe-Signature', '');
        $secret = (string) (config('services.stripe.webhook_secret') ?: config('cashier.webhook.secret', ''));

        if ($secret === '') {
            return $this->error('WEBHOOK_NOT_CONFIGURED', 'Stripe webhook secret is missing.', 500);
        }

        try {
            $event = Webhook::constructEvent($payload, $signature, $secret);
        } catch (UnexpectedValueException|SignatureVerificationException $exception) {
            return $this->error('WEBHOOK_VERIFICATION_FAILED', 'Invalid webhook signature.', 400);
        }

        $eventData = $event->toArray();
        $this->subscriptions->handleSubscriptionUpdated($eventData);

        return $this->success(message: 'Webhook processed.');
    }
}
