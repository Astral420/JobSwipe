<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;

class CreateInviteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Role check handled by middleware
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', 'in:company_admin,hr'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'An email address is required.',
            'email.email' => 'Please provide a valid email address.',
            'role.required' => 'A role is required.',
            'role.in' => 'Role must be one of: company_admin, hr.',
        ];
    }
}
