<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class CompleteOnboardingStepRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'step' => ['required', 'integer', 'min:1'],
            'step_data' => ['nullable', 'array'],
        ];
    }
}
