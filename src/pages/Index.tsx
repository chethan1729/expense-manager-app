import { useExpenses } from "@/hooks/useExpenses";
import { ExpenseCard } from "@/components/ExpenseCard";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { UploadExcelDialog } from "@/components/UploadExcelDialog";
import { Wallet, TrendingDown, TrendingUp, IndianRupee } from "lucide-react";

const Index = () => {
  const { expenses, updateExpense, addExpense, deleteExpense, importExpenses, totals } = useExpenses();

  const summaryCards = [
    {
      label: "Estimated",
      value: totals.estimated,
      icon: Wallet,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Spent",
      value: totals.spent,
      icon: TrendingDown,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Remaining",
      value: totals.remaining,
      icon: TrendingUp,
      color: totals.remaining < 0 ? "text-destructive" : "text-primary",
      bg: totals.remaining < 0 ? "bg-destructive/10" : "bg-primary/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <IndianRupee className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-foreground leading-tight">
              Expense Manager
            </h1>
            <p className="text-xs text-muted-foreground">April 2026</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl ${card.bg} p-3 space-y-1`}
            >
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`font-heading font-bold text-sm ${card.color}`}>
                ₹{card.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Expense List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-foreground">
              Daily Expenses ({expenses.length})
            </h2>
            <UploadExcelDialog onImport={importExpenses} />
          </div>
          </h2>
          {expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onUpdate={updateExpense}
              onDelete={deleteExpense}
            />
          ))}
          {expenses.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No expenses yet. Add your first one!</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Add Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <AddExpenseDialog onAdd={addExpense} />
      </div>
    </div>
  );
};

export default Index;
