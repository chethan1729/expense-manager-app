import { useState } from "react";
import { useInvestmentPlanner, DiversificationPlan, DiversificationItem } from "@/hooks/useInvestmentPlanner";
import { BROKER_APPS } from "./InvestmentFundView";
import { 
  Plus, Pencil, Trash2, ArrowLeft, TrendingUp, TrendingDown, 
  Wallet, PieChart, LayoutGrid, ChevronsUpDown, Check, X,
  PlusCircle, Info, Calculator, IndianRupee
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

function BrokerSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? BROKER_APPS.find((b) => b.name === value)?.name || value : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[300px] p-0" 
        align="start"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder="Search broker..." />
          <CommandList>
            <CommandEmpty>No broker found.</CommandEmpty>
            <CommandGroup>
              {BROKER_APPS.map((broker) => (
                <CommandItem
                  key={broker.name}
                  value={broker.name}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === broker.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {broker.name}
                </CommandItem>
              ))}
              <CommandItem
                value="Other (Custom Broker)"
                onSelect={() => {
                  onChange("Other (Custom Broker)");
                  setOpen(false);
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Other (Custom Broker)
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function InvestmentPlannerPage() {
  const { 
    plans, addPlan, updatePlan, deletePlan, 
    addItemToPlan, updateItemInPlan, deleteItemFromPlan, getPlanTotals 
  } = useInvestmentPlanner();

  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DiversificationItem | null>(null);

  // New Item State
  const [broker, setBroker] = useState("");
  const [type, setType] = useState<string>("Equity");
  const [customType, setCustomType] = useState("");
  const [subAssets, setSubAssets] = useState<any[]>([]);
  const [customBrokerName, setCustomBrokerName] = useState("");
  const [tempBudget, setTempBudget] = useState("");
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);

  const activePlan = plans.find(p => p.id === activePlanId);

  const handleAddPlan = () => {
    if (!newPlanName.trim()) return;
    const id = addPlan(newPlanName);
    setNewPlanName("");
    setIsAddPlanOpen(false);
    setActivePlanId(id);
  };

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setBroker("");
    setType("Equity");
    setCustomType("");
    setSubAssets([{ id: crypto.randomUUID(), name: "", invested: 0, currentValue: 0 }]);
    setCustomBrokerName("");
    setIsAddItemOpen(true);
  };

  const handleOpenEditItem = (item: DiversificationItem) => {
    setEditingItem(item);
    const knownBroker = BROKER_APPS.find(b => b.name === item.broker);
    if (knownBroker) {
      setBroker(item.broker);
      setCustomBrokerName("");
    } else {
      setBroker("Other (Custom Broker)");
      setCustomBrokerName(item.broker);
    }
    const isStandardType = ["Equity", "Mutual Fund", "Crypto"].includes(item.type);
    setType(isStandardType ? item.type : "Other");
    setCustomType(isStandardType ? "" : item.type);
    setSubAssets(item.subAssets.map(sa => ({ ...sa })));
    setIsAddItemOpen(true);
  };

  const handleSaveItem = () => {
    if (!activePlanId) return;

    const finalBroker = broker === "Other (Custom Broker)" ? customBrokerName : broker;
    if (!finalBroker) return;

    // Filter out empty sub-assets
    const validSubAssets = subAssets.filter(sa => sa.name.trim() !== "");
    if (validSubAssets.length === 0) return;

    const itemData = {
      broker: finalBroker,
      type: type === "Other" ? customType : type,
      subAssets: validSubAssets,
    };

    if (editingItem) {
      updateItemInPlan(activePlanId, editingItem.id, itemData);
    } else {
      addItemToPlan(activePlanId, itemData);
    }

    setIsAddItemOpen(false);
  };

  const handleAddSubAssetRow = () => {
    setSubAssets(prev => [...prev, { id: crypto.randomUUID(), name: "", invested: 0, currentValue: 0 }]);
  };

  const handleRemoveSubAssetRow = (id: string) => {
    if (subAssets.length <= 1) return;
    setSubAssets(prev => prev.filter(sa => sa.id !== id));
  };

  const handleUpdateSubAsset = (id: string, field: string, value: any) => {
    setSubAssets(prev => prev.map(sa => sa.id === id ? { ...sa, [field]: value } : sa));
  };

  const handleSaveBudget = () => {
    if (!activePlanId) return;
    updatePlan(activePlanId, { budget: parseFloat(tempBudget) || 0 });
    setIsBudgetDialogOpen(false);
  };

  if (activePlan) {
    const totals = getPlanTotals(activePlan);
    const isProfit = totals.profitLoss >= 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActivePlanId(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-xl font-bold truncate">{activePlan.name}</h1>
            <p className="text-xs text-muted-foreground">Investment Strategy Planning</p>
          </div>
          <ConfirmDeleteDialog title="Delete this investment plan?" description="The plan and all its assets will be permanently removed." onConfirm={() => { deletePlan(activePlan.id); setActivePlanId(null); }}>
            <Button variant="destructive" size="icon" aria-label="Delete investment plan"><Trash2 className="h-4 w-4" /></Button>
          </ConfirmDeleteDialog>
        </div>

        {/* Plan Budget Card */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Target Budget</span>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-lg">₹{activePlan.budget.toLocaleString('en-IN')}</span>
                <Dialog open={isBudgetDialogOpen} onValueChange={setIsBudgetDialogOpen}>
                  <DialogTrigger asChild>
                    <button 
                      className="p-1 rounded-full hover:bg-primary/10 transition-colors"
                      onClick={() => {
                        setTempBudget(activePlan.budget.toString());
                        setIsBudgetDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3 text-primary" />
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Plan Budget</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium mb-1 block">Plan Budget (₹)</label>
                        <Input 
                          type="number" 
                          value={tempBudget} 
                          onChange={(e) => setTempBudget(e.target.value)}
                          placeholder="Enter budget..."
                          autoFocus
                        />
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/50 p-2 rounded">
                        <Info className="h-3.5 w-3.5" /> This budget is used for planning your diversification strategy.
                      </p>
                    </div>
                    <DialogFooter className="flex-row gap-2 sm:justify-end">
                      <Button variant="ghost" onClick={() => setIsBudgetDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveBudget}>Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Total Items</span>
              <div className="font-heading font-bold text-lg">{activePlan.items.length} Assets</div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <span className="text-[9px] uppercase font-bold text-muted-foreground block">Invested</span>
            <span className="font-heading font-bold text-sm">₹{totals.totalInvested.toLocaleString('en-IN')}</span>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <span className="text-[9px] uppercase font-bold text-muted-foreground block">Current Value</span>
            <span className="font-heading font-bold text-sm">₹{totals.totalCurrentValue.toLocaleString('en-IN')}</span>
          </div>
          <div className={cn("rounded-xl p-3 space-y-1", isProfit ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20")}>
            <span className="text-[9px] uppercase font-bold text-muted-foreground block">P&L Status</span>
            <div className={cn("font-heading font-bold text-sm flex items-center gap-0.5", isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
              {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {totals.profitLossPercentage.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-foreground">Diversification Assets</h2>
            <Button size="sm" onClick={handleOpenAddItem}>
              <Plus className="h-4 w-4 mr-1" /> Add Asset
            </Button>
          </div>

          <div className="space-y-3">
            {activePlan.items.map((item) => {
              const itemInvested = item.subAssets.reduce((sum, sa) => sum + (sa.invested || 0), 0);
              const itemCurrent = item.subAssets.reduce((sum, sa) => sum + (sa.currentValue || 0), 0);
              const itemIsProfit = itemCurrent >= itemInvested;
              const itemPL = itemCurrent - itemInvested;
              const itemPLPct = itemInvested > 0 ? (itemPL / itemInvested) * 100 : 0;

              return (
                <div 
                  key={item.id} 
                  className="rounded-xl border bg-card p-4 space-y-3 cursor-pointer hover:border-primary/40 transition-all"
                  onClick={() => handleOpenEditItem(item)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {item.type}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">{item.broker}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.subAssets.map(sa => (
                          <span key={sa.id} className="text-[10px] bg-primary/5 text-primary px-2 py-0.5 rounded-full border border-primary/10">
                            {sa.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ConfirmDeleteDialog title="Delete this asset?" description="This asset will be removed from the investment plan." onConfirm={() => deleteItemFromPlan(activePlan.id, item.id)}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => e.stopPropagation()} aria-label="Delete plan asset">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ConfirmDeleteDialog>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-muted/30">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase tracking-tighter">Total Invested</span>
                      <span className="font-semibold">₹{itemInvested.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase tracking-tighter">Current Val</span>
                      <span className="font-semibold">₹{itemCurrent.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[10px] uppercase tracking-tighter">P/L %</span>
                      <span className={cn("font-bold flex items-center justify-end gap-1", itemIsProfit ? "text-emerald-600" : "text-destructive")}>
                        {itemPLPct.toFixed(1)}%
                        {itemIsProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {activePlan.items.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/20">
                <PieChart className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm text-muted-foreground">Start adding assets to this plan</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={handleOpenAddItem}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Add First Asset
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Item Dialog */}
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Asset" : "Add New Asset"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Broker / App</label>
                  <BrokerSearch value={broker} onChange={setBroker} placeholder="Select Broker" />
                </div>

                {broker === "Other (Custom Broker)" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                    <label className="text-sm font-medium">Custom Broker Name</label>
                    <Input 
                      value={customBrokerName} 
                      onChange={(e) => setCustomBrokerName(e.target.value)} 
                      placeholder="e.g. My Personal Portfolio" 
                      autoFocus
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Asset Type</label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Equity">Equity</SelectItem>
                        <SelectItem value="Mutual Fund">Mutual Fund</SelectItem>
                        <SelectItem value="Crypto">Crypto</SelectItem>
                        <SelectItem value="Other">Other (Custom)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {type === "Other" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Custom Type</label>
                      <Input 
                        value={customType} 
                        onChange={(e) => setCustomType(e.target.value)} 
                        placeholder="e.g. Gold" 
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-emerald-500" />
                    Asset Details
                  </label>
                  <Button variant="ghost" size="sm" onClick={handleAddSubAssetRow} className="h-8 text-[10px] text-primary hover:bg-primary/5">
                    <Plus className="h-3 w-3 mr-1" /> Add Row
                  </Button>
                </div>

                <div className="space-y-4">
                  {subAssets.map((sa, idx) => (
                    <div key={sa.id} className="p-3 rounded-xl border bg-muted/20 space-y-3 relative group">
                      {subAssets.length > 1 && (
                        <button 
                          onClick={() => handleRemoveSubAssetRow(sa.id)}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">
                          {idx + 1}. {type === "Equity" ? "Stock / ETF Name" : type === "Mutual Fund" ? "Fund Name" : "Asset Name"}
                        </label>
                        <Input 
                          value={sa.name} 
                          onChange={(e) => handleUpdateSubAsset(sa.id, "name", e.target.value)} 
                          placeholder={type === "Equity" ? "e.g. RELIANCE" : "e.g. Parag Parikh Flexi"} 
                          className="h-9 bg-card"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">Invested (₹)</label>
                          <Input 
                            type="number" 
                            value={sa.invested} 
                            onChange={(e) => handleUpdateSubAsset(sa.id, "invested", parseFloat(e.target.value) || 0)} 
                            placeholder="0" 
                            className="h-9 bg-card"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">Current (₹)</label>
                          <Input 
                            type="number" 
                            value={sa.currentValue} 
                            onChange={(e) => handleUpdateSubAsset(sa.id, "currentValue", parseFloat(e.target.value) || 0)} 
                            placeholder="0" 
                            className="h-9 bg-card"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex justify-between items-center text-xs font-bold mt-4">
                <span className="text-muted-foreground">ENTRY TOTALS:</span>
                <div className="flex gap-4">
                  <span>INV: ₹{subAssets.reduce((s, a) => s + (a.invested || 0), 0).toLocaleString('en-IN')}</span>
                  <span className="text-primary">VAL: ₹{subAssets.reduce((s, a) => s + (a.currentValue || 0), 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-row gap-2 sm:justify-end">
              <Button variant="ghost" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveItem}>
                {editingItem ? "Save Changes" : "Add to Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold">Investment Planner</h1>
        <p className="text-sm text-muted-foreground">Strategic diversification planning hub</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-none shadow-none">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2 min-h-[120px]">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <Dialog open={isAddPlanOpen} onOpenChange={setIsAddPlanOpen}>
              <DialogTrigger asChild>
                <Button variant="link" className="font-heading font-bold p-0 h-auto text-primary">Create New Plan</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Name Your Plan</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <label className="text-sm font-medium mb-1 block">Plan Name</label>
                  <Input 
                    autoFocus
                    value={newPlanName} 
                    onChange={(e) => setNewPlanName(e.target.value)} 
                    placeholder="e.g. Retirement Strategy 2026"
                  />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsAddPlanOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddPlan} disabled={!newPlanName.trim()}>Initialize Plan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <p className="text-[10px] text-muted-foreground leading-tight">Draft a new diversification strategy</p>
          </CardContent>
        </Card>

        {plans.length === 0 && (
          <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-2xl bg-muted/10 opacity-60">
            <div className="text-center space-y-1">
              <LayoutGrid className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-[10px] font-medium uppercase tracking-wider">No Plans Yet</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {plans.length > 0 && <h2 className="font-heading font-semibold px-1">Your Planning Scenarios</h2>}
        <div className="grid gap-4">
          {plans.map((plan) => {
            const totals = getPlanTotals(plan);
            const isProfit = totals.profitLoss >= 0;

            return (
              <Card 
                key={plan.id} 
                className="overflow-hidden hover:ring-2 ring-primary/20 transition-all cursor-pointer border-muted shadow-sm"
                onClick={() => setActivePlanId(plan.id)}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading text-lg font-bold">{plan.name}</CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-muted-foreground">Planning for</span>
                    <span className="font-heading font-bold text-lg text-primary">₹{plan.budget.toLocaleString('en-IN')}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-muted/30">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Invested</span>
                      <p className="font-semibold text-sm">₹{totals.totalInvested.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Est. P/L</span>
                      <div className={cn("font-bold text-sm flex items-center justify-end gap-1", isProfit ? "text-emerald-600" : "text-destructive")}>
                        {isProfit ? "+" : ""}₹{Math.abs(totals.profitLoss).toLocaleString('en-IN')}
                        <span className="text-[10px]">({totals.profitLossPercentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 py-2 bg-muted/10 flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <PieChart className="h-3 w-3" /> {plan.items.length} Assets Tracked
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2">
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {plans.length === 0 && (
        <div className="bg-muted/30 rounded-2xl p-8 text-center space-y-4 border border-dashed">
          <Calculator className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
          <div className="space-y-2">
            <h3 className="font-heading font-bold">Start Your First Plan</h3>
            <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
              Diversify your amount into different brokers and asset classes to see projected growth and risk.
            </p>
          </div>
          <Button onClick={() => setIsAddPlanOpen(true)} className="rounded-full px-6">
            Get Started <Plus className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
