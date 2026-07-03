<?php

namespace App\Models\PostgreSQL;

use App\Services\UserDataCleanupService;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Str;
use Laravel\Cashier\Billable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use Billable, HasApiTokens, HasFactory;

    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }

    protected $connection = 'pgsql';

    protected $table = 'users';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'email',
        'password_hash',
        'role',
        'is_active',
        'is_banned',
        'email_verified_at',
        'google_id',
        'stripe_id',
        'pm_type',
        'pm_last_four',
        'trial_ends_at',
    ];

    protected $hidden = ['password_hash'];

    protected $casts = [
        'is_active' => 'boolean',
        'is_banned' => 'boolean',
        'email_verified_at' => 'datetime',
        'trial_ends_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });

        static::deleting(function (self $model) {
            app(UserDataCleanupService::class)->cleanupForDeletedUser($model);
        });
    }

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function applicantProfile(): HasOne
    {
        return $this->hasOne(ApplicantProfile::class, 'user_id');
    }

    public function companyProfile(): HasOne
    {
        return $this->hasOne(CompanyProfile::class, 'user_id');
    }

    public function companyMemberships(): HasMany
    {
        return $this->hasMany(CompanyMembership::class, 'user_id');
    }

    public function hrProfile(): HasOne
    {
        return $this->hasOne(HRProfile::class, 'user_id');
    }

    public function isApplicant(): bool
    {
        return $this->role === 'applicant';
    }

    public function isHr(): bool
    {
        return in_array($this->role, ['hr', 'company_admin'], true);
    }

    public function hasVerifiedEmail(): bool
    {
        return $this->email_verified_at !== null;
    }

    // RBAC Role Checking Methods

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isModerator(): bool
    {
        return $this->role === 'moderator';
    }

    public function isAdminUser(): bool
    {
        return in_array($this->role, ['super_admin', 'admin', 'moderator'], true);
    }

    // RBAC Permission Checking Methods

    public function hasPermission(string $permission): bool
    {
        return app(\App\Services\PermissionService::class)->hasPermission($this, $permission);
    }

    public function canPerformAction(string $action, ?\Illuminate\Database\Eloquent\Model $target = null): bool
    {
        return app(\App\Services\PermissionService::class)->canPerformAction($this, $action, $target);
    }
}
