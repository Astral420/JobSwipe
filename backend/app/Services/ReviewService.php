<?php

namespace App\Services;

use App\Exceptions\DuplicateReviewException;
use App\Exceptions\ReviewNotAllowedException;
use App\Repositories\MongoDB\CompanyReviewDocumentRepository;
use App\Repositories\PostgreSQL\ApplicantProfileRepository;
use App\Repositories\PostgreSQL\ApplicationRepository;
use App\Repositories\PostgreSQL\CompanyReviewRepository;
use App\Repositories\PostgreSQL\JobPostingRepository;
use Exception;
use Illuminate\Support\Str;

class ReviewService
{
    public function __construct(
        private CompanyReviewRepository $pgReviewRepository,
        private CompanyReviewDocumentRepository $mongoReviewRepository,
        private ApplicationRepository $applicationRepository,
        private ApplicantProfileRepository $applicantProfileRepository,
        private JobPostingRepository $jobPostingRepository,
        private NotificationService $notificationService,
    ) {}

    /**
     * Submit a new review for a company
     */
    public function submitReview(string $applicantId, array $data): array
    {
        // Validate business rules
        if (! $this->applicationRepository->hasAppliedToCompany($applicantId, $data['company_id'])) {
            throw new ReviewNotAllowedException('You must apply to at least one job at this company.');
        }

        if ($this->pgReviewRepository->exists($applicantId, $data['company_id'])) {
            throw new DuplicateReviewException('You have already submitted a review for this company.');
        }

        // Verify job posting belongs to company
        $jobPosting = $this->jobPostingRepository->findById($data['job_posting_id']);
        if (! $jobPosting || $jobPosting->company_id !== $data['company_id']) {
            throw new Exception('Job posting does not belong to the specified company.');
        }

        // Generate UUID
        $reviewId = Str::uuid()->toString();
        $mongoReview = null;

        try {
            // Use PostgreSQL transaction for atomicity
            \DB::beginTransaction();

            // Create PostgreSQL record
            $pgReview = $this->pgReviewRepository->create([
                'id' => $reviewId,
                'applicant_id' => $applicantId,
                'company_id' => $data['company_id'],
                'job_posting_id' => $data['job_posting_id'],
                'is_flagged' => false,
                'is_visible' => true,
            ]);

            // Create MongoDB document
            $mongoReview = $this->mongoReviewRepository->create([
                'review_id' => $reviewId,
                'applicant_id' => $applicantId,
                'company_id' => $data['company_id'],
                'job_posting_id' => $data['job_posting_id'],
                'rating' => $data['rating'],
                'review_text' => $data['review_text'] ?? null,
                'applicant_name' => $data['applicant_name'],
            ]);

            // Link PostgreSQL to MongoDB
            $this->pgReviewRepository->updateMongoReviewId($reviewId, (string) $mongoReview->_id);

            // Commit PostgreSQL transaction
            \DB::commit();

        } catch (Exception $e) {
            // Rollback PostgreSQL transaction
            \DB::rollBack();

            // Clean up MongoDB if it was created
            if ($mongoReview !== null) {
                try {
                    $this->mongoReviewRepository->deleteByReviewId($reviewId);
                } catch (Exception $cleanupException) {
                    // Log cleanup failure but don't mask original exception
                    \Log::error('Failed to cleanup MongoDB review after transaction rollback', [
                        'review_id' => $reviewId,
                        'error' => $cleanupException->getMessage(),
                    ]);
                }
            }

            throw $e;
        }

        // Notify company (outside transaction - non-critical)
        try {
            $this->notificationService->notifyCompanyOfReview($data['company_id'], $reviewId);
        } catch (Exception $e) {
            \Log::error('Failed to notify company of review', [
                'review_id' => $reviewId,
                'company_id' => $data['company_id'],
                'error' => $e->getMessage(),
            ]);
        }

        // Recalculate trust score (outside transaction - can be async)
        try {
            app(\App\Services\TrustScoreService::class)->recalculate($data['company_id']);
        } catch (Exception $e) {
            \Log::error('Failed to recalculate trust score after review', [
                'review_id' => $reviewId,
                'company_id' => $data['company_id'],
                'error' => $e->getMessage(),
            ]);
        }

        // Return merged data
        return [
            'id' => $pgReview->id,
            'rating' => $mongoReview->rating,
            'review_text' => $mongoReview->review_text,
            'applicant_name' => $mongoReview->applicant_name,
            'is_flagged' => $pgReview->is_flagged,
            'is_visible' => $pgReview->is_visible,
            'created_at' => $pgReview->created_at,
        ];
    }

    /**
     * Get reviews for a company with tier-based access control
     */
    public function getReviewsForCompany(string $companyId, string $applicantId): array
    {
        // Check subscription tier
        $applicantProfile = $this->applicantProfileRepository->findByUserId($applicantId);
        $isProSubscriber = $applicantProfile
            && $applicantProfile->subscription_tier === 'pro'
            && $applicantProfile->subscription_status === 'active';

        // Get visible review IDs from PostgreSQL
        $visibleReviewIds = $this->pgReviewRepository->getVisibleReviewIds($companyId)->toArray();

        // Get aggregate statistics (available to all tiers)
        $stats = $this->mongoReviewRepository->getAggregateStats($companyId, $visibleReviewIds);

        // Conditional review access based on tier
        if ($isProSubscriber) {
            // Pro subscribers get full review content
            $reviewDocuments = $this->mongoReviewRepository->findByReviewIds($visibleReviewIds);

            $reviews = [];
            foreach ($reviewDocuments as $doc) {
                $pgReview = $this->pgReviewRepository->findById($doc->review_id);

                $reviews[] = [
                    'id' => $doc->review_id,
                    'rating' => $doc->rating,
                    'review_text' => $doc->review_text,
                    'applicant_name' => $doc->applicant_name,
                    'is_flagged' => $pgReview ? $pgReview->is_flagged : false,
                    'created_at' => $doc->created_at,
                ];
            }

            return [
                'reviews' => $reviews,
                'stats' => $stats,
                'access_level' => 'full',
            ];
        }

        // Free/Basic subscribers get stats only
        return [
            'reviews' => null,
            'stats' => $stats,
            'access_level' => 'summary',
        ];
    }

    /**
     * Flag a review for moderation
     */
    public function flagReview(string $reviewId, string $userId): void
    {
        $review = $this->pgReviewRepository->findById($reviewId);

        if (! $review) {
            throw new Exception('Review not found.');
        }

        // Idempotent operation
        if ($review->is_flagged) {
            return;
        }

        // Flag the review in PostgreSQL only
        $this->pgReviewRepository->update($review, ['is_flagged' => true]);

        // Notify moderators
        $this->notificationService->notifyModerators('review_flagged', $reviewId, $userId);
    }

    /**
     * Unflag a review (moderator action)
     */
    public function unflagReview(string $reviewId): void
    {
        $review = $this->pgReviewRepository->findById($reviewId);

        if (! $review) {
            throw new Exception('Review not found.');
        }

        // Set is_flagged to false while maintaining visibility
        $this->pgReviewRepository->update($review, ['is_flagged' => false]);
    }

    /**
     * Remove a review (moderator action)
     */
    public function removeReview(string $reviewId, string $moderatorId): void
    {
        $review = $this->pgReviewRepository->findById($reviewId);

        if (! $review) {
            throw new Exception('Review not found.');
        }

        // Set visibility to false (soft delete in PostgreSQL)
        $this->pgReviewRepository->update($review, ['is_visible' => false]);

        // Delete from MongoDB (hard delete)
        $this->mongoReviewRepository->deleteByReviewId($reviewId);

        // Log moderation action (you can implement this as needed)
        // logModerationAction($moderatorId, 'review_removed', $reviewId);
    }

    /**
     * Check if an applicant can submit a review for a company
     */
    public function canSubmitReview(string $applicantId, string $companyId): bool
    {
        // Check if applicant has applied to company
        if (! $this->applicationRepository->hasAppliedToCompany($applicantId, $companyId)) {
            return false;
        }

        // Check if review already exists
        if ($this->pgReviewRepository->exists($applicantId, $companyId)) {
            return false;
        }

        return true;
    }
}
