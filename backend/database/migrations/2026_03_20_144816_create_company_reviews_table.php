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
        Schema::create('company_reviews', function (Blueprint $table) {
            $table->uuid('id')->default(DB::raw('gen_random_uuid()'));
            $table->uuid('applicant_id');
            $table->uuid('company_id');
            $table->uuid('job_posting_id');
            $table->boolean('is_flagged')->default(false);
            $table->boolean('is_visible')->default(true);
            $table->string('mongo_review_id')->nullable(); // Reference to MongoDB document
            $table->timestampsTz();

            $table->foreign('applicant_id')->references('id')->on('applicant_profiles');
            $table->foreign('job_posting_id')->references('id')->on('job_postings');
            $table->foreign('company_id')->references('id')->on('company_profiles');
        });

        DB::statement('CREATE UNIQUE INDEX idx_company_reviews_unique ON company_reviews (applicant_id, company_id)');
        DB::statement('CREATE INDEX idx_company_reviews_company_visible ON company_reviews(company_id, is_visible) WHERE is_visible = TRUE');
        DB::statement('CREATE INDEX idx_company_reviews_flagged ON company_reviews(is_flagged) WHERE is_flagged = TRUE');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_reviews');
    }
};
