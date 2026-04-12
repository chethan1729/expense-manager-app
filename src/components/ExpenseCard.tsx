import { useState } from "react";
import { Expense } from "@/hooks/useExpenses";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Check, X, Plus, Landmark, Lock } from "lucide-react";

interface ExpenseCardProps {
  expense: Expense;
  onUpdate: (id: string, updates: Partial<Omit<Expense, "id">>) => void;
  onDelete: (id: string) => void;
  showFDOption?: boolean;
  isEmergency?: boolean;
  isLoan?: boolean;
  isSimple?: boolean;       // daily-expenses, free-fund → hide total alloc/spent
  showBalanceTracking?: boolean; // hobby, loan, wishlist, learning, emergency, saving
  isSaving?: boolean;       // saving-fund → show lock-in option
}

export function ExpenseCard({
  expense,
  onUpdate,
  onDelete,
  showFDOption,
  isEmergency,
  isLoan,
  isSimple = false,
  showBalanceTracking = false,
  isSaving = false,
}: ExpenseCardProps) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(expense.description);
  const [est, setEst] = useState(expense.estimated.toString());
  const [spent, setSpent] = useState(expense.spent.toString());
  const [additionalSpent, setAdditionalSpent] = useState("");
  const [isFD, setIsFD] = useState(expense.isFD || false);
  const [preExistingFD, setPreExistingFD] = useState((expense.preExistingFD || 0).toString());
  const [emi, setEmi] = useState((expense.emi || 0).toString());
  const [saved, setSaved] = useState((expense.saved || 0).toString());
  const [totalAllocated, setTotalAllocated] = useState((expense.totalAllocated || 0).toString());
  const [totalSpent, setTotalSpent] = useState((expense.totalSpent || 0).toString());
  const [hasLockIn, setHasLockIn] = useState(!!(expense.lockedInAmount && expense.lockedInAmount > 0));
  const [lockedInAmount, setLockedInAmount] = useState((expense.lockedInAmount || 0).toString());

  const remaining = expense.estimated - expense.spent;
  const progress = expense.estimated > 0 ? (expense.spent / expense.estimated) * 100 : 0;
  const isOverBudget = remaining < 0;

  // For balance tracking: current balance = totalAllocated - totalSpent
  const currentBalance = (expense.totalAllocated || 0) - (expense.totalSpent || 0);
  const fdBalance = expense.isFD ? (expense.preExistingFD || 0) : 0;
  const sbBalance = currentBalance - fdBalance;

  const handleOpen = () => {
    setDesc(expense.description);
    setEst(expense.estimated.toString());
    setSpent(expense.spent.toString());
    setAdditionalSpent("");
    setIsFD(expense.isFD || false);
    setPreExistingFD((expense.preExistingFD || 0).toString());
    setEmi((expense.emi || 0).toString());
    setSaved((expense.saved || 0).toString());
    setTotalAllocated((expense.totalAllocated || 0).toString());
    setTotalSpent((expense.totalSpent || 0).toString());
    setHasLockIn(!!(expense.lockedInAmount && expense.lockedInAmount > 0));
    setLockedInAmount((expense.lockedInAmount || 0).toString());
    setEditing(true);
  };

  const handleSave = () => {
    const baseSpent = parseFloat(spent) || 0;
    const extra = parseFloat(additionalSpent) || 0;
    const newSpent = baseSpent + extra;

    const updatePayload: Partial<Omit<Expense, "id">> = {
      description: desc,
      estimated: parseFloat(est) || 0,
      spent: newSpent,
      isFD,
      preExistingFD: parseFloat(preExistingFD) || 0,
      emi: parseFloat(emi) || 0,
      saved: parseFloat(saved) || 0,
      lockedInAmount: hasLockIn ? (parseFloat(lockedInAmount) || 0) : 0,
    };

    // Only pass totalAllocated/totalSpent explicitly for balance-tracking funds
    // For simple funds, let the hook compute them automatically from diff
    if (showBalanceTracking) {
      updatePayload.totalAllocated = parseFloat(totalAllocated) || 0;
      updatePayload.totalSpent = parseFloat(totalSpent) || 0;
    }

    onUpdate(expense.id, updatePayload);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-3">
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" className="font-medium" />
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Allocated (₹)</label>
          <Input type="number" value={est} onChange={(e) => setEst(e.target.value)} placeholder="0" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Current Spent (₹)</label>
            <Input type="number" value={spent} onChange={(e) => setSpent(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add More (₹/Utilized)
            </label>
            <Input type="number" value={additionalSpent} onChange={(e) => setAdditionalSpent(e.target.value)} placeholder="0" />
          </div>
        </div>

        {isEmergency && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-bold text-accent">Current Saved (₹)</label>
            <Input type="number" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" className="border-accent/30" />
          </div>
        )}

        {isLoan && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-bold text-primary">Monthly EMI (₹)</label>
            <Input type="number" value={emi} onChange={(e) => setEmi(e.target.value)} placeholder="0" className="border-primary/30" />
          </div>
        )}

        {/* Total Allocated / Spent — only for balance tracking funds, NOT for daily/free */}
        {showBalanceTracking && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block font-bold text-blue-500">Total Allocated Goal (₹)</label>
                <Input type="number" value={totalAllocated} onChange={(e) => setTotalAllocated(e.target.value)} placeholder="0" className="border-blue-500/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block font-bold text-orange-500">Total Spent/Utilized (₹)</label>
                <Input type="number" value={totalSpent} onChange={(e) => setTotalSpent(e.target.value)} placeholder="0" className="border-orange-500/30" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-blue-400 italic">Lifetime totals carry forward across months.</p>
          </>
        )}

        {/* Lock-in option for saving fund */}
        {isSaving && (
          <div className="space-y-2 border-t pt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hasLockIn} onChange={(e) => setHasLockIn(e.target.checked)} className="rounded border-input" />
              <Lock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-foreground">Amount in Lock-in Period?</span>
            </label>
            {hasLockIn && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Total Lock-in Amount (₹)</label>
                <Input type="number" value={lockedInAmount} onChange={(e) => setLockedInAmount(e.target.value)} placeholder="0" className="border-orange-500/30" />
              </div>
            )}
          </div>
        )}

        {(parseFloat(additionalSpent) || 0) > 0 && (
          <p className="text-xs text-muted-foreground">
            New total spent: <span className="font-medium text-foreground">₹{((parseFloat(spent) || 0) + (parseFloat(additionalSpent) || 0)).toLocaleString('en-IN')}</span>
          </p>
        )}

        {showFDOption && (
          <div className="space-y-3 border-t pt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isFD} onChange={(e) => setIsFD(e.target.checked)} className="rounded border-input" />
              <Landmark className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">Kept in Fixed Deposit</span>
            </label>
            {isFD && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">FD Amount (₹)</label>
                <Input type="number" value={preExistingFD} onChange={(e) => setPreExistingFD(e.target.value)} placeholder="0" />
                <p className="text-xs text-muted-foreground mt-1">FD amount shown separately on card</p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-between">
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { onDelete(expense.id); setEditing(false); }}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 cursor-pointer hover:border-primary/40 transition-colors active:scale-[0.99]" onClick={handleOpen}>
      <div className="flex items-center gap-2">
        <h3 className="font-heading font-semibold text-card-foreground flex-1">{expense.description}</h3>
        <div className="flex items-center gap-1">
          {expense.isFD && <Landmark className="h-4 w-4 text-primary shrink-0" />}
          {expense.lockedInAmount && expense.lockedInAmount > 0 && <Lock className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground text-xs block">{isEmergency ? "Target Allot." : "Allocated"}</span>
          <span className="font-medium font-heading">₹{expense.estimated.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="text-muted-foreground text-xs block">{isEmergency ? "Utilized" : "Spent"}</span>
          <span className="font-medium font-heading text-accent/80">₹{expense.spent.toLocaleString('en-IN')}</span>
        </div>
        <div>
          {isEmergency ? (
            <>
              <span className="text-muted-foreground text-xs block">Saved</span>
              <span className="font-medium font-heading text-accent font-bold">₹{(expense.saved || 0).toLocaleString('en-IN')}</span>
            </>
          ) : isLoan ? (
            <>
              <span className="text-muted-foreground text-xs block">EMI</span>
              <span className="font-medium font-heading text-primary font-bold">₹{(expense.emi || 0).toLocaleString('en-IN')}</span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground text-xs block">Remaining</span>
              <span className={`font-medium font-heading ${isOverBudget ? "text-destructive" : "text-primary"}`}>
                ₹{remaining.toLocaleString('en-IN')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Balance section — only for balance-tracking funds (NOT daily/free) */}
      {showBalanceTracking && (
        <div className="mt-1 pt-2 border-t text-[10px] space-y-1.5">
          <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
            <span>CURRENT BALANCE</span>
            <span>₹{currentBalance.toLocaleString('en-IN')}</span>
          </div>
          {/* Show SB + FD split if FD is enabled */}
          {expense.isFD && (expense.preExistingFD || 0) > 0 ? (
            <div className="grid grid-cols-2 gap-1">
              <div className="flex items-center justify-between text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                <span>SB Balance</span>
                <span className="font-semibold text-blue-500">₹{Math.max(0, sbBalance).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                <span className="flex items-center gap-1"><Landmark className="h-3 w-3" />FD</span>
                <span className="font-semibold text-primary">₹{fdBalance.toLocaleString('en-IN')}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-muted-foreground px-2">
              <div className="flex items-center gap-4">
                <span>TOTAL ALLOC: <span className="text-blue-500">₹{expense.totalAllocated?.toLocaleString('en-IN')}</span></span>
                <span>TOTAL SPENT: <span className="text-orange-500">₹{expense.totalSpent?.toLocaleString('en-IN')}</span></span>
              </div>
            </div>
          )}
          {expense.lockedInAmount && expense.lockedInAmount > 0 ? (
            <div className="flex items-center justify-between text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Lock-in</span>
              <span className="font-semibold">₹{expense.lockedInAmount.toLocaleString('en-IN')}</span>
            </div>
          ) : null}
        </div>
      )}

      {expense.preExistingFD && expense.preExistingFD > 0 && !showBalanceTracking && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Landmark className="h-3 w-3" /> Pre-existing FD: ₹{expense.preExistingFD.toLocaleString('en-IN')}
        </p>
      )}
      {expense.estimated > 0 && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? "bg-destructive" : progress > 80 ? "bg-accent" : "bg-primary"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{Math.round(progress)}% used</span>
        </div>
      )}
    </div>
  );
}
