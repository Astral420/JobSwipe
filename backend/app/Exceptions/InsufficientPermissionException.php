<?php

namespace App\Exceptions;

use Exception;

class InsufficientPermissionException extends Exception
{
    public function __construct(
        public readonly string $requiredPermission,
        public readonly ?string $currentRole = null
    ) {
        parent::__construct("Insufficient permission: {$requiredPermission}");
    }

    public function render()
    {
        return response()->json([
            'success' => false,
            'message' => 'Permission denied',
            'code' => 'PERMISSION_DENIED',
            'required_permission' => $this->requiredPermission,
            'current_role' => $this->currentRole,
        ], 403);
    }
}
