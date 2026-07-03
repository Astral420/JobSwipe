<?php

namespace App\Models\MongoDB;

use MongoDB\Laravel\Eloquent\Model;

class ApplicantProfileDocument extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'applicant_profiles';

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'profile_photo_url',
        'cover_url',
        'photos',
        'bio',
        'location',
        'location_city',
        'location_country',
        'location_region',
        'linkedin_url',
        'social_links',
        'resume_url',
        'cover_letter_url',
        'portfolio_url',
        'skills',
        'job_preferences',
        'work_experience',
        'education',
        'notification_preferences',
        'onboarding_step',
        'onboarding_completed_at',
        'profile_completion_percentage',
    ];

    protected $casts = [
        'skills' => 'array',
        'job_preferences' => 'array',
        'work_experience' => 'array',
        'education' => 'array',
        'social_links' => 'array',
        'notification_preferences' => 'array',
        'photos' => 'array',
        'onboarding_completed_at' => 'datetime',
        'profile_completion_percentage' => 'integer',
    ];

    /**
     * Get default notification preferences
     */
    public function getDefaultNotificationPreferences(): array
    {
        return [
            'email_enabled' => true,
            'push_enabled' => true,
            'channels' => [
                'match_found' => ['email' => true, 'push' => true],
                'profile_tips' => ['email' => false, 'push' => false],
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
