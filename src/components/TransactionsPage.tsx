import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecordTransactionDialog } from "./RecordTransactionDialog";
import { Trash2, Calendar } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import type { Transaction, PaymentMode, PAYMENT_MODES } from "@/hooks/useTransactions";
import type { Expense, FundSection } from "@/hooks/useExpenses";

interface TransactionsPageProps {
  transactions: Transaction[];
  monthKey: string;
  currentMonth: number;
  currentYear: number;
  sections: FundSection[];
  onAddTransaction: (
    date: string,
    fundId: string,
    amount: number,
    expenseId?: string,
    paymentMode?: PaymentMode,
  ) => void;
  onDeleteTransaction: (id: string, monthKey: string) => void;
  getExpensesForFund: (fundId: string) => Expense[];
}

export function TransactionsPage({
  transactions,
  monthKey,
  currentMonth,
  currentYear,
  sections,
  onAddTransaction,
  onDeleteTransaction,
  getExpensesForFund,
}: TransactionsPageProps) {
  // Group transactions by date
  const transactionsByDate = transactions.reduce(
    (acc, transaction) => {
      if (!acc[transaction.date]) {
        acc[transaction.date] = [];
      }
      acc[transaction.date].push(transaction);
      return acc;
    },
    {} as Record<string, Transaction[]>
  );

  // Sort dates in descending order
  const sortedDates = Object.keys(transactionsByDate).sort().reverse();

  const getFundName = (fundId: string) => {
    return sections.find((s) => s.id === fundId)?.name || fundId;
  };

  const getExpenseName = (fundId: string, expenseId?: string) => {
    if (!expenseId) return getFundName(fundId);
    const expenses = getExpensesForFund(fundId);
    return expenses.find((e) => e.id === expenseId)?.description || expenseId;
  };

  const getPaymentModeLabel = (paymentMode?: PaymentMode) => {
    const modeMap: Record<string, string> = {
      'upi': 'UPI',
      'credit-card': 'Card',
      'cash': 'Cash',
    };
    return modeMap[paymentMode || 'upi'];
  };

  const getPaymentModeColor = (paymentMode?: PaymentMode) => {
    const colorMap: Record<string, string> = {
      'upi': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
      'credit-card': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
      'cash': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
    };
    return colorMap[paymentMode || 'upi'];
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading">Transactions</h2>
          <p className="text-xs text-muted-foreground">
            {monthNames[currentMonth]} {currentYear}
          </p>
        </div>
        <RecordTransactionDialog
          onAddTransaction={onAddTransaction}
          sections={sections}
          getExpensesForFund={getExpensesForFund}
        />
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const dateTransactions = transactionsByDate[date];
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString("en-IN", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            const dayTotal = dateTransactions.reduce((sum, t) => sum + t.amount, 0);

            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-sm font-semibold text-foreground">{dateStr}</span>
                  <span className="text-sm font-bold text-primary">
                    ₹{dayTotal.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="space-y-2">
                  {dateTransactions.map((transaction) => (
                    <Card
                      key={transaction.id}
                      className="p-3 flex items-center justify-between group bg-card/80 border-none shadow-sm hover:bg-card/100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {getExpenseName(transaction.fundId, transaction.expenseId)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {getFundName(transaction.fundId)}
                          </p>
                          <Badge className={`text-xs ${getPaymentModeColor(transaction.paymentMode)}`}>
                            {getPaymentModeLabel(transaction.paymentMode)}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-accent">
                          ₹{transaction.amount.toLocaleString("en-IN")}
                        </span>
                        <ConfirmDeleteDialog title="Delete this transaction?" description="This transaction will be permanently removed." onConfirm={() => onDeleteTransaction(transaction.id, monthKey)}>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" aria-label="Delete transaction">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </ConfirmDeleteDialog>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
