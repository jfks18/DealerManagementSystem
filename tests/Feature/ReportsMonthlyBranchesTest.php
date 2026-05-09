<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\DailyReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportsMonthlyBranchesTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_branch_based_monthly_report_filtered_by_year_and_month_with_overall_summary(): void
    {
        $areaManager = User::factory()->create([
            'role' => User::ROLE_AREA_MANAGER,
            'branch_id' => null,
        ]);

        $branchA = Branch::create([
            'name' => 'Branch A',
            'area_manager_id' => $areaManager->id,
        ]);

        $branchB = Branch::create([
            'name' => 'Branch B',
            'area_manager_id' => $areaManager->id,
        ]);

        DailyReport::create([
            'branch_id' => $branchA->id,
            'date' => '2026-05-03',
            'installment_units_actual' => 5,
            'total_units_actual' => 10,
            'parts_sales_actual' => 1000,
            'labor_actual' => 200,
            'cpn_units_actual' => 2,
            'non_cpn_units_actual' => 3,
        ]);

        DailyReport::create([
            'branch_id' => $branchA->id,
            'date' => '2026-05-15',
            'installment_units_actual' => 2,
            'total_units_actual' => 4,
            'parts_sales_actual' => 400,
            'labor_actual' => 80,
            'cpn_units_actual' => 1,
            'non_cpn_units_actual' => 1,
        ]);

        DailyReport::create([
            'branch_id' => $branchB->id,
            'date' => '2026-05-20',
            'installment_units_actual' => 3,
            'total_units_actual' => 6,
            'parts_sales_actual' => 600,
            'labor_actual' => 120,
            'cpn_units_actual' => 1,
            'non_cpn_units_actual' => 2,
        ]);

        // Different year; must be excluded by filter.
        DailyReport::create([
            'branch_id' => $branchB->id,
            'date' => '2025-05-20',
            'installment_units_actual' => 99,
            'total_units_actual' => 99,
            'parts_sales_actual' => 9999,
            'labor_actual' => 999,
            'cpn_units_actual' => 99,
            'non_cpn_units_actual' => 99,
        ]);

        Sanctum::actingAs($areaManager);

        $response = $this->getJson('/api/reports/branches?year=2026&month=5');

        $response
            ->assertOk()
            ->assertJsonPath('filters.year', 2026)
            ->assertJsonPath('filters.month', 5)
            ->assertJsonPath('overall.installment_units_actual', 10)
            ->assertJsonPath('overall.total_units_actual', 20)
            ->assertJsonPath('overall.parts_sales_actual', 2000)
            ->assertJsonPath('overall.labor_actual', 400)
            ->assertJsonPath('overall.cpn_units_actual', 4)
            ->assertJsonPath('overall.non_cpn_units_actual', 6)
            ->assertJsonCount(2, 'data');
    }

    public function test_it_can_filter_branch_monthly_report_by_branch_id(): void
    {
        $areaManager = User::factory()->create([
            'role' => User::ROLE_AREA_MANAGER,
            'branch_id' => null,
        ]);

        $branch = Branch::create([
            'name' => 'Only Branch',
            'area_manager_id' => $areaManager->id,
        ]);

        DailyReport::create([
            'branch_id' => $branch->id,
            'date' => '2026-06-01',
            'installment_units_actual' => 1,
            'total_units_actual' => 2,
            'parts_sales_actual' => 100,
            'labor_actual' => 50,
            'cpn_units_actual' => 1,
            'non_cpn_units_actual' => 0,
        ]);

        Sanctum::actingAs($areaManager);

        $this->getJson("/api/reports/branches?year=2026&branch_id={$branch->id}")
            ->assertOk()
            ->assertJsonPath('filters.branch_id', $branch->id)
            ->assertJsonCount(1, 'data');
    }
}
