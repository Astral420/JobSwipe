<?php

namespace App\Exceptions;

use Exception;

class InvalidRoleTransitionException extends Exception
{
    public function __construct(
        public readonly string $fromRole,
        public readonly string $toRole,
        public readonly string $reason
    ) {
        parent::__construct("Invalid role transition from {$fromRole} to {$toRole}: {$reason}");
    }

    public function render()
    {
        return response()->json([
            'success' => false,
            'message' => $this->getMessage(),
            'code' => 'INVALID_ROLE_TRANSITION',
            'from_role' => $this->fromRole,
            'to_role' => $this->toRole,
            'reason' => $this->reason,
        ], 422);
    }
}
