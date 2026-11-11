import { describe, it, expect } from "vitest";

import {
  calculatePaidMonthsFromStart,
  calculatePhaseProgress,
  calculateSerialTenureProgress,
  calculateLoanForecast,
  getCurrentLoanInterestRate,
  summarizeLoanMetrics,
  type Loan,
} from "@/hooks/useDebts";

describe("loan calculations", () => {
  it("calculates paid months from the start date and tenure", () => {
    expect(calculatePaidMonthsFromStart("2024-01-01", 24, "2024-07-15")).toBe(6);
    expect(calculatePaidMonthsFromStart("2024-01-01", 12, "2025-01-16")).toBe(12);
  });

  it("calculates separate Pre-EMI and EMI phase progress", () => {
    expect(calculatePhaseProgress("2024-01-01", 6, "2024-04-01")).toBe(50);
    expect(calculatePhaseProgress("2024-07-01", 12, "2024-10-01")).toBe(25);
    expect(calculatePhaseProgress("2024-01-01", 6, "2025-01-01")).toBe(100);
  });

  it("calculates Pre-EMI and EMI progress serially in one total tenure", () => {
    const progress = calculateSerialTenureProgress("2024-01-01", 6, "2024-07-01", 18, "2024-10-01");

    expect(progress.totalTenureMonths).toBe(24);
    expect(progress.elapsedMonths).toBe(9);
    expect(progress.preEmiElapsedMonths).toBe(6);
    expect(progress.emiElapsedMonths).toBe(3);
    expect(progress.preEmiWidth).toBe(25);
    expect(progress.emiWidth).toBe(12.5);
  });

  it("selects the open-ended interest period as the current rate", () => {
    const loan: Loan = {
      id: "loan-rate-history",
      name: "Rate history",
      sanctionedAmount: 100000,
      totalOutstanding: 100000,
      principalPaid: 0,
      interestPaid: 0,
      interestRate: 7.25,
      tenureMonths: 24,
      paidMonths: 0,
      startDate: "2024-01-01",
      interestRateHistory: [
        { id: "old", rate: 7.25, startDate: "2024-01-01", endDate: "2024-06-30" },
        { id: "current", rate: 8, startDate: "2024-07-01" },
      ],
    };

    expect(getCurrentLoanInterestRate(loan, "2024-08-20")).toBe(8);
    expect(getCurrentLoanInterestRate(loan, "2024-06-15")).toBe(7.25);
  });

  it("rebuilds principal, interest and outstanding from transaction entries", () => {
    const loan: Loan = {
      id: "loan-1",
      name: "Home Loan",
      sanctionedAmount: 100000,
      totalOutstanding: 100000,
      principalPaid: 0,
      interestPaid: 0,
      interestRate: 8.5,
      tenureMonths: 12,
      paidMonths: 0,
      startDate: "2024-01-01",
      transactions: [
        { id: "tx-1", amount: 25000, description: "EMI", date: "2024-03-01", kind: "emi", principal: 20000, interest: 5000 },
        { id: "tx-2", amount: 16000, description: "Principal extra", date: "2024-04-01", kind: "lumpsum", principal: 15000, interest: 1000, extra: 0 },
      ],
    };

    const summary = summarizeLoanMetrics(loan);

    expect(summary.principalPaid).toBe(35000);
    expect(summary.interestPaid).toBe(6000);
    expect(summary.totalOutstanding).toBe(65000);
  });

  it("supports legacy transactions with no explicit split fields", () => {
    const loan: Loan = {
      id: "loan-2",
      name: "Legacy",
      sanctionedAmount: 50000,
      totalOutstanding: 50000,
      principalPaid: 0,
      interestPaid: 0,
      interestRate: 7,
      tenureMonths: 12,
      paidMonths: 0,
      startDate: "2024-01-01",
      transactions: [
        { id: "legacy-1", amount: 18000, description: "Legacy EMI", date: "2024-02-01" },
      ],
    };

    const summary = summarizeLoanMetrics(loan);

    expect(summary.principalPaid).toBe(18000);
    expect(summary.interestPaid).toBe(0);
    expect(summary.totalOutstanding).toBe(32000);
  });

  it("adds transaction totals to configured opening balances", () => {
    const loan: Loan = {
      id: "loan-opening-balance",
      name: "Opening balance",
      sanctionedAmount: 100000,
      totalOutstanding: 70000,
      principalPaid: 30000,
      interestPaid: 2500,
      initialPrincipalPaid: 30000,
      initialInterestPaid: 2500,
      interestRate: 8,
      tenureMonths: 24,
      paidMonths: 0,
      startDate: "2024-01-01",
      transactions: [
        { id: "tx-1", amount: 0, description: "EMI", date: "2024-04-01", kind: "emi", principal: 5000, interest: 1200 },
      ],
    };

    const summary = summarizeLoanMetrics(loan);

    expect(summary.principalPaid).toBe(35000);
    expect(summary.interestPaid).toBe(3700);
    expect(summary.totalOutstanding).toBe(65000);
  });

  it("does not add Pre-EMI interest to principal", () => {
    const loan: Loan = {
      id: "loan-pre-emi-interest",
      name: "Pre-EMI",
      sanctionedAmount: 100000,
      totalOutstanding: 100000,
      principalPaid: 0,
      interestPaid: 0,
      initialPrincipalPaid: 0,
      initialInterestPaid: 0,
      interestRate: 7.25,
      tenureMonths: 24,
      paidMonths: 0,
      startDate: "2024-01-01",
      transactions: [
        { id: "pre-emi-1", amount: 0, description: "Pre-EMI", date: "2024-02-01", kind: "pre-emi", interest: 2500 },
      ],
    };

    const summary = summarizeLoanMetrics(loan);

    expect(summary.principalPaid).toBe(0);
    expect(summary.interestPaid).toBe(2500);
    expect(summary.totalOutstanding).toBe(100000);
  });

  it("reduces interest totals when an interest transaction is removed", () => {
    const loan: Loan = {
      id: "loan-delete-interest",
      name: "Delete interest",
      sanctionedAmount: 100000,
      totalOutstanding: 100000,
      principalPaid: 0,
      interestPaid: 0,
      initialPrincipalPaid: 0,
      initialInterestPaid: 0,
      interestRate: 7,
      tenureMonths: 24,
      paidMonths: 0,
      startDate: "2024-01-01",
      transactions: [{ id: "interest", amount: 0, description: "Pre-EMI", date: "2024-02-01", kind: "pre-emi", interest: 1500 }],
    };

    expect(summarizeLoanMetrics(loan).interestPaid).toBe(1500);
    expect(summarizeLoanMetrics({ ...loan, transactions: [] }).interestPaid).toBe(0);
  });

  it("calculates a fixed EMI with the expected opening split", () => {
    const loan: Loan = {
      id: "loan-fixed-emi",
      name: "Fixed EMI",
      sanctionedAmount: 14647000,
      totalOutstanding: 14647000,
      principalPaid: 0,
      interestPaid: 0,
      interestRate: 7.65,
      tenureMonths: 276,
      paidMonths: 0,
      startDate: "2026-08-01",
      emiTenureMonths: 276,
      emiStartDate: "2026-08-01",
      interestRateHistory: [{ id: "rate", rate: 7.65, startDate: "2026-08-01" }],
    };

    const forecast = calculateLoanForecast(loan);

    expect(forecast.scheduledPayment).toBeCloseTo(112921, -1);
    expect(forecast.openingInterest).toBeCloseTo(93375, 0);
    expect(forecast.openingPrincipal).toBeCloseTo(19546, 0);
  });

  it("calculates savings when a lump-sum principal payment is recorded", () => {
    const loan: Loan = {
      id: "loan-lumpsum-forecast",
      name: "Lump sum forecast",
      sanctionedAmount: 1000000,
      totalOutstanding: 1000000,
      principalPaid: 0,
      interestPaid: 0,
      interestRate: 7.5,
      tenureMonths: 120,
      paidMonths: 0,
      startDate: "2026-01-01",
      emiTenureMonths: 120,
      emiStartDate: "2026-01-01",
      interestRateHistory: [{ id: "rate", rate: 7.5, startDate: "2026-01-01" }],
      transactions: [{ id: "lump", amount: 100000, description: "Lumpsum", date: "2026-12-01", kind: "lumpsum", principal: 100000 }],
    };

    const forecast = calculateLoanForecast(loan);

    expect(forecast.interestSavedByLumpsum).toBeGreaterThan(0);
    expect(forecast.tenureReducedByLumpsum).toBeGreaterThan(0);
  });
});
