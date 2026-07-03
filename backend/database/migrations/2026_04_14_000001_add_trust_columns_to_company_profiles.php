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
        Schema::table('company_profiles', function (Blueprint $table) {
            $table->string('company_domain', 255)->nullable()->after('company_name');
            $table->boolean('is_free_email_domain')->default(false)->after('company_domain');
            $table->integer('trust_score')->default(0)->after('subscription_status');
            $table->string('trust_level', 15)->default('untrusted')->after('trust_score');
            $table->integer('listing_cap')->default(0)->after('trust_level');
        });

        // Update subscription_tier constraint to include 'free'
        DB::statement('ALTER TABLE company_profiles DROP CONSTRAINT company_profiles_subscription_tier_check');
        DB::statement("ALTER TABLE company_profiles ADD CONSTRAINT company_profiles_subscription_tier_check CHECK (subscription_tier IN ('none', 'free', 'basic', 'pro'))");

        // Add trust_level constraint
        DB::statement("ALTER TABLE company_profiles ADD CONSTRAINT company_profiles_trust_level_check CHECK (trust_level IN ('untrusted', 'new', 'established', 'trusted'))");

        // Index for trust-based queries
        DB::statement('CREATE INDEX idx_company_profiles_trust_level ON company_profiles(trust_level)');
        DB::statement('CREATE INDEX idx_company_profiles_company_domain ON company_profiles(company_domain) WHERE company_domain IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_company_profiles_company_domain');
        DB::statement('DROP INDEX IF EXISTS idx_company_profiles_trust_level');
        DB::statement('ALTER TABLE company_profiles DROP CONSTRAINT IF EXISTS company_profiles_trust_level_check');
        DB::statement("UPDATE company_profiles SET subscription_tier = 'none' WHERE subscription_tier = 'free'");
        DB::statement('ALTER TABLE company_profiles DROP CONSTRAINT company_profiles_subscription_tier_check');
        DB::statement("ALTER TABLE company_profiles ADD CONSTRAINT company_profiles_subscription_tier_check CHECK (subscription_tier IN ('none', 'basic', 'pro'))");

        Schema::table('company_profiles', function (Blueprint $table) {
            $table->dropColumn(['company_domain', 'is_free_email_domain', 'trust_score', 'trust_level', 'listing_cap']);
        });
    }
};
