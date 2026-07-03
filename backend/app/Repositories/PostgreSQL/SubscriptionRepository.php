<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\IAPReceipt;
use App\Models\PostgreSQL\IAPTransaction;
use App\Models\PostgreSQL\Subscription;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubscriptionRepository
{
    public function create(array $data): Subscription
    {
        return Subscription::create($data);
    }

    public function findByProviderSubId(string $providerSubId, string $paymentProvider): ?Subscription
    {
        return Subscription::where('provider_sub_id', $providerSubId)
            ->where('payment_provider', $paymentProvider)
            ->first();
    }

    public function findActiveForUser(string $userId): ?Subscription
    {
        return Subscription::where('user_id', $userId)
            ->where('subscriber_type', 'applicant')
            ->where('status', 'active')
            ->first();
    }

    public function findByTransactionId(string $transactionId): ?Subscription
    {
        $transaction = IAPTransaction::where('transaction_id', $transactionId)
            ->first();

        if (! $transaction) {
            return null;
        }

        $receipt = IAPReceipt::where('transaction_id', $transactionId)
            ->where('payment_provider', $transaction->payment_provider)
            ->orderByDesc('verified_at')
            ->first();

        $providerSubId = (string) data_get(
            $receipt?->verification_response,
            'provider_sub_id',
            $transactionId
        );

        return Subscription::where('user_id', $transaction->user_id)
            ->where('subscriber_type', 'applicant')
            ->where('payment_provider', $transaction->payment_provider)
            ->where('provider_sub_id', $providerSubId)
            ->orderBy('created_at', 'desc')
            ->first();
    }

    public function update(Subscription $subscription, array $data): void
    {
        $subscription->update($data);
    }

    public function getAllForUser(string $userId): Collection
    {
        return Subscription::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Admin search with comprehensive filtering.
     * Supports filtering by status, tier, subscriber type, and search.
     *
     * Requirements: 4.1
     */
    public function searchAdmin(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $query = Subscription::query()
            ->with(['user', 'company']);

        // Filter by status
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Filter by tier
        if (! empty($filters['tier'])) {
            $query->where('tier', $filters['tier']);
        }

        // Filter by subscriber type
        if (! empty($filters['subscriberType'])) {
            $query->where('subscriber_type', $filters['subscriberType']);
        }

        // Filter by payment provider
        if (! empty($filters['paymentProvider'])) {
            $query->where('payment_provider', $filters['paymentProvider']);
        }

        // Search by user email or company name
        if (! empty($filters['search'])) {
            $searchTerm = $filters['search'];
            $query->where(function ($q) use ($searchTerm) {
                $q->whereHas('user', function ($userQuery) use ($searchTerm) {
                    $userQuery->where('email', 'ILIKE', "%{$searchTerm}%");
                })->orWhereHas('company', function ($companyQuery) use ($searchTerm) {
                    $companyQuery->where('name', 'ILIKE', "%{$searchTerm}%");
                });
            });
        }

        // Order by most recent first
        $query->orderBy('created_at', 'desc');

        return $query->paginate($perPage);
    }

    /**
     * Get revenue statistics for admin dashboard.
     * Calculates MRR, churn rate, and tier distribution.
     *
     * Requirements: 4.4
     */
    public function getRevenueStats(): array
    {
        // Calculate Monthly Recurring Revenue (MRR)
        $mrr = Subscription::where('status', 'active')
            ->where('subscriber_type', 'company')
            ->sum('amount');

        // Calculate churn rate (cancelled in last 30 days / active at start of period)
        $thirtyDaysAgo = now()->subDays(30);
        $cancelledCount = Subscription::where('status', 'cancelled')
            ->where('cancelled_at', '>=', $thirtyDaysAgo)
            ->count();

        $activeAtStart = Subscription::where('status', 'active')
            ->orWhere(function ($q) use ($thirtyDaysAgo) {
                $q->where('status', 'cancelled')
                    ->where('cancelled_at', '>=', $thirtyDaysAgo);
            })
            ->count();

        $churnRate = $activeAtStart > 0 ? ($cancelledCount / $activeAtStart) * 100 : 0;

        // Get tier distribution
        $tierDistribution = Subscription::where('status', 'active')
            ->select('tier', DB::raw('count(*) as count'))
            ->groupBy('tier')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->tier => $item->count];
            })
            ->toArray();

        // Get subscriber type distribution
        $subscriberTypeDistribution = Subscription::where('status', 'active')
            ->select('subscriber_type', DB::raw('count(*) as count'))
            ->groupBy('subscriber_type')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->subscriber_type => $item->count];
            })
            ->toArray();

        return [
            'mrr' => round($mrr, 2),
            'active_subscriptions' => Subscription::where('status', 'active')->count(),
            'churn_rate' => round($churnRate, 2),
            'tier_distribution' => $tierDistribution,
            'subscriber_type_distribution' => $subscriberTypeDistribution,
        ];
    }

    /**
     * Admin-initiated subscription cancellation.
     * Cancels subscription and records the reason.
     *
     * Requirements: 4.3, 4.6
     */
    public function adminCancelSubscription(string $subscriptionId, string $reason, string $actorId): bool
    {
        try {
            DB::beginTransaction();

            $subscription = Subscription::find($subscriptionId);

            if (! $subscription) {
                return false;
            }

            $subscription->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => $reason,
                'cancelled_by' => $actorId,
            ]);

            // Log audit trail
            $this->logAuditAction(
                action: 'admin_cancel_subscription',
                subscriptionId: $subscriptionId,
                actorId: $actorId,
                details: ['reason' => $reason]
            );

            DB::commit();

            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to cancel subscription', [
                'subscription_id' => $subscriptionId,
                'actor_id' => $actorId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Log audit trail for subscription actions.
     *
     * Requirements: 4.6
     */
    private function logAuditAction(string $action, string $subscriptionId, string $actorId, array $details): void
    {
        Log::channel('admin_audit')->info("Subscription action: {$action}", [
            'action' => $action,
            'subscription_id' => $subscriptionId,
            'actor_id' => $actorId,
            'details' => $details,
            'timestamp' => now()->toIso8601String(),
            'ip_address' => request()->ip(),
        ]);
    }
}
