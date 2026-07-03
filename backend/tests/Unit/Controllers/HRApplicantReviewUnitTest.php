<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\Company\ApplicantReviewController;
use App\Http\Requests\Company\HRSwipeRequest;
use App\Models\MongoDB\ApplicantProfileDocument;
use App\Models\PostgreSQL\JobPosting;
use App\Repositories\PostgreSQL\ApplicationRepository;
use App\Services\FileUploadService;
use App\Services\SwipeService;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class HRApplicantReviewUnitTest extends TestCase
{
    public function test_hr_swipe_request_validation_rules_allow_template_fallback_message(): void
    {
        $request = new HRSwipeRequest;
        $rules = $request->rules();

        $this->assertArrayHasKey('message', $rules);
        $this->assertSame(['nullable', 'string', 'min:10', 'max:1000'], $rules['message']);
    }

    public function test_skill_match_calculation_accuracy(): void
    {
        $controller = $this->makeController();
        $method = (new ReflectionClass($controller))->getMethod('calculateSkillMatchPercentage');
        $method->setAccessible(true);

        $job = new class extends JobPosting
        {
            public function __construct() {}
        };

        $job->setRelation('skills', collect([
            (object) ['skill_name' => 'PHP'],
            (object) ['skill_name' => 'Laravel'],
            (object) ['skill_name' => 'Redis'],
        ]));

        $profile = new ApplicantProfileDocument;
        $profile->skills = [
            ['name' => 'PHP'],
            ['name' => 'Redis'],
            ['name' => 'Docker'],
        ];

        $percentage = $method->invoke($controller, $job, $profile);

        $this->assertSame(67, $percentage);
    }

    public function test_incomplete_profile_detection(): void
    {
        $controller = $this->makeController();
        $method = (new ReflectionClass($controller))->getMethod('isApplicantProfileComplete');
        $method->setAccessible(true);

        $incomplete = new ApplicantProfileDocument;
        $incomplete->first_name = 'Jane';
        $incomplete->last_name = 'Doe';
        $incomplete->location = 'Makati';
        $incomplete->resume_url = null;
        $incomplete->skills = [];

        $complete = new ApplicantProfileDocument;
        $complete->first_name = 'Jane';
        $complete->last_name = 'Doe';
        $complete->location = 'Makati';
        $complete->resume_url = 'https://cdn.jobswipe.test/resume.pdf';
        $complete->skills = [['name' => 'PHP']];

        $this->assertFalse($method->invoke($controller, $incomplete));
        $this->assertTrue($method->invoke($controller, $complete));
    }

    public function test_sign_applicant_profile_signs_media_fields(): void
    {
        /** @var FileUploadService&MockObject $fileService */
        $fileService = $this->createMock(FileUploadService::class);
        $fileService->expects($this->exactly(2))
            ->method('generatePresignedReadUrl')
            ->willReturnOnConsecutiveCalls(
                ['read_url' => 'https://signed.example.test/resume'],
                ['read_url' => 'https://signed.example.test/photo'],
            );

        $controller = $this->makeController($fileService);
        $method = (new ReflectionClass($controller))->getMethod('signApplicantProfile');
        $method->setAccessible(true);

        $profile = new ApplicantProfileDocument;
        $profile->resume_url = 'https://cdn.jobswipe.test/document/user-1/resume.pdf';
        $profile->profile_photo_url = 'https://cdn.jobswipe.test/image/user-1/photo.jpg';

        $signed = $method->invoke($controller, $profile);

        $this->assertIsArray($signed);
        $this->assertSame('https://signed.example.test/resume', $signed['resume_url']);
        $this->assertSame('https://signed.example.test/photo', $signed['profile_photo_url']);
    }

    private function makeController(?FileUploadService $fileService = null): ApplicantReviewController
    {
        /** @var ApplicationRepository&MockObject $repo */
        $repo = $this->createMock(ApplicationRepository::class);
        /** @var SwipeService&MockObject $swipe */
        $swipe = $this->createMock(SwipeService::class);

        return new ApplicantReviewController($repo, $swipe, $fileService);
    }
}
