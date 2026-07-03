<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\Profile\ProfileController;
use App\Http\Requests\Profile\SubmitVerificationDocumentsRequest;
use App\Http\Requests\Profile\UpdateCompanyDetailsRequest;
use App\Http\Requests\Profile\UpdateCompanyLogoRequest;
use App\Models\PostgreSQL\User;
use App\Services\FileUploadService;
use App\Services\ProfileService;
use Illuminate\Http\Request;
use InvalidArgumentException;
use PHPUnit\Framework\MockObject\MockObject;
use Tests\TestCase;

class ProfileControllerCompanyTest extends TestCase
{
    public function test_get_company_profile_returns_expected_structure(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $profileService->expects($this->once())
            ->method('getCompanyProfile')
            ->willReturn([
                'profile' => ['company_name' => 'JobSwipe'],
                'profile_completion_percentage' => 70,
                'subscription_status' => 'active',
                'subscription_tier' => 'basic',
            ]);

        $controller = new ProfileController($profileService, $fileUploadService);

        $request = Request::create('/api/v1/profile/company', 'GET');
        $request->setUserResolver(static fn () => (object) ['id' => 'u1', 'role' => 'company_admin']);

        $response = $controller->getCompanyProfile($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertSame(70, $payload['data']['profile_completion_percentage']);
    }

    public function test_get_company_profile_signs_logo_and_office_images(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $profileService->expects($this->once())
            ->method('getCompanyProfile')
            ->willReturn([
                'profile' => [
                    'logo_url' => 'https://cdn.jobswipe.test/company/logo.png',
                    'office_images' => [
                        'https://cdn.jobswipe.test/company/office-1.jpg',
                        'https://cdn.jobswipe.test/company/office-2.jpg',
                    ],
                ],
                'profile_completion_percentage' => 70,
                'subscription_status' => 'active',
                'subscription_tier' => 'basic',
            ]);

        $fileUploadService->expects($this->exactly(3))
            ->method('generatePresignedReadUrl')
            ->willReturnOnConsecutiveCalls(
                ['read_url' => 'https://signed.example.test/logo'],
                ['read_url' => 'https://signed.example.test/office-1'],
                ['read_url' => 'https://signed.example.test/office-2'],
            );

        $controller = new ProfileController($profileService, $fileUploadService);

        $request = Request::create('/api/v1/profile/company', 'GET');
        $request->setUserResolver(static fn () => (object) ['id' => 'u1', 'role' => 'company_admin']);

        $response = $controller->getCompanyProfile($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertSame('https://signed.example.test/logo', $payload['data']['profile']['logo_url']);
        $this->assertSame('https://signed.example.test/office-1', $payload['data']['profile']['office_images'][0]);
        $this->assertSame('https://signed.example.test/office-2', $payload['data']['profile']['office_images'][1]);
    }

    public function test_submit_verification_documents_returns_success(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $fileUploadService->expects($this->exactly(2))
            ->method('validateFileUrl')
            ->willReturn(true);

        $profileService->expects($this->once())
            ->method('submitVerificationDocuments')
            ->willReturn([
                'profile' => ['verification_documents' => ['doc1', 'doc2']],
                'profile_completion_percentage' => 75,
            ]);

        $controller = new ProfileController($profileService, $fileUploadService);

        $request = $this->createMock(SubmitVerificationDocumentsRequest::class);
        $request->expects($this->once())->method('validated')->willReturn([
            'verification_documents' => [
                'https://cdn.jobswipe.test/doc1.pdf',
                'https://cdn.jobswipe.test/doc2.pdf',
            ],
        ]);

        $user = new User;
        $user->id = 'u1';
        $user->role = 'company_admin';
        $request->expects($this->once())->method('user')->willReturn($user);

        $response = $controller->submitVerificationDocuments($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
    }

    public function test_update_company_details_returns_updated_completion_and_subscription_fields(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $profileService->expects($this->once())
            ->method('updateCompanyDetails')
            ->with('u1', [
                'company_name' => 'JobSwipe Inc',
                'description' => 'Hiring platform',
                'industry' => 'Software',
                'company_size' => '11-50',
            ])
            ->willReturn([
                'profile' => ['company_name' => 'JobSwipe Inc'],
                'profile_completion_percentage' => 78,
                'subscription_status' => 'active',
                'subscription_tier' => 'basic',
            ]);

        $controller = new ProfileController($profileService, $fileUploadService);

        /** @var UpdateCompanyDetailsRequest&MockObject $request */
        $request = $this->createMock(UpdateCompanyDetailsRequest::class);
        $request->expects($this->once())
            ->method('validated')
            ->willReturn([
                'company_name' => 'JobSwipe Inc',
                'description' => 'Hiring platform',
                'industry' => 'Software',
                'company_size' => '11-50',
            ]);
        $request->expects($this->once())
            ->method('user')
            ->willReturn((object) ['id' => 'u1', 'role' => 'company_admin']);

        $response = $controller->updateCompanyDetails($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertSame(78, $payload['data']['profile_completion_percentage']);
        $this->assertSame('active', $payload['data']['subscription_status']);
    }

    public function test_update_company_logo_validates_file_url_and_returns_success(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $fileUploadService->expects($this->once())
            ->method('validateFileUrl')
            ->with('https://cdn.jobswipe.test/company/logo.png')
            ->willReturn(true);

        $profileService->expects($this->once())
            ->method('updateCompanyLogo')
            ->with('u1', 'https://cdn.jobswipe.test/company/logo.png')
            ->willReturn([
                'profile' => ['logo_url' => 'https://cdn.jobswipe.test/company/logo.png'],
                'profile_completion_percentage' => 81,
                'subscription_status' => 'active',
                'subscription_tier' => 'basic',
            ]);

        $controller = new ProfileController($profileService, $fileUploadService);

        $request = $this->createMock(UpdateCompanyLogoRequest::class);
        $request->expects($this->once())->method('validated')->willReturn([
            'logo_url' => 'https://cdn.jobswipe.test/company/logo.png',
        ]);

        $user = new User;
        $user->id = 'u1';
        $user->role = 'company_admin';
        $request->expects($this->once())->method('user')->willReturn($user);

        $response = $controller->updateCompanyLogo($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertSame(81, $payload['data']['profile_completion_percentage']);
    }

    public function test_remove_office_image_maps_not_found_error_code(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileUploadService */
        $fileUploadService = $this->createMock(FileUploadService::class);

        $profileService->expects($this->once())
            ->method('removeOfficeImage')
            ->willThrowException(new InvalidArgumentException('OFFICE_IMAGE_NOT_FOUND'));

        $controller = new ProfileController($profileService, $fileUploadService);

        $request = Request::create('/api/v1/profile/company/office-images/99', 'DELETE');
        $request->setUserResolver(static fn () => (object) ['id' => 'u1', 'role' => 'company_admin']);

        $response = $controller->removeOfficeImage($request, 99);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(404, $response->getStatusCode());
        $this->assertFalse($payload['success']);
        $this->assertSame('OFFICE_IMAGE_NOT_FOUND', $payload['code']);
    }
}
