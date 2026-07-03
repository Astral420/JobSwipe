<?php

namespace App\Jobs;

use App\Services\SubscriptionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RetryStripeWebhookEventsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(SubscriptionService $subscriptions): void
    {
        $processingTimeoutMinutes = max((int) config('services.stripe.webhook_processing_timeout_minutes', 5), 1);
        $maxAttempts = max((int) config('services.stripe.webhook_max_attempts', 5), 1);
        $staleCutoff = now()->subMinutes($processingTimeoutMinutes);

        $events = DB::table('stripe_webhook_events')
            ->where('attempts', '<', $maxAttempts)
            ->where(function ($query) use ($staleCutoff): void {
                $query->where('status', 'failed')
                    ->orWhere(function ($nested) use ($staleCutoff): void {
                        $nested->where('status', 'processing')
                            ->where('processing_started_at', '<', $staleCutoff);
                    });
            })
            ->orderBy('updated_at')
            ->limit(100)
            ->get();

        foreach ($events as $event) {
            $payload = is_string($event->payload) ? json_decode($event->payload, true) : null;

            if (! is_array($payload)) {
                DB::table('stripe_webhook_events')
                    ->where('id', $event->id)
                    ->update([
                        'attempts' => DB::raw('attempts + 1'),
                        'status' => 'failed',
                        'failed_at' => now(),
                        'last_error' => 'Retry skipped: webhook payload missing or invalid JSON.',
                        'processing_started_at' => null,
                        'updated_at' => now(),
                    ]);

                continue;
            }

            try {
                $subscriptions->handleSubscriptionUpdated($payload);
            } catch (\Throwable $exception) {
                Log::warning('Stripe webhook retry failed', [
                    'stripe_event_id' => $event->stripe_event_id,
                    'attempts' => $event->attempts,
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }
}
