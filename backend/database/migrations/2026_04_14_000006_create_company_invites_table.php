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
        Schema::create('company_invites', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('company_id');
            $table->string('email', 255);
            $table->string('email_domain', 255);
            $table->string('invite_role', 20);
            $table->string('token_hash', 255)->unique();
            $table->uuid('invited_by_user_id');
            $table->timestampTz('expires_at');
            $table->timestampTz('accepted_at')->nullable();
            $table->timestampTz('revoked_at')->nullable();
            $table->timestampsTz();

            $table->foreign('company_id')->references('id')->on('company_profiles')->onDelete('cascade');
            $table->foreign('invited_by_user_id')->references('id')->on('users')->onDelete('cascade');
        });

        DB::statement("ALTER TABLE company_invites ADD CONSTRAINT company_invites_role_check CHECK (invite_role IN ('company_admin', 'hr'))");
        DB::statement('CREATE INDEX idx_company_invites_email_expires ON company_invites(email, expires_at)');
        DB::statement('CREATE INDEX idx_company_invites_company_status ON company_invites(company_id, accepted_at, revoked_at)');
    }

    public function down(): void
    {
        Schema::dropIfExists('company_invites');
    }
};
