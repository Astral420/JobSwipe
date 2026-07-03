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
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class ProfileServiceUnitTest extends TestCase
{
    public function test_calculate_applicant_completion_handles_zero_and_full_completion(): void
    {
        /** @var ApplicantProfileDocumentRepository&MockObject $applicantDocs */
        $applicantDocs = $this->createMock(ApplicantProfileDocumentRepository::class);

        $applicantDocs->expects($this->exactly(2))
            ->method('update');

        $service = $this->makeService(
            $this->createMock(ApplicantProfileRepository::class),
            $this->createMock(CompanyProfileRepository::class),
            $applicantDocs,
            $this->createMock(CompanyProfileDocumentRepository::class),
        );

        $empty = new ApplicantProfileDocument;
        $empty->first_name = '';
        $empty->last_name = '';
        $empty->location = null;
        $empty->resume_url = null;
        $empty->skills = [];
        $empty->social_links = [];
        $empty->work_experience = [];
        $empty->education = [];

        $emptyPercentage = $service->calculateApplicantCompletion($empty);
        $this->assertSame(0, $emptyPercentage);

        $full = new ApplicantProfileDocument;
        $full->first_name = 'Jane';
        $full->last_name = 'Doe';
        $full->location = 'Makati';
        $full->resume_url = 'https://cdn/jobswipe/resume.pdf';
        $full->skills = [['name' => 'PHP']];
        $full->profile_photo_url = 'https://cdn/jobswipe/photo.png';
        $full->bio = 'Bio';
        $full->work_experience = [['company' => 'Acme']];
        $full->education = [['institution' => 'UP']];
        $full->cover_letter_url = 'https://cdn/jobswipe/cover.pdf';
        $full->social_links = ['github' => 'https://github.com/jane'];

        $fullPercentage = $service->calculateApplicantCompletion($full);
        $this->assertSame(100, $fullPercentage);
    }

    public function test_calculate_company_completion_handles_required_fields_and_subscription(): void
    {
        /** @var CompanyProfileDocumentRepository&MockObject $companyDocs */
        $companyDocs = $this->createMock(CompanyProfileDocumentRepository::class);

        $companyDocs->expects($this->once())
            ->method('update');

        $service = $this->makeService(
            $this->createMock(ApplicantProfileRepository::class),
            $this->createMock(CompanyProfileRepository::class),
            $this->createMock(ApplicantProfileDocumentRepository::class),
            $companyDocs,
        );

        $profile = new CompanyProfileDocument;
        $profile->company_name = 'JobSwipe Inc';
        $profile->description = 'Company description';
        $profile->industry = 'Software';
        $profile->company_size = '11-50';
        $profile->logo_url = 'https://cdn.jobswipe/logo.png';
        $profile->website_url = 'https://jobswipe.com';
        $profile->office_images = ['https://cdn.jobswipe/office1.png'];
        $profile->address = ['city' => 'Makati'];
        $profile->verification_documents = ['https://cdn.jobswipe/doc1.pdf'];

        $company = new CompanyProfile;
        $company->verification_status = 'pending';
        $company->subscription_status = 'active';

        $percentage = $service->calculateCompanyCompletion($profile, $company);

        $this->assertSame(100, $percentage);
    }

    public function test_get_onboarding_status_for_applicant_uses_profile_document_state(): void
    {
        /** @var ApplicantProfileDocumentRepository&MockObject $applicantDocs */
        $applicantDocs = $this->createMock(ApplicantProfileDocumentRepository::class);

        $profile = new ApplicantProfileDocument;
        $profile->user_id = 'user-1';
        $profile->onboarding_step = 3;
        $profile->profile_completion_percentage = 50;

        $applicantDocs->expects($this->once())
            ->method('findByUserId')
            ->with('user-1')
            ->willReturn($profile);

        $service = $this->makeService(
            $this->createMock(ApplicantProfileRepository::class),
            $this->createMock(CompanyProfileRepository::class),
            $applicantDocs,
            $this->createMock(CompanyProfileDocumentRepository::class),
        );

        $status = $service->getOnboardingStatus('user-1', 'applicant');

        $this->assertSame(3, $status['onboarding_step']);
        $this->assertFalse($status['completed']);
        $this->assertSame(6, $status['total_steps']);
        $this->assertSame(50, $status['profile_completion_percentage']);
    }

    public function test_add_office_image_throws_when_max_limit_reached(): void
    {
        /** @var CompanyProfileRepository&MockObject $companyRepo */
        $companyRepo = $this->createMock(CompanyProfileRepository::class);
        /** @var CompanyProfileDocumentRepository&MockObject $companyDocs */
        $companyDocs = $this->createMock(CompanyProfileDocumentRepository::class);

        $company = new CompanyProfile;
        $company->id = 'company-1';

        $companyRepo->expects($this->once())
            ->method('findByUserId')
            ->with('user-1')
            ->willReturn($company);

        $profile = new CompanyProfileDocument;
        $profile->office_images = array_fill(0, ProfileOnboardingService::MAX_OFFICE_IMAGES, 'https://cdn.jobswipe.test/office.jpg');

        $companyDocs->expects($this->once())
            ->method('findByUserId')
            ->with('user-1')
            ->willReturn($profile);

        $service = $this->makeService(
            $this->createMock(ApplicantProfileRepository::class),
            $companyRepo,
            $this->createMock(ApplicantProfileDocumentRepository::class),
            $companyDocs,
        );

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('MAX_IMAGES_EXCEEDED');

        $service->addOfficeImage('user-1', 'https://cdn.jobswipe.test/new-office.jpg');
    }

    public function test_complete_onboarding_step_rejects_out_of_order_step_for_applicant(): void
    {
        /** @var ApplicantProfileDocumentRepository&MockObject $applicantDocs */
        $applicantDocs = $this->createMock(ApplicantProfileDocumentRepository::class);

        $profile = new ApplicantProfileDocument;
        $profile->onboarding_step = 3;

        $applicantDocs->expects($this->once())
            ->method('findByUserId')
            ->with('user-1')
            ->willReturn($profile);

        $service = $this->makeService(
            $this->createMock(ApplicantProfileRepository::class),
            $this->createMock(CompanyProfileRepository::class),
            $applicantDocs,
            $this->createMock(CompanyProfileDocumentRepository::class),
        );

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('INVALID_ONBOARDING_STEP');

        $service->completeOnboardingStep('user-1', 'applicant', 2, []);
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
