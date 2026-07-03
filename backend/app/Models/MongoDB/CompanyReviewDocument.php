<?php

namespace App\Models\MongoDB;

use MongoDB\Laravel\Eloquent\Model;

class CompanyReviewDocument extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'company_reviews';

    protected $fillable = [
        'review_id',
        'applicant_id',
        'company_id',
        'job_posting_id',
        'rating',
        'review_text',
        'applicant_name',
    ];

    protected $casts = [
        'rating' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the applicant's display name (anonymized)
     */
    public function getApplicantDisplayName(): string
    {
        return $this->applicant_name;
    }
}
