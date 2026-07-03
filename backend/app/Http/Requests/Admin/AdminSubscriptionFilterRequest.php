<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminSubscriptionFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'page' => 'integer|min:1',
            'pageSize' => 'integer|min:1|max:100',
            'status' => 'string|in:active,cancelled,expired,past_due',
            'tier' => 'string|in:free,basic,premium,enterprise',
            'subscriberType' => 'string|in:applicant,company',
            'paymentProvider' => 'string|in:stripe,apple,google',
            'search' => 'string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'status.in' => 'Status must be one of: active, cancelled, expired, past_due',
            'tier.in' => 'Tier must be one of: free, basic, premium, enterprise',
            'subscriberType.in' => 'Subscriber type must be either applicant or company',
            'paymentProvider.in' => 'Payment provider must be one of: stripe, apple, google',
            'pageSize.max' => 'Page size cannot exceed 100 records',
        ];
    }
}
