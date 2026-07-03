<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminCompanyFilterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'page' => 'integer|min:1',
            'pageSize' => 'integer|min:1|max:100',
            'verificationStatus' => 'string|in:pending,approved,rejected',
            'trustLevel' => 'string|in:high,medium,low',
            'subscriptionTier' => 'string|in:free,basic,premium,enterprise',
            'status' => 'string|in:active,suspended',
            'search' => 'string|max:255',
        ];
    }
}
