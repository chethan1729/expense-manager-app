import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X, Plus, TrendingUp, TrendingDown } from "lucide-react";
import type { InvestmentItem } from "@/hooks/useExpenses";

interface InvestmentFundViewProps {
  budget: number;
  items: InvestmentItem[];
  onUpdateBudget: (budget: number) => void;
  onAddItem: (name: string, allocated: number, currentValue: number) => void;
  onUpdateItem: (id: string, updates: Partial<Omit<InvestmentItem, "id">>) => void;
  onDeleteItem: (id: string) => void;
}

export function InvestmentFundView({
  budget,
  items,
  onUpdateBudget,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: InvestmentFundViewProps) {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetVal, setBudgetVal] = useState(budget.toString());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemAllocated, setItemAllocated] = useState("");
  const [itemCurrentValue, setItemCurrentValue] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAllocated, setNewAllocated] = useState("");
  const [newCurrentValue, setNewCurrentValue] = useState("");

  const totalAllocated = items.reduce((sum, i) => sum + i.allocated, 0);
  const totalCurrentValue = items.reduce((sum, i) => sum + i.currentValue, 0);
  const overallChange = totalAllocated > 0
    ? ((totalCurrentValue - totalAllocated) / totalAllocated) * 100
    : 0;

  const handleSaveBudget = () => {
    onUpdateBudget(parseFloat(budgetVal) || 0);
    setEditingBudget(false);
  };

  const openEditItem = (item: InvestmentItem) => {
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemAllocated(item.allocated.toString());
    setItemCurrentValue(item.currentValue.toString());
  };

  const saveItem = () => {
    if (!editingItemId) return;
    onUpdateItem(editingItemId, {
      name: itemName,
      allocated: parseFloat(itemAllocated) || 0,
      currentValue: parseFloat(itemCurrentValue) || 0,
    });
    setEditingItemId(null);
  };

  const handleAddNew = () => {
    if (!newName.trim()) return;
    onAddItem(newName.trim(), parseFloat(newAllocated) || 0, parseFloat(newCurrentValue) || 0);
    setNewName("");
    setNewAllocated("");
    setNewCurrentValue("");
    setAddingNew(false);
  };

  return (
    <div className="space-y-6">
      {/* Budget allocation card */}
      {editingBudget ? (
        <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
          <label className="text-sm font-medium text-foreground">Allocated to Investment Fund (₹)</label>
          <Input type="number" value={budgetVal} onChange={(e) => setBudgetVal(e.target.value)} autoFocus />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditingBudget(false)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSaveBudget}>
              <Check className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl bg-primary/10 p-4 space-y-1 cursor-pointer hover:ring-2 ring-primary/30"
          onClick={() => { setBudgetVal(budget.toString()); setEditingBudget(true); }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Allocated</span>
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </div>
          <p className="font-heading font-bold text-lg text-primary">₹{budget.toLocaleString()}</p>
        </div>
      )}

      {/* Summary */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <span className="text-xs text-muted-foreground block">Total Allocated</span>
            <span className="font-heading font-bold text-sm">₹{totalAllocated.toLocaleString()}</span>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <span className="text-xs text-muted-foreground block">Current Value</span>
            <span className="font-heading font-bold text-sm">₹{totalCurrentValue.toLocaleString()}</span>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <span className="text-xs text-muted-foreground block">Change</span>
            <span className={`font-heading font-bold text-sm flex items-center gap-1 ${overallChange >= 0 ? "text-primary" : "text-destructive"}`}>
              {overallChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {overallChange.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Investment items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-foreground">Investment Profiles</h2>
          <Button size="sm" variant="outline" onClick={() => setAddingNew(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {addingNew && (
          <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Profile name" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Allocated (₹)</label>
                <Input type="number" value={newAllocated} onChange={(e) => setNewAllocated(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Current Value (₹)</label>
                <Input type="number" value={newCurrentValue} onChange={(e) => setNewCurrentValue(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setAddingNew(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleAddNew}>
                <Check className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        )}

        {items.map((item) => {
          const pctChange = item.allocated > 0
            ? ((item.currentValue - item.allocated) / item.allocated) * 100
            : 0;

          if (editingItemId === item.id) {
            return (
              <div key={item.id} className="rounded-lg border border-primary/30 bg-card p-4 space-y-3">
                <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Profile name" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Allocated (₹)</label>
                    <Input type="number" value={itemAllocated} onChange={(e) => setItemAllocated(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Current Value (₹)</label>
                    <Input type="number" value={itemCurrentValue} onChange={(e) => setItemCurrentValue(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2 justify-between">
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { onDeleteItem(item.id); setEditingItemId(null); }}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingItemId(null)}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={saveItem}>
                      <Check className="h-4 w-4 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="rounded-lg border bg-card p-4 space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => openEditItem(item)}
            >
              <h3 className="font-heading font-semibold text-card-foreground text-sm">{item.name}</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs block">Allocated</span>
                  <span className="font-medium font-heading">₹{item.allocated.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Current</span>
                  <span className="font-medium font-heading">₹{item.currentValue.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Change</span>
                  <span className={`font-medium font-heading flex items-center gap-1 ${pctChange >= 0 ? "text-primary" : "text-destructive"}`}>
                    {pctChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {pctChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {items.length === 0 && !addingNew && (
          <p className="text-center py-8 text-muted-foreground text-sm">No investment profiles yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}
