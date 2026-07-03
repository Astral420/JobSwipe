<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateApplicantSkillsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'applicant';
    }

    public function rules(): array
    {
        return [
            'hard_skills' => ['nullable', 'array'],
            'hard_skills.*' => ['string', 'max:100'],
            'soft_skills' => ['nullable', 'array'],
            'soft_skills.*' => ['string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'hard_skills.*.string' => 'Each hard skill must be a text value.',
            'hard_skills.*.max' => 'Each hard skill must not exceed 100 characters.',
            'soft_skills.*.string' => 'Each soft skill must be a text value.',
            'soft_skills.*.max' => 'Each soft skill must not exceed 100 characters.',
        ];
    }
}
