<?php

namespace App\Models\PostgreSQL;

use Database\Factories\MatchMessageFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class MatchMessage extends Model
{
    use HasFactory;

    protected static function newFactory(): MatchMessageFactory
    {
        return MatchMessageFactory::new();
    }

    protected $connection = 'pgsql';

    protected $table = 'match_messages';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'match_id', 'sender_id', 'client_message_id', 'body', 'read_at', 'created_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->created_at)) {
                $model->created_at = now();
            }
        });
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(MatchRecord::class, 'match_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }
}
