import { useState, useEffect, useMemo } from "react";
import { Preferences } from "@capacitor/preferences";

export interface Transaction {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  fundId: string; // "daily-expenses", "wishlist-fund", "hobby-fund"
  expenseId?: string; // Which expense item (only for daily-expenses)
  amount: number;
  description?: string;
  paymentMode?: 'upi' | 'credit-card' | 'cash';
  automatedId?: string; // Links to SMS transaction hash
}

export interface MonthlyTransactions {
  [monthKey: string]: Transaction[];
}

const TRANSACTIONS_KEY = "expense-manager-transactions-v1";

export const TRANSACTION_FUNDS = ["daily-expenses", "wishlist-fund", "hobby-fund"] as const;
export type TransactionFundType = typeof TRANSACTION_FUNDS[number];

export type PaymentMode = 'upi' | 'credit-card' | 'cash';
export const PAYMENT_MODES = [
  { id: 'upi', label: 'UPI / Net Banking' },
  { id: 'credit-card', label: 'Credit Card' },
  { id: 'cash', label: 'Cash' },
] as const;

export function useTransactions() {
  const [transactions, setTransactions] = useState<MonthlyTransactions>({});
  const [loading, setLoading] = useState(true);

  // Load transactions from storage
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const { value } = await Preferences.get({ key: TRANSACTIONS_KEY });
        if (value) {
          setTransactions(JSON.parse(value));
        }
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, []);

  // Save transactions to storage
  const saveTransactions = async (data: MonthlyTransactions) => {
    try {
      await Preferences.set({ key: TRANSACTIONS_KEY, value: JSON.stringify(data) });
    } catch (error) {
      console.error("Failed to save transactions:", error);
    }
  };

  // Get month key from date
  const getMonthKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${year}-${month}`;
  };

  // Add a new transaction
  const addTransaction = (
    date: string,
    fundId: TransactionFundType,
    amount: number,
    expenseId?: string,
    description?: string,
    paymentMode?: PaymentMode,
    automatedId?: string,
  ) => {
    const dateObj = new Date(date);
    const monthKey = getMonthKey(dateObj);

    const newTransaction: Transaction = {
      id: `transaction-${Date.now()}-${Math.random()}`,
      date,
      fundId,
      expenseId,
      amount,
      description,
      paymentMode,
      automatedId,
    };

    setTransactions((prev) => {
      const updated = { ...prev };
      if (!updated[monthKey]) {
        updated[monthKey] = [];
      }
      updated[monthKey].push(newTransaction);
      saveTransactions(updated);
      return updated;
    });

    return newTransaction;
  };

  // Update a transaction
  const updateTransaction = (id: string, updates: Partial<Transaction>, monthKey: string) => {
    setTransactions((prev) => {
      const updated = { ...prev };
      if (updated[monthKey]) {
        const index = updated[monthKey].findIndex((t) => t.id === id);
        if (index !== -1) {
          updated[monthKey][index] = { ...updated[monthKey][index], ...updates };
          saveTransactions(updated);
        }
      }
      return updated;
    });
  };

  // Delete a transaction
  const deleteTransaction = (id: string, monthKey: string) => {
    setTransactions((prev) => {
      const updated = { ...prev };
      if (updated[monthKey]) {
        updated[monthKey] = updated[monthKey].filter((t) => t.id !== id);
        saveTransactions(updated);
      }
      return updated;
    });
  };

  // Get transactions for a specific month
  const getTransactionsForMonth = (monthKey: string): Transaction[] => {
    return transactions[monthKey] || [];
  };

  // Get transactions for a specific date
  const getTransactionsForDate = (date: string, monthKey: string): Transaction[] => {
    const monthTransactions = transactions[monthKey] || [];
    return monthTransactions.filter((t) => t.date === date);
  };

  // Get total spent for a date
  const getTotalSpentForDate = (date: string, fundId: TransactionFundType, monthKey: string): number => {
    const dateTransactions = getTransactionsForDate(date, monthKey);
    return dateTransactions
      .filter((t) => t.fundId === fundId)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionsForMonth,
    getTransactionsForDate,
    getTotalSpentForDate,
    getMonthKey,
  };
}
