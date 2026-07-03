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
        Schema::table('company_memberships', function (Blueprint $table) {
            $table->uuid('revoked_by_user_id')->nullable()->after('invited_by_user_id');
            $table->timestampTz('revoked_at')->nullable()->after('joined_at');

            $table->foreign('revoked_by_user_id')
                ->references('id')->on('users')
                ->onDelete('set null');
        });

        // Partial index for efficient revocation lookups
        DB::statement('CREATE INDEX idx_company_memberships_revoked ON company_memberships(revoked_at) WHERE revoked_at IS NOT NULL');
    }

    public function down(): void
    {
        Schema::table('company_memberships', function (Blueprint $table) {
            $table->dropForeign(['revoked_by_user_id']);
            $table->dropColumn(['revoked_by_user_id', 'revoked_at']);
        });

        DB::statement('DROP INDEX IF EXISTS idx_company_memberships_revoked');
    }
};
