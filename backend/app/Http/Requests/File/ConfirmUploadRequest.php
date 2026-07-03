<?php

namespace App\Http\Requests\File;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file_url' => ['required', 'string', 'max:2000'],
        ];
    }
}
