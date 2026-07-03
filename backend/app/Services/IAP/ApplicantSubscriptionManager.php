<?php

namespace App\Services\IAP;

use App\Models\PostgreSQL\ApplicantProfile;
use App\Models\PostgreSQL\Subscription;
use App\Repositories\PostgreSQL\ApplicantProfileRepository;
use App\Repositories\PostgreSQL\SubscriptionRepository;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ApplicantSubscriptionManager
{
    public function __construct(
        private SubscriptionRepository $subscriptions,
        private ApplicantProfileRepository $applicantProfiles,
    ) {}

    /**
     * Activate new subscription for applicant
     */
    public function activate(
        string $userId,
        string $tier,
        string $paymentProvider,
        string $providerSubId,
        string $transactionId,
        float $amountPaid,
        Carbon $purchaseDate
    ): Subscription {
        return DB::transaction(function () use (
            $userId,
            $tier,
            $paymentProvider,
            $providerSubId,
            $transactionId,
            $amountPaid,
            $purchaseDate
        ) {
            // Check for existing active subscription
            $existingSubscription = $this->subscriptions->findActiveForUser($userId);
            if ($existingSubscription) {
                throw new \App\Exceptions\SubscriptionException(
                    'SUBSCRIPTION_ALREADY_ACTIVE',
                    'User already has an active subscription',
                    409
                );
            }

            // Create subscription record
            $subscription = $this->subscriptions->create([
                'user_id' => $userId,
                'subscriber_type' => 'applicant',
                'tier' => $tier,
                'billing_cycle' => 'monthly',
                'amount_paid' => $amountPaid,
                'currency' => 'PHP',
                'payment_provider' => $paymentProvider,
                'provider_sub_id' => $providerSubId,
                'status' => 'active',
                'current_period_start' => $purchaseDate,
                'current_period_end' => $purchaseDate->copy()->addDays(30),
            ]);

            // Update applicant profile
            $applicantProfile = $this->applicantProfiles->findByUserId($userId);
            if ($applicantProfile) {
                $this->updateApplicantProfile($applicantProfile, $tier, 'active');
            }

            Log::info('Applicant subscription activated', [
                'user_id' => $userId,
                'subscription_id' => $subscription->id,
                'tier' => $tier,
                'payment_provider' => $paymentProvider,
                'transaction_id' => $transactionId,
            ]);

            return $subscription;
        });
    }

    /**
     * Renew existing subscription (from webhook)
     */
    public function renew(string $providerSubId, string $paymentProvider, Carbon $renewalDate): void
    {
        DB::transaction(function () use ($providerSubId, $paymentProvider) {
            $subscription = $this->subscriptions->findByProviderSubId($providerSubId, $paymentProvider);

            if (! $subscription) {
                Log::warning('Subscription not found for renewal', [
                    'provider_sub_id' => $providerSubId,
                    'payment_provider' => $paymentProvider,
                ]);

                return;
            }

            // Create new subscription record for the renewal period
            $newSubscription = $this->subscriptions->create([
                'user_id' => $subscription->user_id,
                'subscriber_type' => 'applicant',
                'tier' => $subscription->tier,
                'billing_cycle' => $subscription->billing_cycle,
                'amount_paid' => $subscription->amount_paid,
                'currency' => $subscription->currency,
                'payment_provider' => $subscription->payment_provider,
                'provider_sub_id' => $subscription->provider_sub_id,
                'status' => 'active',
                'current_period_start' => $subscription->current_period_end,
                'current_period_end' => $subscription->current_period_end->copy()->addDays(30),
            ]);

            // Update old subscription status
            $this->subscriptions->update($subscription, [
                'status' => 'expired',
            ]);

            // Ensure applicant profile is active
            $applicantProfile = $this->applicantProfiles->findByUserId($subscription->user_id);
            if ($applicantProfile) {
                $this->updateApplicantProfile($applicantProfile, $subscription->tier, 'active');
            }

            Log::info('Applicant subscription renewed', [
                'user_id' => $subscription->user_id,
                'old_subscription_id' => $subscription->id,
                'new_subscription_id' => $newSubscription->id,
                'provider_sub_id' => $providerSubId,
            ]);
        });
    }

    /**
     * Mark subscription as expired
     */
    public function expire(Subscription $subscription): void
    {
        DB::transaction(function () use ($subscription) {
            // Update subscription status
            $this->subscriptions->update($subscription, [
                'status' => 'expired',
            ]);

            // Update applicant profile
            $applicantProfile = $this->applicantProfiles->findByUserId($subscription->user_id);
            if ($applicantProfile) {
                $this->applicantProfiles->update($applicantProfile, [
                    'subscription_status' => 'inactive',
                    'daily_swipe_limit' => config('iap.free_tier_daily_limit', 20),
                ]);
            }

            Log::info('Applicant subscription expired', [
                'user_id' => $subscription->user_id,
                'subscription_id' => $subscription->id,
            ]);
        });
    }

    /**
     * Cancel subscription (preserve access until period end)
     */
    public function cancel(Subscription $subscription): void
    {
        DB::transaction(function () use ($subscription) {
            // Update subscription status
            $this->subscriptions->update($subscription, [
                'status' => 'cancelled',
            ]);

            // Update applicant profile subscription_status to cancelled
            // but preserve current_period_end (access continues until then)
            $applicantProfile = $this->applicantProfiles->findByUserId($subscription->user_id);
            if ($applicantProfile) {
                $this->applicantProfiles->update($applicantProfile, [
                    'subscription_status' => 'cancelled',
                ]);
            }

            Log::info('Applicant subscription cancelled', [
                'user_id' => $subscription->user_id,
                'subscription_id' => $subscription->id,
                'access_until' => $subscription->current_period_end,
            ]);
        });
    }

    /**
     * Handle failed renewal - mark as past_due
     */
    public function markPastDue(string $providerSubId, string $paymentProvider): void
    {
        DB::transaction(function () use ($providerSubId, $paymentProvider) {
            $subscription = $this->subscriptions->findByProviderSubId($providerSubId, $paymentProvider);

            if (! $subscription) {
                Log::warning('Subscription not found for past_due marking', [
                    'provider_sub_id' => $providerSubId,
                    'payment_provider' => $paymentProvider,
                ]);

                return;
            }

            // Update subscription status
            $this->subscriptions->update($subscription, [
                'status' => 'past_due',
            ]);

            // Update applicant profile
            $applicantProfile = $this->applicantProfiles->findByUserId($subscription->user_id);
            if ($applicantProfile) {
                $this->applicantProfiles->update($applicantProfile, [
                    'subscription_status' => 'past_due',
                ]);
            }

            Log::info('Applicant subscription marked past_due', [
                'user_id' => $subscription->user_id,
                'subscription_id' => $subscription->id,
                'provider_sub_id' => $providerSubId,
            ]);
        });
    }

    /**
     * Process refund - revoke benefits immediately
     */
    public function refund(string $transactionId): void
    {
        DB::transaction(function () use ($transactionId) {
            $subscription = $this->subscriptions->findByTransactionId($transactionId);

            if (! $subscription) {
                Log::warning('Subscription not found for refund', [
                    'transaction_id' => $transactionId,
                ]);

                return;
            }

            $this->refundSubscription($subscription, $transactionId);
        });
    }

    /**
     * Process refund by subscription record
     */
    public function refundSubscription(Subscription $subscription, ?string $reference = null): void
    {
        DB::transaction(function () use ($subscription, $reference) {
            $this->subscriptions->update($subscription, [
                'status' => 'refunded',
            ]);

            $applicantProfile = $this->applicantProfiles->findByUserId($subscription->user_id);
            if ($applicantProfile) {
                $this->applicantProfiles->update($applicantProfile, [
                    'subscription_status' => 'inactive',
                    'daily_swipe_limit' => config('iap.free_tier_daily_limit', 20),
                ]);
            }

            Log::warning('Applicant subscription refunded', [
                'user_id' => $subscription->user_id,
                'subscription_id' => $subscription->id,
                'refund_reference' => $reference,
            ]);
        });
    }

    /**
     * Update applicant profile subscription fields
     */
    private function updateApplicantProfile(
        ApplicantProfile $profile,
        string $tier,
        string $status
    ): void {
        $updates = [
            'subscription_tier' => $tier,
            'subscription_status' => $status,
        ];

        // Set daily swipe limit based on tier and status
        if ($tier === 'pro' && $status === 'active') {
            $updates['daily_swipe_limit'] = config('iap.pro_tier_daily_limit', 999);
        } elseif ($status === 'inactive') {
            $updates['daily_swipe_limit'] = config('iap.free_tier_daily_limit', 20);
        }

        $this->applicantProfiles->update($profile, $updates);
    }
}
