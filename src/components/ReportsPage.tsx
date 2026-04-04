import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, IndianRupee } from "lucide-react";
import type { FundSection } from "@/hooks/useExpenses";

interface ReportsPageProps {
  dashboardData: {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    sections: (FundSection & { totals: { estimated: number; spent: number; remaining: number } })[];
  };
  totalFD: number;
  totalInvested: number;
  totalPropertyValue: number;
  totalOutstanding: number;
}

const COLORS = ["hsl(152,58%,42%)", "hsl(38,92%,55%)", "hsl(0,72%,51%)", "hsl(220,70%,55%)", "hsl(280,60%,55%)", "hsl(180,50%,45%)", "hsl(330,60%,50%)", "hsl(60,70%,50%)", "hsl(120,40%,50%)"];

export function ReportsPage({ dashboardData, totalFD, totalInvested, totalPropertyValue, totalOutstanding }: ReportsPageProps) {
  const { totalBudget, totalSpent, sections } = dashboardData;
  const totalAllocated = sections.reduce((s, sec) => s + sec.totals.estimated, 0);
  const floatingAmount = Math.max(0, totalBudget - totalSpent - totalFD);
  const netWorth = totalPropertyValue + totalInvested + totalFD + floatingAmount - totalOutstanding;

  const budgetData = useMemo(() => [
    { name: "Budget", value: totalBudget },
    { name: "Allocated", value: totalAllocated },
    { name: "Spent", value: totalSpent },
  ], [totalBudget, totalAllocated, totalSpent]);

  const investmentBreakdown = useMemo(() => [
    { name: "Invested", value: totalInvested },
    { name: "Fixed Deposits", value: totalFD },
    { name: "Floating", value: floatingAmount },
  ].filter((d) => d.value > 0), [totalInvested, totalFD, floatingAmount]);

  const spendingByFund = useMemo(() =>
    sections.filter((s) => s.totals.spent > 0).map((s) => ({ name: s.name.replace(" Fund", ""), value: s.totals.spent })),
    [sections]
  );

  const netWorthBreakdown = useMemo(() => [
    { name: "Properties", value: totalPropertyValue },
    { name: "Investments", value: totalInvested },
    { name: "Fixed Deposits", value: totalFD },
    { name: "Cash/Float", value: floatingAmount },
  ].filter((d) => d.value > 0), [totalPropertyValue, totalInvested, totalFD, floatingAmount]);

  return (
    <div className="space-y-6">
      {/* Net Worth */}
      <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-5 text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <IndianRupee className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Net Worth</span>
        </div>
        <p className="font-heading text-3xl font-bold text-primary">₹{netWorth.toLocaleString()}</p>
        {totalOutstanding > 0 && (
          <p className="text-xs text-muted-foreground">After deducting ₹{totalOutstanding.toLocaleString()} in loans</p>
        )}
      </div>

      {/* Budget Overview */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-heading font-semibold text-sm text-card-foreground">Budget Overview</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,89%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Amount"]} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {budgetData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Investment & FD Breakdown */}
      {investmentBreakdown.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-heading font-semibold text-sm text-card-foreground">Investment Breakdown</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={investmentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {investmentBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Spending by Fund */}
      {spendingByFund.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-heading font-semibold text-sm text-card-foreground">Spending by Fund</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingByFund} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,89%)" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {spendingByFund.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Net Worth Breakdown */}
      {netWorthBreakdown.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-heading font-semibold text-sm text-card-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Net Worth Breakdown
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={netWorthBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {netWorthBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i + 3]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
