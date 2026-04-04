import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Landmark } from "lucide-react";

interface AddExpenseDialogProps {
  onAdd: (description: string, estimated: number, spent: number, isFD?: boolean, preExistingFD?: number) => void;
  showFDOption?: boolean;
}

export function AddExpenseDialog({ onAdd, showFDOption }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [est, setEst] = useState("");
  const [spent, setSpent] = useState("");
  const [isFD, setIsFD] = useState(false);
  const [preExistingFD, setPreExistingFD] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;
    onAdd(desc.trim(), parseFloat(est) || 0, parseFloat(spent) || 0, isFD, parseFloat(preExistingFD) || 0);
    setDesc(""); setEst(""); setSpent(""); setIsFD(false); setPreExistingFD("");
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
              <label className="text-sm text-muted-foreground mb-1 block">Allocated (₹)</label>
              <Input type="number" value={est} onChange={(e) => setEst(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Spent (₹)</label>
              <Input type="number" value={spent} onChange={(e) => setSpent(e.target.value)} placeholder="0" />
            </div>
          </div>
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
                  <p className="text-xs text-muted-foreground mt-1">Won't affect current month calculations</p>
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
