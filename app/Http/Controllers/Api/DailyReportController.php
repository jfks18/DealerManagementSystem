<?php

namespace App\Http\Controllers\Api;

use App\Models\DailyReport;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyReportController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (! $user->isBranchManager()) {
            return response()->json([
                'message' => 'Only branch managers can submit daily reports.',
            ], 403);
        }

        if (! $user->branch_id) {
            return response()->json([
                'message' => 'Branch manager account is not assigned to a branch.',
            ], 422);
        }

        $validated = $request->validate([
            'date' => [
                'required',
                'date',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (Carbon::parse((string) $value)->isSunday()) {
                        $fail('Sunday entries are not allowed.');
                    }
                },
            ],
            'installment_units_actual' => ['required', 'integer', 'min:0'],
            'total_units_actual' => ['required', 'integer', 'min:0'],
            'parts_sales_actual' => ['required', 'numeric', 'min:0'],
            'labor_actual' => ['required', 'numeric', 'min:0'],
            'cpn_units_actual' => ['required', 'integer', 'min:0'],
            'non_cpn_units_actual' => ['required', 'integer', 'min:0'],
        ]);

        $report = DailyReport::updateOrCreate(
            [
                'branch_id' => $user->branch_id,
                'date' => $validated['date'],
            ],
            [
            'installment_units_actual' => $validated['installment_units_actual'],
            'total_units_actual' => $validated['total_units_actual'],
            'parts_sales_actual' => $validated['parts_sales_actual'],
            'labor_actual' => $validated['labor_actual'],
            'cpn_units_actual' => $validated['cpn_units_actual'],
            'non_cpn_units_actual' => $validated['non_cpn_units_actual'],
            ],
        );

        $wasCreated = $report->wasRecentlyCreated;

        return response()->json([
            'message' => $wasCreated ? 'Daily report submitted successfully.' : 'Daily report updated successfully.',
            'data' => $report,
        ], $wasCreated ? 201 : 200);
    }

    public function monthlyReport(int $branch, string $month): JsonResponse
    {
        try {
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        } catch (\Exception) {
            return response()->json([
                'message' => 'Invalid month format. Use YYYY-MM.',
            ], 422);
        }

        $end = $start->copy()->endOfMonth();

        $reports = DailyReport::query()
            ->where('branch_id', $branch)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('date')
            ->get();

        return response()->json([
            'branch_id' => $branch,
            'month' => $month,
            'summary' => [
                'installment_units_actual' => (int) $reports->sum('installment_units_actual'),
                'total_units_actual' => (int) $reports->sum('total_units_actual'),
                'parts_sales_actual' => (float) $reports->sum('parts_sales_actual'),
                'labor_actual' => (float) $reports->sum('labor_actual'),
                'cpn_units_actual' => (int) $reports->sum('cpn_units_actual'),
                'non_cpn_units_actual' => (int) $reports->sum('non_cpn_units_actual'),
            ],
            'data' => $reports,
        ]);
    }
}
