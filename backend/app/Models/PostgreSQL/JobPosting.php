<?php

namespace App\Models\PostgreSQL;

use Database\Factories\JobPostingFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Laravel\Scout\Searchable;

class JobPosting extends Model
{
    use HasFactory, Searchable, SoftDeletes;  // Added SoftDeletes

    protected $dates = ['deleted_at'];

    protected static function newFactory(): JobPostingFactory
    {
        return JobPostingFactory::new();
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    protected $connection = 'pgsql';

    protected $table = 'job_postings';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'company_id', 'title', 'description', 'salary_min', 'salary_max',
        'salary_is_hidden', 'salary_period', 'work_type', 'employment_type',
        'location', 'location_city', 'location_region', 'lat', 'lng',
        'interview_template', 'status', 'expires_at', 'published_at',
        'deleted_by', 'deletion_reason',
        'is_flagged', 'flag_reason', 'flagged_at', 'flagged_by',
        'closed_at', 'closed_by',
    ];

    protected $casts = [
        'salary_is_hidden' => 'boolean',
        'is_flagged' => 'boolean',
        'expires_at' => 'datetime',
        'published_at' => 'datetime',
        'deleted_at' => 'datetime',
        'flagged_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(CompanyProfile::class, 'company_id');
    }

    public function skills(): HasMany
    {
        return $this->hasMany(JobSkill::class, 'job_posting_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'job_posting_id');
    }

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function flaggedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'flagged_by');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    // Meilisearch: define what gets indexed
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'work_type' => $this->work_type,
            'employment_type' => $this->employment_type,
            'salary_period' => $this->salary_period,
            'location_city' => $this->location_city,
            'location_region' => $this->location_region,
            'skills' => $this->skills->pluck('skill_name')->toArray(),
            '_geo' => $this->lat ? ['lat' => $this->lat, 'lng' => $this->lng] : null,
            'published_at' => $this->published_at?->timestamp,
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active')
            ->where('is_flagged', false) // Exclude flagged jobs from applicant feeds
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->whereNull('deleted_at'); // Explicitly exclude soft-deleted jobs
    }

    /**
     * Scope to include soft-deleted jobs for admin views
     */
    public function scopeWithDeleted($query)
    {
        return $query->withTrashed();
    }
}
