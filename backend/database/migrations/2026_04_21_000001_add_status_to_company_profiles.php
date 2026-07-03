<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'pgsql';

    public function up(): void
    {
        Schema::table('company_profiles', function (Blueprint $table) {
            $table->string('status', 15)->default('active')->after('subscription_status');
            $table->text('suspension_reason')->nullable()->after('status');
            $table->timestampTz('suspended_at')->nullable()->after('suspension_reason');
        });

        DB::statement("ALTER TABLE company_profiles ADD CONSTRAINT company_profiles_status_check CHECK (status IN ('active', 'suspended'))");
        DB::statement('CREATE INDEX idx_company_profiles_status ON company_profiles(status)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_company_profiles_status');
        DB::statement('ALTER TABLE company_profiles DROP CONSTRAINT IF EXISTS company_profiles_status_check');

        Schema::table('company_profiles', function (Blueprint $table) {
            $table->dropColumn(['status', 'suspension_reason', 'suspended_at']);
        });
    }
};
