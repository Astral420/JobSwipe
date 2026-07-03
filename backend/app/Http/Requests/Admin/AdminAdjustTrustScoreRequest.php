<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminAdjustTrustScoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'score' => 'required|numeric|min:0|max:100',
            'reason' => 'required|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'score.required' => 'Trust score is required',
            'score.numeric' => 'Trust score must be a number',
            'score.min' => 'Trust score cannot be less than 0',
            'score.max' => 'Trust score cannot exceed 100',
            'reason.required' => 'A reason for adjustment is required',
            'reason.max' => 'Reason cannot exceed 500 characters',
        ];
    }
}
