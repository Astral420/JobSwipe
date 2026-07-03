<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'pgsql';

    public function up(): void
    {
        Schema::table('job_postings', function (Blueprint $table) {
            $table->softDeletes(); // Adds deleted_at timestamp
            $table->uuid('deleted_by')->nullable(); // Track who deleted it
            $table->text('deletion_reason')->nullable(); // Optional reason for deletion

            $table->foreign('deleted_by')->references('id')->on('users')->onDelete('set null');
        });

        // Add index for soft delete queries
        DB::statement('CREATE INDEX idx_job_postings_deleted_at ON job_postings(deleted_at)');
    }

    public function down(): void
    {
        Schema::table('job_postings', function (Blueprint $table) {
            $table->dropForeign(['deleted_by']);
            $table->dropColumn(['deleted_at', 'deleted_by', 'deletion_reason']);
        });

        DB::statement('DROP INDEX IF EXISTS idx_job_postings_deleted_at');
    }
};
