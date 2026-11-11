import { useState, useEffect, useCallback } from "react";

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
  gold24k: 7450,
  gold22k: 6825,
  silver: 85,
  platinum: 3000,
  lastUpdated: new Date().toISOString(),
};

const TROY_OUNCE_TO_GRAMS = 31.1035;
const METAL_SOURCE_URL = "https://api.metals.live/v1/spot";
const FX_SOURCE_URL = "https://api.frankfurter.app/latest?from=USD&to=INR";
const GOLD_API_URLS = { silver: "https://api.gold-api.com/price/XAG", platinum: "https://api.gold-api.com/price/XPT" };
const DATA_PROXIES = ["", "https://corsproxy.io/?", "https://api.allorigins.win/raw?url="];
const READABLE_PAGE_PREFIX = "https://r.jina.ai/";
const BENGALURU_GOLD_URL = "https://www.goodreturns.in/gold-rates/bangalore.html";
const BENGALURU_SILVER_URL = "https://www.goodreturns.in/silver-rates/bangalore.html";
const BENGALURU_PLATINUM_URL = "https://www.goodreturns.in/platinum-rate-in-bangalore.html";
const BENGALURU_GOLD_22K_FALLBACK = 14505;
const BENGALURU_SILVER_FALLBACK = 255;
const BENGALURU_PLATINUM_FALLBACK = 5590;

async function fetchRateData(url: string) {
  for (const proxy of DATA_PROXIES) {
    try {
      const response = await Promise.race([
        fetch(`${proxy}${proxy ? encodeURIComponent(url) : url}`, { cache: "no-store" }),
        new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("Rate request timed out")), 5000)),
      ]);
      if (response.ok) return await response.json();
    } catch {
      // Try the next source.
    }
  }
  throw new Error("Live rate source unavailable");
}

export function parseGoodreturnsRate(markdown: string, metal: "gold22k" | "silver" | "platinum") {
  const heading = metal === "gold22k"
    ? "Today Gold Price Per Gram in Bangalore"
    : metal === "silver"
      ? "Today Silver Price Per Gram/Kg in Bangalore"
      : "Today Platinum Price Per Gram in Bangalore";
  const start = markdown.toLowerCase().indexOf(heading.toLowerCase());
  const section = start >= 0 ? markdown.slice(start, start + 5000) : markdown;
  const tableRows = section.split(/\r?\n/).filter((line) => /^\s*\|/.test(line));
  const parseAmount = (cell: string) => {
    const digits = cell.replace(/[^\d]/g, "");
    return digits ? Number(digits) : 0;
  };

  if (metal === "gold22k") {
    for (let index = 0; index < tableRows.length - 1; index += 1) {
      const headers = tableRows[index].split("|").map((cell) => cell.trim().toLowerCase());
      const gold22kColumn = headers.findIndex((cell) => cell === "22k" || cell.includes("22k"));
      if (gold22kColumn < 0) continue;
      const firstDataRow = tableRows.slice(index + 1).find((row) => {
        const cells = row.split("|").map((cell) => cell.trim());
        return cells[1] === "1" && cells[gold22kColumn];
      });
      if (firstDataRow) {
        const cells = firstDataRow.split("|").map((cell) => cell.trim());
        const rate = parseAmount(cells[gold22kColumn]);
        if (rate > 0) return rate;
      }
    }
    return 0;
  }

  const perGramRow = tableRows.find((row) => {
    const cells = row.split("|").map((cell) => cell.trim());
    return cells[1] === "1" && /₹?\s*[\d,]+/.test(cells[2] || "");
  });
  if (!perGramRow) return 0;
  return parseAmount(perGramRow.split("|").map((cell) => cell.trim())[2]);
}

async function fetchGoodreturnsRate(url: string, metal: "gold22k" | "silver" | "platinum") {
  try {
    const response = await Promise.race([
      fetch(`${READABLE_PAGE_PREFIX}${url}`, {
        cache: "no-store",
        headers: { Accept: "text/plain", "x-no-cache": "true" },
      }),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("Local metal rate request timed out")), 8000)),
    ]);
    if (!response.ok) return 0;
    return parseGoodreturnsRate(await response.text(), metal);
  } catch {
    return 0;
  }
}

function readSpot(data: unknown, metal: string): number | undefined {
  if (Array.isArray(data)) {
    const entry = data.find((item) => {
      if (!item || typeof item !== "object") return false;
      const value = item as Record<string, unknown>;
      return value.metal === metal || metal in value;
    }) as Record<string, unknown> | undefined;
    const value = entry?.[metal];
    if (typeof value === "number") return value;
    if (value && typeof value === "object" && typeof (value as Record<string, unknown>).price === "number") return (value as Record<string, number>).price;
    return typeof entry?.price === "number" ? entry.price : undefined;
  }
  if (!data || typeof data !== "object") return undefined;
  const value = (data as Record<string, unknown>)[metal] || (data as Record<string, Record<string, unknown>>).rates?.[metal];
  if (typeof value === "number") return value;
  return value && typeof value === "object" && typeof (value as Record<string, unknown>).price === "number"
    ? (value as Record<string, number>).price
    : undefined;
}

function readQuotePrice(data: unknown): number | undefined {
  if (!data || typeof data !== "object") return undefined;
  const price = (data as Record<string, unknown>).price;
  return typeof price === "number" ? price : undefined;
}

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

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const [data, fx, localGold22k, localSilver, localPlatinum, silverQuote, platinumQuote] = await Promise.all([
        fetchRateData(METAL_SOURCE_URL).catch(() => null),
        fetchRateData(FX_SOURCE_URL).catch(() => null),
        fetchGoodreturnsRate(BENGALURU_GOLD_URL, "gold22k"),
        fetchGoodreturnsRate(BENGALURU_SILVER_URL, "silver"),
        fetchGoodreturnsRate(BENGALURU_PLATINUM_URL, "platinum"),
        fetchRateData(GOLD_API_URLS.silver).catch(() => null),
        fetchRateData(GOLD_API_URLS.platinum).catch(() => null),
      ]);
      const usdToInr = Number(fx?.rates?.INR);
      const goldSpotUSD = readSpot(data, "gold");
      const silverSpotUSD = readSpot(data, "silver") || readQuotePrice(silverQuote);
      const platinumSpotUSD = readSpot(data, "platinum") || readQuotePrice(platinumQuote);

      const gold24k = goldSpotUSD && usdToInr ? Math.ceil((goldSpotUSD * usdToInr) / TROY_OUNCE_TO_GRAMS) : undefined;
      const silver = localSilver > 0 ? localSilver : silverSpotUSD && usdToInr ? Math.ceil((silverSpotUSD * usdToInr) / TROY_OUNCE_TO_GRAMS) : BENGALURU_SILVER_FALLBACK;
      const platinum = localPlatinum > 0 ? localPlatinum : platinumSpotUSD && usdToInr ? Math.ceil((platinumSpotUSD * usdToInr) / TROY_OUNCE_TO_GRAMS) : BENGALURU_PLATINUM_FALLBACK;
      const gold22k = localGold22k > 0 ? localGold22k : BENGALURU_GOLD_22K_FALLBACK;

      setRates((previous) => ({ gold24k: gold24k ?? previous.gold24k, gold22k, silver, platinum, lastUpdated: new Date().toISOString() }));
    } catch (error) {
      console.error("Failed to fetch metal rates:", error);
      setRates(prev => {
        return {
          ...prev,
          gold22k: BENGALURU_GOLD_22K_FALLBACK,
          silver: BENGALURU_SILVER_FALLBACK,
          platinum: BENGALURU_PLATINUM_FALLBACK,
        };
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRates();
  }, [fetchRates]);

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
