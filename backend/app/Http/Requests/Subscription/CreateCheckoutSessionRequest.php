<?php

namespace App\Http\Requests\Subscription;

use Illuminate\Foundation\Http\FormRequest;

class CreateCheckoutSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'success_url' => ['required', 'url', 'max:2000'],
            'cancel_url' => ['required', 'url', 'max:2000'],
        ];
    }
}
