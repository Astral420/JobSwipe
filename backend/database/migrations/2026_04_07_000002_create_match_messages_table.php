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
        Schema::create('match_messages', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('match_id');
            $table->uuid('sender_id');
            $table->text('body');
            $table->timestampTz('read_at')->nullable();
            $table->timestampTz('created_at')->nullable();

            $table->foreign('match_id')->references('id')->on('matches')->onDelete('cascade');
            $table->foreign('sender_id')->references('id')->on('users');
        });

        DB::statement('CREATE INDEX idx_match_messages_match ON match_messages(match_id, created_at)');
        DB::statement('CREATE INDEX idx_match_messages_unread ON match_messages(match_id, read_at) WHERE read_at IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('match_messages');
    }
};
