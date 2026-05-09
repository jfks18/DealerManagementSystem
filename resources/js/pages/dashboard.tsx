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
        <div className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_45%,#f3faf7_100%)] text-slate-900">
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
        <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-md rounded-3xl border border-slate-200/70 bg-white/90 p-7 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm">
                <div className="mb-6">
                    <p className="mb-2 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-700">BRANCH INTELLIGENCE</p>
                    <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">Motorcycle Branch Management</h1>
                    <p className="text-sm text-slate-600">Sign in to access real-time branch performance and quota controls.</p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
                        <input
                            type="email"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition focus:border-cyan-400 focus:bg-white focus:outline-none"
                            value={form.email}
                            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
                        <input
                            type="password"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition focus:border-cyan-400 focus:bg-white focus:outline-none"
                            value={form.password}
                            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                            required
                        />
                    </div>

                    {error && <p className="text-sm text-rose-600">{error}</p>}

                    <button
                        type="submit"
                        disabled={pending}
                        className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-cyan-700/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {pending ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function AreaManagerLayout() {
    return (
        <div className="flex min-h-screen">
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
            <main className="flex-1 p-4 md:p-7">
                <div className="mx-auto max-w-7xl">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

function BranchManagerLayout() {
    return (
        <div className="flex min-h-screen">
            <Sidebar
                title="Branch Manager"
                items={[
                    { to: '/branch', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
                    { to: '/branch/daily-entry', label: 'Daily Entry', icon: <Calendar className="h-4 w-4" /> },
                    { to: '/branch/my-reports', label: 'My Reports', icon: <ClipboardList className="h-4 w-4" /> },
                ]}
            />
            <main className="flex-1 p-4 md:p-7">
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
        <aside className="sticky top-0 h-screen w-72 border-r border-slate-200/70 bg-white/75 p-4 backdrop-blur-xl">
            <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-white">
                    <Bike className="h-5 w-5" />
                    <span className="text-sm font-semibold tracking-wide">{title}</span>
                </div>
            </div>
            <nav className="space-y-1">
                {items.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to.endsWith('/area') || item.to.endsWith('/branch')}
                        className={({ isActive }) =>
                            `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                                isActive
                                    ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-md shadow-cyan-700/20'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        {item.icon}
                        {item.label}
                    </NavLink>
                ))}
            </nav>
            <div className="mt-8 space-y-2 border-t border-slate-200 pt-4">
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
                    className="flex w-full items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
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
                <section className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_12px_34px_-28px_rgba(15,23,42,0.45)]">
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
                                    formatter={(value: number) => [formatCompactNumber(value), '']}
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
                <section className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_12px_34px_-28px_rgba(15,23,42,0.45)]">
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
                                    formatter={(value: number) => [formatCompactNumber(value), 'Units']}
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

function BranchesTable({ dashboardRows }: { dashboardRows?: { branchId: number; branchName: string; units: number; submittedToday: boolean; missingDaysCount: number; latestMissingDate: string | null; missingDates: string[] }[] }) {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'submitted'>('all');

    const rows = dashboardRows
        ? dashboardRows.map((item) => ({
              id: item.branchId,
              name: item.branchName,
              area: '-',
              manager: '-',
              units: item.units,
              submittedToday: item.submittedToday,
                            missingDaysCount: item.missingDaysCount,
                            latestMissingDate: item.latestMissingDate,
                            missingDates: item.missingDates,
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
        <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Branch List</h2>
                <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${statusFilter === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        All ({rows.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('pending')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        Pending ({pendingCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('submitted')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${statusFilter === 'submitted' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        Submitted ({submittedCount})
                    </button>
                </div>
            </div>
            <div className="grid gap-3 md:hidden">
                {filteredRows.map((branch) => {
                    const missingDates = branch.missingDates ?? [];

                    return (
                        <article key={branch.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="font-semibold text-slate-900">{branch.name}</h3>
                                <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">{branch.units} units</span>
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
                                className="mt-3 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                                View Detail
                            </button>
                        </article>
                    );
                })}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/70 bg-white md:block">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
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
                                <tr className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
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
                                            <span className={`font-semibold ${branch.missingDaysCount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{branch.missingDaysCount}</span>
                                            {branch.latestMissingDate ? <span className="text-xs">latest: {branch.latestMissingDate}</span> : null}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/area/branches/${branch.id}`)}
                                            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-105"
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

            <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2">
                <TabButton active={tab === 'daily'} onClick={() => setTab('daily')} label="Daily Reports" />
                <TabButton active={tab === 'summary'} onClick={() => setTab('summary')} label="Monthly Summary" />
                <TabButton active={tab === 'history'} onClick={() => setTab('history')} label="History" />
            </div>

            {tab === 'daily' && (
                <BranchDailyReportsTable rows={monthlyReport?.data ?? []} />
            )}

            {tab === 'summary' && (
                <div className="overflow-x-auto rounded-2xl border border-white/70 bg-white/90 p-3">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
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
                                <tr key={item.month} className="border-b border-slate-100">
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
                <div className="overflow-x-auto rounded-2xl border border-white/70 bg-white/90 p-3">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
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
                                <tr key={item.month} className="border-b border-slate-100">
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
                    <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">{item.date}</h3>
                            <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">{item.total_units_actual} units</span>
                        </div>
                        <p className="text-xs text-slate-600">Installment: {item.installment_units_actual}</p>
                        <p className="text-xs text-slate-600">Cash: {item.total_units_actual - item.installment_units_actual}</p>
                        <p className="text-xs text-slate-600">Parts: {formatCurrency(item.parts_sales_actual)}</p>
                        <p className="text-xs text-slate-600">Labor: {formatCurrency(item.labor_actual)}</p>
                    </article>
                ))}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/70 bg-white md:block">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
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
                        <tr key={item.id} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
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
            <h1 className="text-2xl font-bold">Branch Manager Dashboard</h1>
            {loading && <p className="text-sm text-slate-600">Loading branch dashboard...</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm">
                    <h2 className="text-sm font-medium text-slate-600">Assigned Branch Info</h2>
                    <p className="mt-2 text-lg font-semibold">{branchName}</p>
                    <p className="text-sm text-slate-600">Branch ID: {branchId}</p>
                </section>
                <section className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm">
                    <h2 className="text-sm font-medium text-slate-600">Today's Submission Status</h2>
                    <p className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-medium ${todayStatus ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {todayStatus ? 'Submitted' : 'Pending'}
                    </p>
                </section>

                <section className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm md:col-span-2">
                    <h2 className="text-sm font-medium text-slate-600">Monthly Quota Set By Area Manager</h2>
                    <p className="mt-1 text-xs text-slate-500">{quotaMonthLabel}</p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Units</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">{monthlyQuota.total_units_quota}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Installment Units</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">{monthlyQuota.installment_units_quota}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cash Units</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">{monthlyQuota.cash_units_quota}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parts Sales</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(monthlyQuota.parts_sales_quota)}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Labor</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(monthlyQuota.labor_quota)}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CPN / Non-CPN</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">{monthlyQuota.cpn_quota} / {monthlyQuota.non_cpn_quota}</p>
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
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.45)]">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Daily Entry Form</h1>
                        <p className="mt-1 text-sm text-slate-600">Select the actual report date to submit missed-day entries professionally.</p>
                    </div>
                    <div className="text-right">
                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">Branch #{branchId}</span>
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
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition focus:border-cyan-400 focus:bg-white focus:outline-none"
                            required
                        />
                        <p className="mt-1 text-xs text-slate-500">You can submit previous dates if they were missed, except Sundays.</p>
                    </div>

                    {isEditingExisting && (
                        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                            Existing entry loaded for this date. Last update: {new Date(selectedReport.updated_at).toLocaleString('en-US')}
                        </p>
                    )}

                    <NumberField label="Installment units" value={form.installmentUnits} onChange={(value) => setForm((prev) => ({ ...prev, installmentUnits: value }))} />
                    <NumberField label="Total units sold" value={form.totalUnits} onChange={(value) => setForm((prev) => ({ ...prev, totalUnits: value }))} />
                    <NumberField label="Parts sales" value={form.partsSales} onChange={(value) => setForm((prev) => ({ ...prev, partsSales: value }))} />
                    <NumberField label="Labor charges" value={form.laborCharges} onChange={(value) => setForm((prev) => ({ ...prev, laborCharges: value }))} />
                    <NumberField label="CPM serviced" value={form.cpnServiced} onChange={(value) => setForm((prev) => ({ ...prev, cpnServiced: value }))} />
                    <NumberField label="Non-CPN serviced" value={form.nonCpnServiced} onChange={(value) => setForm((prev) => ({ ...prev, nonCpnServiced: value }))} />

                    <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                        Cash sales (auto): <strong>{cashSales}</strong>
                    </div>

                    <button
                        type="submit"
                        disabled={pending}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {pending ? 'Saving...' : (isEditingExisting ? 'Update Report' : 'Submit Report')}
                    </button>

                    {message?.type === 'success' && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message.text}</p>}
                    {message?.type === 'error' && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{message.text}</p>}
                </form>
            </div>

            <section className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
                                className={`h-9 rounded-lg border text-xs font-semibold transition ${colorClass} ${isSelected ? 'ring-2 ring-cyan-500 ring-offset-1' : ''} ${isTrackable ? 'hover:brightness-95' : 'cursor-not-allowed'}`}
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
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">My Reports</h1>
                <button
                    type="button"
                    onClick={() => void exportToExcel()}
                    disabled={rows.length === 0 || loading || exporting}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
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
            <form onSubmit={submitBranch} className="grid gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm md:grid-cols-2">
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
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition focus:border-cyan-400 focus:bg-white focus:outline-none"
                        required
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Branch head name</label>
                    <input
                        type="text"
                        value={form.branch_head_name}
                        onChange={(event) => setForm((prev) => ({ ...prev, branch_head_name: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition focus:border-cyan-400 focus:bg-white focus:outline-none"
                        required
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Branch head email</label>
                    <input
                        type="email"
                        value={form.branch_head_email}
                        onChange={(event) => setForm((prev) => ({ ...prev, branch_head_email: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition focus:border-cyan-400 focus:bg-white focus:outline-none"
                        required
                    />
                </div>
                <div className="md:col-span-2">
                    <button
                        type="submit"
                        disabled={creating}
                        className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {creating ? 'Creating...' : 'Create Branch'}
                    </button>
                </div>
            </form>
            {message && <p className="text-sm text-emerald-700">{message}</p>}
            {loading && <p className="text-sm text-slate-600">Loading branches...</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}

            <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <h2 className="mb-3 text-base font-semibold text-slate-900">Branch Heads</h2>
                <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                <th className="px-3 py-2.5">Branch</th>
                                <th className="px-3 py-2.5">Branch Head</th>
                                <th className="px-3 py-2.5">Email</th>
                                <th className="px-3 py-2.5">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {branchHeads.map((branch, index) => (
                                <tr key={branch.id} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
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
        <div className="mx-auto max-w-6xl space-y-4 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
            <h1 className="text-2xl font-bold">Quotas</h1>

            <div className="grid gap-3 md:grid-cols-2">
                <MonthSelector month={month} onChange={setMonth} />
                <YearSelector year={year} onChange={setYear} />
            </div>

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Branches</h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {branchOptions.map((item) => {
                        const isActive = item.id === branchId;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setBranchId(item.id)}
                                className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${isActive ? 'border-cyan-400 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50/50'}`}
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

                <div className="md:col-span-2 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm">
                    Cash units quota (auto): <strong>{cashQuota}</strong>
                </div>

                <div className="md:col-span-2">
                    <button type="submit" disabled={saving} className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
                        {saving ? 'Saving...' : 'Save Quota'}
                    </button>
                </div>
            </form>

            {loadingBranches && <p className="text-sm text-slate-600">Loading branches...</p>}
            {loading && <p className="text-sm text-slate-600">Loading current quota...</p>}
            {message && <p className="text-sm text-emerald-700">{message}</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}

            {currentQuota && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
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
        <div className="mx-auto max-w-6xl space-y-4 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
            <h1 className="text-2xl font-bold">History Page</h1>

            <div className="grid gap-3 md:grid-cols-3">
                <MonthSelector month={month} onChange={setMonth} />
                <YearSelector year={year} onChange={setYear} />
                <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
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
        <div className="mx-auto max-w-6xl space-y-4 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
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
        <select value={month} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
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
        <select value={year} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
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
                    <article key={`${item.branch_id}-${item.month}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">{item.branch_name ?? `Branch #${item.branch_id}`}</h3>
                            <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">{item.month}</span>
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

            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/70 bg-white md:block">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
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
                        <tr key={`${item.branch_id}-${item.month}-${index}`} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
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
        <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_12px_34px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-30px_rgba(8,47,73,0.45)]">
            <div className="mb-3 flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
                {icon}
            </div>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
        </article>
    );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_12px_34px_-28px_rgba(15,23,42,0.45)]">
            <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
        </div>
    );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
            <input
                type="number"
                min={0}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition focus:border-cyan-400 focus:bg-white focus:outline-none"
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
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active
                    ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-md shadow-cyan-700/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
