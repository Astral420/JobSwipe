<?php

namespace App\Http\Controllers\Webhook;

use App\Exceptions\IAPException;
use App\Http\Controllers\Controller;
use App\Services\IAP\AppleWebhookVerifierService;
use App\Services\IAPService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AppleWebhookController extends Controller
{
    public function __construct(
        private IAPService $iapService,
        private AppleWebhookVerifierService $verifier,
    ) {}

    /**
     * Handle Apple server notification
     * POST /api/v1/webhooks/apple-iap
     */
    public function handleNotification(Request $request): JsonResponse
    {
        try {
            $verifiedNotification = $this->verifier->verify($request->all());

            Log::info('Apple webhook received', [
                'notification_type' => $verifiedNotification['event_type'] ?? 'unknown',
                'event_id' => $verifiedNotification['event_id'] ?? null,
            ]);

            $this->iapService->processAppleWebhook($verifiedNotification);

            return $this->success(['status' => 'accepted'], 'Webhook received');
        } catch (IAPException $e) {
            Log::warning('Apple webhook verification failed', [
                'error_code' => $e->errorCode,
                'error' => $e->getMessage(),
            ]);

            return $this->error($e->errorCode, 'Webhook verification failed', $e->statusCode);
        } catch (\Exception $e) {
            Log::error('Apple webhook processing failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Return 200 to prevent Apple from retrying on our application errors
            return $this->error('WEBHOOK_PROCESSING_FAILED', 'Webhook processing failed', 200);
        }
    }
}
