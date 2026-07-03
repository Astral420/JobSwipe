<?php

namespace Database\Factories;

use App\Models\PostgreSQL\ApplicantProfile;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ApplicantProfile>
 */
class ApplicantProfileFactory extends Factory
{
    protected $model = ApplicantProfile::class;

    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'user_id' => Str::uuid()->toString(),
            'total_points' => 0,
            'subscription_tier' => 'free',
            'subscription_status' => 'inactive',
            'daily_swipe_limit' => 65,
            'daily_swipes_used' => 0,
            'extra_swipe_balance' => 0,
            'swipe_reset_at' => now()->startOfDay(),
        ];
    }

    /**
     * Indicate the applicant has a Pro subscription.
     */
    public function pro(): static
    {
        return $this->state([
            'subscription_tier' => 'pro',
            'subscription_status' => 'active',
            'daily_swipe_limit' => 999,
        ]);
    }

    /**
     * Indicate the applicant has exhausted daily swipes.
     */
    public function exhaustedSwipes(): static
    {
        return $this->state([
            'daily_swipes_used' => 65,
            'daily_swipe_limit' => 65,
            'extra_swipe_balance' => 0,
        ]);
    }

    /**
     * Indicate the applicant has extra swipe balance.
     */
    public function withExtraSwipes(int $amount = 10): static
    {
        return $this->state([
            'extra_swipe_balance' => $amount,
        ]);
    }
}
