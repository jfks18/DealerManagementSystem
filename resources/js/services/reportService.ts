import api from './api';

export type DailyReport = {
    id: number;
    branch_id: number;
    date: string;
    installment_units_actual: number;
    total_units_actual: number;
    parts_sales_actual: number;
    labor_actual: number;
    cpn_units_actual: number;
    non_cpn_units_actual: number;
    created_at: string;
    updated_at: string;
};

export type CreateDailyReportPayload = {
    date: string;
    installment_units_actual: number;
    total_units_actual: number;
    parts_sales_actual: number;
    labor_actual: number;
    cpn_units_actual: number;
    non_cpn_units_actual: number;
};

export type MonthlyReportSummary = {
    branch_id: number;
    month: string;
    summary: {
        installment_units_actual: number;
        total_units_actual: number;
        parts_sales_actual: number;
        labor_actual: number;
        cpn_units_actual: number;
        non_cpn_units_actual: number;
    };
    data: DailyReport[];
};

export type MonthlyBranchesReportFilters = {
    year: number;
    month?: number;
    branch_id?: number;
};

export type MonthlyBranchesReportRow = {
    branch_id: number;
    branch_name: string | null;
    month: string;
    installment_units_actual: number;
    total_units_actual: number;
    parts_sales_actual: number;
    labor_actual: number;
    cpn_units_actual: number;
    non_cpn_units_actual: number;
    installment_units_quota: number;
    total_units_quota: number;
    parts_sales_quota: number;
    labor_quota: number;
    cpn_quota: number;
    non_cpn_quota: number;
    progress: {
        total_units_percent: number;
        parts_sales_percent: number;
        labor_percent: number;
    };
};

export type MonthlyBranchesReportResponse = {
    filters: {
        year: number;
        month: number | null;
        branch_id: number | null;
    };
    overall: {
        installment_units_actual: number;
        total_units_actual: number;
        parts_sales_actual: number;
        labor_actual: number;
        cpn_units_actual: number;
        non_cpn_units_actual: number;
        installment_units_quota: number;
        total_units_quota: number;
        parts_sales_quota: number;
        labor_quota: number;
        cpn_quota: number;
        non_cpn_quota: number;
    };
    data: MonthlyBranchesReportRow[];
};

/**
 * Compute cash units actual (never stored on server).
 * cash = total - installment
 */
export function cashUnitsActual(report: Pick<DailyReport, 'total_units_actual' | 'installment_units_actual'>): number {
    return report.total_units_actual - report.installment_units_actual;
}

const reportService = {
    /**
     * POST /api/daily-report (auth:sanctum — branch manager only)
     * Submit a daily report for the authenticated user's assigned branch.
     * branch_id is resolved server-side from the authenticated user.
     */
    async submitDailyReport(payload: CreateDailyReportPayload): Promise<DailyReport> {
        const { data } = await api.post<{ message: string; data: DailyReport }>('/api/daily-report', payload);
        return data.data;
    },

    /**
     * GET /api/monthly-report/{branch}/{month}
     * Retrieve aggregated daily data for a branch and month.
     */
    async getMonthlyReport(branchId: number, month: string): Promise<MonthlyReportSummary> {
        const { data } = await api.get<MonthlyReportSummary>(`/api/monthly-report/${branchId}/${month}`);
        return data;
    },

    /**
     * GET /api/reports/branches?year=YYYY&month=MM&branch_id=ID
     * Returns branch-based month/year reports and an overall summary.
     */
    async getMonthlyBranchesReport(filters: MonthlyBranchesReportFilters): Promise<MonthlyBranchesReportResponse> {
        const { data } = await api.get<MonthlyBranchesReportResponse>('/api/reports/branches', { params: filters });
        return data;
    },
};

export default reportService;
