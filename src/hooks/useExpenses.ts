import { useState, useEffect } from "react";

export interface Expense {
  id: string;
  description: string;
  estimated: number;
  spent: number;
}

const STORAGE_KEY = "expense-manager-april-2026";

const defaultExpenses: Expense[] = [
  { id: "1", description: "Maintanance", estimated: 4500, spent: 0 },
  { id: "2", description: "Electricity Bill", estimated: 1500, spent: 0 },
  { id: "3", description: "Petrol / Bus / Cab", estimated: 5000, spent: 50 },
  { id: "4", description: "Groceries", estimated: 4000, spent: 456 },
  { id: "5", description: "Food", estimated: 4000, spent: 0 },
  { id: "6", description: "Mobile Recharge / Wifi / DTH", estimated: 500, spent: 0 },
  { id: "7", description: "OTT - Netflix, Spotify etc", estimated: 1000, spent: 0 },
  { id: "8", description: "Party / Movie / Cafe / Dining", estimated: 4000, spent: 0 },
  { id: "9", description: "Gift", estimated: 0, spent: 0 },
  { id: "10", description: "Bike License / Insurance / Service", estimated: 2500, spent: 0 },
  { id: "11", description: "Gas - Cylinder", estimated: 0, spent: 0 },
  { id: "12", description: "EMI (Active - 1) / Credit Card Bills", estimated: 53703, spent: 53703 },
  { id: "13", description: "Extra Expenses", estimated: 3000, spent: 0 },
];

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultExpenses;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  const updateExpense = (id: string, updates: Partial<Omit<Expense, "id">>) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const addExpense = (description: string, estimated: number, spent: number) => {
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      description,
      estimated,
      spent,
    };
    setExpenses((prev) => [...prev, newExpense]);
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const totals = expenses.reduce(
    (acc, e) => ({
      estimated: acc.estimated + e.estimated,
      spent: acc.spent + e.spent,
      remaining: acc.remaining + (e.estimated - e.spent),
    }),
    { estimated: 0, spent: 0, remaining: 0 }
  );

  return { expenses, updateExpense, addExpense, deleteExpense, totals };
}
