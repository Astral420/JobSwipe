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
        Schema::create('blocked_email_domains', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('domain', 255)->unique();
            $table->string('reason', 50)->default('free_provider');
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_email_domains');
    }
};
