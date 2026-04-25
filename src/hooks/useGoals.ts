import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";

export interface GoalSubTarget {
  id: string;
  name: string;
  amount: number;
}

export interface GoalFundingSource {
  id: string;
  sourceType: "investment-profile" | "fd" | "saving-fund" | "epf" | "other-savings";
  sourceId: string;
  sourceName: string;
  allocatedAmount: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string; // YYYY-MM
  subTargets: GoalSubTarget[];
  fundingSources: GoalFundingSource[];
  createdAt: string;
}

const STORAGE_KEY = "expense-manager-goals";

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (value) {
          setGoals(JSON.parse(value));
        }
      } catch (e) {
        console.error("Error loading goals:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(goals) });
    }
  }, [goals, loading]);

  const addGoal = (goal: Omit<Goal, "id" | "createdAt">) => {
    setGoals((prev) => [
      ...prev,
      { ...goal, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
    ]);
  };

  const updateGoal = (id: string, updates: Partial<Omit<Goal, "id" | "createdAt">>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  };

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  // Calculate how much of a given source is already allocated across ALL goals (or all goals except one)
  const getSourceAllocated = (sourceType: string, sourceId: string, excludeGoalId?: string) => {
    return goals
      .filter((g) => (excludeGoalId ? g.id !== excludeGoalId : true))
      .reduce((sum, g) => {
        return (
          sum +
          g.fundingSources
            .filter((f) => f.sourceType === sourceType && f.sourceId === sourceId)
            .reduce((s, f) => s + f.allocatedAmount, 0)
        );
      }, 0);
  };

  const getGoalProgress = (goal: Goal) => {
    const totalFunded = goal.fundingSources.reduce((sum, f) => sum + f.allocatedAmount, 0);
    const remaining = Math.max(0, goal.targetAmount - totalFunded);

    const now = new Date();
    const [year, month] = goal.targetDate.split("-").map(Number);
    const targetDate = new Date(year, month - 1, 1); // first of target month
    const diffMs = targetDate.getTime() - now.getTime();
    const monthsLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30.44)));

    const perMonth = monthsLeft > 0 ? remaining / monthsLeft : remaining;
    const percent = goal.targetAmount > 0 ? (totalFunded / goal.targetAmount) * 100 : 0;

    return { totalFunded, remaining, monthsLeft, perMonth, percent };
  };

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    getSourceAllocated,
    getGoalProgress,
  };
}
