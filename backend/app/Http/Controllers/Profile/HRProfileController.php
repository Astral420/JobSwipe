<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\HRProfileSetupRequest;
use App\Services\CompanyMembershipService;
use App\Services\FileUploadService;
use App\Services\HRProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class HRProfileController extends Controller
{
    public function __construct(
        private HRProfileService $hrProfiles,
        private CompanyMembershipService $memberships,
        private FileUploadService $fileUpload,
    ) {}

    /**
     * Create or update the HR profile for the authenticated user.
     * POST /api/v1/profile/hr/setup
     * Req 4.
     */
    public function setup(HRProfileSetupRequest $request): JsonResponse
    {
        $user = $request->user();
        $company = $this->memberships->getPrimaryCompanyForUser($user->id);

        if (! $company) {
            return $this->error('NO_COMPANY_PROFILE', 'No company profile found.', 403);
        }

        try {
            $profile = $this->hrProfiles->saveHRProfile($user, $company, $request->validated());

            return $this->success([
                'first_name' => $profile->first_name,
                'last_name' => $profile->last_name,
                'job_title' => $profile->job_title,
                'photo_url' => $profile->photo_url,
                'company_id' => $profile->company_id,
                'company_name' => $company->company_name,
            ], 'Profile saved successfully.');

        } catch (InvalidArgumentException $e) {
            return match ($e->getMessage()) {
                'INVALID_JOB_TITLE' => $this->error('INVALID_JOB_TITLE', 'Invalid job title. Please select from the provided list or enter a custom title.', 422),
                default => $this->error('PROFILE_SAVE_FAILED', $e->getMessage(), 400),
            };
        }
    }

    /**
     * Generate a presigned S3 URL for profile photo upload.
     * POST /api/v1/profile/hr/photo-upload-url
     * Req 17.
     */
    public function photoUploadUrl(Request $request): JsonResponse
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'file_name' => 'required|string|max:255',
            'file_type' => 'required|string|in:image/jpeg,image/png,image/webp',
            'file_size' => 'required|integer|min:1|max:'.(5 * 1024 * 1024), // 5 MB
        ]);

        if ($validator->fails()) {
            return $this->error('VALIDATION_FAILED', $validator->errors()->first(), 422);
        }

        try {
            $result = $this->fileUpload->generatePresignedUrl(
                userId: $request->user()->id,
                fileName: $request->input('file_name'),
                fileType: $request->input('file_type'),
                fileSize: (int) $request->input('file_size'),
                uploadType: 'image',
            );

            return $this->success($result, 'Upload URL generated.');

        } catch (\App\Exceptions\FileUploadException $e) {
            return $this->error($e->getCode(), $e->getMessage(), 422);
        }
    }
}
