<?php

namespace App\Services;

use App\Models\MongoDB\ApplicantProfileDocument;
use App\Models\MongoDB\CompanyProfileDocument;
use App\Models\PostgreSQL\CompanyProfile;

class ProfileCompletionService
{
    public function calculateApplicantCompletionPercentage(ApplicantProfileDocument $profile): int
    {
        $requiredTotal = 5;
        $optionalTotal = 6;

        $requiredFilled = 0;
        $optionalFilled = 0;

        if ($this->filled($profile->first_name ?? null)) {
            $requiredFilled++;
        }

        if ($this->filled($profile->last_name ?? null)) {
            $requiredFilled++;
        }

        if ($this->filled($profile->location ?? null)) {
            $requiredFilled++;
        }

        if ($this->filled($profile->resume_url ?? null)) {
            $requiredFilled++;
        }

        if (! empty($profile->skills) && count($profile->skills) > 0) {
            $requiredFilled++;
        }

        if ($this->filled($profile->profile_photo_url ?? null)) {
            $optionalFilled++;
        }

        if ($this->filled($profile->bio ?? null)) {
            $optionalFilled++;
        }

        if (! empty($profile->work_experience) && count($profile->work_experience) > 0) {
            $optionalFilled++;
        }

        if (! empty($profile->education) && count($profile->education) > 0) {
            $optionalFilled++;
        }

        if ($this->filled($profile->cover_letter_url ?? null)) {
            $optionalFilled++;
        }

        if (! empty($profile->social_links) && count($profile->social_links) > 0) {
            $optionalFilled++;
        }

        $totalFields = $requiredTotal + $optionalTotal;
        $filledFields = $requiredFilled + $optionalFilled;

        return (int) round(($filledFields / $totalFields) * 100);
    }

    public function calculateCompanyCompletionPercentage(
        CompanyProfileDocument $profile,
        CompanyProfile $companyProfile
    ): int {
        $requiredTotal = 6;
        $optionalTotal = 4;

        $requiredFilled = 0;
        $optionalFilled = 0;

        if ($this->filled($profile->company_name ?? null)) {
            $requiredFilled++;
        }

        if ($this->filled($profile->description ?? null)) {
            $requiredFilled++;
        }

        if ($this->filled($profile->industry ?? null)) {
            $requiredFilled++;
        }

        if ($this->filled($profile->company_size ?? null)) {
            $requiredFilled++;
        }

        if ($this->filled($profile->logo_url ?? null)) {
            $requiredFilled++;
        }

        // Verification documents submitted counts toward completion
        if (in_array($companyProfile->verification_status, ['pending', 'approved'], true)) {
            $requiredFilled++;
        }

        if ($this->filled($profile->website_url ?? null)) {
            $optionalFilled++;
        }

        if (! empty($profile->office_images) && count($profile->office_images) > 0) {
            $optionalFilled++;
        }

        if (! empty($profile->address) && count((array) $profile->address) > 0) {
            $optionalFilled++;
        }

        if (! empty($profile->verification_documents) && count($profile->verification_documents) > 0) {
            $optionalFilled++;
        }

        $totalFields = $requiredTotal + $optionalTotal;
        $filledFields = $requiredFilled + $optionalFilled;

        return (int) round(($filledFields / $totalFields) * 100);
    }

    private function filled(mixed $value): bool
    {
        return is_string($value) ? trim($value) !== '' : ! empty($value);
    }
}
