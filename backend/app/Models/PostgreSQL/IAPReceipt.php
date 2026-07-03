<?php

namespace App\Models\PostgreSQL;

use Illuminate\Database\Eloquent\Model;

class IAPReceipt extends Model
{
    protected $connection = 'pgsql';

    protected $table = 'iap_receipts';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'transaction_id',
        'payment_provider',
        'user_id',
        'product_id',
        'raw_receipt_data',
        'verification_response',
        'verified_at',
    ];

    protected $casts = [
        'raw_receipt_data' => 'array',
        'verification_response' => 'array',
        'verified_at' => 'datetime',
    ];
}
