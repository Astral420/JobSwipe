<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('action_type', 50)->index();
            $table->string('resource_type', 50);
            $table->uuid('resource_id');
            $table->uuid('actor_id');
            $table->string('actor_role', 20);
            $table->jsonb('metadata')->nullable();
            $table->jsonb('before_state')->nullable();
            $table->jsonb('after_state')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestampTz('created_at')->index();

            // Foreign key constraint
            $table->foreign('actor_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            // Composite indexes for common queries
            $table->index(['resource_type', 'resource_id'], 'idx_audit_logs_resource');
            $table->index(['created_at'], 'idx_audit_logs_created_at_desc');
        });

        // GIN index for JSONB metadata column (PostgreSQL specific)
        DB::statement('CREATE INDEX idx_audit_logs_metadata ON audit_logs USING gin(metadata)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
