<?php

namespace Database\Factories;

use App\Models\PostgreSQL\MatchRecord;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<MatchRecord>
 */
class MatchRecordFactory extends Factory
{
    protected $model = MatchRecord::class;

    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'application_id' => Str::uuid()->toString(),
            'applicant_id' => Str::uuid()->toString(),
            'job_posting_id' => Str::uuid()->toString(),
            'hr_user_id' => Str::uuid()->toString(),
            'initial_message' => fake()->sentence(),
            'status' => 'pending',
            'matched_at' => now(),
            'response_deadline' => now()->addHours(24),
        ];
    }

    /**
     * Indicate the match has been accepted.
     */
    public function accepted(): static
    {
        return $this->state([
            'status' => 'accepted',
            'responded_at' => now(),
        ]);
    }

    /**
     * Indicate the match has been declined.
     */
    public function declined(): static
    {
        return $this->state([
            'status' => 'declined',
            'responded_at' => now(),
        ]);
    }

    /**
     * Indicate the match has expired.
     */
    public function expired(): static
    {
        return $this->state([
            'status' => 'expired',
            'response_deadline' => now()->subHour(),
        ]);
    }

    /**
     * Indicate the match is still pending but the deadline has passed.
     */
    public function deadlinePassed(): static
    {
        return $this->state([
            'status' => 'pending',
            'response_deadline' => now()->subMinutes(5),
        ]);
    }

    /**
     * Indicate the match has been closed by HR.
     */
    public function closed(?string $closedByUserId = null): static
    {
        return $this->state([
            'status' => 'closed',
            'responded_at' => now()->subHours(12),
            'closed_at' => now(),
            'closed_by' => $closedByUserId ?? Str::uuid()->toString(),
        ]);
    }
}
