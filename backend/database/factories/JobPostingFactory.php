<?php

namespace Database\Factories;

use App\Models\PostgreSQL\JobPosting;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<JobPosting>
 */
class JobPostingFactory extends Factory
{
    protected $model = JobPosting::class;

    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'company_id' => Str::uuid()->toString(),
            'title' => fake()->jobTitle(),
            'description' => fake()->paragraphs(3, true),
            'salary_min' => fake()->numberBetween(20000, 50000),
            'salary_max' => fake()->numberBetween(50001, 100000),
            'salary_is_hidden' => false,
            'work_type' => fake()->randomElement(['remote', 'hybrid', 'on_site']),
            'location' => fake()->city().', '.fake()->country(),
            'location_city' => fake()->city(),
            'location_region' => fake()->state(),
            'interview_template' => fake()->paragraph(),
            'status' => 'active',
            'published_at' => now(),
            'expires_at' => now()->addDays(30),
        ];
    }

    /**
     * Indicate the job posting is closed.
     */
    public function closed(): static
    {
        return $this->state(['status' => 'closed']);
    }

    /**
     * Indicate the job posting has expired.
     */
    public function expired(): static
    {
        return $this->state([
            'status' => 'expired',
            'expires_at' => now()->subDay(),
        ]);
    }

    /**
     * Indicate the job posting is a draft (not published).
     */
    public function draft(): static
    {
        return $this->state([
            'status' => 'draft',
            'published_at' => null,
        ]);
    }

    /**
     * Set the job as remote work type.
     */
    public function remote(): static
    {
        return $this->state(['work_type' => 'remote']);
    }

    /**
     * Set the job with hidden salary.
     */
    public function hiddenSalary(): static
    {
        return $this->state(['salary_is_hidden' => true]);
    }
}
