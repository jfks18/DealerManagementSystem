<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('daily_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->date('date');

            $table->unsignedInteger('installment_units_actual');
            $table->unsignedInteger('total_units_actual');
            $table->decimal('parts_sales_actual', 15, 2);
            $table->decimal('labor_actual', 15, 2);
            $table->unsignedInteger('cpn_units_actual');
            $table->unsignedInteger('non_cpn_units_actual');
            $table->timestamps();

            $table->unique(['branch_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
    }
};
