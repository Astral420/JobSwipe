<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('swipe_packs', function (Blueprint $table) {
            $table->string('currency', 10)->default('PHP')->after('amount_paid');
        });
    }

    public function down(): void
    {
        Schema::table('swipe_packs', function (Blueprint $table) {
            $table->dropColumn('currency');
        });
    }
};
