<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminJobFilterRequest extends FormRequest
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
            'status' => 'string|in:active,closed,expired,flagged',
            'companyId' => 'string|uuid',
            'startDate' => 'date',
            'endDate' => 'date|after_or_equal:startDate',
            'isFlagged' => 'boolean',
            'search' => 'string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'status.in' => 'Status must be one of: active, closed, expired, flagged',
            'companyId.uuid' => 'Company ID must be a valid UUID',
            'endDate.after_or_equal' => 'End date must be after or equal to start date',
            'pageSize.max' => 'Page size cannot exceed 100 records',
        ];
    }
}
