<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminCompanyFilterRequest;
use App\Http\Requests\Admin\AdminSuspendCompanyRequest;
use App\Services\AdminService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class AdminCompanyController extends Controller
{
    public function __construct(
        private AdminService $adminService
    ) {}

    /**
     * List companies with filtering and pagination.
     */
    public function index(AdminCompanyFilterRequest $request): JsonResponse
    {
        try {
            $perPage = (int) $request->input('pageSize', 20);
            $companies = $this->adminService->listCompanies(
                $request->validated(),
                $perPage
            );

            return $this->success($companies, 'Companies retrieved successfully.');
        } catch (Exception $e) {
            Log::error('Admin company listing failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
            ]);

            return $this->error('INTERNAL_ERROR', 'An internal error occurred', 500);
        }
    }

    /**
     * Get detailed company information.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $company = $this->adminService->getCompanyDetails($id);

            return $this->success($company, 'Company details retrieved successfully.');
        } catch (RuntimeException $e) {
            return $this->error('COMPANY_NOT_FOUND', $e->getMessage(), 404);
        } catch (Exception $e) {
            Log::error('Admin company detail retrieval failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
                'company_id' => $id,
            ]);

            return $this->error('INTERNAL_ERROR', 'An internal error occurred', 500);
        }
    }

    /**
     * Suspend a company account.
     */
    public function suspend(string $id, AdminSuspendCompanyRequest $request): JsonResponse
    {
        try {
            $actorId = auth()->id();
            $reason = $request->validated()['reason'];

            $this->adminService->suspendCompany($id, $reason, $actorId);

            return $this->success(null, 'Company suspended successfully.');
        } catch (RuntimeException $e) {
            if (str_contains($e->getMessage(), 'not found')) {
                return $this->error('COMPANY_NOT_FOUND', $e->getMessage(), 404);
            }

            if (str_contains($e->getMessage(), 'already suspended')) {
                return $this->error('COMPANY_ALREADY_SUSPENDED', $e->getMessage(), 400);
            }

            return $this->error('SUSPENSION_FAILED', $e->getMessage(), 400);
        } catch (Exception $e) {
            Log::error('Admin company suspension failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
                'company_id' => $id,
            ]);

            return $this->error('INTERNAL_ERROR', 'An internal error occurred', 500);
        }
    }

    /**
     * Unsuspend (reactivate) a company account.
     */
    public function unsuspend(string $id): JsonResponse
    {
        try {
            $actorId = auth()->id();

            $this->adminService->unsuspendCompany($id, $actorId);

            return $this->success(null, 'Company unsuspended successfully.');
        } catch (RuntimeException $e) {
            if (str_contains($e->getMessage(), 'not found')) {
                return $this->error('COMPANY_NOT_FOUND', $e->getMessage(), 404);
            }

            if (str_contains($e->getMessage(), 'not suspended')) {
                return $this->error('COMPANY_NOT_SUSPENDED', $e->getMessage(), 400);
            }

            return $this->error('UNSUSPENSION_FAILED', $e->getMessage(), 400);
        } catch (Exception $e) {
            Log::error('Admin company unsuspension failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
                'company_id' => $id,
            ]);

            return $this->error('INTERNAL_ERROR', 'An internal error occurred', 500);
        }
    }
}
