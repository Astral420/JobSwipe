<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

class IAPException extends Exception
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $statusCode = 400,
    ) {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $this->message,
            'code' => $this->errorCode,
        ], $this->statusCode);
    }
}
