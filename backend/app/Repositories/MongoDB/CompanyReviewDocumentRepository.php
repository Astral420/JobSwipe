<?php

namespace App\Repositories\MongoDB;

use App\Models\MongoDB\CompanyReviewDocument;
use Illuminate\Support\Collection;

class CompanyReviewDocumentRepository
{
    public function findByReviewId(string $reviewId): ?CompanyReviewDocument
    {
        return CompanyReviewDocument::where('review_id', $reviewId)->first();
    }

    public function findByReviewIds(array $reviewIds): Collection
    {
        return CompanyReviewDocument::whereIn('review_id', $reviewIds)->get();
    }

    public function create(array $data): CompanyReviewDocument
    {
        return CompanyReviewDocument::create($data);
    }

    public function update(CompanyReviewDocument $document, array $data): CompanyReviewDocument
    {
        $document->update($data);

        return $document->fresh();
    }

    public function deleteByReviewId(string $reviewId): void
    {
        CompanyReviewDocument::where('review_id', $reviewId)->delete();
    }

    /**
     * Get aggregate statistics for a company's reviews
     */
    public function getAggregateStats(string $companyId, array $reviewIds): array
    {
        if (empty($reviewIds)) {
            return [
                'average_rating' => null,
                'total_count' => 0,
                'rating_distribution' => [
                    1 => 0,
                    2 => 0,
                    3 => 0,
                    4 => 0,
                    5 => 0,
                ],
            ];
        }

        $reviews = CompanyReviewDocument::whereIn('review_id', $reviewIds)
            ->where('company_id', $companyId)
            ->get();

        $totalCount = $reviews->count();
        $averageRating = $totalCount > 0 ? $reviews->avg('rating') : null;

        $distribution = [
            1 => 0,
            2 => 0,
            3 => 0,
            4 => 0,
            5 => 0,
        ];

        foreach ($reviews as $review) {
            $rating = $review->rating;
            if (isset($distribution[$rating])) {
                $distribution[$rating]++;
            }
        }

        return [
            'average_rating' => $averageRating ? round($averageRating, 2) : null,
            'total_count' => $totalCount,
            'rating_distribution' => $distribution,
        ];
    }

    /**
     * Get rating distribution for a company
     */
    public function getRatingDistribution(string $companyId, array $reviewIds): array
    {
        if (empty($reviewIds)) {
            return [
                1 => 0,
                2 => 0,
                3 => 0,
                4 => 0,
                5 => 0,
            ];
        }

        $reviews = CompanyReviewDocument::whereIn('review_id', $reviewIds)
            ->where('company_id', $companyId)
            ->get();

        $distribution = [
            1 => 0,
            2 => 0,
            3 => 0,
            4 => 0,
            5 => 0,
        ];

        foreach ($reviews as $review) {
            $rating = $review->rating;
            if (isset($distribution[$rating])) {
                $distribution[$rating]++;
            }
        }

        return $distribution;
    }
}
