<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('iap_idempotency_keys', function (Blueprint $table) {
            $table->id();
            $table->uuid('user_id');
            $table->string('idempotency_key', 255)->unique();
            $table->string('request_fingerprint', 64);
            $table->jsonb('result')->nullable();
            $table->timestampTz('expires_at');
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
            $table->timestampTz('updated_at')->default(DB::raw('NOW()'));

            $table->foreign('user_id')->references('id')->on('users');
        });

        Schema::table('iap_idempotency_keys', function (Blueprint $table) {
            $table->index('expires_at', 'idx_iap_idempotency_expires');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iap_idempotency_keys');
    }
};
