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
            $table->string('employment_type', 20)->default('full_time')->after('work_type');
            $table->string('salary_period', 10)->default('monthly')->after('salary_is_hidden');
        });

        DB::statement("ALTER TABLE job_postings ADD CONSTRAINT job_postings_employment_type_check CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship'))");
        DB::statement("ALTER TABLE job_postings ADD CONSTRAINT job_postings_salary_period_check CHECK (salary_period IN ('monthly', 'yearly'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE job_postings DROP CONSTRAINT IF EXISTS job_postings_employment_type_check');
        DB::statement('ALTER TABLE job_postings DROP CONSTRAINT IF EXISTS job_postings_salary_period_check');

        Schema::table('job_postings', function (Blueprint $table) {
            $table->dropColumn(['employment_type', 'salary_period']);
        });
    }
};
