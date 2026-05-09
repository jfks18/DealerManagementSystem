import api from './api';

export type Branch = {
    id: number;
    name: string;
    area_manager_id: number;
    created_at: string;
    updated_at: string;
};

export type BranchOption = {
    id: number;
    name: string;
    branch_head_name?: string | null;
    branch_head_email?: string | null;
    account_status?: 'active' | 'missing';
};

export type CreateBranchPayload = {
    branch_name: string;
    branch_head_name: string;
    branch_head_email: string;
};

export type CreateBranchResponse = {
    message: string;
    data: {
        branch: {
            id: number;
            name: string;
            area_manager_id: number;
            created_at: string;
            updated_at: string;
        };
        branch_head: {
            id: number;
            name: string;
            email: string;
            role: string;
            branch_id: number;
        };
    };
};

export type BranchDashboard = {
    branch_id: number;
    branch_name?: string;
    month: string;
    quota: BranchQuotaMetrics;
    actual: BranchActualMetrics;
    progress: Record<string, number>;
    submission_status: BranchSubmissionStatus;
};

export type AreaDashboardResponse = {
    month: string;
    data: BranchDashboard[];
    overall: BranchActualMetrics;
    submission_summary: AreaSubmissionSummary;
};

export type BranchSubmissionStatus = {
    date: string;
    submitted_today: boolean;
    status: 'submitted' | 'pending';
    last_submitted_date: string | null;
    has_missing_days: boolean;
    missing_days_count: number;
    latest_missing_date: string | null;
    missing_dates: string[];
};

export type AreaSubmissionSummary = {
    date: string;
    total_branches: number;
    submitted_today: number;
    pending_today: number;
    branches_with_missing_entries: number;
};

export type BranchQuotaMetrics = {
    installment_units_quota: number;
    total_units_quota: number;
    parts_sales_quota: number;
    labor_quota: number;
    cpn_quota: number;
    non_cpn_quota: number;
    cash_units_quota: number;
};

export type BranchActualMetrics = {
    installment_units_actual: number;
    total_units_actual: number;
    parts_sales_actual: number;
    labor_actual: number;
    cpn_units_actual: number;
    non_cpn_units_actual: number;
};

export type BranchHistoryEntry = {
    month: string;
    total_units_actual: number;
    installment_units_actual: number;
    parts_sales_actual: number;
    labor_actual: number;
    cpn_units_actual: number;
    non_cpn_units_actual: number;
};

const branchService = {
    /**
     * GET /api/dashboard/{month}
     * Area manager overview for all branches in a given month.
     */
    async getDashboard(month: string): Promise<AreaDashboardResponse> {
        const { data } = await api.get<AreaDashboardResponse>(`/api/dashboard/${month}`);
        return data;
    },

    /**
     * GET /api/branch-detail/{branch}/{month}
     * Full quota + actual metrics for one branch in a given month.
     */
    async getBranchDetail(branchId: number, month: string): Promise<BranchDashboard> {
        const { data } = await api.get<BranchDashboard>(`/api/branch-detail/${branchId}/${month}`);
        return data;
    },

    /**
     * GET /api/branch-history/{branch}
     * All past monthly summaries for a branch.
     */
    async getBranchHistory(branchId: number): Promise<BranchHistoryEntry[]> {
        const { data } = await api.get<BranchHistoryEntry[]>(`/api/branch-history/${branchId}`);
        return data;
    },

    /**
     * GET /api/branches
     * Retrieve all branches for selectors and forms.
     */
    async getBranches(): Promise<BranchOption[]> {
        const { data } = await api.get<BranchOption[]>('/api/branches');
        return data;
    },

    /**
     * POST /api/branches
     * Create a branch and its branch head user.
     */
    async createBranch(payload: CreateBranchPayload): Promise<CreateBranchResponse> {
        const { data } = await api.post<CreateBranchResponse>('/api/branches', payload);
        return data;
    },
};

export default branchService;
