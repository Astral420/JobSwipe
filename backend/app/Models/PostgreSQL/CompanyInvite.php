<?php

namespace App\Models\PostgreSQL;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CompanyInvite extends Model
{
    protected $connection = 'pgsql';

    protected $table = 'company_invites';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'company_id',
        'email',
        'email_domain',
        'invite_role',
        'token_hash',
        'invited_by_user_id',
        'expires_at',
        'accepted_at',
        'revoked_at',
        'invite_email_sent_at',
        'magic_link_clicked_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'revoked_at' => 'datetime',
        'invite_email_sent_at' => 'datetime',
        'magic_link_clicked_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $invite): void {
            if (empty($invite->id)) {
                $invite->id = (string) Str::uuid();
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(CompanyProfile::class, 'company_id');
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    /**
     * Alias used in validate endpoint to surface the inviter's name.
     */
    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }
}
