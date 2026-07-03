<?php

namespace App\Http\Requests\Review;

use Illuminate\Foundation\Http\FormRequest;

class SubmitReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Ensure this request expects JSON response
        $this->headers->set('Accept', 'application/json');

        // Sanitize review_text to prevent XSS
        if ($this->has('review_text') && $this->review_text) {
            $this->merge([
                'review_text' => strip_tags($this->review_text),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'company_id' => ['required', 'uuid', 'exists:company_profiles,id'],
            'job_posting_id' => ['required', 'uuid', 'exists:job_postings,id'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'review_text' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'company_id.required' => 'Company ID is required.',
            'company_id.uuid' => 'Company ID must be a valid UUID.',
            'company_id.exists' => 'Company not found.',
            'job_posting_id.required' => 'Job posting ID is required.',
            'job_posting_id.uuid' => 'Job posting ID must be a valid UUID.',
            'job_posting_id.exists' => 'Job posting not found.',
            'rating.required' => 'Rating is required.',
            'rating.integer' => 'Rating must be an integer.',
            'rating.between' => 'Rating must be between 1 and 5.',
            'review_text.max' => 'Review text cannot exceed 1000 characters.',
        ];
    }
}
