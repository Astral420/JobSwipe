<?php

namespace App\Models\PostgreSQL;

use Database\Factories\MatchRecordFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class MatchRecord extends Model
{
    use HasFactory;

    protected static function newFactory(): MatchRecordFactory
    {
        return MatchRecordFactory::new();
    }

    protected $connection = 'pgsql';

    protected $table = 'matches';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'application_id', 'applicant_id', 'job_posting_id', 'hr_user_id',
        'initial_message', 'status',
        'matched_at', 'response_deadline', 'responded_at',
        'closed_at', 'closed_by',
    ];

    protected $casts = [
        'matched_at' => 'datetime',
        'response_deadline' => 'datetime',
        'responded_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    // ── Relationships ─────────────────────────────────────────────────────

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class, 'application_id');
    }

    public function applicant(): BelongsTo
    {
        return $this->belongsTo(ApplicantProfile::class, 'applicant_id');
    }

    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class, 'job_posting_id');
    }

    public function hrUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'hr_user_id');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(MatchMessage::class, 'match_id')->orderBy('created_at', 'asc');
    }

    // ── Status Helpers ────────────────────────────────────────────────────

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isAccepted(): bool
    {
        return $this->status === 'accepted';
    }

    public function isExpired(): bool
    {
        return $this->status === 'expired';
    }

    public function isDeclined(): bool
    {
        return $this->status === 'declined';
    }

    public function isClosed(): bool
    {
        return $this->status === 'closed';
    }

    /**
     * Chat is active when the match has been accepted and not closed by HR.
     */
    public function isChatActive(): bool
    {
        return $this->isAccepted() && ! $this->isClosed();
    }

    /**
     * Whether the 24h response deadline has passed.
     */
    public function hasDeadlinePassed(): bool
    {
        return now()->greaterThanOrEqualTo($this->response_deadline);
    }

    /**
     * Returns remaining time until deadline as a human-readable string,
     * or null if the deadline has passed.
     */
    public function timeRemaining(): ?string
    {
        if ($this->hasDeadlinePassed()) {
            return null;
        }

        return now()->diffForHumans($this->response_deadline, ['parts' => 2, 'syntax' => true]);
    }

    /**
     * Seconds remaining until the response deadline.
     */
    public function secondsRemaining(): int
    {
        if ($this->hasDeadlinePassed()) {
            return 0;
        }

        return (int) now()->diffInSeconds($this->response_deadline, false);
    }
}
