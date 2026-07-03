<?php

namespace App\Models\MongoDB;

use MongoDB\Laravel\Eloquent\Model;

class CompanyProfileDocument extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'company_profiles';

    protected $fillable = [
        'user_id',
        'company_id',
        'company_name',
        'tagline',
        'description',
        'industry',
        'company_size',
        'founded_year',
        'website_url',
        'logo_url',
        'cover_photo',
        'office_images',
        'social_links',
        'address',
        'benefits',
        'culture_tags',
        'notification_preferences',
        'verification_documents',
        'onboarding_step',
        'onboarding_completed_at',
        'profile_completion_percentage',
    ];

    protected $casts = [
        'founded_year' => 'integer',
        'onboarding_completed_at' => 'datetime',
        'profile_completion_percentage' => 'integer',
    ];

    /**
     * Get default notification preferences for company/HR users
     */
    public function getDefaultNotificationPreferences(): array
    {
        return [
            'email_enabled' => true,
            'push_enabled' => true,
            'channels' => [
                'new_application' => ['email' => true, 'push' => true],
                'applicant_response' => ['email' => true, 'push' => true],
                'job_expiring_soon' => ['email' => true, 'push' => false],
            ],
        ];
    }

    /**
     * Get notification preferences with defaults
     */
    public function getNotificationPreferences(): array
    {
        return $this->notification_preferences ?? $this->getDefaultNotificationPreferences();
    }
}
