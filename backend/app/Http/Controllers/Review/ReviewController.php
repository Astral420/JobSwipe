<?php

namespace App\Http\Controllers\Review;

use App\Exceptions\DuplicateReviewException;
use App\Exceptions\ReviewNotAllowedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Review\SubmitReviewRequest;
use App\Repositories\MongoDB\ApplicantProfileDocumentRepository;
use App\Services\ReviewService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function __construct(
        private ReviewService $reviewService,
        private ApplicantProfileDocumentRepository $applicantProfileDocumentRepository,
    ) {}

    /**
     * Submit a new review for a company
     */
    public function store(SubmitReviewRequest $request): JsonResponse
    {
        try {
            $applicantId = $request->user()->applicantProfile->id;

            // Get applicant name for anonymization (first name + last initial)
            $applicantProfile = $this->applicantProfileDocumentRepository->findByUserId($request->user()->id);

            if (! $applicantProfile) {
                return $this->error('PROFILE_NOT_FOUND', 'Applicant profile not found.', 404);
            }

            $applicantName = $applicantProfile->first_name.' '.substr($applicantProfile->last_name, 0, 1).'.';

            $review = $this->reviewService->submitReview($applicantId, [
                'company_id' => $request->company_id,
                'job_posting_id' => $request->job_posting_id,
                'rating' => $request->rating,
                'review_text' => $request->review_text,
                'applicant_name' => $applicantName,
            ]);

            return $this->success($review, 'Review submitted successfully.', 201);

        } catch (ReviewNotAllowedException $e) {
            return $this->error('REVIEW_NOT_ALLOWED', $e->getMessage(), 403);
        } catch (DuplicateReviewException $e) {
            return $this->error('REVIEW_ALREADY_EXISTS', $e->getMessage(), 409);
        } catch (Exception $e) {
            return $this->error('VALIDATION_ERROR', $e->getMessage(), 422);
        }
    }

    /**
     * Get reviews for a company (tier-based access)
     */
    public function index(string $companyId, Request $request): JsonResponse
    {
        try {
            $applicantId = $request->user()->id;
            $result = $this->reviewService->getReviewsForCompany($companyId, $applicantId);

            return $this->success($result, 'Reviews retrieved successfully.');

        } catch (Exception $e) {
            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }

    /**
     * Flag a review for moderation
     */
    public function flag(string $id, Request $request): JsonResponse
    {
        try {
            $userId = $request->user()->id;
            $this->reviewService->flagReview($id, $userId);

            return $this->success(null, 'Review flagged successfully.');

        } catch (Exception $e) {
            if (str_contains($e->getMessage(), 'not found')) {
                return $this->error('REVIEW_NOT_FOUND', 'Review not found.', 404);
            }

            return $this->error('ERROR', $e->getMessage(), 500);
        }
    }
}
