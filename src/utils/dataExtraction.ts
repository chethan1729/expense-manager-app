/**
 * Data Extraction Utility for Finance AI Model Fine-tuning
 * Exports transaction data and financial snapshots for model training
 */

import { Preferences } from "@capacitor/preferences";

export interface ExportedTransaction {
  date: string;
  amount: number;
  fund: string;
  category: string;
  paymentMode?: string;
  monthKey: string;
}

export interface FinancialSnapshot {
  date: string;
  month: string;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  spendingRate: number;
  fundBreakdown: {
    name: string;
    allocated: number;
    spent: number;
    remaining: number;
  }[];
}

export interface FineTuningDataset {
  transactions: ExportedTransaction[];
  snapshots: FinancialSnapshot[];
  metadata: {
    extractedAt: string;
    totalTransactions: number;
    dateRange: {
      start: string;
      end: string;
    };
    fundNames: string[];
  };
}

/**
 * Extract all transaction data from app storage
 */
export const extractTransactionData = async (): Promise<ExportedTransaction[]> => {
  try {
    const { value: transactionsJson } = await Preferences.get({
      key: "expense-manager-transactions-v1",
    });

    if (!transactionsJson) return [];

    const monthlyTransactions = JSON.parse(transactionsJson);
    const transactions: ExportedTransaction[] = [];

    // Flatten monthly transactions
    for (const [monthKey, monthTxns] of Object.entries(monthlyTransactions)) {
      const txnArray = monthTxns as any[];
      for (const txn of txnArray) {
        transactions.push({
          date: txn.date,
          amount: txn.amount,
          fund: txn.fundId,
          category: txn.expenseId || "general",
          paymentMode: txn.paymentMode,
          monthKey,
        });
      }
    }

    return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error("Error extracting transactions:", error);
    return [];
  }
};

/**
 * Extract financial snapshots from expense data
 */
export const extractFinancialSnapshots = async (): Promise<FinancialSnapshot[]> => {
  try {
    const { value: monthlyDataJson } = await Preferences.get({
      key: "expense-manager-monthly-v1",
    });

    if (!monthlyDataJson) return [];

    const monthlyData = JSON.parse(monthlyDataJson);
    const snapshots: FinancialSnapshot[] = [];

    for (const [monthKey, data] of Object.entries(monthlyData)) {
      const monthData = data as any;
      const sections = monthData.sections || [];
      const totalBudget = monthData.totalBudget || 0;

      let totalSpent = 0;
      const fundBreakdown = sections.map((section: any) => {
        let sectionSpent = 0;
        let sectionAllocated = 0;

        for (const expense of section.expenses || []) {
          sectionSpent += Math.abs(expense.spent || 0);
          sectionAllocated += expense.estimated || 0;
        }

        totalSpent += sectionSpent;

        return {
          name: section.name,
          allocated: sectionAllocated,
          spent: sectionSpent,
          remaining: sectionAllocated - sectionSpent,
        };
      });

      const spendingRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

      // Generate approximate date for the month
      const [year, month] = monthKey.split("-");
      const date = `${year}-${month}-15`;

      snapshots.push({
        date,
        month: monthKey,
        totalBudget,
        totalSpent,
        totalRemaining: totalBudget - totalSpent,
        spendingRate: Math.round(spendingRate),
        fundBreakdown,
      });
    }

    return snapshots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error("Error extracting snapshots:", error);
    return [];
  }
};

/**
 * Generate fine-tuning dataset combining transactions and snapshots
 */
export const generateFineTuningDataset = async (): Promise<FineTuningDataset> => {
  const transactions = await extractTransactionData();
  const snapshots = await extractFinancialSnapshots();

  const fundNames = Array.from(
    new Set([
      ...transactions.map((t) => t.fund),
      ...snapshots.flatMap((s) => s.fundBreakdown.map((f) => f.name)),
    ])
  );

  const dateRange = {
    start: transactions.length > 0 ? transactions[0].date : new Date().toISOString().split("T")[0],
    end: transactions.length > 0 ? transactions[transactions.length - 1].date : new Date().toISOString().split("T")[0],
  };

  return {
    transactions,
    snapshots,
    metadata: {
      extractedAt: new Date().toISOString(),
      totalTransactions: transactions.length,
      dateRange,
      fundNames,
    },
  };
};

/**
 * Export dataset as JSON for download
 */
export const exportDatasetAsJson = async (): Promise<string> => {
  const dataset = await generateFineTuningDataset();
  return JSON.stringify(dataset, null, 2);
};

/**
 * Export dataset as CSV for easier viewing
 */
export const exportTransactionsAsCSV = async (): Promise<string> => {
  const transactions = await extractTransactionData();

  let csv = "Date,Amount,Fund,Category,PaymentMode,MonthKey\n";
  for (const txn of transactions) {
    csv += `${txn.date},${txn.amount},"${txn.fund}","${txn.category}",${txn.paymentMode || ""},${txn.monthKey}\n`;
  }

  return csv;
};

/**
 * Generate conversation pairs for fine-tuning from transaction patterns
 */
export const generateTrainingConversations = async (): Promise<
  Array<{ question: string; answer: string }>
> => {
  const transactions = await extractTransactionData();
  const snapshots = await extractFinancialSnapshots();

  const conversations: Array<{ question: string; answer: string }> = [];

  // Generate from snapshots
  for (const snapshot of snapshots) {
    // Total spending analysis
    conversations.push({
      question: `What was my spending in ${snapshot.month}?`,
      answer: `In ${snapshot.month}, you spent ₹${Math.round(snapshot.totalSpent)} out of your budget of ₹${Math.round(snapshot.totalBudget)}, using ${snapshot.spendingRate}% of your monthly budget.`,
    });

    // Fund-specific analysis
    for (const fund of snapshot.fundBreakdown) {
      if (fund.spent > 0) {
        conversations.push({
          question: `How much did I spend on ${fund.name} in ${snapshot.month}?`,
          answer: `You spent ₹${Math.round(fund.spent)} on ${fund.name}, with an allocation of ₹${Math.round(fund.allocated)}, leaving ₹${Math.round(fund.remaining)}.`,
        });
      }
    }

    // Savings analysis
    if (snapshot.totalRemaining > 0) {
      conversations.push({
        question: `How much did I save in ${snapshot.month}?`,
        answer: `You saved ₹${Math.round(snapshot.totalRemaining)} in ${snapshot.month}, with a savings rate of ${100 - snapshot.spendingRate}%.`,
      });
    }
  }

  // Generate from transaction patterns
  const transactionsByFund: Record<string, ExportedTransaction[]> = {};
  for (const txn of transactions) {
    if (!transactionsByFund[txn.fund]) {
      transactionsByFund[txn.fund] = [];
    }
    transactionsByFund[txn.fund].push(txn);
  }

  for (const [fund, txns] of Object.entries(transactionsByFund)) {
    const total = txns.reduce((sum, t) => sum + t.amount, 0);
    const average = total / txns.length;
    const count = txns.length;

    conversations.push({
      question: `What's my spending pattern on ${fund}?`,
      answer: `On ${fund}, you've made ${count} transactions totaling ₹${Math.round(total)}, with an average of ₹${Math.round(average)} per transaction.`,
    });
  }

  // Net worth and asset analysis
  conversations.push({
    question: "How should I analyze my spending?",
    answer: `Based on your data, focus on: (1) Fund-wise spending allocation, (2) Month-over-month spending trends, (3) Savings rate relative to budget, (4) Overspent funds that need adjustment.`,
  });

  conversations.push({
    question: "What's my financial health?",
    answer: `Analyze your financial health by: (1) Comparing actual spending vs allocated budget, (2) Tracking savings rate over time, (3) Identifying overspent categories, (4) Planning adjustments for better allocation.`,
  });

  return conversations;
};

/**
 * Format training data for fine-tuning (JSONL format for most frameworks)
 */
export const generateTrainingJSONL = async (): Promise<string> => {
  const conversations = await generateTrainingConversations();

  let jsonl = "";
  for (const conv of conversations) {
    const line = JSON.stringify({
      instruction: conv.question,
      input: "",
      output: conv.answer,
    });
    jsonl += line + "\n";
  }

  return jsonl;
};
