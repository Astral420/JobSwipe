<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\MongoDB\ApplicantProfileDocument;
use App\Services\FileUploadService;
use App\Services\MatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchController extends Controller
{
    public function __construct(
        private MatchService $matchService,
        private ?FileUploadService $fileUploads = null,
    ) {}

    /**
     * GET /v1/company/matches
     *
     * List matches for the authenticated HR user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $matches = $this->matchService->getHrMatches(
            hrUserId: $user->id,
            jobId: $request->input('job_posting_id'),
            status: $request->input('status'),
            perPage: $this->resolvePerPage($request),
        );

        // Attach MongoDB profile data to each match's applicant
        // (same pattern as ApplicantReviewController::getApplicants)
        foreach ($matches as $match) {
            if ($match->applicant) {
                $mongoProfile = ApplicantProfileDocument::where('user_id', $match->applicant->user_id)->first();
                if ($mongoProfile) {
                    $data = $mongoProfile->toArray();
                    // Sign the profile photo URL so it's accessible from S3
                    if (! empty($data['profile_photo_url'])) {
                        $data['profile_photo_url'] = $this->toSignedReadUrl($data['profile_photo_url']);
                    }
                    $match->applicant->profile_data = $data;
                } else {
                    $match->applicant->profile_data = null;
                }
            }
        }

        return $this->success($matches, 'Matches retrieved.');
    }

    /**
     * GET /v1/company/matches/{id}
     *
     * Get match detail with messages.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $match = $this->matchService->getMatchDetail($id, $user->id);

        return $this->success([
            'match' => $match,
            'time_remaining' => $match->timeRemaining(),
            'seconds_remaining' => $match->secondsRemaining(),
            'is_chat_active' => $match->isChatActive(),
        ], 'Match detail retrieved.');
    }

    /**
     * POST /v1/company/matches/{id}/close
     *
     * Close the match chat. History remains viewable.
     */
    public function close(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $match = $this->matchService->closeMatch($id, $user->id);

        return $this->success($match, 'Match chat closed. Message history is still viewable.');
    }

    private function resolvePerPage(Request $request, int $default = 20, int $max = 100): int
    {
        $perPage = (int) $request->input('per_page', $default);

        if ($perPage < 1) {
            return $default;
        }

        return min($perPage, $max);
    }

    private function toSignedReadUrl(string $fileUrl): string
    {
        if ($this->fileUploads === null) {
            $this->fileUploads = app(FileUploadService::class);
        }

        try {
            $result = $this->fileUploads->generatePresignedReadUrl($fileUrl);
            if (isset($result['read_url']) && is_string($result['read_url'])) {
                return $result['read_url'];
            }
        } catch (\Throwable) {
            // Fall back to raw value if signing fails
        }

        return $fileUrl;
    }
}
