<?php

use App\Http\Controllers\Api\AreaDashboardController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DailyReportController;
use App\Http\Controllers\Api\QuotaController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register-branch-manager', [AuthController::class, 'registerBranchManager']);
Route::post('/auth/register-area-manager', [AuthController::class, 'registerAreaManager']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->post('/auth/logout', [AuthController::class, 'logout']);

Route::middleware('auth:sanctum')->post('/quota', [QuotaController::class, 'store']);
Route::middleware('auth:sanctum')->get('/quota/{branch}/{month}', [QuotaController::class, 'showByBranchMonth'])
    ->where('month', '^[0-9]{4}-[0-9]{2}$');

Route::middleware('auth:sanctum')->post('/daily-report', [DailyReportController::class, 'store']);
Route::get('/monthly-report/{branch}/{month}', [DailyReportController::class, 'monthlyReport'])
    ->where('month', '^[0-9]{4}-[0-9]{2}$');

Route::get('/dashboard/{month}', [AreaDashboardController::class, 'dashboard'])
    ->where('month', '^[0-9]{4}-[0-9]{2}$');
Route::get('/branch-detail/{branch}/{month}', [AreaDashboardController::class, 'branchDetail'])
    ->where('month', '^[0-9]{4}-[0-9]{2}$');
Route::get('/branch-history/{branch}', [AreaDashboardController::class, 'branchHistory']);

Route::middleware('auth:sanctum')->get('/reports/branches', [AreaDashboardController::class, 'monthlyBranchReport']);
Route::middleware('auth:sanctum')->post('/branches', [AreaDashboardController::class, 'storeBranch']);
Route::middleware('auth:sanctum')->get('/branches', [AreaDashboardController::class, 'branches']);
