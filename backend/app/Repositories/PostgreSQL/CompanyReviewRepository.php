<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\CompanyReview;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class CompanyReviewRepository
{
    public function findById(string $id): ?CompanyReview
    {
        return CompanyReview::find($id);
    }

    public function create(array $data): CompanyReview
    {
        return CompanyReview::create($data);
    }

    public function update(CompanyReview $review, array $data): CompanyReview
    {
        $review->update($data);

        return $review->fresh();
    }

    public function delete(CompanyReview $review): bool
    {
        return $review->delete();
    }

    public function exists(string $applicantId, string $companyId): bool
    {
        return CompanyReview::where('applicant_id', $applicantId)
            ->where('company_id', $companyId)
            ->exists();
    }

    public function getVisibleReviewIds(string $companyId): Collection
    {
        return CompanyReview::where('company_id', $companyId)
            ->where('is_visible', true)
            ->get(['id']);
    }

    public function getFlaggedReviews(int $perPage = 20): LengthAwarePaginator
    {
        return CompanyReview::where('is_flagged', true)
            ->where('is_visible', true)
            ->with(['applicant', 'company', 'jobPosting'])
            ->orderBy('updated_at', 'desc')
            ->paginate($perPage);
    }

    public function getAllWithPagination(int $perPage = 20): LengthAwarePaginator
    {
        return CompanyReview::with(['applicant', 'company', 'jobPosting'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    public function countByCompany(string $companyId): int
    {
        return CompanyReview::where('company_id', $companyId)
            ->where('is_visible', true)
            ->count();
    }

    public function updateMongoReviewId(string $reviewId, string $mongoReviewId): void
    {
        CompanyReview::where('id', $reviewId)
            ->update(['mongo_review_id' => $mongoReviewId]);
    }

    public function countTotal(): int
    {
        return CompanyReview::count();
    }

    public function countFlagged(): int
    {
        return CompanyReview::where('is_flagged', true)->count();
    }
}
