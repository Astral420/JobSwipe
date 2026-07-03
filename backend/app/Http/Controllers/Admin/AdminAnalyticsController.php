<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminAnalyticsController extends Controller
{
    public function __construct(
        private AdminService $adminService
    ) {}

    /**
     * Get user growth data.
     */
    public function userGrowthData(Request $request): JsonResponse
    {
        try {
            $days = (int) $request->input('days', 30);

            // Validate days parameter
            if ($days < 1 || $days > 365) {
                return $this->error(
                    'VALIDATION_ERROR',
                    'Days parameter must be between 1 and 365',
                    400
                );
            }

            $data = $this->adminService->getUserGrowthData($days);

            return $this->success($data, 'User growth data retrieved successfully.');
        } catch (Exception $e) {
            Log::error('Admin user growth data retrieval failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'An internal error occurred', 500);
        }
    }

    /**
     * Get revenue data.
     */
    public function revenueData(Request $request): JsonResponse
    {
        try {
            $months = (int) $request->input('months', 12);

            // Validate months parameter
            if ($months < 1 || $months > 24) {
                return $this->error(
                    'VALIDATION_ERROR',
                    'Months parameter must be between 1 and 24',
                    400
                );
            }

            $data = $this->adminService->getRevenueData($months);

            return $this->success($data, 'Revenue data retrieved successfully.');
        } catch (Exception $e) {
            Log::error('Admin revenue data retrieval failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'An internal error occurred', 500);
        }
    }

    /**
     * Get recent platform activity.
     */
    public function recentActivity(Request $request): JsonResponse
    {
        try {
            $limit = (int) $request->input('limit', 50);

            // Validate limit parameter
            if ($limit < 1 || $limit > 100) {
                return $this->error(
                    'VALIDATION_ERROR',
                    'Limit parameter must be between 1 and 100',
                    400
                );
            }

            $data = $this->adminService->getRecentActivity($limit);

            return $this->success($data, 'Recent activity retrieved successfully.');
        } catch (Exception $e) {
            Log::error('Admin recent activity retrieval failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'An internal error occurred', 500);
        }
    }
}
