<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\Profile\ProfileController;
use App\Http\Requests\Profile\AddOfficeImageRequest;
use App\Http\Requests\Profile\UpdateApplicantBasicInfoRequest;
use App\Http\Requests\Profile\UpdateApplicantResumeRequest;
use App\Http\Requests\Profile\UpdateApplicantSkillsRequest;
use App\Http\Requests\Profile\UpdateSocialLinksRequest;
use App\Models\PostgreSQL\User;
use App\Services\FileUploadService;
use App\Services\ProfileService;
use Illuminate\Http\Request;
use InvalidArgumentException;
use PHPUnit\Framework\MockObject\MockObject;
use Tests\TestCase;

class ProfileControllerTest extends TestCase
{
    public function test_get_applicant_profile_returns_expected_payload(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $profileService->expects($this->once())
            ->method('getApplicantProfile')
            ->with('user-1')
            ->willReturn([
                'profile' => ['first_name' => 'Jane', 'last_name' => 'Doe'],
                'profile_completion_percentage' => 60,
            ]);

        $controller = new ProfileController($profileService, $fileUploadService);

        $request = Request::create('/api/v1/profile/applicant', 'GET');
        $request->setUserResolver(static fn () => (object) ['id' => 'user-1', 'role' => 'applicant']);

        $response = $controller->getApplicantProfile($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertSame(60, $payload['data']['profile_completion_percentage']);
    }

    public function test_get_applicant_profile_signs_resume_and_profile_photo_urls(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $profileService->expects($this->once())
            ->method('getApplicantProfile')
            ->with('user-1')
            ->willReturn([
                'profile' => [
                    'resume_url' => 'https://cdn.jobswipe.test/document/user-1/resume.pdf',
                    'profile_photo_url' => 'https://cdn.jobswipe.test/image/user-1/photo.jpg',
                ],
                'profile_completion_percentage' => 80,
            ]);

        $fileUploadService->expects($this->exactly(2))
            ->method('generatePresignedReadUrl')
            ->willReturnOnConsecutiveCalls(
                ['read_url' => 'https://signed.example.test/resume'],
                ['read_url' => 'https://signed.example.test/photo'],
            );

        $controller = new ProfileController($profileService, $fileUploadService);

        $request = Request::create('/api/v1/profile/applicant', 'GET');
        $request->setUserResolver(static fn () => (object) ['id' => 'user-1', 'role' => 'applicant']);

        $response = $controller->getApplicantProfile($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertSame('https://signed.example.test/resume', $payload['data']['profile']['resume_url']);
        $this->assertSame('https://signed.example.test/photo', $payload['data']['profile']['profile_photo_url']);
    }

    public function test_update_social_links_returns_invalid_url_error(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $profileService->expects($this->once())
            ->method('updateSocialLinks')
            ->willThrowException(new InvalidArgumentException('INVALID_URL:github'));

        $controller = new ProfileController($profileService, $fileUploadService);

        $request = $this->createMock(UpdateSocialLinksRequest::class);
        $request->expects($this->once())->method('validated')->willReturn([
            'social_links' => ['github' => 'http://github.com/invalid'],
        ]);

        $user = new User;
        $user->id = 'user-1';
        $user->role = 'applicant';
        $request->expects($this->any())->method('user')->willReturn($user);

        $response = $controller->updateSocialLinks($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(400, $response->getStatusCode());
        $this->assertFalse($payload['success']);
        $this->assertSame('INVALID_URL', $payload['code']);
    }

    public function test_add_office_image_returns_limit_error_code(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $fileUploadService->expects($this->once())
            ->method('validateFileUrl')
            ->willReturn(true);

        $profileService->expects($this->once())
            ->method('addOfficeImage')
            ->willThrowException(new InvalidArgumentException('MAX_IMAGES_EXCEEDED'));

        $controller = new ProfileController($profileService, $fileUploadService);

        $request = $this->createMock(AddOfficeImageRequest::class);
        $request->expects($this->once())->method('validated')->willReturn([
            'image_url' => 'https://cdn.jobswipe.test/company/office-1.jpg',
        ]);

        $user = new User;
        $user->id = 'user-1';
        $user->role = 'company_admin';
        $request->expects($this->any())->method('user')->willReturn($user);

        $response = $controller->addOfficeImage($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(409, $response->getStatusCode());
        $this->assertFalse($payload['success']);
        $this->assertSame('MAX_IMAGES_EXCEEDED', $payload['code']);
    }

    public function test_get_onboarding_status_returns_data(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $profileService->expects($this->once())
            ->method('getOnboardingStatus')
            ->with('user-1', 'applicant')
            ->willReturn([
                'onboarding_step' => 2,
                'completed' => false,
                'total_steps' => 6,
            ]);

        $controller = new ProfileController($profileService, $fileUploadService);

        $request = Request::create('/api/v1/profile/onboarding/status', 'GET');
        $request->setUserResolver(static fn () => (object) ['id' => 'user-1', 'role' => 'applicant']);

        $response = $controller->getOnboardingStatus($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertSame(2, $payload['data']['onboarding_step']);
    }

    public function test_update_applicant_basic_info_returns_updated_profile_payload(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $profileService->expects($this->once())
            ->method('updateApplicantBasicInfo')
            ->with('user-1', [
                'first_name' => 'Jane',
                'last_name' => 'Doe',
                'location' => 'Makati',
            ])
            ->willReturn([
                'profile' => ['first_name' => 'Jane', 'last_name' => 'Doe', 'location' => 'Makati'],
                'profile_completion_percentage' => 64,
            ]);

        $controller = new ProfileController($profileService, $fileUploadService);

        /** @var UpdateApplicantBasicInfoRequest&MockObject $request */
        $request = $this->createMock(UpdateApplicantBasicInfoRequest::class);
        $request->expects($this->once())
            ->method('validated')
            ->willReturn([
                'first_name' => 'Jane',
                'last_name' => 'Doe',
                'location' => 'Makati',
            ]);
        $request->expects($this->once())
            ->method('user')
            ->willReturn((object) ['id' => 'user-1', 'role' => 'applicant']);

        $response = $controller->updateApplicantBasicInfo($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertSame(64, $payload['data']['profile_completion_percentage']);
    }

    public function test_update_applicant_skills_returns_updated_completion(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $profileService->expects($this->once())
            ->method('updateApplicantSkills')
            ->with('user-1', [['name' => 'Laravel']])
            ->willReturn([
                'profile' => ['skills' => [['name' => 'Laravel']]],
                'profile_completion_percentage' => 73,
            ]);

        $controller = new ProfileController($profileService, $fileUploadService);

        /** @var UpdateApplicantSkillsRequest&MockObject $request */
        $request = $this->createMock(UpdateApplicantSkillsRequest::class);
        $request->expects($this->once())
            ->method('validated')
            ->with('skills')
            ->willReturn([['name' => 'Laravel']]);
        $request->expects($this->once())
            ->method('user')
            ->willReturn((object) ['id' => 'user-1', 'role' => 'applicant']);

        $response = $controller->updateApplicantSkills($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertSame(73, $payload['data']['profile_completion_percentage']);
    }

    public function test_update_applicant_resume_calls_file_url_validation_and_service(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $fileUploadService->expects($this->once())
            ->method('validateFileUrl')
            ->with('https://cdn.jobswipe.test/document/user-1/resume.pdf')
            ->willReturn(true);

        $profileService->expects($this->once())
            ->method('updateApplicantResume')
            ->with('user-1', 'https://cdn.jobswipe.test/document/user-1/resume.pdf')
            ->willReturn([
                'profile' => ['resume_url' => 'https://cdn.jobswipe.test/document/user-1/resume.pdf'],
                'profile_completion_percentage' => 82,
            ]);

        $controller = new ProfileController($profileService, $fileUploadService);

        $request = $this->createMock(UpdateApplicantResumeRequest::class);
        $request->expects($this->once())->method('validated')->willReturn([
            'resume_url' => 'https://cdn.jobswipe.test/document/user-1/resume.pdf',
        ]);

        $user = new User;
        $user->id = 'user-1';
        $user->role = 'applicant';
        $request->expects($this->any())->method('user')->willReturn($user);

        $response = $controller->updateApplicantResume($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertSame(82, $payload['data']['profile_completion_percentage']);
    }
}
