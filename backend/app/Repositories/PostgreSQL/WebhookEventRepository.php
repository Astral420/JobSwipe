<?php

namespace App\Repositories\PostgreSQL;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WebhookEventRepository
{
    /**
     * Reserve a webhook event ID for deduplication.
     * Returns true if the event was successfully inserted (first time processing).
     * Returns false if the event already exists (duplicate webhook).
     */
    public function reserve(
        string $eventId,
        string $paymentProvider,
        string $eventType
    ): bool {
        try {
            DB::table('iap_webhook_events')->insert([
                'event_id' => $eventId,
                'payment_provider' => $paymentProvider,
                'event_type' => $eventType,
                'created_at' => now(),
            ]);

            return true;
        } catch (QueryException $e) {
            // Check for unique constraint violation (SQLSTATE 23000 or 23505)
            if (in_array($e->getCode(), ['23000', '23505'])) {
                return false;
            }

            // Re-throw if it's a different error
            throw $e;
        }
    }

    /**
     * List webhook events with pagination.
     *
     * Requirements: 5.3
     */
    public function listEvents(int $perPage = 20): LengthAwarePaginator
    {
        return DB::table('iap_webhook_events')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Retry a failed webhook event.
     * Increments retry count and updates processing status.
     *
     * Requirements: 5.4
     */
    public function retryEvent(string $eventId, string $actorId): bool
    {
        try {
            DB::beginTransaction();

            $event = DB::table('iap_webhook_events')
                ->where('event_id', $eventId)
                ->first();

            if (! $event) {
                return false;
            }

            $retryCount = ($event->retry_count ?? 0) + 1;
            $isFlagged = $retryCount >= 3;

            DB::table('iap_webhook_events')
                ->where('event_id', $eventId)
                ->update([
                    'retry_count' => $retryCount,
                    'is_flagged' => $isFlagged,
                    'last_retry_at' => now(),
                    'retried_by' => $actorId,
                    'updated_at' => now(),
                ]);

            // Log audit trail
            $this->logAuditAction(
                action: 'retry_webhook_event',
                eventId: $eventId,
                actorId: $actorId,
                details: ['retry_count' => $retryCount, 'is_flagged' => $isFlagged]
            );

            DB::commit();

            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to retry webhook event', [
                'event_id' => $eventId,
                'actor_id' => $actorId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Get detailed webhook event information.
     *
     * Requirements: 5.3
     */
    public function getEventDetails(string $eventId): ?object
    {
        return DB::table('iap_webhook_events')
            ->where('event_id', $eventId)
            ->first();
    }

    /**
     * Get webhook processing metrics.
     *
     * Requirements: 5.5
     */
    public function getProcessingMetrics(): array
    {
        $total = DB::table('iap_webhook_events')->count();
        $flagged = DB::table('iap_webhook_events')->where('is_flagged', true)->count();
        $successRate = $total > 0 ? (($total - $flagged) / $total) * 100 : 100;

        $avgProcessingTime = DB::table('iap_webhook_events')
            ->whereNotNull('processing_time_ms')
            ->avg('processing_time_ms');

        return [
            'total_events' => $total,
            'flagged_events' => $flagged,
            'success_rate' => round($successRate, 2),
            'avg_processing_time_ms' => round($avgProcessingTime ?? 0, 2),
        ];
    }

    /**
     * Log audit trail for webhook actions.
     *
     * Requirements: 5.4
     */
    private function logAuditAction(string $action, string $eventId, string $actorId, array $details): void
    {
        Log::channel('admin_audit')->info("Webhook action: {$action}", [
            'action' => $action,
            'event_id' => $eventId,
            'actor_id' => $actorId,
            'details' => $details,
            'timestamp' => now()->toIso8601String(),
            'ip_address' => request()->ip(),
        ]);
    }
}
