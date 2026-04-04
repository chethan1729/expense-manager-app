import { useState } from "react";
import { Expense } from "@/hooks/useExpenses";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Check, X, Plus, Landmark } from "lucide-react";

interface ExpenseCardProps {
  expense: Expense;
  onUpdate: (id: string, updates: Partial<Omit<Expense, "id">>) => void;
  onDelete: (id: string) => void;
  showFDOption?: boolean;
}

export function ExpenseCard({ expense, onUpdate, onDelete, showFDOption }: ExpenseCardProps) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(expense.description);
  const [est, setEst] = useState(expense.estimated.toString());
  const [spent, setSpent] = useState(expense.spent.toString());
  const [additionalSpent, setAdditionalSpent] = useState("");
  const [isFD, setIsFD] = useState(expense.isFD || false);
  const [preExistingFD, setPreExistingFD] = useState((expense.preExistingFD || 0).toString());

  const remaining = expense.estimated - expense.spent;
  const progress = expense.estimated > 0 ? (expense.spent / expense.estimated) * 100 : 0;
  const isOverBudget = remaining < 0;

  const handleOpen = () => {
    setDesc(expense.description);
    setEst(expense.estimated.toString());
    setSpent(expense.spent.toString());
    setAdditionalSpent("");
    setIsFD(expense.isFD || false);
    setPreExistingFD((expense.preExistingFD || 0).toString());
    setEditing(true);
  };

  const handleSave = () => {
    const baseSpent = parseFloat(spent) || 0;
    const extra = parseFloat(additionalSpent) || 0;
    onUpdate(expense.id, {
      description: desc,
      estimated: parseFloat(est) || 0,
      spent: baseSpent + extra,
      isFD,
      preExistingFD: parseFloat(preExistingFD) || 0,
    });
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
              <Plus className="h-3 w-3" /> Add More (₹)
            </label>
            <Input type="number" value={additionalSpent} onChange={(e) => setAdditionalSpent(e.target.value)} placeholder="0" />
          </div>
        </div>
        {(parseFloat(additionalSpent) || 0) > 0 && (
          <p className="text-xs text-muted-foreground">
            New total spent: <span className="font-medium text-foreground">₹{((parseFloat(spent) || 0) + (parseFloat(additionalSpent) || 0)).toLocaleString()}</span>
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
                <label className="text-xs text-muted-foreground mb-1 block">Pre-existing FD Amount (₹)</label>
                <Input type="number" value={preExistingFD} onChange={(e) => setPreExistingFD(e.target.value)} placeholder="0" />
                <p className="text-xs text-muted-foreground mt-1">Pre-existing FD won't affect current month budget calculations</p>
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
        {expense.isFD && <Landmark className="h-4 w-4 text-primary shrink-0" />}
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground text-xs block">Allocated</span>
          <span className="font-medium font-heading">₹{expense.estimated.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground text-xs block">Spent</span>
          <span className="font-medium font-heading">₹{expense.spent.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground text-xs block">Remaining</span>
          <span className={`font-medium font-heading ${isOverBudget ? "text-destructive" : "text-primary"}`}>
            ₹{remaining.toLocaleString()}
          </span>
        </div>
      </div>
      {expense.preExistingFD && expense.preExistingFD > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Landmark className="h-3 w-3" /> Pre-existing FD: ₹{expense.preExistingFD.toLocaleString()}
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
