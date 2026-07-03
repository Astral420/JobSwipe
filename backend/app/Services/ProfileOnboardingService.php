<?php

namespace App\Services;

use App\Models\MongoDB\ApplicantProfileDocument;
use App\Models\MongoDB\CompanyProfileDocument;
use App\Models\PostgreSQL\CompanyProfile;
use App\Repositories\MongoDB\ApplicantProfileDocumentRepository;
use App\Repositories\MongoDB\CompanyProfileDocumentRepository;
use App\Repositories\PostgreSQL\CompanyProfileRepository;
use InvalidArgumentException;

class ProfileOnboardingService
{
    public const APPLICANT_ONBOARDING_STEPS = 6;

    public const COMPANY_ONBOARDING_STEPS = 3;

    public const MAX_OFFICE_IMAGES = 6;

    public function __construct(
        private ApplicantProfileDocumentRepository $applicantDocs,
        private CompanyProfileDocumentRepository $companyDocs,
        private CompanyProfileRepository $companyProfiles,
        private ProfileCompletionService $completion,
        private ProfileSocialLinksValidator $socialLinksValidator,
    ) {}

    public function getOnboardingStatus(string $userId, string $role): array
    {
        if ($role === 'applicant') {
            $profile = $this->ensureApplicantDocument($userId);
            $step = $profile->onboarding_step ?? 1;

            return [
                'onboarding_step' => $step,
                'completed' => $step === 'completed',
                'total_steps' => self::APPLICANT_ONBOARDING_STEPS,
                'steps' => $this->applicantOnboardingSteps(),
                'profile_completion_percentage' => $profile->profile_completion_percentage ?? 0,
            ];
        }

        $companyProfile = $this->findCompanyProfileByUserId($userId);
        $profile = $this->ensureCompanyDocument($userId, $companyProfile);
        $step = $profile->onboarding_step ?? 1;

        return [
            'onboarding_step' => $step,
            'completed' => $step === 'completed',
            'total_steps' => self::COMPANY_ONBOARDING_STEPS,
            'steps' => $this->companyOnboardingSteps(),
            'profile_completion_percentage' => $profile->profile_completion_percentage ?? 0,
        ];
    }

    public function completeOnboardingStep(string $userId, string $role, int $step, array $data = []): array
    {
        if ($role === 'applicant') {
            $profile = $this->ensureApplicantDocument($userId);
            $currentStep = $profile->onboarding_step ?? 1;

            if ($currentStep === 'completed') {
                return $this->getOnboardingStatus($userId, $role);
            }

            if ((int) $currentStep !== $step) {
                throw new InvalidArgumentException('INVALID_ONBOARDING_STEP');
            }

            $this->applyApplicantOnboardingStep($userId, $step, $data);
            $profile = $this->ensureApplicantDocument($userId);

            if ($step >= self::APPLICANT_ONBOARDING_STEPS) {
                $this->markOnboardingComplete($profile);
            } else {
                $this->applicantDocs->update($profile, ['onboarding_step' => $step + 1]);
            }

            return $this->getOnboardingStatus($userId, $role);
        }

        $companyProfile = $this->findCompanyProfileByUserId($userId);
        $profile = $this->ensureCompanyDocument($userId, $companyProfile);
        $currentStep = $profile->onboarding_step ?? 1;

        if ($currentStep === 'completed') {
            return $this->getOnboardingStatus($userId, $role);
        }

        if ((int) $currentStep !== $step) {
            throw new InvalidArgumentException('INVALID_ONBOARDING_STEP');
        }

        $this->applyCompanyOnboardingStep($userId, $step, $data);
        $profile = $this->ensureCompanyDocument($userId, $companyProfile);

        if ($step >= self::COMPANY_ONBOARDING_STEPS) {
            $this->markOnboardingComplete($profile);
        } else {
            $this->companyDocs->update($profile, ['onboarding_step' => $step + 1]);
        }

        return $this->getOnboardingStatus($userId, $role);
    }

    public function getProfileCompletion(string $userId, string $role): int
    {
        if ($role === 'applicant') {
            $profile = $this->ensureApplicantDocument($userId);

            return $this->calculateApplicantCompletion($profile);
        }

        $companyProfile = $this->findCompanyProfileByUserId($userId);
        $profile = $this->ensureCompanyDocument($userId, $companyProfile);

        return $this->calculateCompanyCompletion($profile, $companyProfile);
    }

    public function ensureApplicantDocument(string $userId): ApplicantProfileDocument
    {
        $profile = $this->applicantDocs->findByUserId($userId);

        if ($profile) {
            if (! $this->filled($profile->user_id ?? null)) {
                $profile = $this->applicantDocs->update($profile, ['user_id' => $userId]);
            }

            return $profile;
        }

        return $this->applicantDocs->create([
            'user_id' => $userId,
            'first_name' => '',
            'last_name' => '',
            'profile_photo_url' => null,
            'bio' => null,
            'location' => null,
            'location_city' => null,
            'location_region' => null,
            'skills' => ['hard_skills' => [], 'soft_skills' => []],
            'job_preferences' => null,
            'work_experience' => [],
            'education' => [],
            'social_links' => [],
            'notification_preferences' => [],
            'onboarding_step' => 1,
            'onboarding_completed_at' => null,
            'profile_completion_percentage' => 0,
        ]);
    }

    public function ensureCompanyDocument(string $userId, CompanyProfile $companyProfile): CompanyProfileDocument
    {
        $profile = $this->companyDocs->findByUserId($userId);

        if (! $profile) {
            $profile = $this->companyDocs->findByCompanyId($companyProfile->id);
        }

        if ($profile) {
            $repair = [];

            if (! $this->filled($profile->user_id ?? null)) {
                $repair['user_id'] = $userId;
            }

            if (! $this->filled($profile->company_id ?? null)) {
                $repair['company_id'] = $companyProfile->id;
            }

            foreach ([
                'office_images',
                'social_links',
                'address',
                'benefits',
                'culture_tags',
                'notification_preferences',
                'verification_documents',
            ] as $field) {
                $value = $profile->{$field} ?? null;

                if (! is_string($value)) {
                    continue;
                }

                $decoded = json_decode($value, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $repair[$field] = $decoded;
                }
            }

            if ($repair !== []) {
                return $this->companyDocs->update($profile, $repair);
            }

            return $profile;
        }

        return $this->companyDocs->create([
            'user_id' => $userId,
            'company_id' => $companyProfile->id,
            'company_name' => $companyProfile->company_name,
            'tagline' => null,
            'description' => null,
            'industry' => null,
            'company_size' => null,
            'founded_year' => null,
            'website_url' => null,
            'logo_url' => null,
            'office_images' => [],
            'social_links' => [],
            'address' => [],
            'benefits' => [],
            'culture_tags' => [],
            'notification_preferences' => [],
            'verification_documents' => [],
            'onboarding_step' => 1,
            'onboarding_completed_at' => null,
            'profile_completion_percentage' => 0,
        ]);
    }

    public function findCompanyProfileByUserId(string $userId): CompanyProfile
    {
        $companyProfile = $this->companyProfiles->findByUserId($userId);

        if (! $companyProfile) {
            throw new InvalidArgumentException('COMPANY_PROFILE_NOT_FOUND');
        }

        return $companyProfile;
    }

    private function calculateApplicantCompletion(ApplicantProfileDocument $profile): int
    {
        $percentage = $this->completion->calculateApplicantCompletionPercentage($profile);
        $this->applicantDocs->update($profile, ['profile_completion_percentage' => $percentage]);

        return $percentage;
    }

    private function calculateCompanyCompletion(CompanyProfileDocument $profile, CompanyProfile $companyProfile): int
    {
        $percentage = $this->completion->calculateCompanyCompletionPercentage($profile, $companyProfile);
        $this->companyDocs->update($profile, ['profile_completion_percentage' => $percentage]);

        return $percentage;
    }

    private function applyApplicantOnboardingStep(string $userId, int $step, array $data): void
    {
        match ($step) {
            1 => $this->completeApplicantStepBasicInfo($userId, $data),
            2 => $this->completeApplicantStepResume($userId, $data),
            3 => $this->completeApplicantStepSkills($userId, $data),
            4 => $this->completeApplicantStepExperienceEducation($userId, $data),
            5 => $this->completeApplicantStepPhoto($userId, $data),
            6 => $this->completeApplicantStepSocialLinks($userId, $data),
            default => throw new InvalidArgumentException('INVALID_ONBOARDING_STEP'),
        };
    }

    private function applyCompanyOnboardingStep(string $userId, int $step, array $data): void
    {
        match ($step) {
            1 => $this->completeCompanyStepDetails($userId, $data),
            2 => $this->completeCompanyStepVerification($userId, $data),
            3 => $this->completeCompanyStepMedia($userId, $data),
            default => throw new InvalidArgumentException('INVALID_ONBOARDING_STEP'),
        };
    }

    private function completeApplicantStepBasicInfo(string $userId, array $data): void
    {
        foreach (['first_name', 'last_name', 'location'] as $field) {
            if (! $this->filled($data[$field] ?? null)) {
                throw new InvalidArgumentException('STEP_DATA_INVALID');
            }
        }

        $profile = $this->ensureApplicantDocument($userId);
        $this->applicantDocs->update($profile, [
            'first_name' => (string) $data['first_name'],
            'last_name' => (string) $data['last_name'],
            'location' => (string) $data['location'],
            'bio' => $data['bio'] ?? $profile->bio,
            'location_city' => $data['location_city'] ?? $profile->location_city,
            'location_region' => $data['location_region'] ?? $profile->location_region,
        ]);
    }

    private function completeApplicantStepResume(string $userId, array $data): void
    {
        if (! $this->filled($data['resume_url'] ?? null)) {
            throw new InvalidArgumentException('STEP_DATA_INVALID');
        }

        $profile = $this->ensureApplicantDocument($userId);
        $this->applicantDocs->update($profile, ['resume_url' => (string) $data['resume_url']]);
    }

    private function completeApplicantStepSkills(string $userId, array $data): void
    {
        // Accept both nested structure and flat array for backward compatibility
        if (isset($data['skills']['hard_skills']) || isset($data['skills']['soft_skills'])) {
            // New nested structure
            $skillsData = [
                'hard_skills' => $data['skills']['hard_skills'] ?? [],
                'soft_skills' => $data['skills']['soft_skills'] ?? [],
            ];
        } elseif (isset($data['hard_skills']) || isset($data['soft_skills'])) {
            // Direct hard_skills/soft_skills in data
            $skillsData = [
                'hard_skills' => $data['hard_skills'] ?? [],
                'soft_skills' => $data['soft_skills'] ?? [],
            ];
        } elseif (isset($data['skills']) && is_array($data['skills'])) {
            // Legacy flat array - treat all as hard skills
            $skillsData = [
                'hard_skills' => array_values($data['skills']),
                'soft_skills' => [],
            ];
        } else {
            throw new InvalidArgumentException('STEP_DATA_INVALID');
        }

        // Validate at least one skill
        if (empty($skillsData['hard_skills']) && empty($skillsData['soft_skills'])) {
            throw new InvalidArgumentException('STEP_DATA_INVALID');
        }

        $profile = $this->ensureApplicantDocument($userId);
        $this->applicantDocs->update($profile, ['skills' => $skillsData]);
    }

    private function completeApplicantStepExperienceEducation(string $userId, array $data): void
    {
        $profile = $this->ensureApplicantDocument($userId);

        $this->applicantDocs->update($profile, [
            'work_experience' => isset($data['work_experience']) && is_array($data['work_experience'])
                ? array_values($data['work_experience'])
                : ($profile->work_experience ?? []),
            'education' => isset($data['education']) && is_array($data['education'])
                ? array_values($data['education'])
                : ($profile->education ?? []),
        ]);
    }

    private function completeApplicantStepPhoto(string $userId, array $data): void
    {
        if (! $this->filled($data['profile_photo_url'] ?? null)) {
            return;
        }

        $profile = $this->ensureApplicantDocument($userId);
        $this->applicantDocs->update($profile, ['profile_photo_url' => (string) $data['profile_photo_url']]);
    }

    private function completeApplicantStepSocialLinks(string $userId, array $data): void
    {
        if (! isset($data['social_links']) || ! is_array($data['social_links'])) {
            return;
        }

        $this->socialLinksValidator->validate($data['social_links']);

        $profile = $this->ensureApplicantDocument($userId);
        $this->applicantDocs->update($profile, ['social_links' => $data['social_links']]);
    }

    private function completeCompanyStepDetails(string $userId, array $data): void
    {
        foreach (['company_name', 'description', 'industry', 'company_size'] as $field) {
            if (! $this->filled($data[$field] ?? null)) {
                throw new InvalidArgumentException('STEP_DATA_INVALID');
            }
        }

        $companyProfile = $this->findCompanyProfileByUserId($userId);
        $document = $this->ensureCompanyDocument($userId, $companyProfile);

        $this->companyProfiles->update($companyProfile, [
            'company_name' => (string) $data['company_name'],
        ]);

        $this->companyDocs->update($document, [
            'company_name' => (string) $data['company_name'],
            'description' => (string) $data['description'],
            'industry' => (string) $data['industry'],
            'company_size' => (string) $data['company_size'],
            'tagline' => $data['tagline'] ?? $document->tagline,
            'founded_year' => $data['founded_year'] ?? $document->founded_year,
            'website_url' => $data['website_url'] ?? $document->website_url,
            'address' => is_array($data['address'] ?? null) ? $data['address'] : ($document->address ?? []),
            'social_links' => is_array($data['social_links'] ?? null) ? $data['social_links'] : ($document->social_links ?? []),
        ]);
    }

    private function completeCompanyStepMedia(string $userId, array $data): void
    {
        if (! $this->filled($data['logo_url'] ?? null)) {
            throw new InvalidArgumentException('STEP_DATA_INVALID');
        }

        $officeImages = $data['office_images'] ?? null;

        if (! is_array($officeImages) || count($officeImages) < 1 || count($officeImages) > self::MAX_OFFICE_IMAGES) {
            throw new InvalidArgumentException('STEP_DATA_INVALID');
        }

        $companyProfile = $this->findCompanyProfileByUserId($userId);
        $document = $this->ensureCompanyDocument($userId, $companyProfile);

        $this->companyDocs->update($document, [
            'logo_url' => (string) $data['logo_url'],
            'office_images' => array_values($officeImages),
        ]);
    }

    private function completeCompanyStepVerification(string $userId, array $data): void
    {
        // Verification documents are now required during onboarding
        if (! isset($data['verification_documents']) || ! is_array($data['verification_documents']) || count($data['verification_documents']) < 1) {
            throw new InvalidArgumentException('STEP_DATA_INVALID');
        }

        $companyProfile = $this->findCompanyProfileByUserId($userId);
        $document = $this->ensureCompanyDocument($userId, $companyProfile);

        $this->companyProfiles->update($companyProfile, ['verification_status' => 'pending']);
        $this->companyDocs->update($document, [
            'verification_documents' => array_values($data['verification_documents']),
        ]);
    }

    private function applicantOnboardingSteps(): array
    {
        return [
            ['step' => 1, 'key' => 'basic_info', 'required' => true],
            ['step' => 2, 'key' => 'resume_upload', 'required' => true],
            ['step' => 3, 'key' => 'skills', 'required' => true],
            ['step' => 4, 'key' => 'experience_education', 'required' => false],
            ['step' => 5, 'key' => 'profile_photo', 'required' => false],
            ['step' => 6, 'key' => 'social_links', 'required' => false],
        ];
    }

    private function companyOnboardingSteps(): array
    {
        return [
            ['step' => 1, 'key' => 'company_details', 'required' => true],
            ['step' => 2, 'key' => 'verification_documents', 'required' => true],
            ['step' => 3, 'key' => 'media', 'required' => true],
        ];
    }

    private function markOnboardingComplete(ApplicantProfileDocument|CompanyProfileDocument $profile): void
    {
        if ($profile instanceof ApplicantProfileDocument) {
            $this->applicantDocs->update($profile, [
                'onboarding_step' => 'completed',
                'onboarding_completed_at' => now(),
            ]);
            $this->calculateApplicantCompletion($profile->fresh());

            return;
        }

        $this->companyDocs->update($profile, [
            'onboarding_step' => 'completed',
            'onboarding_completed_at' => now(),
        ]);

        $companyProfile = null;

        if ($this->filled($profile->user_id ?? null)) {
            $companyProfile = $this->companyProfiles->findByUserId((string) $profile->user_id);
        }

        if (! $companyProfile && $this->filled($profile->company_id ?? null)) {
            $companyProfile = $this->companyProfiles->findById((string) $profile->company_id);
        }

        if (! $companyProfile) {
            throw new InvalidArgumentException('COMPANY_PROFILE_NOT_FOUND');
        }

        $this->calculateCompanyCompletion($profile->fresh(), $companyProfile);
    }

    public function filled(mixed $value): bool
    {
        return is_string($value) ? trim($value) !== '' : ! empty($value);
    }
}
