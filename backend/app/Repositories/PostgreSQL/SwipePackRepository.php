<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\SwipePack;
use Illuminate\Support\Collection;

class SwipePackRepository
{
    public function create(array $data): SwipePack
    {
        return SwipePack::create($data);
    }

    public function findByTransactionId(string $transactionId): ?SwipePack
    {
        return SwipePack::where('provider_payment_id', $transactionId)
            ->first();
    }

    public function findByProviderPaymentId(string $providerPaymentId): ?SwipePack
    {
        return SwipePack::where('provider_payment_id', $providerPaymentId)->first();
    }

    public function getAllForApplicant(string $applicantId): Collection
    {
        return SwipePack::where('applicant_id', $applicantId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getTotalPurchasedForApplicant(string $applicantId): int
    {
        return (int) SwipePack::where('applicant_id', $applicantId)->sum('quantity');
    }

    public function markRefunded(SwipePack $swipePack, ?string $refundReference = null): SwipePack
    {
        $swipePack->update([
            'refunded_at' => now(),
            'refund_reference' => $refundReference,
        ]);

        return $swipePack->fresh();
    }
}
