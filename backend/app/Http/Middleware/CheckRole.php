<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Authentication required',
                'code' => 'UNAUTHENTICATED',
            ], 401);
        }

        // Check if user is active
        if (! $user->is_active) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Account deactivated',
                'code' => 'ACCOUNT_DEACTIVATED',
            ], 403);
        }

        // Super admin has access to everything
        if ($user->role === 'super_admin') {
            $response = $next($request);
            if ($response instanceof JsonResponse) {
                $response->headers->set('X-User-Role', $user->role);
            }

            return $response;
        }

        if ($roles !== [] && ! in_array($user->role, $roles, true)) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Insufficient permissions',
                'code' => 'INSUFFICIENT_PERMISSIONS',
                'required_role' => implode('|', $roles),
                'current_role' => $user->role,
            ], 403);
        }

        // Add role header to response
        $response = $next($request);
        if ($response instanceof JsonResponse) {
            $response->headers->set('X-User-Role', $user->role);
        }

        return $response;
    }
}
