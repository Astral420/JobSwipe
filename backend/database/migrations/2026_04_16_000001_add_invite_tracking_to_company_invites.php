<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'pgsql';

    public function up(): void
    {
        Schema::table('company_invites', function (Blueprint $table) {
            $table->timestampTz('invite_email_sent_at')->nullable()->after('revoked_at');
            $table->timestampTz('magic_link_clicked_at')->nullable()->after('invite_email_sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('company_invites', function (Blueprint $table) {
            $table->dropColumn(['invite_email_sent_at', 'magic_link_clicked_at']);
        });
    }
};
