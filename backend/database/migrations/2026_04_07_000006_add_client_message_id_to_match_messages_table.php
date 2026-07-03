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
        Schema::table('match_messages', function (Blueprint $table) {
            $table->uuid('client_message_id')->nullable()->after('sender_id');
        });

        DB::statement('CREATE UNIQUE INDEX idx_match_messages_client_idempotency ON match_messages(match_id, sender_id, client_message_id) WHERE client_message_id IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_match_messages_client_idempotency');

        Schema::table('match_messages', function (Blueprint $table) {
            $table->dropColumn('client_message_id');
        });
    }
};
