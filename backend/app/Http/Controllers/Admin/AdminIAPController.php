<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminIAPFilterRequest;
use App\Repositories\PostgreSQL\IAPTransactionRepository;
use App\Repositories\PostgreSQL\WebhookEventRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminIAPController extends Controller
{
    public function __construct(
        private IAPTransactionRepository $transactions,
        private WebhookEventRepository $webhookEvents,
    ) {}

    /**
     * List IAP transactions with admin filtering.
     *
     * Requirements: 5.1
     */
    public function transactions(AdminIAPFilterRequest $request): JsonResponse
    {
        try {
            $transactions = $this->transactions->searchAdmin(
                $request->validated(),
                $request->input('pageSize', 20)
            );

            return $this->success($transactions, 'IAP transactions retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Admin IAP transaction listing failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to retrieve IAP transactions', 500);
        }
    }

    /**
     * Get detailed IAP transaction information.
     *
     * Requirements: 5.2
     */
    public function transactionDetail(string $transactionId): JsonResponse
    {
        try {
            $details = $this->transactions->getTransactionDetails($transactionId);

            if (! $details) {
                return $this->error('TRANSACTION_NOT_FOUND', 'IAP transaction not found', 404);
            }

            return $this->success($details, 'Transaction details retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Admin IAP transaction detail retrieval failed', [
                'transaction_id' => $transactionId,
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to retrieve transaction details', 500);
        }
    }

    /**
     * List webhook events with pagination.
     *
     * Requirements: 5.3
     */
    public function webhookEvents(Request $request): JsonResponse
    {
        try {
            $events = $this->webhookEvents->listEvents(
                $request->input('pageSize', 20)
            );

            return $this->success($events, 'Webhook events retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Admin webhook event listing failed', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to retrieve webhook events', 500);
        }
    }

    /**
     * Retry a failed webhook event.
     *
     * Requirements: 5.4, 5.6
     */
    public function retryWebhook(string $eventId): JsonResponse
    {
        try {
            $event = $this->webhookEvents->getEventDetails($eventId);

            if (! $event) {
                return $this->error('WEBHOOK_EVENT_NOT_FOUND', 'Webhook event not found', 404);
            }

            $result = $this->webhookEvents->retryEvent($eventId, auth()->id());

            if (! $result) {
                return $this->error('WEBHOOK_RETRY_FAILED', 'Failed to retry webhook event', 500);
            }

            // Check if event is now flagged after retry
            $updatedEvent = $this->webhookEvents->getEventDetails($eventId);
            $message = $updatedEvent->is_flagged
                ? 'Webhook retry initiated. Event flagged for manual review after 3 attempts.'
                : 'Webhook retry initiated successfully.';

            return $this->success([
                'event_id' => $eventId,
                'retry_count' => $updatedEvent->retry_count,
                'is_flagged' => $updatedEvent->is_flagged,
            ], $message);
        } catch (\Exception $e) {
            Log::error('Admin webhook retry failed', [
                'event_id' => $eventId,
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to retry webhook event', 500);
        }
    }

    /**
     * Get webhook processing metrics.
     *
     * Requirements: 5.5
     */
    public function webhookMetrics(): JsonResponse
    {
        try {
            $metrics = $this->webhookEvents->getProcessingMetrics();

            return $this->success($metrics, 'Webhook metrics retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Admin webhook metrics retrieval failed', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to retrieve webhook metrics', 500);
        }
    }
}
