<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSwipeLimit
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
                'code' => 'UNAUTHENTICATED',
            ], 401);
        }

        $applicant = $user->applicantProfile;

        if (! $applicant) {
            return response()->json([
                'success' => false,
                'message' => 'Applicant profile not found',
                'code' => 'PROFILE_NOT_FOUND',
            ], 404);
        }

        // Advisory-only preflight. Authoritative enforcement happens atomically
        // in SwipeService to prevent TOCTOU races under concurrent requests.
        if (! $applicant->hasSwipesRemaining()) {
            $request->attributes->set('swipe_limit_precheck_failed', true);
        }

        return $next($request);
    }
}
