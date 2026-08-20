import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";

export type LoanTransactionKind = "emi" | "pre-emi" | "lumpsum" | "other";

export interface LoanTransaction {
  id: string;
  amount: number;
  description: string;
  transactionType?: string;
  date: string;
  kind?: LoanTransactionKind;
  principal?: number;
  interest?: number;
  extra?: number;
}

export interface LoanInterestRatePeriod {
  id: string;
  rate: number;
  startDate: string;
  endDate?: string;
}

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
  totalSanctionedAmount?: number;
  sanctionedAmount: number;
  totalOutstanding: number;
  principalPaid: number;
  interestPaid: number;
  initialPrincipalPaid?: number;
  initialInterestPaid?: number;
  interestRate: number;
  interestRateHistory?: LoanInterestRatePeriod[];
  tenureMonths: number;
  paidMonths: number;
  startDate: string;
  preEmiTenureMonths?: number;
  preEmiStartDate?: string;
  emiTenureMonths?: number;
  emiStartDate?: string;
  image?: string;
  originalEmiAmount?: number;
  interestSaved?: number;
  tenureReduced?: number;
  transactions?: LoanTransaction[];
}

export function calculatePaidMonthsFromStart(startDate: string, tenureMonths: number, currentDate: string | Date = new Date()) {
  if (!startDate) return 0;

  const start = new Date(startDate);
  const current = new Date(currentDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(current.getTime())) return 0;

  const monthDiff = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());
  const dayDelta = current.getDate() - start.getDate();
  const effective = dayDelta < 0 ? monthDiff - 1 : monthDiff;

  return Math.max(0, Math.min(tenureMonths, effective));
}

export function calculatePhaseProgress(startDate: string | undefined, tenureMonths: number | undefined, currentDate: string | Date = new Date()) {
  if (!startDate || !tenureMonths || tenureMonths <= 0) return 0;
  const start = new Date(startDate);
  const current = new Date(currentDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(current.getTime())) return 0;

  const elapsedMonths = (current.getFullYear() - start.getFullYear()) * 12
    + current.getMonth() - start.getMonth()
    + (current.getDate() >= start.getDate() ? 0 : -1);
  return Math.max(0, Math.min(100, (elapsedMonths / tenureMonths) * 100));
}

export function calculateSerialTenureProgress(
  preEmiStartDate: string | undefined,
  preEmiTenureMonths: number | undefined,
  emiStartDate: string | undefined,
  emiTenureMonths: number | undefined,
  currentDate: string | Date = new Date(),
) {
  const preTenure = Math.max(0, preEmiTenureMonths || 0);
  const emiTenure = Math.max(0, emiTenureMonths || 0);
  const totalTenureMonths = preTenure + emiTenure;
  if (totalTenureMonths === 0) {
    return { totalTenureMonths: 0, elapsedMonths: 0, preEmiElapsedMonths: 0, emiElapsedMonths: 0, preEmiWidth: 0, emiWidth: 0 };
  }

  const current = new Date(currentDate);
  const startDate = preEmiStartDate || emiStartDate;
  const start = startDate ? new Date(startDate) : current;
  if (Number.isNaN(current.getTime()) || Number.isNaN(start.getTime())) {
    return { totalTenureMonths, elapsedMonths: 0, preEmiElapsedMonths: 0, emiElapsedMonths: 0, preEmiWidth: 0, emiWidth: 0 };
  }

  const elapsedMonths = Math.max(0, (current.getFullYear() - start.getFullYear()) * 12
    + current.getMonth() - start.getMonth()
    + (current.getDate() >= start.getDate() ? 0 : -1));
  const preEmiElapsedMonths = Math.min(preTenure, elapsedMonths);
  const emiElapsedMonths = Math.min(emiTenure, Math.max(0, elapsedMonths - preTenure));

  return {
    totalTenureMonths,
    elapsedMonths: Math.min(totalTenureMonths, elapsedMonths),
    preEmiElapsedMonths,
    emiElapsedMonths,
    preEmiWidth: (preEmiElapsedMonths / totalTenureMonths) * 100,
    emiWidth: (emiElapsedMonths / totalTenureMonths) * 100,
  };
}

export function getCurrentLoanInterestRate(loan: Loan, currentDate: string | Date = new Date()) {
  const history = loan.interestRateHistory || [];
  const current = new Date(currentDate).getTime();
  const activePeriod = history.find((period) => {
    const starts = period.startDate ? new Date(period.startDate).getTime() <= current : true;
    const ends = period.endDate ? new Date(period.endDate).getTime() >= current : true;
    return starts && ends;
  });

  return activePeriod?.rate ?? loan.interestRate ?? 0;
}

function getLoanRateForDate(loan: Loan, date: Date) {
  return getCurrentLoanInterestRate(loan, date);
}

export function calculateLoanForecast(loan: Loan) {
  const principal = Math.max(0, loan.sanctionedAmount || loan.totalOutstanding || loan.totalSanctionedAmount || 0);
  const totalTenureMonths = Math.max(0, (loan.preEmiTenureMonths || 0) + (loan.emiTenureMonths || loan.tenureMonths || 0));
  const start = new Date(loan.emiStartDate || loan.startDate || new Date());
  const emiMonths = Math.max(0, loan.emiTenureMonths || loan.tenureMonths || 0);
  const rate = getLoanRateForDate(loan, start);
  const monthlyRate = rate / 1200;
  const scheduledPayment = monthlyRate > 0 && emiMonths > 0
    ? principal * monthlyRate * Math.pow(1 + monthlyRate, emiMonths) / (Math.pow(1 + monthlyRate, emiMonths) - 1)
    : emiMonths > 0 ? principal / emiMonths : 0;
  const lumpSums = (loan.transactions || [])
    .filter((tx) => tx.kind === "lumpsum" && (tx.principal || 0) > 0)
    .map((tx) => ({ date: new Date(tx.date), principal: tx.principal || 0 }));

  const simulate = (includeLumpSums: boolean) => {
    let balance = principal;
    let interest = 0;
    let months = 0;
    while (balance > 0.01 && months < Math.max(emiMonths * 2, 1)) {
      const monthDate = new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
      const currentRate = getLoanRateForDate(loan, monthDate);
      const currentMonthlyRate = currentRate / 1200;
      const monthInterest = balance * currentMonthlyRate;
      const payment = Math.min(balance + monthInterest, scheduledPayment || balance + monthInterest);
      balance = Math.max(0, balance + monthInterest - payment);
      interest += monthInterest;
      if (includeLumpSums) {
        lumpSums
          .filter((lump) => lump.date.getFullYear() === monthDate.getFullYear() && lump.date.getMonth() === monthDate.getMonth())
          .forEach((lump) => { balance = Math.max(0, balance - lump.principal); });
      }
      months += 1;
    }
    return { interest, months };
  };

  const baseline = simulate(false);
  const withLumpSums = simulate(true);
  const preEmiMonths = Math.max(0, loan.preEmiTenureMonths || 0);
  const preEmiRate = getLoanRateForDate(loan, new Date(loan.preEmiStartDate || loan.startDate || new Date())) / 1200;
  const estimatedPreEmiInterest = principal * preEmiRate * preEmiMonths;
  return {
    totalTenureMonths,
    estimatedTotalInterest: baseline.interest + estimatedPreEmiInterest,
    interestSavedByLumpsum: Math.max(0, baseline.interest - withLumpSums.interest),
    tenureReducedByLumpsum: Math.max(0, baseline.months - withLumpSums.months),
    scheduledPayment,
    openingInterest: principal * monthlyRate,
    openingPrincipal: Math.max(0, scheduledPayment - (principal * monthlyRate)),
    baselineEmiMonths: baseline.months,
    lumpSumEmiMonths: withLumpSums.months,
  };
}

export function summarizeLoanMetrics(loan: Loan) {
  const transactions = loan.transactions || [];
  const transactionPrincipal = transactions.reduce((sum, tx) => {
    if (typeof tx.principal === "number") {
      return sum + tx.principal;
    }
    if (!tx.kind) {
      return sum + (tx.amount || 0);
    }
    return sum;
  }, 0);

  const transactionInterest = transactions.reduce((sum, tx) => {
    if (typeof tx.interest === "number") {
      return sum + tx.interest;
    }
    return sum + 0;
  }, 0);

  const principalPaid = (loan.initialPrincipalPaid ?? (transactions.length > 0 ? 0 : loan.principalPaid || 0)) + transactionPrincipal;
  const interestPaid = (loan.initialInterestPaid ?? (transactions.length > 0 ? 0 : loan.interestPaid || 0)) + transactionInterest;
  const disbursed = loan.sanctionedAmount > 0 ? loan.sanctionedAmount : Math.max(0, loan.totalOutstanding || 0);
  const sanction = loan.totalSanctionedAmount && loan.totalSanctionedAmount > 0 ? loan.totalSanctionedAmount : disbursed;
  const serialTenure = calculateSerialTenureProgress(
    loan.preEmiStartDate,
    loan.preEmiTenureMonths,
    loan.emiStartDate,
    loan.emiTenureMonths || loan.tenureMonths,
  );
  const totalOutstanding = Math.max(0, disbursed - principalPaid);
  const amountProgress = disbursed > 0 ? Math.min(100, (principalPaid / disbursed) * 100) : 0;
  const scheduledPrincipalPerMonth = loan.tenureMonths > 0 ? disbursed / loan.tenureMonths : 0;
  const estimatedMonthsRemaining = scheduledPrincipalPerMonth > 0 ? Math.ceil(totalOutstanding / scheduledPrincipalPerMonth) : 0;
  const tenureReduced = Math.max(0, loan.tenureMonths - (calculatePaidMonthsFromStart(loan.startDate, loan.tenureMonths || 0) + estimatedMonthsRemaining));
  const plannedInterest = loan.originalEmiAmount && loan.tenureMonths > 0
    ? Math.max(0, (loan.originalEmiAmount * loan.tenureMonths) - sanction)
    : 0;
  const interestSaved = Math.max(0, plannedInterest - interestPaid);
  const otherPaid = transactions.reduce((sum, tx) => tx.kind === "other"
    ? sum + Math.max(0, (tx.amount || 0) - (tx.principal || 0) - (tx.interest || 0))
    : sum, 0);
  const forecast = calculateLoanForecast(loan);

  return {
    principalPaid,
    interestPaid,
    otherPaid,
    ...forecast,
    totalOutstanding,
    amountProgress,
    ...serialTenure,
    tenureReduced,
    interestSaved,
    paidMonths: Math.max(0, Math.min(loan.tenureMonths || 0, calculatePaidMonthsFromStart(loan.startDate, loan.tenureMonths || 0, new Date()))),
    totalPaid: principalPaid + interestPaid + otherPaid,
  };
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

  const normalizeLoan = (loan: Loan): Loan => {
    const metrics = summarizeLoanMetrics(loan);
    const nextPaidMonths = calculatePaidMonthsFromStart(loan.startDate, loan.tenureMonths || 0, new Date());
    return {
      ...loan,
      principalPaid: metrics.principalPaid,
      interestPaid: metrics.interestPaid,
      totalOutstanding: metrics.totalOutstanding,
      paidMonths: Math.max(0, Math.min(loan.tenureMonths || 0, nextPaidMonths)),
    };
  };

  const addLoan = (l: Omit<Loan, "id">) => setLoans((p) => [...p, normalizeLoan({
    ...l,
    id: crypto.randomUUID(),
    initialPrincipalPaid: l.principalPaid || 0,
    initialInterestPaid: l.interestPaid || 0,
  })]);
  const updateLoan = (id: string, u: Partial<Omit<Loan, "id">>) => setLoans((p) => p.map((l) => {
    if (l.id !== id) return l;
    const updated = { ...l, ...u };
    if (u.principalPaid !== undefined) updated.initialPrincipalPaid = u.principalPaid;
    if (u.interestPaid !== undefined) updated.initialInterestPaid = u.interestPaid;
    return normalizeLoan(updated);
  }));
  const deleteLoan = (id: string) => setLoans((p) => p.filter((l) => l.id !== id));

  const addLoanTransaction = (loanId: string, tx: Omit<LoanTransaction, "id">) => {
    setLoans((p) =>
      p.map((l) => {
        if (l.id === loanId) {
          const newTx: LoanTransaction = { ...tx, id: crypto.randomUUID() };
          const nextTransactions = [...(l.transactions || []), newTx];
          return normalizeLoan({
            ...l,
            initialPrincipalPaid: l.initialPrincipalPaid ?? l.principalPaid ?? 0,
            initialInterestPaid: l.initialInterestPaid ?? l.interestPaid ?? 0,
            transactions: nextTransactions,
          });
        }
        return l;
      })
    );
  };

  const updateLoanTransaction = (loanId: string, txId: string, updates: Omit<LoanTransaction, "id">) => {
    setLoans((p) => p.map((l) => {
      if (l.id !== loanId) return l;
      const nextTransactions = (l.transactions || []).map((tx) => tx.id === txId ? { ...updates, id: txId } : tx);
      return normalizeLoan({ ...l, transactions: nextTransactions });
    }));
  };

  const deleteLoanTransaction = (loanId: string, txId: string) => {
    setLoans((p) =>
      p.map((l) => {
        if (l.id === loanId) {
          const currentTxs = l.transactions || [];
          const nextTransactions = currentTxs.filter((t) => t.id !== txId);
          return normalizeLoan({ ...l, transactions: nextTransactions });
        }
        return l;
      })
    );
  };

  const totalOutstanding = loans.reduce((sum, loan) => sum + summarizeLoanMetrics(loan).totalOutstanding, 0);

  return { debts, loans, addDebt, updateDebt, deleteDebt, addLoan, updateLoan, deleteLoan, addLoanTransaction, updateLoanTransaction, deleteLoanTransaction, totalOutstanding, loading };
}
