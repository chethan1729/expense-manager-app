import { useState, useEffect } from "react";
import { App } from "@capacitor/app";
import { useFundManager, BALANCE_TRACKING_FUNDS, SIMPLE_FUNDS } from "@/hooks/useExpenses";
import { useProperties } from "@/hooks/useProperties";
import { useDebts } from "@/hooks/useDebts";
import { useDeposits } from "@/hooks/useDeposits";
import { useGoals } from "@/hooks/useGoals";
import { useTransactions } from "@/hooks/useTransactions";
import { useNetWorthHistory } from "@/hooks/useNetWorthHistory";
import { useAutomatedTransactions } from "@/hooks/useAutomatedTransactions";
import { ExpenseCard } from "@/components/ExpenseCard";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { UploadExcelDialog } from "@/components/UploadExcelDialog";
import { DashboardView } from "@/components/DashboardView";
import { InvestmentFundView } from "@/components/InvestmentFundView";
import { EmergencyFundView } from "@/components/EmergencyFundView";
import { BottomNav } from "@/components/BottomNav";
import { MainMenu } from "@/components/MainMenu";
import { PropertiesPage } from "@/components/PropertiesPage";
import { GoalsPage } from "@/components/GoalsPage";
import { ReportsPage } from "@/components/ReportsPage";
import { DebtPage } from "@/components/DebtPage";
import { PreciousMetalsPage } from "@/components/PreciousMetalsPage";
import { usePreciousMetals } from "@/hooks/usePreciousMetals";
import { DepositsPage } from "@/components/DepositsPage";
import { LiveIndexView } from "@/components/LiveIndexView";
import { TransactionsPage } from "@/components/TransactionsPage";
import { AutomatedTransactionsPage } from "@/components/AutomatedTransactionsPage";
import { BackupRestorePage } from "@/components/BackupRestorePage";
import { InvestmentPlannerPage } from "@/components/InvestmentPlannerPage";
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
  const goalsHook = useGoals();
  const depositsHook = useDeposits();
  const transactionsHook = useTransactions();
  
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

  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionsForMonth,
    getMonthKey,
  } = transactionsHook;

  // Initialize automated transactions hook
  const automatedTransactionsHook = useAutomatedTransactions(
    sections.map((section) => ({
      id: section.id,
      name: section.name,
      expenses: section.expenses.map((exp) => ({
        id: exp.id,
        description: exp.description,
      })),
    }))
  );

  const { recordSnapshot } = useNetWorthHistory();

  const monthKey = getMonthKey(new Date(currentYear, currentMonth, 1));
  const monthTransactions = getTransactionsForMonth(monthKey);

  const [activeTab, setActiveTab] = useState("main");
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

  // Helper: Get expenses for a fund  
  const getExpensesForFund = (fundId: string) => {
    const section = sections.find(s => s.id === fundId);
    return section?.expenses || [];
  };

  const handleRecordTransaction = (date: string, fundId: string, amount: number, expenseId?: string, paymentMode?: string, automatedId?: string) => {
    addTransaction(date, fundId as TransactionFundType, amount, expenseId, undefined, paymentMode as PaymentMode, automatedId);
    
    // Update the expense's spent amount
    if (fundId === "daily-expenses" && expenseId) {
      const expense = getExpensesForFund(fundId).find((e) => e.id === expenseId);
      if (expense) {
        updateExpense(fundId, expenseId, {
          spent: (expense.spent || 0) + amount,
        });
      }
    } else if (fundId === "wishlist-fund" || fundId === "hobby-fund") {
      // For balance tracking funds, first find the matching expense
      const fundExpenses = getExpensesForFund(fundId);
      if (fundExpenses.length > 0) {
        const expense = fundExpenses[0];
        updateExpense(fundId, expense.id, {
          spent: (expense.spent || 0) + amount,
        });
      }
    }
  };

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
          label: "Balance", value: (totals as { currentBalance?: number }).currentBalance ?? (totals.estimated - totals.spent), icon: TrendingUp,
          color: ((totals as { currentBalance?: number }).currentBalance ?? 0) < 0 ? "text-destructive" : "text-emerald-600",
          bg: ((totals as { currentBalance?: number }).currentBalance ?? 0) < 0 ? "bg-destructive/10" : "bg-emerald-50 dark:bg-emerald-900/20",
        },
      ]
    : [];

  // Handle approval of automated transactions
  const handleApproveAutomatedTransaction = (
    transactionId: string,
    fundId: string,
    expenseId: string,
    paymentMode?: "upi" | "credit-card" | "net-banking" | "cash"
  ) => {
    // Find the transaction
    const transaction = automatedTransactionsHook.pendingTransactions.find(
      (t) => t.id === transactionId
    );
    if (!transaction) return;

    // Record the transaction in the normal transactions system
    handleRecordTransaction(
      transaction.date,
      fundId,
      transaction.amount,
      expenseId,
      paymentMode,
      transactionId.split('-').slice(2).join('-') // The hash part of the id
    );

    // Approve in automated transactions system
    automatedTransactionsHook.approveTransaction(
      transactionId,
      fundId,
      expenseId,
      paymentMode
    );
  };

  const handleSyncDeleteTransaction = (id: string, monthKey: string) => {
    const list = getTransactionsForMonth(monthKey);
    const transaction = list.find(t => t.id === id);
    if (!transaction) return;

    if (transaction.automatedId) {
      automatedTransactionsHook.unprocessTransaction(transaction.automatedId);
    }
    
    // Reverse the expense amount
    const { fundId, expenseId, amount } = transaction;
    if (fundId === "daily-expenses" && expenseId) {
      const expense = getExpensesForFund(fundId).find((e) => e.id === expenseId);
      if (expense) {
        updateExpense(fundId, expenseId, {
          spent: Math.max(0, (expense.spent || 0) - amount),
        });
      }
    } else if (fundId === "wishlist-fund" || fundId === "hobby-fund") {
      const fundExpenses = getExpensesForFund(fundId);
      if (fundExpenses.length > 0) {
        const expense = fundExpenses[0];
        updateExpense(fundId, expense.id, {
          spent: Math.max(0, (expense.spent || 0) - amount),
        });
      }
    }

    deleteTransaction(id, monthKey);
  };

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

  // Daily networth recording at 11:59 PM
  useEffect(() => {
    if (!isHydrated) return;

    const recordNetWorthSnapshot = () => {
      // Calculate current networth using the EXACT same formula as ReportsPage
      const fullTotalFD = getTotalFD() + depositsTotalFD;
      
      const monthlyRemaining = dashboardData.sections
        .filter(s => s.id === "daily-expenses" || s.id === "free-fund")
        .reduce((sum, s) => sum + (s.totals.remaining || 0), 0);
      
      const cumulativeTrackingBalance = dashboardData.sections
        .filter(s => ["hobby-fund", "loan-fund", "wishlist-fund", "learning-fund", "emergency-fund", "saving-fund"].includes(s.id))
        .reduce((sum, s) => sum + (s.totals.currentBalance || 0), 0);

      const floatingAmount = Math.max(0, totalBudget - dashboardData.totalSpent - fullTotalFD);

      const currentNetWorth = totalPropertyValue + totalInvestedSummary + metalsTotalValue + fullTotalFD + totalEPF + cumulativeTrackingBalance + monthlyRemaining + floatingAmount - totalPersonalOwe;
      const currentNetWorthWithLoans = currentNetWorth - totalOutstanding;

      recordSnapshot(Math.ceil(currentNetWorth), Math.ceil(currentNetWorthWithLoans));
    };

    const scheduleNetWorthRecording = () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      
      // Check if we already have a snapshot for today
      try {
        const saved = localStorage.getItem("net-worth-history");
        const existingSnapshots = saved ? JSON.parse(saved) : [];
        const hasSnapshotToday = existingSnapshots.some((s: { date: string }) => s.date === today);

        // If no snapshot for today, record one immediately
        if (!hasSnapshotToday) {
          recordNetWorthSnapshot();
        }
      } catch (error) {
        // If there's any error reading localStorage, record anyway
        recordNetWorthSnapshot();
      }

      // Schedule tomorrow at 11:59 PM
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const recordTime = new Date(tomorrow);
      recordTime.setHours(23, 59, 0, 0); // 11:59 PM IST (device timezone)

      const timeUntilRecord = recordTime.getTime() - now.getTime();

      const timeout = setTimeout(() => {
        recordNetWorthSnapshot();
        scheduleNetWorthRecording(); // Reschedule for next day
      }, timeUntilRecord);

      return timeout;
    };

    const timeout = scheduleNetWorthRecording();

    return () => clearTimeout(timeout);
  }, [isHydrated, sections, dashboardData, totalPropertyValue, totalInvestedSummary, metalsTotalValue, getTotalFD, totalEPF, totalPersonalOwe, totalOutstanding, recordSnapshot]);

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
      if (mainMenuPage === "goals") {
        const investmentSection = sections.find((s) => s.id === "investment-fund");
        const investmentItems = investmentSection?.investmentItems || [];
        const savingSection = sections.find((s) => s.id === "saving-fund");
        const savingFundExpenses = savingSection?.expenses || [];
        return (
          <div className="space-y-4">
            <button onClick={() => setMainMenuPage(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <GoalsPage
              goalsHook={goalsHook}
              investmentItems={investmentItems}
              fds={depositsHook.data.fds}
              savingFundExpenses={savingFundExpenses}
              epf={depositsHook.data.epf}
              otherSavings={depositsHook.data.otherSavings}
            />
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
              totalLockedIn={getTotalLockedIn() + (depositsHook.data.epf?.isLockedIn ? depositsHook.data.epf.totalAccumulated : 0) + depositsHook.data.otherSavings.filter(s => s.isLockedIn).reduce((sum, s) => sum + s.totalAmount, 0)}
              totalMetalsValue={metalsTotalValue}
              totalPersonalDebt={totalPersonalOwe}
              transactions={transactions}
              currentMonth={currentMonth}
              currentYear={currentYear}
              onMonthChange={setCurrentMonth}
              onYearChange={setCurrentYear}
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
      if (mainMenuPage === "transactions") {
        return (
          <div className="space-y-4">
            <button onClick={() => setMainMenuPage(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <TransactionsPage
              transactions={monthTransactions}
              monthKey={monthKey}
              currentMonth={currentMonth}
              currentYear={currentYear}
              sections={sections}
              onAddTransaction={handleRecordTransaction}
              onDeleteTransaction={handleSyncDeleteTransaction}
              getExpensesForFund={getExpensesForFund}
            />
          </div>
        );
      }
      if (mainMenuPage === "automated-transactions") {
        return (
          <div className="space-y-4">
            <button onClick={() => setMainMenuPage(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <AutomatedTransactionsPage
              pendingTransactions={automatedTransactionsHook.pendingTransactions}
              processedTransactions={automatedTransactionsHook.processedTransactions}
              onApprove={handleApproveAutomatedTransaction}
              onReject={automatedTransactionsHook.rejectTransaction}
              onRefresh={automatedTransactionsHook.readSMSTransactions}
              loading={automatedTransactionsHook.loading}
              modelLoading={automatedTransactionsHook.modelLoading}
              sections={sections}
            />
          </div>
        );
      }
      if (mainMenuPage === "backup-restore") {
        return (
          <div className="space-y-4">
            <button onClick={() => setMainMenuPage(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <BackupRestorePage />
          </div>
        );
      }
      if (mainMenuPage === "investment-planner") {
        return (
          <div className="space-y-4">
            <button onClick={() => setMainMenuPage(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <InvestmentPlannerPage />
          </div>
        );
      }
      return <MainMenu onNavigate={handleMainNavigate} pendingAutomatedTransactionCount={automatedTransactionsHook.pendingTransactions.length} />;
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
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 overflow-hidden">
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
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 overflow-hidden">
              <img src={expenseLogo} alt="Logo" className="h-full w-full object-cover" />
            </div>
            <h1 className="font-heading text-lg font-bold text-foreground">
              {activeTab === "main" ? (
                mainMenuPage === "metals" ? "Gold / Silver" :
                mainMenuPage === "deposits" ? "Deposits" :
                mainMenuPage === "investment-planner" ? "Investment Planner" :
                mainMenuPage === "goals" ? "Goals" :
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
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-20">
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
