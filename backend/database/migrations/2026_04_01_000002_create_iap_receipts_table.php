<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('iap_receipts', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('transaction_id', 255);
            $table->string('payment_provider', 15);
            $table->uuid('user_id');
            $table->string('product_id', 100);
            $table->jsonb('raw_receipt_data');
            $table->jsonb('verification_response');
            $table->timestampTz('verified_at')->default(DB::raw('NOW()'));

            $table->foreign('user_id')->references('id')->on('users');
        });

        Schema::table('iap_receipts', function (Blueprint $table) {
            $table->index(['transaction_id', 'payment_provider'], 'idx_iap_receipts_transaction');
            $table->index('user_id', 'idx_iap_receipts_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iap_receipts');
    }
};
