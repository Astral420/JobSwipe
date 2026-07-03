<?php

namespace App\Http\Requests\IAP;

use Illuminate\Foundation\Http\FormRequest;

class PurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->role === 'applicant';
    }

    public function rules(): array
    {
        return [
            'payment_provider' => 'required|in:apple_iap,google_play',
            'product_id' => 'required|string|max:100',
            'receipt_data' => 'required|array',
            'idempotency_key' => 'nullable|string|max:255',
        ];
    }
}
