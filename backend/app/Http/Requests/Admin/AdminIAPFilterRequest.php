<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminIAPFilterRequest extends FormRequest
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
            'provider' => 'string|in:apple,google',
            'status' => 'string|in:pending,completed,failed,refunded',
            'userId' => 'string|uuid',
            'startDate' => 'date',
            'endDate' => 'date|after_or_equal:startDate',
            'search' => 'string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'provider.in' => 'Provider must be either apple or google',
            'status.in' => 'Status must be one of: pending, completed, failed, refunded',
            'userId.uuid' => 'User ID must be a valid UUID',
            'endDate.after_or_equal' => 'End date must be after or equal to start date',
            'pageSize.max' => 'Page size cannot exceed 100 records',
        ];
    }
}
