<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_AREA_MANAGER = 'area_manager';

    public const ROLE_BRANCH_MANAGER = 'branch_manager';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'role',
        'branch_id',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function managedBranches(): HasMany
    {
        return $this->hasMany(Branch::class, 'area_manager_id');
    }

    public function isAreaManager(): bool
    {
        return $this->role === self::ROLE_AREA_MANAGER;
    }

    public function isBranchManager(): bool
    {
        return $this->role === self::ROLE_BRANCH_MANAGER;
    }

    public function canSubmitDailyReportForBranch(int $branchId): bool
    {
        if ($this->isAreaManager()) {
            return true;
        }

        return $this->isBranchManager() && (int) $this->branch_id === $branchId;
    }
}
