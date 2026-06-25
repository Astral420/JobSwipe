<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;

class HRSwipeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['hr', 'company_admin'], true);
    }

    public function rules(): array
    {
        return [
            'message' => ['nullable', 'string',
                'min:10', 'max:1000'],

        ];
    }
}
