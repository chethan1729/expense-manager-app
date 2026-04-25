import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Transaction } from "@/hooks/useTransactions";

interface DailyExpensesReportProps {
  transactions: Record<string, Transaction[]>;
  currentMonth: number;
  currentYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export function DailyExpensesReport({
  transactions,
  currentMonth,
  currentYear,
  onMonthChange,
  onYearChange,
}: DailyExpensesReportProps) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (month: number, year: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const monthKey = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}`;
  const monthTransactions = transactions[monthKey] || [];

  // Calculate daily totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    monthTransactions.forEach((transaction) => {
      const date = transaction.date;
      totals[date] = (totals[date] || 0) + transaction.amount;
    });
    return totals;
  }, [monthTransactions]);

  // Generate calendar grid
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const days: (number | null)[] = [];

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthTotal = Object.values(dailyTotals).reduce((sum, val) => sum + val, 0);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getHeatmapColor = (amount: number) => {
    if (amount <= 100) {
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700";
    } else if (amount <= 1000) {
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700";
    } else if (amount <= 5000) {
      return "bg-red-300 dark:bg-red-800/50 text-red-900 dark:text-red-300 border-red-400 dark:border-red-600";
    } else {
      return "bg-red-600 dark:bg-red-900 text-white border-red-700 dark:border-red-800";
    }
  };

  const getPreviousMonth = () => {
    if (currentMonth === 0) {
      onYearChange(currentYear - 1);
      onMonthChange(11);
    } else {
      onMonthChange(currentMonth - 1);
    }
  };

  const getNextMonth = () => {
    if (currentMonth === 11) {
      onYearChange(currentYear + 1);
      onMonthChange(0);
    } else {
      onMonthChange(currentMonth + 1);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-xl font-bold font-heading">Daily Expenses</h2>
        <p className="text-xs text-muted-foreground">View your daily spending</p>
      </div>

      {/* Month/Year Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={getPreviousMonth}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="text-center flex-1">
          <h3 className="text-lg font-bold">{monthNames[currentMonth]} {currentYear}</h3>
        </div>

        <button
          onClick={getNextMonth}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Summary Card */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Spent This Month</p>
            <p className="text-2xl font-bold text-primary">
              ₹{monthTotal.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Average Per Day</p>
            <p className="text-xl font-semibold">
              ₹{monthTransactions.length > 0 ? Math.ceil(monthTotal / Object.keys(dailyTotals).length).toLocaleString("en-IN") : "0"}
            </p>
          </div>
        </div>
      </Card>

      {/* Calendar Grid */}
      <div className="space-y-3">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-muted-foreground p-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const dateStr = day
              ? `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
              : null;
            const daily = dateStr ? dailyTotals[dateStr] || 0 : 0;
            const hasTransactions = dateStr && dailyTotals[dateStr];

            return (
              <div key={index} className="aspect-square">
                {day ? (
                  <div
                    className={`h-full rounded-lg border p-2 flex flex-col items-center justify-between transition-all ${
                      hasTransactions
                        ? getHeatmapColor(daily)
                        : "bg-muted/30 border-muted text-muted-foreground"
                    }`}
                  >
                    <span className="text-xs font-semibold">{day}</span>
                    {hasTransactions && (
                      <span className="text-[10px] font-bold text-center">
                        ₹{daily.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-full bg-transparent" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Breakdown */}
      {monthTransactions.length > 0 && (
        <>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Daily Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(dailyTotals)
                .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                .map(([date, total]) => {
                  const dateObj = new Date(date);
                  const dateStr = dateObj.toLocaleDateString("en-IN", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  const dayTransactions = monthTransactions.filter(
                    (t) => t.date === date
                  );

                  return (
                    <Card
                      key={date}
                      className="p-3 bg-card/80 border-none shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{dateStr}</span>
                        <span className="text-sm font-bold text-primary">
                          ₹{total.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {dayTransactions.map((t) => (
                          <div key={t.id} className="flex justify-between">
                            <span>{t.description || "Transaction"}</span>
                            <span>₹{t.amount.toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
            </div>
          </div>

          {/* Payment Mode Breakdown */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold">Payment Mode Breakdown</h3>
            <div className="grid grid-cols-3 gap-2">
              {(() => {
                const upiTotal = monthTransactions
                  .filter((t) => !t.paymentMode || t.paymentMode === 'upi')
                  .reduce((sum, t) => sum + t.amount, 0);
                const cardTotal = monthTransactions
                  .filter((t) => t.paymentMode === 'credit-card')
                  .reduce((sum, t) => sum + t.amount, 0);
                const cashTotal = monthTransactions
                  .filter((t) => t.paymentMode === 'cash')
                  .reduce((sum, t) => sum + t.amount, 0);

                return (
                  <>
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
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
