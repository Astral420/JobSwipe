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
        Schema::create('matches', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('application_id');
            $table->uuid('applicant_id');
            $table->uuid('job_posting_id');
            $table->uuid('hr_user_id');

            $table->text('initial_message');

            $table->string('status', 20)->default('pending');

            $table->timestampTz('matched_at');
            $table->timestampTz('response_deadline');
            $table->timestampTz('responded_at')->nullable();
            $table->timestampTz('closed_at')->nullable();
            $table->uuid('closed_by')->nullable();

            $table->timestamps();

            $table->foreign('application_id')->references('id')->on('applications');
            $table->foreign('applicant_id')->references('id')->on('applicant_profiles');
            $table->foreign('job_posting_id')->references('id')->on('job_postings');
            $table->foreign('hr_user_id')->references('id')->on('users');
            $table->foreign('closed_by')->references('id')->on('users');

            $table->unique(['applicant_id', 'job_posting_id']);
        });

        DB::statement("ALTER TABLE matches ADD CONSTRAINT matches_status_check CHECK (status IN ('pending', 'accepted', 'expired', 'declined', 'closed'))");
        DB::statement('CREATE INDEX idx_matches_applicant ON matches(applicant_id, status)');
        DB::statement('CREATE INDEX idx_matches_hr_user ON matches(hr_user_id, status)');
        DB::statement("CREATE INDEX idx_matches_pending_deadline ON matches(status, response_deadline) WHERE status = 'pending'");
        DB::statement('CREATE INDEX idx_matches_job_posting ON matches(job_posting_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};
