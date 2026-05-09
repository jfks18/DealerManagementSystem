<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class Quota extends Model
{
    protected $fillable = [
        'branch_id',
        'month',
        'installment_units_quota',
        'total_units_quota',
        'parts_sales_quota',
        'labor_quota',
        'cpn_quota',
        'non_cpn_quota',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function cashQuota(): int
    {
        return (int) $this->total_units_quota - (int) $this->installment_units_quota;
    }
}
