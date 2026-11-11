import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";

export interface GoalSubTarget {
  id: string;
  name: string;
  amount: number;
}

export interface GoalFundingSource {
  id: string;
  sourceType: "investment-profile" | "wife-investment-profile" | "fd" | "saving-fund" | "epf" | "other-savings";
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
  image?: string; // Base64 encoded goal photo
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

  const reorderGoals = (activeId: string, overId: string) => {
    setGoals((prev) => {
      const oldIndex = prev.findIndex((goal) => goal.id === activeId);
      const newIndex = prev.findIndex((goal) => goal.id === overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });
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

  const getSourceAllocations = (sourceType: string, sourceId: string) => {
    const allocations: { goalName: string; amount: number }[] = [];
    goals.forEach((g) => {
      const sourceAllocations = g.fundingSources.filter(
        (f) => f.sourceType === sourceType && f.sourceId === sourceId
      );
      if (sourceAllocations.length > 0) {
        allocations.push({
          goalName: g.name,
          amount: sourceAllocations.reduce((s, f) => s + f.allocatedAmount, 0),
        });
      }
    });
    return allocations;
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
    reorderGoals,
    getSourceAllocated,
    getSourceAllocations,
    getGoalProgress,
  };
}
