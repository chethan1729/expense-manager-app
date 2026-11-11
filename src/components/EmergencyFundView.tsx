import { useState, useMemo } from "react";
import { FundSection, Expense } from "@/hooks/useExpenses";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExpenseCard } from "./ExpenseCard";
import { AddExpenseDialog } from "./AddExpenseDialog";
import { Wallet, TrendingDown, TrendingUp, Landmark, Calendar, Target } from "lucide-react";

interface EmergencyFundViewProps {
  section: FundSection;
  onUpdateBudget: (budget: number) => void;
  onUpdatePlanningDuration: (duration: number) => void;
  onUpdateExpense: (id: string, updates: Partial<Omit<Expense, "id">>) => void;
  onDeleteExpense: (id: string) => void;
  onAddExpense: (description: string, estimated: number, spent: number, isFD?: boolean, preExistingFD?: number, emi?: number, saved?: number, totalAllocated?: number, totalSpent?: number) => void;
  calculateEmergencyTarget: (duration: number) => number;
}

export function EmergencyFundView({
  section,
  onUpdateBudget,
  onUpdatePlanningDuration,
  onUpdateExpense,
  onDeleteExpense,
  onAddExpense,
  calculateEmergencyTarget
}: EmergencyFundViewProps) {
  const duration = section.planningDuration || 6;
  const target = calculateEmergencyTarget(duration);

  const totals = useMemo(() => {
    return section.expenses.reduce(
      (acc, e) => {
        const totalAlloc = e.totalAllocated || 0;
        const totalSp = e.totalSpent || 0;
        const fdBalance = e.isFD ? (e.preExistingFD || 0) : 0;
        let balance = totalAlloc - totalSp;
        balance = Math.max(balance, fdBalance);
        balance += (e.saved || 0);

        return {
          saved: acc.saved + (e.saved || 0),
          spent: acc.spent + totalSp,
          remaining: acc.remaining + balance,
        };
      },
      { saved: 0, spent: 0, remaining: 0 }
    );
  }, [section.expenses]);

  const monthlyLiquidity = totals.remaining / duration;

  const topExpenses = useMemo(() => {
    return [...section.expenses]
      .sort((a, b) => {
        const valA = (a.saved || 0) + Math.max((a.totalAllocated || 0) - (a.totalSpent || 0), (a.isFD ? (a.preExistingFD || 0) : 0));
        const valB = (b.saved || 0) + Math.max((b.totalAllocated || 0) - (b.totalSpent || 0), (b.isFD ? (b.preExistingFD || 0) : 0));
        return valB - valA;
      })
      .slice(0, 2);
  }, [section.expenses]);

  const durations = [3, 6, 9, 12];

  return (
    <div className="space-y-6 pb-20">
      {/* Duration Selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Planning Duration
        </label>
        <div className="grid grid-cols-4 gap-2">
          {durations.map((d) => (
            <Button
              key={d}
              variant={duration === d ? "default" : "outline"}
              size="sm"
              onClick={() => onUpdatePlanningDuration(d)}
              className="font-heading"
            >
              {d === 12 ? "1 Year" : `${d} Mo`}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-primary/10 p-4 space-y-1 col-span-2 border border-primary/20">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Auto-Calculated Target</p>
            <Target className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-heading text-primary">₹{target.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-muted-foreground">Based on {duration} months of expenses + EMIs</p>
        </div>

        <div className="rounded-xl bg-accent/10 p-4 space-y-1 border border-accent/20">
          <p className="text-xs text-muted-foreground">Monthly Liquidity</p>
          <p className="text-xl font-bold font-heading text-accent">₹{Math.round(monthlyLiquidity).toLocaleString('en-IN')}</p>
        </div>

        <div className="rounded-xl bg-muted p-4 space-y-1 border">
          <p className="text-xs text-muted-foreground">Total Available</p>
          <p className="text-xl font-bold font-heading text-foreground">₹{totals.remaining.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Top 2 Expenses Breakdown */}
      {topExpenses.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" /> Monthly Support Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {topExpenses.map((expense) => {
              const available = (expense.saved || 0) + Math.max((expense.totalAllocated || 0) - (expense.totalSpent || 0), (expense.isFD ? (expense.preExistingFD || 0) : 0));
              return (
                <div key={expense.id} className="rounded-lg border bg-card p-3 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate">
                    {expense.description}
                  </p>
                  <p className="text-sm font-bold text-primary">
                    ₹{Math.round(available / duration).toLocaleString('en-IN')}
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">/mo</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-foreground">
            Emergency Accounts ({section.expenses.length})
          </h2>
          <AddExpenseDialog
            onAdd={onAddExpense}
            showFDOption={true}
            showBalanceTracking={true}
            isEmergency={true}
          />
        </div>
        <div className="space-y-3">
          {section.expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onUpdate={onUpdateExpense}
              onDelete={onDeleteExpense}
              showFDOption={true}
              isEmergency={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
