<?php

namespace App\Http\Requests\Profile;

use App\Services\HRProfileService;
use Illuminate\Foundation\Http\FormRequest;

class HRProfileSetupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Role check handled by middleware
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'job_title' => ['required', 'string', 'in:'.implode(',', HRProfileService::JOB_TITLES)],
            'custom_job_title' => ['sometimes', 'nullable', 'string', 'max:150'],
            'photo_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        $presets = implode(', ', HRProfileService::JOB_TITLES);

        return [
            'first_name.required' => 'First name is required.',
            'first_name.max' => 'First name must not exceed 100 characters.',
            'last_name.required' => 'Last name is required.',
            'last_name.max' => 'Last name must not exceed 100 characters.',
            'job_title.required' => 'Job title is required.',
            'job_title.in' => "Job title must be one of: {$presets}.",
            'custom_job_title.max' => 'Custom job title must not exceed 150 characters.',
            'photo_url.url' => 'Photo URL must be a valid URL.',
        ];
    }
}
