<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;

class BulkInviteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Role check handled by middleware
    }

    public function rules(): array
    {
        return [
            'emails' => ['required', 'array', 'min:1', 'max:20'],
            'emails.*' => ['required', 'email', 'max:255'],
            'role' => ['required', 'in:company_admin,hr'],
        ];
    }

    public function messages(): array
    {
        return [
            'emails.required' => 'At least one email address is required.',
            'emails.array' => 'Emails must be provided as an array.',
            'emails.max' => 'A maximum of 20 email addresses can be invited at once.',
            'emails.*.email' => 'Each entry must be a valid email address.',
            'role.required' => 'A role is required.',
            'role.in' => 'Role must be one of: company_admin, hr.',
        ];
    }
}
