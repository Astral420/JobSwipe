<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Trust Score Component Weights
    |--------------------------------------------------------------------------
    */
    'weights' => [
        'email_domain' => 10,
        'document_verification' => 30,
        'account_age' => 10,
        'company_reviews' => 20,
        'behavioral' => 20,
        'subscription' => 10,
    ],

    /*
    |--------------------------------------------------------------------------
    | Trust Levels -> Capability Mapping
    |--------------------------------------------------------------------------
    */
    'levels' => [
        'untrusted' => [
            'min_score' => 0,
            'listing_cap' => 0,
            'visibility_multiplier' => 0.0,
        ],
        'new' => [
            'min_score' => 31,
            'listing_cap' => 2,
            'visibility_multiplier' => 0.6,
        ],
        'established' => [
            'min_score' => 51,
            'listing_cap' => 5,
            'visibility_multiplier' => 1.0,
        ],
        'trusted' => [
            'min_score' => 76,
            'listing_cap' => 15,
            'visibility_multiplier' => 1.1,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Premium Subscription Listing Bonus
    |--------------------------------------------------------------------------
    */
    'premium_listing_bonus' => [
        'basic' => 3,
        'pro' => 8,
    ],

    /*
    |--------------------------------------------------------------------------
    | Review Score Configuration
    |--------------------------------------------------------------------------
    */
    'reviews' => [
        'minimum_count' => 3,
    ],

    /*
    |--------------------------------------------------------------------------
    | Behavioral Score Configuration
    |--------------------------------------------------------------------------
    */
    'behavioral' => [
        'base_score' => 15,
        'max_score' => 20,
        'clean_month_bonus' => 1,
        'job_flagged_penalty' => -5,
        'spam_confirmed_penalty' => -10,
        'warning_penalty' => -8,
    ],

    /*
    |--------------------------------------------------------------------------
    | Cache Configuration
    |--------------------------------------------------------------------------
    */
    'cache' => [
        'ttl_seconds' => 3600,
        'prefix' => 'trust:score:',
    ],

    /*
    |--------------------------------------------------------------------------
    | Grandfathering
    |--------------------------------------------------------------------------
    */
    'grandfather_min_score' => 60,
];
