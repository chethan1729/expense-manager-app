import { useState, useEffect, useMemo } from "react";
import { Preferences } from "@capacitor/preferences";

export interface Expense {
  id: string;
  description: string;
  estimated: number; // Monthly Allotment
  spent: number; // Monthly Spent
  totalAllocated: number; // Lifetime Total Allotment (Carried forward)
  totalSpent: number; // Lifetime Total Spent (Carried forward)
  saved?: number; // Current balance in fund (emergency/saving)
  emi?: number; // Per-month EMI for loans
  isFD?: boolean;
  preExistingFD?: number;
  lockedInAmount?: number; // Amount in lock-in period (for saving fund)
}

export interface InvestmentItem {
  id: string;
  name: string;
  type?: 'Equity' | 'Mutual Fund' | 'Crypto' | 'Other';
  allocated: number;
  invested: number;
  currentValue: number;
  logo?: string;
  label?: string;
  labelColor?: string;
  lockedInAmount?: number; // Amount in lock-in period
  isUS?: boolean;
  investedUSD?: number;
  currentValueUSD?: number;
  usdRate?: number;
}

export interface FundSection {
  id: string;
  name: string;
  budget: number;
  expenses: Expense[];
  investmentItems?: InvestmentItem[];
  planningDuration?: number;
}

const STORAGE_KEY = "expense-manager-monthly-v1";
const BUDGET_KEY = "expense-manager-monthly-budget-v1";

export const FD_ELIGIBLE_FUNDS = ["loan-fund", "wishlist-fund", "emergency-fund", "saving-fund", "learning-fund", "hobby-fund"];

// Funds that show total balance tracking (totalAllocated / totalSpent)
export const BALANCE_TRACKING_FUNDS = ["hobby-fund", "loan-fund", "wishlist-fund", "learning-fund", "emergency-fund", "saving-fund"];

// Funds that hide total alloc/spent (daily + free)
export const SIMPLE_FUNDS = ["daily-expenses", "free-fund"];

const defaultSections: FundSection[] = [
  {
    id: "daily-expenses",
    name: "Daily Expenses",
    budget: 0,
    expenses: [
      { id: "1", description: "Maintanance", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "2", description: "Electricity Bill", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "3", description: "Petrol / Bus / Cab", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "4", description: "Groceries", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "5", description: "Food", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "6", description: "Mobile Recharge / Wifi / DTH", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "7", description: "OTT - Netflix, Spotify etc", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "8", description: "Party / Movie / Cafe / Dining", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "9", description: "Gift", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "10", description: "Bike License / Insurance / Service", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "11", description: "Gas - Cylinder", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "12", description: "EMI (Active - 1) / Credit Card Bills", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "13", description: "Extra Expenses", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
    ],
  },
  {
    id: "investment-fund",
    name: "Investment Fund",
    budget: 0,
    expenses: [],
    investmentItems: [
      { id: "inv1", name: "Equity Shares (IN)", allocated: 0, invested: 0, currentValue: 0 },
      { id: "inv2", name: "Equity Shares (US)", allocated: 0, invested: 0, currentValue: 0 },
      { id: "inv3", name: "Mutual Fund", allocated: 0, invested: 0, currentValue: 0 },
      { id: "inv4", name: "Mutual Fund (Tax Saver)", allocated: 0, invested: 0, currentValue: 0 },
      { id: "inv5", name: "Crypto", allocated: 0, invested: 0, currentValue: 0 },
    ],
  },
  { id: "hobby-fund", name: "Hobby Fund", budget: 0, expenses: [] },
  {
    id: "loan-fund",
    name: "Loan Fund",
    budget: 0,
    expenses: [
      { id: "loan1", description: "Assetz Canvas & Cove - EMI", estimated: 0, spent: 0, emi: 0, totalAllocated: 0, totalSpent: 0 },
    ],
  },
  {
    id: "wishlist-fund",
    name: "Wishlist Fund",
    budget: 0,
    expenses: [
      { id: "wf1", description: "Travel", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "wf2", description: "Home Rennovation", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "wf3", description: "Home Functions", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
      { id: "wf4", description: "T.Courses / H.Studies", estimated: 0, spent: 0, totalAllocated: 0, totalSpent: 0 },
    ],
  },
  { id: "learning-fund", name: "Learning Fund", budget: 0, expenses: [] },
  { id: "emergency-fund", name: "Emergency Fund", budget: 0, expenses: [] },
  { id: "saving-fund", name: "Saving Fund", budget: 0, expenses: [] },
  { id: "free-fund", name: "Free Fund", budget: 0, expenses: [] },
];

export function useFundManager() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<Record<string, { sections: FundSection[], totalBudget: number }>>({});
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string>("dashboard");

  const monthKey = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;

  // Load data from Preferences
  useEffect(() => {
    async function loadData() {
      try {
        const { value: storedData } = await Preferences.get({ key: STORAGE_KEY });
        if (storedData) {
          setMonthlyData(JSON.parse(storedData));
        } else {
          // Initial migration from V3 if available
          const { value: v3Sections } = await Preferences.get({ key: "expense-manager-funds-v3" });
          const { value: v3Budget } = await Preferences.get({ key: "expense-manager-total-budget" });
          
          if (v3Sections && v3Budget) {
            const initialData = {
              [monthKey]: {
                sections: JSON.parse(v3Sections),
                totalBudget: parseFloat(v3Budget)
              }
            };
            setMonthlyData(initialData);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Save whenever monthlyData changes
  useEffect(() => {
    if (!loading) {
      Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(monthlyData) });
    }
  }, [monthlyData, loading]);

  const currentMonthData = useMemo(() => {
    if (!monthlyData[monthKey]) {
      // Initialize new month from the most recent month or defaults
      const keys = Object.keys(monthlyData).sort();
      const lastKey = keys.length > 0 ? keys[keys.length - 1] : null;
      const baseSections = lastKey ? monthlyData[lastKey].sections : defaultSections;
      const baseBudget = lastKey ? monthlyData[lastKey].totalBudget : 0;

      return {
        sections: baseSections.map(s => ({
          ...s,
          budget: s.budget, // carry forward budget for all funds
          expenses: s.expenses.map(e => ({
            ...e,
            estimated: e.estimated, // Carry forward monthly allocation for ALL funds
            spent: 0,               // Reset spent this month
            emi: e.emi,             // Carry forward EMI
            totalAllocated: e.totalAllocated, // Carry forward Lifetime Total
            totalSpent: e.totalSpent,         // Carry forward Lifetime Spent
            saved: e.saved,         // Carry forward saved balance
            preExistingFD: e.preExistingFD,   // Carry forward FD
            lockedInAmount: e.lockedInAmount, // Carry forward lock-in
          })),
          investmentItems: s.investmentItems ? s.investmentItems.map(inv => ({
            ...inv,
            allocated: inv.allocated, // Carry forward allocation for investments
          })) : undefined
        })),
        totalBudget: baseBudget
      };
    }
    return monthlyData[monthKey];
  }, [monthlyData, monthKey]);

  const sections = currentMonthData.sections;
  const totalBudget = currentMonthData.totalBudget;

  const setSections = (updater: FundSection[] | ((prev: FundSection[]) => FundSection[])) => {
    setMonthlyData(prev => {
      const current = prev[monthKey] || currentMonthData;
      const nextSections = typeof updater === 'function' ? updater(current.sections) : updater;
      return {
        ...prev,
        [monthKey]: { ...current, sections: nextSections }
      };
    });
  };

  const setTotalBudget = (budget: number) => {
    setMonthlyData(prev => {
      const current = prev[monthKey] || currentMonthData;
      return {
        ...prev,
        [monthKey]: { ...current, totalBudget: budget }
      };
    });
  };

  // Auto-calculate Free Fund budget
  const sectionsWithFreeFund = useMemo(() => {
    const otherBudgetSum = sections
      .filter((s) => s.id !== "free-fund")
      .reduce((sum, s) => sum + s.budget, 0);
    const freeFundBudget = Math.max(0, totalBudget - otherBudgetSum);
    return sections.map((s) =>
      s.id === "free-fund" ? { ...s, budget: freeFundBudget } : s
    );
  }, [sections, totalBudget]);

  const unallocatedBudget = useMemo(() => {
    // Using the formula: Total Budget - (Daily Expense Allocated + Investment fund allocated + Loan Fund This Month + Wishlist Fund This month + Emergency Fund this month + Savings Fund this month) - (Emergency Fund : Current Saved + Wishlist Fund : Balance)
    
    let allocated = 0;
    
    // Daily Expenses
    const dailyExpenses = sections.find(s => s.id === "daily-expenses");
    if (dailyExpenses) {
      allocated += dailyExpenses.expenses.reduce((sum, e) => sum + (e.estimated || 0), 0);
    }
    
    // Investment Fund (monthly allocated amount)
    const investmentFund = sections.find(s => s.id === "investment-fund");
    if (investmentFund) {
      allocated += investmentFund.budget;
    }
    
    // Loan Fund This Month
    const loanFund = sections.find(s => s.id === "loan-fund");
    if (loanFund) {
      allocated += loanFund.expenses.reduce((sum, e) => sum + (e.estimated || 0), 0);
    }
    
    // Wishlist Fund This Month
    const wishlistFund = sections.find(s => s.id === "wishlist-fund");
    if (wishlistFund) {
      allocated += wishlistFund.expenses.reduce((sum, e) => sum + (e.estimated || 0), 0);
      // Plus Current Balance (saved field)
      allocated += wishlistFund.expenses.reduce((sum, e) => sum + (e.saved || 0), 0);
    }
    
    // Emergency Fund This Month
    const emergencyFund = sections.find(s => s.id === "emergency-fund");
    if (emergencyFund) {
      allocated += emergencyFund.expenses.reduce((sum, e) => sum + (e.estimated || 0), 0);
      // Plus Current Saved
      allocated += emergencyFund.expenses.reduce((sum, e) => sum + (e.saved || 0), 0);
    }
    
    // Savings Fund This Month
    const savingsFund = sections.find(s => s.id === "saving-fund");
    if (savingsFund) {
      allocated += savingsFund.expenses.reduce((sum, e) => sum + (e.estimated || 0), 0);
      // Plus Current Saved
      allocated += savingsFund.expenses.reduce((sum, e) => sum + (e.saved || 0), 0);
    }
    
    return totalBudget - allocated;
  }, [sections, totalBudget]);

  const activeSection = sectionsWithFreeFund.find((s) => s.id === activeSectionId) || null;

  const updateExpense = (sectionId: string, expenseId: string, updates: Partial<Omit<Expense, "id">>) => {
    setMonthlyData((prev) => {
      const newData = { ...prev };
      const current = newData[monthKey] || currentMonthData;
      
      // Find the expense to calculate differences
      const section = current.sections.find(s => s.id === sectionId);
      const expense = section?.expenses.find(e => e.id === expenseId);
      
      if (!expense) return prev;

      const isBalanceTracking = BALANCE_TRACKING_FUNDS.includes(sectionId);
      const diffEst = (updates.estimated !== undefined) ? (updates.estimated - expense.estimated) : 0;
      const diffSpent = (updates.spent !== undefined) ? (updates.spent - expense.spent) : 0;

      // For balance tracking funds, auto-update totalAllocated and totalSpent
      let updatedTotalAllocated: number;
      let updatedTotalSpent: number;

      if (updates.totalAllocated !== undefined) {
        updatedTotalAllocated = updates.totalAllocated;
      } else if (isBalanceTracking) {
        updatedTotalAllocated = (expense.totalAllocated || 0) + diffEst;
      } else {
        updatedTotalAllocated = (expense.totalAllocated || 0) + diffEst;
      }

      if (updates.totalSpent !== undefined) {
        updatedTotalSpent = updates.totalSpent;
      } else if (isBalanceTracking) {
        updatedTotalSpent = (expense.totalSpent || 0) + diffSpent;
      } else {
        updatedTotalSpent = (expense.totalSpent || 0) + diffSpent;
      }

      const nextSections = current.sections.map((s) =>
        s.id === sectionId
          ? { 
              ...s, 
              expenses: s.expenses.map((e) => 
                e.id === expenseId 
                  ? { 
                      ...e, 
                      ...updates, 
                      totalAllocated: updatedTotalAllocated,
                      totalSpent: updatedTotalSpent
                    } 
                  : e
              ) 
            }
          : s
      );

      newData[monthKey] = { ...current, sections: nextSections };

      // Propagate totalAllocated/totalSpent to all FUTURE months
      const allKeys = Object.keys(newData).sort();
      const currentIdx = allKeys.indexOf(monthKey);
      if (currentIdx !== -1) {
        for (let i = currentIdx + 1; i < allKeys.length; i++) {
          const futureKey = allKeys[i];
          const futureData = newData[futureKey];
          newData[futureKey] = {
            ...futureData,
            sections: futureData.sections.map(s => (
              s.id === sectionId 
              ? {
                  ...s,
                  expenses: s.expenses.map(e => (
                    e.id === expenseId 
                    ? { ...e, totalAllocated: updatedTotalAllocated, totalSpent: updatedTotalSpent }
                    : e
                  ))
                }
              : s
            ))
          };
        }
      }

      return newData;
    });
  };

  const addExpense = (
    sectionId: string, 
    description: string, 
    estimated: number, 
    spent: number, 
    isFD?: boolean, 
    preExistingFD?: number, 
    emi?: number, 
    saved?: number,
    totalAllocated?: number,
    totalSpent?: number,
    lockedInAmount?: number
  ) => {
    const newExpense: Expense = { 
      id: crypto.randomUUID(), 
      description, 
      estimated, 
      spent, 
      isFD, 
      preExistingFD, 
      emi, 
      saved,
      totalAllocated: totalAllocated !== undefined ? totalAllocated : estimated,
      totalSpent: totalSpent !== undefined ? totalSpent : spent,
      lockedInAmount,
    };
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, expenses: [...s.expenses, newExpense] } : s))
    );
  };

  const deleteExpense = (sectionId: string, expenseId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, expenses: s.expenses.filter((e) => e.id !== expenseId) } : s))
    );
  };

  const importExpenses = (sectionId: string, items: Omit<Expense, "id">[]) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, expenses: items.map((item) => ({ ...item, id: crypto.randomUUID() })) }
          : s
      )
    );
  };

  const updateSectionBudget = (sectionId: string, budget: number) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, budget } : s))
    );
  };

  const updateSectionPlanningDuration = (sectionId: string, duration: number) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, planningDuration: duration } : s))
    );
  };

  const addInvestmentItem = (sectionId: string, itemData: Omit<InvestmentItem, "id">) => {
    const item: InvestmentItem = { id: crypto.randomUUID(), ...itemData };
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, investmentItems: [...(s.investmentItems || []), item] } : s))
    );
  };

  const updateInvestmentItem = (sectionId: string, itemId: string, updates: Partial<Omit<InvestmentItem, "id">>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, investmentItems: (s.investmentItems || []).map((i) => (i.id === itemId ? { ...i, ...updates } : i)) }
          : s
      )
    );
  };

  const deleteInvestmentItem = (sectionId: string, itemId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, investmentItems: (s.investmentItems || []).filter((i) => i.id !== itemId) }
          : s
      )
    );
  };

  const reorderSections = (newSections: FundSection[]) => {
    setMonthlyData((prev) => {
      const newData = { ...prev };
      const current = newData[monthKey] || currentMonthData;
      
      // Update current month
      newData[monthKey] = { ...current, sections: newSections };

      // Propagate the new ID order to all FUTURE months
      const newOrderIds = newSections.map(s => s.id);
      const allKeys = Object.keys(newData).sort();
      const currentIdx = allKeys.indexOf(monthKey);
      
      if (currentIdx !== -1) {
        for (let i = currentIdx + 1; i < allKeys.length; i++) {
          const futureKey = allKeys[i];
          const futureData = newData[futureKey];
          
          // Reorder future sections based on the new ID order
          const reorderedFutureSections = [...futureData.sections].sort((a, b) => {
            return newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id);
          });
          
          newData[futureKey] = { ...futureData, sections: reorderedFutureSections };
        }
      }

      return newData;
    });
  };

  const getSectionTotals = (section: FundSection) => {
    if (section.id === "investment-fund") {
      const totalProfileAllocated = (section.investmentItems || []).reduce((sum, item) => sum + (item.allocated || 0), 0);
      const totalAllocated = Math.ceil(section.budget || totalProfileAllocated);
      const totalInvested = Math.ceil((section.investmentItems || []).reduce((sum, item) => sum + (item.invested || 0), 0));
      const currentValue = Math.ceil((section.investmentItems || []).reduce((sum, item) => sum + (item.currentValue || 0), 0));
      return { 
        estimated: totalAllocated, 
        spent: totalInvested, 
        remaining: totalAllocated - totalInvested, 
        currentValue 
      };
    }
    
    // For balance-tracking funds: show monthly estimated/spent AND cumulative balance
    if (BALANCE_TRACKING_FUNDS.includes(section.id)) {
      return section.expenses.reduce(
        (acc, e) => {
          const monthlyAlloc = e.estimated || 0;
          const monthlySpent = e.spent || 0;
          const totalAlloc = e.totalAllocated || 0;
          const totalSp = e.totalSpent || 0;
          
          let currentBalance = totalAlloc - totalSp;
          
          // Legacy support: manual injects like "saved" or "preExistingFD" count towards balance
          if (section.id === "emergency-fund" || section.id === "saving-fund") {
            currentBalance += (e.saved || 0) + (e.isFD ? (e.preExistingFD || 0) : 0);
          }

          const fdBalance = e.isFD ? (e.preExistingFD || 0) : 0;
          const sbBalance = currentBalance - fdBalance;

          return {
            estimated: acc.estimated + monthlyAlloc,
            spent: acc.spent + monthlySpent,
            remaining: acc.remaining + (monthlyAlloc - monthlySpent),
            totalAllocated: (acc.totalAllocated || 0) + totalAlloc,
            totalSpent: (acc.totalSpent || 0) + totalSp,
            currentBalance: (acc.currentBalance || 0) + currentBalance,
            sbBalance: (acc.sbBalance || 0) + sbBalance,
            fdBalance: (acc.fdBalance || 0) + fdBalance,
          };
        },
        { estimated: 0, spent: 0, remaining: 0, totalAllocated: 0, totalSpent: 0, currentBalance: 0, sbBalance: 0, fdBalance: 0 }
      );
    }

    // Simple funds
    return section.expenses.reduce(
      (acc, e) => {
        if (e.preExistingFD && e.preExistingFD > 0 && !e.spent) {
          return acc;
        }
        return {
          estimated: acc.estimated + e.estimated,
          spent: acc.spent + (e.spent || 0),
          remaining: acc.remaining + ((e.estimated || 0) - (e.spent || 0)),
        };
      },
      { estimated: 0, spent: 0, remaining: 0 }
    );
  };

  const calculateEmergencyTarget = (duration: number) => {
    const dailyExpenses = sections.find(s => s.id === "daily-expenses")?.expenses.reduce((sum, e) => sum + (e.estimated || 0), 0) || 0;
    const loanEMIs = sections.find(s => s.id === "loan-fund")?.expenses.reduce((sum, e) => sum + (e.emi || 0), 0) || 0;
    return (dailyExpenses + loanEMIs) * duration;
  };

  const getTotalFD = () => {
    let totalFD = 0;
    sectionsWithFreeFund.forEach((s) => {
      s.expenses.forEach((e) => {
        if (e.isFD) {
          totalFD += (e.preExistingFD || 0);
          if (BALANCE_TRACKING_FUNDS.includes(s.id)) {
            // FD balance from totalAllocated - totalSpent for balance tracking funds
          }
        }
      });
    });
    return totalFD;
  };

  // Get total SB balance across all balance-tracking funds
  const getTotalSBBalance = () => {
    let total = 0;
    sectionsWithFreeFund.forEach((s) => {
      if (BALANCE_TRACKING_FUNDS.includes(s.id)) {
        s.expenses.forEach((e) => {
          const currentBalance = (e.totalAllocated || 0) - (e.totalSpent || 0);
          const fdBalance = e.isFD ? (e.preExistingFD || 0) : 0;
          total += (currentBalance - fdBalance);
        });
      }
    });
    return Math.max(0, total);
  };

  // Get total locked-in amount across investments and saving funds
  const getTotalLockedIn = () => {
    let total = 0;
    // Investment lock-in
    const investmentSection = sectionsWithFreeFund.find(s => s.id === "investment-fund");
    if (investmentSection?.investmentItems) {
      total += investmentSection.investmentItems.reduce((sum, i) => sum + (i.lockedInAmount || 0), 0);
    }
    // Saving fund lock-in
    const savingSection = sectionsWithFreeFund.find(s => s.id === "saving-fund");
    if (savingSection) {
      total += savingSection.expenses.reduce((sum, e) => sum + (e.lockedInAmount || 0), 0);
    }
    return total;
  };

  const overallTotals = sectionsWithFreeFund.reduce(
    (acc, s) => {
      const t = getSectionTotals(s);
      // For investment fund, we count the entire allocated amount as spent
      // because that money is set aside and no longer in the savings pool.
      const spentContribution = s.id === "investment-fund" ? t.estimated : t.spent;
      
      return {
        estimated: acc.estimated + t.estimated,
        spent: acc.spent + spentContribution,
        remaining: acc.remaining + (t.estimated - spentContribution),
      };
    },
    { estimated: 0, spent: 0, remaining: 0 }
  );

  const dashboardData = {
    totalBudget,
    totalSpent: overallTotals.spent,
    totalRemaining: totalBudget - overallTotals.spent,
    unallocatedBudget,
    sections: sectionsWithFreeFund.map((s) => ({ ...s, totals: getSectionTotals(s) })),
  };

  return {
    sections: sectionsWithFreeFund,
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
    updateSectionPlanningDuration,
    addInvestmentItem,
    updateInvestmentItem,
    deleteInvestmentItem,
    getSectionTotals,
    reorderSections,
    calculateEmergencyTarget,
    overallTotals,
    dashboardData,
    getTotalFD,
    getTotalSBBalance,
    getTotalLockedIn,
    loading,
    currentMonth,
    setCurrentMonth,
    currentYear,
    setCurrentYear,
    isFDEligible: (sectionId: string) => FD_ELIGIBLE_FUNDS.includes(sectionId),
    isBalanceTracking: (sectionId: string) => BALANCE_TRACKING_FUNDS.includes(sectionId),
    isSimpleFund: (sectionId: string) => SIMPLE_FUNDS.includes(sectionId),
  };
}
