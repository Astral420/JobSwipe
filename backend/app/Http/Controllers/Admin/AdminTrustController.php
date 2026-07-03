<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminAdjustTrustScoreRequest;
use App\Repositories\PostgreSQL\TrustEventRepository;
use App\Services\AdminService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminTrustController extends Controller
{
    public function __construct(
        private AdminService $adminService,
        private TrustEventRepository $trustEvents,
    ) {}

    /**
     * List trust events.
     *
     * Requirements: 6.1
     */
    public function trustEvents(Request $request): JsonResponse
    {
        try {
            $events = $this->trustEvents->listEvents(
                $request->input('pageSize', 20)
            );

            return $this->success($events, 'Trust events retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Admin trust events listing failed', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to retrieve trust events', 500);
        }
    }

    /**
     * Get companies with low trust scores.
     *
     * Requirements: 6.2
     */
    public function lowTrustCompanies(Request $request): JsonResponse
    {
        try {
            $threshold = $request->input('threshold', 40);
            $companies = $this->adminService->getLowTrustCompanies($threshold);

            return $this->success($companies, 'Low trust companies retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Admin low trust companies retrieval failed', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to retrieve low trust companies', 500);
        }
    }

    /**
     * Recalculate trust score for a company.
     *
     * Requirements: 6.3
     */
    public function recalculateTrustScore(string $companyId): JsonResponse
    {
        try {
            $newScore = $this->adminService->recalculateTrustScore($companyId, auth()->id());

            return $this->success([
                'company_id' => $companyId,
                'new_trust_score' => $newScore,
            ], 'Trust score recalculated successfully.');
        } catch (\RuntimeException $e) {
            return $this->error('COMPANY_NOT_FOUND', $e->getMessage(), 404);
        } catch (\Exception $e) {
            Log::error('Admin trust score recalculation failed', [
                'company_id' => $companyId,
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to recalculate trust score', 500);
        }
    }

    /**
     * Get company trust history.
     *
     * Requirements: 6.4
     */
    public function companyTrustHistory(string $companyId): JsonResponse
    {
        try {
            $history = $this->adminService->getCompanyTrustHistory($companyId);

            return $this->success($history, 'Company trust history retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Admin company trust history retrieval failed', [
                'company_id' => $companyId,
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to retrieve company trust history', 500);
        }
    }

    /**
     * Manually adjust trust score for a company.
     *
     * Requirements: 6.5
     */
    public function adjustTrustScore(string $companyId, AdminAdjustTrustScoreRequest $request): JsonResponse
    {
        try {
            $result = $this->adminService->adjustTrustScore(
                $companyId,
                $request->input('score'),
                $request->input('reason'),
                auth()->id()
            );

            if (! $result) {
                return $this->error('ADJUSTMENT_FAILED', 'Failed to adjust trust score', 500);
            }

            return $this->success([
                'company_id' => $companyId,
                'new_score' => $request->input('score'),
            ], 'Trust score adjusted successfully.');
        } catch (\RuntimeException $e) {
            return $this->error('TRUST_SCORE_INVALID', $e->getMessage(), 400);
        } catch (\Exception $e) {
            Log::error('Admin trust score adjustment failed', [
                'company_id' => $companyId,
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'Failed to adjust trust score', 500);
        }
    }
}
