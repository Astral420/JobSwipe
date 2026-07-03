<?php

namespace App\Http\Controllers\Webhook;

use App\Exceptions\IAPException;
use App\Http\Controllers\Controller;
use App\Services\IAP\GooglePubSubWebhookVerifierService;
use App\Services\IAPService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleWebhookController extends Controller
{
    public function __construct(
        private IAPService $iapService,
        private GooglePubSubWebhookVerifierService $verifier,
    ) {}

    /**
     * Handle Google Play notification
     * POST /api/v1/webhooks/google-play
     */
    public function handleNotification(Request $request): JsonResponse
    {
        try {
            $verifiedNotification = $this->verifier->verify(
                $request->header('Authorization'),
                $request->all()
            );

            Log::info('Google Play webhook received', [
                'message_id' => $verifiedNotification['event_id'] ?? 'unknown',
                'notification_type' => $verifiedNotification['notification_type'] ?? 'unknown',
            ]);

            $this->iapService->processGoogleWebhook($verifiedNotification);

            return $this->success(['status' => 'accepted'], 'Webhook received');
        } catch (IAPException $e) {
            Log::warning('Google Play webhook verification failed', [
                'error_code' => $e->errorCode,
                'error' => $e->getMessage(),
            ]);

            return $this->error($e->errorCode, 'Webhook verification failed', $e->statusCode);
        } catch (\Exception $e) {
            Log::error('Google Play webhook processing failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Return 200 to prevent Google from retrying on our application errors
            return $this->error('WEBHOOK_PROCESSING_FAILED', 'Webhook processing failed', 200);
        }
    }
}
