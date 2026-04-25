import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";

export interface SubAsset {
  id: string;
  name: string;
  invested: number;
  currentValue: number;
}

export interface DiversificationItem {
  id: string;
  broker: string;
  type: 'Equity' | 'Mutual Fund' | 'Crypto' | 'Other' | string;
  subAssets: SubAsset[];
}

export interface DiversificationPlan {
  id: string;
  name: string;
  budget: number;
  items: DiversificationItem[];
}

const STORAGE_KEY = "investment-diversification-plans";

export function useInvestmentPlanner() {
  const [plans, setPlans] = useState<DiversificationPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (value) {
          let parsedPlans = JSON.parse(value);
          
          // Migration: Convert old single-asset items to multi-asset structure
          const migratedPlans = parsedPlans.map((plan: any) => ({
            ...plan,
            items: plan.items.map((item: any) => {
              if (item.subAssets) return item;
              
              // Map old fields to a single sub-asset entry
              return {
                id: item.id,
                broker: item.broker,
                type: item.type,
                subAssets: [{
                  id: crypto.randomUUID(),
                  name: item.assetName || "Default Asset",
                  invested: item.invested || 0,
                  currentValue: item.currentValue || 0
                }]
              };
            })
          }));

          setPlans(migratedPlans);
        }
      } catch (error) {
        console.error("Failed to load diversification plans:", error);
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  useEffect(() => {
    if (!loading) {
      Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(plans),
      });
    }
  }, [plans, loading]);

  const addPlan = (name: string, budget: number = 0) => {
    const newPlan: DiversificationPlan = {
      id: crypto.randomUUID(),
      name,
      budget,
      items: [],
    };
    setPlans((prev) => [...prev, newPlan]);
    return newPlan.id;
  };

  const updatePlan = (id: string, updates: Partial<Omit<DiversificationPlan, "id" | "items">>) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const deletePlan = (id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const addItemToPlan = (planId: string, item: Omit<DiversificationItem, "id">) => {
    const newItem: DiversificationItem = {
      id: crypto.randomUUID(),
      ...item,
    };
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId ? { ...p, items: [...p.items, newItem] } : p
      )
    );
  };

  const updateItemInPlan = (
    planId: string,
    itemId: string,
    updates: Partial<Omit<DiversificationItem, "id">>
  ) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
               ...p,
               items: p.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
            }
          : p
      )
    );
  };

  const deleteItemFromPlan = (planId: string, itemId: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, items: p.items.filter((i) => i.id !== itemId) }
          : p
      )
    );
  };

  const getPlanTotals = (plan: DiversificationPlan) => {
    const itemTotals = plan.items.map(item => {
      const invested = item.subAssets.reduce((s, a) => s + (a.invested || 0), 0);
      const currentValue = item.subAssets.reduce((s, a) => s + (a.currentValue || 0), 0);
      return { invested, currentValue };
    });

    const totalInvested = itemTotals.reduce((sum, it) => sum + it.invested, 0);
    const totalCurrentValue = itemTotals.reduce((sum, it) => sum + it.currentValue, 0);
    const profitLoss = totalCurrentValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrentValue,
      profitLoss,
      profitLossPercentage,
    };
  };

  return {
    plans,
    loading,
    addPlan,
    updatePlan,
    deletePlan,
    addItemToPlan,
    updateItemInPlan,
    deleteItemFromPlan,
    getPlanTotals,
  };
}
