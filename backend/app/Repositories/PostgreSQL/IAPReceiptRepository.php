<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\IAPReceipt;

class IAPReceiptRepository
{
    public function store(
        string $transactionId,
        string $paymentProvider,
        string $userId,
        string $productId,
        array $rawReceiptData,
        array $verificationResponse
    ): IAPReceipt {
        return IAPReceipt::create([
            'transaction_id' => $transactionId,
            'payment_provider' => $paymentProvider,
            'user_id' => $userId,
            'product_id' => $productId,
            'raw_receipt_data' => $rawReceiptData,
            'verification_response' => $verificationResponse,
            'verified_at' => now(),
        ]);
    }
}
