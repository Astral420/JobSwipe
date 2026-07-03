<?php

namespace Database\Factories;

use App\Models\PostgreSQL\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'email' => fake()->unique()->safeEmail(),
            'password_hash' => bcrypt('TW0@t3st!erDefault'),
            'role' => 'applicant',
            'is_active' => true,
            'is_banned' => false,
            'email_verified_at' => now(),
        ];
    }

    /**
     * Indicate the user has not verified their email.
     */
    public function unverified(): static
    {
        return $this->state(['email_verified_at' => null]);
    }

    /**
     * Indicate the user is banned.
     */
    public function banned(): static
    {
        return $this->state(['is_banned' => true]);
    }

    /**
     * Set the user role to applicant.
     */
    public function applicant(): static
    {
        return $this->state(['role' => 'applicant']);
    }

    /**
     * Set the user role to HR.
     */
    public function hr(): static
    {
        return $this->state(['role' => 'hr']);
    }

    /**
     * Set the user role to company_admin.
     */
    public function companyAdmin(): static
    {
        return $this->state(['role' => 'company_admin']);
    }

    /**
     * Set the user role to moderator.
     */
    public function moderator(): static
    {
        return $this->state(['role' => 'moderator']);
    }

    /**
     * Set the user role to super_admin.
     */
    public function superAdmin(): static
    {
        return $this->state(['role' => 'super_admin']);
    }
}
