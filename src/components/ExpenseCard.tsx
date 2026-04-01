import { useState } from "react";
import { Expense } from "@/hooks/useExpenses";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X } from "lucide-react";

interface ExpenseCardProps {
  expense: Expense;
  onUpdate: (id: string, updates: Partial<Omit<Expense, "id">>) => void;
  onDelete: (id: string) => void;
}

export function ExpenseCard({ expense, onUpdate, onDelete }: ExpenseCardProps) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(expense.description);
  const [est, setEst] = useState(expense.estimated.toString());
  const [spent, setSpent] = useState(expense.spent.toString());

  const remaining = expense.estimated - expense.spent;
  const progress = expense.estimated > 0 ? (expense.spent / expense.estimated) * 100 : 0;
  const isOverBudget = remaining < 0;

  const handleSave = () => {
    onUpdate(expense.id, {
      description: desc,
      estimated: parseFloat(est) || 0,
      spent: parseFloat(spent) || 0,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setDesc(expense.description);
    setEst(expense.estimated.toString());
    setSpent(expense.spent.toString());
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-3">
        <Input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description"
          className="font-medium"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Estimated</label>
            <Input
              type="number"
              value={est}
              onChange={(e) => setEst(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Spent</label>
            <Input
              type="number"
              value={spent}
              onChange={(e) => setSpent(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Check className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 group">
      <div className="flex items-start justify-between">
        <h3 className="font-heading font-semibold text-card-foreground">
          {expense.description}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(expense.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground text-xs block">Estimated</span>
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

      {expense.estimated > 0 && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget ? "bg-destructive" : progress > 80 ? "bg-accent" : "bg-primary"
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{Math.round(progress)}% used</span>
        </div>
      )}
    </div>
  );
}
