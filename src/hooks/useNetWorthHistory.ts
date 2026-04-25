import { useState, useEffect, useCallback } from "react";

export interface NetWorthSnapshot {
  date: string; // YYYY-MM-DD
  netWorth: number;
  netWorthWithLoans: number;
  timestamp: string; // ISO timestamp of when it was recorded
}

const STORAGE_KEY = "net-worth-history";

export const useNetWorthHistory = () => {
  const [history, setHistory] = useState<NetWorthSnapshot[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const recordSnapshot = useCallback((netWorth: number, netWorthWithLoans: number) => {
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    setHistory((prev) => {
      // Find if we already have a snapshot for today
      const existingIndex = prev.findIndex((s) => s.date === dateKey);
      const snapshot: NetWorthSnapshot = {
        date: dateKey,
        netWorth: Math.ceil(netWorth),
        netWorthWithLoans: Math.ceil(netWorthWithLoans),
        timestamp: now.toISOString(),
      };

      if (existingIndex >= 0) {
        // Update today's entry (latest value wins — simulating 11:59 PM final)
        const updated = [...prev];
        updated[existingIndex] = snapshot;
        return updated;
      } else {
        return [...prev, snapshot];
      }
    });
  }, []);

  const resetHistory = useCallback((netWorth: number, netWorthWithLoans: number) => {
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    
    const initialSnapshot: NetWorthSnapshot = {
      date: dateKey,
      netWorth: Math.ceil(netWorth),
      netWorthWithLoans: Math.ceil(netWorthWithLoans),
      timestamp: now.toISOString(),
    };
    
    setHistory([initialSnapshot]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([initialSnapshot]));
    return initialSnapshot;
  }, []);

  // Get the last N days of history
  const getRecentHistory = useCallback((days: number = 30): NetWorthSnapshot[] => {
    return history.slice(-days);
  }, [history]);

  return {
    history,
    recordSnapshot,
    resetHistory,
    getRecentHistory,
  };
};
