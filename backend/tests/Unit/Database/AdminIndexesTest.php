<?php

namespace Tests\Unit\Database;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminIndexesTest extends TestCase
{
    /**
     * Test that admin dashboard indexes exist.
     */
    public function test_admin_dashboard_indexes_exist(): void
    {
        $expectedIndexes = [
            // Company profiles
            'idx_company_profiles_subscription_status',
            'idx_company_profiles_created_at',
            'idx_company_profiles_subscription_tier',
            'idx_company_profiles_trust_level', // From trust migration

            // Job postings
            'idx_job_postings_status',
            'idx_job_postings_company_status',
            'idx_job_postings_created_at',

            // Subscriptions
            'idx_subscriptions_status',
            'idx_subscriptions_tier',
            'idx_subscriptions_created_at',
            'idx_subscriptions_subscriber_type',

            // IAP transactions
            'idx_iap_transactions_provider',
            'idx_iap_transactions_created_at',

            // Matches
            'idx_matches_status',
            'idx_matches_created_at',
            'idx_matches_matched_at',

            // Applications
            'idx_applications_status',
            'idx_applications_created_at',

            // Users
            'idx_users_role',
            'idx_users_created_at',
            'idx_users_is_banned',
        ];

        $existingIndexes = DB::select("
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname LIKE 'idx_%'
        ");

        $existingIndexNames = array_column($existingIndexes, 'indexname');

        foreach ($expectedIndexes as $expectedIndex) {
            $this->assertContains(
                $expectedIndex,
                $existingIndexNames,
                "Index {$expectedIndex} does not exist"
            );
        }
    }
}
