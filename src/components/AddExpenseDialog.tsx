import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Landmark, Lock, Trash2 } from "lucide-react";
import type { AmountSegregation } from "@/hooks/useExpenses";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

interface AddExpenseDialogProps {
  onAdd: (description: string, estimated: number, spent: number, isFD?: boolean, preExistingFD?: number, emi?: number, saved?: number, totalAllocated?: number, totalSpent?: number, lockedInAmount?: number, segregationDetails?: AmountSegregation[]) => void;
  showFDOption?: boolean;
  isEmergency?: boolean;
  isLoan?: boolean;
  showBalanceTracking?: boolean; // show total alloc/spent fields
  isSaving?: boolean;            // show lock-in option
}

export function AddExpenseDialog({ onAdd, showFDOption, isEmergency, isLoan, showBalanceTracking = false, isSaving = false }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [est, setEst] = useState("");
  const [spent, setSpent] = useState("");
  const [isFD, setIsFD] = useState(false);
  const [preExistingFD, setPreExistingFD] = useState("");
  const [emi, setEmi] = useState("");
  const [saved, setSaved] = useState("");
  const [totalAllocated, setTotalAllocated] = useState("");
  const [totalSpent, setTotalSpent] = useState("");
  const [hasLockIn, setHasLockIn] = useState(false);
  const [lockedInAmount, setLockedInAmount] = useState("");
  const [segregations, setSegregations] = useState<Array<{sourceName: string; amount: string}>>([]);
  const [segSourceName, setSegSourceName] = useState("");
  const [segAmount, setSegAmount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;
    const finalSegregations: AmountSegregation[] = segregations
      .filter(s => s.sourceName.trim() && parseFloat(s.amount) > 0)
      .map(s => ({ id: crypto.randomUUID(), sourceName: s.sourceName.trim(), amount: parseFloat(s.amount) }));
    onAdd(
      desc.trim(), 
      parseFloat(est) || 0, 
      parseFloat(spent) || 0, 
      isFD, 
      parseFloat(preExistingFD) || 0,
      parseFloat(emi) || 0,
      parseFloat(saved) || 0,
      showBalanceTracking ? (parseFloat(totalAllocated) || 0) : undefined,
      showBalanceTracking ? (parseFloat(totalSpent) || 0) : undefined,
      hasLockIn ? (parseFloat(lockedInAmount) || 0) : 0,
      finalSegregations.length > 0 ? finalSegregations : undefined
    );
    setDesc(""); setEst(""); setSpent(""); setIsFD(false); setPreExistingFD(""); setEmi(""); setSaved(""); setTotalAllocated(""); setTotalSpent(""); setHasLockIn(false); setLockedInAmount(""); setSegregations([]); setSegSourceName(""); setSegAmount("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full shadow-lg shadow-primary/25" size="lg">
          <Plus className="h-5 w-5 mr-1" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Add New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Description</label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Groceries" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{isEmergency ? "Target Allotment (₹)" : "Allocated (₹)"}</label>
              <Input type="number" value={est} onChange={(e) => setEst(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{isEmergency ? "Utilized (₹)" : "Spent (₹)"}</label>
              <Input type="number" value={spent} onChange={(e) => setSpent(e.target.value)} placeholder="0" />
            </div>
          </div>
          {isEmergency && (
            <>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block text-accent font-bold">Current Saved (₹)</label>
                <Input type="number" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" className="border-accent/40" />
              </div>
              {/* Source Segregation */}
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-semibold text-foreground">Source Breakdown</p>
                <p className="text-[10px] text-muted-foreground -mt-1">Where is this amount kept? (optional)</p>
                {segregations.map((seg, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
                    <span className="flex-1 font-medium">{seg.sourceName}</span>
                    <span className="text-primary font-bold">₹{(parseFloat(seg.amount) || 0).toLocaleString('en-IN')}</span>
                    <ConfirmDeleteDialog title="Remove this source?" description="This source amount will be removed from the breakdown." onConfirm={() => setSegregations(p => p.filter((_, i) => i !== idx))}>
                      <button
                      type="button"
                      className="text-destructive hover:text-destructive/80"
                      ><Trash2 className="h-3.5 w-3.5" /></button>
                    </ConfirmDeleteDialog>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={segSourceName}
                    onChange={e => setSegSourceName(e.target.value)}
                    placeholder="Source (e.g. HDFC FD)"
                    className="flex-1 h-8 text-xs"
                  />
                  <Input
                    type="number"
                    value={segAmount}
                    onChange={e => setSegAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-28 h-8 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2"
                    onClick={() => {
                      if (!segSourceName.trim() || !segAmount) return;
                      setSegregations(p => [...p, { sourceName: segSourceName, amount: segAmount }]);
                      setSegSourceName(""); setSegAmount("");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
          {isLoan && (
            <div>
              <label className="text-sm text-muted-foreground mb-1 block font-bold text-primary">Monthly EMI (₹)</label>
              <Input type="number" value={emi} onChange={(e) => setEmi(e.target.value)} placeholder="0" className="border-primary/40" />
            </div>
          )}

          {/* Total Allocated / Spent — only for balance-tracking funds */}
          {showBalanceTracking && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block font-bold text-blue-500">Total Allocated Goal (₹)</label>
                  <Input type="number" value={totalAllocated} onChange={(e) => setTotalAllocated(e.target.value)} placeholder="0" className="border-blue-500/40" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block font-bold text-orange-500">Total Spent/Utilized (₹)</label>
                  <Input type="number" value={totalSpent} onChange={(e) => setTotalSpent(e.target.value)} placeholder="0" className="border-orange-500/40" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground -mt-2 text-blue-400 italic">Lifetime totals carry forward across months.</p>
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
          <Button type="submit" className="w-full">Add Expense</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
