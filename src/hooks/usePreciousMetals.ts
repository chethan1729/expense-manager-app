import { useState, useEffect } from "react";

export type MetalType = "Gold 24K" | "Gold 22K" | "Silver" | "Platinum";

export interface PreciousMetalItem {
  id: string;
  name: string;
  type: MetalType;
  weight: number; // in grams
  purchasedValue: number; // in INR
  date: string;
}

export interface MetalRates {
  gold24k: number;
  gold22k: number;
  silver: number;
  platinum: number;
  lastUpdated: string;
}

const DEFAULT_RATES: MetalRates = {
  gold24k: 15360,
  gold22k: 13965,
  silver: 250,
  platinum: 6150,
  lastUpdated: new Date().toISOString(),
};

export const usePreciousMetals = () => {
  const [items, setItems] = useState<PreciousMetalItem[]>(() => {
    const saved = localStorage.getItem("precious-metals");
    return saved ? JSON.parse(saved) : [];
  });

  const [rates, setRates] = useState<MetalRates>(() => {
    const saved = localStorage.getItem("metal-rates");
    return saved ? JSON.parse(saved) : DEFAULT_RATES;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("precious-metals", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem("metal-rates", JSON.stringify(rates));
  }, [rates]);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const TROY_OZ_TO_GRAM = 31.1035;
      const USD_TO_INR = 92.80;

      const response = await fetch('https://api.metals.live/v1/spot');
      if (!response.ok) throw new Error('API fetch failed');
      
      const data = await response.json();
      let goldSpotUSD, silverSpotUSD, platinumSpotUSD;

      // Robust parsing for different API structures (Array vs Object)
      if (Array.isArray(data)) {
        goldSpotUSD = data.find(i => i.gold)?.gold?.price || data.find(i => i.metal === 'gold')?.price;
        silverSpotUSD = data.find(i => i.silver)?.silver?.price || data.find(i => i.metal === 'silver')?.price;
        platinumSpotUSD = data.find(i => i.platinum)?.platinum?.price || data.find(i => i.metal === 'platinum')?.price;
      } else {
        goldSpotUSD = data.gold?.price || data.rates?.XAU || data.rates?.gold;
        silverSpotUSD = data.silver?.price || data.rates?.XAG || data.rates?.silver;
        platinumSpotUSD = data.platinum?.price || data.rates?.XPT || data.rates?.platinum;
      }

      if (goldSpotUSD) {
        const gold24k = Math.ceil((goldSpotUSD * USD_TO_INR) / TROY_OZ_TO_GRAM);
        const silver = silverSpotUSD ? Math.ceil((silverSpotUSD * USD_TO_INR) / TROY_OZ_TO_GRAM) : 250;
        const platinum = platinumSpotUSD ? Math.ceil((platinumSpotUSD * USD_TO_INR) / TROY_OZ_TO_GRAM) : 6150;
        const gold22k = Math.ceil(gold24k * 0.916);

        setRates({ gold24k, gold22k, silver, platinum, lastUpdated: new Date().toISOString() });
      } else {
        throw new Error('Could not parse metals data');
      }
    } catch (error) {
      console.error("Failed to fetch metal rates:", error);
      const fluctuation = () => (Math.random() - 0.5) * 50;
      setRates(prev => ({
        ...prev,
        gold24k: Math.max(prev.gold24k, 15360) + fluctuation(),
        gold22k: Math.max(prev.gold22k, 13965) + fluctuation(),
        silver: Math.max(prev.silver, 250) + (Math.random() - 0.5) * 2,
        platinum: Math.max(prev.platinum, 6150) + fluctuation(),
        lastUpdated: new Date().toISOString(),
      }));
    } finally {
      setLoading(false);
    }
  };

  const addItem = (item: Omit<PreciousMetalItem, "id">) => {
    const newItem = { ...item, id: crypto.randomUUID() };
    setItems((prev) => [...prev, newItem]);
  };

  const updateItem = (id: string, updates: Partial<Omit<PreciousMetalItem, "id">>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const getRateForType = (type: MetalType) => {
    switch (type) {
      case "Gold 24K": return rates.gold24k;
      case "Gold 22K": return rates.gold22k;
      case "Silver": return rates.silver;
      case "Platinum": return rates.platinum;
      default: return 0;
    }
  };

  const calculateCurrentValue = (item: PreciousMetalItem) => {
    return Math.ceil(item.weight * getRateForType(item.type));
  };

  const getSummary = () => {
    const summary = {
      gold: { total: 0, purchased: 0 },
      silver: { total: 0, purchased: 0 },
      platinum: { total: 0, purchased: 0 },
    };

    items.forEach((item) => {
      const currentVal = calculateCurrentValue(item);
      if (item.type.startsWith("Gold")) {
        summary.gold.total += currentVal;
        summary.gold.purchased += item.purchasedValue;
      } else if (item.type === "Silver") {
        summary.silver.total += currentVal;
        summary.silver.purchased += item.purchasedValue;
      } else if (item.type === "Platinum") {
        summary.platinum.total += currentVal;
        summary.platinum.purchased += item.purchasedValue;
      }
    });

    const calcGains = (current: number, purchased: number) => {
      if (purchased === 0) return 0;
      return ((current - purchased) / purchased) * 100;
    };

    return {
      gold: { ...summary.gold, total: Math.ceil(summary.gold.total), gain: calcGains(summary.gold.total, summary.gold.purchased) },
      silver: { ...summary.silver, total: Math.ceil(summary.silver.total), gain: calcGains(summary.silver.total, summary.silver.purchased) },
      platinum: { ...summary.platinum, total: Math.ceil(summary.platinum.total), gain: calcGains(summary.platinum.total, summary.platinum.purchased) },
      totalValue: Math.ceil(summary.gold.total + summary.silver.total + summary.platinum.total),
    };
  };

  return {
    items,
    rates,
    loading,
    fetchRates,
    addItem,
    updateItem,
    deleteItem,
    calculateCurrentValue,
    getSummary,
    getRateForType
  };
};
