<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    protected $connection = 'pgsql';

    /**
     * Run the migrations.
     *
     * Creates database indexes for optimal admin query performance.
     * These indexes support filtering, sorting, and pagination in admin dashboard endpoints.
     */
    public function up(): void
    {
        // Company profiles indexes for admin filtering
        // Note: trust_level index already exists from trust migration
        DB::statement('CREATE INDEX IF NOT EXISTS idx_company_profiles_subscription_status ON company_profiles(subscription_status)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_company_profiles_created_at ON company_profiles(created_at DESC)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_company_profiles_subscription_tier ON company_profiles(subscription_tier)');

        // Job postings indexes for admin operations
        // Note: Some indexes already exist, adding only missing ones
        DB::statement('CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_job_postings_company_status ON job_postings(company_id, status)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON job_postings(created_at DESC)');

        // Subscriptions indexes for admin monitoring
        DB::statement('CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at DESC)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber_type ON subscriptions(subscriber_type)');

        // IAP transactions indexes for admin monitoring
        DB::statement('CREATE INDEX IF NOT EXISTS idx_iap_transactions_provider ON iap_transactions(payment_provider)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_iap_transactions_created_at ON iap_transactions(created_at DESC)');

        // Match records indexes for analytics
        // Note: Some indexes already exist, adding only missing ones
        DB::statement('CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_matches_matched_at ON matches(matched_at DESC)');

        // Applications indexes for analytics
        DB::statement('CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC)');

        // Users indexes for analytics
        DB::statement('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Company profiles indexes
        DB::statement('DROP INDEX IF EXISTS idx_company_profiles_subscription_status');
        DB::statement('DROP INDEX IF EXISTS idx_company_profiles_created_at');
        DB::statement('DROP INDEX IF EXISTS idx_company_profiles_subscription_tier');

        // Job postings indexes
        DB::statement('DROP INDEX IF EXISTS idx_job_postings_status');
        DB::statement('DROP INDEX IF EXISTS idx_job_postings_company_status');
        DB::statement('DROP INDEX IF EXISTS idx_job_postings_created_at');

        // Subscriptions indexes
        DB::statement('DROP INDEX IF EXISTS idx_subscriptions_status');
        DB::statement('DROP INDEX IF EXISTS idx_subscriptions_tier');
        DB::statement('DROP INDEX IF EXISTS idx_subscriptions_created_at');
        DB::statement('DROP INDEX IF EXISTS idx_subscriptions_subscriber_type');

        // IAP transactions indexes
        DB::statement('DROP INDEX IF EXISTS idx_iap_transactions_provider');
        DB::statement('DROP INDEX IF EXISTS idx_iap_transactions_created_at');

        // Match records indexes
        DB::statement('DROP INDEX IF EXISTS idx_matches_status');
        DB::statement('DROP INDEX IF EXISTS idx_matches_created_at');
        DB::statement('DROP INDEX IF EXISTS idx_matches_matched_at');

        // Applications indexes
        DB::statement('DROP INDEX IF EXISTS idx_applications_status');
        DB::statement('DROP INDEX IF EXISTS idx_applications_created_at');

        // Users indexes
        DB::statement('DROP INDEX IF EXISTS idx_users_role');
        DB::statement('DROP INDEX IF EXISTS idx_users_created_at');
        DB::statement('DROP INDEX IF EXISTS idx_users_is_banned');
    }
};
