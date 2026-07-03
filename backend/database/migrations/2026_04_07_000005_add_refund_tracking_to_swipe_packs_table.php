<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('swipe_packs', function (Blueprint $table) {
            $table->timestampTz('refunded_at')->nullable()->after('created_at');
            $table->string('refund_reference', 255)->nullable()->after('refunded_at');

            $table->index('refunded_at', 'idx_swipe_packs_refunded_at');
        });
    }

    public function down(): void
    {
        Schema::table('swipe_packs', function (Blueprint $table) {
            $table->dropIndex('idx_swipe_packs_refunded_at');
            $table->dropColumn(['refunded_at', 'refund_reference']);
        });
    }
};
