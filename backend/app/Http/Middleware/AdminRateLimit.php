<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class AdminRateLimit
{
    public function handle(Request $request, Closure $next, string $limitType): Response
    {
        $user = $request->user();

        if (! $user) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Authentication required',
                'code' => 'UNAUTHENTICATED',
            ], 401);
        }

        $limit = config("admin.rate_limits.{$limitType}.{$user->role}", 60);
        $key = "admin_rate_limit:{$user->id}:{$limitType}";

        $attempts = Redis::incr($key);

        if ($attempts === 1) {
            Redis::expire($key, 60);
        }

        if ($attempts > $limit) {
            $retryAfter = Redis::ttl($key);

            return new JsonResponse([
                'success' => false,
                'message' => 'Rate limit exceeded',
                'code' => 'RATE_LIMIT_EXCEEDED',
                'retry_after' => $retryAfter > 0 ? $retryAfter : 60,
                'limit' => $limit,
                'window' => '1 minute',
            ], 429);
        }

        return $next($request);
    }
}
