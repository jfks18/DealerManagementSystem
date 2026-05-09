import api, { clearToken, setToken } from './api';

export type Role = 'area_manager' | 'branch_manager';

export type AuthUser = {
    id: number;
    name: string;
    email: string;
    role: Role;
    branch_id: number | null;
};

export type LoginResponse = {
    message: string;
    token: string;
    user: AuthUser;
};

export type RegisterBranchManagerPayload = {
    name: string;
    email: string;
    password: string;
    branch_id: number;
};

export type RegisterAreaManagerPayload = {
    name: string;
    email: string;
    password: string;
};

const authService = {
    async login(email: string, password: string): Promise<LoginResponse> {
        const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password });
        setToken(data.token);
        return data;
    },

    async logout(): Promise<void> {
        try {
            await api.post('/api/auth/logout');
        } finally {
            clearToken();
        }
    },

    async registerBranchManager(payload: RegisterBranchManagerPayload): Promise<LoginResponse> {
        const { data } = await api.post<LoginResponse>('/api/auth/register-branch-manager', payload);
        setToken(data.token);
        return data;
    },

    async registerAreaManager(payload: RegisterAreaManagerPayload): Promise<LoginResponse> {
        const { data } = await api.post<LoginResponse>('/api/auth/register-area-manager', payload);
        setToken(data.token);
        return data;
    },
};

export default authService;
