<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'pgsql';

    public function up(): void
    {
        Schema::create('job_postings', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('company_id');
            $table->string('title', 255);
            $table->text('description');
            $table->decimal('salary_min', 12, 2)->nullable();
            $table->decimal('salary_max', 12, 2)->nullable();
            $table->boolean('salary_is_hidden')->default(false);
            $table->string('work_type', 10);
            $table->string('location', 255)->nullable();
            $table->string('location_city', 100)->nullable();
            $table->string('location_region', 100)->nullable();
            $table->decimal('lat', 9, 6)->nullable();
            $table->decimal('lng', 9, 6)->nullable();
            $table->text('interview_template')->nullable();
            $table->string('status', 10)->default('draft');
            $table->timestampTz('expires_at')->nullable();
            $table->timestampTz('published_at')->nullable();
            $table->timestampsTz();

            $table->foreign('company_id')->references('id')->on('company_profiles')->onDelete('cascade');
        });

        DB::statement("ALTER TABLE job_postings ADD CONSTRAINT job_postings_work_type_check CHECK (work_type IN ('remote', 'hybrid', 'on_site'))");
        DB::statement("ALTER TABLE job_postings ADD CONSTRAINT job_postings_status_check CHECK (status IN ('active', 'closed', 'expired', 'draft'))");
        DB::statement('CREATE INDEX idx_job_postings_company_id ON job_postings(company_id)');
        DB::statement("CREATE INDEX idx_job_postings_active ON job_postings(status, expires_at) WHERE status = 'active'");
        DB::statement("CREATE INDEX idx_job_postings_published_at ON job_postings(published_at DESC) WHERE status = 'active'");
        DB::statement('CREATE INDEX idx_job_postings_location_city ON job_postings(location_city)');
        DB::statement('CREATE INDEX idx_job_postings_location_region ON job_postings(location_region)');
    }

    public function down(): void
    {
        Schema::dropIfExists('job_postings');
    }
};
