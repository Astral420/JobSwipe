<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('iap_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('transaction_id', 255);
            $table->string('payment_provider', 15);
            $table->uuid('user_id');
            $table->string('product_id', 100);
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));

            $table->foreign('user_id')->references('id')->on('users');
            $table->unique(['transaction_id', 'payment_provider']);
        });

        Schema::table('iap_transactions', function (Blueprint $table) {
            $table->index('user_id', 'idx_iap_transactions_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iap_transactions');
    }
};
