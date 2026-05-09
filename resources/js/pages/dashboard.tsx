import { Head } from '@inertiajs/react';
import api, { clearToken, getToken, setToken } from '@/services/api';
import branchService, {
    type BranchDashboard,
    type BranchActualMetrics,
    type BranchQuotaMetrics,
    type BranchOption,
    type BranchHistoryEntry,
    type AreaSubmissionSummary,
} from '@/services/branchService';
import quotaService, { type Quota } from '@/services/quotaService';
import reportService, { type MonthlyBranchesReportRow, type MonthlyReportSummary, type DailyReport as ApiDailyReport } from '@/services/reportService';
import {
    Activity,
    Bike,
    Building2,
    Calendar,
    ChartNoAxesCombined,
    ClipboardList,
    Gauge,
    History,
    LayoutDashboard,
    LogOut,
    Target,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { HashRouter, Navigate, NavLink, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom';

type Role = 'area_manager' | 'branch_manager';

const ROLE_STORAGE_KEY = 'bms_role';
const BRANCH_ID_STORAGE_KEY = 'bms_branch_id';

type DashboardProps = {
    auth?: {
        user?: {
            role?: Role;
            branch_id?: number | null;
        };
    };
};

export default function Dashboard(props: DashboardProps) {
    const roleFromServer = props.auth?.user?.role;
    const branchIdFromServer = props.auth?.user?.branch_id ?? null;
    const token = getToken();
    const storedRole = getStoredRole();
    const storedBranchId = getStoredBranchId();

    const defaultRole: Role = token
        ? (storedRole ?? roleFromServer ?? 'area_manager')
        : (roleFromServer ?? 'area_manager');
    const defaultBranchId = token
        ? (storedBranchId ?? branchIdFromServer ?? 1)
        : (branchIdFromServer ?? 1);

    return (
        <>
            <Head title="Motorcycle Branch Management" />
            <HashRouter>
                <AppRouter defaultRole={defaultRole} defaultBranchId={defaultBranchId} />
            </HashRouter>
        </>
    );
}

function AppRouter({ defaultRole, defaultBranchId }: { defaultRole: Role; defaultBranchId: number }) {
    const [role, setRole] = useState<Role>(defaultRole);
    const [branchId, setBranchId] = useState<number>(defaultBranchId);

    return (
        <div className="min-h-screen bg-[#F1F5F9] text-gray-800">
            <Routes>
                <Route
                    path="/login"
                    element={<LoginPage onLogin={(nextRole, nextBranchId) => {
                        setRole(nextRole);
                        setBranchId(nextBranchId);
                    }} />}
                />

                <Route
                    path="/area/*"
                    element={
                        role === 'area_manager' ? (
                            <AreaManagerLayout />
                        ) : (
                            <Navigate to="/branch" replace />
                        )
                    }
                >
                    <Route index element={<AreaDashboardPage />} />
                    <Route path="branches" element={<BranchesPage />} />
                    <Route path="quotas" element={<QuotasPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="history" element={<HistoryPage />} />
                    <Route path="branches/:branchId" element={<BranchDetailPage />} />
                </Route>

                <Route
                    path="/branch/*"
                    element={
                        role === 'branch_manager' ? (
                            <BranchManagerLayout />
                        ) : (
                            <Navigate to="/area" replace />
                        )
                    }
                >
                    <Route index element={<BranchManagerDashboardPage branchId={branchId} />} />
                    <Route path="daily-entry" element={<DailyEntryPage branchId={branchId} />} />
                    <Route path="my-reports" element={<MyReportsPage branchId={branchId} />} />
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </div>
    );
}

function LoginPage({ onLogin }: { onLogin: (role: Role, branchId: number) => void }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setPending(true);
        setError('');

        try {
            const response = await api.post('/api/auth/login', form);
            const token = response.data?.token;
            const userRole: Role = response.data?.user?.role ?? 'branch_manager';
            const userBranchId = Number(response.data?.user?.branch_id ?? 1);

            if (token) {
                setToken(token);
            }

            if (typeof window !== 'undefined') {
                sessionStorage.setItem(ROLE_STORAGE_KEY, userRole);
                sessionStorage.setItem(BRANCH_ID_STORAGE_KEY, String(Number.isFinite(userBranchId) ? userBranchId : 1));
            }

            onLogin(userRole, Number.isFinite(userBranchId) ? userBranchId : 1);
            navigate(userRole === 'area_manager' ? '/area' : '/branch');
        } catch {
            setError('Login failed. Check email and password.');
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#F1F5F9]">
            {/* Left brand panel */}
            <div className="hidden w-1/2 flex-col justify-between bg-[#1C2434] p-12 lg:flex">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3C50E0]">
                        <Bike className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-lg font-bold text-white">BranchMS</span>
                </div>
                <div>
                    <h1 className="text-4xl font-bold leading-tight text-white">
                        Motorcycle Branch<br />Management System
                    </h1>
                    <p className="mt-4 text-base text-gray-400">
                        Manage quotas, daily sales, and branch performance from one central dashboard.
                    </p>
                    <div className="mt-8 grid gap-3">
                        <div className="flex items-start gap-3 rounded-sm border border-white/10 bg-white/5 p-4">
                            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#3C50E0]" />
                            <div>
                                <p className="text-sm font-semibold text-white">Area Manager</p>
                                <p className="text-sm text-gray-400">Create branches, set quotas, view area-wide reports.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-sm border border-white/10 bg-white/5 p-4">
                            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                            <div>
                                <p className="text-sm font-semibold text-white">Branch Manager</p>
                                <p className="text-sm text-gray-400">Submit daily entries, track quotas, export reports.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-gray-500">© 2026 Branch Management System</p>
            </div>

            {/* Right login form */}
            <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-md">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
                        <p className="mt-1 text-sm text-gray-500">Enter your credentials to access your account.</p>
                    </div>

                    <div className="rounded-sm border border-gray-200 bg-white p-8 shadow-sm">
                        <form onSubmit={submit} className="space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Email Address</label>
                                <input
                                    type="email"
                                    className="w-full rounded-sm border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 transition focus:border-[#3C50E0] focus:outline-none focus:ring-1 focus:ring-[#3C50E0]"
                                    placeholder="your@email.com"
                                    value={form.email}
                                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
                                <input
                                    type="password"
                                    className="w-full rounded-sm border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 transition focus:border-[#3C50E0] focus:outline-none focus:ring-1 focus:ring-[#3C50E0]"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                                    required
                                />
                            </div>

                            {error && (
                                <p className="rounded-sm border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={pending}
                                className="w-full rounded-sm bg-[#3C50E0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {pending ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AreaManagerLayout() {
    return (
        <div className="flex min-h-screen bg-[#F1F5F9]">
            <Sidebar
                title="Area Manager"
                items={[
                    { to: '/area', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
                    { to: '/area/branches', label: 'Branches', icon: <Building2 className="h-4 w-4" /> },
                    { to: '/area/quotas', label: 'Quotas', icon: <Target className="h-4 w-4" /> },
                    { to: '/area/reports', label: 'Reports', icon: <ClipboardList className="h-4 w-4" /> },
                    { to: '/area/history', label: 'History', icon: <History className="h-4 w-4" /> },
                ]}
            />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="mx-auto max-w-7xl">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

function BranchManagerLayout() {
    return (
        <div className="flex min-h-screen bg-[#F1F5F9]">
            <Sidebar
                title="Branch Manager"
                items={[
                    { to: '/branch', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
                    { to: '/branch/daily-entry', label: 'Daily Entry', icon: <Calendar className="h-4 w-4" /> },
                    { to: '/branch/my-reports', label: 'My Reports', icon: <ClipboardList className="h-4 w-4" /> },
                ]}
            />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="mx-auto max-w-7xl">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

function Sidebar({
    title,
    items,
}: {
    title: string;
    items: { to: string; label: string; icon: React.ReactNode }[];
}) {
    const navigate = useNavigate();

    return (
        <aside className="sticky top-0 flex h-screen w-64 flex-col bg-[#1C2434] text-white">
            {/* Logo / Brand */}
            <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3C50E0]">
                    <Bike className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-bold tracking-wide text-white">{title}</span>
            </div>
            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-5">
                <p className="mb-3 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-gray-400">MENU</p>
                <div className="space-y-1">
                    {items.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to.endsWith('/area') || item.to.endsWith('/branch')}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-sm px-4 py-2.5 text-sm font-medium transition ${
                                    isActive
                                        ? 'bg-[#3C50E0] text-white'
                                        : 'text-[#DEE4EE] hover:bg-white/5 hover:text-white'
                                }`
                            }
                        >
                            {item.icon}
                            {item.label}
                        </NavLink>
                    ))}
                </div>
            </nav>
            {/* Logout */}
            <div className="border-t border-white/10 px-4 py-4">
                <button
                    type="button"
                    onClick={async () => {
                        try {
                            await api.post('/api/auth/logout');
                        } catch {
                            // Keep UI responsive even if API logout fails.
                        }
                        clearToken();
                        if (typeof window !== 'undefined') {
                            sessionStorage.removeItem(ROLE_STORAGE_KEY);
                            sessionStorage.removeItem(BRANCH_ID_STORAGE_KEY);
                        }
                        navigate('/login');
                    }}
                    className="flex w-full items-center gap-3 rounded-sm px-4 py-2.5 text-sm font-medium text-[#DEE4EE] transition hover:bg-red-500/10 hover:text-red-300"
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </button>
            </div>
        </aside>
    );
}

function AreaDashboardPage() {
    const currentMonth = useMemo(() => {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${now.getFullYear()}-${month}`;
    }, []);
    const [rows, setRows] = useState<BranchDashboard[]>([]);
    const [overall, setOverall] = useState<BranchActualMetrics>({
        installment_units_actual: 0,
        total_units_actual: 0,
        parts_sales_actual: 0,
        labor_actual: 0,
        cpn_units_actual: 0,
        non_cpn_units_actual: 0,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [submissionSummary, setSubmissionSummary] = useState<AreaSubmissionSummary>({
        date: getTodayDateString(),
        total_branches: 0,
        submitted_today: 0,
        pending_today: 0,
        branches_with_missing_entries: 0,
    });

    useEffect(() => {
        const fetchCurrentMonthDashboard = async () => {
            setLoading(true);
            setError('');

            try {
                const response = await branchService.getDashboard(currentMonth);
                setRows(response.data ?? []);
                setOverall(response.overall ?? {
                    installment_units_actual: 0,
                    total_units_actual: 0,
                    parts_sales_actual: 0,
                    labor_actual: 0,
                    cpn_units_actual: 0,
                    non_cpn_units_actual: 0,
                });
                setSubmissionSummary(response.submission_summary ?? {
                    date: getTodayDateString(),
                    total_branches: response.data?.length ?? 0,
                    submitted_today: 0,
                    pending_today: response.data?.length ?? 0,
                    branches_with_missing_entries: 0,
                });
            } catch {
                setRows([]);
                setOverall({
                    installment_units_actual: 0,
                    total_units_actual: 0,
                    parts_sales_actual: 0,
                    labor_actual: 0,
                    cpn_units_actual: 0,
                    non_cpn_units_actual: 0,
                });
                setSubmissionSummary({
                    date: getTodayDateString(),
                    total_branches: 0,
                    submitted_today: 0,
                    pending_today: 0,
                    branches_with_missing_entries: 0,
                });
                setError('Failed to load current month dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        void fetchCurrentMonthDashboard();
    }, [currentMonth]);

    const current = useMemo(
        () => ({
            month: currentMonth,
            totalUnits: overall.total_units_actual,
            installmentSales: overall.installment_units_actual,
            cashSales: overall.total_units_actual - overall.installment_units_actual,
            partsSales: overall.parts_sales_actual,
            laborCharges: overall.labor_actual,
            cpn: overall.cpn_units_actual,
            nonCpn: overall.non_cpn_units_actual,
        }),
        [overall, currentMonth],
    );

    const monthly = useMemo(() => [current], [current]);

    const branchPerformance = useMemo(
        () =>
            rows.map((item) => ({
                name: item.branch_name ?? `Branch #${item.branch_id}`,
                units: item.actual.total_units_actual,
            })),
        [rows],
    );

    const dashboardBranchRows = useMemo(
        () =>
            rows.map((item) => ({
                branchId: item.branch_id,
                branchName: item.branch_name ?? `Branch #${item.branch_id}`,
                units: item.actual.total_units_actual,
                submittedToday: item.submission_status?.submitted_today ?? false,
                missingDaysCount: item.submission_status?.missing_days_count ?? 0,
                latestMissingDate: item.submission_status?.latest_missing_date ?? null,
                missingDates: item.submission_status?.missing_dates ?? [],
            })),
        [rows],
    );

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <h1 className="text-2xl font-bold md:text-3xl">Area Manager Dashboard ({currentMonth})</h1>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total Branches" value={String(rows.length)} icon={<Building2 className="h-5 w-5" />} />
                <MetricCard label="Submitted Today" value={String(submissionSummary.submitted_today)} icon={<ClipboardList className="h-5 w-5" />} />
                <MetricCard label="Pending Today" value={String(submissionSummary.pending_today)} icon={<History className="h-5 w-5" />} />
                <MetricCard label="With Missed Entries" value={String(submissionSummary.branches_with_missing_entries)} icon={<Calendar className="h-5 w-5" />} />
                <MetricCard label="Total Units Sold" value={String(current.totalUnits)} icon={<Gauge className="h-5 w-5" />} />
                <MetricCard label="Total Installment Sales" value={String(current.installmentSales)} icon={<Activity className="h-5 w-5" />} />
                <MetricCard label="Total Cash Sales" value={String(current.cashSales)} icon={<ChartNoAxesCombined className="h-5 w-5" />} />
                <MetricCard label="Total Parts Sales" value={formatCurrency(current.partsSales)} icon={<Target className="h-5 w-5" />} />
                <MetricCard label="Total Labor Charges" value={formatCurrency(current.laborCharges)} icon={<Calendar className="h-5 w-5" />} />
                <MetricCard label="Total CPN Serviced" value={String(current.cpn)} icon={<ClipboardList className="h-5 w-5" />} />
                <MetricCard label="Total Non-CPN Serviced" value={String(current.nonCpn)} icon={<History className="h-5 w-5" />} />
            </div>

            {loading && <p className="text-sm text-slate-600">Loading current month dashboard...</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-start justify-between">
                        <div>
                            <h2 className="font-semibold text-slate-900">Monthly Sales Snapshot</h2>
                            <p className="text-xs text-slate-500">Current month unit mix for area performance.</p>
                        </div>
                    </div>
                    <div className="h-64 md:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 6 }}>
                                <CartesianGrid strokeDasharray="4 6" stroke="#dbe4ef" vertical={false} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(value) => formatCompactNumber(Number(value))}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: 14, border: '1px solid #dbe4ef', boxShadow: '0 12px 34px -24px rgba(15,23,42,0.5)' }}
                                    labelStyle={{ color: '#0f172a', fontWeight: 700 }}
                                    formatter={(value) => [formatCompactNumber(Number(value ?? 0)), '']}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#334155' }} />
                                <Line
                                    name="Total Units"
                                    type="monotone"
                                    dataKey="totalUnits"
                                    stroke="#0ea5e9"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#0ea5e9' }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    name="Installment"
                                    type="monotone"
                                    dataKey="installmentSales"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#10b981' }}
                                />
                                <Line
                                    name="Cash"
                                    type="monotone"
                                    dataKey="cashSales"
                                    stroke="#334155"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#334155' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>
                <section className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-start justify-between">
                        <div>
                            <h2 className="font-semibold text-slate-900">Branch Performance</h2>
                            <p className="text-xs text-slate-500">Total units by branch for {currentMonth}.</p>
                        </div>
                    </div>
                    <div className="h-64 md:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={branchPerformance} margin={{ top: 8, right: 8, left: -16, bottom: 6 }}>
                                <CartesianGrid strokeDasharray="4 6" stroke="#dbe4ef" vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(value) => formatCompactNumber(Number(value))}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: 14, border: '1px solid #dbe4ef', boxShadow: '0 12px 34px -24px rgba(15,23,42,0.5)' }}
                                    labelStyle={{ color: '#0f172a', fontWeight: 700 }}
                                    formatter={(value) => [formatCompactNumber(Number(value ?? 0)), 'Units']}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#334155' }} />
                                <Bar name="Units" dataKey="units" fill="#0891b2" radius={[10, 10, 6, 6]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>

            <BranchesTable dashboardRows={dashboardBranchRows} />
        </div>
    );
}

function BranchesTable({ dashboardRows }: { dashboardRows?: { branchId: number; branchName: string; units: number; submittedToday?: boolean; missingDaysCount?: number; latestMissingDate?: string | null; missingDates?: string[] }[] }) {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'submitted'>('all');

    const rows = dashboardRows
        ? dashboardRows.map((item) => ({
              id: item.branchId,
              name: item.branchName,
              area: '-',
              manager: '-',
              units: item.units,
                            submittedToday: item.submittedToday ?? false,
                                                        missingDaysCount: item.missingDaysCount ?? 0,
                                                        latestMissingDate: item.latestMissingDate ?? null,
                                                        missingDates: item.missingDates ?? [],
          }))
        : [];

    const filteredRows = useMemo(() => {
        if (statusFilter === 'pending') {
            return rows.filter((branch) => !branch.submittedToday);
        }

        if (statusFilter === 'submitted') {
            return rows.filter((branch) => branch.submittedToday);
        }

        return rows;
    }, [rows, statusFilter]);

    const pendingCount = rows.filter((branch) => !branch.submittedToday).length;
    const submittedCount = rows.filter((branch) => branch.submittedToday).length;

    return (
        <section className="rounded-sm border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-gray-900">Branch List</h2>
                <div className="inline-flex rounded-sm border border-gray-200 bg-white p-1">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition ${statusFilter === 'all' ? 'bg-[#3C50E0] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        All ({rows.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('pending')}
                        className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition ${statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Pending ({pendingCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('submitted')}
                        className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition ${statusFilter === 'submitted' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Submitted ({submittedCount})
                    </button>
                </div>
            </div>
            <div className="grid gap-3 md:hidden">
                {filteredRows.map((branch) => {
                    const missingDates = branch.missingDates ?? [];

                    return (
                        <article key={branch.id} className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="font-semibold text-slate-900">{branch.name}</h3>
                                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-[#3C50E0]">{branch.units} units</span>
                            </div>
                            <p className="text-xs text-slate-500">Area: {branch.area}</p>
                            <p className="text-xs text-slate-500">Manager: {branch.manager}</p>
                            <p className="mt-1 text-xs">
                                <span className={`rounded-full px-2 py-0.5 font-semibold ${branch.submittedToday ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {branch.submittedToday ? 'Submitted today' : 'Pending today'}
                                </span>
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                                Missed days this month: <span className="font-semibold text-slate-900">{branch.missingDaysCount}</span>
                                {branch.latestMissingDate ? ` (latest: ${branch.latestMissingDate})` : ''}
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate(`/area/branches/${branch.id}`)}
                                className="mt-3 rounded-sm bg-[#3C50E0] px-3 py-1.5 text-xs font-semibold text-white"
                            >
                                View Detail
                            </button>
                        </article>
                    );
                })}
            </div>

            <div className="hidden overflow-x-auto rounded-sm border border-gray-200 bg-white md:block">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                            <th className="px-3 py-2.5">Branch</th>
                            <th className="px-3 py-2.5">Area</th>
                            <th className="px-3 py-2.5">Manager</th>
                            <th className="px-3 py-2.5">Total Units</th>
                            <th className="px-3 py-2.5">Today Status</th>
                            <th className="px-3 py-2.5">Missed Dates</th>
                            <th className="px-3 py-2.5">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.map((branch, index) => {
                            const missingDates = branch.missingDates ?? [];

                            return (
                                <Fragment key={branch.id}>
                                <tr className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}`}>
                                    <td className="px-3 py-2.5 font-semibold text-slate-900">{branch.name}</td>
                                    <td className="px-3 py-2.5 text-slate-700">{branch.area}</td>
                                    <td className="px-3 py-2.5 text-slate-700">{branch.manager}</td>
                                    <td className="px-3 py-2.5 font-semibold text-slate-900">{branch.units}</td>
                                    <td className="px-3 py-2.5">
                                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${branch.submittedToday ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {branch.submittedToday ? 'Submitted' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-semibold ${(branch.missingDaysCount ?? 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{branch.missingDaysCount ?? 0}</span>
                                            {branch.latestMissingDate ? <span className="text-xs">latest: {branch.latestMissingDate}</span> : null}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/area/branches/${branch.id}`)}
                                            className="rounded-sm bg-[#3C50E0] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2f42c6]"
                                        >
                                            View Detail
                                        </button>
                                    </td>
                                </tr>
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {filteredRows.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">No branches match the selected filter.</p>
            )}
        </section>
    );
}

function BranchDetailPage() {
    const params = useParams();
    const branchId = Number(params.branchId ?? 0) || 0;
    const [tab, setTab] = useState<'daily' | 'summary' | 'history'>('daily');
    const [detail, setDetail] = useState<BranchDashboard | null>(null);
    const [monthlyReport, setMonthlyReport] = useState<MonthlyReportSummary | null>(null);
    const [historyRows, setHistoryRows] = useState<BranchHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const currentMonth = useMemo(() => {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${now.getFullYear()}-${month}`;
    }, []);

    useEffect(() => {
        if (!branchId) {
            setError('Invalid branch id.');
            return;
        }

        const fetchBranchDetail = async () => {
            setLoading(true);
            setError('');

            try {
                const [detailData, reportData, historyData] = await Promise.all([
                    branchService.getBranchDetail(branchId, currentMonth),
                    reportService.getMonthlyReport(branchId, currentMonth),
                    branchService.getBranchHistory(branchId),
                ]);

                setDetail(detailData);
                setMonthlyReport(reportData);
                setHistoryRows(historyData);
            } catch {
                setDetail(null);
                setMonthlyReport(null);
                setHistoryRows([]);
                setError('Failed to load branch detail data.');
            } finally {
                setLoading(false);
            }
        };

        void fetchBranchDetail();
    }, [branchId, currentMonth]);

    const quotaUnits = detail?.quota.total_units_quota ?? 0;
    const actualUnits = detail?.actual.total_units_actual ?? 0;
    const progress = quotaUnits > 0 ? Math.round((actualUnits / quotaUnits) * 100) : 0;
    const branchName = detail?.branch_name ?? `Branch #${branchId}`;

    const summaryRows = monthlyReport
        ? [
              {
                  month: monthlyReport.month,
                  totalUnits: monthlyReport.summary.total_units_actual,
                  installmentUnits: monthlyReport.summary.installment_units_actual,
                  partsSales: monthlyReport.summary.parts_sales_actual,
                  laborCharges: monthlyReport.summary.labor_actual,
              },
          ]
        : [];

    return (
        <div className="mx-auto max-w-6xl space-y-5">
            <h1 className="text-2xl font-bold">{branchName} Detail ({currentMonth})</h1>
            {loading && <p className="text-sm text-slate-600">Loading detail...</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard label="Monthly Quota" value={`${quotaUnits} units`} />
                <SummaryCard label="Actual Performance" value={`${actualUnits} units`} />
                <SummaryCard label="Progress Percentage" value={`${progress}%`} />
            </div>

            <div className="flex gap-1 border-b border-gray-200 bg-white px-2">
                <TabButton active={tab === 'daily'} onClick={() => setTab('daily')} label="Daily Reports" />
                <TabButton active={tab === 'summary'} onClick={() => setTab('summary')} label="Monthly Summary" />
                <TabButton active={tab === 'history'} onClick={() => setTab('history')} label="History" />
            </div>

            {tab === 'daily' && (
                <BranchDailyReportsTable rows={monthlyReport?.data ?? []} />
            )}

            {tab === 'summary' && (
                <div className="overflow-x-auto rounded-sm border border-gray-200 bg-white p-3">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 text-gray-600">
                                <th className="p-2">Month</th>
                                <th className="p-2">Total Units</th>
                                <th className="p-2">Installment</th>
                                <th className="p-2">Cash</th>
                                <th className="p-2">Parts Sales</th>
                                <th className="p-2">Labor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summaryRows.map((item) => (
                                <tr key={item.month} className="border-b border-gray-100">
                                    <td className="p-2">{item.month}</td>
                                    <td className="p-2">{item.totalUnits}</td>
                                    <td className="p-2">{item.installmentUnits}</td>
                                    <td className="p-2">{item.totalUnits - item.installmentUnits}</td>
                                    <td className="p-2">{formatCurrency(item.partsSales)}</td>
                                    <td className="p-2">{formatCurrency(item.laborCharges)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'history' && (
                <div className="overflow-x-auto rounded-sm border border-gray-200 bg-white p-3">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 text-gray-600">
                                <th className="p-2">Month</th>
                                <th className="p-2">Total Units</th>
                                <th className="p-2">Installment</th>
                                <th className="p-2">Cash</th>
                                <th className="p-2">Parts Sales</th>
                                <th className="p-2">Labor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyRows.map((item) => (
                                <tr key={item.month} className="border-b border-gray-100">
                                    <td className="p-2">{item.month}</td>
                                    <td className="p-2">{item.total_units_actual}</td>
                                    <td className="p-2">{item.installment_units_actual}</td>
                                    <td className="p-2">{item.total_units_actual - item.installment_units_actual}</td>
                                    <td className="p-2">{formatCurrency(item.parts_sales_actual)}</td>
                                    <td className="p-2">{formatCurrency(item.labor_actual)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function BranchDailyReportsTable({ rows }: { rows: ApiDailyReport[] }) {
    return (
        <>
            <div className="grid gap-3 md:hidden">
                {rows.map((item) => (
                    <article key={item.id} className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">{item.date}</h3>
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-[#3C50E0]">{item.total_units_actual} units</span>
                        </div>
                        <p className="text-xs text-slate-600">Installment: {item.installment_units_actual}</p>
                        <p className="text-xs text-slate-600">Cash: {item.total_units_actual - item.installment_units_actual}</p>
                        <p className="text-xs text-slate-600">Parts: {formatCurrency(item.parts_sales_actual)}</p>
                        <p className="text-xs text-slate-600">Labor: {formatCurrency(item.labor_actual)}</p>
                    </article>
                ))}
            </div>

            <div className="hidden overflow-x-auto rounded-sm border border-gray-200 bg-white md:block">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Installment</th>
                        <th className="px-3 py-2.5">Total</th>
                        <th className="px-3 py-2.5">Cash</th>
                        <th className="px-3 py-2.5">Parts</th>
                        <th className="px-3 py-2.5">Labor</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((item, index) => (
                        <tr key={item.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}`}>
                            <td className="px-3 py-2.5">{item.date}</td>
                            <td className="px-3 py-2.5">{item.installment_units_actual}</td>
                            <td className="px-3 py-2.5">{item.total_units_actual}</td>
                            <td className="px-3 py-2.5">{item.total_units_actual - item.installment_units_actual}</td>
                            <td className="px-3 py-2.5">{formatCurrency(item.parts_sales_actual)}</td>
                            <td className="px-3 py-2.5">{formatCurrency(item.labor_actual)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </>
    );
}

function BranchManagerDashboardPage({ branchId }: { branchId: number }) {
    const today = useMemo(() => getTodayDateString(), []);
    const currentMonth = useMemo(() => today.slice(0, 7), [today]);
    const [branchName, setBranchName] = useState(`Branch #${branchId}`);
    const [todayStatus, setTodayStatus] = useState(false);
    const [quotaMonth, setQuotaMonth] = useState(currentMonth);
    const [monthlyQuota, setMonthlyQuota] = useState<BranchQuotaMetrics>({
        installment_units_quota: 0,
        total_units_quota: 0,
        parts_sales_quota: 0,
        labor_quota: 0,
        cpn_quota: 0,
        non_cpn_quota: 0,
        cash_units_quota: 0,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const quotaMonthLabel = useMemo(() => {
        const date = new Date(`${quotaMonth}-01T00:00:00`);
        if (Number.isNaN(date.getTime())) {
            return quotaMonth;
        }

        return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }, [quotaMonth]);

    useEffect(() => {
        if (!branchId) {
            setError('Invalid branch id.');
            return;
        }

        const fetchBranchDashboard = async () => {
            setLoading(true);
            setError('');

            try {
                const [detailData, monthlyData] = await Promise.all([
                    branchService.getBranchDetail(branchId, currentMonth),
                    reportService.getMonthlyReport(branchId, currentMonth),
                ]);

                setBranchName(detailData.branch_name ?? `Branch #${branchId}`);
                setMonthlyQuota(detailData.quota);
                setQuotaMonth(detailData.month ?? currentMonth);
                const submittedToday = (monthlyData.data ?? []).some((item) => item.date.slice(0, 10) === today);
                setTodayStatus(submittedToday);
            } catch {
                setBranchName(`Branch #${branchId}`);
                setTodayStatus(false);
                setMonthlyQuota({
                    installment_units_quota: 0,
                    total_units_quota: 0,
                    parts_sales_quota: 0,
                    labor_quota: 0,
                    cpn_quota: 0,
                    non_cpn_quota: 0,
                    cash_units_quota: 0,
                });
                setQuotaMonth(currentMonth);
                setError('Failed to load branch dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        void fetchBranchDashboard();
    }, [branchId, currentMonth, today]);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[0.7rem] font-semibold tracking-[0.18em] text-emerald-700">
                            BRANCH MANAGER
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Branch Manager Dashboard</h1>
                        <p className="mt-1 text-sm text-slate-600">Review your branch, quota progress, and submission status at a glance.</p>
                    </div>
                </div>
            </header>

            {loading && <p className="text-sm text-slate-600">Loading branch dashboard...</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Assigned Branch Info</h2>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{branchName}</p>
                    <p className="text-sm text-slate-600">Branch ID: {branchId}</p>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Today's Submission Status</h2>
                    <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${todayStatus ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>
                        {todayStatus ? 'Submitted' : 'Pending'}
                    </p>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Monthly Quota Set By Area Manager</h2>
                    <p className="mt-1 text-xs text-slate-500">{quotaMonthLabel}</p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Units</p>
                            <p className="mt-1 text-lg font-semibold text-slate-950">{monthlyQuota.total_units_quota}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Installment Units</p>
                            <p className="mt-1 text-lg font-semibold text-slate-950">{monthlyQuota.installment_units_quota}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cash Units</p>
                            <p className="mt-1 text-lg font-semibold text-slate-950">{monthlyQuota.cash_units_quota}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parts Sales</p>
                            <p className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(monthlyQuota.parts_sales_quota)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Labor</p>
                            <p className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(monthlyQuota.labor_quota)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CPN / Non-CPN</p>
                            <p className="mt-1 text-lg font-semibold text-slate-950">{monthlyQuota.cpn_quota} / {monthlyQuota.non_cpn_quota}</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

function DailyEntryPage({ branchId }: { branchId: number }) {
    const today = useMemo(() => getTodayDateString(), []);
    const [entryDate, setEntryDate] = useState(today);
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [enteredDates, setEnteredDates] = useState<string[]>([]);
    const [reportsByDate, setReportsByDate] = useState<Record<string, ApiDailyReport>>({});
    const [refreshKey, setRefreshKey] = useState(0);

    const [form, setForm] = useState({
        installmentUnits: 0,
        totalUnits: 0,
        partsSales: 0,
        laborCharges: 0,
        cpnServiced: 0,
        nonCpnServiced: 0,
    });

    const cashSales = form.totalUnits - form.installmentUnits;
    const selectedMonth = entryDate.slice(0, 7);
    const calendarYear = Number(selectedMonth.slice(0, 4));
    const calendarMonth = Number(selectedMonth.slice(5, 7));
    const daysInCalendarMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const firstWeekDay = new Date(calendarYear, calendarMonth - 1, 1).getDay();
    const enteredDatesSet = useMemo(() => new Set(enteredDates), [enteredDates]);
    const monthTitle = new Date(calendarYear, calendarMonth - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const todayMonth = today.slice(0, 7);
    const isCurrentMonth = selectedMonth === todayMonth;
    const isFutureMonth = selectedMonth > todayMonth;
    const maxTrackDay = isFutureMonth ? 0 : (isCurrentMonth ? Number(today.slice(8, 10)) : daysInCalendarMonth);
    const selectedReport = reportsByDate[entryDate];
    const isEditingExisting = Boolean(selectedReport);

    useEffect(() => {
        if (!selectedMonth || !branchId) {
            setEnteredDates([]);
            setReportsByDate({});
            return;
        }

        const fetchEnteredDates = async () => {
            try {
                const report = await reportService.getMonthlyReport(branchId, selectedMonth);
                const reportMap: Record<string, ApiDailyReport> = {};
                (report.data ?? []).forEach((item) => {
                    reportMap[item.date.slice(0, 10)] = item;
                });

                const submitted = new Set((report.data ?? []).map((item) => item.date.slice(0, 10)));
                setEnteredDates(Array.from(submitted));
                setReportsByDate(reportMap);
            } catch {
                setEnteredDates([]);
                setReportsByDate({});
            }
        };

        void fetchEnteredDates();
    }, [selectedMonth, branchId, refreshKey]);

    useEffect(() => {
        const report = reportsByDate[entryDate];
        if (!report) {
            setForm({
                installmentUnits: 0,
                totalUnits: 0,
                partsSales: 0,
                laborCharges: 0,
                cpnServiced: 0,
                nonCpnServiced: 0,
            });
            return;
        }

        setForm({
            installmentUnits: report.installment_units_actual,
            totalUnits: report.total_units_actual,
            partsSales: report.parts_sales_actual,
            laborCharges: report.labor_actual,
            cpnServiced: report.cpn_units_actual,
            nonCpnServiced: report.non_cpn_units_actual,
        });
    }, [entryDate, reportsByDate]);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setMessage(null);
        setPending(true);

        if (!entryDate) {
            setPending(false);
            setMessage({ type: 'error', text: 'Please select a report date.' });
            return;
        }

        if (isSundayDate(entryDate)) {
            setPending(false);
            setMessage({ type: 'error', text: 'Sunday entries are not allowed.' });
            return;
        }

        try {
            await api.post('/api/daily-report', {
                date: entryDate,
                installment_units_actual: form.installmentUnits,
                total_units_actual: form.totalUnits,
                parts_sales_actual: form.partsSales,
                labor_actual: form.laborCharges,
                cpn_units_actual: form.cpnServiced,
                non_cpn_units_actual: form.nonCpnServiced,
            });
            setMessage({
                type: 'success',
                text: isEditingExisting
                    ? `Daily report for ${entryDate} updated successfully.`
                    : `Daily report for ${entryDate} submitted successfully.`,
            });
            setRefreshKey((prev) => prev + 1);
        } catch (error: any) {
            const apiMessage = error?.response?.data?.message;
            setMessage({ type: 'error', text: apiMessage ?? 'Submission failed. Check API auth or validation.' });
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Daily Entry Form</h1>
                        <p className="mt-1 text-sm text-slate-600">Select the actual report date to submit missed-day entries professionally.</p>
                    </div>
                    <div className="text-right">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#3C50E0]">Branch #{branchId}</span>
                    </div>
                </div>

                <form onSubmit={submit} className="grid gap-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Report date</label>
                        <input
                            type="date"
                            value={entryDate}
                            max={today}
                            onChange={(event) => {
                                const nextDate = event.target.value;
                                if (!nextDate) {
                                    setEntryDate(nextDate);
                                    return;
                                }

                                if (isSundayDate(nextDate)) {
                                    setMessage({ type: 'error', text: 'Sunday entries are not allowed.' });
                                    return;
                                }

                                setMessage(null);
                                setEntryDate(nextDate);
                            }}
                    className="w-full rounded-sm border border-gray-300 bg-white px-4 py-2.5 text-sm transition focus:border-[#3C50E0] focus:outline-none focus:ring-1 focus:ring-[#3C50E0]"
                        />
                        <p className="mt-1 text-xs text-slate-500">You can submit previous dates if they were missed, except Sundays.</p>
                    </div>

                    {isEditingExisting && (
                        <p className="rounded-sm border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-[#3C50E0]">
                            Existing entry loaded for this date. Last update: {new Date(selectedReport.updated_at).toLocaleString('en-US')}
                        </p>
                    )}

                    <NumberField label="Installment units" value={form.installmentUnits} onChange={(value) => setForm((prev) => ({ ...prev, installmentUnits: value }))} />
                    <NumberField label="Total units sold" value={form.totalUnits} onChange={(value) => setForm((prev) => ({ ...prev, totalUnits: value }))} />
                    <NumberField label="Parts sales" value={form.partsSales} onChange={(value) => setForm((prev) => ({ ...prev, partsSales: value }))} />
                    <NumberField label="Labor charges" value={form.laborCharges} onChange={(value) => setForm((prev) => ({ ...prev, laborCharges: value }))} />
                    <NumberField label="CPM serviced" value={form.cpnServiced} onChange={(value) => setForm((prev) => ({ ...prev, cpnServiced: value }))} />
                    <NumberField label="Non-CPN serviced" value={form.nonCpnServiced} onChange={(value) => setForm((prev) => ({ ...prev, nonCpnServiced: value }))} />

                    <div className="rounded-sm border border-blue-200 bg-blue-50 p-3 text-sm text-[#3C50E0]">
                        Cash sales (auto): <strong>{cashSales}</strong>
                    </div>

                    <button
                        type="submit"
                        disabled={pending}
                        className="rounded-sm bg-[#3C50E0] px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-[#2f42c6] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {pending ? 'Saving...' : (isEditingExisting ? 'Update Report' : 'Submit Report')}
                    </button>

                    {message?.type === 'success' && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message.text}</p>}
                    {message?.type === 'error' && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{message.text}</p>}
                </form>
            </div>

            <section className="h-fit rounded-sm border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">{monthTitle}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Entered</span>
                        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Not entered</span>
                        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" />Sunday</span>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-slate-500">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, idx) => (
                        <span key={`${label}-${idx}`}>{label}</span>
                    ))}
                </div>

                <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                    {Array.from({ length: firstWeekDay }).map((_, idx) => (
                        <span key={`blank-${idx}`} className="h-9 rounded-md" />
                    ))}

                    {Array.from({ length: daysInCalendarMonth }, (_, idx) => {
                        const day = idx + 1;
                        const dayString = String(day).padStart(2, '0');
                        const date = `${selectedMonth}-${dayString}`;
                        const isSunday = isSundayDate(date);
                        const isSelected = entryDate === date;
                        const isTrackable = day <= maxTrackDay && !isSunday;
                        const isEntered = enteredDatesSet.has(date);

                        const colorClass = isSunday
                            ? 'border-slate-300 bg-slate-200 text-slate-500'
                            : !isTrackable
                            ? 'border-slate-200 bg-slate-100 text-slate-400'
                            : isEntered
                                ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                                : 'border-amber-300 bg-amber-100 text-amber-800';

                        return (
                            <button
                                key={date}
                                type="button"
                                onClick={() => isTrackable && setEntryDate(date)}
                                disabled={!isTrackable}
                                className={`h-9 rounded-sm border text-xs font-semibold transition ${colorClass} ${isSelected ? 'ring-2 ring-[#3C50E0] ring-offset-1' : ''} ${isTrackable ? 'hover:brightness-95' : 'cursor-not-allowed'}`}
                                title={isSunday ? 'No work on Sunday' : undefined}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

function MyReportsPage({ branchId }: { branchId: number }) {
    const [month, setMonth] = useState('5');
    const [year, setYear] = useState('2026');
    const [rows, setRows] = useState<ApiDailyReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');

    const monthKey = `${year}-${month.padStart(2, '0')}`;

    useEffect(() => {
        if (!branchId) {
            setError('Invalid branch id.');
            return;
        }

        const fetchMyReports = async () => {
            setLoading(true);
            setError('');

            try {
                const response = await reportService.getMonthlyReport(branchId, monthKey);
                setRows(response.data ?? []);
            } catch {
                setRows([]);
                setError('Failed to load reports data.');
            } finally {
                setLoading(false);
            }
        };

        void fetchMyReports();
    }, [branchId, monthKey]);

    const exportToExcel = async () => {
        if (rows.length === 0) {
            return;
        }

        setExporting(true);
        setError('');

        try {
            const XLSX = await import('xlsx');
            const exportRows = rows.map((item) => ({
                Date: item.date,
                Installment_Units: item.installment_units_actual,
                Total_Units: item.total_units_actual,
                Cash_Units: item.total_units_actual - item.installment_units_actual,
                Parts_Sales: Number(item.parts_sales_actual),
                Labor: Number(item.labor_actual),
                CPN_Units: item.cpn_units_actual,
                Non_CPN_Units: item.non_cpn_units_actual,
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'My Reports');
            XLSX.writeFile(workbook, `branch-${branchId}-reports-${monthKey}.xlsx`);
        } catch {
            setError('Failed to export Excel file. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="mx-auto max-w-5xl rounded-sm border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">My Reports</h1>
                <button
                    type="button"
                    onClick={() => void exportToExcel()}
                    disabled={rows.length === 0 || loading || exporting}
                    className="rounded-sm bg-[#3C50E0] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#2f42c6] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {exporting ? 'Exporting...' : 'Export to Excel'}
                </button>
            </div>
            <div className="mb-4 grid gap-3 md:grid-cols-2">
                <MonthSelector month={month} onChange={setMonth} />
                <YearSelector year={year} onChange={setYear} />
            </div>

            {loading && <p className="mb-3 text-sm text-slate-600">Loading reports...</p>}
            {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

            <BranchDailyReportsTable rows={rows} />
        </div>
    );
}

function BranchesPage() {
    const currentMonth = useMemo(() => {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${now.getFullYear()}-${month}`;
    }, []);

    const [rows, setRows] = useState<{ branchId: number; branchName: string; units: number }[]>([]);
    const [branchHeads, setBranchHeads] = useState<BranchOption[]>([]);
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [form, setForm] = useState({
        branch_name: '',
        branch_head_name: '',
        branch_head_email: '',
    });

    const fetchBranches = async () => {
        setLoading(true);
        setError('');

        try {
            const [dashboardResponse, branchOptions] = await Promise.all([
                branchService.getDashboard(currentMonth),
                branchService.getBranches(),
            ]);
            const mapped = (dashboardResponse.data ?? []).map((item) => ({
                branchId: item.branch_id,
                branchName: item.branch_name ?? `Branch #${item.branch_id}`,
                units: item.actual.total_units_actual,
            }));
            setRows(mapped);
            setBranchHeads(branchOptions);
        } catch {
            setRows([]);
            setBranchHeads([]);
            setError('Failed to load branch data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchBranches();
    }, [currentMonth]);

    const submitBranch = async (event: React.FormEvent) => {
        event.preventDefault();
        setCreating(true);
        setError('');
        setMessage('');

        try {
            await branchService.createBranch(form);
            setMessage('Branch and branch head created successfully.');
            setForm({
                branch_name: '',
                branch_head_name: '',
                branch_head_email: '',
            });
            await fetchBranches();
        } catch (createError: any) {
            const apiMessage = createError?.response?.data?.message;
            setError(apiMessage ?? 'Failed to create branch and branch head.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-3">
            <h1 className="text-2xl font-bold">Branches ({currentMonth})</h1>
            <form onSubmit={submitBranch} className="grid gap-3 rounded-sm border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2">
                <div className="md:col-span-2">
                    <h2 className="text-base font-semibold text-slate-900">Add Branch + Branch Head</h2>
                    <p className="text-xs text-slate-500">Area managers can create a new branch and assign its branch head here.</p>
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Branch name</label>
                    <input
                        type="text"
                        value={form.branch_name}
                        onChange={(event) => setForm((prev) => ({ ...prev, branch_name: event.target.value }))}
                        className="w-full rounded-sm border border-gray-300 bg-white px-4 py-2.5 text-sm transition focus:border-[#3C50E0] focus:outline-none focus:ring-1 focus:ring-[#3C50E0]"
                        required
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Branch head name</label>
                    <input
                        type="text"
                        value={form.branch_head_name}
                        onChange={(event) => setForm((prev) => ({ ...prev, branch_head_name: event.target.value }))}
                        className="w-full rounded-sm border border-gray-300 bg-white px-4 py-2.5 text-sm transition focus:border-[#3C50E0] focus:outline-none focus:ring-1 focus:ring-[#3C50E0]"
                        required
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Branch head email</label>
                    <input
                        type="email"
                        value={form.branch_head_email}
                        onChange={(event) => setForm((prev) => ({ ...prev, branch_head_email: event.target.value }))}
                        className="w-full rounded-sm border border-gray-300 bg-white px-4 py-2.5 text-sm transition focus:border-[#3C50E0] focus:outline-none focus:ring-1 focus:ring-[#3C50E0]"
                        required
                    />
                </div>
                <div className="md:col-span-2">
                    <button
                        type="submit"
                        disabled={creating}
                        className="rounded-sm bg-[#3C50E0] px-4 py-2.5 font-semibold text-white transition hover:bg-[#2f42c6] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {creating ? 'Creating...' : 'Create Branch'}
                    </button>
                </div>
            </form>
            {message && <p className="text-sm text-emerald-700">{message}</p>}
            {loading && <p className="text-sm text-slate-600">Loading branches...</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}

            <section className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-base font-semibold text-slate-900">Branch Heads</h2>
                <div className="overflow-x-auto rounded-sm border border-gray-200 bg-white">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                <th className="px-3 py-2.5">Branch</th>
                                <th className="px-3 py-2.5">Branch Head</th>
                                <th className="px-3 py-2.5">Email</th>
                                <th className="px-3 py-2.5">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {branchHeads.map((branch, index) => (
                                <tr key={branch.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}`}>
                                    <td className="px-3 py-2.5 font-semibold text-slate-900">{branch.name}</td>
                                    <td className="px-3 py-2.5 text-slate-700">{branch.branch_head_name ?? 'Not assigned'}</td>
                                    <td className="px-3 py-2.5 text-slate-700">{branch.branch_head_email ?? '-'}</td>
                                    <td className="px-3 py-2.5">
                                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${branch.account_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {branch.account_status === 'active' ? 'Ready to login' : 'No account'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <BranchesTable dashboardRows={rows} />
        </div>
    );
}

function QuotasPage() {
    const [branchId, setBranchId] = useState<number | null>(null);
    const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
    const [month, setMonth] = useState('5');
    const [year, setYear] = useState('2026');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [currentQuota, setCurrentQuota] = useState<Quota | null>(null);

    const [form, setForm] = useState({
        installment_units_quota: 0,
        total_units_quota: 0,
        parts_sales_quota: 0,
        labor_quota: 0,
        cpn_quota: 0,
        non_cpn_quota: 0,
    });

    const monthKey = `${year}-${month.padStart(2, '0')}`;

    useEffect(() => {
        const fetchBranchOptions = async () => {
            setLoadingBranches(true);
            setError('');

            try {
                const data = await branchService.getBranches();
                setBranchOptions(data);
                setBranchId((prev) => prev ?? data[0]?.id ?? null);
            } catch {
                setBranchOptions([]);
                setBranchId(null);
                setError('Failed to load branches list.');
            } finally {
                setLoadingBranches(false);
            }
        };

        void fetchBranchOptions();
    }, []);

    useEffect(() => {
        if (! branchId) {
            setCurrentQuota(null);
            return;
        }

        const fetchQuota = async () => {
            setLoading(true);
            setError('');
            setMessage('');

            try {
                const data = await quotaService.getQuota(branchId, monthKey);
                setCurrentQuota(data);
                setForm({
                    installment_units_quota: data.installment_units_quota,
                    total_units_quota: data.total_units_quota,
                    parts_sales_quota: data.parts_sales_quota,
                    labor_quota: data.labor_quota,
                    cpn_quota: data.cpn_quota,
                    non_cpn_quota: data.non_cpn_quota,
                });
            } catch {
                // If quota does not exist yet, keep form available for creation.
                setCurrentQuota(null);
                setForm({
                    installment_units_quota: 0,
                    total_units_quota: 0,
                    parts_sales_quota: 0,
                    labor_quota: 0,
                    cpn_quota: 0,
                    non_cpn_quota: 0,
                });
            } finally {
                setLoading(false);
            }
        };

        void fetchQuota();
    }, [branchId, monthKey]);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');

        if (! branchId) {
            setSaving(false);
            setError('Please select a branch.');
            return;
        }

        try {
            const saved = await quotaService.createQuota({
                branch_id: branchId,
                month: monthKey,
                installment_units_quota: form.installment_units_quota,
                total_units_quota: form.total_units_quota,
                parts_sales_quota: form.parts_sales_quota,
                labor_quota: form.labor_quota,
                cpn_quota: form.cpn_quota,
                non_cpn_quota: form.non_cpn_quota,
            });

            setCurrentQuota(saved);
            setMessage('Quota saved successfully.');
        } catch {
            setError('Failed to save quota. Make sure you are logged in as an area manager.');
        } finally {
            setSaving(false);
        }
    };

    const cashQuota = form.total_units_quota - form.installment_units_quota;
    const selectedBranch = branchOptions.find((item) => item.id === branchId);

    return (
        <div className="mx-auto max-w-6xl space-y-4 rounded-sm border border-gray-200 bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-bold">Quotas</h1>

            <div className="grid gap-3 md:grid-cols-2">
                <MonthSelector month={month} onChange={setMonth} />
                <YearSelector year={year} onChange={setYear} />
            </div>

            <section className="space-y-2 rounded-sm border border-gray-200 bg-white p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Branches</h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {branchOptions.map((item) => {
                        const isActive = item.id === branchId;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setBranchId(item.id)}
                                className={`rounded-sm border px-3 py-2 text-left text-sm font-semibold transition ${isActive ? 'border-[#3C50E0] bg-blue-50 text-[#3C50E0]' : 'border-gray-200 bg-white text-gray-700 hover:border-[#3C50E0]/40 hover:bg-blue-50/50'}`}
                            >
                                {item.name}
                            </button>
                        );
                    })}
                </div>
                {branchOptions.length === 0 && ! loadingBranches && (
                    <p className="text-sm text-slate-500">No branches found.</p>
                )}
            </section>

            <p className="text-sm text-slate-600">
                Showing quota for: <strong>{selectedBranch?.name ?? 'Select a branch from the list'}</strong>
            </p>

            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                <NumberField
                    label="Installment units quota"
                    value={form.installment_units_quota}
                    onChange={(value) => setForm((prev) => ({ ...prev, installment_units_quota: value }))}
                />
                <NumberField
                    label="Total units quota"
                    value={form.total_units_quota}
                    onChange={(value) => setForm((prev) => ({ ...prev, total_units_quota: value }))}
                />
                <NumberField
                    label="Parts sales quota"
                    value={form.parts_sales_quota}
                    onChange={(value) => setForm((prev) => ({ ...prev, parts_sales_quota: value }))}
                />
                <NumberField
                    label="Labor quota"
                    value={form.labor_quota}
                    onChange={(value) => setForm((prev) => ({ ...prev, labor_quota: value }))}
                />
                <NumberField
                    label="CPN quota"
                    value={form.cpn_quota}
                    onChange={(value) => setForm((prev) => ({ ...prev, cpn_quota: value }))}
                />
                <NumberField
                    label="Non-CPN quota"
                    value={form.non_cpn_quota}
                    onChange={(value) => setForm((prev) => ({ ...prev, non_cpn_quota: value }))}
                />

                <div className="md:col-span-2 rounded-sm border border-blue-200 bg-blue-50 p-3 text-sm text-[#3C50E0]">
                    Cash units quota (auto): <strong>{cashQuota}</strong>
                </div>

                <div className="md:col-span-2">
                    <button type="submit" disabled={saving} className="rounded-sm bg-[#3C50E0] px-4 py-2 font-semibold text-white transition hover:bg-[#2f42c6] disabled:opacity-60">
                        {saving ? 'Saving...' : 'Save Quota'}
                    </button>
                </div>
            </form>

            {loadingBranches && <p className="text-sm text-slate-600">Loading branches...</p>}
            {loading && <p className="text-sm text-slate-600">Loading current quota...</p>}
            {message && <p className="text-sm text-emerald-700">{message}</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}

            {currentQuota && (
                <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    Current stored quota for {monthKey}: {currentQuota.total_units_quota} total units, {currentQuota.installment_units_quota} installment units, {currentQuota.total_units_quota - currentQuota.installment_units_quota} cash units.
                </div>
            )}
        </div>
    );
}

function ReportsPage() {
    const [month, setMonth] = useState('5');
    const [year, setYear] = useState('2026');
    const [rows, setRows] = useState<MonthlyBranchesReportRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [overall, setOverall] = useState({
        installment_units_actual: 0,
        total_units_actual: 0,
        parts_sales_actual: 0,
        labor_actual: 0,
        cpn_units_actual: 0,
        non_cpn_units_actual: 0,
        installment_units_quota: 0,
        total_units_quota: 0,
        parts_sales_quota: 0,
        labor_quota: 0,
        cpn_quota: 0,
        non_cpn_quota: 0,
    });

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await reportService.getMonthlyBranchesReport({
                    year: Number(year),
                    month: Number(month),
                });
                setRows(response.data);
                setOverall(response.overall);
            } catch {
                setRows([]);
                setError('Failed to load monthly report data.');
            } finally {
                setLoading(false);
            }
        };

        void fetchReport();
    }, [year, month]);

    return (
        <BranchReportPanel
            title="Overall Branches Report"
            month={month}
            year={year}
            onMonthChange={setMonth}
            onYearChange={setYear}
            rows={rows}
            loading={loading}
            error={error}
            overall={overall}
        />
    );
}

function HistoryPage() {
    const [month, setMonth] = useState('5');
    const [year, setYear] = useState('2026');
    const [branchId, setBranchId] = useState('all');
    const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
    const [rows, setRows] = useState<MonthlyBranchesReportRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [overall, setOverall] = useState({
        installment_units_actual: 0,
        total_units_actual: 0,
        parts_sales_actual: 0,
        labor_actual: 0,
        cpn_units_actual: 0,
        non_cpn_units_actual: 0,
        installment_units_quota: 0,
        total_units_quota: 0,
        parts_sales_quota: 0,
        labor_quota: 0,
        cpn_quota: 0,
        non_cpn_quota: 0,
    });

    useEffect(() => {
        const fetchBranchOptions = async () => {
            try {
                const options = await branchService.getBranches();
                setBranchOptions(options);
            } catch {
                setBranchOptions([]);
            }
        };

        void fetchBranchOptions();
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError('');

            try {
                const response = await reportService.getMonthlyBranchesReport({
                    year: Number(year),
                    month: Number(month),
                    ...(branchId !== 'all' ? { branch_id: Number(branchId) } : {}),
                });

                setRows(response.data);
                setOverall(response.overall);
            } catch {
                setRows([]);
                setError('Failed to load history report.');
            } finally {
                setLoading(false);
            }
        };

        void fetchHistory();
    }, [year, month, branchId]);

    return (
        <div className="mx-auto max-w-6xl space-y-4 rounded-sm border border-gray-200 bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-bold">History Page</h1>

            <div className="grid gap-3 md:grid-cols-3">
                <MonthSelector month={month} onChange={setMonth} />
                <YearSelector year={year} onChange={setYear} />
                <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="w-full rounded-sm border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-[#3C50E0] focus:outline-none focus:ring-1 focus:ring-[#3C50E0]">
                    <option value="all">All Branches</option>
                    {branchOptions.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                            {item.name}
                        </option>
                    ))}
                </select>
            </div>

            <ReportSummary overall={overall} />
            <ReportRowsTable rows={rows} loading={loading} error={error} />
        </div>
    );
}

function BranchReportPanel({
    title,
    month,
    year,
    onMonthChange,
    onYearChange,
    rows,
    loading,
    error,
    overall,
}: {
    title: string;
    month: string;
    year: string;
    onMonthChange: (value: string) => void;
    onYearChange: (value: string) => void;
    rows: MonthlyBranchesReportRow[];
    loading: boolean;
    error: string;
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
}) {
    return (
        <div className="mx-auto max-w-6xl space-y-4 rounded-sm border border-gray-200 bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-bold">{title}</h1>
            <div className="grid gap-3 md:grid-cols-2">
                <MonthSelector month={month} onChange={onMonthChange} />
                <YearSelector year={year} onChange={onYearChange} />
            </div>

            <ReportSummary overall={overall} />
            <ReportRowsTable rows={rows} loading={loading} error={error} />
        </div>
    );
}

function MonthSelector({ month, onChange }: { month: string; onChange: (value: string) => void }) {
    const monthOptions = [
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];

    return (
        <select value={month} onChange={(event) => onChange(event.target.value)} className="w-full rounded-sm border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-[#3C50E0] focus:outline-none focus:ring-1 focus:ring-[#3C50E0]">
            {monthOptions.map((item) => (
                <option key={item.value} value={item.value}>
                    {item.label}
                </option>
            ))}
        </select>
    );
}

function YearSelector({ year, onChange }: { year: string; onChange: (value: string) => void }) {
    return (
        <select value={year} onChange={(event) => onChange(event.target.value)} className="w-full rounded-sm border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-[#3C50E0] focus:outline-none focus:ring-1 focus:ring-[#3C50E0]">
            {['2025', '2026', '2027', '2028'].map((item) => (
                <option key={item} value={item}>
                    {item}
                </option>
            ))}
        </select>
    );
}

function ReportSummary({
    overall,
}: {
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
}) {
    const cashUnitsOverall = overall.total_units_actual - overall.installment_units_actual;
    const cashUnitsQuotaOverall = overall.total_units_quota - overall.installment_units_quota;

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="Total Units (Actual / Quota)" value={`${overall.total_units_actual} / ${overall.total_units_quota}`} />
            <SummaryCard label="Installment (Actual / Quota)" value={`${overall.installment_units_actual} / ${overall.installment_units_quota}`} />
            <SummaryCard label="Cash (Actual / Quota)" value={`${cashUnitsOverall} / ${cashUnitsQuotaOverall}`} />
            <SummaryCard label="Parts (Actual / Quota)" value={`${formatCurrency(overall.parts_sales_actual)} / ${formatCurrency(overall.parts_sales_quota)}`} />
            <SummaryCard label="Labor (Actual / Quota)" value={`${formatCurrency(overall.labor_actual)} / ${formatCurrency(overall.labor_quota)}`} />
            <SummaryCard label="CPN (Actual / Quota)" value={`${overall.cpn_units_actual} / ${overall.cpn_quota}`} />
            <SummaryCard label="Non-CPN (Actual / Quota)" value={`${overall.non_cpn_units_actual} / ${overall.non_cpn_quota}`} />
        </div>
    );
}

function ReportRowsTable({ rows, loading, error }: { rows: MonthlyBranchesReportRow[]; loading: boolean; error: string }) {
    if (loading) {
        return <p className="text-sm text-slate-600">Loading report...</p>;
    }

    if (error) {
        return <p className="text-sm text-rose-600">{error}</p>;
    }

    return (
        <>
            <div className="grid gap-3 md:hidden">
                {rows.map((item, index) => (
                    <article key={`${item.branch_id}-${item.month}-${index}`} className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">{item.branch_name ?? `Branch #${item.branch_id}`}</h3>
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-[#3C50E0]">{item.month}</span>
                        </div>
                        <p className="text-xs text-slate-600">Total: {item.total_units_actual}</p>
                        <p className="text-xs text-slate-600">Total (A/Q): {item.total_units_actual} / {item.total_units_quota}</p>
                        <p className="text-xs text-slate-600">Installment (A/Q): {item.installment_units_actual} / {item.installment_units_quota}</p>
                        <p className="text-xs text-slate-600">Cash (A/Q): {item.total_units_actual - item.installment_units_actual} / {item.total_units_quota - item.installment_units_quota}</p>
                        <p className="text-xs text-slate-600">Parts (A/Q): {formatCurrency(item.parts_sales_actual)} / {formatCurrency(item.parts_sales_quota)}</p>
                        <p className="text-xs text-slate-600">Labor (A/Q): {formatCurrency(item.labor_actual)} / {formatCurrency(item.labor_quota)}</p>
                    </article>
                ))}
            </div>

            <div className="hidden overflow-x-auto rounded-sm border border-gray-200 bg-white md:block">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        <th className="px-3 py-2.5">Branch</th>
                        <th className="px-3 py-2.5">Month</th>
                        <th className="px-3 py-2.5">Total (A/Q)</th>
                        <th className="px-3 py-2.5">Installment (A/Q)</th>
                        <th className="px-3 py-2.5">Cash (A/Q)</th>
                        <th className="px-3 py-2.5">Parts (A/Q)</th>
                        <th className="px-3 py-2.5">Labor (A/Q)</th>
                        <th className="px-3 py-2.5">Achv. Units %</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((item, index) => (
                        <tr key={`${item.branch_id}-${item.month}-${index}`} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}`}>
                            <td className="px-3 py-2.5 font-semibold text-slate-900">{item.branch_name ?? `Branch #${item.branch_id}`}</td>
                            <td className="px-3 py-2.5">{item.month}</td>
                            <td className="px-3 py-2.5">{item.total_units_actual} / {item.total_units_quota}</td>
                            <td className="px-3 py-2.5">{item.installment_units_actual} / {item.installment_units_quota}</td>
                            <td className="px-3 py-2.5">{item.total_units_actual - item.installment_units_actual} / {item.total_units_quota - item.installment_units_quota}</td>
                            <td className="px-3 py-2.5">{formatCurrency(item.parts_sales_actual)} / {formatCurrency(item.parts_sales_quota)}</td>
                            <td className="px-3 py-2.5">{formatCurrency(item.labor_actual)} / {formatCurrency(item.labor_quota)}</td>
                            <td className="px-3 py-2.5">{item.progress.total_units_percent}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </>
    );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <article className="rounded-sm border border-gray-200 bg-white px-6 py-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
                    <h4 className="mt-2 text-2xl font-bold text-gray-900">{value}</h4>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#3C50E0]">
                    {icon}
                </div>
            </div>
        </article>
    );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-sm border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
        </div>
    );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
            <input
                type="number"
                min={0}
                className="w-full rounded-sm border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 transition focus:border-[#3C50E0] focus:outline-none focus:ring-1 focus:ring-[#3C50E0]"
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
            />
        </div>
    );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            className={`border-b-2 px-5 py-3 text-sm font-medium transition ${
                active
                    ? 'border-[#3C50E0] text-[#3C50E0]'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatCompactNumber(value: number) {
    return new Intl.NumberFormat('en-PH', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value);
}

function formatSignedCount(value: number) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}`;
}

function formatSignedCurrency(value: number) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${formatCurrency(value)}`;
}

function varianceClass(value: number) {
    if (value > 0) {
        return 'font-semibold text-emerald-700';
    }

    if (value < 0) {
        return 'font-semibold text-rose-700';
    }

    return 'font-semibold text-slate-700';
}

function getStoredRole(): Role | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }

    const value = sessionStorage.getItem(ROLE_STORAGE_KEY);
    if (value === 'area_manager' || value === 'branch_manager') {
        return value;
    }

    return undefined;
}

function getStoredBranchId(): number | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }

    const value = sessionStorage.getItem(BRANCH_ID_STORAGE_KEY);
    if (!value) {
        return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return undefined;
    }

    return parsed;
}

function getTodayDateString() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
}

function isSundayDate(dateString: string) {
    return new Date(`${dateString}T00:00:00`).getDay() === 0;
}
