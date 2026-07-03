<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stripe_webhook_events', function (Blueprint $table) {
            $table->text('payload')->nullable()->after('event_type');
            $table->string('status', 20)->default('pending')->after('payload');
            $table->unsignedInteger('attempts')->default(0)->after('status');
            $table->timestampTz('processing_started_at')->nullable()->after('attempts');
            $table->timestampTz('completed_at')->nullable()->after('processing_started_at');
            $table->timestampTz('failed_at')->nullable()->after('completed_at');
            $table->text('last_error')->nullable()->after('failed_at');

            $table->index(['status', 'updated_at'], 'idx_stripe_webhook_events_status_updated');
        });
    }

    public function down(): void
    {
        Schema::table('stripe_webhook_events', function (Blueprint $table) {
            $table->dropIndex('idx_stripe_webhook_events_status_updated');
            $table->dropColumn([
                'payload',
                'status',
                'attempts',
                'processing_started_at',
                'completed_at',
                'failed_at',
                'last_error',
            ]);
        });
    }
};
