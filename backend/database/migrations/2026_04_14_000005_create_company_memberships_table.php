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
        Schema::create('company_memberships', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('company_id');
            $table->uuid('user_id');
            $table->string('membership_role', 20);
            $table->string('status', 15)->default('active');
            $table->uuid('invited_by_user_id')->nullable();
            $table->timestampTz('joined_at')->default(DB::raw('NOW()'));
            $table->timestampsTz();

            $table->foreign('company_id')->references('id')->on('company_profiles')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('invited_by_user_id')->references('id')->on('users')->onDelete('set null');
            $table->unique(['company_id', 'user_id'], 'uniq_company_membership_company_user');
        });

        DB::statement("ALTER TABLE company_memberships ADD CONSTRAINT company_memberships_role_check CHECK (membership_role IN ('company_admin', 'hr'))");
        DB::statement("ALTER TABLE company_memberships ADD CONSTRAINT company_memberships_status_check CHECK (status IN ('active', 'inactive'))");
        DB::statement('CREATE INDEX idx_company_memberships_user_status ON company_memberships(user_id, status)');
        DB::statement('CREATE INDEX idx_company_memberships_company_status ON company_memberships(company_id, status)');

        DB::statement("
            INSERT INTO company_memberships (
                company_id, user_id, membership_role, status, invited_by_user_id, joined_at, created_at, updated_at
            )
            SELECT
                cp.id,
                cp.user_id,
                'company_admin',
                'active',
                NULL,
                COALESCE(cp.created_at, NOW()),
                NOW(),
                NOW()
            FROM company_profiles cp
            ON CONFLICT (company_id, user_id) DO NOTHING
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('company_memberships');
    }
};
