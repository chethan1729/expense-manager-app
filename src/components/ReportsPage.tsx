import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, IndianRupee, ChevronRight, ChevronDown, BarChart3, Landmark, Wallet, Calendar, RotateCcw } from "lucide-react";
import type { FundSection } from "@/hooks/useExpenses";
import type { Transaction } from "@/hooks/useTransactions";
import { useNetWorthHistory } from "@/hooks/useNetWorthHistory";
import { MonthlyFundReport } from "@/components/MonthlyFundReport";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReportsPageProps {
  dashboardData: {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    sections: (FundSection & { totals: any })[];
  };
  totalFD: number;
  totalInvested: number;
  totalPropertyValue: number;
  totalOutstanding: number;
  totalEPF?: number;
  totalSBBalance?: number;
  totalLockedIn?: number;
  totalMetalsValue?: number;
  totalPersonalDebt?: number;
  transactions?: Record<string, Transaction[]>;
  currentMonth?: number;
  currentYear?: number;
  onMonthChange?: (month: number) => void;
  onYearChange?: (year: number) => void;
}

const INVESTMENT_COLORS = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"
];
const TYPE_COLORS: Record<string, string> = {
  "Equity": "#3b82f6",
  "Mutual Fund": "#10b981",
  "Crypto": "#f97316",
  "Other": "#94a3b8"
};
const FUND_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"
];
const AVAILABILITY_COLORS = {
  sb: "#3b82f6",
  fd: "#f59e0b",
  epf: "#10b981",
  invested: "#6366f1",
};

const BALANCE_TRACKING_IDS = ["hobby-fund", "loan-fund", "wishlist-fund", "learning-fund", "emergency-fund", "saving-fund"];

function AnimatedDoughnut({ data, colors, label }: { data: { name: string; value: number }[]; colors: string[]; label?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={2}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, ""]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(220,14%,89%)" }}
          />
          <Legend
            iconSize={8}
            iconType="circle"
            formatter={(value) => <span style={{ fontSize: 10 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReportCard({ title, subtitle, icon: Icon, iconColor, expanded, onToggle, children, totalLabel, totalValue }: {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  totalLabel?: string;
  totalValue?: number;
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className={`h-10 w-10 rounded-xl ${iconColor} flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm text-card-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-right shrink-0">
          {totalValue !== undefined && (
            <p className="font-heading font-bold text-sm text-primary">₹{totalValue.toLocaleString('en-IN')}</p>
          )}
          {totalLabel && <p className="text-[10px] text-muted-foreground">{totalLabel}</p>}
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t">
          <div className="pt-3">{children}</div>
        </div>
      )}
    </div>
  );
}

export function ReportsPage({ 
  dashboardData, 
  totalFD, 
  totalInvested, 
  totalPropertyValue, 
  totalOutstanding, 
  totalEPF = 0, 
  totalSBBalance = 0, 
  totalLockedIn = 0,
  totalMetalsValue = 0,
  totalPersonalDebt = 0,
  transactions = {},
  currentMonth = 0,
  currentYear = 2026,
  onMonthChange,
  onYearChange,
}: ReportsPageProps) {
  const { totalBudget, totalSpent, sections } = dashboardData;
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (id: string) => setExpanded(prev => prev === id ? null : id);
  
  // State for monthly history updates from the Update Values button
  const [monthlyHistoryUpdates, setMonthlyHistoryUpdates] = useState<Record<string, any>>({});
  
  // Merge transactions with updates
  const mergedMonthlyHistory = useMemo(() => {
    return { ...transactions, ...monthlyHistoryUpdates };
  }, [transactions, monthlyHistoryUpdates]);
  
  // Handle monthly fund report updates
  const handleUpdateMonthlyValues = (year: number, month: number, data: any) => {
    const monthKey = `${year}-${(month + 1).toString().padStart(2, "0")}`;
    setMonthlyHistoryUpdates(prev => ({
      ...prev,
      [monthKey]: data
    }));
  };
  
  const { getRecentHistory, resetHistory } = useNetWorthHistory();
  const netWorthHistory = getRecentHistory(90); // Get last 90 days

  const floatingAmount = Math.max(0, totalBudget - totalSpent - totalFD);

  // Investment doughnut data: investment items with current value
  const investmentSection = sections.find(s => s.id === "investment-fund");
  const investmentData = useMemo(() => {
    const items = investmentSection?.investmentItems || [];
    return items.filter(i => (i.currentValue || 0) > 0).map(i => ({
      name: i.name.length > 16 ? i.name.slice(0, 14) + "…" : i.name,
      value: i.currentValue,
    }));
  }, [investmentSection]);

  const allocationByType = useMemo(() => {
    const items = investmentSection?.investmentItems || [];
    const totals: Record<string, number> = {
      "Equity": 0,
      "Mutual Fund": 0,
      "Crypto": 0,
      "Other": 0
    };
    
    items.forEach(i => {
      const type = i.type || "Other";
      totals[type] = (totals[type] || 0) + (i.currentValue || 0);
    });

    return Object.entries(totals)
      .map(([name, value]) => ({ 
        name, 
        value,
        color: TYPE_COLORS[name] || TYPE_COLORS["Other"]
      }))
      .filter(d => d.value > 0);
  }, [investmentSection]);
  
  const totalInvestmentCV = investmentData.reduce((s, d) => s + d.value, 0);

  // Fund doughnut data: current balances for all funds except investment
  const fundData = useMemo(() => {
    const allFundEntries = sections
      .filter(s => s.id !== "investment-fund" && s.id !== "wife-investments")
      .map(s => {
        const val = (s.totals.currentBalance !== undefined) ? s.totals.currentBalance : s.totals.remaining;
        return { id: s.id, name: s.name.replace(" Fund", ""), value: Math.max(0, val) };
      })
      .filter(d => d.value > 0);

  // Grouping: free-fund under daily-expenses
    const dailyEntry = allFundEntries.find(d => d.id === "daily-expenses");
    const freeEntry = allFundEntries.find(d => d.id === "free-fund");
    const others = allFundEntries.filter(d => d.id !== "daily-expenses" && d.id !== "free-fund");

    const combinedValue = (dailyEntry?.value || 0) + (freeEntry?.value || 0);
    const result = [...others];
    if (combinedValue > 0) {
      result.unshift({ id: "daily-expenses", name: "Daily & Free", value: combinedValue });
    }
    return result;
  }, [sections]);

  // Net Worth Components according to user formula:
  // 1. Total current investment value (totalInvested passed as prop)
  // 2. Current remaining amount in monthly budget (Daily Expenses + Free Fund)
  const monthlyRemaining = sections
    .filter(s => s.id === "daily-expenses" || s.id === "free-fund")
    .reduce((sum, s) => sum + (s.totals.remaining || 0), 0);
  
  // 3. Total amount present in all funds (Cumulative balance tracking funds)
  const cumulativeTrackingBalance = sections
    .filter(s => ["hobby-fund", "loan-fund", "wishlist-fund", "learning-fund", "emergency-fund", "saving-fund"].includes(s.id))
    .reduce((sum, s) => sum + (s.totals.currentBalance || 0), 0);

  // Correct formula: Property + Investments + Metals + Deposited (FD/EPF) + Cash in Tracking Funds + Cash in Monthly Funds + Unallocated Cash - Debt
  const netWorth = totalPropertyValue + totalInvested + totalMetalsValue + totalFD + totalEPF + cumulativeTrackingBalance + monthlyRemaining + floatingAmount - totalPersonalDebt;
  const netWorthWithLoans = netWorth - totalOutstanding;
  const totalFundBalance = fundData.reduce((s, d) => s + d.value, 0);

  const handleResetHistory = () => {
    resetHistory(netWorth, netWorthWithLoans);
    toast.success("Net worth trend graph has been reset");
  };

  // Availability doughnut data
  const availData = useMemo(() => [
    { name: "Savings Bank", value: Math.max(0, totalSBBalance) },
    { name: "Fixed Deposits", value: totalFD },
    { name: "EPF / PPF", value: totalEPF },
    { name: "Invested", value: totalInvested },
  ].filter(d => d.value > 0), [totalSBBalance, totalFD, totalEPF, totalInvested]);

  // Available vs Locked-in
  const totalAvailableAmt = (totalSBBalance + totalFD + totalEPF + totalInvested);
  const lockedData = useMemo(() => [
    { name: "Available", value: Math.max(0, totalAvailableAmt - totalLockedIn) },
    { name: "Locked-in", value: totalLockedIn },
  ].filter(d => d.value > 0), [totalAvailableAmt, totalLockedIn]);

  return (
    <div className="space-y-5 pb-6">
      {/* Net Worth Banner */}
      <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-5 text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <IndianRupee className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Total Net Worth</span>
        </div>
        <p className="font-heading text-3xl font-bold text-primary">₹{netWorth.toLocaleString('en-IN')}</p>
        <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
          <span>Properties: <span className="font-semibold text-foreground">₹{totalPropertyValue.toLocaleString('en-IN')}</span></span>
          <span>Invested: <span className="font-semibold text-foreground">₹{totalInvested.toLocaleString('en-IN')}</span></span>
          <span>FD: <span className="font-semibold text-foreground">₹{totalFD.toLocaleString('en-IN')}</span></span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 opacity-80">
          Net worth with loans: <span className="font-semibold">₹{netWorthWithLoans.toLocaleString('en-IN')}</span>
        </p>
      </div>

      {/* Net Worth Trend Graph */}
      {netWorthHistory.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggle("networth-graph")}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Net Worth Trend</h3>
                <p className="text-xs text-muted-foreground">Last 90 days</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Trend Graph?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear all historical snapshots and start a new trend from today. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Reset Graph
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expanded === "networth-graph" ? "rotate-180" : ""}`} />
            </div>
          </div>

          {expanded === "networth-graph" && (
            <div className="space-y-4 pt-2 border-t">
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={netWorthHistory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `₹${value.toLocaleString("en-IN")}`,
                        value === (netWorthHistory[0]?.netWorth || 0) ? "Net Worth" : "Net Worth with Loans"
                      ]}
                      labelFormatter={(date) => {
                        const d = new Date(date);
                        return d.toLocaleDateString("en-IN");
                      }}
                      contentStyle={{
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        color: "#fff"
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netWorth" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                      name="Net Worth"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netWorthWithLoans" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={false}
                      name="Net Worth with Loans"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3 space-y-1">
                  <p className="text-muted-foreground uppercase font-semibold">Highest Net Worth</p>
                  <p className="font-bold text-emerald-700">
                    ₹{Math.max(...netWorthHistory.map(h => h.netWorth)).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 space-y-1">
                  <p className="text-muted-foreground uppercase font-semibold">Current Net Worth</p>
                  <p className="font-bold text-amber-700">
                    ₹{netWorth.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 space-y-1">
                  <p className="text-muted-foreground uppercase font-semibold">Lowest Net Worth</p>
                  <p className="font-bold text-blue-700">
                    ₹{Math.min(...netWorthHistory.map(h => h.netWorth)).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-3 space-y-1">
                  <p className="text-muted-foreground uppercase font-semibold">Change</p>
                  <p className={`font-bold ${(netWorth - netWorthHistory[0].netWorth) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {(netWorth - netWorthHistory[0].netWorth) >= 0 ? "+" : ""}₹{(netWorth - netWorthHistory[0].netWorth).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report Cards */}
      {/* 1. Investments */}
      <ReportCard
        title="Investments"
        subtitle={`${(investmentSection?.investmentItems || []).length} investment profiles`}
        icon={TrendingUp}
        iconColor="bg-emerald-100 text-emerald-700"
        expanded={expanded === "investments"}
        onToggle={() => toggle("investments")}
        totalLabel="Current Value"
        totalValue={totalInvestmentCV}
      >
        {investmentData.length > 0 ? (
          <div className="space-y-6">
            {/* Allocation by Type */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Allocation by Type</h4>
              <AnimatedDoughnut data={allocationByType} colors={allocationByType.map(d => d.color)} />
              <div className="grid grid-cols-2 gap-2 mt-4">
                {allocationByType.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-[11px]">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="flex-1 text-muted-foreground">{d.name}</span>
                    <span className="font-bold">₹{d.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Breakdown */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Profile Breakdown</h4>
              <AnimatedDoughnut data={investmentData} colors={INVESTMENT_COLORS} />
              <div className="space-y-2 mt-2">
                {(investmentSection?.investmentItems || []).filter(i => (i.currentValue || 0) > 0).map((item, i) => {
                  const pl = (item.currentValue || 0) - (item.invested || 0);
                  return (
                    <div key={item.id} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: INVESTMENT_COLORS[i % INVESTMENT_COLORS.length] }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-muted-foreground truncate block">{item.name}</span>
                        {item.type && <span className="text-[9px] text-muted-foreground/60">{item.type}</span>}
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${pl >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {pl >= 0 ? "+" : ""}₹{Math.abs(pl).toLocaleString('en-IN')}
                        </div>
                        <div className="font-bold">₹{(item.currentValue || 0).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center py-6 text-muted-foreground text-sm">No investment data to display.</p>
        )}
      </ReportCard>

      {/* 2. Funds */}
      <ReportCard
        title="Funds"
        subtitle="Current balance in each fund"
        icon={Wallet}
        iconColor="bg-violet-100 text-violet-700"
        expanded={expanded === "funds"}
        onToggle={() => toggle("funds")}
        totalLabel="Total Fund Balance"
        totalValue={totalFundBalance}
      >
        {fundData.length > 0 ? (
          <>
            <AnimatedDoughnut data={fundData} colors={FUND_COLORS} />
            <div className="space-y-4 mt-2">
              {fundData.map((d, i) => {
                // Find original section(s) for this entry
                const groupSections = d.id === "daily-expenses" 
                  ? sections.filter(s => s.id === "daily-expenses" || s.id === "free-fund")
                  : sections.filter(s => s.id === d.id || s.name.replace(" Fund", "") === d.name);

                return (
                  <div key={d.name} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ background: FUND_COLORS[i % FUND_COLORS.length] }} />
                      <span className="flex-1 font-semibold text-foreground uppercase tracking-wider text-[11px]">{d.name}</span>
                      <span className="font-bold">₹{d.value.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="pl-5 space-y-1.5 border-l border-muted ml-1.5">
                      {groupSections.map(s => (
                        <div key={s.id} className="space-y-1.5">
                          {s.expenses.map(e => {
                            const balance = (s.totals.currentBalance !== undefined) 
                              ? (e.totalAllocated || 0) - (e.totalSpent || 0)
                              : (e.estimated || 0) - (e.spent || 0);
                            
                            if (balance <= 0) return null;

                            return (
                              <div key={e.id} className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground truncate mr-2">{e.description}</span>
                                <span className="text-foreground/80 font-medium shrink-0">₹{balance.toLocaleString('en-IN')}</span>
                              </div>
                            );
                          })}
                          {s.id === "free-fund" && s.expenses.length === 0 && s.totals.remaining > 0 && (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">Unallocated Budget</span>
                              <span className="text-foreground/80 font-medium">₹{s.totals.remaining.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-center py-6 text-muted-foreground text-sm">No fund balance data to display.</p>
        )}
      </ReportCard>

      {/* 3. Availability */}
      <ReportCard
        title="Availability"
        subtitle="Where your money is parked"
        icon={BarChart3}
        iconColor="bg-sky-100 text-sky-700"
        expanded={expanded === "availability"}
        onToggle={() => toggle("availability")}
        totalLabel="Total tracked"
        totalValue={totalAvailableAmt}
      >
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase">Savings Bank</p>
              <p className="font-bold text-blue-600">₹{Math.max(0, totalSBBalance).toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase">Fixed Deposits</p>
              <p className="font-bold text-amber-600">₹{totalFD.toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3 space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase">EPF / PPF</p>
              <p className="font-bold text-emerald-600">₹{totalEPF.toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 p-3 space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase">Invested</p>
              <p className="font-bold text-violet-600">₹{totalInvested.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Where money is parked doughnut */}
          {availData.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground">Where Your Money Is</p>
              <AnimatedDoughnut
                data={availData}
                colors={[AVAILABILITY_COLORS.sb, AVAILABILITY_COLORS.fd, AVAILABILITY_COLORS.epf, AVAILABILITY_COLORS.invested]}
              />
            </>
          )}

          {/* Available vs Locked-In doughnut */}
          {lockedData.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground">Available vs Locked-In</p>
              <AnimatedDoughnut
                data={lockedData}
                colors={["#10b981", "#ef4444"]}
              />
              {totalLockedIn > 0 && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-400">
                  ₹{totalLockedIn.toLocaleString('en-IN')} is in lock-in period (FD / investments)
                </div>
              )}
            </>
          )}
        </div>
      </ReportCard>

      {/* 4. Daily Expenses Calendar */}
      {transactions && Object.keys(transactions).length > 0 && (
        <ReportCard
          title="Daily Expenses"
          subtitle="Daily transaction breakdown"
          icon={Calendar}
          iconColor="bg-orange-100 text-orange-700"
          expanded={expanded === "daily-expenses"}
          onToggle={() => toggle("daily-expenses")}
        >
          <div className="space-y-3">
            {(() => {
              const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
              ];
              
              const [navMonth, setNavMonth] = useState(currentMonth);
              const [navYear, setNavYear] = useState(currentYear);
              
              const monthKey = `${navYear}-${(navMonth + 1).toString().padStart(2, "0")}`;
              const monthTransactions = transactions[monthKey] || [];
              
              // Calculate daily totals
              const dailyTotals: Record<string, number> = {};
              monthTransactions.forEach((transaction) => {
                const date = transaction.date;
                dailyTotals[date] = (dailyTotals[date] || 0) + transaction.amount;
              });

              const monthTotal = Object.values(dailyTotals).reduce((sum, val) => sum + val, 0);
              const daysWithTransactions = Object.keys(dailyTotals).length;

              const getDaysInMonth = (month: number, year: number): number => {
                return new Date(year, month + 1, 0).getDate();
              };

              const getFirstDayOfMonth = (month: number, year: number): number => {
                return new Date(year, month, 1).getDay();
              };

              const daysInMonth = getDaysInMonth(navMonth, navYear);
              const firstDay = getFirstDayOfMonth(navMonth, navYear);
              const days: (number | null)[] = [];

              for (let i = 0; i < firstDay; i++) {
                days.push(null);
              }
              for (let i = 1; i <= daysInMonth; i++) {
                days.push(i);
              }

              const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

              // Heatmap color function
              const getHeatmapColor = (amount: number) => {
                if (amount <= 100) {
                  return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700";
                } else if (amount <= 1000) {
                  return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700";
                } else if (amount <= 5000) {
                  return "bg-red-300 dark:bg-red-800/50 text-red-900 dark:text-red-300 border border-red-400 dark:border-red-600";
                } else {
                  return "bg-red-600 dark:bg-red-900 text-white border border-red-700 dark:border-red-800";
                }
              };

              // Payment mode breakdown
              const upiTotal = monthTransactions
                .filter((t) => !t.paymentMode || t.paymentMode === 'upi')
                .reduce((sum, t) => sum + t.amount, 0);
              const cardTotal = monthTransactions
                .filter((t) => t.paymentMode === 'credit-card')
                .reduce((sum, t) => sum + t.amount, 0);
              const cashTotal = monthTransactions
                .filter((t) => t.paymentMode === 'cash')
                .reduce((sum, t) => sum + t.amount, 0);

              const handlePrevMonth = () => {
                if (navMonth === 0) {
                  setNavMonth(11);
                  setNavYear(navYear - 1);
                } else {
                  setNavMonth(navMonth - 1);
                }
              };

              const handleNextMonth = () => {
                if (navMonth === 11) {
                  setNavMonth(0);
                  setNavYear(navYear + 1);
                } else {
                  setNavMonth(navMonth + 1);
                }
              };

              return (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-3 space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase">Total This Month</p>
                      <p className="font-bold text-orange-600">₹{monthTotal.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase">Avg Per Day</p>
                      <p className="font-bold text-blue-600">
                        ₹{daysWithTransactions > 0 ? Math.ceil(monthTotal / daysWithTransactions).toLocaleString('en-IN') : '0'}
                      </p>
                    </div>
                  </div>

                  {/* Mini Calendar with Month Navigation */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={handlePrevMonth}
                        className="p-1.5 hover:bg-muted rounded transition-colors"
                        title="Previous Month"
                      >
                        <ChevronRight className="h-4 w-4 rotate-180" />
                      </button>
                      <p className="text-sm font-semibold text-foreground">
                        {monthNames[navMonth]} {navYear}
                      </p>
                      <button
                        onClick={handleNextMonth}
                        className="p-1.5 hover:bg-muted rounded transition-colors"
                        title="Next Month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {weekDays.map((day) => (
                        <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground p-1">
                          {day}
                        </div>
                      ))}
                      {days.map((day, index) => {
                        const dateStr = day
                          ? `${navYear}-${(navMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
                          : null;
                        const daily = dateStr ? dailyTotals[dateStr] || 0 : 0;
                        const hasTransactions = dateStr && dailyTotals[dateStr];

                        return (
                          <div key={index} className="aspect-square">
                            {day ? (
                              <div
                                className={`h-full rounded p-1 text-[10px] font-semibold flex flex-col items-center justify-center transition-all ${
                                  hasTransactions
                                    ? getHeatmapColor(daily)
                                    : "bg-muted/30 text-muted-foreground"
                                }`}
                              >
                                <span>{day}</span>
                                {hasTransactions && (
                                  <span className="text-[8px] leading-tight">
                                    ₹{Math.ceil(daily).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Mode Breakdown */}
                  {monthTransactions.length > 0 && (
                    <div className="space-y-3 border-t pt-4">
                      <h4 className="text-sm font-semibold">Payment Mode Breakdown</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 text-center space-y-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">UPI / Net Banking</p>
                          <p className="text-sm font-bold text-blue-700 dark:text-blue-400">₹{upiTotal.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 p-3 text-center space-y-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Credit Card</p>
                          <p className="text-sm font-bold text-orange-700 dark:text-orange-400">₹{cardTotal.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 p-3 text-center space-y-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Cash</p>
                          <p className="text-sm font-bold text-purple-700 dark:text-purple-400">₹{cashTotal.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </ReportCard>
      )}

      {/* 5. Monthly Fund Report */}
      <ReportCard
        title="Monthly Fund Report"
        subtitle="Allocated vs Spent by Fund"
        icon={BarChart3}
        iconColor="bg-blue-100 text-blue-700"
        expanded={expanded === "monthly-fund-report"}
        onToggle={() => toggle("monthly-fund-report")}
      >
        <MonthlyFundReport
          sections={sections}
          totalBudget={totalBudget}
          totalSpent={totalSpent}
          currentMonth={currentMonth}
          currentYear={currentYear}
          monthlyHistory={mergedMonthlyHistory}
          onUpdateMonth={handleUpdateMonthlyValues}
        />
      </ReportCard>
    </div>
  );
}
