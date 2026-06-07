<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateApplicantBasicInfoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'applicant';
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'bio' => ['nullable', 'string', 'max:500'],
            'location' => ['required', 'string', 'max:255'],
            'location_city' => ['nullable', 'string', 'max:100'],
            'location_country' => ['nullable', 'string', 'max:100'],
            'location_region' => ['nullable', 'string', 'max:100'],
        ];
    }
}
