import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";

export interface PersonalDebt {
  id: string;
  personName: string;
  amount: number;
  description: string;
  date: string;
  type: "owe" | "owed";
}

export interface LoanTransaction {
  id: string;
  amount: number;
  description: string;
  date: string;
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
  transactions?: LoanTransaction[];
}

const DEBT_KEY = "expense-manager-debts";
const LOAN_KEY = "expense-manager-loans";

export function useDebts() {
  const [debts, setDebts] = useState<PersonalDebt[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { value: storedDebts } = await Preferences.get({ key: DEBT_KEY });
        const { value: storedLoans } = await Preferences.get({ key: LOAN_KEY });

        if (storedDebts) {
          setDebts(JSON.parse(storedDebts));
        } else {
          const local = localStorage.getItem(DEBT_KEY);
          if (local) {
            setDebts(JSON.parse(local));
            await Preferences.set({ key: DEBT_KEY, value: local });
            localStorage.removeItem(DEBT_KEY);
          }
        }

        if (storedLoans) {
          setLoans(JSON.parse(storedLoans));
        } else {
          const local = localStorage.getItem(LOAN_KEY);
          if (local) {
            setLoans(JSON.parse(local));
            await Preferences.set({ key: LOAN_KEY, value: local });
            localStorage.removeItem(LOAN_KEY);
          }
        }
      } catch (e) {
        console.error("Error loading debts/loans:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Preferences.set({ key: DEBT_KEY, value: JSON.stringify(debts) });
    }
  }, [debts, loading]);

  useEffect(() => {
    if (!loading) {
      Preferences.set({ key: LOAN_KEY, value: JSON.stringify(loans) });
    }
  }, [loans, loading]);

  const addDebt = (d: Omit<PersonalDebt, "id">) => setDebts((p) => [...p, { ...d, id: crypto.randomUUID() }]);
  const updateDebt = (id: string, u: Partial<Omit<PersonalDebt, "id">>) => setDebts((p) => p.map((d) => (d.id === id ? { ...d, ...u } : d)));
  const deleteDebt = (id: string) => setDebts((p) => p.filter((d) => d.id !== id));

  const addLoan = (l: Omit<Loan, "id">) => setLoans((p) => [...p, { ...l, id: crypto.randomUUID() }]);
  const updateLoan = (id: string, u: Partial<Omit<Loan, "id">>) => setLoans((p) => p.map((l) => (l.id === id ? { ...l, ...u } : l)));
  const deleteLoan = (id: string) => setLoans((p) => p.filter((l) => l.id !== id));

  const addLoanTransaction = (loanId: string, tx: Omit<LoanTransaction, "id">) => {
    setLoans((p) =>
      p.map((l) => {
        if (l.id === loanId) {
          const newTx: LoanTransaction = { ...tx, id: crypto.randomUUID() };
          return { ...l, transactions: [...(l.transactions || []), newTx] };
        }
        return l;
      })
    );
  };

  const deleteLoanTransaction = (loanId: string, txId: string) => {
    setLoans((p) =>
      p.map((l) => {
        if (l.id === loanId) {
          const currentTxs = l.transactions || [];
          return { ...l, transactions: currentTxs.filter((t) => t.id !== txId) };
        }
        return l;
      })
    );
  };

  const totalOutstanding = loans.reduce((sum, l) => sum + (l.totalOutstanding || 0), 0);

  return { debts, loans, addDebt, updateDebt, deleteDebt, addLoan, updateLoan, deleteLoan, addLoanTransaction, deleteLoanTransaction, totalOutstanding, loading };
}
