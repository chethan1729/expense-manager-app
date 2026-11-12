import { useState, useEffect, useCallback } from "react";

export interface NetWorthSnapshot {
  date: string; // YYYY-MM-DD
  netWorth: number;
  netWorthWithLoans: number;
  timestamp: string; // ISO timestamp of when it was recorded
}

const STORAGE_KEY = "net-worth-history";

const SPIKE_THRESHOLD = 20_000_000; // 2 crore — anything above is a spike

function sanitizeHistory(raw: NetWorthSnapshot[]): NetWorthSnapshot[] {
  if (!raw || raw.length === 0) return raw;
  // Find the median/baseline from non-spiked entries
  const normal = raw.filter((s) => s.netWorth <= SPIKE_THRESHOLD);
  if (normal.length === 0) return raw; // cannot determine baseline
  const baseline = normal[normal.length - 1]; // last good snapshot
  return raw.map((s) =>
    s.netWorth > SPIKE_THRESHOLD
      ? { ...s, netWorth: baseline.netWorth, netWorthWithLoans: baseline.netWorthWithLoans }
      : s
  );
}

export const useNetWorthHistory = () => {
  const [history, setHistory] = useState<NetWorthSnapshot[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    try {
      const parsed: NetWorthSnapshot[] = JSON.parse(saved);
      const sanitized = sanitizeHistory(parsed);
      // Persist back if any repairs were made
      const hasSpike = parsed.some((s) => s.netWorth > SPIKE_THRESHOLD);
      if (hasSpike) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized)); } catch { /* ignore */ }
      }
      return sanitized;
    } catch { return []; }
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
