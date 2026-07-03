<?php

namespace App\Http\Controllers\Applicant;

use App\Http\Controllers\Controller;
use App\Repositories\PostgreSQL\ApplicationRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    public function __construct(
        private ApplicationRepository $applications,
    ) {}

    /**
     * GET /v1/applicant/applications
     *
     * List all applications for the authenticated applicant.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $applications = $this->applications->getByApplicant(
            applicantId: $user->applicantProfile->id,
        );

        return $this->success($applications, 'Applications retrieved.');
    }

    /**
     * GET /v1/applicant/applications/{id}
     *
     * Get a single application detail with match info.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $application = $this->applications->findByIdOrFail($id);

        // Ensure the applicant owns this application
        if ($application->applicant_id !== $user->applicantProfile->id) {
            return $this->error('FORBIDDEN', 'You do not own this application.', 403);
        }

        $application->load(['jobPosting.company', 'matchRecord']);

        return $this->success($application, 'Application retrieved.');
    }
}
