import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

interface AddExpenseDialogProps {
  onAdd: (description: string, estimated: number, spent: number) => void;
}

export function AddExpenseDialog({ onAdd }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [est, setEst] = useState("");
  const [spent, setSpent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;
    onAdd(desc.trim(), parseFloat(est) || 0, parseFloat(spent) || 0);
    setDesc("");
    setEst("");
    setSpent("");
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
              <label className="text-sm text-muted-foreground mb-1 block">Estimated (₹)</label>
              <Input type="number" value={est} onChange={(e) => setEst(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Spent (₹)</label>
              <Input type="number" value={spent} onChange={(e) => setSpent(e.target.value)} placeholder="0" />
            </div>
          </div>
          <Button type="submit" className="w-full">Add Expense</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
