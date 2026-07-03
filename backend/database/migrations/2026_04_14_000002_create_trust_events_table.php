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
        Schema::create('trust_events', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('company_id');
            $table->string('event_type', 50);
            $table->integer('score_delta');
            $table->integer('score_after');
            $table->jsonb('metadata')->default(DB::raw("'{}'::jsonb"));
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));

            $table->foreign('company_id')->references('id')->on('company_profiles')->onDelete('cascade');
        });

        DB::statement('CREATE INDEX idx_trust_events_company_id ON trust_events(company_id)');
        DB::statement('CREATE INDEX idx_trust_events_event_type ON trust_events(event_type)');
        DB::statement('CREATE INDEX idx_trust_events_created_at ON trust_events(created_at DESC)');
    }

    public function down(): void
    {
        Schema::dropIfExists('trust_events');
    }
};
