import { useFundManager } from "@/hooks/useExpenses";
import { ExpenseCard } from "@/components/ExpenseCard";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { UploadExcelDialog } from "@/components/UploadExcelDialog";
import { DashboardView } from "@/components/DashboardView";
import { InvestmentFundView } from "@/components/InvestmentFundView";
import { Wallet, TrendingDown, TrendingUp, IndianRupee } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const {
    sections,
    activeSectionId,
    setActiveSectionId,
    activeSection,
    totalBudget,
    setTotalBudget,
    updateExpense,
    addExpense,
    deleteExpense,
    importExpenses,
    updateSectionBudget,
    addInvestmentItem,
    updateInvestmentItem,
    deleteInvestmentItem,
    getSectionTotals,
    dashboardData,
  } = useFundManager();

  const isDashboard = activeSectionId === "dashboard";
  const isInvestment = activeSectionId === "investment-fund";
  const totals = activeSection ? getSectionTotals(activeSection) : null;

  const summaryCards = totals && !isInvestment
    ? [
        { label: "Allocated", value: totals.estimated, icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
        { label: "Spent", value: totals.spent, icon: TrendingDown, color: "text-accent", bg: "bg-accent/10" },
        {
          label: "Remaining",
          value: totals.remaining,
          icon: TrendingUp,
          color: totals.remaining < 0 ? "text-destructive" : "text-primary",
          bg: totals.remaining < 0 ? "bg-destructive/10" : "bg-primary/10",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <IndianRupee className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-lg font-bold text-foreground leading-tight">
              Expense Manager
            </h1>
            <p className="text-xs text-muted-foreground">April 2026</p>
          </div>
          <Select value={activeSectionId} onValueChange={setActiveSectionId}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {isDashboard ? (
          <DashboardView
            dashboardData={dashboardData}
            onSelectSection={setActiveSectionId}
            onUpdateBudget={setTotalBudget}
          />
        ) : isInvestment && activeSection ? (
          <InvestmentFundView
            budget={activeSection.budget}
            items={activeSection.investmentItems || []}
            onUpdateBudget={(b) => updateSectionBudget(activeSection.id, b)}
            onAddItem={(name, alloc, cv) => addInvestmentItem(activeSection.id, name, alloc, cv)}
            onUpdateItem={(id, updates) => updateInvestmentItem(activeSection.id, id, updates)}
            onDeleteItem={(id) => deleteInvestmentItem(activeSection.id, id)}
          />
        ) : activeSection ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              {summaryCards.map((card) => (
                <div key={card.label} className={`rounded-xl ${card.bg} p-3 space-y-1`}>
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
                  {activeSection.name} ({activeSection.expenses.length})
                </h2>
                {activeSection.id === "daily-expenses" && (
                  <UploadExcelDialog
                    onImport={(items) => importExpenses(activeSection.id, items)}
                  />
                )}
              </div>
              {activeSection.expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onUpdate={(id, updates) => updateExpense(activeSection.id, id, updates)}
                  onDelete={(id) => deleteExpense(activeSection.id, id)}
                />
              ))}
              {activeSection.expenses.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No expenses in {activeSection.name} yet.</p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>

      {/* Floating Add Button — only on non-dashboard, non-investment sections */}
      {!isDashboard && !isInvestment && activeSection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <AddExpenseDialog
            onAdd={(desc, est, spent) => addExpense(activeSection.id, desc, est, spent)}
          />
        </div>
      )}
    </div>
  );
};

export default Index;
