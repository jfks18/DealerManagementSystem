import axios from 'axios';

const TOKEN_KEY = 'bms_token';

export function getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
}

function clearStoredSessionContext(): void {
    sessionStorage.removeItem('bms_role');
    sessionStorage.removeItem('bms_branch_id');
}

const api = axios.create({
    baseURL: '/',
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

// Attach Sanctum token on every request
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// On 401 clear stale token so UI can redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearToken();
            clearStoredSessionContext();

            if (typeof window !== 'undefined' && window.location.hash !== '#/login') {
                window.location.hash = '/login';
            }
        }
        return Promise.reject(error);
    },
);

export default api;
