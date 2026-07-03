<?php

namespace App\Providers;

use App\Models\PostgreSQL\CompanyProfile;
use App\Observers\CompanyProfileObserver;
use App\Repositories\MongoDB\ApplicantProfileDocumentRepository;
use App\Repositories\MongoDB\CompanyProfileDocumentRepository;
use App\Repositories\MongoDB\SwipeHistoryRepository;
use App\Repositories\PostgreSQL\ApplicantProfileRepository;
use App\Repositories\PostgreSQL\ApplicationRepository;
use App\Repositories\PostgreSQL\CompanyProfileRepository;
use App\Repositories\PostgreSQL\JobPostingRepository;
use App\Repositories\PostgreSQL\MatchMessageRepository;
use App\Repositories\PostgreSQL\MatchRepository;
use App\Repositories\PostgreSQL\NotificationRepository;
use App\Repositories\PostgreSQL\PointEventRepository;
use App\Repositories\PostgreSQL\UserRepository;
use App\Repositories\Redis\OTPCacheRepository;
use App\Repositories\Redis\SwipeCacheRepository;
use App\Services\AdminService;
use App\Services\AuthService;
use App\Services\CompanyInvitationService;
use App\Services\CompanyMembershipService;
use App\Services\DeckService;
use App\Services\FileUploadService;
use App\Services\HRProfileService;
use App\Services\MatchService;
use App\Services\NotificationService;
use App\Services\OTPService;
use App\Services\PasswordResetService;
use App\Services\PointService;
use App\Services\ProfileCompletionService;
use App\Services\ProfileOnboardingService;
use App\Services\ProfileService;
use App\Services\ProfileSocialLinksValidator;
use App\Services\SubscriptionService;
use App\Services\SwipeService;
use App\Services\TokenService;
use App\Services\TrustScoreService;
use App\Services\UserDataCleanupService;
use App\Support\SlidingWindowRateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * Singletons are added here as each Repository/Service class is implemented.
     * DO NOT register a class here until its file actually exists — Laravel will
     * throw a BindingResolutionException on every request if it can't resolve it.
     *
     * Uncomment each binding as you create the corresponding class:
     *
     * Phase 1 — Repositories (add as you build them):
     *   SwipeCacheRepository::class
     *   SwipeHistoryRepository::class
     *   ApplicationRepository::class
     *   ApplicantProfileRepository::class
     *
     * Phase 2 — Services (add after their repository dependencies exist):
     *   SwipeService::class
     *   PointService::class
     *   DeckService::class
     *   InvitationService::class
     */
    public function register(): void
    {
        // -----------------------------------------------------------------
        // Repositories
        // Uncomment each line only after you have created the class file.
        // -----------------------------------------------------------------

        $this->app->singleton(SwipeCacheRepository::class);
        $this->app->singleton(SwipeHistoryRepository::class);
        $this->app->singleton(ApplicationRepository::class);
        $this->app->singleton(ApplicantProfileRepository::class);
        $this->app->singleton(CompanyProfileRepository::class);
        $this->app->singleton(OTPCacheRepository::class);
        $this->app->singleton(UserRepository::class);
        $this->app->singleton(JobPostingRepository::class);
        $this->app->singleton(PointEventRepository::class);
        $this->app->singleton(NotificationRepository::class);
        $this->app->singleton(ApplicantProfileDocumentRepository::class);
        $this->app->singleton(CompanyProfileDocumentRepository::class);
        $this->app->singleton(MatchRepository::class);
        $this->app->singleton(MatchMessageRepository::class);

        // -----------------------------------------------------------------
        // Services
        // Uncomment each line only after ALL constructor dependencies above
        // are already registered as singletons.
        // -----------------------------------------------------------------

        $this->app->singleton(SwipeService::class);
        $this->app->singleton(DeckService::class);
        $this->app->singleton(PointService::class);
        $this->app->singleton(NotificationService::class);
        // $this->app->singleton(InvitationService::class);
        $this->app->singleton(MatchService::class);

        $this->app->singleton(OTPService::class);
        $this->app->singleton(PasswordResetService::class);
        $this->app->singleton(ProfileCompletionService::class);
        $this->app->singleton(ProfileSocialLinksValidator::class);
        $this->app->singleton(ProfileOnboardingService::class);
        $this->app->singleton(ProfileService::class);
        $this->app->singleton(TrustScoreService::class);
        $this->app->singleton(CompanyMembershipService::class);
        $this->app->singleton(CompanyInvitationService::class);
        $this->app->singleton(FileUploadService::class);
        $this->app->singleton(SubscriptionService::class);
        $this->app->singleton(TokenService::class);
        $this->app->singleton(AuthService::class);
        $this->app->singleton(UserDataCleanupService::class);
        $this->app->singleton(AdminService::class);
        $this->app->singleton(HRProfileService::class);
        $this->app->singleton(SlidingWindowRateLimiter::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        CompanyProfile::observe(CompanyProfileObserver::class);

        RateLimiter::for('api-tiered', function (Request $request) {
            if ($request->user()) {
                return Limit::perMinute(60)->by((string) $request->user()->id);
            }

            return Limit::perMinute(20)->by($request->ip());
        });

        RateLimiter::for('match-messages-send', function (Request $request) {
            $identifier = $request->user()?->id ? (string) $request->user()->id : $request->ip();

            return Limit::perMinute(30)->by($identifier);
        });

        RateLimiter::for('match-messages-typing', function (Request $request) {
            $identifier = $request->user()?->id ? (string) $request->user()->id : $request->ip();

            return Limit::perMinute(120)->by($identifier);
        });

        RateLimiter::for('match-messages-read', function (Request $request) {
            $identifier = $request->user()?->id ? (string) $request->user()->id : $request->ip();

            return Limit::perMinute(60)->by($identifier);
        });

        // ── HR feature rate limiters (sliding window via Redis) ───────────────
        // These are enforced in the controller/middleware level using
        // SlidingWindowRateLimiter instead of Laravel's built-in fixed-window.
        // The named limiters below are registered for documentation; actual
        // enforcement happens via the SlidingWindowRateLimiter service.
        RateLimiter::for('invite-create', function (Request $request) {
            // 10 per minute per authenticated company_admin (Req 19 AC 1)
            return Limit::perMinute(10)
                ->by((string) ($request->user()?->id ?? $request->ip()))
                ->response(fn () => response()->json([
                    'success' => false,
                    'message' => 'Too many requests. Please wait before trying again.',
                    'code' => 'RATE_LIMIT_EXCEEDED',
                ], 429));
        });

        RateLimiter::for('hr-profile-setup', function (Request $request) {
            // 5 per minute per authenticated HR member (Req 19 AC 2)
            return Limit::perMinute(5)
                ->by((string) ($request->user()?->id ?? $request->ip()))
                ->response(fn () => response()->json([
                    'success' => false,
                    'message' => 'Too many requests. Please wait before trying again.',
                    'code' => 'RATE_LIMIT_EXCEEDED',
                ], 429));
        });

        RateLimiter::for('magic-link-validate', function (Request $request) {
            // 20 per minute per IP (Req 19 AC 3)
            return Limit::perMinute(20)
                ->by($request->ip())
                ->response(fn () => response()->json([
                    'success' => false,
                    'message' => 'Too many validation attempts. Please wait before trying again.',
                    'code' => 'RATE_LIMIT_EXCEEDED',
                ], 429));
        });

        // CRITICAL FIX: Disable route caching on Render.com
        // Render runs `php artisan route:cache` before our container starts,
        // caching routes before api.php is loaded. This causes all API routes to 404.
        // By setting routesAreCached to always return false, we force Laravel to
        // load routes from files on every request (negligible performance impact).
        if (app()->environment('production')) {
            app()->bind('router', function ($app) {
                $router = new Router($app['events'], $app);

                // Override the routesAreCached method to always return false
                $router->macro('routesAreCached', function () {
                    return false;
                });

                return $router;
            });
        }
    }
}
