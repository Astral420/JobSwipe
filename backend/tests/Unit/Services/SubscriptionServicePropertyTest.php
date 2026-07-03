<?php

namespace Tests\Unit\Services;

use App\Repositories\PostgreSQL\CompanyProfileRepository;
use App\Services\SubscriptionService;
use App\Services\TrustScoreService;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class SubscriptionServicePropertyTest extends TestCase
{
    public function test_property_map_stripe_status_returns_known_internal_statuses(): void
    {
        $repo = $this->createMock(CompanyProfileRepository::class);
        $trustScore = $this->createMock(TrustScoreService::class);
        $service = new SubscriptionService($repo, $trustScore);

        $ref = new ReflectionClass($service);
        $method = $ref->getMethod('mapStripeStatus');
        $method->setAccessible(true);

        $samples = [
            'active', 'trialing', 'past_due', 'incomplete',
            'incomplete_expired', 'unpaid', 'canceled', 'unknown',
        ];

        $allowed = ['active', 'past_due', 'cancelled', 'expired'];

        foreach ($samples as $status) {
            $mapped = $method->invoke($service, $status);

            $this->assertContains($mapped, $allowed, "Unexpected mapping for status [$status]");
        }
    }

    public function test_basic_tier_amount_constant_is_expected_value(): void
    {
        $this->assertSame(120.00, SubscriptionService::BASIC_TIER_AMOUNT);
    }
}
