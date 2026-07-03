<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\CompanyProfile;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class CompanyProfileRepository
{
    public function findByUserId(string $userId): ?CompanyProfile
    {
        $byMembership = CompanyProfile::query()
            ->select('company_profiles.*')
            ->join('company_memberships', 'company_memberships.company_id', '=', 'company_profiles.id')
            ->where('company_memberships.user_id', $userId)
            ->where('company_memberships.status', 'active')
            ->orderByRaw("CASE WHEN company_memberships.membership_role = 'company_admin' THEN 0 ELSE 1 END")
            ->orderByDesc('company_memberships.joined_at')
            ->first();

        if ($byMembership) {
            return $byMembership;
        }

        // Legacy fallback during transition.
        return CompanyProfile::where('user_id', $userId)->first();
    }

    public function findById(string $id): ?CompanyProfile
    {
        return CompanyProfile::find($id);
    }

    public function findByDomain(string $domain): ?CompanyProfile
    {
        return CompanyProfile::where('company_domain', strtolower(trim($domain)))
            ->orderBy('created_at')
            ->first();
    }

    public function existsByDomain(string $domain): bool
    {
        return CompanyProfile::where('company_domain', strtolower(trim($domain)))->exists();
    }

    public function create(array $data): CompanyProfile
    {
        return CompanyProfile::create($data);
    }

    public function update(CompanyProfile $profile, array $data): CompanyProfile
    {
        $profile->update($data);

        return $profile->fresh();
    }

    public function getVerified(): Collection
    {
        return CompanyProfile::where('is_verified', true)->get();
    }

    public function getPendingVerification(): Collection
    {
        return CompanyProfile::where('verification_status', 'pending')->get();
    }

    public function markAsVerified(string $companyId): void
    {
        $profile = CompanyProfile::find($companyId);

        if (! $profile) {
            return;
        }

        $profile->update([
            'is_verified' => true,
            'verification_status' => 'approved',
        ]);
    }

    public function incrementListingsCount(string $companyId): void
    {
        CompanyProfile::where('id', $companyId)
            ->increment('active_listings_count');
    }

    public function decrementListingsCount(string $companyId): void
    {
        CompanyProfile::where('id', $companyId)
            ->where('active_listings_count', '>', 0)
            ->decrement('active_listings_count');
    }

    public function paginateByVerificationStatus(string $status, int $perPage = 20): LengthAwarePaginator
    {
        return CompanyProfile::where('verification_status', $status)
            ->orderBy('updated_at', 'desc')
            ->paginate($perPage);
    }

    public function countByVerificationStatus(string $status): int
    {
        return CompanyProfile::where('verification_status', $status)->count();
    }

    public function countVerified(): int
    {
        return CompanyProfile::where('is_verified', true)->count();
    }

    public function countTotal(): int
    {
        return CompanyProfile::count();
    }

    /**
     * Search companies with admin filters and pagination.
     */
    public function searchAdmin(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $query = CompanyProfile::query();

        // Filter by verification status
        if (isset($filters['verificationStatus'])) {
            $query->where('verification_status', $filters['verificationStatus']);
        }

        // Filter by trust level
        if (isset($filters['trustLevel'])) {
            $query->where('trust_level', $filters['trustLevel']);
        }

        // Filter by subscription tier
        if (isset($filters['subscriptionTier'])) {
            $query->where('subscription_tier', $filters['subscriptionTier']);
        }

        // Filter by status (active/suspended)
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Search by company name or domain
        if (isset($filters['search']) && ! empty($filters['search'])) {
            $search = strtolower(trim($filters['search']));
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(company_name) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(company_domain) LIKE ?', ["%{$search}%"]);
            });
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    /**
     * Suspend a company account.
     */
    public function suspendCompany(string $companyId, string $reason): bool
    {
        $company = CompanyProfile::find($companyId);

        if (! $company) {
            return false;
        }

        return $company->update([
            'status' => 'suspended',
            'suspension_reason' => $reason,
            'suspended_at' => now(),
        ]);
    }

    /**
     * Unsuspend (reactivate) a company account.
     */
    public function unsuspendCompany(string $companyId): bool
    {
        $company = CompanyProfile::find($companyId);

        if (! $company) {
            return false;
        }

        return $company->update([
            'status' => 'active',
            'suspension_reason' => null,
            'suspended_at' => null,
        ]);
    }

    /**
     * Get company details with trust data for admin view.
     */
    public function getCompanyWithTrustData(string $companyId): ?array
    {
        $company = CompanyProfile::with(['owner', 'jobPostings', 'reviews'])
            ->find($companyId);

        if (! $company) {
            return null;
        }

        return [
            'id' => $company->id,
            'company_name' => $company->company_name,
            'company_domain' => $company->company_domain,
            'is_free_email_domain' => $company->is_free_email_domain,
            'is_verified' => $company->is_verified,
            'verification_status' => $company->verification_status,
            'subscription_tier' => $company->subscription_tier,
            'subscription_status' => $company->subscription_status,
            'status' => $company->status,
            'suspension_reason' => $company->suspension_reason,
            'suspended_at' => $company->suspended_at?->toIso8601String(),
            'trust_score' => $company->trust_score,
            'trust_level' => $company->trust_level,
            'listing_cap' => $company->listing_cap,
            'active_listings_count' => $company->active_listings_count,
            'owner' => $company->owner ? [
                'id' => $company->owner->id,
                'name' => $company->owner->name,
                'email' => $company->owner->email,
            ] : null,
            'job_postings_count' => $company->jobPostings->count(),
            'reviews_count' => $company->reviews->count(),
            'created_at' => $company->created_at->toIso8601String(),
            'updated_at' => $company->updated_at->toIso8601String(),
        ];
    }
}
