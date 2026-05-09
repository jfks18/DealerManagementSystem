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
        Schema::create('quotas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->string('month', 7);

            $table->unsignedInteger('installment_units_quota');
            $table->unsignedInteger('total_units_quota');
            $table->decimal('parts_sales_quota', 15, 2);
            $table->decimal('labor_quota', 15, 2);
            $table->unsignedInteger('cpn_quota');
            $table->unsignedInteger('non_cpn_quota');
            $table->timestamps();

            $table->unique(['branch_id', 'month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quotas');
    }
};
