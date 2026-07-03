<?php

namespace App\Models\PostgreSQL;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IAPTransaction extends Model
{
    protected $connection = 'pgsql';

    protected $table = 'iap_transactions';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'transaction_id',
        'payment_provider',
        'user_id',
        'product_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
