<?php

namespace App\Exceptions;

use Exception;

class SelfModificationException extends Exception
{
    public function __construct(string $action)
    {
        parent::__construct("Cannot {$action} your own account");
    }

    public function render()
    {
        return response()->json([
            'success' => false,
            'message' => $this->getMessage(),
            'code' => 'SELF_MODIFICATION',
        ], 403);
    }
}
