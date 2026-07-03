<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    protected $connection = 'pgsql';

    public function up(): void
    {
        DB::statement('ALTER TABLE applications DROP CONSTRAINT applications_status_check');
        DB::statement("ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (status IN ('applied', 'invited', 'dismissed', 'matched'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE applications DROP CONSTRAINT applications_status_check');
        DB::statement("ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (status IN ('applied', 'invited', 'dismissed'))");
    }
};
