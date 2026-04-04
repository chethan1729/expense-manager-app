import { useState, useEffect } from "react";

export interface PersonalDebt {
  id: string;
  personName: string;
  amount: number;
  description: string;
  date: string;
  type: "owe" | "owed";
}

export interface Loan {
  id: string;
  name: string;
  sanctionedAmount: number;
  totalOutstanding: number;
  principalPaid: number;
  interestPaid: number;
  interestRate: number;
  tenureMonths: number;
  paidMonths: number;
  startDate: string;
}

const DEBT_KEY = "expense-manager-debts";
const LOAN_KEY = "expense-manager-loans";

export function useDebts() {
  const [debts, setDebts] = useState<PersonalDebt[]>(() => {
    const stored = localStorage.getItem(DEBT_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const [loans, setLoans] = useState<Loan[]>(() => {
    const stored = localStorage.getItem(LOAN_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => { localStorage.setItem(DEBT_KEY, JSON.stringify(debts)); }, [debts]);
  useEffect(() => { localStorage.setItem(LOAN_KEY, JSON.stringify(loans)); }, [loans]);

  const addDebt = (d: Omit<PersonalDebt, "id">) => setDebts((p) => [...p, { ...d, id: crypto.randomUUID() }]);
  const updateDebt = (id: string, u: Partial<Omit<PersonalDebt, "id">>) => setDebts((p) => p.map((d) => (d.id === id ? { ...d, ...u } : d)));
  const deleteDebt = (id: string) => setDebts((p) => p.filter((d) => d.id !== id));

  const addLoan = (l: Omit<Loan, "id">) => setLoans((p) => [...p, { ...l, id: crypto.randomUUID() }]);
  const updateLoan = (id: string, u: Partial<Omit<Loan, "id">>) => setLoans((p) => p.map((l) => (l.id === id ? { ...l, ...u } : l)));
  const deleteLoan = (id: string) => setLoans((p) => p.filter((l) => l.id !== id));

  const totalOutstanding = loans.reduce((sum, l) => sum + l.totalOutstanding, 0);

  return { debts, loans, addDebt, updateDebt, deleteDebt, addLoan, updateLoan, deleteLoan, totalOutstanding };
}
