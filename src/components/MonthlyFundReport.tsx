import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { ChevronLeft, ChevronRight, Edit2 } from "lucide-react";
import type { FundSection } from "@/hooks/useExpenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface MonthlyData {
  month: string;
  monthNum: number;
  year: number;
  totalAllocated: number;
  totalSpent: number;
  fundAllocations: Record<string, number>; // Fund ID -> allocated amount
  fundSpending: Record<string, number>; // Fund ID -> spent amount
}

interface MonthlyFundReportProps {
  sections: (FundSection & { totals: any })[];
  totalBudget: number;
  totalSpent: number;
  currentMonth: number;
  currentYear: number;
  monthlyHistory?: Record<string, any>; // Historical monthly data
  onUpdateMonth?: (year: number, month: number, data: any) => void;
}

const FUND_COLORS: Record<string, string> = {
  "daily-expenses": "#f59e0b",
  "investment-fund": "#6366f1",
  "hobby-fund": "#ec4899",
  "loan-fund": "#ef4444",
  "wishlist-fund": "#3b82f6",
  "learning-fund": "#14b8a6",
  "emergency-fund": "#10b981",
  "saving-fund": "#8b5cf6",
  "free-fund": "#94a3b8",
};

export function MonthlyFundReport({
  sections,
  totalBudget,
  totalSpent,
  currentMonth,
  currentYear,
  monthlyHistory = {},
  onUpdateMonth,
}: MonthlyFundReportProps) {
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [viewYear, setViewYear] = useState(currentYear);
  const [editingMonth, setEditingMonth] = useState<boolean>(false);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Check if we should show "Update Value" button
  const today = new Date();
  const currentDay = today.getDate();
  const isCurrentMonth = viewMonth === currentMonth && viewYear === currentYear;
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const isLastThreeDays = currentDay >= daysInCurrentMonth - 2; // Last 3 days of current month
  const isFirstOfMonth = currentDay === 1; // 1st of month
  const canShowUpdateButton = isCurrentMonth && isLastThreeDays && !isFirstOfMonth;

  // Calculate current month data (EXCLUDING investment/savings/emergency funds from total spent)
  const currentMonthData: MonthlyData = useMemo(() => {
    const fundAllocations: Record<string, number> = {};
    const fundSpending: Record<string, number> = {};

    // Funds to INCLUDE in total spent (actual expense funds)
    const expenseFundsToInclude = ["daily-expenses", "hobby-fund", "loan-fund", "wishlist-fund", "learning-fund"];

    // For daily-expenses fund: show monthly allocated and spent
    const dailyExpenses = sections.find(s => s.id === "daily-expenses");
    if (dailyExpenses) {
      fundAllocations["daily-expenses"] = dailyExpenses.expenses.reduce((sum, e) => sum + (e.estimated || 0), 0);
      fundSpending["daily-expenses"] = dailyExpenses.expenses.reduce((sum, e) => sum + (e.spent || 0), 0);
    }

    // For investment fund: show allocated amount (but NOT in total spent)
    const investmentFund = sections.find(s => s.id === "investment-fund");
    if (investmentFund) {
      fundAllocations["investment-fund"] = investmentFund.budget;
      fundSpending["investment-fund"] = investmentFund.expenses.reduce((sum, e) => sum + (e.spent || 0), 0);
    }

    // For other funds: show monthly allocated (estimated) and spent
    const otherFunds = sections.filter(s => !["daily-expenses", "investment-fund", "free-fund"].includes(s.id));
    otherFunds.forEach(fund => {
      fundAllocations[fund.id] = fund.expenses.reduce((sum, e) => sum + (e.estimated || 0), 0);
      fundSpending[fund.id] = fund.expenses.reduce((sum, e) => sum + (e.spent || 0), 0);
    });

    // Free fund
    const freeFund = sections.find(s => s.id === "free-fund");
    if (freeFund) {
      fundAllocations["free-fund"] = freeFund.budget;
      fundSpending["free-fund"] = 0; // Free fund typically not "spent"
    }

    // Calculate total spent EXCLUDING investment, savings, and emergency funds
    let calculatedTotalSpent = 0;
    expenseFundsToInclude.forEach(fundId => {
      calculatedTotalSpent += fundSpending[fundId] || 0;
    });

    return {
      month: monthNames[currentMonth],
      monthNum: currentMonth,
      year: currentYear,
      totalAllocated: totalBudget,
      totalSpent: calculatedTotalSpent, // Use calculated value, excluding investment/savings/emergency
      fundAllocations,
      fundSpending,
    };
  }, [sections, totalBudget, currentMonth, currentYear, monthNames]);

  // Get data for the viewed month
  // If there's updated data in monthlyHistory (from Update Values button), use that
  // Otherwise use calculated data for current month or historical data for past months
  const monthKey = `${viewYear}-${(viewMonth + 1).toString().padStart(2, "0")}`;
  const isPastMonth = viewYear < currentYear || (viewYear === currentYear && viewMonth < currentMonth);
  const viewedMonthData = monthlyHistory?.[monthKey] || (isPastMonth ? undefined : currentMonthData) || currentMonthData;

  // Calculate yearly data (12 months)
  const yearlyData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 12; i++) {
      const mKey = `${viewYear}-${(i + 1).toString().padStart(2, "0")}`;
      const mData = monthlyHistory?.[mKey];
      data.push({
        month: monthNames[i].slice(0, 3),
        allocated: mData?.totalAllocated || 0,
        spent: mData?.totalSpent || 0,
      });
    }
    return data;
  }, [viewYear, monthlyHistory, monthNames]);

  // Get fund breakdown data for current viewed month
  const fundBreakdownData = useMemo(() => {
    if (!viewedMonthData) return [];
    const data = [];
    Object.entries(viewedMonthData.fundSpending || {}).forEach(([fundId, spent]) => {
      const allocated = viewedMonthData.fundAllocations?.[fundId] || 0;
      const fundSection = sections.find(s => s.id === fundId);
      const fundName = fundSection?.name || fundId;
      
      if (allocated > 0 || spent > 0) {
        data.push({
          fund: fundName,
          allocated,
          spent,
          remaining: allocated - spent,
          percentage: allocated > 0 ? Math.round((spent / allocated) * 100) : 0,
        });
      }
    });
    return data;
  }, [viewedMonthData, sections]);

  const handlePreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    // Prevent navigation beyond current month
    const nextMonth = viewMonth + 1;
    if (viewYear === currentYear && nextMonth > currentMonth) {
      toast.error("Cannot view beyond current month");
      return;
    }
    if (viewYear > currentYear) {
      toast.error("Cannot view beyond current month");
      return;
    }

    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleUpdateValues = () => {
    // Prepare updated data
    const updatedData = {
      month: monthNames[viewMonth],
      monthNum: viewMonth,
      year: viewYear,
      totalAllocated: parseFloat(editValues.totalAllocated?.toString() || viewedMonthData.totalAllocated.toString()),
      totalSpent: parseFloat(editValues.totalSpent?.toString() || viewedMonthData.totalSpent.toString()),
      fundAllocations: viewedMonthData.fundAllocations,
      fundSpending: viewedMonthData.fundSpending,
    };

    if (onUpdateMonth) {
      onUpdateMonth(viewYear, viewMonth, updatedData);
    }

    toast.success(`Updated values for ${monthNames[viewMonth]} ${viewYear}`);
    setEditingMonth(false);
    setEditValues({});
  };

  const totalBudgetForMonth = viewedMonthData?.totalAllocated || 0;
  const totalSpentForMonth = viewedMonthData?.totalSpent || 0;

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-lg">Monthly Fund Report</h3>
            <p className="text-xs text-muted-foreground mt-1">Allocated vs Spent by Fund</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center min-w-32">
              <p className="font-semibold text-sm">
                {monthNames[viewMonth]} {viewYear}
              </p>
            </div>
            <button
              onClick={handleNextMonth}
              disabled={viewYear === currentYear && viewMonth >= currentMonth}
              className={`p-2 rounded-lg transition-colors ${
                viewYear === currentYear && viewMonth >= currentMonth
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-muted"
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Update Value Button - Only for last 3 days of current month when viewing it */}
        {canShowUpdateButton && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                <Edit2 className="h-4 w-4 mr-2" />
                Update Values for {monthNames[currentMonth]}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Update Monthly Values</AlertDialogTitle>
                <AlertDialogDescription>
                  Update the allocated budget and total spent for {monthNames[currentMonth]} {currentYear}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Allocated Budget (₹)</label>
                  <Input
                    type="number"
                    placeholder={totalBudgetForMonth.toString()}
                    defaultValue={totalBudgetForMonth}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        totalAllocated: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Spent (Excluding Investment/Savings/Emergency) (₹)</label>
                  <Input
                    type="number"
                    placeholder={totalSpentForMonth.toString()}
                    defaultValue={totalSpentForMonth}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        totalSpent: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleUpdateValues}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Update
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Show message when not viewing current month */}
        {!isCurrentMonth && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            ⓘ Update button only available when viewing current month ({monthNames[currentMonth]})
          </div>
        )}

        {/* Show message on 1st of month */}
        {isCurrentMonth && isFirstOfMonth && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            ⓘ Update button is disabled on the 1st of the month. Available from 28th-30th.
          </div>
        )}

        {/* Show message when not in last 3 days */}
        {isCurrentMonth && !isLastThreeDays && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            ⓘ Update button available from {daysInCurrentMonth - 2}th to {daysInCurrentMonth}th of the month
          </div>
        )}
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Total Allocated</p>
          <p className="text-2xl font-bold text-primary">
            ₹{totalBudgetForMonth.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Total Spent</p>
          <p className="text-2xl font-bold text-orange-600">
            ₹{totalSpentForMonth.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted-foreground">
            {totalBudgetForMonth > 0
              ? Math.round((totalSpentForMonth / totalBudgetForMonth) * 100)
              : 0}
            % of budget
          </p>
        </div>
      </div>

      {/* Fund Breakdown Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/50">
          <h4 className="font-semibold text-sm">Fund Breakdown for {monthNames[viewMonth]} {viewYear}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fund Name</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Allocated</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Spent</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Remaining</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">%</th>
              </tr>
            </thead>
            <tbody>
              {fundBreakdownData.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.fund}</td>
                  <td className="text-right px-4 py-3">₹{row.allocated.toLocaleString("en-IN")}</td>
                  <td className="text-right px-4 py-3">
                    <span className="font-semibold">₹{row.spent.toLocaleString("en-IN")}</span>
                  </td>
                  <td className="text-right px-4 py-3 text-muted-foreground">
                    ₹{row.remaining.toLocaleString("en-IN")}
                  </td>
                  <td className="text-right px-4 py-3">
                    <span
                      className={`font-semibold ${
                        row.percentage > 80
                          ? "text-red-600"
                          : row.percentage > 50
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {row.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Year Overview Chart */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h4 className="font-semibold text-sm">Year Overview {viewYear}</h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
              <Tooltip
                formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`}
                contentStyle={{
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Legend />
              <Bar dataKey="allocated" fill="#3b82f6" name="Allocated" radius={[8, 8, 0, 0]} />
              <Bar dataKey="spent" fill="#f59e0b" name="Spent" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spending Trend Line Chart */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h4 className="font-semibold text-sm">Monthly Spending Trend</h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yearlyData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
              <Tooltip
                formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`}
                contentStyle={{
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="spent"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ fill: "#f59e0b", r: 4 }}
                activeDot={{ r: 6 }}
                name="Total Spent"
              />
              <Line
                type="monotone"
                dataKey="allocated"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "#3b82f6", r: 4 }}
                name="Total Allocated"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
