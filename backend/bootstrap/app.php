<?php

use App\Http\Middleware\AdminRateLimit;
use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\CheckSwipeLimit;
use App\Http\Middleware\ClearStaleRouteCache;
use App\Http\Middleware\EnsureEmailVerified;
use App\Http\Middleware\MembershipActiveMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Stripe\Exception\ApiErrorException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // CRITICAL: Must run first to clear stale route cache from Render's pre-start hooks
        $middleware->prepend(ClearStaleRouteCache::class);

        // API-only app: unauthenticated users should get 401 JSON, not a web login redirect.
        $middleware->redirectGuestsTo(fn () => null);

        // Enable CORS for API routes
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        $middleware->alias([
            'swipe.limit' => CheckSwipeLimit::class,
            'role' => CheckRole::class,
            'permission' => CheckPermission::class,
            'admin.rate_limit' => AdminRateLimit::class,
            'verified' => EnsureEmailVerified::class,
            'membership.active' => MembershipActiveMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(function ($request, \Throwable $e) {
            if ($request->is('api/*')) {
                return true;
            }

            return $request->expectsJson();
        });

        $exceptions->render(function (ValidationException $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'code' => 'VALIDATION_ERROR',
                'errors' => $exception->errors(),
            ], 422);
        });

        $exceptions->render(function (NotFoundHttpException $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => 'Resource not found.',
                'code' => 'NOT_FOUND',
            ], 404);
        });

        $exceptions->render(function (ApiErrorException $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => 'Payment provider request failed.',
                'code' => 'STRIPE_API_ERROR',
            ], 500);
        });
    })->create();
