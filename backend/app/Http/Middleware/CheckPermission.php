<?php

namespace App\Http\Middleware;

use App\Services\PermissionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function __construct(private PermissionService $permissions) {}

    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Authentication required',
                'code' => 'UNAUTHENTICATED',
            ], 401);
        }

        if (! $this->permissions->hasPermission($user, $permission)) {
            $availablePermissions = $this->permissions->getRolePermissions($user->role);

            return new JsonResponse([
                'success' => false,
                'message' => 'Permission denied',
                'code' => 'PERMISSION_DENIED',
                'required_permission' => $permission,
                'available_permissions' => $availablePermissions,
            ], 403);
        }

        // Add permission header to response
        $response = $next($request);
        if ($response instanceof JsonResponse) {
            $response->headers->set('X-Permission-Required', $permission);
        }

        return $response;
    }
}
