import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, IndianRupee, ChevronRight, ChevronDown, BarChart3, Landmark, Wallet } from "lucide-react";
import type { FundSection } from "@/hooks/useExpenses";

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
  totalPersonalDebt = 0
}: ReportsPageProps) {
  const { totalBudget, totalSpent, sections } = dashboardData;
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (id: string) => setExpanded(prev => prev === id ? null : id);

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
      .filter(s => s.id !== "investment-fund")
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
    </div>
  );
}
