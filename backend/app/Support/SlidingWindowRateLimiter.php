<?php

namespace App\Support;

use Illuminate\Support\Facades\Redis;

/**
 * Sliding-window rate limiter backed by Redis.
 *
 * Uses a sorted set keyed by {key} where members are unique request IDs
 * and scores are Unix timestamps (microseconds). Counts requests in the
 * window [now - windowSeconds, now] and rejects when over the limit.
 *
 * This avoids the fixed-window "thundering herd" problem where burst
 * traffic at a window boundary doubles the effective rate.
 *
 * Req 19 AC 5.
 */
class SlidingWindowRateLimiter
{
    /**
     * Attempt an action. Returns true if allowed, false if rate-limited.
     *
     * @param  string  $key  Unique key identifying the actor + action
     * @param  int  $maxAttempts  Maximum requests allowed within $windowSeconds
     * @param  int  $windowSeconds  Length of the sliding window in seconds
     */
    public function attempt(string $key, int $maxAttempts, int $windowSeconds): bool
    {
        $now = microtime(true);           // float: seconds.microseconds
        $windowStart = $now - $windowSeconds;
        $requestId = uniqid('', true);

        // Pipeline: ZREMRANGEBYSCORE → ZADD → ZCARD → EXPIRE
        $results = Redis::pipeline(function ($pipe) use ($key, $windowStart, $now, $requestId, $windowSeconds) {
            // Remove members outside the sliding window
            $pipe->zremrangebyscore($key, '-inf', $windowStart);
            // Add the current request
            $pipe->zadd($key, $now, $requestId);
            // Count all members in the current window
            $pipe->zcard($key);
            // Reset expiry to avoid key leaking after inactivity
            $pipe->expire($key, $windowSeconds + 1);
        });

        $count = (int) ($results[2] ?? 0);

        return $count <= $maxAttempts;
    }

    /**
     * Return the current request count within the window (for headers).
     */
    public function count(string $key, int $windowSeconds): int
    {
        $windowStart = microtime(true) - $windowSeconds;
        Redis::zremrangebyscore($key, '-inf', $windowStart);

        return (int) Redis::zcard($key);
    }

    /**
     * Clear all requests for a key (useful in tests).
     */
    public function clear(string $key): void
    {
        Redis::del($key);
    }
}
