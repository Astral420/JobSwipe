<?php

namespace App\Http\Requests\File;

use Illuminate\Foundation\Http\FormRequest;

class GenerateReadUrlRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'file_url' => ['required', 'url', 'max:2000'],
        ];
    }
}
