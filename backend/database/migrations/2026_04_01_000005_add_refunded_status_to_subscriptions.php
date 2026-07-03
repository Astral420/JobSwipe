<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Drop the existing status check constraint
        DB::statement('
            ALTER TABLE subscriptions
            DROP CONSTRAINT subscriptions_status_check
        ');

        // Add the new status check constraint with 'refunded' included
        DB::statement("
            ALTER TABLE subscriptions
            ADD CONSTRAINT subscriptions_status_check
            CHECK (status IN ('active', 'cancelled', 'past_due', 'expired', 'refunded'))
        ");
    }

    public function down(): void
    {
        // Drop the constraint with 'refunded'
        DB::statement('
            ALTER TABLE subscriptions
            DROP CONSTRAINT subscriptions_status_check
        ');

        // Restore the original constraint without 'refunded'
        DB::statement("
            ALTER TABLE subscriptions
            ADD CONSTRAINT subscriptions_status_check
            CHECK (status IN ('active', 'cancelled', 'past_due', 'expired'))
        ");
    }
};
