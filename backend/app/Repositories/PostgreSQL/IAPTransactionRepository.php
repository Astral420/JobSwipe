<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\IAPTransaction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class IAPTransactionRepository
{
    public function store(
        string $transactionId,
        string $paymentProvider,
        string $userId,
        string $productId
    ): IAPTransaction {
        return IAPTransaction::create([
            'transaction_id' => $transactionId,
            'payment_provider' => $paymentProvider,
            'user_id' => $userId,
            'product_id' => $productId,
        ]);
    }

    public function exists(string $transactionId, string $paymentProvider): bool
    {
        return IAPTransaction::where('transaction_id', $transactionId)
            ->where('payment_provider', $paymentProvider)
            ->exists();
    }

    public function findByTransactionId(string $transactionId, string $paymentProvider): ?IAPTransaction
    {
        return IAPTransaction::where('transaction_id', $transactionId)
            ->where('payment_provider', $paymentProvider)
            ->first();
    }

    /**
     * Admin search with comprehensive filtering.
     * Supports filtering by provider, status, user, and date range.
     *
     * Requirements: 5.1
     */
    public function searchAdmin(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $query = IAPTransaction::query()
            ->with(['user']);

        // Filter by payment provider
        if (! empty($filters['provider'])) {
            $query->where('payment_provider', $filters['provider']);
        }

        // Filter by status
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Filter by user
        if (! empty($filters['userId'])) {
            $query->where('user_id', $filters['userId']);
        }

        // Filter by date range
        if (! empty($filters['startDate'])) {
            $query->whereDate('created_at', '>=', $filters['startDate']);
        }

        if (! empty($filters['endDate'])) {
            $query->whereDate('created_at', '<=', $filters['endDate']);
        }

        // Search by transaction ID
        if (! empty($filters['search'])) {
            $searchTerm = $filters['search'];
            $query->where('transaction_id', 'ILIKE', "%{$searchTerm}%");
        }

        // Order by most recent first
        $query->orderBy('created_at', 'desc');

        return $query->paginate($perPage);
    }

    /**
     * Get detailed transaction information for admin view.
     *
     * Requirements: 5.2
     */
    public function getTransactionDetails(string $transactionId): ?array
    {
        $transaction = IAPTransaction::with(['user', 'receipts'])
            ->where('transaction_id', $transactionId)
            ->first();

        if (! $transaction) {
            return null;
        }

        return [
            'transaction' => $transaction,
            'receipt_count' => $transaction->receipts->count(),
            'latest_receipt' => $transaction->receipts->sortByDesc('verified_at')->first(),
        ];
    }
}
