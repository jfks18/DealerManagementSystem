<?php

namespace App\Http\Controllers\Api;

use App\Mail\BranchHeadAccountCreated;
use App\Models\Branch;
use App\Models\DailyReport;
use App\Http\Controllers\Controller;
use App\Models\Quota;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class AreaDashboardController extends Controller
{
    public function storeBranch(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (! $user->isAreaManager()) {
            return response()->json([
                'message' => 'Only area managers can add branches.',
            ], 403);
        }

        $validated = $request->validate([
            'branch_name' => ['required', 'string', 'max:255', 'unique:branches,name'],
            'branch_head_name' => ['required', 'string', 'max:255'],
            'branch_head_email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
        ]);

        $generatedPassword = Str::random(12);

        $result = DB::transaction(function () use ($validated, $user, $generatedPassword) {
            $branch = Branch::create([
                'name' => $validated['branch_name'],
                'area_manager_id' => $user->id,
            ]);

            $branchHead = User::create([
                'name' => $validated['branch_head_name'],
                'email' => $validated['branch_head_email'],
                'password' => Hash::make($generatedPassword),
                'role' => User::ROLE_BRANCH_MANAGER,
                'branch_id' => $branch->id,
            ]);

            return [
                'branch' => $branch,
                'branch_head' => $branchHead,
            ];
        });

        $emailSent = false;
        try {
            Mail::to($result['branch_head']->email)->send(
                new BranchHeadAccountCreated(
                    branchHead: $result['branch_head'],
                    branch: $result['branch'],
                    plainPassword: $generatedPassword,
                ),
            );
            $emailSent = true;
        } catch (Throwable $exception) {
            Log::error('Failed to send branch head credentials email.', [
                'email' => $result['branch_head']->email,
                'error' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'message' => $emailSent
                ? 'Branch and branch head created successfully. Credentials email sent.'
                : 'Branch and branch head created, but credentials email could not be sent.',
            'email_sent' => $emailSent,
            'data' => $result,
        ], 201);
    }

    public function branches(): JsonResponse
    {
        $branches = Branch::query()
            ->leftJoin('users as branch_heads', function ($join) {
                $join->on('branch_heads.branch_id', '=', 'branches.id')
                    ->where('branch_heads.role', '=', User::ROLE_BRANCH_MANAGER);
            })
            ->select([
                'branches.id',
                'branches.name',
                'branches.area_manager_id',
                'branches.created_at',
                'branches.updated_at',
                DB::raw('branch_heads.name as branch_head_name'),
                DB::raw('branch_heads.email as branch_head_email'),
                DB::raw("CASE WHEN branch_heads.id IS NULL THEN 'missing' ELSE 'active' END as account_status"),
            ])
            ->orderBy('branches.name')
            ->get();

        return response()->json($branches);
    }

    public function dashboard(string $month): JsonResponse
    {
        try {
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        } catch (\Exception) {
            return response()->json([
                'message' => 'Invalid month format. Use YYYY-MM.',
            ], 422);
        }

        $end = $start->copy()->endOfMonth();
        $todayDate = Carbon::today();
        $today = $todayDate->toDateString();

        $branches = Branch::query()->orderBy('name')->get();

        $rows = $branches->map(function (Branch $branch) use ($month, $start, $end, $todayDate, $today) {
            $quota = Quota::query()
                ->where('branch_id', $branch->id)
                ->where('month', $month)
                ->first();

            $actual = DailyReport::query()
                ->where('branch_id', $branch->id)
                ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
                ->selectRaw('SUM(installment_units_actual) as installment_units_actual')
                ->selectRaw('SUM(total_units_actual) as total_units_actual')
                ->selectRaw('SUM(parts_sales_actual) as parts_sales_actual')
                ->selectRaw('SUM(labor_actual) as labor_actual')
                ->selectRaw('SUM(cpn_units_actual) as cpn_units_actual')
                ->selectRaw('SUM(non_cpn_units_actual) as non_cpn_units_actual')
                ->first();

            $latestReportDate = DailyReport::query()
                ->where('branch_id', $branch->id)
                ->max('date');

            $submittedToday = DailyReport::query()
                ->where('branch_id', $branch->id)
                ->whereDate('date', $today)
                ->exists();

            $submittedDates = DailyReport::query()
                ->where('branch_id', $branch->id)
                ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
                ->pluck('date')
                ->map(fn ($date) => Carbon::parse((string) $date)->toDateString())
                ->unique()
                ->values()
                ->all();

            $submittedDatesLookup = array_flip($submittedDates);
            $isFutureMonth = $start->greaterThan($todayDate->copy()->startOfMonth());

            $missingDates = [];
            if (! $isFutureMonth) {
                $expectedEnd = $start->isSameMonth($todayDate)
                    ? $todayDate->copy()
                    : $end->copy();

                $cursor = $start->copy();
                while ($cursor->lessThanOrEqualTo($expectedEnd)) {
                    $date = $cursor->toDateString();
                    if (! isset($submittedDatesLookup[$date])) {
                        $missingDates[] = $date;
                    }

                    $cursor->addDay();
                }
            }

            $missingDaysCount = count($missingDates);
            $latestMissingDate = $missingDaysCount > 0 ? $missingDates[$missingDaysCount - 1] : null;

            $quotaData = [
                'installment_units_quota' => (int) ($quota->installment_units_quota ?? 0),
                'total_units_quota' => (int) ($quota->total_units_quota ?? 0),
                'parts_sales_quota' => (float) ($quota->parts_sales_quota ?? 0),
                'labor_quota' => (float) ($quota->labor_quota ?? 0),
                'cpn_quota' => (int) ($quota->cpn_quota ?? 0),
                'non_cpn_quota' => (int) ($quota->non_cpn_quota ?? 0),
            ];

            $quotaData['cash_units_quota'] = $quotaData['total_units_quota'] - $quotaData['installment_units_quota'];

            $actualData = [
                'installment_units_actual' => (int) ($actual->installment_units_actual ?? 0),
                'total_units_actual' => (int) ($actual->total_units_actual ?? 0),
                'parts_sales_actual' => (float) ($actual->parts_sales_actual ?? 0),
                'labor_actual' => (float) ($actual->labor_actual ?? 0),
                'cpn_units_actual' => (int) ($actual->cpn_units_actual ?? 0),
                'non_cpn_units_actual' => (int) ($actual->non_cpn_units_actual ?? 0),
            ];

            return [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'month' => $month,
                'quota' => $quotaData,
                'actual' => $actualData,
                'progress' => [
                    'installment_units_percent' => $this->percentage($actualData['installment_units_actual'], $quotaData['installment_units_quota']),
                    'total_units_percent' => $this->percentage($actualData['total_units_actual'], $quotaData['total_units_quota']),
                    'parts_sales_percent' => $this->percentage($actualData['parts_sales_actual'], $quotaData['parts_sales_quota']),
                    'labor_percent' => $this->percentage($actualData['labor_actual'], $quotaData['labor_quota']),
                    'cpn_percent' => $this->percentage($actualData['cpn_units_actual'], $quotaData['cpn_quota']),
                    'non_cpn_percent' => $this->percentage($actualData['non_cpn_units_actual'], $quotaData['non_cpn_quota']),
                ],
                'submission_status' => [
                    'date' => $today,
                    'submitted_today' => $submittedToday,
                    'status' => $submittedToday ? 'submitted' : 'pending',
                    'last_submitted_date' => $latestReportDate,
                    'has_missing_days' => $missingDaysCount > 0,
                    'missing_days_count' => $missingDaysCount,
                    'latest_missing_date' => $latestMissingDate,
                    'missing_dates' => $missingDates,
                ],
            ];
        })->values();

        $submittedTodayCount = $rows->filter(fn (array $row) => (bool) data_get($row, 'submission_status.submitted_today'))->count();
        $branchesWithMissingEntriesCount = $rows->filter(fn (array $row) => (bool) data_get($row, 'submission_status.has_missing_days'))->count();
        $totalBranches = $rows->count();

        return response()->json([
            'month' => $month,
            'data' => $rows,
            'overall' => [
                'installment_units_actual' => (int) $rows->sum('actual.installment_units_actual'),
                'total_units_actual' => (int) $rows->sum('actual.total_units_actual'),
                'parts_sales_actual' => (float) $rows->sum('actual.parts_sales_actual'),
                'labor_actual' => (float) $rows->sum('actual.labor_actual'),
                'cpn_units_actual' => (int) $rows->sum('actual.cpn_units_actual'),
                'non_cpn_units_actual' => (int) $rows->sum('actual.non_cpn_units_actual'),
            ],
            'submission_summary' => [
                'date' => $today,
                'total_branches' => $totalBranches,
                'submitted_today' => $submittedTodayCount,
                'pending_today' => $totalBranches - $submittedTodayCount,
                'branches_with_missing_entries' => $branchesWithMissingEntriesCount,
            ],
        ]);
    }

    public function branchDetail(int $branch, string $month): JsonResponse
    {
        try {
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        } catch (\Exception) {
            return response()->json([
                'message' => 'Invalid month format. Use YYYY-MM.',
            ], 422);
        }

        $branchModel = Branch::query()->find($branch);
        if (! $branchModel) {
            return response()->json([
                'message' => 'Branch not found.',
            ], 404);
        }

        $end = $start->copy()->endOfMonth();

        $quota = Quota::query()
            ->where('branch_id', $branch)
            ->where('month', $month)
            ->first();

        $actual = DailyReport::query()
            ->where('branch_id', $branch)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('SUM(installment_units_actual) as installment_units_actual')
            ->selectRaw('SUM(total_units_actual) as total_units_actual')
            ->selectRaw('SUM(parts_sales_actual) as parts_sales_actual')
            ->selectRaw('SUM(labor_actual) as labor_actual')
            ->selectRaw('SUM(cpn_units_actual) as cpn_units_actual')
            ->selectRaw('SUM(non_cpn_units_actual) as non_cpn_units_actual')
            ->first();

        return response()->json([
            'branch_id' => $branchModel->id,
            'branch_name' => $branchModel->name,
            'month' => $month,
            'quota' => [
                'installment_units_quota' => (int) ($quota->installment_units_quota ?? 0),
                'total_units_quota' => (int) ($quota->total_units_quota ?? 0),
                'parts_sales_quota' => (float) ($quota->parts_sales_quota ?? 0),
                'labor_quota' => (float) ($quota->labor_quota ?? 0),
                'cpn_quota' => (int) ($quota->cpn_quota ?? 0),
                'non_cpn_quota' => (int) ($quota->non_cpn_quota ?? 0),
                'cash_units_quota' => (int) (($quota->total_units_quota ?? 0) - ($quota->installment_units_quota ?? 0)),
            ],
            'actual' => [
                'installment_units_actual' => (int) ($actual->installment_units_actual ?? 0),
                'total_units_actual' => (int) ($actual->total_units_actual ?? 0),
                'parts_sales_actual' => (float) ($actual->parts_sales_actual ?? 0),
                'labor_actual' => (float) ($actual->labor_actual ?? 0),
                'cpn_units_actual' => (int) ($actual->cpn_units_actual ?? 0),
                'non_cpn_units_actual' => (int) ($actual->non_cpn_units_actual ?? 0),
            ],
        ]);
    }

    public function branchHistory(Request $request, int $branch): JsonResponse
    {
        $branchModel = Branch::query()->find($branch);
        if (! $branchModel) {
            return response()->json([
                'message' => 'Branch not found.',
            ], 404);
        }

        $request->validate([
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $query = DailyReport::query()->where('branch_id', $branch);
        if ($request->filled('year')) {
            $query->whereYear('date', (int) $request->integer('year'));
        }

        $reports = $query->orderBy('date')->get();

        $grouped = $reports
            ->groupBy(fn (DailyReport $report) => Carbon::parse($report->date)->format('Y-m'))
            ->map(function ($items, $month) {
                return [
                    'month' => $month,
                    'installment_units_actual' => (int) $items->sum('installment_units_actual'),
                    'total_units_actual' => (int) $items->sum('total_units_actual'),
                    'parts_sales_actual' => (float) $items->sum('parts_sales_actual'),
                    'labor_actual' => (float) $items->sum('labor_actual'),
                    'cpn_units_actual' => (int) $items->sum('cpn_units_actual'),
                    'non_cpn_units_actual' => (int) $items->sum('non_cpn_units_actual'),
                ];
            })
            ->values();

        return response()->json([
            'branch_id' => $branchModel->id,
            'branch_name' => $branchModel->name,
            'year' => $request->integer('year') ?: null,
            'data' => $grouped,
        ]);
    }

    /**
     * Branch-based monthly report with filter support.
     *
     * Query params:
     * - year: required, 4-digit year
     * - month: optional, 1-12 (if omitted returns all months in the year)
     * - branch_id: optional, specific branch filter
     */
    public function monthlyBranchReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
        ]);

        $start = Carbon::create((int) $validated['year'], (int) ($validated['month'] ?? 1), 1)->startOfMonth();
        $end = isset($validated['month'])
            ? $start->copy()->endOfMonth()
            : Carbon::create((int) $validated['year'], 12, 1)->endOfMonth();

        $query = DailyReport::query()
            ->with('branch:id,name')
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);

        if (isset($validated['branch_id'])) {
            $query->where('branch_id', (int) $validated['branch_id']);
        }

        $reports = $query->orderBy('date')->get();

        $quotaQuery = Quota::query()
            ->with('branch:id,name')
            ->whereBetween('month', [$start->format('Y-m'), $end->format('Y-m')]);

        if (isset($validated['branch_id'])) {
            $quotaQuery->where('branch_id', (int) $validated['branch_id']);
        }

        $quotas = $quotaQuery->get();

        $reportsByBranchMonth = $reports
            ->groupBy(function (DailyReport $report) {
                $month = Carbon::parse($report->date)->format('Y-m');
                return $report->branch_id.'|'.$month;
            })
            ->map(function ($items, $key) {
                [$branchId, $month] = explode('|', (string) $key);
                $first = $items->first();

                return [
                    'branch_id' => (int) $branchId,
                    'branch_name' => $first?->branch?->name,
                    'month' => $month,
                    'installment_units_actual' => (int) $items->sum('installment_units_actual'),
                    'total_units_actual' => (int) $items->sum('total_units_actual'),
                    'parts_sales_actual' => (float) $items->sum('parts_sales_actual'),
                    'labor_actual' => (float) $items->sum('labor_actual'),
                    'cpn_units_actual' => (int) $items->sum('cpn_units_actual'),
                    'non_cpn_units_actual' => (int) $items->sum('non_cpn_units_actual'),
                ];
            });

        $quotasByBranchMonth = $quotas
            ->keyBy(fn (Quota $quota) => $quota->branch_id.'|'.$quota->month)
            ->map(function (Quota $quota) {
                return [
                    'branch_id' => (int) $quota->branch_id,
                    'branch_name' => $quota->branch?->name,
                    'month' => (string) $quota->month,
                    'installment_units_quota' => (int) $quota->installment_units_quota,
                    'total_units_quota' => (int) $quota->total_units_quota,
                    'parts_sales_quota' => (float) $quota->parts_sales_quota,
                    'labor_quota' => (float) $quota->labor_quota,
                    'cpn_quota' => (int) $quota->cpn_quota,
                    'non_cpn_quota' => (int) $quota->non_cpn_quota,
                ];
            });

        $allKeys = collect(array_unique(array_merge(
            $reportsByBranchMonth->keys()->all(),
            $quotasByBranchMonth->keys()->all(),
        )));

        $byBranchMonth = $allKeys
            ->map(function (string $key) use ($reportsByBranchMonth, $quotasByBranchMonth) {
                [$branchIdRaw, $month] = explode('|', $key);
                $branchId = (int) $branchIdRaw;

                $actual = $reportsByBranchMonth->get($key, [
                    'branch_id' => $branchId,
                    'branch_name' => null,
                    'month' => $month,
                    'installment_units_actual' => 0,
                    'total_units_actual' => 0,
                    'parts_sales_actual' => 0,
                    'labor_actual' => 0,
                    'cpn_units_actual' => 0,
                    'non_cpn_units_actual' => 0,
                ]);

                $quota = $quotasByBranchMonth->get($key, [
                    'branch_id' => $branchId,
                    'branch_name' => null,
                    'month' => $month,
                    'installment_units_quota' => 0,
                    'total_units_quota' => 0,
                    'parts_sales_quota' => 0,
                    'labor_quota' => 0,
                    'cpn_quota' => 0,
                    'non_cpn_quota' => 0,
                ]);

                return [
                    'branch_id' => $branchId,
                    'branch_name' => $actual['branch_name'] ?? $quota['branch_name'],
                    'month' => $month,
                    'installment_units_actual' => (int) $actual['installment_units_actual'],
                    'total_units_actual' => (int) $actual['total_units_actual'],
                    'parts_sales_actual' => (float) $actual['parts_sales_actual'],
                    'labor_actual' => (float) $actual['labor_actual'],
                    'cpn_units_actual' => (int) $actual['cpn_units_actual'],
                    'non_cpn_units_actual' => (int) $actual['non_cpn_units_actual'],
                    'installment_units_quota' => (int) $quota['installment_units_quota'],
                    'total_units_quota' => (int) $quota['total_units_quota'],
                    'parts_sales_quota' => (float) $quota['parts_sales_quota'],
                    'labor_quota' => (float) $quota['labor_quota'],
                    'cpn_quota' => (int) $quota['cpn_quota'],
                    'non_cpn_quota' => (int) $quota['non_cpn_quota'],
                    'progress' => [
                        'total_units_percent' => $this->percentage((float) $actual['total_units_actual'], (float) $quota['total_units_quota']),
                        'parts_sales_percent' => $this->percentage((float) $actual['parts_sales_actual'], (float) $quota['parts_sales_quota']),
                        'labor_percent' => $this->percentage((float) $actual['labor_actual'], (float) $quota['labor_quota']),
                    ],
                ];
            })
            ->sortBy(['month', 'branch_id'])
            ->values();

        return response()->json([
            'filters' => [
                'year' => (int) $validated['year'],
                'month' => isset($validated['month']) ? (int) $validated['month'] : null,
                'branch_id' => isset($validated['branch_id']) ? (int) $validated['branch_id'] : null,
            ],
            'overall' => [
                'installment_units_actual' => (int) $reports->sum('installment_units_actual'),
                'total_units_actual' => (int) $reports->sum('total_units_actual'),
                'parts_sales_actual' => (float) $reports->sum('parts_sales_actual'),
                'labor_actual' => (float) $reports->sum('labor_actual'),
                'cpn_units_actual' => (int) $reports->sum('cpn_units_actual'),
                'non_cpn_units_actual' => (int) $reports->sum('non_cpn_units_actual'),
                'installment_units_quota' => (int) $quotas->sum('installment_units_quota'),
                'total_units_quota' => (int) $quotas->sum('total_units_quota'),
                'parts_sales_quota' => (float) $quotas->sum('parts_sales_quota'),
                'labor_quota' => (float) $quotas->sum('labor_quota'),
                'cpn_quota' => (int) $quotas->sum('cpn_quota'),
                'non_cpn_quota' => (int) $quotas->sum('non_cpn_quota'),
            ],
            'data' => $byBranchMonth,
        ]);
    }

    private function percentage(float|int $actual, float|int $quota): float
    {
        if ((float) $quota <= 0.0) {
            return 0.0;
        }

        return round(((float) $actual / (float) $quota) * 100, 2);
    }
}
