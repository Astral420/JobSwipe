<?php

namespace App\Models\PostgreSQL;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SwipePack extends Model
{
    protected $connection = 'pgsql';

    protected $table = 'swipe_packs';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'applicant_id',
        'quantity',
        'amount_paid',
        'currency',
        'payment_provider',
        'provider_payment_id',
        'refunded_at',
        'refund_reference',
    ];

    protected $casts = [
        'amount_paid' => 'decimal:2',
        'created_at' => 'datetime',
        'refunded_at' => 'datetime',
    ];

    public function applicant(): BelongsTo
    {
        return $this->belongsTo(ApplicantProfile::class, 'applicant_id');
    }
}
