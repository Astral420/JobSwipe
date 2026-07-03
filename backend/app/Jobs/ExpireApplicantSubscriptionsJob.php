<?php

namespace App\Jobs;

use App\Models\PostgreSQL\Subscription;
use App\Repositories\PostgreSQL\SubscriptionRepository;
use App\Services\IAP\ApplicantSubscriptionManager;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ExpireApplicantSubscriptionsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct() {}

    public function handle(
        SubscriptionRepository $subscriptions,
        ApplicantSubscriptionManager $subscriptionManager
    ): void {
        Log::info('ExpireApplicantSubscriptionsJob: Starting');

        // Find expired active subscriptions
        $expiredSubscriptions = Subscription::where('subscriber_type', 'applicant')
            ->where('status', 'active')
            ->where('current_period_end', '<', Carbon::now())
            ->get();

        Log::info('ExpireApplicantSubscriptionsJob: Found expired subscriptions', [
            'count' => $expiredSubscriptions->count(),
        ]);

        foreach ($expiredSubscriptions as $subscription) {
            try {
                $subscriptionManager->expire($subscription);

                Log::info('ExpireApplicantSubscriptionsJob: Expired subscription', [
                    'subscription_id' => $subscription->id,
                    'user_id' => $subscription->user_id,
                ]);
            } catch (\Exception $e) {
                Log::error('ExpireApplicantSubscriptionsJob: Failed to expire subscription', [
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Handle past_due subscriptions older than 7 days
        $gracePeriodDays = config('iap.past_due_grace_period_days', 7);
        $pastDueExpired = Subscription::where('subscriber_type', 'applicant')
            ->where('status', 'past_due')
            ->where('updated_at', '<', Carbon::now()->subDays($gracePeriodDays))
            ->get();

        Log::info('ExpireApplicantSubscriptionsJob: Found past_due subscriptions to expire', [
            'count' => $pastDueExpired->count(),
        ]);

        foreach ($pastDueExpired as $subscription) {
            try {
                $subscriptionManager->expire($subscription);

                Log::info('ExpireApplicantSubscriptionsJob: Expired past_due subscription', [
                    'subscription_id' => $subscription->id,
                    'user_id' => $subscription->user_id,
                ]);
            } catch (\Exception $e) {
                Log::error('ExpireApplicantSubscriptionsJob: Failed to expire past_due subscription', [
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('ExpireApplicantSubscriptionsJob: Completed');
    }
}
