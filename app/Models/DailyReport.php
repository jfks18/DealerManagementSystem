<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class DailyReport extends Model
{
    protected $fillable = [
        'branch_id',
        'date',
        'installment_units_actual',
        'total_units_actual',
        'parts_sales_actual',
        'labor_actual',
        'cpn_units_actual',
        'non_cpn_units_actual',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
