<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;

class CreateJobPostingRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only company_admin and hr roles can create job postings
        return in_array($this->user()->role, ['company_admin', 'hr']);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'min:100'],
            'work_type' => ['required', 'in:remote,hybrid,on_site'],
            'employment_type' => ['required', 'in:full_time,part_time,contract,internship'],
            'location' => ['required_if:work_type,hybrid,on_site', 'nullable', 'string', 'max:255'],
            'location_city' => ['nullable', 'string', 'max:100'],
            'location_region' => ['nullable', 'string', 'max:100'],
            'salary_min' => ['nullable', 'numeric', 'min:0'],
            'salary_max' => ['nullable', 'numeric', 'min:0', 'gte:salary_min'],
            'salary_is_hidden' => ['boolean'],
            'salary_period' => ['sometimes', 'in:monthly,yearly'],
            'interview_template' => ['required', 'string', 'max:1000'],
            'skills' => ['required', 'array', 'min:1', 'max:20'],
            'skills.*.name' => ['required', 'string', 'max:100'],
            'skills.*.type' => ['required', 'in:hard,soft'],
        ];
    }

    public function messages(): array
    {
        return [
            'description.min' => 'Job description must be at least 100 characters to help candidates understand the role.',
            'work_type.in' => 'Work type must be remote, hybrid, or on_site.',
            'location.required_if' => 'Location is required for hybrid and on-site positions.',
            'salary_max.gte' => 'Maximum salary must be greater than or equal to minimum salary.',
            'skills.required' => 'At least one skill is required.',
            'skills.max' => 'You can add a maximum of 20 skills per job posting.',
            'skills.*.type.in' => 'Skill type must be either hard or soft.',
            'interview_template.required' => 'An interview template is required to screen candidates.',
        ];
    }
}
