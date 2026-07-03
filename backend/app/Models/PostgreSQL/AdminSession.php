<?php

namespace App\Models\PostgreSQL;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AdminSession extends Model
{
    protected $connection = 'pgsql';

    protected $table = 'admin_sessions';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'token_id',
        'ip_address',
        'user_agent',
        'last_activity_at',
        'expires_at',
    ];

    protected $casts = [
        'last_activity_at' => 'datetime',
        'expires_at' => 'datetime',
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

    /**
     * Get the user that owns the session.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the session has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at < now();
    }

    /**
     * Check if the session is inactive based on last activity.
     */
    public function isInactive(): bool
    {
        $timeout = config('admin.session.inactivity_timeout_minutes', 120);

        return $this->last_activity_at < now()->subMinutes($timeout);
    }

    /**
     * Update the last activity timestamp.
     */
    public function updateActivity(): void
    {
        $this->update(['last_activity_at' => now()]);
    }
}
