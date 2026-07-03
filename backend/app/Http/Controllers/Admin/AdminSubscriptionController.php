<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminCancelSubscriptionRequest;
use App\Http\Requests\Admin\AdminSubscriptionFilterRequest;
use App\Repositories\PostgreSQL\SubscriptionRepository;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Stripe\Stripe;
use Stripe\Subscription as StripeSubscription;

class AdminSubscriptionController extends Controller
{
    public function __construct(
        private SubscriptionRepository $subscriptions,
        private NotificationService $notifications,
    ) {
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    /**
     * List subscriptions with admin filtering.
     *
     * Requirements: 4.1
     */
    public function index(AdminSubscriptionFilterRequest $request): JsonResponse
    {
        try {
            $subscriptions = $this->subscriptions->searchAdmin(
                $request->validated(),
                $request->input('pageSize', 20)
            );

            return $this->success($subscriptions, 'Subscriptions retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Admin subscription listing failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to retrieve subscriptions', 500);
        }
    }

    /**
     * Get detailed subscription information.
     *
     * Requirements: 4.2
     */
    public function show(string $id): JsonResponse
    {
        try {
            $subscription = \App\Models\PostgreSQL\Subscription::with(['user', 'company'])->find($id);

            if (! $subscription) {
                return $this->error('SUBSCRIPTION_NOT_FOUND', 'Subscription not found', 404);
            }

            return $this->success($subscription, 'Subscription retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Admin subscription detail retrieval failed', [
                'subscription_id' => $id,
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to retrieve subscription', 500);
        }
    }

    /**
     * Admin-initiated subscription cancellation.
     *
     * Requirements: 4.3, 4.5
     */
    public function cancel(string $id, AdminCancelSubscriptionRequest $request): JsonResponse
    {
        try {
            $subscription = \App\Models\PostgreSQL\Subscription::find($id);

            if (! $subscription) {
                return $this->error('SUBSCRIPTION_NOT_FOUND', 'Subscription not found', 404);
            }

            if ($subscription->status === 'cancelled') {
                return $this->error('SUBSCRIPTION_ALREADY_CANCELLED', 'Subscription is already cancelled', 400);
            }

            // Cancel in Stripe if it's a Stripe subscription
            if ($subscription->payment_provider === 'stripe' && $subscription->provider_sub_id) {
                try {
                    StripeSubscription::update(
                        $subscription->provider_sub_id,
                        ['cancel_at_period_end' => true]
                    );
                } catch (\Exception $e) {
                    Log::warning('Failed to cancel subscription in Stripe', [
                        'subscription_id' => $id,
                        'provider_sub_id' => $subscription->provider_sub_id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Cancel in local database
            $result = $this->subscriptions->adminCancelSubscription(
                $id,
                $request->input('reason'),
                auth()->id()
            );

            if (! $result) {
                return $this->error('CANCEL_FAILED', 'Failed to cancel subscription', 500);
            }

            // Notify user about cancellation
            if ($subscription->user_id) {
                $this->notifications->create(
                    userId: $subscription->user_id,
                    type: 'subscription_admin_cancelled',
                    title: 'Subscription Cancelled',
                    body: "Your subscription has been cancelled by an administrator. Reason: {$request->input('reason')}",
                    data: [
                        'subscription_id' => $id,
                        'reason' => $request->input('reason'),
                    ]
                );
            }

            return $this->success(null, 'Subscription cancelled successfully.');
        } catch (\Exception $e) {
            Log::error('Admin subscription cancellation failed', [
                'subscription_id' => $id,
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to cancel subscription', 500);
        }
    }

    /**
     * Get revenue statistics for admin dashboard.
     *
     * Requirements: 4.4
     */
    public function revenueStats(): JsonResponse
    {
        try {
            $stats = $this->subscriptions->getRevenueStats();

            return $this->success($stats, 'Revenue statistics retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Admin revenue statistics retrieval failed', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to retrieve revenue statistics', 500);
        }
    }
}
