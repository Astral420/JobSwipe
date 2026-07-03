<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the existing constraint
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');

        // Add the new constraint with 'admin' role included
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('applicant','hr','company_admin','moderator','admin','super_admin'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the constraint with 'admin' role
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');

        // Restore the original constraint without 'admin' role
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('applicant','hr','company_admin','moderator','super_admin'))");
    }
};
