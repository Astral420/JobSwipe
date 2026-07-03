<?php

namespace App\Models\PostgreSQL;

use Illuminate\Database\Eloquent\Model;

class IAPIdempotencyKey extends Model
{
    protected $connection = 'pgsql';

    protected $table = 'iap_idempotency_keys';

    protected $fillable = [
        'user_id',
        'idempotency_key',
        'request_fingerprint',
        'result',
        'expires_at',
    ];

    protected $casts = [
        'result' => 'array',
        'expires_at' => 'datetime',
    ];
}
