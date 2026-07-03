<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('iap_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_id', 255);
            $table->string('payment_provider', 15);
            $table->string('event_type', 50);
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));

            $table->unique(['event_id', 'payment_provider']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iap_webhook_events');
    }
};
