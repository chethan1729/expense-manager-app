import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";

export interface Property {
  id: string;
  name: string;
  description: string;
  totalSqft: number;
  purchaseRatePerSqft: number;
  currentRatePerSqft: number;
}

const STORAGE_KEY = "expense-manager-properties";

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (value) {
          setProperties(JSON.parse(value));
        } else {
          // Migration
          const local = localStorage.getItem(STORAGE_KEY);
          if (local) {
            const data = JSON.parse(local);
            setProperties(data);
            await Preferences.set({ key: STORAGE_KEY, value: local });
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        console.error("Error loading properties:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(properties) });
    }
  }, [properties, loading]);

  const addProperty = (p: Omit<Property, "id">) => {
    setProperties((prev) => [...prev, { ...p, id: crypto.randomUUID() }]);
  };

  const updateProperty = (id: string, updates: Partial<Omit<Property, "id">>) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProperty = (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  const totalPropertyValue = properties.reduce((sum, p) => sum + (p.totalSqft || 0) * (p.currentRatePerSqft || 0), 0);
  const totalPurchaseValue = properties.reduce((sum, p) => sum + (p.totalSqft || 0) * (p.purchaseRatePerSqft || 0), 0);

  return { properties, addProperty, updateProperty, deleteProperty, totalPropertyValue, totalPurchaseValue, loading };
}
