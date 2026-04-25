import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Calendar } from "lucide-react";
import type { Expense, FundSection } from "@/hooks/useExpenses";
import type { Transaction, TransactionFundType, PaymentMode } from "@/hooks/useTransactions";
import { PAYMENT_MODES } from "@/hooks/useTransactions";

interface RecordTransactionDialogProps {
  onAddTransaction: (
    date: string,
    fundId: TransactionFundType,
    amount: number,
    expenseId?: string,
    paymentMode?: PaymentMode,
  ) => void;
  sections: FundSection[];
  getExpensesForFund: (fundId: string) => Expense[];
}

export function RecordTransactionDialog({
  onAddTransaction,
  sections,
  getExpensesForFund,
}: RecordTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<TransactionFundType>("daily-expenses");
  const [selectedExpense, setSelectedExpense] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("upi");

  const fundOptions = sections.filter((s) =>
    ["daily-expenses", "wishlist-fund", "hobby-fund"].includes(s.id)
  );

  const expenses = getExpensesForFund(selectedFund);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (selectedFund === "daily-expenses" && !selectedExpense) {
      alert("Please select an expense item");
      return;
    }

    onAddTransaction(
      date,
      selectedFund as TransactionFundType,
      parseFloat(amount),
      selectedFund === "daily-expenses" ? selectedExpense : undefined,
      paymentMode,
    );

    // Reset form
    setAmount("");
    setSelectedExpense("");
    setPaymentMode("upi");
    setDate(new Date().toISOString().split("T")[0]);
    setSelectedFund("daily-expenses");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Record Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Selection */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Date
            </label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
              />
            </div>
          </div>

          {/* Fund Selection */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Select Fund
            </label>
            <Select value={selectedFund} onValueChange={(v) => {
              setSelectedFund(v as TransactionFundType);
              setSelectedExpense("");
            }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fundOptions.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expense Selection (only for daily-expenses) */}
          {selectedFund === "daily-expenses" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Select Expense Item
              </label>
              <Select value={selectedExpense} onValueChange={setSelectedExpense}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an expense..." />
                </SelectTrigger>
                <SelectContent>
                  {expenses.map((expense) => (
                    <SelectItem key={expense.id} value={expense.id}>
                      {expense.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Payment Mode Selection */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Payment Mode
            </label>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Amount (₹)
            </label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-base"
              min="0"
              step="0.01"
              autoFocus
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              Record
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
