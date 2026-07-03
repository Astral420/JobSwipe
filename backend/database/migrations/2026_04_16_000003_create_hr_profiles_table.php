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
        Schema::create('hr_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id')->unique();
            $table->uuid('company_id');
            $table->string('first_name', 100)->default('');
            $table->string('last_name', 100)->default('');
            $table->string('job_title', 150)->default('');
            $table->text('photo_url')->nullable();
            $table->timestampsTz();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('company_id')->references('id')->on('company_profiles')->onDelete('cascade');
        });

        DB::statement('CREATE INDEX idx_hr_profiles_company ON hr_profiles(company_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_profiles');
    }
};
