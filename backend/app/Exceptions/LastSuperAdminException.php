<?php

namespace App\Exceptions;

use Exception;

class LastSuperAdminException extends Exception
{
    public function __construct()
    {
        parent::__construct('Cannot demote or deactivate the last super admin');
    }

    public function render()
    {
        return response()->json([
            'success' => false,
            'message' => $this->getMessage(),
            'code' => 'LAST_SUPER_ADMIN',
        ], 403);
    }
}
