<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * DatabaseSeeder
 *
 * Main database seeder class that orchestrates all seeding operations.
 *
 * Usage:
 * - Run all seeders: php artisan db:seed
 * - Run specific seeder: php artisan db:seed --class=SpecificSeederName
 *
 * How to add new seeders:
 * 1. Create a new seeder class in this directory: php artisan make:seeder YourSeederName
 * 2. Implement the run() method in your seeder class
 * 3. Call your seeder from this class: $this->call(YourSeederName::class);
 *
 * Example:
 * public function run(): void
 * {
 *     $this->call([
 *         UserSeeder::class,
 *         JobSeeder::class,
 *         CompanySeeder::class,
 *     ]);
 * }
 */
class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            BlockedEmailDomainSeeder::class,
            AdminUserSeeder::class,
        ]);
    }
}
