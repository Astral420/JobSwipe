<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Redis;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Clear Redis cache between tests to prevent rate limit carryover
        try {
            Redis::connection('default')->flushdb();
        } catch (\Exception $e) {
            // Ignore if Redis is not available
        }

        // Clear rate limiter
        RateLimiter::clear('5,1');

        // Clear cache
        Cache::flush();
    }

    /**
     * Override to clear authentication guards between requests
     */
    protected function tearDown(): void
    {
        // Clear all authentication guards to prevent caching between requests
        Auth::forgetGuards();

        parent::tearDown();
    }
}
