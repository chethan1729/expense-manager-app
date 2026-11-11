import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  Activity, ArrowDownRight, ArrowUpRight, Building2, CalendarDays, Check, ChevronDown,
  CircleDollarSign, Landmark, LockKeyhole, LogOut, RefreshCw, ShieldCheck,
  Target, TrendingUp, Wallet,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie,
  PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

type AnyRecord = Record<string, any>;
type Snapshot = {
  preferences?: Record<string, any>;
  localStorage?: Record<string, any>;
  syncedAt?: string;
};
type Section = { id: string; name: string; budget?: number; expenses?: AnyRecord[]; investmentItems?: AnyRecord[] };
type Transaction = { id: string; date: string; fundId: string; amount: number; description?: string; paymentMode?: string };

type View = "Overview" | "Spending" | "Investments" | "Goals" | "Assets";
const NAVIGATION: { name: View; icon: typeof Activity }[] = [
  { name: "Overview", icon: Activity },
  { name: "Spending", icon: Wallet },
  { name: "Investments", icon: TrendingUp },
  { name: "Goals", icon: Target },
  { name: "Assets", icon: Building2 },
];
const CHART_COLORS = ["#1f8068", "#e4ad55", "#5c91bd", "#d98062", "#8c78b4", "#55a8a0", "#cf7187"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SNAPSHOT_TABLE = "expense_manager_snapshots";
const SNAPSHOT_KEY = "full_snapshot";
const MONTHLY_DATA_KEY = "expense-manager-monthly-v1";
const TRANSACTIONS_KEY = "expense-manager-transactions-v1";

const currency = (value: number) => `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
const percent = (value: number) => `${Math.round(Number(value) || 0)}%`;

function getData<T>(preferences: Record<string, any>, key: string, localStorageData: Record<string, any>, localKey?: string): T {
  return (preferences[key] ?? (localKey ? localStorageData[localKey] : undefined) ?? {}) as T;
}

function formatMonth(monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("expense-dashboard-access-code") || "");
  const [tokenInput, setTokenInput] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [view, setView] = useState<View>("Overview");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const configured = Boolean(supabaseUrl && supabaseAnonKey);

  const connectAndLoad = useCallback(async (accessCode: string) => {
    if (!configured) {
      setError("The dashboard is not configured with Supabase yet.");
      return;
    }
    if (!accessCode.trim()) {
      setError("Enter the website access code from the app's Backup & Restore page.");
      return;
    }

    setLoading(true);
    setError("");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { "x-expense-view-token": accessCode.trim() } },
    });
    const { data, error: queryError } = await supabase
      .from(SNAPSHOT_TABLE)
      .select("payload, updated_at")
      .eq("snapshot_key", SNAPSHOT_KEY)
      .maybeSingle();

    if (queryError || !data?.payload) {
      setError(queryError
        ? `Supabase lookup failed (${queryError.code || "unknown"}): ${queryError.message}`
        : "No snapshot is available for this access code yet. Open the app's Backup & Restore page and tap Sync now.");
      setLoading(false);
      return;
    }

    localStorage.setItem("expense-dashboard-access-code", accessCode.trim());
    setToken(accessCode.trim());
    setClient(supabase);
    setSnapshot(data.payload as Snapshot);
    setLastUpdated(data.updated_at || data.payload.syncedAt || "");
    setLoading(false);
  }, [configured, supabaseAnonKey, supabaseUrl]);

  useEffect(() => {
    if (token && configured) void connectAndLoad(token);
  }, [token, configured, connectAndLoad]);

  useEffect(() => {
    if (!client || !token) return;
    const refreshTimer = window.setInterval(() => void connectAndLoad(token), 60000);
    return () => window.clearInterval(refreshTimer);
  }, [client, token, connectAndLoad]);

  const disconnect = () => {
    localStorage.removeItem("expense-dashboard-access-code");
    setToken("");
    setTokenInput("");
    setClient(null);
    setSnapshot(null);
    setLastUpdated("");
    setError("");
  };

  if (!snapshot) {
    return (
      <main className="connect-shell">
        <section className="connect-panel">
          <div className="brand-mark"><Wallet size={22} /></div>
          <p className="eyebrow">PRIVATE FINANCE VIEW</p>
          <h1>Your money,<br /><em>in clear view.</em></h1>
          <p className="connect-copy">Connect to your Expense Manager snapshot to view your budgets, spending, investments, and goals. This website is read-only.</p>
          {!configured ? (
            <div className="notice notice-warning">Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel project settings to enable the viewer.</div>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); void connectAndLoad(tokenInput); }} className="connect-form">
              <label htmlFor="access-code">Website access code</label>
              <input id="access-code" type="password" autoComplete="current-password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} placeholder="Paste your private sync code" />
              {error && <p className="form-error">{error}</p>}
              <button type="submit" disabled={loading}>{loading ? <><RefreshCw size={16} className="spin" /> Connecting…</> : "Open my dashboard"}</button>
              <p className="privacy-note"><LockKeyhole size={13} /> The access code is stored only in this browser.</p>
            </form>
          )}
          <div className="connect-foot"><ShieldCheck size={15} /> Private snapshot · View only · No edits or deletions</div>
        </section>
        <div className="connect-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-card"><span>MONTHLY OVERVIEW</span><strong>₹ 1,24,850</strong><div className="art-bars"><i /><i /><i /><i /><i /><i /><i /></div><small>Spending steady this month</small></div><div className="art-note note-top">Budget on track <Check size={14} /></div><div className="art-note note-bottom"><TrendingUp size={15} /> Investments growing</div></div>
      </main>
    );
  }

  return <FinanceDashboard snapshot={snapshot} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} view={view} onViewChange={setView} lastUpdated={lastUpdated} loading={loading} error={error} onRefresh={() => void connectAndLoad(token)} onDisconnect={disconnect} />;
}

function FinanceDashboard({ snapshot, selectedMonth, onMonthChange, view, onViewChange, lastUpdated, loading, error, onRefresh, onDisconnect }: {
  snapshot: Snapshot;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  view: View;
  onViewChange: (view: View) => void;
  lastUpdated: string;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onDisconnect: () => void;
}) {
  const preferences = snapshot.preferences || {};
  const localStore = snapshot.localStorage || {};
  const monthlyData = getData<Record<string, AnyRecord>>(preferences, MONTHLY_DATA_KEY, localStore);
  const transactionsByMonth = getData<Record<string, Transaction[]>>(preferences, TRANSACTIONS_KEY, localStore);
  const properties = getData<AnyRecord[]>(preferences, "expense-manager-properties", localStore);
  const deposits = getData<AnyRecord>(preferences, "expense-manager-deposits-v1", localStore);
  const goals = getData<AnyRecord[]>(preferences, "expense-manager-goals", localStore);
  const debts = getData<AnyRecord[]>(preferences, "expense-manager-debts", localStore);
  const loans = getData<AnyRecord[]>(preferences, "expense-manager-loans", localStore);
  const investmentPlans = getData<AnyRecord[]>(preferences, "investment-diversification-plans", localStore);
  const metalItems = getData<AnyRecord[]>(preferences, "precious-metals", localStore, "precious-metals");
  const metalRates = getData<AnyRecord>(preferences, "metal-rates", localStore, "metal-rates");
  const netWorthHistory = getData<AnyRecord[]>(preferences, "net-worth-history", localStore, "net-worth-history");
  const monthRecord = monthlyData[selectedMonth];
  const sections: Section[] = monthRecord?.sections || [];
  const investmentSection = sections.find((section) => section.id === "investment-fund");
  const monthTransactions = transactionsByMonth[selectedMonth] || [];
  const currentYear = selectedMonth.slice(0, 4);

  const monthlySummary = useMemo(() => {
    const totalSpent = sections.reduce((sum, section) => {
      if (section.id === "wife-investments") return sum;
      if (section.id === "investment-fund") return sum + (section.budget || 0);
      return sum + (section.expenses || []).reduce((subtotal, expense) => subtotal + (expense.spent || 0), 0);
    }, 0);
    const monthlyBudget = monthRecord?.totalBudget || 0;
    return { monthlyBudget, totalSpent, remaining: monthlyBudget - totalSpent };
  }, [monthRecord, sections]);

  const categorySpend = useMemo(() => sections
    .filter((section) => section.id !== "wife-investments")
    .map((section) => ({
      name: section.name.replace(/ Fund$/, ""),
      amount: section.id === "investment-fund"
        ? section.budget || 0
        : (section.expenses || []).reduce((sum, expense) => sum + (expense.spent || 0), 0),
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount), [sections]);

  const spendingTrend = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const monthKey = `${currentYear}-${String(index + 1).padStart(2, "0")}`;
    const data = monthlyData[monthKey];
    const monthSections: Section[] = data?.sections || [];
    return {
      month: MONTHS[index],
      spent: monthSections.reduce((sum, section) => section.id === "investment-fund"
        ? sum + (section.budget || 0)
        : section.id === "wife-investments" ? sum : sum + (section.expenses || []).reduce((sub, expense) => sub + (expense.spent || 0), 0), 0),
      budget: data?.totalBudget || 0,
    };
  }), [currentYear, monthlyData]);

  const investmentItems = investmentSection?.investmentItems || [];
  const investments = useMemo(() => investmentItems.map((item) => ({
    name: item.name,
    type: item.type || "Other",
    allocated: Number(item.allocated || 0),
    invested: Number(item.invested || 0),
    currentValue: Number(item.currentValue || 0),
    pl: Number(item.currentValue || 0) - Number(item.invested || 0),
  })), [investmentItems]);

  const investmentYearData = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const monthKey = `${currentYear}-${String(index + 1).padStart(2, "0")}`;
    const section = (monthlyData[monthKey]?.sections || []).find((item: Section) => item.id === "investment-fund");
    return { month: MONTHS[index], allocated: Number(section?.budget || 0) };
  }), [currentYear, monthlyData]);

  const fundedGoals = useMemo(() => goals.map((goal) => {
    const funded = (goal.fundingSources || []).reduce((sum: number, funding: AnyRecord) => sum + Number(funding.allocatedAmount || 0), 0);
    const target = Number(goal.targetAmount || 0);
    return { ...goal, funded, target, progress: target > 0 ? Math.min(100, funded / target * 100) : 0 };
  }), [goals]);

  const totalInvested = investments.reduce((sum, item) => sum + item.currentValue, 0);
  const currentAssets = properties.filter((property) => !property.loanInProgress).reduce((sum, property) => sum + Number(property.totalSqft || 0) * Number(property.currentRatePerSqft || 0), 0)
    + Number(deposits.totalFDAmount || (deposits.fds || []).reduce((sum: number, fd: AnyRecord) => sum + Number(fd.investedAmount || 0), 0))
    + Number(deposits.epf?.totalAccumulated || 0)
    + totalInvested;
  const debtTotals = debts.filter((debt) => debt.type === "owe").reduce((sum, debt) => sum + Number(debt.amount || 0), 0)
    + loans.reduce((sum, loan) => sum + Number(loan.totalOutstanding || 0), 0);

  const latestTransactions = [...monthTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const navLabel = formatMonth(selectedMonth);
  const updatedLabel = lastUpdated ? new Date(lastUpdated).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Waiting for first sync";

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); onViewChange("Overview"); }}>
          <span className="brand-mark"><Wallet size={19} /></span>
          <span><b>pocket</b><small>Expense Manager</small></span>
        </a>
        <div className="sidebar-caption">YOUR FINANCES</div>
        <nav className="side-nav" aria-label="Dashboard sections">
          {NAVIGATION.map(({ name, icon: Icon }) => <button key={name} onClick={() => onViewChange(name)} className={view === name ? "active" : ""}><Icon size={17} /><span>{name}</span></button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sync-state"><span className="sync-dot" /> Read-only snapshot</div>
          <button className="disconnect-button" onClick={onDisconnect}><LogOut size={15} /> Disconnect</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR FINANCIAL PICTURE</p>
            <h1>{view === "Overview" ? "Overview" : view}</h1>
          </div>
          <div className="topbar-actions">
            <label className="month-picker"><CalendarDays size={15} /><input type="month" value={selectedMonth} onChange={(event) => event.target.value && onMonthChange(event.target.value)} /></label>
            <button className="icon-button" onClick={onRefresh} disabled={loading} title="Refresh data"><RefreshCw size={16} className={loading ? "spin" : ""} /></button>
            <div className="profile-chip"><span className="profile-avatar">E</span><span><b>My finances</b><small>Private dashboard</small></span></div>
          </div>
        </header>
        {error && <div className="notice notice-warning">Refresh issue: {error}. Showing the last synced snapshot.</div>}
        <div className="snapshot-line"><span>Viewing {navLabel}</span><span>Last synced {updatedLabel}</span></div>

        {view === "Overview" && <OverviewView summary={monthlySummary} categorySpend={categorySpend} spendingTrend={spendingTrend} transactions={latestTransactions} currentAssets={currentAssets} totalDebt={debtTotals} netWorthHistory={netWorthHistory} onNavigate={onViewChange} />}
        {view === "Spending" && <SpendingView categorySpend={categorySpend} transactions={monthTransactions} summary={monthlySummary} />}
        {view === "Investments" && <InvestmentsView investments={investments} yearData={investmentYearData} plans={investmentPlans} />}
        {view === "Goals" && <GoalsView goals={fundedGoals} />}
        {view === "Assets" && <AssetsView properties={properties} deposits={deposits} metals={metalItems} metalRates={metalRates} debts={debts} loans={loans} />}
        <footer className="dashboard-footer"><ShieldCheck size={14} /> This is a read-only view. Make changes in the Expense Manager app.</footer>
      </main>
    </div>
  );
}

function OverviewView({ summary, categorySpend, spendingTrend, transactions, currentAssets, totalDebt, netWorthHistory, onNavigate }: {
  summary: { monthlyBudget: number; totalSpent: number; remaining: number };
  categorySpend: { name: string; amount: number }[];
  spendingTrend: { month: string; spent: number; budget: number }[];
  transactions: Transaction[];
  currentAssets: number;
  totalDebt: number;
  netWorthHistory: AnyRecord[];
  onNavigate: (view: View) => void;
}) {
  const spendPercent = summary.monthlyBudget > 0 ? Math.min(100, summary.totalSpent / summary.monthlyBudget * 100) : 0;
  return (
    <div className="view-stack">
      <section className="metric-grid">
        <MetricCard label="Monthly budget" value={currency(summary.monthlyBudget)} icon={Wallet} tone="mint" note="Current selected month" />
        <MetricCard label="Spent / allocated" value={currency(summary.totalSpent)} icon={CircleDollarSign} tone="peach" note={`${Math.round(spendPercent)}% of monthly budget`} />
        <MetricCard label="Available" value={currency(summary.remaining)} icon={Activity} tone={summary.remaining >= 0 ? "blue" : "rose"} note="Budget less allocations and spend" />
        <MetricCard label="Tracked assets" value={currency(currentAssets)} icon={TrendingUp} tone="lavender" note={`Debt tracked ${currency(totalDebt)}`} />
      </section>
      <div className="chart-grid">
        <Panel title="Monthly cash flow" subtitle="Spending and budget through the selected year" action={<button className="text-action" onClick={() => onNavigate("Spending")}>View spending <ChevronDown size={14} className="rotate-[-90deg]" /></button>}>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={spendingTrend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs><linearGradient id="spentFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#23866d" stopOpacity={0.25} /><stop offset="95%" stopColor="#23866d" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#e9eeeb" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#87928c", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#87928c", fontSize: 10 }} tickFormatter={(value) => `${(value / 100000).toFixed(1)}L`} />
              <Tooltip formatter={(value: number) => currency(value)} contentStyle={{ borderRadius: 10, border: "1px solid #e6ece8" }} />
              <Area type="monotone" dataKey="budget" name="Budget" stroke="#d5a555" strokeDasharray="4 4" fill="transparent" strokeWidth={1.5} />
              <Area type="monotone" dataKey="spent" name="Spent / allocated" stroke="#23866d" fill="url(#spentFill)" strokeWidth={2.5} />
            </AreaChart></ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Where it went" subtitle="Selected month by fund">
          {categorySpend.length ? <div className="donut-layout">
            <div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categorySpend} dataKey="amount" nameKey="name" innerRadius={56} outerRadius={82} paddingAngle={3} stroke="none">{categorySpend.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={(value: number) => currency(value)} /></PieChart></ResponsiveContainer></div>
            <div className="legend-list">{categorySpend.slice(0, 6).map((item, index) => <div className="legend-row" key={item.name}><i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} /><span>{item.name}</span><b>{currency(item.amount)}</b></div>)}</div>
          </div> : <EmptyState message="No fund allocations recorded for this month." />}
        </Panel>
      </div>
      {netWorthHistory.length > 1 && <Panel title="Net worth trend" subtitle="Historical snapshots stored by the app"><div className="chart-area short-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={netWorthHistory} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}><CartesianGrid vertical={false} stroke="#e9eeeb" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#87928c", fontSize: 10 }} tickFormatter={(value) => String(value).slice(5)} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#87928c", fontSize: 10 }} tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`} /><Tooltip formatter={(value: number) => currency(value)} /><Line type="monotone" dataKey="netWorth" name="Net worth" stroke="#23866d" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="netWorthWithLoans" name="Net worth after loans" stroke="#d5a555" strokeWidth={1.8} dot={false} /></LineChart></ResponsiveContainer></div></Panel>}
      <Panel title="Recent activity" subtitle="Transactions recorded in the selected month" action={<button className="text-action" onClick={() => onNavigate("Spending")}>All activity <ChevronDown size={14} className="rotate-[-90deg]" /></button>}>
        <TransactionTable transactions={transactions.slice(0, 6)} />
      </Panel>
    </div>
  );
}

function SpendingView({ categorySpend, transactions, summary }: { categorySpend: { name: string; amount: number }[]; transactions: Transaction[]; summary: { monthlyBudget: number; totalSpent: number; remaining: number } }) {
  return <div className="view-stack">
    <section className="metric-grid metric-grid-three"><MetricCard label="Budget" value={currency(summary.monthlyBudget)} icon={Wallet} tone="mint" /><MetricCard label="Spent / allocated" value={currency(summary.totalSpent)} icon={CircleDollarSign} tone="peach" /><MetricCard label="Remaining" value={currency(summary.remaining)} icon={Activity} tone="blue" /></section>
    <Panel title="Spend by fund" subtitle="Amounts from the selected month"><div className="chart-area short-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={categorySpend} margin={{ top: 8, right: 8, bottom: 20, left: 0 }}><CartesianGrid vertical={false} stroke="#e9eeeb" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#77837c", fontSize: 10 }} angle={-15} textAnchor="end" /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#87928c", fontSize: 10 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} /><Tooltip formatter={(value: number) => currency(value)} /><Bar dataKey="amount" name="Amount" fill="#23866d" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel>
    <Panel title="Transactions" subtitle={`${transactions.length} records`}><TransactionTable transactions={transactions} /></Panel>
  </div>;
}

function InvestmentsView({ investments, yearData, plans }: { investments: AnyRecord[]; yearData: { month: string; allocated: number }[]; plans: AnyRecord[] }) {
  const invested = investments.reduce((sum, item) => sum + item.invested, 0);
  const current = investments.reduce((sum, item) => sum + item.currentValue, 0);
  return <div className="view-stack">
    <section className="metric-grid metric-grid-three"><MetricCard label="Invested" value={currency(invested)} icon={CircleDollarSign} tone="mint" /><MetricCard label="Current value" value={currency(current)} icon={TrendingUp} tone="blue" /><MetricCard label="Gain / loss" value={currency(current - invested)} icon={current >= invested ? ArrowUpRight : ArrowDownRight} tone={current >= invested ? "lavender" : "rose"} /></section>
    <Panel title="Monthly investment allocation" subtitle="Investment Fund budget by month"><div className="chart-area short-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={yearData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}><CartesianGrid vertical={false} stroke="#e9eeeb" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#87928c", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#87928c", fontSize: 10 }} tickFormatter={(value) => `₹${(value / 100000).toFixed(2)}L`} /><Tooltip formatter={(value: number) => currency(value)} /><Line type="monotone" dataKey="allocated" name="Allocated" stroke="#23866d" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></Panel>
    <Panel title="Investment profiles" subtitle={`${investments.length} profiles`}><div className="table-scroll"><table><thead><tr><th>Profile</th><th>Type</th><th>Invested</th><th>Value</th><th>Gain / loss</th></tr></thead><tbody>{investments.map((item) => <tr key={item.name}><td className="primary-cell">{item.name}</td><td>{item.type}</td><td>{currency(item.invested)}</td><td>{currency(item.currentValue)}</td><td className={item.pl >= 0 ? "positive" : "negative"}>{currency(item.pl)}</td></tr>)}</tbody></table></div>{!investments.length && <EmptyState message="No investment profiles for this month." />}</Panel>
    <Panel title="Diversification plans" subtitle={`${plans.length} saved strategies`}><div className="table-scroll"><table><thead><tr><th>Plan</th><th>Budget</th><th>Assets</th><th>Invested</th><th>Current value</th></tr></thead><tbody>{plans.map((plan) => { const items = plan.items || []; const assets = items.reduce((count: number, item: AnyRecord) => count + (item.subAssets || []).length, 0); const planInvested = items.reduce((sum: number, item: AnyRecord) => sum + (item.subAssets || []).reduce((sub: number, asset: AnyRecord) => sub + Number(asset.invested || 0), 0), 0); const planValue = items.reduce((sum: number, item: AnyRecord) => sum + (item.subAssets || []).reduce((sub: number, asset: AnyRecord) => sub + Number(asset.currentValue || 0), 0), 0); return <tr key={plan.id}><td className="primary-cell">{plan.name}</td><td>{currency(plan.budget)}</td><td>{assets}</td><td>{currency(planInvested)}</td><td>{currency(planValue)}</td></tr>; })}</tbody></table></div>{!plans.length && <EmptyState message="No diversification plans saved." />}</Panel>
  </div>;
}

function GoalsView({ goals }: { goals: AnyRecord[] }) {
  return <Panel title="Goals" subtitle={`${goals.length} financial goals`}><div className="goal-list">{goals.map((goal) => <article className="goal-row" key={goal.id}><div className="goal-head"><div><h3>{goal.name}</h3><span>Target {currency(goal.target)}</span></div><b>{percent(goal.progress)}</b></div><div className="progress-track"><i style={{ width: `${goal.progress}%` }} /></div><div className="goal-foot"><span>Funded {currency(goal.funded)}</span><span>Remaining {currency(Math.max(0, goal.target - goal.funded))}</span></div></article>)}</div>{!goals.length && <EmptyState message="No goals in the synced snapshot." />}</Panel>;
}

function AssetsView({ properties, deposits, metals, metalRates, debts, loans }: { properties: AnyRecord[]; deposits: AnyRecord; metals: AnyRecord[]; metalRates: AnyRecord; debts: AnyRecord[]; loans: AnyRecord[] }) {
  const assetRows = [
    ...properties.filter((item) => !item.loanInProgress).map((item) => ({ name: item.name, type: "Property", value: Number(item.totalSqft || 0) * Number(item.currentRatePerSqft || 0) })),
    ...(deposits.fds || []).map((item: AnyRecord) => ({ name: item.bankName, type: "Fixed deposit", value: Number(item.investedAmount || 0) })),
    ...(deposits.epf ? [{ name: "EPF / PPF", type: "Retirement", value: Number(deposits.epf.totalAccumulated || 0) }] : []),
    ...metals.map((item) => ({ name: item.name || item.type, type: item.type, value: Number(item.weight || 0) * Number(item.type === "Gold 22K" ? metalRates.gold22k : item.type === "Gold 24K" ? metalRates.gold24k : item.type === "Silver" ? metalRates.silver : metalRates.platinum || 0) })),
  ].sort((a, b) => b.value - a.value);
  const debtValue = debts.filter((item) => item.type === "owe").reduce((sum, item) => sum + Number(item.amount || 0), 0) + loans.reduce((sum, item) => sum + Number(item.totalOutstanding || 0), 0);
  return <div className="view-stack"><MetricCard label="Tracked liabilities" value={currency(debtValue)} icon={Landmark} tone="rose" /><Panel title="Assets" subtitle={`${assetRows.length} tracked records`}><div className="table-scroll"><table><thead><tr><th>Asset</th><th>Type</th><th>Current value</th></tr></thead><tbody>{assetRows.map((row, index) => <tr key={`${row.type}-${row.name}-${index}`}><td className="primary-cell">{row.name}</td><td>{row.type}</td><td>{currency(row.value)}</td></tr>)}</tbody></table></div>{!assetRows.length && <EmptyState message="No assets in the synced snapshot." />}</Panel></div>;
}

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  return <div className="table-scroll"><table><thead><tr><th>Date</th><th>Description</th><th>Fund</th><th>Payment</th><th>Amount</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id}><td>{item.date}</td><td className="primary-cell">{item.description || "Expense"}</td><td>{item.fundId.replace(/-/g, " ")}</td><td>{item.paymentMode || "—"}</td><td className="amount-cell">{currency(item.amount)}</td></tr>)}</tbody></table>{!transactions.length && <EmptyState message="No transactions recorded in this month." />}</div>;
}

function MetricCard({ label, value, icon: Icon, tone, note }: { label: string; value: string; icon: typeof Wallet; tone: string; note?: string }) {
  return <article className={`metric-card tone-${tone}`}><div className="metric-top"><span>{label}</span><i><Icon size={17} /></i></div><strong>{value}</strong>{note && <small>{note}</small>}</article>;
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="panel"><header className="panel-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>{children}</section>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="empty-state"><span><Activity size={18} /></span><p>{message}</p></div>;
}

export default App;
