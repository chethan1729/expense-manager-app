import { useState, useEffect } from "react";

export interface Expense {
  id: string;
  description: string;
  estimated: number;
  spent: number;
}

const STORAGE_KEY = "expense-manager-april-2026";

const defaultExpenses: Expense[] = [
  { id: "1", description: "Rent", estimated: 0, spent: 0 },
  { id: "2", description: "Groceries", estimated: 0, spent: 0 },
  { id: "3", description: "Transport", estimated: 0, spent: 0 },
  { id: "4", description: "Utilities", estimated: 0, spent: 0 },
  { id: "5", description: "Entertainment", estimated: 0, spent: 0 },
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
