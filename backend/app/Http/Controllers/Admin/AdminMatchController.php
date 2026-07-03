<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Repositories\PostgreSQL\MatchRepository;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminMatchController extends Controller
{
    public function __construct(
        private MatchRepository $matchRepository,
    ) {}

    /**
     * List all matches with filtering
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = [
                'status' => $request->input('status'),
                'applicant_id' => $request->input('applicant_id'),
                'job_posting_id' => $request->input('job_posting_id'),
                'company_id' => $request->input('company_id'),
                'date_from' => $request->input('date_from'),
                'date_to' => $request->input('date_to'),
            ];

            $perPage = (int) $request->input('per_page', 20);
            $page = (int) $request->input('page', 1);

            $matches = $this->matchRepository->searchAdmin($filters, $perPage);

            return $this->success($matches, 'Matches retrieved successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Get match statistics
     */
    public function stats(): JsonResponse
    {
        try {
            $stats = [
                'total_matches' => $this->matchRepository->countAll(),
                'active_matches' => $this->matchRepository->countByStatus('active'),
                'expired_matches' => $this->matchRepository->countByStatus('expired'),
                'accepted_matches' => $this->matchRepository->countByStatus('accepted'),
                'rejected_matches' => $this->matchRepository->countByStatus('rejected'),
                'matches_today' => $this->matchRepository->countCreatedToday(),
                'matches_this_week' => $this->matchRepository->countCreatedThisWeek(),
                'matches_this_month' => $this->matchRepository->countCreatedThisMonth(),
                'average_response_time_hours' => $this->matchRepository->averageResponseTime(),
            ];

            return $this->success($stats, 'Match statistics retrieved successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Get match details
     */
    public function show(string $id): JsonResponse
    {
        try {
            $match = $this->matchRepository->findById($id);

            if (! $match) {
                return $this->error('MATCH_NOT_FOUND', 'Match not found.', 404);
            }

            // Load relationships
            $match->load(['applicant', 'jobPosting', 'jobPosting.company']);

            return $this->success($match, 'Match details retrieved successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }
}
