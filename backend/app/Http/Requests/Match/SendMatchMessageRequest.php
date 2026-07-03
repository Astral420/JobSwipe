<?php

namespace App\Http\Requests\Match;

use Illuminate\Foundation\Http\FormRequest;

class SendMatchMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:2000'],
            'client_message_id' => ['nullable', 'uuid'],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required' => 'Message body is required.',
            'body.max' => 'Message body cannot exceed 2000 characters.',
            'client_message_id.uuid' => 'Client message ID must be a valid UUID.',
        ];
    }
}
