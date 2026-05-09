<?php

namespace App\Http\Controllers\Api;

use App\Models\Quota;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuotaController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (! $user->isAreaManager()) {
            return response()->json([
                'message' => 'Only area managers can manage quotas.',
            ], 403);
        }

        $validated = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'month' => ['required', 'date_format:Y-m'],
            'installment_units_quota' => ['required', 'integer', 'min:0'],
            'total_units_quota' => ['required', 'integer', 'min:0'],
            'parts_sales_quota' => ['required', 'numeric', 'min:0'],
            'labor_quota' => ['required', 'numeric', 'min:0'],
            'cpn_quota' => ['required', 'integer', 'min:0'],
            'non_cpn_quota' => ['required', 'integer', 'min:0'],
        ]);

        if ((int) $validated['installment_units_quota'] > (int) $validated['total_units_quota']) {
            return response()->json([
                'message' => 'Installment quota cannot exceed total units quota.',
            ], 422);
        }

        $quota = Quota::updateOrCreate(
            [
                'branch_id' => $validated['branch_id'],
                'month' => $validated['month'],
            ],
            [
                'installment_units_quota' => $validated['installment_units_quota'],
                'total_units_quota' => $validated['total_units_quota'],
                'parts_sales_quota' => $validated['parts_sales_quota'],
                'labor_quota' => $validated['labor_quota'],
                'cpn_quota' => $validated['cpn_quota'],
                'non_cpn_quota' => $validated['non_cpn_quota'],
            ],
        );

        return response()->json([
            'message' => 'Quota saved successfully.',
            'data' => $quota,
        ], 200);
    }

    public function showByBranchMonth(int $branch, string $month): JsonResponse
    {
        if (! preg_match('/^\d{4}-\d{2}$/', $month)) {
            return response()->json([
                'message' => 'Invalid month format. Use YYYY-MM.',
            ], 422);
        }

        $quota = Quota::query()
            ->where('branch_id', $branch)
            ->where('month', $month)
            ->first();

        if (! $quota) {
            return response()->json([
                'message' => 'Quota not found.',
            ], 404);
        }

        return response()->json($quota);
    }
}
