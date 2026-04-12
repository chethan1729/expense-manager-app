import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Coins, Pencil } from "lucide-react";
import { MetalType, PreciousMetalItem } from "@/hooks/usePreciousMetals";
import { useEffect } from "react";

interface AddMetalDialogProps {
  onAdd: (name: string, type: MetalType, weight: number, purchasedValue: number) => void;
  onUpdate?: (id: string, updates: any) => void;
  rates: { gold24k: number; gold22k: number; silver: number; platinum: number };
  initialItem?: PreciousMetalItem | null;
  onClose?: () => void;
}

export function AddMetalDialog({ onAdd, onUpdate, rates, initialItem, onClose }: AddMetalDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<MetalType>("Gold 24K");
  const [weight, setWeight] = useState("");
  const [purchasedValue, setPurchasedValue] = useState("");

  const isEditing = !!initialItem;

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name || "");
      setType(initialItem.type);
      setWeight(initialItem.weight.toString());
      setPurchasedValue(initialItem.purchasedValue.toString());
      setOpen(true);
    }
  }, [initialItem]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onClose) {
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setName("");
    setType("Gold 24K");
    setWeight("");
    setPurchasedValue("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type || !weight || !purchasedValue) return;

    if (isEditing && initialItem && onUpdate) {
      onUpdate(initialItem.id, {
        name,
        type,
        weight: parseFloat(weight),
        purchasedValue: parseFloat(purchasedValue)
      });
    } else {
      onAdd(name, type, parseFloat(weight), parseFloat(purchasedValue));
    }
    
    handleOpenChange(false);
  };

  const currentRate = (() => {
    switch (type) {
      case "Gold 24K": return rates.gold24k;
      case "Gold 22K": return rates.gold22k;
      case "Silver": return rates.silver;
      case "Platinum": return rates.platinum;
      default: return 0;
    }
  })();

  const w = parseFloat(weight) || 0;
  const p = parseFloat(purchasedValue) || 0;
  const purchaseRate = w > 0 ? p / w : 0;
  const currentValuation = w * currentRate;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button className="rounded-full shadow-lg shadow-primary/25" size="lg">
            <Plus className="h-5 w-5 mr-1" /> Add Ornament
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            {isEditing ? <Pencil className="h-5 w-5 text-accent" /> : <Coins className="h-5 w-5 text-yellow-500" />}
            {isEditing ? "Edit Ornament" : "Add New Ornament"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground mb-1 block">Ornament Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Gold Chain, Silver Ring" 
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground mb-1 block">Metal Type</label>
            <Select value={type} onValueChange={(value: MetalType) => setType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select metal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gold 24K">Gold 24K</SelectItem>
                <SelectItem value="Gold 22K">Gold 22K</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground mb-1 block">Total Weight (Grams)</label>
              <Input 
                type="number" 
                step="0.001"
                value={weight} 
                onChange={(e) => setWeight(e.target.value)} 
                placeholder="0.00" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground mb-1 block">Purchased Value (₹)</label>
              <Input 
                type="number" 
                value={purchasedValue} 
                onChange={(e) => setPurchasedValue(e.target.value)} 
                placeholder="0" 
              />
            </div>
          </div>

          {(w > 0 || p > 0 || isEditing) && (
            <div className="bg-muted/50 rounded-xl p-3 space-y-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Current Market Rate:</span>
                <span className="font-bold text-muted-foreground tracking-tight">₹{Math.ceil(currentRate).toLocaleString('en-IN')}/g</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Purchase Rate:</span>
                <span className="font-bold text-primary">₹{Math.ceil(purchaseRate).toLocaleString('en-IN')}/g</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t pt-2">
                <span className="text-muted-foreground">Current Valuation:</span>
                <span className="font-bold text-emerald-600">₹{Math.ceil(currentValuation).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full mt-4">
            {isEditing ? "Save Changes" : "Add Asset"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
