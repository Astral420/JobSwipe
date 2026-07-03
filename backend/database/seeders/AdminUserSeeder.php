<?php

namespace Database\Seeders;

use App\Models\PostgreSQL\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * AdminUserSeeder
 *
 * Seeds the initial super_admin and moderator accounts required to
 * bootstrap the JobSwipe admin dashboard.
 *
 * Credentials are driven by .env variables so that different
 * environments (local, staging, production) can configure their
 * own values without touching this file.
 *
 * Required .env keys (add to .env.example too):
 *   SUPER_ADMIN_EMAIL       – e-mail for the super admin account
 *   SUPER_ADMIN_PASSWORD    – plain-text password (hashed before insert)
 *   MODERATOR_EMAIL         – e-mail for the default moderator account
 *   MODERATOR_PASSWORD      – plain-text password (hashed before insert)
 *
 * Usage:
 *   php artisan db:seed --class=AdminUserSeeder
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedSuperAdmin();
        $this->seedModerators();
    }

    // ─────────────────────────────────────────────────────────────────
    // Super Admin
    // ─────────────────────────────────────────────────────────────────

    private function seedSuperAdmin(): void
    {
        $email = env('SUPER_ADMIN_EMAIL', 'superadmin@jobswipe.local');
        $password = env('SUPER_ADMIN_PASSWORD', 'Super@Admin123!');

        $existing = User::where('email', $email)->first();

        if ($existing) {
            $this->command->warn("  [super_admin] Already exists: {$email} — skipped.");

            return;
        }

        User::create([
            'id' => (string) Str::uuid(),
            'email' => $email,
            'password_hash' => Hash::make($password),
            'role' => 'super_admin',
            'is_active' => true,
            'is_banned' => false,
            'email_verified_at' => now(),
        ]);

        $this->command->info("  [super_admin] Created: {$email}");
    }

    // ─────────────────────────────────────────────────────────────────
    // Moderators
    // ─────────────────────────────────────────────────────────────────

    private function seedModerators(): void
    {
        /**
         * Primary moderator driven by env.
         * Additional moderators can be added to the $moderators array below.
         */
        $moderators = [
            [
                'email' => env('MODERATOR_EMAIL', 'moderator@jobswipe.local'),
                'password' => env('MODERATOR_PASSWORD', 'Moderator@123!'),
            ],
            // ── Add more static moderators here as needed ──────────────
            // [
            //     'email'    => env('MODERATOR_2_EMAIL', 'moderator2@jobswipe.local'),
            //     'password' => env('MODERATOR_2_PASSWORD', 'Moderator2@123!'),
            // ],
        ];

        foreach ($moderators as $mod) {
            $existing = User::where('email', $mod['email'])->first();

            if ($existing) {
                $this->command->warn("  [moderator]  Already exists: {$mod['email']} — skipped.");

                continue;
            }

            User::create([
                'id' => (string) Str::uuid(),
                'email' => $mod['email'],
                'password_hash' => Hash::make($mod['password']),
                'role' => 'moderator',
                'is_active' => true,
                'is_banned' => false,
                'email_verified_at' => now(),
            ]);

            $this->command->info("  [moderator]  Created: {$mod['email']}");
        }
    }
}
