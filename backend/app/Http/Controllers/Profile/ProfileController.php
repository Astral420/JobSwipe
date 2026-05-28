<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\AddOfficeImageRequest;
use App\Http\Requests\Profile\CompleteOnboardingStepRequest;
use App\Http\Requests\Profile\SubmitVerificationDocumentsRequest;
use App\Http\Requests\Profile\UpdateApplicantBasicInfoRequest;
use App\Http\Requests\Profile\UpdateApplicantResumeRequest;
use App\Http\Requests\Profile\UpdateApplicantSkillsRequest;
use App\Http\Requests\Profile\UpdateCompanyDetailsRequest;
use App\Http\Requests\Profile\UpdateCompanyLogoRequest;
use App\Http\Requests\Profile\UpdateSocialLinksRequest;
use App\Services\FileUploadService;
use App\Services\ProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class ProfileController extends Controller
{
    public function __construct(
        private ProfileService $profiles,
        private FileUploadService $fileUploads,
    ) {}

    public function getApplicantProfile(Request $request): JsonResponse
    {
        return $this->successSigned($this->profiles->getApplicantProfile($request->user()->id));
    }

    public function updateApplicantBasicInfo(UpdateApplicantBasicInfoRequest $request): JsonResponse
    {
        $result = $this->profiles->updateApplicantBasicInfo($request->user()->id, $request->validated());

        return $this->successSigned($result, 'Applicant basic info updated.');
    }

    public function updateApplicantSkills(UpdateApplicantSkillsRequest $request): JsonResponse
    {
        $result = $this->profiles->updateApplicantSkills($request->user()->id, $request->validated());

        return $this->successSigned($result, 'Applicant skills updated.');
    }

    public function addWorkExperience(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company' => ['required', 'string', 'max:255'],
            'position' => ['required', 'string', 'max:255'],
            'start_date' => ['required', 'string', 'max:20'],
            'end_date' => ['nullable', 'string', 'max:20'],
            'is_current' => ['required', 'boolean'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $result = $this->profiles->addWorkExperience($request->user()->id, $validated);

        return $this->successSigned($result, 'Work experience added.');
    }

    public function updateWorkExperience(Request $request, int $index): JsonResponse
    {
        $validated = $request->validate([
            'company' => ['sometimes', 'string', 'max:255'],
            'position' => ['sometimes', 'string', 'max:255'],
            'start_date' => ['sometimes', 'string', 'max:20'],
            'end_date' => ['nullable', 'string', 'max:20'],
            'is_current' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $result = $this->profiles->updateWorkExperience($request->user()->id, $index, $validated);

            return $this->successSigned($result, 'Work experience updated.');
        } catch (InvalidArgumentException $exception) {
            return $this->handleDomainException($exception);
        }
    }

    public function removeWorkExperience(Request $request, int $index): JsonResponse
    {
        try {
            $result = $this->profiles->removeWorkExperience($request->user()->id, $index);

            return $this->successSigned($result, 'Work experience removed.');
        } catch (InvalidArgumentException $exception) {
            return $this->handleDomainException($exception);
        }
    }

    public function addEducation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution' => ['required', 'string', 'max:255'],
            'degree' => ['required', 'string', 'max:255'],
            'field' => ['required', 'string', 'max:255'],
            'graduation_year' => ['nullable', 'integer', 'min:1900', 'max:'.now()->year],
        ]);

        $result = $this->profiles->addEducation($request->user()->id, $validated);

        return $this->successSigned($result, 'Education added.');
    }

    public function updateEducation(Request $request, int $index): JsonResponse
    {
        $validated = $request->validate([
            'institution' => ['sometimes', 'string', 'max:255'],
            'degree' => ['sometimes', 'string', 'max:255'],
            'field' => ['sometimes', 'string', 'max:255'],
            'graduation_year' => ['nullable', 'integer', 'min:1900', 'max:'.now()->year],
        ]);

        try {
            $result = $this->profiles->updateEducation($request->user()->id, $index, $validated);

            return $this->successSigned($result, 'Education updated.');
        } catch (InvalidArgumentException $exception) {
            return $this->handleDomainException($exception);
        }
    }

    public function removeEducation(Request $request, int $index): JsonResponse
    {
        try {
            $result = $this->profiles->removeEducation($request->user()->id, $index);

            return $this->successSigned($result, 'Education removed.');
        } catch (InvalidArgumentException $exception) {
            return $this->handleDomainException($exception);
        }
    }

    public function updateApplicantResume(UpdateApplicantResumeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->fileUploads->validateFileUrl((string) $validated['resume_url']);
        $result = $this->profiles->updateApplicantResume($request->user()->id, (string) $validated['resume_url']);

        return $this->successSigned($result, 'Resume updated.');
    }

    public function updateApplicantCoverLetter(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cover_letter_url' => ['required', 'url', 'max:2000'],
        ]);

        $this->fileUploads->validateFileUrl((string) $validated['cover_letter_url']);
        $result = $this->profiles->updateApplicantCoverLetter($request->user()->id, (string) $validated['cover_letter_url']);

        return $this->successSigned($result, 'Cover letter updated.');
    }

    public function updateApplicantPortfolio(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'portfolio_url' => ['required', 'url', 'max:2000'],
        ]);

        $result = $this->profiles->updateApplicantPortfolio($request->user()->id, (string) $validated['portfolio_url']);

        return $this->successSigned($result, 'Portfolio updated.');
    }

    public function updateApplicantPhoto(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'profile_photo_url' => ['required', 'url', 'max:2000'],
        ]);

        $this->fileUploads->validateFileUrl((string) $validated['profile_photo_url']);
        $result = $this->profiles->updateApplicantPhoto($request->user()->id, (string) $validated['profile_photo_url']);

        return $this->successSigned($result, 'Profile photo updated.');
    }

    public function updateApplicantCoverPhoto(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cover_url' => ['required', 'url', 'max:2000'],
        ]);

        $this->fileUploads->validateFileUrl((string) $validated['cover_url']);
        $result = $this->profiles->updateApplicantCoverPhoto($request->user()->id, (string) $validated['cover_url']);

        return $this->successSigned($result, 'Cover photo updated.');
    }

    public function updateApplicantPhotos(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'photos' => ['required', 'array', 'max:6'],
            'photos.*' => ['nullable', 'url', 'max:2000'],
        ]);

        // Validate each non-null photo URL
        foreach ($validated['photos'] as $photoUrl) {
            if ($photoUrl !== null) {
                $this->fileUploads->validateFileUrl((string) $photoUrl);
            }
        }

        $result = $this->profiles->updateApplicantPhotos($request->user()->id, (array) $validated['photos']);

        return $this->successSigned($result, 'Photos updated.');
    }

    public function updateSocialLinks(UpdateSocialLinksRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $result = $this->profiles->updateSocialLinks($request->user()->id, (array) $validated['social_links']);

            return $this->successSigned($result, 'Social links updated.');
        } catch (InvalidArgumentException $exception) {
            return $this->handleDomainException($exception);
        }
    }

    public function updateJobPreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'desired_position' => ['nullable', 'string', 'max:255'],
            'preferred_locations' => ['nullable', 'array'],
            'preferred_locations.*' => ['string', 'max:255'],
            'work_type' => ['nullable', 'array'],
            'work_type.*' => ['string', 'in:remote,hybrid,onsite'],
            'employment_type' => ['nullable', 'array'],
            'employment_type.*' => ['string', 'in:full-time,part-time,contract,freelance,internship'],
            'salary_expectation' => ['nullable', 'array'],
            'salary_expectation.min' => ['nullable', 'integer', 'min:0'],
            'salary_expectation.max' => ['nullable', 'integer', 'min:0'],
            'salary_expectation.currency' => ['nullable', 'string', 'max:10'],
            'willing_to_relocate' => ['nullable', 'boolean'],
        ]);

        try {
            $result = $this->profiles->updateJobPreferences($request->user()->id, $validated);

            return $this->successSigned($result, 'Job preferences updated.');
        } catch (InvalidArgumentException $exception) {
            return $this->handleDomainException($exception);
        }
    }

    public function getCompanyProfile(Request $request): JsonResponse
    {
        try {
            return $this->successSigned($this->profiles->getCompanyProfile($request->user()->id));
        } catch (InvalidArgumentException $exception) {
            return $this->handleDomainException($exception);
        }
    }

    public function updateCompanyDetails(UpdateCompanyDetailsRequest $request): JsonResponse
    {
        try {
            $result = $this->profiles->updateCompanyDetails($request->user()->id, $request->validated());

            return $this->successSigned($result, 'Company details updated.');
        } catch (InvalidArgumentException $exception) {
            return $this->handleDomainException($exception);
        }
    }

    public function updateCompanyLogo(UpdateCompanyLogoRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->fileUploads->validateFileUrl((string) $validated['logo_url']);

        try {
            $result = $this->profiles->updateCompanyLogo($request->user()->id, (string) $validated['logo_url']);

            return $this->successSigned($result, 'Company logo updated.');
        } catch (InvalidArgumentException $exception) {
            return $this->handleDomainException($exception);
        }
    }

    public function addOfficeImage(AddOfficeImageRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->fileUploads->validateFileUrl((string) $validated['image_url']);

        try {
            $result = $this->profiles->addOfficeImage($request->user()->id, (string) $validated['image_url']);

            return $this->successSigned($result, 'Office image added.');
        } catch (InvalidArgumentException $exception) {
            return $this->handleDomainException($exception);
        }
    }

    public function removeOfficeImage(Request $request, int $index): JsonResponse
    {
        try {
            $result = $this->profiles->removeOfficeImage($request->user()->id, $index);

            return $this->successSigned($result, 'Office image removed.');
        } catch (InvalidArgumentException $exception) {
            return $this->handleDomainException($exception);
        }
    }

    public function submitVerificationDocuments(SubmitVerificationDocumentsRequest $request): JsonResponse
    {
        $validated = $request->validated();

        foreach ($validated['verification_documents'] as $documentUrl) {
            $this->fileUploads->validateFileUrl((string) $documentUrl);
        }

        try {
            $result = $this->profiles->submitVerificationDocuments(
                $request->user()->id,
                (array) $validated['verification_documents']
            );

            return $this->successSigned($result, 'Verification documents submitted.');
        } catch (InvalidArgumentException $exception) {
            return $this->handleDomainException($exception);
        }
    }

    public function getOnboardingStatus(Request $request): JsonResponse
    {
        $result = $this->profiles->getOnboardingStatus(
            $request->user()->id,
            (string) $request->user()->role
        );

        return $this->successSigned($result);
    }

    public function completeOnboardingStep(CompleteOnboardingStepRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $result = $this->profiles->completeOnboardingStep(
                $request->user()->id,
                (string) $request->user()->role,
                (int) $validated['step'],
                (array) ($validated['step_data'] ?? [])
            );

            return $this->successSigned($result, 'Onboarding step completed.');
        } catch (InvalidArgumentException $exception) {
            return $this->handleDomainException($exception);
        }
    }

    public function getProfileCompletion(Request $request): JsonResponse
    {
        $completion = $this->profiles->getProfileCompletion(
            $request->user()->id,
            (string) $request->user()->role
        );

        return $this->success(data: [
            'profile_completion_percentage' => $completion,
        ]);
    }

    private function handleDomainException(InvalidArgumentException $exception): JsonResponse
    {
        $message = $exception->getMessage();

        if (str_starts_with($message, 'INVALID_URL:')) {
            $field = substr($message, strlen('INVALID_URL:'));

            return $this->error('INVALID_URL', "Invalid URL for {$field}", 400);
        }

        return match ($message) {
            'MAX_IMAGES_EXCEEDED' => $this->error('MAX_IMAGES_EXCEEDED', 'Maximum office images reached.', 409),
            'OFFICE_IMAGE_NOT_FOUND' => $this->error('OFFICE_IMAGE_NOT_FOUND', 'Office image not found.', 404),
            'WORK_EXPERIENCE_NOT_FOUND' => $this->error('WORK_EXPERIENCE_NOT_FOUND', 'Work experience not found.', 404),
            'EDUCATION_NOT_FOUND' => $this->error('EDUCATION_NOT_FOUND', 'Education entry not found.', 404),
            'COMPANY_PROFILE_NOT_FOUND' => $this->error('COMPANY_PROFILE_NOT_FOUND', 'Company profile not found.', 404),
            'SUBSCRIPTION_REQUIRED' => $this->error('SUBSCRIPTION_REQUIRED', 'Active subscription required.', 402),
            'INVALID_ONBOARDING_STEP' => $this->error('INVALID_ONBOARDING_STEP', 'Invalid onboarding step.', 400),
            'STEP_DATA_INVALID' => $this->error('STEP_DATA_INVALID', 'Step data is invalid or incomplete.', 400),
            default => $this->error('PROFILE_UPDATE_FAILED', 'Unable to process the request.', 400),
        };
    }

    private function successSigned(mixed $data = null, string $message = 'OK'): JsonResponse
    {
        return $this->success(data: $this->signFileUrls($data), message: $message);
    }

    private function signFileUrls(mixed $data, ?string $parentKey = null): mixed
    {
        if (is_object($data) && method_exists($data, 'toArray')) {
            $data = $data->toArray();
        }

        if (! is_array($data)) {
            return $data;
        }

        $arrayFileFields = ['office_images', 'verification_documents', 'photos'];

        if ($parentKey !== null && in_array($parentKey, $arrayFileFields, true)) {
            return array_map(function ($item) {
                if (! is_string($item)) {
                    return $item;
                }

                return $this->toSignedReadUrl($item);
            }, $data);
        }

        $singleFileFields = [
            'resume_url',
            'cover_letter_url',
            'profile_photo_url',
            'portfolio_url',
            'logo_url',
            'cover_photo',
            'cover_url',
        ];

        foreach ($data as $key => $value) {
            if (! is_string($key)) {
                $data[$key] = $this->signFileUrls($value);

                continue;
            }

            if (is_string($value) && in_array($key, $singleFileFields, true)) {
                $data[$key] = $this->toSignedReadUrl($value);

                continue;
            }

            $data[$key] = $this->signFileUrls($value, $key);
        }

        return $data;
    }

    private function toSignedReadUrl(string $fileUrl): string
    {
        if ($fileUrl === '') {
            return $fileUrl;
        }

        try {
            $result = $this->fileUploads->generatePresignedReadUrl($fileUrl);

            if (is_array($result) && isset($result['read_url']) && is_string($result['read_url'])) {
                return $result['read_url'];
            }
        } catch (\Throwable) {
            return $fileUrl;
        }

        return $fileUrl;
    }
}
