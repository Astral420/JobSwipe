<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\Profile\ProfileController;
use App\Http\Requests\Profile\CompleteOnboardingStepRequest;
use App\Models\PostgreSQL\User;
use App\Services\FileUploadService;
use App\Services\ProfileService;
use Illuminate\Http\Request;
use InvalidArgumentException;
use PHPUnit\Framework\MockObject\MockObject;
use Tests\TestCase;

class OnboardingControllerPropertyTest extends TestCase
{
    public function test_property_complete_onboarding_step_rejects_invalid_steps(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileService */
        $fileService = $this->createMock(FileUploadService::class);

        $profileService->expects($this->exactly(5))
            ->method('completeOnboardingStep')
            ->willThrowException(new InvalidArgumentException('INVALID_ONBOARDING_STEP'));

        $controller = new ProfileController($profileService, $fileService);

        for ($step = 7; $step <= 11; $step++) {
            $request = $this->createMock(CompleteOnboardingStepRequest::class);
            $request->expects($this->once())->method('validated')->willReturn([
                'step' => $step,
                'step_data' => [],
            ]);

            $user = new User;
            $user->id = 'user-1';
            $user->role = 'applicant';
            $request->expects($this->any())->method('user')->willReturn($user);

            $response = $controller->completeOnboardingStep($request);
            $payload = json_decode($response->getContent(), true);

            $this->assertSame(400, $response->getStatusCode());
            $this->assertFalse($payload['success']);
            $this->assertSame('INVALID_ONBOARDING_STEP', $payload['code']);
        }
    }

    public function test_property_onboarding_status_shape_is_consistent(): void
    {
        /** @var ProfileService&MockObject $profileService */
        $profileService = $this->createMock(ProfileService::class);
        /** @var FileUploadService&MockObject $fileService */
        $fileService = $this->createMock(FileUploadService::class);

        $profileService->expects($this->exactly(4))
            ->method('getOnboardingStatus')
            ->willReturnOnConsecutiveCalls(
                ['onboarding_step' => 1, 'completed' => false, 'total_steps' => 6],
                ['onboarding_step' => 2, 'completed' => false, 'total_steps' => 6],
                ['onboarding_step' => 3, 'completed' => false, 'total_steps' => 6],
                ['onboarding_step' => 'completed', 'completed' => true, 'total_steps' => 6],
            );

        $controller = new ProfileController($profileService, $fileService);

        for ($i = 0; $i < 4; $i++) {
            $request = Request::create('/api/v1/profile/onboarding/status', 'GET');
            $request->setUserResolver(static fn () => (object) ['id' => 'user-1', 'role' => 'applicant']);

            $response = $controller->getOnboardingStatus($request);
            $payload = json_decode($response->getContent(), true);

            $this->assertSame(200, $response->getStatusCode());
            $this->assertTrue($payload['success']);
            $this->assertArrayHasKey('onboarding_step', $payload['data']);
            $this->assertArrayHasKey('completed', $payload['data']);
            $this->assertArrayHasKey('total_steps', $payload['data']);
        }
    }
}
