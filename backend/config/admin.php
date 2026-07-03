<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Admin Roles
    |--------------------------------------------------------------------------
    |
    | Defines the three-tier admin role hierarchy with labels and descriptions.
    | Roles: super_admin > admin > moderator
    |
    */

    'roles' => [
        'super_admin' => [
            'label' => 'Super Administrator',
            'description' => 'Full system access including destructive operations and admin user management',
        ],
        'admin' => [
            'label' => 'Administrator',
            'description' => 'Most administrative actions except destructive operations and admin user management',
        ],
        'moderator' => [
            'label' => 'Moderator',
            'description' => 'Read-only access with content moderation capabilities',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Permission Matrix
    |--------------------------------------------------------------------------
    |
    | Defines all permissions across admin features with role assignments.
    | Each permission maps to an array of roles that have access.
    |
    */

    'permissions' => [
        // Dashboard Permissions
        'dashboard.view' => ['moderator', 'admin', 'super_admin'],
        'dashboard.analytics' => ['admin', 'super_admin'],
        'dashboard.system_health' => ['super_admin'],

        // User Management Permissions
        'users.view' => ['moderator', 'admin', 'super_admin'],
        'users.ban' => ['super_admin'],
        'users.unban' => ['super_admin'],

        // Company Management Permissions
        'companies.view' => ['moderator', 'admin', 'super_admin'],
        'companies.verify' => ['admin', 'super_admin'],
        'companies.reject_verification' => ['admin', 'super_admin'],
        'companies.suspend' => ['super_admin'],
        'companies.unsuspend' => ['super_admin'],

        // Job Posting Moderation Permissions
        'jobs.view' => ['moderator', 'admin', 'super_admin'],
        'jobs.flag' => ['admin', 'super_admin'],
        'jobs.unflag' => ['admin', 'super_admin'],
        'jobs.close' => ['admin', 'super_admin'],
        'jobs.delete' => ['super_admin'],

        // Review Moderation Permissions
        'reviews.view' => ['moderator', 'admin', 'super_admin'],
        'reviews.unflag' => ['admin', 'super_admin'],
        'reviews.remove' => ['admin', 'super_admin'],

        // Subscription Management Permissions
        'subscriptions.view' => ['moderator', 'admin', 'super_admin'],
        'subscriptions.cancel' => ['super_admin'],

        // IAP Transaction Monitoring Permissions
        'iap.view' => ['moderator', 'admin', 'super_admin'],
        'iap.retry_webhook' => ['super_admin'],

        // Trust System Management Permissions
        'trust.view' => ['moderator', 'admin', 'super_admin'],
        'trust.recalculate' => ['admin', 'super_admin'],
        'trust.adjust' => ['super_admin'],

        // Match Management Permissions
        'matches.view' => ['moderator', 'admin', 'super_admin'],

        // Application Management Permissions
        'applications.view' => ['moderator', 'admin', 'super_admin'],

        // Admin User Management Permissions
        'admin_users.view' => ['super_admin'],
        'admin_users.create' => ['super_admin'],
        'admin_users.update' => ['super_admin'],
        'admin_users.deactivate' => ['super_admin'],
        'admin_users.reactivate' => ['super_admin'],

        // Audit Log Permissions
        'audit.view_own' => ['moderator', 'admin'],
        'audit.view_all' => ['super_admin'],
        'audit.export' => ['super_admin'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Rate Limits
    |--------------------------------------------------------------------------
    |
    | Role-based rate limiting for different operation types.
    | Values are requests per minute.
    |
    */

    'rate_limits' => [
        'read' => [
            'moderator' => 100,
            'admin' => 100,
            'super_admin' => 200,
        ],
        'write' => [
            'admin' => 30,
            'super_admin' => 50,
        ],
        'destructive' => [
            'super_admin' => 10,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Session Configuration
    |--------------------------------------------------------------------------
    |
    | Admin session and token management settings.
    |
    */

    'session' => [
        // Token expiration in hours
        'token_expiration_hours' => 24,

        // Inactivity timeout in minutes
        'inactivity_timeout_minutes' => 120,
    ],

    /*
    |--------------------------------------------------------------------------
    | Security Configuration
    |--------------------------------------------------------------------------
    |
    | Security settings for admin authentication and authorization.
    |
    */

    'security' => [
        // Maximum failed authentication attempts before lockout
        'max_failed_auth_attempts' => 10,

        // Account lockout duration in minutes
        'lockout_duration_minutes' => 5,

        // Minimum password length for admin users
        'password_min_length' => 12,

        // Password must contain uppercase letter
        'password_require_uppercase' => true,

        // Password must contain lowercase letter
        'password_require_lowercase' => true,

        // Password must contain number
        'password_require_number' => true,

        // Password must contain special character
        'password_require_special' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Admin Dashboard Cache Configuration
    |--------------------------------------------------------------------------
    |
    | This configuration defines cache TTL (Time To Live) values for admin
    | dashboard endpoints. All values are in seconds.
    |
    */

    'cache' => [
        // Dashboard statistics cache TTL (15 minutes)
        'dashboard_stats' => env('ADMIN_CACHE_DASHBOARD_STATS', 900),

        // Company lists cache TTL (5 minutes)
        'company_lists' => env('ADMIN_CACHE_COMPANY_LISTS', 300),

        // Revenue data cache TTL (1 hour)
        'revenue_data' => env('ADMIN_CACHE_REVENUE_DATA', 3600),

        // Trust events cache TTL (10 minutes)
        'trust_events' => env('ADMIN_CACHE_TRUST_EVENTS', 600),

        // Match statistics cache TTL (15 minutes)
        'match_stats' => env('ADMIN_CACHE_MATCH_STATS', 900),

        // Application statistics cache TTL (15 minutes)
        'application_stats' => env('ADMIN_CACHE_APPLICATION_STATS', 900),

        // User growth data cache TTL (15 minutes)
        'user_growth' => env('ADMIN_CACHE_USER_GROWTH', 900),

        // Recent activity cache TTL (5 minutes)
        'recent_activity' => env('ADMIN_CACHE_RECENT_ACTIVITY', 300),
    ],

    /*
    |--------------------------------------------------------------------------
    | Admin Dashboard Pagination
    |--------------------------------------------------------------------------
    |
    | Default pagination settings for admin endpoints.
    |
    */

    'pagination' => [
        // Default items per page
        'default_per_page' => 20,

        // Maximum items per page
        'max_per_page' => 100,
    ],

    /*
    |--------------------------------------------------------------------------
    | Admin Dashboard Cache Key Prefixes
    |--------------------------------------------------------------------------
    |
    | Prefixes for Redis cache keys to organize admin data.
    |
    */

    'cache_keys' => [
        'dashboard_stats' => 'admin:dashboard:stats',
        'user_growth' => 'admin:dashboard:user_growth',
        'revenue_data' => 'admin:dashboard:revenue',
        'recent_activity' => 'admin:dashboard:activity',
        'company_list' => 'admin:companies:list',
        'company_details' => 'admin:company',
        'trust_low_companies' => 'admin:trust:low_companies',
        'match_stats' => 'admin:matches:stats',
        'application_stats' => 'admin:applications:stats',
        'subscription_revenue' => 'admin:subscriptions:revenue',
        'permissions' => 'admin:permissions',
    ],

    /*
    |--------------------------------------------------------------------------
    | Admin Trust Score Thresholds
    |--------------------------------------------------------------------------
    |
    | Trust score thresholds for admin operations.
    |
    */

    'trust' => [
        // Companies below this score are considered "low trust"
        'low_trust_threshold' => 40,

        // Companies below this score cannot create job postings
        'job_posting_threshold' => 20,
    ],

    /*
    |--------------------------------------------------------------------------
    | Admin Webhook Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for webhook event management.
    |
    */

    'webhooks' => [
        // Maximum retry attempts before flagging for manual review
        'max_retry_attempts' => 3,
    ],

    /*
    |--------------------------------------------------------------------------
    | Admin Invitation Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for admin user invitation and onboarding.
    |
    */

    'invitation' => [
        // Invitation token expiration in days
        'token_expiration_days' => 7,
    ],

    /*
    |--------------------------------------------------------------------------
    | Audit Log Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for audit log retention and management.
    |
    */

    'audit' => [
        // Audit log retention period in years
        'retention_years' => 2,

        // Action types that should be logged
        'action_types' => [
            'user_ban',
            'user_unban',
            'company_suspend',
            'company_unsuspend',
            'company_verification_approve',
            'company_verification_reject',
            'job_flag',
            'job_unflag',
            'job_close',
            'job_force_delete',
            'review_unflag',
            'review_remove',
            'subscription_cancel',
            'webhook_retry',
            'trust_score_recalculate',
            'trust_score_adjust',
            'admin_user_create',
            'admin_user_update',
            'admin_user_deactivate',
            'admin_user_reactivate',
            'admin_role_change',
            'admin_session_terminate',
        ],
    ],
];
