import { useState, useEffect } from "react";

export interface Expense {
  id: string;
  description: string;
  estimated: number;
  spent: number;
}

export interface InvestmentItem {
  id: string;
  name: string;
  allocated: number;
  currentValue: number;
}

export interface FundSection {
  id: string;
  name: string;
  budget: number;
  expenses: Expense[];
  investmentItems?: InvestmentItem[];
}

const STORAGE_KEY = "expense-manager-funds-v2";
const BUDGET_KEY = "expense-manager-total-budget";

const defaultSections: FundSection[] = [
  {
    id: "daily-expenses",
    name: "Daily Expenses",
    budget: 83703,
    expenses: [
      { id: "1", description: "Maintanance", estimated: 4500, spent: 4756 },
      { id: "2", description: "Electricity Bill", estimated: 1500, spent: 0 },
      { id: "3", description: "Petrol / Bus / Cab", estimated: 5000, spent: 50 },
      { id: "4", description: "Groceries", estimated: 4000, spent: 676 },
      { id: "5", description: "Food", estimated: 4000, spent: 0 },
      { id: "6", description: "Mobile Recharge / Wifi / DTH", estimated: 500, spent: 0 },
      { id: "7", description: "OTT - Netflix, Spotify etc", estimated: 1000, spent: 0 },
      { id: "8", description: "Party / Movie / Cafe / Dining", estimated: 4000, spent: 0 },
      { id: "9", description: "Gift", estimated: 0, spent: 0 },
      { id: "10", description: "Bike License / Insurance / Service", estimated: 2500, spent: 0 },
      { id: "11", description: "Gas - Cylinder", estimated: 0, spent: 0 },
      { id: "12", description: "EMI (Active - 1) / Credit Card Bills", estimated: 53703, spent: 53703 },
      { id: "13", description: "Extra Expenses", estimated: 3000, spent: 0 },
    ],
  },
  {
    id: "investment-fund",
    name: "Investment Fund",
    budget: 17000,
    expenses: [],
    investmentItems: [
      { id: "inv1", name: "Equity Shares (IN)", allocated: 0, currentValue: 0 },
      { id: "inv2", name: "Equity Shares (US)", allocated: 0, currentValue: 0 },
      { id: "inv3", name: "Mutual Fund", allocated: 0, currentValue: 0 },
      { id: "inv4", name: "Mutual Fund (Tax Saver)", allocated: 0, currentValue: 0 },
      { id: "inv5", name: "Crypto", allocated: 0, currentValue: 0 },
    ],
  },
  {
    id: "hobby-fund",
    name: "Hobby Fund",
    budget: 0,
    expenses: [],
  },
  {
    id: "loan-fund",
    name: "Loan Fund",
    budget: 20000,
    expenses: [
      { id: "loan1", description: "Assetz Canvas & Cove - EMI", estimated: 20000, spent: 37336 },
    ],
  },
  {
    id: "wishlist-fund",
    name: "Wishlist Fund",
    budget: 20000,
    expenses: [
      { id: "wf1", description: "Travel", estimated: 100000, spent: 20000 },
      { id: "wf2", description: "Home Rennovation", estimated: 50000, spent: 0 },
      { id: "wf3", description: "Home Functions", estimated: 20000, spent: 0 },
      { id: "wf4", description: "T.Courses / H.Studies", estimated: 10000, spent: 0 },
    ],
  },
  {
    id: "ai-fund",
    name: "AI Fund",
    budget: 0,
    expenses: [],
  },
  {
    id: "emergency-fund",
    name: "Emergency Fund",
    budget: 0,
    expenses: [],
  },
  {
    id: "saving-fund",
    name: "Saving Fund",
    budget: 0,
    expenses: [],
  },
  {
    id: "free-fund",
    name: "Free Fund",
    budget: 0,
    expenses: [],
  },
];

export function useFundManager() {
  const [sections, setSections] = useState<FundSection[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultSections;
  });

  const [totalBudget, setTotalBudget] = useState<number>(() => {
    const stored = localStorage.getItem(BUDGET_KEY);
    return stored ? parseFloat(stored) : 175981;
  });

  const [activeSectionId, setActiveSectionId] = useState<string>("dashboard");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  }, [sections]);

  useEffect(() => {
    localStorage.setItem(BUDGET_KEY, totalBudget.toString());
  }, [totalBudget]);

  const activeSection = sections.find((s) => s.id === activeSectionId) || null;

  const updateExpense = (sectionId: string, expenseId: string, updates: Partial<Omit<Expense, "id">>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, expenses: s.expenses.map((e) => (e.id === expenseId ? { ...e, ...updates } : e)) }
          : s
      )
    );
  };

  const addExpense = (sectionId: string, description: string, estimated: number, spent: number) => {
    const newExpense: Expense = { id: crypto.randomUUID(), description, estimated, spent };
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

  // Investment fund methods
  const updateSectionBudget = (sectionId: string, budget: number) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, budget } : s))
    );
  };

  const addInvestmentItem = (sectionId: string, name: string, allocated: number, currentValue: number) => {
    const item: InvestmentItem = { id: crypto.randomUUID(), name, allocated, currentValue };
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

  const getSectionTotals = (section: FundSection) => {
    // For investment fund, "spent" = budget allocated (goes out of bank)
    if (section.id === "investment-fund") {
      return {
        estimated: section.budget,
        spent: section.budget,
        remaining: 0,
      };
    }
    return section.expenses.reduce(
      (acc, e) => ({
        estimated: acc.estimated + e.estimated,
        spent: acc.spent + e.spent,
        remaining: acc.remaining + (e.estimated - e.spent),
      }),
      { estimated: 0, spent: 0, remaining: 0 }
    );
  };

  const overallTotals = sections.reduce(
    (acc, s) => {
      const t = getSectionTotals(s);
      return {
        estimated: acc.estimated + t.estimated,
        spent: acc.spent + t.spent,
        remaining: acc.remaining + t.remaining,
      };
    },
    { estimated: 0, spent: 0, remaining: 0 }
  );

  const dashboardData = {
    totalBudget,
    totalSpent: overallTotals.spent,
    totalRemaining: totalBudget - overallTotals.spent,
    sections: sections.map((s) => ({ ...s, totals: getSectionTotals(s) })),
  };

  return {
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
    overallTotals,
    dashboardData,
  };
}
