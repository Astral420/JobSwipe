<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminService;
use Exception;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    public function __construct(
        private AdminService $adminService,
    ) {}

    public function stats(): JsonResponse
    {
        try {
            $stats = $this->adminService->dashboardStats();

            return $this->success($stats, 'Dashboard stats retrieved successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }
}
