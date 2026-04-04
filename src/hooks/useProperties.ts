import { useState, useEffect } from "react";

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
  const [properties, setProperties] = useState<Property[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
  }, [properties]);

  const addProperty = (p: Omit<Property, "id">) => {
    setProperties((prev) => [...prev, { ...p, id: crypto.randomUUID() }]);
  };

  const updateProperty = (id: string, updates: Partial<Omit<Property, "id">>) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProperty = (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  const totalPropertyValue = properties.reduce((sum, p) => sum + p.totalSqft * p.currentRatePerSqft, 0);
  const totalPurchaseValue = properties.reduce((sum, p) => sum + p.totalSqft * p.purchaseRatePerSqft, 0);

  return { properties, addProperty, updateProperty, deleteProperty, totalPropertyValue, totalPurchaseValue };
}
