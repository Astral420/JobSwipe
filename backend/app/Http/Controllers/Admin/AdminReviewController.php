<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Repositories\PostgreSQL\CompanyReviewRepository;
use App\Services\AuditService;
use App\Services\ReviewService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReviewController extends Controller
{
    public function __construct(
        private ReviewService $reviewService,
        private CompanyReviewRepository $companyReviewRepository,
        private AuditService $auditService,
    ) {}

    /**
     * List all reviews with filtering
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $perPage = $request->input('pageSize', 20);
            $page = $request->input('page', 1);
            $status = $request->input('status'); // 'flagged', 'all', etc.

            // If status is 'flagged', use the flagged reviews method
            if ($status === 'flagged') {
                $reviews = $this->companyReviewRepository->getFlaggedReviews($perPage);
            } else {
                // Get all reviews with pagination
                $reviews = $this->companyReviewRepository->getAllWithPagination($perPage);
            }

            return $this->success($reviews, 'Reviews retrieved successfully.');

        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Get flagged reviews for moderation
     */
    public function getFlaggedReviews(Request $request): JsonResponse
    {
        try {
            $perPage = $request->input('per_page', 20);
            $flaggedReviews = $this->companyReviewRepository->getFlaggedReviews($perPage);

            return $this->success($flaggedReviews, 'Flagged reviews retrieved successfully.');

        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Unflag a review (dismiss false flag)
     */
    public function unflag(string $id, Request $request): JsonResponse
    {
        try {
            $review = $this->companyReviewRepository->findById($id);
            if (! $review) {
                return $this->error('REVIEW_NOT_FOUND', 'Review not found.', 404);
            }

            $beforeState = ['is_flagged' => $review->is_flagged];

            $this->reviewService->unflagReview($id);

            // Log audit
            $this->auditService->log(
                'review_unflag',
                'review',
                $id,
                $request->user(),
                null,
                $beforeState,
                ['is_flagged' => false]
            );

            return $this->success(null, 'Review unflagged successfully.');

        } catch (Exception $e) {
            if (str_contains($e->getMessage(), 'not found')) {
                return $this->error('REVIEW_NOT_FOUND', 'Review not found.', 404);
            }

            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Remove a review (hide from public)
     */
    public function remove(string $id, Request $request): JsonResponse
    {
        try {
            $review = $this->companyReviewRepository->findById($id);
            if (! $review) {
                return $this->error('REVIEW_NOT_FOUND', 'Review not found.', 404);
            }

            $beforeState = ['deleted_at' => $review->deleted_at];

            $moderatorId = $request->user()->id;
            $this->reviewService->removeReview($id, $moderatorId);

            // Log audit
            $this->auditService->log(
                'review_remove',
                'review',
                $id,
                $request->user(),
                ['reason' => $request->input('reason', 'No reason provided')],
                $beforeState,
                ['deleted_at' => now()]
            );

            return $this->success(null, 'Review removed successfully.');

        } catch (Exception $e) {
            if (str_contains($e->getMessage(), 'not found')) {
                return $this->error('REVIEW_NOT_FOUND', 'Review not found.', 404);
            }

            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }
}
