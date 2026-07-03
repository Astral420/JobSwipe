<?php

namespace App\Models\PostgreSQL;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use RuntimeException;

class AuditLog extends Model
{
    protected $connection = 'pgsql';

    protected $table = 'audit_logs';

    public $incrementing = false;

    protected $keyType = 'string';

    // Disable updated_at since audit logs are immutable
    public const UPDATED_AT = null;

    protected $fillable = [
        'action_type',
        'resource_type',
        'resource_id',
        'actor_id',
        'actor_role',
        'metadata',
        'before_state',
        'after_state',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'metadata' => 'array',
        'before_state' => 'array',
        'after_state' => 'array',
        'created_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        // Auto-generate UUID on creation
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });

        // Prevent updates - audit logs are immutable
        static::updating(function () {
            throw new RuntimeException('Audit logs cannot be modified');
        });

        // Prevent deletes - audit logs are immutable
        static::deleting(function () {
            throw new RuntimeException('Audit logs cannot be deleted');
        });
    }

    /**
     * Get the actor (user) who performed the action.
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
