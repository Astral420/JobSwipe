<?php

namespace App\Http\Controllers\Applicant;

use App\Http\Controllers\Controller;
use App\Services\MatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class MatchController extends Controller
{
    public function __construct(
        private MatchService $matchService,
    ) {}

    /**
     * GET /v1/applicant/matches
     *
     * List matches for the authenticated applicant.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $status = $request->input('status');

        $matches = $this->matchService->getApplicantMatches(
            applicantId: $user->applicantProfile->id,
            status: $status,
            perPage: $this->resolvePerPage($request),
        );

        return $this->success($matches, 'Matches retrieved.');
    }

    /**
     * GET /v1/applicant/matches/{id}
     *
     * Get match detail with messages and countdown timer.
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
     * POST /v1/applicant/matches/{id}/accept
     */
    public function accept(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        try {
            $match = $this->matchService->acceptMatch($id, $user->id);
        } catch (AccessDeniedHttpException) {
            return $this->error('NOT_MATCH_APPLICANT', 'You are not the applicant for this match.', 403);
        } catch (ConflictHttpException $e) {
            if ($e->getMessage() === 'Match response deadline has passed.') {
                return $this->error('MATCH_RESPONSE_DEADLINE_PASSED', $e->getMessage(), 409);
            }

            if ($e->getMessage() === 'Match was already declined.') {
                return $this->error('MATCH_ALREADY_DECLINED', $e->getMessage(), 409);
            }

            return $this->error('MATCH_NO_LONGER_PENDING', $e->getMessage(), 409);
        }

        return $this->success($match, 'Match accepted! You can now start chatting.');
    }

    /**
     * POST /v1/applicant/matches/{id}/decline
     */
    public function decline(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        try {
            $match = $this->matchService->declineMatch($id, $user->id);
        } catch (AccessDeniedHttpException) {
            return $this->error('NOT_MATCH_APPLICANT', 'You are not the applicant for this match.', 403);
        } catch (ConflictHttpException $e) {
            if ($e->getMessage() === 'Match response deadline has passed.') {
                return $this->error('MATCH_RESPONSE_DEADLINE_PASSED', $e->getMessage(), 409);
            }

            if ($e->getMessage() === 'Match was already accepted.') {
                return $this->error('MATCH_ALREADY_ACCEPTED', $e->getMessage(), 409);
            }

            return $this->error('MATCH_NO_LONGER_PENDING', $e->getMessage(), 409);
        }

        return $this->success($match, 'Match declined.');
    }

    private function resolvePerPage(Request $request, int $default = 20, int $max = 100): int
    {
        $perPage = (int) $request->input('per_page', $default);

        if ($perPage < 1) {
            return $default;
        }

        return min($perPage, $max);
    }
}
