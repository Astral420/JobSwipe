<?php

namespace App\Models\PostgreSQL;

use Database\Factories\CompanyProfileFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CompanyProfile extends Model
{
    use HasFactory;

    protected static function newFactory(): CompanyProfileFactory
    {
        return CompanyProfileFactory::new();
    }

    protected $connection = 'pgsql';

    protected $table = 'company_profiles';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'user_id', 'owner_user_id', 'company_name', 'company_domain', 'is_free_email_domain',
        'is_verified', 'verification_status',
        'subscription_tier', 'subscription_status',
        'status', 'suspension_reason', 'suspended_at',
        'trust_score', 'trust_level', 'listing_cap',
        'active_listings_count',
    ];

    protected $casts = [
        'is_verified' => 'boolean',
        'is_free_email_domain' => 'boolean',
        'active_listings_count' => 'integer',
        'trust_score' => 'integer',
        'listing_cap' => 'integer',
        'suspended_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function jobPostings(): HasMany
    {
        return $this->hasMany(JobPosting::class, 'company_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(CompanyReview::class, 'company_id');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(CompanyMembership::class, 'company_id');
    }

    public function invites(): HasMany
    {
        return $this->hasMany(CompanyInvite::class, 'company_id');
    }

    public function isVerified(): bool
    {
        // Verified badge requires admin approval + active paid subscription
        return $this->is_verified
            && $this->subscription_status === 'active'
            && in_array($this->subscription_tier, ['basic', 'pro'], true);
    }

    public function isApproved(): bool
    {
        return $this->verification_status === 'approved';
    }

    public function canPostJobs(): bool
    {
        return $this->isApproved()
            && $this->status === 'active'
            && $this->listing_cap > 0
            && $this->active_listings_count < $this->listing_cap;
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
