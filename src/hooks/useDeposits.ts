import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";

export interface FDEntry {
  id: string;
  bankName: string;
  bankKey: string; // e.g. 'hdfc', 'sbi'
  openingDate: string;
  maturityDate: string;
  rateOfInterest: number;
  investedAmount: number;
  maturityAmount: number;
  fundLabel?: string;   // Fund section ID this FD belongs to
  labelColor?: string;  // Color for the label badge
}

export interface EPFEntry {
  id: string;
  totalAccumulated: number;
  lastUpdated: string;
  isLockedIn?: boolean;
}

export interface OtherSavingsEntry {
  id: string;
  name: string;
  totalAmount: number;
  isLockedIn?: boolean;
}

export interface DepositsData {
  fds: FDEntry[];
  epf: EPFEntry | null;
  otherSavings: OtherSavingsEntry[];
}

export const INDIAN_BANKS = [
  { key: "hdfc", name: "HDFC Bank", emoji: "🏦", color: "bg-red-600", textColor: "text-white", abbr: "HDFC" },
  { key: "sbi", name: "State Bank of India", emoji: "🏛️", color: "bg-blue-700", textColor: "text-white", abbr: "SBI" },
  { key: "icici", name: "ICICI Bank", emoji: "🏦", color: "bg-orange-600", textColor: "text-white", abbr: "ICICI" },
  { key: "canara", name: "Canara Bank", emoji: "🏦", color: "bg-yellow-600", textColor: "text-white", abbr: "CANARA" },
  { key: "axis", name: "Axis Bank", emoji: "🏦", color: "bg-purple-700", textColor: "text-white", abbr: "AXIS" },
  { key: "kotak", name: "Kotak Mahindra Bank", emoji: "🏦", color: "bg-red-500", textColor: "text-white", abbr: "KOTAK" },
  { key: "pnb", name: "Punjab National Bank", emoji: "🏦", color: "bg-orange-700", textColor: "text-white", abbr: "PNB" },
  { key: "bob", name: "Bank of Baroda", emoji: "🏦", color: "bg-green-700", textColor: "text-white", abbr: "BOB" },
  { key: "union", name: "Union Bank of India", emoji: "🏦", color: "bg-indigo-700", textColor: "text-white", abbr: "UNION" },
  { key: "idbi", name: "IDBI Bank", emoji: "🏦", color: "bg-teal-700", textColor: "text-white", abbr: "IDBI" },
];

const DEPOSITS_KEY = "expense-manager-deposits-v1";

const emptyDeposits: DepositsData = {
  fds: [],
  epf: null,
  otherSavings: [],
};

export function useDeposits() {
  const [data, setData] = useState<DepositsData>(emptyDeposits);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { value } = await Preferences.get({ key: DEPOSITS_KEY });
        if (value) {
          setData(JSON.parse(value));
        }
      } catch (err) {
        console.error("Error loading deposits:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Preferences.set({ key: DEPOSITS_KEY, value: JSON.stringify(data) });
    }
  }, [data, loading]);

  const addFD = (entry: Omit<FDEntry, "id">) => {
    setData(prev => ({
      ...prev,
      fds: [...prev.fds, { ...entry, id: crypto.randomUUID() }],
    }));
  };

  const updateFD = (id: string, updates: Partial<Omit<FDEntry, "id">>) => {
    setData(prev => ({
      ...prev,
      fds: prev.fds.map(fd => fd.id === id ? { ...fd, ...updates } : fd),
    }));
  };

  const deleteFD = (id: string) => {
    setData(prev => ({ ...prev, fds: prev.fds.filter(fd => fd.id !== id) }));
  };

  // FDs sorted by nearest maturity date
  const sortedFDs = [...data.fds].sort((a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime());

  const setEPF = (totalAccumulated: number, isLockedIn?: boolean) => {
    setData(prev => ({
      ...prev,
      epf: { id: prev.epf?.id || crypto.randomUUID(), totalAccumulated, lastUpdated: new Date().toISOString().split('T')[0], isLockedIn },
    }));
  };

  const addOtherSavings = (name: string, totalAmount: number, isLockedIn?: boolean) => {
    setData(prev => ({
      ...prev,
      otherSavings: [...prev.otherSavings, { id: crypto.randomUUID(), name, totalAmount, isLockedIn }],
    }));
  };

  const updateOtherSavings = (id: string, updates: Partial<Omit<OtherSavingsEntry, "id">>) => {
    setData(prev => ({
      ...prev,
      otherSavings: prev.otherSavings.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  };

  const deleteOtherSavings = (id: string) => {
    setData(prev => ({ ...prev, otherSavings: prev.otherSavings.filter(s => s.id !== id) }));
  };

  const totalFDAmount = data.fds.reduce((sum, fd) => sum + fd.investedAmount, 0);
  const totalEPF = data.epf?.totalAccumulated || 0;
  const totalOtherSavings = data.otherSavings.reduce((sum, s) => sum + s.totalAmount, 0);
  const grandTotal = totalFDAmount + totalEPF + totalOtherSavings;

  return {
    data,
    loading,
    sortedFDs,
    addFD,
    updateFD,
    deleteFD,
    setEPF,
    addOtherSavings,
    updateOtherSavings,
    deleteOtherSavings,
    totalFDAmount,
    totalEPF,
    totalOtherSavings,
    grandTotal,
  };
}
