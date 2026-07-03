<?php

namespace Database\Factories;

use App\Models\PostgreSQL\Application;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Application>
 */
class ApplicationFactory extends Factory
{
    protected $model = Application::class;

    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'applicant_id' => Str::uuid()->toString(),
            'job_posting_id' => Str::uuid()->toString(),
            'status' => 'applied',
        ];
    }

    /**
     * Indicate the application has been matched.
     */
    public function matched(): static
    {
        return $this->state(['status' => 'matched']);
    }

    /**
     * Indicate the application has been dismissed by HR.
     */
    public function dismissed(): static
    {
        return $this->state(['status' => 'dismissed']);
    }

    /**
     * Indicate the application was invited by the company.
     */
    public function invited(): static
    {
        return $this->state([
            'status' => 'invited',
            'invitation_message' => fake()->sentence(),
            'invited_at' => now(),
        ]);
    }
}
