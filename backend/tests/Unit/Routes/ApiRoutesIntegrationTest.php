<?php

namespace Tests\Unit\Routes;

use PHPUnit\Framework\TestCase;

class ApiRoutesIntegrationTest extends TestCase
{
    public function test_profile_routes_are_registered_with_expected_prefixes(): void
    {
        $routes = file_get_contents(base_path('routes/api.php'));

        $this->assertStringContainsString("Route::prefix('profile')", $routes);
        $this->assertStringContainsString("Route::get('onboarding/status'", $routes);
        $this->assertStringContainsString("Route::post('onboarding/complete-step'", $routes);
        $this->assertStringContainsString("Route::get('completion'", $routes);
    }

    public function test_role_middleware_is_applied_to_sensitive_routes(): void
    {
        $routes = file_get_contents(base_path('routes/api.php'));

        $this->assertStringContainsString("middleware('role:applicant')", $routes);
        $this->assertStringContainsString("middleware('role:hr,company_admin')", $routes);
        $this->assertStringContainsString("middleware('role:company_admin')", $routes);
    }

    public function test_subscription_and_file_routes_exist(): void
    {
        $routes = file_get_contents(base_path('routes/api.php'));

        $this->assertStringContainsString("Route::prefix('files')", $routes);
        $this->assertStringContainsString("Route::post('upload-url'", $routes);
        $this->assertStringContainsString("Route::post('read-url'", $routes);
        $this->assertStringContainsString("Route::prefix('subscriptions')", $routes);
        $this->assertStringContainsString("Route::post('webhooks/stripe'", $routes);
    }
}
