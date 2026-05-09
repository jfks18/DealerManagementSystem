import api from './api';

export type Quota = {
    id: number;
    branch_id: number;
    month: string;
    installment_units_quota: number;
    total_units_quota: number;
    parts_sales_quota: number;
    labor_quota: number;
    cpn_quota: number;
    non_cpn_quota: number;
    // cash_units_quota is NOT stored — compute on the client:
    // cash_units_quota = total_units_quota - installment_units_quota
    created_at: string;
    updated_at: string;
};

export type CreateQuotaPayload = {
    branch_id: number;
    month: string;
    installment_units_quota: number;
    total_units_quota: number;
    parts_sales_quota: number;
    labor_quota: number;
    cpn_quota: number;
    non_cpn_quota: number;
};

export function cashUnitsQuota(quota: Pick<Quota, 'total_units_quota' | 'installment_units_quota'>): number {
    return quota.total_units_quota - quota.installment_units_quota;
}

const quotaService = {
    /**
     * POST /api/quota
     * Create or update a monthly quota for a branch.
     */
    async createQuota(payload: CreateQuotaPayload): Promise<Quota> {
        const { data } = await api.post<{ message: string; data: Quota }>('/api/quota', payload);
        return data.data;
    },

    /**
     * GET /api/quota/{branch}/{month}
     * Retrieve a quota record for a branch and month.
     */
    async getQuota(branchId: number, month: string): Promise<Quota> {
        const { data } = await api.get<Quota>(`/api/quota/${branchId}/${month}`);
        return data;
    },
};

export default quotaService;
