<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Facades\Socialite;

class OAuthController extends Controller
{
    public function __construct(private AuthService $auth) {}

    /**
     * Redirect the user to Google's auth page.
     * The frontend calls this endpoint and then opens the returned URL.
     * For mobile (Expo), the deep link handling is done client-side.
     */
    public function redirectToGoogle(): JsonResponse
    {
        $url = Socialite::driver('google')->stateless()->redirect()->getTargetUrl();

        return $this->success(data: ['redirect_url' => $url]);
    }

    /**
     * Handle the Google OAuth callback.
     * Redirects to the mobile deep link (jobapp://) so the OS
     * hands control back to the Expo app.
     */
    public function handleGoogleCallback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Exception $e) {
            return redirect()->away(
                'jobapp:///(auth)/register?'.http_build_query([
                    'error' => 'OAUTH_FAILED',
                    'message' => 'Google authentication failed. Please try again.',
                ], '', '&', PHP_QUERY_RFC3986)
            );
        }

        $result = $this->auth->handleGoogleCallback($googleUser);

        if ($result['status'] === 'banned') {
            return redirect()->away(
                'jobapp:///(auth)/register?'.http_build_query([
                    'error' => 'ACCOUNT_BANNED',
                    'message' => 'Your account has been suspended.',
                ], '', '&', PHP_QUERY_RFC3986)
            );
        }

        if ($result['status'] === 'role_not_allowed') {
            return redirect()->away(
                'jobapp:///(auth)/register?'.http_build_query([
                    'error' => 'OAUTH_NOT_PERMITTED',
                    'message' => 'Google OAuth is only available for applicant accounts.',
                ], '', '&', PHP_QUERY_RFC3986)
            );
        }

        return redirect()->away(
            'jobapp:///(auth)/register?'.http_build_query([
                'token' => $result['token'],
                'is_new_user' => $result['is_new_user'] ? '1' : '0',
                'needs_onboarding' => $result['needs_onboarding'] ? '1' : '0',
            ], '', '&', PHP_QUERY_RFC3986)
        );
    }
}
