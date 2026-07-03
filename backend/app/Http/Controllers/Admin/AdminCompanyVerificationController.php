<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Repositories\MongoDB\CompanyProfileDocumentRepository;
use App\Repositories\PostgreSQL\CompanyProfileRepository;
use App\Services\AdminService;
use App\Services\FileUploadService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCompanyVerificationController extends Controller
{
    public function __construct(
        private AdminService $adminService,
        private CompanyProfileRepository $companyProfileRepository,
        private CompanyProfileDocumentRepository $companyDocs,
        private FileUploadService $fileUploads,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $status = $request->input('status', 'pending');

            if (! in_array($status, ['pending', 'approved', 'rejected'], true)) {
                return $this->error('VALIDATION_ERROR', 'Invalid status filter.', 422);
            }

            $perPage = (int) $request->input('per_page', 20);
            $results = $this->companyProfileRepository->paginateByVerificationStatus($status, $perPage);

            $results = $results->through(function ($company) {
                $document = $this->companyDocs->findByCompanyId((string) $company->id);

                $verificationDocuments = is_array($document?->verification_documents)
                    ? $document->verification_documents
                    : [];

                $signedDocuments = array_values(array_map(
                    fn (string $url) => $this->toSignedReadUrl($url),
                    array_filter($verificationDocuments, fn ($value) => is_string($value) && $value !== '')
                ));

                return [
                    'id' => (string) $company->id,
                    'company_id' => (string) $company->id,
                    'status' => (string) $company->verification_status,
                    'submitted_at' => optional($company->updated_at)?->toISOString(),
                    'reviewed_at' => null,
                    'reviewed_by' => null,
                    'rejection_reason' => $document?->verification_rejection_reason ?? null,
                    'documents' => array_map(
                        fn (string $url, int $idx) => [
                            'id' => (string) ($idx + 1),
                            'type' => 'other',
                            'url' => $url,
                            'status' => (string) $company->verification_status,
                            'uploaded_at' => optional($company->updated_at)?->toISOString(),
                        ],
                        $signedDocuments,
                        array_keys($signedDocuments)
                    ),
                    'company' => [
                        'id' => (string) $company->id,
                        'name' => (string) $company->company_name,
                        'industry' => $document?->industry ?? null,
                        'logo_url' => $this->toSignedReadUrl((string) ($document?->logo_url ?? '')),
                        'verification_status' => (string) $company->verification_status,
                    ],
                ];
            });

            return $this->success($results, 'Company verifications retrieved successfully.');
        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    public function show(string $companyId): JsonResponse
    {
        try {
            $detail = $this->adminService->getCompanyVerificationDetail($companyId);

            return $this->success($detail, 'Company verification detail retrieved successfully.');
        } catch (Exception $e) {
            if (str_contains($e->getMessage(), 'not found')) {
                return $this->error('COMPANY_NOT_FOUND', 'Company not found.', 404);
            }

            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    public function approve(string $companyId, Request $request): JsonResponse
    {
        try {
            $company = $this->adminService->approveCompanyVerification($companyId, $request->user()->id);

            return $this->success($company, 'Company verification approved.');
        } catch (Exception $e) {
            $message = $e->getMessage();

            if (str_contains($message, 'not found')) {
                return $this->error('COMPANY_NOT_FOUND', 'Company not found.', 404);
            }

            if (str_contains($message, 'already approved')) {
                return $this->error('ALREADY_VERIFIED', $message, 409);
            }

            return $this->error('ERROR', $message, 500);
        }
    }

    public function reject(string $companyId, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|min:3|max:1000',
        ]);

        try {
            $company = $this->adminService->rejectCompanyVerification(
                $companyId,
                $request->user()->id,
                $validated['reason'],
            );

            return $this->success($company, 'Company verification rejected.');
        } catch (Exception $e) {
            $message = $e->getMessage();

            if (str_contains($message, 'not found')) {
                return $this->error('COMPANY_NOT_FOUND', 'Company not found.', 404);
            }

            if (str_contains($message, 'already rejected')) {
                return $this->error('ALREADY_REJECTED', $message, 409);
            }

            return $this->error('ERROR', $message, 500);
        }
    }

    private function toSignedReadUrl(string $fileUrl): string
    {
        if ($fileUrl === '') {
            return '';
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
