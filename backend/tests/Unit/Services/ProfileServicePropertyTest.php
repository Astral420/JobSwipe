<?php

namespace Tests\Unit\Services;

use App\Models\MongoDB\ApplicantProfileDocument;
use App\Models\MongoDB\CompanyProfileDocument;
use App\Models\PostgreSQL\CompanyProfile;
use App\Repositories\MongoDB\ApplicantProfileDocumentRepository;
use App\Repositories\MongoDB\CompanyProfileDocumentRepository;
use App\Repositories\PostgreSQL\ApplicantProfileRepository;
use App\Repositories\PostgreSQL\CompanyProfileRepository;
use App\Services\PointService;
use App\Services\ProfileCompletionService;
use App\Services\ProfileOnboardingService;
use App\Services\ProfileService;
use App\Services\ProfileSocialLinksValidator;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class ProfileServicePropertyTest extends TestCase
{
    private ProfileService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = $this->makeService(
            $this->createMock(ApplicantProfileRepository::class),
            $this->createMock(CompanyProfileRepository::class),
            $this->createMock(ApplicantProfileDocumentRepository::class),
            $this->createMock(CompanyProfileDocumentRepository::class),
        );
    }

    public function test_property_linked_in_url_validation(): void
    {
        $this->invokeValidateSocialLinks([
            'linkedin' => 'https://linkedin.com/in/jane-doe',
        ]);

        $this->invokeValidateSocialLinks([
            'linkedin' => 'https://www.linkedin.com/in/jane-doe',
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('INVALID_URL:linkedin');

        $this->invokeValidateSocialLinks([
            'linkedin' => 'http://linkedin.com/company/jobswipe',
        ]);
    }

    public function test_property_github_url_validation(): void
    {
        $this->invokeValidateSocialLinks([
            'github' => 'https://github.com/jobswipe',
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('INVALID_URL:github');

        $this->invokeValidateSocialLinks([
            'github' => 'https://gitlab.com/jobswipe',
        ]);
    }

    public function test_property_portfolio_url_validation(): void
    {
        $this->invokeValidateSocialLinks([
            'portfolio' => 'https://portfolio.example.com',
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('INVALID_URL:portfolio');

        $this->invokeValidateSocialLinks([
            'portfolio' => 'http://portfolio.example.com',
        ]);
    }

    public function test_property_resume_is_required_for_full_applicant_completion(): void
    {
        $profile = new ApplicantProfileDocument;
        $profile->first_name = 'Jane';
        $profile->last_name = 'Doe';
        $profile->location = 'Makati';
        $profile->resume_url = null;
        $profile->skills = [['name' => 'PHP']];
        $profile->profile_photo_url = 'https://cdn.jobswipe.test/photo.png';
        $profile->bio = 'Backend dev';
        $profile->work_experience = [['company' => 'Acme']];
        $profile->education = [['institution' => 'UP']];
        $profile->cover_letter_url = 'https://cdn.jobswipe.test/cover.pdf';
        $profile->social_links = ['github' => 'https://github.com/jane'];

        $percentage = $this->service->calculateApplicantCompletion($profile);

        $this->assertLessThan(100, $percentage);
        $this->assertSame(91, $percentage);
    }

    public function test_property_company_onboarding_rejects_out_of_sequence_steps(): void
    {
        /** @var CompanyProfileRepository $companyProfiles */
        $companyProfiles = $this->createMock(CompanyProfileRepository::class);
        /** @var CompanyProfileDocumentRepository $companyDocs */
        $companyDocs = $this->createMock(CompanyProfileDocumentRepository::class);

        $company = new CompanyProfile;
        $company->id = 'company-1';
        $company->subscription_status = 'active';
        $company->company_name = 'JobSwipe';

        $document = new CompanyProfileDocument;
        $document->onboarding_step = 2;

        $companyProfiles->method('findByUserId')->willReturn($company);
        $companyDocs->method('findByUserId')->willReturn($document);

        $service = $this->makeService(
            $this->createMock(ApplicantProfileRepository::class),
            $companyProfiles,
            $this->createMock(ApplicantProfileDocumentRepository::class),
            $companyDocs,
        );

        foreach ([1, 3, 4] as $invalidStep) {
            try {
                $service->completeOnboardingStep('user-1', 'company_admin', $invalidStep, []);
                $this->fail("Expected INVALID_ONBOARDING_STEP for step {$invalidStep}");
            } catch (InvalidArgumentException $exception) {
                $this->assertSame('INVALID_ONBOARDING_STEP', $exception->getMessage());
            }
        }
    }

    private function invokeValidateSocialLinks(array $socialLinks): void
    {
        $ref = new ReflectionClass($this->service);
        $method = $ref->getMethod('validateSocialLinks');
        $method->setAccessible(true);
        $method->invoke($this->service, $socialLinks);
    }

    private function makeService(
        ApplicantProfileRepository $applicantProfiles,
        CompanyProfileRepository $companyProfiles,
        ApplicantProfileDocumentRepository $applicantDocs,
        CompanyProfileDocumentRepository $companyDocs,
    ): ProfileService {
        $completion = new ProfileCompletionService;
        $socialLinksValidator = new ProfileSocialLinksValidator;
        $onboarding = new ProfileOnboardingService(
            $applicantDocs,
            $companyDocs,
            $companyProfiles,
            $completion,
            $socialLinksValidator,
        );

        return new ProfileService(
            $applicantProfiles,
            $companyProfiles,
            $applicantDocs,
            $companyDocs,
            $this->createMock(PointService::class),
            $completion,
            $onboarding,
            $socialLinksValidator,
        );
    }
}
