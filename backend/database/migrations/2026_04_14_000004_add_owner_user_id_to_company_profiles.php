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
            $table->uuid('owner_user_id')->nullable()->after('user_id');
        });

        DB::statement('UPDATE company_profiles SET owner_user_id = user_id WHERE owner_user_id IS NULL');
        DB::statement('CREATE INDEX idx_company_profiles_owner_user_id ON company_profiles(owner_user_id)');
        DB::statement('ALTER TABLE company_profiles ADD CONSTRAINT company_profiles_owner_user_id_foreign FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE company_profiles DROP CONSTRAINT IF EXISTS company_profiles_owner_user_id_foreign');
        DB::statement('DROP INDEX IF EXISTS idx_company_profiles_owner_user_id');

        Schema::table('company_profiles', function (Blueprint $table) {
            $table->dropColumn('owner_user_id');
        });
    }
};
