<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class SubmitVerificationDocumentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'verification_documents' => ['required', 'array', 'min:1'],
            'verification_documents.*' => ['required', 'url', 'max:2000'],
        ];
    }
}
