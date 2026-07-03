<?php

namespace App\Models\PostgreSQL;

use Illuminate\Database\Eloquent\Model;

class WebhookEvent extends Model
{
    protected $connection = 'pgsql';

    protected $table = 'iap_webhook_events';

    public $timestamps = false;

    protected $fillable = [
        'event_id',
        'payment_provider',
        'event_type',
    ];
}
