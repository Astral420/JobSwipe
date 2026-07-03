<?php

namespace App\Models\PostgreSQL;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyReview extends Model
{
    protected $connection = 'pgsql';

    protected $table = 'company_reviews';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'applicant_id', 'company_id', 'job_posting_id',
        'is_flagged', 'is_visible', 'mongo_review_id',
    ];

    protected $casts = [
        'is_flagged' => 'boolean',
        'is_visible' => 'boolean',
    ];

    public function applicant(): BelongsTo
    {
        return $this->belongsTo(ApplicantProfile::class, 'applicant_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(CompanyProfile::class, 'company_id');
    }

    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class, 'job_posting_id');
    }

    public function scopeVisible($query)
    {
        return $query->where('is_visible', true);
    }

    public function isFlagged(): bool
    {
        return $this->is_flagged;
    }

    public function isVisible(): bool
    {
        return $this->is_visible;
    }
}
