import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowUpRight, Building2, Calendar, CalendarDays,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign,
  Eye, FolderOpen, HandCoins, Landmark, Layers,
  Lock, LockKeyhole, LogOut, MapPin, PieChart as PieIcon, RefreshCw,
  ShieldCheck, Target, TrendingDown, TrendingUp, Wallet, X, AlertCircle,
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

type View = "Overview" | "Spending" | "Investments" | "Goals" | "Debts" | "Properties" | "Availability" | "Assets";
const NAVIGATION: { name: View; icon: typeof Activity; label: string }[] = [
  { name: "Overview", icon: Activity, label: "Overview" },
  { name: "Spending", icon: Wallet, label: "Spending" },
  { name: "Investments", icon: TrendingUp, label: "Investments" },
  { name: "Goals", icon: Target, label: "Goals" },
  { name: "Debts", icon: Landmark, label: "Debts & Loans" },
  { name: "Properties", icon: Building2, label: "Properties" },
  { name: "Availability", icon: PieIcon, label: "Availability" },
  { name: "Assets", icon: CircleDollarSign, label: "Assets" },
];

const CHART_COLORS = ["#1f8068", "#e4ad55", "#5c91bd", "#d98062", "#8c78b4", "#55a8a0", "#cf7187", "#4f98ca", "#a267ac"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SNAPSHOT_TABLE = "expense_manager_snapshots";
const SNAPSHOT_KEY = "full_snapshot";
const MONTHLY_DATA_KEY = "expense-manager-monthly-v1";
const TRANSACTIONS_KEY = "expense-manager-transactions-v1";
const BALANCE_TRACKING_FUNDS = ["hobby-fund", "loan-fund", "wishlist-fund", "learning-fund", "emergency-fund", "saving-fund"];

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
          <p className="connect-copy">Connect to your Expense Manager snapshot to view your budgets, spending, investments, loans, and goals. This website is read-only.</p>
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
    logo: item.logo || "",
    label: item.label || "",
    labelColor: item.labelColor || "bg-primary",
    lockedInAmount: Number(item.lockedInAmount || 0),
  })), [investmentItems]);

  const investmentYearData = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const monthKey = `${currentYear}-${String(index + 1).padStart(2, "0")}`;
    const section = (monthlyData[monthKey]?.sections || []).find((item: Section) => item.id === "investment-fund");
    return { month: MONTHS[index], allocated: Number(section?.budget || 0) };
  }), [currentYear, monthlyData]);

  const fundedGoals = useMemo(() => goals.map((goal) => {
    const funded = (goal.fundingSources || []).reduce((sum: number, funding: AnyRecord) => sum + Number(funding.allocatedAmount || 0), 0);
    const target = Number(goal.targetAmount || 0);
    const progress = target > 0 ? (funded / target) * 100 : 0;
    let monthsLeft = 0;
    if (goal.targetDate) {
      const [tYear, tMonth] = goal.targetDate.split("-").map(Number);
      const now = new Date();
      monthsLeft = (tYear - now.getFullYear()) * 12 + (tMonth - 1 - now.getMonth());
    }
    const remaining = Math.max(0, target - funded);
    const perMonth = monthsLeft > 0 ? remaining / monthsLeft : remaining;

    return {
      ...goal,
      funded,
      target,
      progress,
      monthsLeft,
      remaining,
      perMonth,
      image: goal.image || "",
      subTargets: goal.subTargets || [],
    };
  }), [goals]);

  const totalInvested = investments.reduce((sum, item) => sum + item.currentValue, 0);
  const totalFD = Number(deposits.totalFDAmount || (deposits.fds || []).reduce((sum: number, fd: AnyRecord) => sum + Number(fd.investedAmount || 0), 0));
  const totalEPF = Number(deposits.epf?.totalAccumulated || 0);
  const totalMetals = metalItems.reduce((sum, item) => {
    const rate = Number(item.type === "Gold 22K" ? metalRates.gold22k : item.type === "Gold 24K" ? metalRates.gold24k : item.type === "Silver" ? metalRates.silver : metalRates.platinum || 0);
    return sum + (Number(item.weight || 0) * rate);
  }, 0);

  const currentAssets = properties.filter((property) => !property.loanInProgress).reduce((sum, property) => sum + Number(property.totalSqft || 0) * Number(property.currentRatePerSqft || 0), 0)
    + totalFD
    + totalEPF
    + totalInvested
    + totalMetals;

  const debtTotals = debts.filter((debt) => debt.type === "owe").reduce((sum, debt) => sum + Number(debt.amount || 0), 0)
    + loans.reduce((sum, loan) => sum + Number(loan.totalOutstanding || 0), 0);

  // Availability calculations
  const totalSBBalance = useMemo(() => {
    let total = 0;
    sections.forEach((s) => {
      if (BALANCE_TRACKING_FUNDS.includes(s.id)) {
        (s.expenses || []).forEach((e) => {
          const currentBal = (Number(e.totalAllocated) || 0) - (Number(e.totalSpent) || 0);
          const fdBal = e.isFD ? (Number(e.preExistingFD) || 0) : 0;
          total += (currentBal - fdBal);
        });
      }
    });
    return Math.max(0, total);
  }, [sections]);

  const totalLockedIn = useMemo(() => {
    const investmentLocked = investments.reduce((sum, i) => sum + (i.lockedInAmount || 0), 0);
    const savingSection = sections.find((s) => s.id === "saving-fund");
    const savingLocked = savingSection ? (savingSection.expenses || []).reduce((sum, e) => sum + Number(e.lockedInAmount || 0), 0) : 0;
    const fdLocked = (deposits.fds || []).filter((fd: AnyRecord) => fd.isLockedIn).reduce((sum: number, fd: AnyRecord) => sum + Number(fd.investedAmount || 0), 0);
    const epfLocked = deposits.epf?.isLockedIn ? totalEPF : 0;
    return investmentLocked + savingLocked + fdLocked + epfLocked;
  }, [investments, sections, deposits, totalEPF]);

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
          {NAVIGATION.map(({ name, icon: Icon, label }) => (
            <button key={name} onClick={() => onViewChange(name)} className={view === name ? "active" : ""}>
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
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
            <h1>{NAVIGATION.find((n) => n.name === view)?.label || view}</h1>
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
        {view === "Spending" && <SpendingView categorySpend={categorySpend} transactionsByMonth={transactionsByMonth} currentMonthKey={selectedMonth} summary={monthlySummary} />}
        {view === "Investments" && <InvestmentsView investments={investments} yearData={investmentYearData} plans={investmentPlans} />}
        {view === "Goals" && <GoalsView goals={fundedGoals} />}
        {view === "Debts" && <DebtsView debts={debts} loans={loans} />}
        {view === "Properties" && <PropertiesView properties={properties} />}
        {view === "Availability" && <AvailabilityView totalSB={totalSBBalance} totalFD={totalFD} totalEPF={totalEPF} totalInvested={totalInvested} totalLockedIn={totalLockedIn} sections={sections} />}
        {view === "Assets" && <AssetsView properties={properties} deposits={deposits} metals={metalItems} metalRates={metalRates} debts={debts} loans={loans} totalInvested={totalInvested} />}
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
  const spendPercent = summary.monthlyBudget > 0 ? Math.min(100, (summary.totalSpent / summary.monthlyBudget) * 100) : 0;
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

// -------------------------------------------------------------
// 3. SPENDING VIEW WITH CALENDAR-WISE DATA (FROM REPORTS PAGE)
// -------------------------------------------------------------
function SpendingView({ categorySpend, transactionsByMonth, currentMonthKey, summary }: {
  categorySpend: { name: string; amount: number }[];
  transactionsByMonth: Record<string, Transaction[]>;
  currentMonthKey: string;
  summary: { monthlyBudget: number; totalSpent: number; remaining: number };
}) {
  const [activeMonthKey, setActiveMonthKey] = useState(currentMonthKey);
  const [filterDay, setFilterDay] = useState<string | null>(null);

  useEffect(() => {
    setActiveMonthKey(currentMonthKey);
    setFilterDay(null);
  }, [currentMonthKey]);

  const [calYear, calMonth] = useMemo(() => {
    const parts = activeMonthKey.split("-").map(Number);
    return [parts[0] || new Date().getFullYear(), (parts[1] || 1) - 1];
  }, [activeMonthKey]);

  const monthTransactions = transactionsByMonth[activeMonthKey] || [];

  const handlePrevMonth = () => {
    let y = calYear;
    let m = calMonth - 1;
    if (m < 0) { m = 11; y -= 1; }
    setActiveMonthKey(`${y}-${String(m + 1).padStart(2, "0")}`);
    setFilterDay(null);
  };

  const handleNextMonth = () => {
    let y = calYear;
    let m = calMonth + 1;
    if (m > 11) { m = 0; y += 1; }
    setActiveMonthKey(`${y}-${String(m + 1).padStart(2, "0")}`);
    setFilterDay(null);
  };

  // Daily totals
  const dailyTotals: Record<string, number> = useMemo(() => {
    const totals: Record<string, number> = {};
    monthTransactions.forEach((t) => {
      totals[t.date] = (totals[t.date] || 0) + Number(t.amount || 0);
    });
    return totals;
  }, [monthTransactions]);

  const monthTotal = useMemo(() => Object.values(dailyTotals).reduce((sum, v) => sum + v, 0), [dailyTotals]);
  const daysWithSpend = useMemo(() => Object.keys(dailyTotals).length, [dailyTotals]);
  const avgPerDay = daysWithSpend > 0 ? Math.ceil(monthTotal / daysWithSpend) : 0;

  // Payment mode breakdown
  const upiTotal = useMemo(() => monthTransactions.filter((t) => !t.paymentMode || t.paymentMode === "upi").reduce((sum, t) => sum + Number(t.amount || 0), 0), [monthTransactions]);
  const cardTotal = useMemo(() => monthTransactions.filter((t) => t.paymentMode === "credit-card").reduce((sum, t) => sum + Number(t.amount || 0), 0), [monthTransactions]);
  const cashTotal = useMemo(() => monthTransactions.filter((t) => t.paymentMode === "cash").reduce((sum, t) => sum + Number(t.amount || 0), 0), [monthTransactions]);

  // Calendar cells
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(i);
    return cells;
  }, [daysInMonth, firstDayOfWeek]);

  const getHeatmapClass = (amount: number) => {
    if (amount <= 0) return "cal-cell-empty";
    if (amount <= 100) return "cal-heat-green";
    if (amount <= 1000) return "cal-heat-red-light";
    if (amount <= 5000) return "cal-heat-red-mid";
    return "cal-heat-red-heavy";
  };

  const displayedTransactions = useMemo(() => {
    if (!filterDay) return monthTransactions;
    return monthTransactions.filter((t) => t.date === filterDay);
  }, [monthTransactions, filterDay]);

  return (
    <div className="view-stack">
      <section className="metric-grid metric-grid-three">
        <MetricCard label="Budget" value={currency(summary.monthlyBudget)} icon={Wallet} tone="mint" />
        <MetricCard label="Spent / allocated" value={currency(summary.totalSpent)} icon={CircleDollarSign} tone="peach" />
        <MetricCard label="Remaining" value={currency(summary.remaining)} icon={Activity} tone="blue" />
      </section>

      {/* Calendar Breakdown Section */}
      <Panel
        title="Daily spending calendar"
        subtitle={`Heatmap and breakdown for ${MONTH_NAMES[calMonth]} ${calYear}`}
        action={
          <div className="calendar-nav-controls">
            <button className="icon-button-small" onClick={handlePrevMonth} title="Previous month"><ChevronLeft size={14} /></button>
            <span className="cal-nav-label">{MONTH_NAMES[calMonth].slice(0, 3)} {calYear}</span>
            <button className="icon-button-small" onClick={handleNextMonth} title="Next month"><ChevronRight size={14} /></button>
          </div>
        }
      >
        <div className="calendar-container">
          <div className="calendar-stats-row">
            <div className="cal-stat-card orange-tint">
              <span className="cal-stat-label">Total spent</span>
              <strong className="cal-stat-val text-orange">{currency(monthTotal)}</strong>
            </div>
            <div className="cal-stat-card blue-tint">
              <span className="cal-stat-label">Daily average</span>
              <strong className="cal-stat-val text-blue">{currency(avgPerDay)}</strong>
            </div>
            <div className="cal-stat-card green-tint">
              <span className="cal-stat-label">Active spend days</span>
              <strong className="cal-stat-val text-green">{daysWithSpend} days</strong>
            </div>
          </div>

          <div className="calendar-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="cal-day-header">{day}</div>
            ))}
            {calendarCells.map((dayNum, idx) => {
              if (dayNum === null) return <div key={`empty-${idx}`} className="cal-cell cal-cell-blank" />;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const amount = dailyTotals[dateStr] || 0;
              const isSelected = filterDay === dateStr;
              return (
                <div
                  key={dateStr}
                  className={`cal-cell ${getHeatmapClass(amount)} ${isSelected ? "cal-cell-selected" : ""}`}
                  onClick={() => setFilterDay((prev) => (prev === dateStr ? null : dateStr))}
                  title={`${dateStr}: ${amount > 0 ? currency(amount) : "No spend"} (Click to filter)`}
                >
                  <span className="cal-date-num">{dayNum}</span>
                  {amount > 0 && <span className="cal-date-amt">₹{Math.ceil(amount).toLocaleString("en-IN")}</span>}
                </div>
              );
            })}
          </div>

          <div className="cal-payment-modes">
            <div className="mode-pill"><span>UPI / Bank</span><b>{currency(upiTotal)}</b></div>
            <div className="mode-pill"><span>Credit card</span><b>{currency(cardTotal)}</b></div>
            <div className="mode-pill"><span>Cash</span><b>{currency(cashTotal)}</b></div>
          </div>
        </div>
      </Panel>

      <Panel title="Spend by fund" subtitle="Amounts allocated / spent from the selected month">
        <div className="chart-area short-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categorySpend} margin={{ top: 8, right: 8, bottom: 20, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#e9eeeb" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#77837c", fontSize: 10 }} angle={-15} textAnchor="end" />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#87928c", fontSize: 10 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => currency(value)} />
              <Bar dataKey="amount" name="Amount" fill="#23866d" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel
        title={`Transactions ${filterDay ? `on ${filterDay}` : `for ${formatMonth(activeMonthKey)}`}`}
        subtitle={`${displayedTransactions.length} records`}
        action={filterDay && <button className="text-action" onClick={() => setFilterDay(null)}>Show all month <X size={12} /></button>}
      >
        <TransactionTable transactions={displayedTransactions} />
      </Panel>
    </div>
  );
}

// -------------------------------------------------------------
// 2 & 7. INVESTMENTS VIEW WITH LOGOS & CURRENT VALUE DOUGHNUT GRAPH
// -------------------------------------------------------------
function InvestmentsView({ investments, yearData, plans }: { investments: AnyRecord[]; yearData: { month: string; allocated: number }[]; plans: AnyRecord[] }) {
  const invested = investments.reduce((sum, item) => sum + item.invested, 0);
  const current = investments.reduce((sum, item) => sum + item.currentValue, 0);
  const profitLoss = current - invested;

  // Doughnut data based on current value
  const doughnutData = useMemo(() => {
    return investments
      .filter((item) => Number(item.currentValue || 0) > 0)
      .map((item) => ({
        name: item.name,
        value: Number(item.currentValue || 0),
        invested: Number(item.invested || 0),
        logo: item.logo,
      }))
      .sort((a, b) => b.value - a.value);
  }, [investments]);

  return (
    <div className="view-stack">
      <section className="metric-grid metric-grid-three">
        <MetricCard label="Invested capital" value={currency(invested)} icon={CircleDollarSign} tone="mint" />
        <MetricCard label="Current value" value={currency(current)} icon={TrendingUp} tone="blue" />
        <MetricCard label="Total gain / loss" value={currency(profitLoss)} icon={profitLoss >= 0 ? ArrowUpRight : ArrowDownRight} tone={profitLoss >= 0 ? "lavender" : "rose"} note={invested > 0 ? `${(profitLoss / invested * 100).toFixed(1)}% total returns` : ""} />
      </section>

      {/* Doughnut Chart of Current Portfolio Value */}
      {doughnutData.length > 0 && (
        <Panel title="Portfolio distribution" subtitle="Current value breakdown across investment profiles">
          <div className="investment-donut-grid">
            <div className="donut-chart-container">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={doughnutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {doughnutData.map((item, index) => (
                      <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [currency(value), "Current Value"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center-info">
                <small>Total Value</small>
                <strong>{currency(current)}</strong>
              </div>
            </div>

            <div className="donut-legend-wrap">
              {doughnutData.map((item, index) => {
                const sharePct = current > 0 ? ((item.value / current) * 100).toFixed(1) : "0";
                return (
                  <div key={item.name} className="investment-legend-row">
                    <div className="legend-profile-name">
                      <span className="legend-dot" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      {item.logo ? (
                        <img src={item.logo} alt={item.name} className="mini-profile-logo" />
                      ) : (
                        <span className="mini-profile-fallback">{item.name.slice(0, 2).toUpperCase()}</span>
                      )}
                      <span className="profile-label-text">{item.name}</span>
                    </div>
                    <div className="legend-values">
                      <b>{currency(item.value)}</b>
                      <small>{sharePct}%</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      )}

      {/* Investment Profiles with Logos */}
      <Panel title="Investment profiles" subtitle={`${investments.length} profiles configured in app`}>
        <div className="investment-cards-grid">
          {investments.map((item) => {
            const isProfit = item.pl >= 0;
            const pct = item.invested > 0 ? (item.pl / item.invested) * 100 : 0;
            return (
              <div key={item.name} className="investment-profile-card">
                <div className="profile-card-top">
                  <div className="profile-avatar-wrap">
                    {item.logo ? (
                      <img src={item.logo} alt={item.name} className="profile-logo-img" />
                    ) : (
                      <div className="profile-logo-placeholder">{item.name.slice(0, 2).toUpperCase()}</div>
                    )}
                  </div>
                  <div className="profile-card-title">
                    <h3>{item.name}</h3>
                    <div className="profile-tags">
                      <span className="type-tag">{item.type}</span>
                      {item.label && <span className="custom-label-tag">{item.label}</span>}
                    </div>
                  </div>
                  {item.lockedInAmount > 0 && (
                    <span className="lock-pill" title="Locked-in capital">
                      <Lock size={10} /> {currency(item.lockedInAmount)}
                    </span>
                  )}
                </div>

                <div className="profile-metrics-row">
                  <div>
                    <span className="sub-label">Invested</span>
                    <strong className="sub-val">{currency(item.invested)}</strong>
                  </div>
                  <div>
                    <span className="sub-label">Current</span>
                    <strong className="sub-val">{currency(item.currentValue)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="sub-label">Gain / Loss</span>
                    <strong className={`sub-val ${isProfit ? "text-emerald" : "text-rose"}`}>
                      {isProfit ? "+" : ""}{currency(item.pl)} <small>({pct.toFixed(1)}%)</small>
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {!investments.length && <EmptyState message="No investment profiles recorded for this month." />}
      </Panel>

      <Panel title="Monthly investment allocation" subtitle="Investment Fund budget by month">
        <div className="chart-area short-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yearData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#e9eeeb" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#87928c", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#87928c", fontSize: 10 }} tickFormatter={(value) => `₹${(value / 100000).toFixed(2)}L`} />
              <Tooltip formatter={(value: number) => currency(value)} />
              <Line type="monotone" dataKey="allocated" name="Allocated" stroke="#23866d" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Diversification plans" subtitle={`${plans.length} saved strategies`}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Plan</th><th>Budget</th><th>Assets</th><th>Invested</th><th>Current value</th></tr>
            </thead>
            <tbody>
              {plans.map((plan) => {
                const items = plan.items || [];
                const assets = items.reduce((count: number, item: AnyRecord) => count + (item.subAssets || []).length, 0);
                const planInvested = items.reduce((sum: number, item: AnyRecord) => sum + (item.subAssets || []).reduce((sub: number, asset: AnyRecord) => sub + Number(asset.invested || 0), 0), 0);
                const planValue = items.reduce((sum: number, item: AnyRecord) => sum + (item.subAssets || []).reduce((sub: number, asset: AnyRecord) => sub + Number(asset.currentValue || 0), 0), 0);
                return (
                  <tr key={plan.id}>
                    <td className="primary-cell">{plan.name}</td>
                    <td>{currency(plan.budget)}</td>
                    <td>{assets}</td>
                    <td>{currency(planInvested)}</td>
                    <td>{currency(planValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!plans.length && <EmptyState message="No diversification plans saved." />}
      </Panel>
    </div>
  );
}

// -------------------------------------------------------------
// 4. GOALS VIEW WITH PHOTOS, ALIGNED CARDS & COLOR-CODED PROGRESS
// -------------------------------------------------------------
function GoalsView({ goals }: { goals: AnyRecord[] }) {
  const getGoalStatus = (goal: AnyRecord) => {
    if (goal.progress >= 100) return { label: "Achieved", hex: "#10b981", tagClass: "status-achieved" };
    if (goal.monthsLeft <= 0) return { label: "Overdue", hex: "#ef4444", tagClass: "status-overdue" };
    if (goal.progress >= 60) return { label: "On Track", hex: "#10b981", tagClass: "status-ontrack" };
    if (goal.progress >= 30) return { label: "Behind", hex: "#f59e0b", tagClass: "status-behind" };
    return { label: "At Risk", hex: "#f97316", tagClass: "status-atrisk" };
  };

  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target || 0), 0);
  const totalFunded = goals.reduce((sum, g) => sum + Number(g.funded || 0), 0);

  return (
    <div className="view-stack">
      <section className="metric-grid metric-grid-three">
        <MetricCard label="Active goals" value={String(goals.length)} icon={Target} tone="mint" />
        <MetricCard label="Total target" value={currency(totalTarget)} icon={CircleDollarSign} tone="blue" />
        <MetricCard label="Total funded" value={currency(totalFunded)} icon={TrendingUp} tone="lavender" note={totalTarget > 0 ? `${percent((totalFunded / totalTarget) * 100)} accumulated` : ""} />
      </section>

      <Panel title="Financial goals" subtitle="Target dates, funded amounts and progress">
        <div className="goals-card-grid">
          {goals.map((goal) => {
            const status = getGoalStatus(goal);
            const targetMonth = goal.targetDate ? formatMonth(goal.targetDate) : "";
            const clampedProgress = Math.min(100, Math.max(0, goal.progress));

            return (
              <article className="goal-card" key={goal.id}>
                {goal.image ? (
                  <div className="goal-card-header-img">
                    <img src={goal.image} alt={goal.name} />
                    <div className="goal-img-overlay" />
                    <div className="goal-img-content">
                      <div>
                        <h3>{goal.name}</h3>
                        <div className="goal-meta-chips">
                          {targetMonth && <span><Calendar size={11} /> {targetMonth}</span>}
                          <span className={`goal-status-pill ${status.tagClass}`}>{status.label}</span>
                        </div>
                      </div>
                      <div className="goal-percent-badge">{Math.round(goal.progress)}%</div>
                    </div>
                  </div>
                ) : (
                  <div className="goal-card-header-plain">
                    <div>
                      <h3>{goal.name}</h3>
                      <div className="goal-meta-chips">
                        {targetMonth && <span><Calendar size={11} /> {targetMonth}</span>}
                        <span className={`goal-status-pill ${status.tagClass}`}>{status.label}</span>
                      </div>
                    </div>
                    <div className="goal-percent-badge-plain" style={{ color: status.hex }}>
                      {Math.round(goal.progress)}%
                    </div>
                  </div>
                )}

                <div className="goal-card-body">
                  <div className="goal-amounts-row">
                    <div>
                      <small>Funded</small>
                      <strong>{currency(goal.funded)}</strong>
                    </div>
                    <div className="text-right">
                      <small>Target</small>
                      <strong>{currency(goal.target)}</strong>
                    </div>
                  </div>

                  <div className="goal-progress-track">
                    <div
                      className="goal-progress-fill"
                      style={{ width: `${clampedProgress}%`, backgroundColor: status.hex }}
                    />
                  </div>

                  <div className="goal-footer-row">
                    <span>Remaining {currency(goal.remaining)}</span>
                    {goal.monthsLeft > 0 ? (
                      <span className="timeline-hint">{goal.monthsLeft} mo left · Need {currency(goal.perMonth)}/mo</span>
                    ) : (
                      <span className="timeline-hint text-rose">Target date passed</span>
                    )}
                  </div>

                  {goal.subTargets && goal.subTargets.length > 0 && (
                    <div className="sub-targets-wrap">
                      <small className="sub-target-header">Sub-targets</small>
                      <div className="sub-target-tags">
                        {goal.subTargets.map((st: AnyRecord) => (
                          <span key={st.id || st.name} className="sub-target-chip">
                            {st.name} <b>{currency(st.amount)}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {!goals.length && <EmptyState message="No goals recorded in this snapshot." />}
      </Panel>
    </div>
  );
}

// -------------------------------------------------------------
// 1. DEBTS & ACTIVE LOANS VIEW WITH LOAN PHOTOS & TRANSACTIONS
// -------------------------------------------------------------
function DebtsView({ debts, loans }: { debts: AnyRecord[]; loans: AnyRecord[] }) {
  const [selectedLoan, setSelectedLoan] = useState<AnyRecord | null>(null);
  const [txMonthFilter, setTxMonthFilter] = useState("all");
  const [txYearFilter, setTxYearFilter] = useState("all");
  const [txKindFilter, setTxKindFilter] = useState("all");

  const totalOwe = debts.filter((d) => d.type === "owe").reduce((s, d) => s + Number(d.amount || 0), 0);
  const totalOwed = debts.filter((d) => d.type === "owed").reduce((s, d) => s + Number(d.amount || 0), 0);
  const totalOutstandingLoans = loans.reduce((s, l) => s + Number(l.totalOutstanding || 0), 0);

  // If viewing a single loan's transactions
  if (selectedLoan) {
    const rawTx: AnyRecord[] = selectedLoan.transactions || [];
    const years = Array.from(new Set(rawTx.map((t) => String(t.date || "").slice(0, 4)).filter(Boolean))).sort().reverse();
    const filteredTx = rawTx
      .filter((t) => txMonthFilter === "all" || String(t.date).slice(5, 7) === txMonthFilter)
      .filter((t) => txYearFilter === "all" || String(t.date).slice(0, 4) === txYearFilter)
      .filter((t) => txKindFilter === "all" || t.kind === txKindFilter)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const txTotalAmt = filteredTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const txPrincipal = filteredTx.reduce((sum, t) => sum + Number(t.principal || 0), 0);
    const txInterest = filteredTx.reduce((sum, t) => sum + Number(t.interest || 0), 0);

    return (
      <div className="view-stack">
        <button className="back-link-btn" onClick={() => setSelectedLoan(null)}>
          <ArrowLeft size={16} /> Back to Loans & Debts
        </button>

        <section className="loan-detail-hero">
          {selectedLoan.image && (
            <div className="loan-hero-img">
              <img src={selectedLoan.image} alt={selectedLoan.name} />
              <div className="loan-hero-overlay" />
            </div>
          )}
          <div className="loan-hero-content">
            <div className="loan-hero-title">
              <h2>{selectedLoan.name}</h2>
              <span className="loan-rate-pill">{selectedLoan.interestRate || 0}% p.a.</span>
            </div>
            <div className="loan-metrics-grid">
              <div><small>Sanctioned</small><strong>{currency(selectedLoan.totalSanctionedAmount || selectedLoan.sanctionedAmount)}</strong></div>
              <div><small>Disbursed</small><strong>{currency(selectedLoan.sanctionedAmount)}</strong></div>
              <div><small>Outstanding</small><strong className="text-rose">{currency(selectedLoan.totalOutstanding)}</strong></div>
              <div><small>Principal paid</small><strong className="text-emerald">{currency(selectedLoan.principalPaid)}</strong></div>
              <div><small>Interest paid</small><strong>{currency(selectedLoan.interestPaid)}</strong></div>
            </div>
          </div>
        </section>

        <Panel
          title="Loan payment transactions"
          subtitle={`${filteredTx.length} records in history`}
          action={
            <div className="loan-tx-filters">
              <select value={txMonthFilter} onChange={(e) => setTxMonthFilter(e.target.value)} className="filter-select">
                <option value="all">All months</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{MONTH_NAMES[i]}</option>
                ))}
              </select>
              <select value={txYearFilter} onChange={(e) => setTxYearFilter(e.target.value)} className="filter-select">
                <option value="all">All years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={txKindFilter} onChange={(e) => setTxKindFilter(e.target.value)} className="filter-select">
                <option value="all">All types</option>
                <option value="emi">EMI</option>
                <option value="pre-emi">Pre-EMI</option>
                <option value="lumpsum">Lumpsum</option>
                <option value="other">Other</option>
              </select>
            </div>
          }
        >
          <div className="loan-tx-summary-strip">
            <span>Filtered Paid: <b>{currency(txTotalAmt)}</b></span>
            <span>Principal: <b className="text-emerald">{currency(txPrincipal)}</b></span>
            <span>Interest: <b className="text-rose">{currency(txInterest)}</b></span>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Date</th><th>Type</th><th>Principal</th><th>Interest</th><th>Total paid</th></tr>
              </thead>
              <tbody>
                {filteredTx.map((tx) => (
                  <tr key={tx.id || `${tx.date}-${tx.amount}`}>
                    <td>{tx.date}</td>
                    <td className="primary-cell">
                      <span className="tx-kind-tag">{tx.transactionType || tx.kind || "EMI"}</span>
                    </td>
                    <td className="text-emerald">{currency(tx.principal || 0)}</td>
                    <td className="text-rose">{currency(tx.interest || 0)}</td>
                    <td className="amount-cell">{currency(tx.amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filteredTx.length && <EmptyState message="No transactions match the selected filters." />}
        </Panel>
      </div>
    );
  }

  return (
    <div className="view-stack">
      <section className="metric-grid">
        <MetricCard label="Active loans" value={String(loans.length)} icon={Landmark} tone="peach" />
        <MetricCard label="Loan outstanding" value={currency(totalOutstandingLoans)} icon={TrendingDown} tone="rose" />
        <MetricCard label="I owe (Personal)" value={currency(totalOwe)} icon={HandCoins} tone="peach" />
        <MetricCard label="Owed to me" value={currency(totalOwed)} icon={TrendingUp} tone="mint" />
      </section>

      {/* Active Loans Section */}
      <Panel title="Active loans" subtitle={`${loans.length} loans configured in app`}>
        <div className="loans-card-grid">
          {loans.map((loan) => {
            const principal = Number(loan.principalPaid || 0);
            const interest = Number(loan.interestPaid || 0);
            const totalPaid = principal + interest;
            const sanctioned = Number(loan.sanctionedAmount || loan.totalSanctionedAmount || 1);
            const progress = sanctioned > 0 ? Math.min(100, (principal / sanctioned) * 100) : 0;
            const txCount = (loan.transactions || []).length;

            return (
              <div key={loan.id} className="loan-card">
                {loan.image && (
                  <div className="loan-card-img-wrap">
                    <img src={loan.image} alt={loan.name} className="loan-card-img" />
                    <div className="loan-card-overlay" />
                    <div className="loan-overlay-title">
                      <h3>{loan.name}</h3>
                      <span className="rate-badge">{loan.interestRate || 0}% p.a.</span>
                    </div>
                  </div>
                )}

                <div className="loan-card-content">
                  {!loan.image && (
                    <div className="loan-card-plain-header">
                      <h3>{loan.name}</h3>
                      <span className="rate-badge">{loan.interestRate || 0}% p.a.</span>
                    </div>
                  )}

                  <div className="loan-stats-grid">
                    <div>
                      <small>Total sanctioned</small>
                      <strong>{currency(loan.totalSanctionedAmount || loan.sanctionedAmount)}</strong>
                    </div>
                    <div>
                      <small>Disbursed</small>
                      <strong>{currency(loan.sanctionedAmount)}</strong>
                    </div>
                    <div>
                      <small>Outstanding</small>
                      <strong className="text-rose">{currency(loan.totalOutstanding)}</strong>
                    </div>
                    <div>
                      <small>Total paid</small>
                      <strong className="text-emerald">{currency(totalPaid)}</strong>
                    </div>
                  </div>

                  <div className="loan-progress-wrap">
                    <div className="loan-progress-meta">
                      <span>Principal repayment progress</span>
                      <b>{Math.round(progress)}%</b>
                    </div>
                    <div className="loan-progress-bar">
                      <div className="loan-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="loan-card-footer">
                    <span className="tx-count-pill">{txCount} transactions</span>
                    <button
                      className="view-tx-btn"
                      onClick={() => {
                        setSelectedLoan(loan);
                        setTxMonthFilter("all");
                        setTxYearFilter("all");
                        setTxKindFilter("all");
                      }}
                    >
                      <Eye size={13} /> View transactions
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {!loans.length && <EmptyState message="No active loans recorded in this snapshot." />}
      </Panel>

      {/* Personal Debts Section */}
      <Panel title="Personal debts" subtitle={`${debts.length} personal debt records`}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Person</th><th>Type</th><th>Date</th><th>Description</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {debts.map((d) => (
                <tr key={d.id}>
                  <td className="primary-cell">{d.personName}</td>
                  <td>
                    <span className={`debt-type-pill ${d.type === "owe" ? "owe-pill" : "owed-pill"}`}>
                      {d.type === "owe" ? "I Owe" : "Owed to Me"}
                    </span>
                  </td>
                  <td>{d.date}</td>
                  <td>{d.description || "—"}</td>
                  <td className={`amount-cell ${d.type === "owe" ? "negative" : "positive"}`}>
                    {currency(d.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!debts.length && <EmptyState message="No personal debts recorded." />}
      </Panel>
    </div>
  );
}

// -------------------------------------------------------------
// 5. PROPERTIES VIEW WITH PHOTOS & EXTERNAL LINKS
// -------------------------------------------------------------
function PropertiesView({ properties }: { properties: AnyRecord[] }) {
  const totalValue = properties.filter((p) => !p.loanInProgress).reduce((s, p) => s + (Number(p.totalSqft || 0) * Number(p.currentRatePerSqft || 0)), 0);
  const totalPurchase = properties.filter((p) => !p.loanInProgress).reduce((s, p) => s + (Number(p.totalSqft || 0) * Number(p.purchaseRatePerSqft || 0)), 0);
  const totalAppreciation = totalValue - totalPurchase;
  const totalSqft = properties.reduce((s, p) => s + Number(p.totalSqft || 0), 0);

  return (
    <div className="view-stack">
      <section className="metric-grid">
        <MetricCard label="Properties owned" value={String(properties.length)} icon={Building2} tone="mint" />
        <MetricCard label="Current valuation" value={currency(totalValue)} icon={CircleDollarSign} tone="blue" />
        <MetricCard label="Net appreciation" value={currency(totalAppreciation)} icon={totalAppreciation >= 0 ? TrendingUp : TrendingDown} tone={totalAppreciation >= 0 ? "lavender" : "rose"} note={totalPurchase > 0 ? `+${((totalAppreciation / totalPurchase) * 100).toFixed(1)}% total gain` : ""} />
        <MetricCard label="Total area" value={`${totalSqft.toLocaleString("en-IN")} sqft`} icon={Layers} tone="peach" />
      </section>

      <Panel title="Real estate portfolio" subtitle="Properties configured with photos, valuation rates, and document links">
        <div className="properties-card-grid">
          {properties.map((p) => {
            const purchaseVal = Number(p.totalSqft || 0) * Number(p.purchaseRatePerSqft || 0);
            const currentVal = Number(p.totalSqft || 0) * Number(p.currentRatePerSqft || 0);
            const appreciation = currentVal - purchaseVal;
            const pct = purchaseVal > 0 ? (appreciation / purchaseVal) * 100 : 0;

            return (
              <article key={p.id} className="property-card">
                {p.image ? (
                  <div className="property-img-wrap">
                    <img src={p.image} alt={p.name} className="property-img" />
                    <div className="property-img-overlay" />
                    <div className="property-img-title">
                      <h3>{p.name}</h3>
                      {p.description && <p>{p.description}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="property-plain-header">
                    <h3>{p.name}</h3>
                    {p.description && <p>{p.description}</p>}
                  </div>
                )}

                <div className="property-card-body">
                  {p.loanInProgress && (
                    <div className="property-loan-banner">
                      <Lock size={12} /> Loan in progress · Excluded from active net worth
                    </div>
                  )}

                  <div className="property-metrics-row">
                    <div>
                      <small>Purchase value</small>
                      <strong>{currency(purchaseVal)}</strong>
                    </div>
                    <div>
                      <small>Current valuation</small>
                      <strong>{currency(currentVal)}</strong>
                    </div>
                    <div className="text-right">
                      <small>Appreciation</small>
                      <strong className={appreciation >= 0 ? "text-emerald" : "text-rose"}>
                        {appreciation >= 0 ? "+" : ""}{pct.toFixed(1)}%
                      </strong>
                    </div>
                  </div>

                  <p className="property-sqft-detail">
                    {p.totalSqft} sqft · ₹{Number(p.purchaseRatePerSqft || 0).toLocaleString("en-IN")}/sqft → ₹{Number(p.currentRatePerSqft || 0).toLocaleString("en-IN")}/sqft
                  </p>

                  {(p.locationUrl || p.driveUrl) && (
                    <div className="property-links-row">
                      {p.locationUrl && (
                        <a href={p.locationUrl} target="_blank" rel="noopener noreferrer" className="prop-link-pill link-maps">
                          <MapPin size={13} /> Location
                        </a>
                      )}
                      {p.driveUrl && (
                        <a href={p.driveUrl} target="_blank" rel="noopener noreferrer" className="prop-link-pill link-drive">
                          <FolderOpen size={13} /> Documents
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {!properties.length && <EmptyState message="No properties recorded in this snapshot." />}
      </Panel>
    </div>
  );
}

// -------------------------------------------------------------
// 6. CURRENT AVAILABILITY REPORT AS A SEPARATE SECTION
// -------------------------------------------------------------
function AvailabilityView({ totalSB, totalFD, totalEPF, totalInvested, totalLockedIn, sections }: {
  totalSB: number;
  totalFD: number;
  totalEPF: number;
  totalInvested: number;
  totalLockedIn: number;
  sections: Section[];
}) {
  const totalTracked = totalSB + totalFD + totalEPF + totalInvested;
  const liquidAvailable = Math.max(0, totalTracked - totalLockedIn);

  const parkedData = useMemo(() => [
    { name: "Savings Bank", value: Math.max(0, totalSB), color: "#0284c7" },
    { name: "Fixed Deposits", value: totalFD, color: "#d97706" },
    { name: "EPF / PPF", value: totalEPF, color: "#059669" },
    { name: "Invested", value: totalInvested, color: "#7c3aed" },
  ].filter((d) => d.value > 0), [totalSB, totalFD, totalEPF, totalInvested]);

  const lockInData = useMemo(() => [
    { name: "Available (Liquid)", value: liquidAvailable, color: "#10b981" },
    { name: "Locked-In", value: totalLockedIn, color: "#ef4444" },
  ].filter((d) => d.value > 0), [liquidAvailable, totalLockedIn]);

  const fundBalances = useMemo(() => {
    return sections
      .filter((s) => s.id !== "investment-fund" && s.id !== "wife-investments")
      .map((s) => {
        const bal = (s.expenses || []).reduce((sum, e) => {
          const currentBal = (Number(e.totalAllocated) || 0) - (Number(e.totalSpent) || 0);
          return sum + Math.max(0, currentBal);
        }, 0);
        return { id: s.id, name: s.name.replace(/ Fund$/, ""), balance: bal };
      })
      .filter((f) => f.balance > 0);
  }, [sections]);

  return (
    <div className="view-stack">
      <section className="metric-grid">
        <MetricCard label="Savings Bank (SB)" value={currency(totalSB)} icon={Wallet} tone="blue" note="Liquid checking / balance funds" />
        <MetricCard label="Fixed Deposits (FD)" value={currency(totalFD)} icon={Landmark} tone="peach" note="Secured deposits" />
        <MetricCard label="Retirement (EPF/PPF)" value={currency(totalEPF)} icon={ShieldCheck} tone="mint" note="Provident funds" />
        <MetricCard label="Invested capital" value={currency(totalInvested)} icon={TrendingUp} tone="lavender" note="Market portfolios" />
      </section>

      <div className="chart-grid">
        <Panel title="Where your money is parked" subtitle="Asset allocation across liquid and locked funds">
          <div className="donut-layout">
            <div className="donut-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={parkedData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={82} paddingAngle={3} stroke="none">
                    {parkedData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => currency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="legend-list">
              {parkedData.map((item) => (
                <div className="legend-row" key={item.name}>
                  <i style={{ background: item.color }} />
                  <span>{item.name}</span>
                  <b>{currency(item.value)}</b>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Available vs. Locked-in" subtitle="Liquidity overview of your tracked wealth">
          <div className="donut-layout">
            <div className="donut-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={lockInData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={82} paddingAngle={3} stroke="none">
                    {lockInData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => currency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="legend-list">
              {lockInData.map((item) => (
                <div className="legend-row" key={item.name}>
                  <i style={{ background: item.color }} />
                  <span>{item.name}</span>
                  <b>{currency(item.value)}</b>
                </div>
              ))}
            </div>
          </div>
          {totalLockedIn > 0 && (
            <div className="locked-in-notice">
              <AlertCircle size={14} />
              <span>{currency(totalLockedIn)} is currently in lock-in period (FDs, locked investments or EPF).</span>
            </div>
          )}
        </Panel>
      </div>

      {fundBalances.length > 0 && (
        <Panel title="Fund balances" subtitle="Current reserves remaining across categorized funds">
          <div className="fund-balance-grid">
            {fundBalances.map((fund) => (
              <div key={fund.id} className="fund-balance-card">
                <span className="fund-name">{fund.name}</span>
                <strong className="fund-val">{currency(fund.balance)}</strong>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// ASSETS & LIABILITIES VIEW
// -------------------------------------------------------------
function AssetsView({ properties, deposits, metals, metalRates, debts, loans, totalInvested }: {
  properties: AnyRecord[];
  deposits: AnyRecord;
  metals: AnyRecord[];
  metalRates: AnyRecord;
  debts: AnyRecord[];
  loans: AnyRecord[];
  totalInvested: number;
}) {
  const assetRows = [
    ...properties.filter((item) => !item.loanInProgress).map((item) => ({ name: item.name, type: "Property", value: Number(item.totalSqft || 0) * Number(item.currentRatePerSqft || 0) })),
    ...(deposits.fds || []).map((item: AnyRecord) => ({ name: item.bankName, type: "Fixed deposit", value: Number(item.investedAmount || 0) })),
    ...(deposits.epf ? [{ name: "EPF / PPF", type: "Retirement", value: Number(deposits.epf.totalAccumulated || 0) }] : []),
    ...(totalInvested > 0 ? [{ name: "Market Investments", type: "Equities / MFs", value: totalInvested }] : []),
    ...metals.map((item) => ({ name: item.name || item.type, type: item.type, value: Number(item.weight || 0) * Number(item.type === "Gold 22K" ? metalRates.gold22k : item.type === "Gold 24K" ? metalRates.gold24k : item.type === "Silver" ? metalRates.silver : metalRates.platinum || 0) })),
  ].sort((a, b) => b.value - a.value);

  const debtValue = debts.filter((item) => item.type === "owe").reduce((sum, item) => sum + Number(item.amount || 0), 0) + loans.reduce((sum, item) => sum + Number(item.totalOutstanding || 0), 0);

  return (
    <div className="view-stack">
      <MetricCard label="Tracked liabilities" value={currency(debtValue)} icon={Landmark} tone="rose" />
      <Panel title="Assets overview" subtitle={`${assetRows.length} tracked records`}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Asset</th><th>Type</th><th>Current value</th></tr>
            </thead>
            <tbody>
              {assetRows.map((row, index) => (
                <tr key={`${row.type}-${row.name}-${index}`}>
                  <td className="primary-cell">{row.name}</td>
                  <td>{row.type}</td>
                  <td>{currency(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!assetRows.length && <EmptyState message="No assets in the synced snapshot." />}
      </Panel>
    </div>
  );
}

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr><th>Date</th><th>Description</th><th>Fund</th><th>Payment</th><th>Amount</th></tr>
        </thead>
        <tbody>
          {transactions.map((item) => (
            <tr key={item.id}>
              <td>{item.date}</td>
              <td className="primary-cell">{item.description || "Expense"}</td>
              <td>{item.fundId.replace(/-/g, " ")}</td>
              <td>{item.paymentMode || "—"}</td>
              <td className="amount-cell">{currency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!transactions.length && <EmptyState message="No transactions recorded in this period." />}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, tone, note }: { label: string; value: string; icon: typeof Wallet; tone: string; note?: string }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-top"><span>{label}</span><i><Icon size={17} /></i></div>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <span><Activity size={18} /></span>
      <p>{message}</p>
    </div>
  );
}

export default App;
