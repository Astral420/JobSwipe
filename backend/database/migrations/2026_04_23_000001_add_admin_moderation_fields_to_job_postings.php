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
        Schema::table('job_postings', function (Blueprint $table) {
            // Flagging fields for moderation
            $table->boolean('is_flagged')->default(false)->after('status');
            $table->text('flag_reason')->nullable()->after('is_flagged');
            $table->timestampTz('flagged_at')->nullable()->after('flag_reason');
            $table->uuid('flagged_by')->nullable()->after('flagged_at');

            // Admin closure fields
            $table->timestampTz('closed_at')->nullable()->after('flagged_by');
            $table->uuid('closed_by')->nullable()->after('closed_at');

            // Foreign keys
            $table->foreign('flagged_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('closed_by')->references('id')->on('users')->onDelete('set null');
        });

        // Add indexes for admin queries
        DB::statement('CREATE INDEX idx_job_postings_flagged ON job_postings(is_flagged) WHERE is_flagged = TRUE');
        DB::statement('CREATE INDEX idx_job_postings_flagged_at ON job_postings(flagged_at DESC) WHERE is_flagged = TRUE');
    }

    public function down(): void
    {
        Schema::table('job_postings', function (Blueprint $table) {
            $table->dropForeign(['flagged_by']);
            $table->dropForeign(['closed_by']);
            $table->dropColumn([
                'is_flagged',
                'flag_reason',
                'flagged_at',
                'flagged_by',
                'closed_at',
                'closed_by',
            ]);
        });

        DB::statement('DROP INDEX IF EXISTS idx_job_postings_flagged');
        DB::statement('DROP INDEX IF EXISTS idx_job_postings_flagged_at');
    }
};
