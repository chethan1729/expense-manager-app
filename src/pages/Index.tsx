import { useState, useEffect } from "react";
import { App } from "@capacitor/app";
import { useFundManager, BALANCE_TRACKING_FUNDS, SIMPLE_FUNDS } from "@/hooks/useExpenses";
import { useProperties } from "@/hooks/useProperties";
import { useDebts } from "@/hooks/useDebts";
import { useDeposits } from "@/hooks/useDeposits";
import { ExpenseCard } from "@/components/ExpenseCard";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { UploadExcelDialog } from "@/components/UploadExcelDialog";
import { DashboardView } from "@/components/DashboardView";
import { InvestmentFundView } from "@/components/InvestmentFundView";
import { EmergencyFundView } from "@/components/EmergencyFundView";
import { BottomNav } from "@/components/BottomNav";
import { MainMenu } from "@/components/MainMenu";
import { PropertiesPage } from "@/components/PropertiesPage";
import { ReportsPage } from "@/components/ReportsPage";
import { DebtPage } from "@/components/DebtPage";
import { PreciousMetalsPage } from "@/components/PreciousMetalsPage";
import { usePreciousMetals } from "@/hooks/usePreciousMetals";
import { DepositsPage } from "@/components/DepositsPage";
import { LiveIndexView } from "@/components/LiveIndexView";
import expenseLogo from "@/assets/expense.png";
import { Wallet, TrendingDown, TrendingUp, IndianRupee, ArrowLeft } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const fundManager = useFundManager();
  const propertiesHook = useProperties();
  const debtsHook = useDebts();
  const metalsHook = usePreciousMetals();
  const depositsHook = useDeposits();
  
  const { totalPropertyValue, loading: propertiesLoading } = propertiesHook;
  const { debts, totalOutstanding, loading: debtsLoading } = debtsHook;
  const { getSummary: getMetalsSummary } = metalsHook;
  const { totalFDAmount: depositsTotalFD, totalEPF, grandTotal: depositsGrandTotal } = depositsHook;

  const {
    sections, activeSectionId, setActiveSectionId, activeSection, totalBudget, setTotalBudget,
    updateExpense, addExpense, deleteExpense, importExpenses, updateSectionBudget,
    updateSectionPlanningDuration,
    addInvestmentItem, updateInvestmentItem, deleteInvestmentItem, getSectionTotals,
    reorderSections,
    calculateEmergencyTarget,
    dashboardData, getTotalFD, getTotalSBBalance, getTotalLockedIn, loading: fundLoading,
    currentMonth, setCurrentMonth, currentYear, setCurrentYear,
    isFDEligible, isBalanceTracking, isSimpleFund
  } = fundManager;

  const [activeTab, setActiveTab] = useState("expenses");
  const [mainMenuPage, setMainMenuPage] = useState<string | null>(null);

  const isHydrated = !fundLoading && !propertiesLoading && !debtsLoading;

  const isDashboard = activeSectionId === "dashboard";
  const isInvestment = activeSectionId === "investment-fund";
  const totals = activeSection ? getSectionTotals(activeSection) : null;

  const totalInvestedSummary = Math.ceil((sections.find((s) => s.id === "investment-fund")?.investmentItems || [])
    .reduce((sum, i) => sum + (i.currentValue || 0), 0));

  const metalsTotalValue = getMetalsSummary().totalValue;
  const totalPersonalOwe = debts
    .filter((d) => d.type === "owe")
    .reduce((sum, d) => sum + d.amount, 0);

  // Summary cards for top of section views (only for non-balance-tracking sections)
  const summaryCards = totals && !isInvestment && !isBalanceTracking(activeSectionId)
    ? [
        { label: "Allocated", value: totals.estimated, icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
        { label: "Spent", value: totals.spent, icon: TrendingDown, color: "text-accent", bg: "bg-accent/10" },
        {
          label: "Remaining", value: totals.remaining, icon: TrendingUp,
          color: totals.remaining < 0 ? "text-destructive" : "text-primary",
          bg: totals.remaining < 0 ? "bg-destructive/10" : "bg-primary/10",
        },
      ]
    : [];

  // Balance tracking summary cards — show monthly + cumulative
  const balanceSummaryCards = totals && isBalanceTracking(activeSectionId)
    ? [
        { label: "This Month", value: totals.estimated, icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
        { label: "Used", value: totals.spent, icon: TrendingDown, color: "text-accent", bg: "bg-accent/10" },
        {
          label: "Balance", value: (totals as any).currentBalance ?? (totals.estimated - totals.spent), icon: TrendingUp,
          color: ((totals as any).currentBalance ?? 0) < 0 ? "text-destructive" : "text-emerald-600",
          bg: ((totals as any).currentBalance ?? 0) < 0 ? "bg-destructive/10" : "bg-emerald-50 dark:bg-emerald-900/20",
        },
      ]
    : [];

  const handleMainNavigate = (page: string) => {
    if (page === "expenses") {
      setActiveTab("expenses");
      setMainMenuPage(null);
    } else {
      setMainMenuPage(page);
    }
  };

  useEffect(() => {
    const handleBackButton = async () => {
      if (mainMenuPage) {
        setMainMenuPage(null);
      } else if (activeSectionId !== "dashboard") {
        setActiveSectionId("dashboard");
        setActiveTab("expenses");
      } else if (activeTab !== "expenses") {
        setActiveTab("expenses");
      } else {
        await App.exitApp();
      }
    };

    const backListener = App.addListener('backButton', handleBackButton);

    return () => {
      backListener.then(l => l.remove());
    };
  }, [mainMenuPage, activeSectionId, activeTab, setActiveSectionId, setActiveTab, setMainMenuPage]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <IndianRupee className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="h-2 w-48 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-[loading_1.5s_ease-in-out_infinite]" />
          </div>
          <p className="text-xs text-muted-foreground font-medium animate-pulse">Loading Finance Hub...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (activeTab === "main") {
      if (mainMenuPage === "properties") {
        return (
          <div className="space-y-4">
            <button onClick={() => setMainMenuPage(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <PropertiesPage {...propertiesHook} />
          </div>
        );
      }
      if (mainMenuPage === "reports") {
        return (
          <div className="space-y-4">
            <button onClick={() => setMainMenuPage(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <ReportsPage
              dashboardData={dashboardData}
              totalFD={getTotalFD() + depositsTotalFD}
              totalInvested={totalInvestedSummary}
              totalPropertyValue={totalPropertyValue}
              totalOutstanding={totalOutstanding}
              totalEPF={totalEPF}
              totalSBBalance={getTotalSBBalance()}
              totalLockedIn={getTotalLockedIn()}
              totalMetalsValue={metalsTotalValue}
              totalPersonalDebt={totalPersonalOwe}
            />
          </div>
        );
      }
      if (mainMenuPage === "metals") {
        return (
          <div className="space-y-4">
            <button onClick={() => setMainMenuPage(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <PreciousMetalsPage {...metalsHook} />
          </div>
        );
      }
      if (mainMenuPage === "deposits") {
        return (
          <div className="space-y-4">
            <button onClick={() => setMainMenuPage(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <DepositsPage {...depositsHook} />
          </div>
        );
      }
      if (mainMenuPage === "live-index") {
        return (
          <div className="space-y-4">
            <button onClick={() => setMainMenuPage(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <LiveIndexView fullPage />
          </div>
        );
      }
      return <MainMenu onNavigate={handleMainNavigate} />;
    }

    if (activeTab === "debt") {
      return <DebtPage {...debtsHook} />;
    }

    // Expense manager tab
    if (isDashboard) {
      return (
        <DashboardView
          dashboardData={dashboardData}
          onSelectSection={setActiveSectionId}
          onUpdateBudget={setTotalBudget}
          onReorderSections={reorderSections}
        />
      );
    }

    if (isInvestment && activeSection) {
      return (
        <InvestmentFundView
          budget={activeSection.budget}
          items={activeSection.investmentItems || []}
          onUpdateBudget={(b) => updateSectionBudget(activeSection.id, b)}
          onAddItem={(itemData) => addInvestmentItem(activeSection.id, itemData)}
          onUpdateItem={(id, updates) => updateInvestmentItem(activeSection.id, id, updates)}
          onDeleteItem={(id) => deleteInvestmentItem(activeSection.id, id)}
        />
      );
    }

    if (activeSectionId === "emergency-fund" && activeSection) {
      return (
        <EmergencyFundView
          section={activeSection}
          onUpdateBudget={(b) => updateSectionBudget(activeSection.id, b)}
          onUpdatePlanningDuration={(d) => updateSectionPlanningDuration(activeSection.id, d)}
          onUpdateExpense={(id, updates) => updateExpense(activeSection.id, id, updates)}
          onDeleteExpense={(id) => deleteExpense(activeSection.id, id)}
          onAddExpense={(desc, est, spent, isFD, preFD, emi, saved, totAlloc, totSpent) => addExpense(activeSection.id, desc, est, spent, isFD, preFD, emi, saved, totAlloc, totSpent)}
          calculateEmergencyTarget={calculateEmergencyTarget}
        />
      );
    }

    if (activeSection) {
      const fdEligible = isFDEligible(activeSection.id);
      const isBalance = isBalanceTracking(activeSection.id);
      const isSimple = isSimpleFund(activeSection.id);
      const isSavingFund = activeSection.id === "saving-fund";
      const isLoan = activeSection.id === "loan-fund";

      const cardsToShow = isBalance ? balanceSummaryCards : summaryCards;

      return (
        <>
          {cardsToShow.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {cardsToShow.map((card) => (
                <div key={card.label} className={`rounded-xl ${card.bg} p-3 space-y-1`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className={`font-heading font-bold text-sm ${card.color}`}>₹{card.value.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-foreground">
                {activeSection.name} ({activeSection.expenses.length})
              </h2>
              {activeSection.id === "daily-expenses" && (
                <UploadExcelDialog onImport={(items) => importExpenses(activeSection.id, items)} />
              )}
            </div>
            {activeSection.expenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onUpdate={(id, updates) => updateExpense(activeSection.id, id, updates)}
                onDelete={(id) => deleteExpense(activeSection.id, id)}
                showFDOption={fdEligible}
                isLoan={isLoan}
                isSimple={isSimple}
                showBalanceTracking={isBalance && !isSimple}
                isSaving={isSavingFund}
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
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {activeTab === "expenses" && (
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b px-4 py-4 safe-area-pt">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0 overflow-hidden">
              <img src={expenseLogo} alt="Logo" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-heading text-lg font-bold text-foreground leading-tight">Expense Manager</h1>
              <p className="text-xs text-muted-foreground">
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][currentMonth]} {currentYear}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={currentMonth.toString()} onValueChange={(v) => setCurrentMonth(parseInt(v))}>
                <SelectTrigger className="w-[100px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                    <SelectItem key={m} value={i.toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={currentYear.toString()} onValueChange={(v) => setCurrentYear(parseInt(v))}>
                <SelectTrigger className="w-[80px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>
      )}

      {(activeTab === "main" || activeTab === "debt") && (
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b px-4 py-4 safe-area-pt">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0 overflow-hidden">
              <img src={expenseLogo} alt="Logo" className="h-full w-full object-cover" />
            </div>
            <h1 className="font-heading text-lg font-bold text-foreground">
              {activeTab === "main" ? (
                mainMenuPage === "metals" ? "Gold / Silver" :
                mainMenuPage === "deposits" ? "Deposits" :
                mainMenuPage ? mainMenuPage.charAt(0).toUpperCase() + mainMenuPage.slice(1) : "Finance Hub"
              ) : "Debt Manager"}
            </h1>
          </div>
        </header>
      )}

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {renderContent()}
      </main>

      {activeTab === "expenses" && !isDashboard && !isInvestment && activeSection && activeSectionId !== "emergency-fund" && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20">
          <AddExpenseDialog
            onAdd={(desc, est, spent, isFD, preExistingFD, emi, saved, totalAllocated, totalSpent, lockedInAmt) => 
              addExpense(activeSection.id, desc, est, spent, isFD, preExistingFD, emi, saved, totalAllocated, totalSpent, lockedInAmt)
            }
            showFDOption={isFDEligible(activeSection.id)}
            isLoan={activeSectionId === "loan-fund"}
            isEmergency={activeSectionId === "emergency-fund"}
            showBalanceTracking={isBalanceTracking(activeSectionId)}
            isSaving={activeSectionId === "saving-fund"}
          />
        </div>
      )}

      <BottomNav 
        activeTab={activeTab} 
        onTabChange={(tab) => { 
          if (tab === "expenses" && activeTab === "expenses") {
            setActiveSectionId("dashboard");
          }
          setActiveTab(tab); 
          setMainMenuPage(null); 
        }} 
      />
    </div>
  );
};

export default Index;
