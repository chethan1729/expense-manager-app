import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { 
  Pencil, Trash2, Check, X, Plus, TrendingUp, TrendingDown, 
  Image as ImageIcon, Tag, Lock, ExternalLink, ChevronsUpDown,
  Check as CheckIcon
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InvestmentItem } from "@/hooks/useExpenses";
import { AppLauncher } from "@capacitor/app-launcher";
import { cn } from "@/lib/utils";

const BROKER_APPS = [
  { name: "Sharekhan", package: "com.sharekhan.androidsharemobile" },
  { name: "Kite", package: "com.zerodha.kite3" },
  { name: "Coin", package: "com.zerodha.coin" },
  { name: "Groww", package: "com.nextbillion.groww" },
  { name: "Webull", package: "org.dayup.stocks" },
  { name: "Vested", package: "com.vested.investing.android" },
  { name: "CoinDcx", package: "com.coindcx.btc" },
  { name: "Wazirx", package: "com.wrx.wazirx" },
  { name: "Upstox", package: "in.upstox.pro" },
  { name: "Smallcase", package: "com.smallcase.android" },
  { name: "Foreign Cash", package: null },
];

function BrokerSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-[300px] p-0" align="start">
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
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === broker.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {broker.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface InvestmentFundViewProps {
  budget: number;
  items: InvestmentItem[];
  onUpdateBudget: (budget: number) => void;
  onAddItem: (itemData: Omit<InvestmentItem, "id">) => void;
  onUpdateItem: (id: string, updates: Partial<Omit<InvestmentItem, "id">>) => void;
  onDeleteItem: (id: string) => void;
}

export function InvestmentFundView({ budget, items, onUpdateBudget, onAddItem, onUpdateItem, onDeleteItem }: InvestmentFundViewProps) {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetVal, setBudgetVal] = useState(budget.toString());
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAllocated, setNewAllocated] = useState("");
  const [newInvested, setNewInvested] = useState("");
  const [newCurrentValue, setNewCurrentValue] = useState("");
  const [newLogo, setNewLogo] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("bg-primary");
  const [newHasLockIn, setNewHasLockIn] = useState(false);
  const [newLockedInAmount, setNewLockedInAmount] = useState("");
  const [newIsUS, setNewIsUS] = useState(false);
  const [newInvestedUSD, setNewInvestedUSD] = useState("");
  const [newCurrentValueUSD, setNewCurrentValueUSD] = useState("");
  const [newUsdRate, setNewUsdRate] = useState("");
  const [newType, setNewType] = useState<InvestmentItem['type']>("Equity");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [itemAllocated, setItemAllocated] = useState("");
  const [itemInvested, setItemInvested] = useState("");
  const [itemCurrentValue, setItemCurrentValue] = useState("");
  const [itemLogo, setItemLogo] = useState("");
  const [itemLabel, setItemLabel] = useState("");
  const [itemLabelColor, setItemLabelColor] = useState("");
  const [itemHasLockIn, setItemHasLockIn] = useState(false);
  const [itemLockedInAmount, setItemLockedInAmount] = useState("");
  const [itemIsUS, setItemIsUS] = useState(false);
  const [itemInvestedUSD, setItemInvestedUSD] = useState("");
  const [itemCurrentValueUSD, setItemCurrentValueUSD] = useState("");
  const [itemUsdRate, setItemUsdRate] = useState("");
  const [itemType, setItemType] = useState<InvestmentItem['type']>("Equity");

  useEffect(() => {
    if (newIsUS) {
      const rate = parseFloat(newUsdRate) || 0;
      const inv = parseFloat(newInvestedUSD) || 0;
      const cur = parseFloat(newCurrentValueUSD) || 0;
      setNewInvested((inv * rate).toString());
      setNewCurrentValue((cur * rate).toString());
    }
  }, [newIsUS, newInvestedUSD, newCurrentValueUSD, newUsdRate]);

  useEffect(() => {
    if (newIsUS) {
      fetch("https://api.exchangerate-api.com/v4/latest/USD")
        .then(res => res.json())
        .then(data => {
          if (data && data.rates && data.rates.INR) {
            setNewUsdRate(data.rates.INR.toString());
          }
        })
        .catch(err => console.error("Failed to fetch USD rate:", err));
    }
  }, [newIsUS]);

  useEffect(() => {
    if (itemIsUS) {
      const rate = parseFloat(itemUsdRate) || 0;
      const inv = parseFloat(itemInvestedUSD) || 0;
      const cur = parseFloat(itemCurrentValueUSD) || 0;
      setItemInvested((inv * rate).toString());
      setItemCurrentValue((cur * rate).toString());
    }
  }, [itemIsUS, itemInvestedUSD, itemCurrentValueUSD, itemUsdRate]);

  useEffect(() => {
    if (itemIsUS) {
      fetch("https://api.exchangerate-api.com/v4/latest/USD")
        .then(res => res.json())
        .then(data => {
          if (data && data.rates && data.rates.INR) {
            setItemUsdRate(data.rates.INR.toString());
          }
        })
        .catch(err => console.error("Failed to fetch USD rate:", err));
    }
  }, [itemIsUS]);

  const totalAllocated = Math.ceil(items.reduce((sum, i) => sum + (i.allocated || 0), 0));
  const totalCurrentValue = Math.ceil(items.reduce((sum, i) => sum + (i.currentValue || 0), 0));
  const totalInvestedSpent = Math.ceil(items.reduce((sum, i) => sum + (i.invested || 0), 0));
  const overallPL = totalCurrentValue - totalInvestedSpent;
  const overallChange = totalInvestedSpent > 0 ? (overallPL / totalInvestedSpent) * 100 : 0;
  const isProfit = overallPL >= 0;

  const handleSaveBudget = () => { onUpdateBudget(parseFloat(budgetVal) || 0); setEditingBudget(false); };

  const openEditItem = (item: InvestmentItem) => {
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemAllocated((item.allocated || 0).toString());
    setItemInvested((item.invested || 0).toString());
    setItemCurrentValue((item.currentValue || 0).toString());
    setItemLogo(item.logo || "");
    setItemLabel(item.label || "");
    setItemLabelColor(item.labelColor || "bg-primary");
    setItemHasLockIn(!!(item.lockedInAmount && item.lockedInAmount > 0));
    setItemLockedInAmount((item.lockedInAmount || 0).toString());
    setItemIsUS(item.isUS || false);
    setItemInvestedUSD((item.investedUSD || 0).toString());
    setItemCurrentValueUSD((item.currentValueUSD || 0).toString());
    setItemUsdRate((item.usdRate || 0).toString());
    setItemType(item.type || "Other");
  };

  const handleTypeChange = (val: string, isNew: boolean) => {
    const type = val as InvestmentItem['type'];
    const colorMap: Record<string, string> = {
      "Equity": "bg-primary",
      "Mutual Fund": "bg-green-500",
      "Crypto": "bg-orange-500",
      "Other": "bg-accent"
    };

    if (isNew) {
      setNewType(type);
      setNewLabel(type || "");
      setNewLabelColor(colorMap[type || "Other"]);
    } else {
      setItemType(type);
      setItemLabel(type || "");
      setItemLabelColor(colorMap[type || "Other"]);
    }
  };

  const saveItem = () => {
    if (!editingItemId) return;
    
    const finalInvested = itemIsUS ? (parseFloat(itemInvestedUSD) || 0) * (parseFloat(itemUsdRate) || 0) : (parseFloat(itemInvested) || 0);
    const finalCurrentValue = itemIsUS ? (parseFloat(itemCurrentValueUSD) || 0) * (parseFloat(itemUsdRate) || 0) : (parseFloat(itemCurrentValue) || 0);

    onUpdateItem(editingItemId, {
      name: itemName,
      allocated: parseFloat(itemAllocated) || 0,
      invested: finalInvested,
      currentValue: finalCurrentValue,
      logo: itemLogo,
      label: itemLabel,
      labelColor: itemLabelColor,
      lockedInAmount: itemHasLockIn ? (parseFloat(itemLockedInAmount) || 0) : 0,
      isUS: itemIsUS,
      investedUSD: itemIsUS ? (parseFloat(itemInvestedUSD) || 0) : undefined,
      currentValueUSD: itemIsUS ? (parseFloat(itemCurrentValueUSD) || 0) : undefined,
      usdRate: itemIsUS ? (parseFloat(itemUsdRate) || 0) : undefined,
      type: itemType,
    });
    setEditingItemId(null);
  };

  const handleAddNew = () => {
    if (!newName.trim()) return;

    const finalInvested = newIsUS ? (parseFloat(newInvestedUSD) || 0) * (parseFloat(newUsdRate) || 0) : (parseFloat(newInvested) || 0);
    const finalCurrentValue = newIsUS ? (parseFloat(newCurrentValueUSD) || 0) * (parseFloat(newUsdRate) || 0) : (parseFloat(newCurrentValue) || 0);

    onAddItem({
      name: newName.trim(),
      allocated: parseFloat(newAllocated) || 0,
      currentValue: finalCurrentValue,
      invested: finalInvested,
      logo: newLogo,
      label: newLabel,
      labelColor: newLabelColor,
      lockedInAmount: newHasLockIn ? (parseFloat(newLockedInAmount) || 0) : 0,
      isUS: newIsUS,
      investedUSD: newIsUS ? (parseFloat(newInvestedUSD) || 0) : undefined,
      currentValueUSD: newIsUS ? (parseFloat(newCurrentValueUSD) || 0) : undefined,
      usdRate: newIsUS ? (parseFloat(newUsdRate) || 0) : undefined,
      type: newType,
    });
    setNewName(""); setNewAllocated(""); setNewInvested(""); setNewCurrentValue(""); setNewLogo(""); setNewLabel(""); setNewLabelColor("bg-primary"); setNewHasLockIn(false); setNewLockedInAmount(""); setAddingNew(false);
    setNewIsUS(false); setNewInvestedUSD(""); setNewCurrentValueUSD(""); setNewUsdRate(""); setNewType("Equity");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (isNew) {
          setNewLogo(base64String);
        } else {
          setItemLogo(base64String);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLaunchApp = async (e: React.MouseEvent, brokerName: string) => {
    e.stopPropagation();
    const broker = BROKER_APPS.find(b => b.name === brokerName);
    if (broker && broker.package) {
      try {
        const canOpen = await AppLauncher.canOpenUrl({ url: broker.package });
        if (canOpen.value) {
          await AppLauncher.openUrl({ url: broker.package });
        } else {
          window.open(`https://play.google.com/store/apps/details?id=${broker.package}`, '_blank');
        }
      } catch (err) {
        window.open(`https://play.google.com/store/apps/details?id=${broker.package}`, '_blank');
      }
    }
  };

  const LockInFields = ({ hasLockIn, setHasLockIn, lockedInAmount, setLockedInAmount }: { hasLockIn: boolean; setHasLockIn: (v: boolean) => void; lockedInAmount: string; setLockedInAmount: (v: string) => void }) => (
    <div className="space-y-2 border-t pt-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={hasLockIn} onChange={(e) => setHasLockIn(e.target.checked)} className="rounded border-input" />
        <Lock className="h-4 w-4 text-orange-500" />
        <span className="text-sm text-foreground">Any amount in lock-in period?</span>
      </label>
      {hasLockIn && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Total Lock-in Amount (₹)</label>
          <Input type="number" value={lockedInAmount} onChange={(e) => setLockedInAmount(e.target.value)} placeholder="0" className="border-orange-500/30" />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {editingBudget ? (
        <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
          <label className="text-sm font-medium text-foreground">Allocated to Investment Fund (₹)</label>
          <Input type="number" value={budgetVal} onChange={(e) => setBudgetVal(e.target.value)} autoFocus />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditingBudget(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button size="sm" onClick={handleSaveBudget}><Check className="h-4 w-4 mr-1" /> Save</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-primary/10 p-4 space-y-1 cursor-pointer hover:ring-2 ring-primary/30" onClick={() => { setBudgetVal(budget.toString()); setEditingBudget(true); }}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Allocated</span>
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </div>
          <p className="font-heading font-bold text-lg text-primary">₹{(budget || 0).toLocaleString('en-IN')}</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <span className="text-xs text-muted-foreground block">Total Allocated</span>
            <span className="font-heading font-bold text-sm">₹{totalAllocated.toLocaleString('en-IN')}</span>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <span className="text-xs text-muted-foreground block">Total Invested</span>
            <span className="font-heading font-bold text-sm text-accent">₹{totalInvestedSpent.toLocaleString('en-IN')}</span>
          </div>
          {/* Current Value — green if profit, red if loss */}
          <div className={`rounded-xl p-3 space-y-1 ${isProfit ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
            <span className="text-xs text-muted-foreground block">Current Value</span>
            <span className={`font-heading font-bold text-sm ${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
              ₹{totalCurrentValue.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="col-span-3 rounded-xl bg-muted/50 p-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Overall P/L</span>
              <span className={`font-heading font-bold text-sm flex items-center gap-1 ${overallPL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {overallPL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {overallPL >= 0 ? "+" : ""}₹{Math.ceil(Math.abs(overallPL)).toLocaleString('en-IN')}
                <span className="text-[10px]">({overallChange.toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-foreground">Investment Profiles</h2>
          <Button size="sm" variant="outline" onClick={() => setAddingNew(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>

        {addingNew && (
          <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-4 shadow-lg">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-3">
                  <BrokerSearch value={newName} onChange={setNewName} placeholder="Select Broker" />
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">Profile Logo</label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="w-full" onClick={() => document.getElementById('new-logo-upload')?.click()}>
                        <ImageIcon className="h-4 w-4 mr-2" /> Upload Photo
                      </Button>
                      <input 
                        type="file" 
                        id="new-logo-upload" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleFileUpload(e, true)} 
                      />
                    </div>
                  </div>
                </div>
                <div className="h-20 w-20 rounded-xl border border-dashed flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                  {newLogo ? (
                    <img src={newLogo} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground opacity-30" />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">Investment Type</label>
                <Select value={newType} onValueChange={(v) => handleTypeChange(v, true)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Equity">Equity</SelectItem>
                    <SelectItem value="Mutual Fund">Mutual Fund</SelectItem>
                    <SelectItem value="Crypto">Crypto</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Label Text</label>
                  <div className="relative">
                    <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Risk High" className="pl-9" />
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Label Color</label>
                  <Select value={newLabelColor} onValueChange={setNewLabelColor}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bg-primary">Blue</SelectItem>
                      <SelectItem value="bg-accent">Purple</SelectItem>
                      <SelectItem value="bg-green-500">Green</SelectItem>
                      <SelectItem value="bg-orange-500">Orange</SelectItem>
                      <SelectItem value="bg-red-500">Red</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Allocated (₹)</label>
                  <Input type="number" value={newAllocated} onChange={(e) => setNewAllocated(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Invested (₹)</label>
                  <Input type="number" value={newInvested} onChange={(e) => setNewInvested(e.target.value)} placeholder="0" disabled={newIsUS} className={newIsUS ? "bg-muted/50" : ""} />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Current (₹)</label>
                  <Input type="number" value={newCurrentValue} onChange={(e) => setNewCurrentValue(e.target.value)} placeholder="0" disabled={newIsUS} className={newIsUS ? "bg-muted/50" : ""} />
                </div>
              </div>

              <div className="space-y-3 border-t pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newIsUS} onChange={(e) => setNewIsUS(e.target.checked)} className="rounded border-input" />
                  <span className="text-sm text-foreground mb-[2px]">Invested in US?</span>
                </label>
                {newIsUS && (
                  <div className="grid grid-cols-3 gap-3 bg-muted/30 p-2 rounded-lg">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">USD Rate (₹)</label>
                      <Input type="number" value={newUsdRate} onChange={(e) => setNewUsdRate(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Invested (USD)</label>
                      <Input type="number" value={newInvestedUSD} onChange={(e) => setNewInvestedUSD(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Current (USD)</label>
                      <Input type="number" value={newCurrentValueUSD} onChange={(e) => setNewCurrentValueUSD(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                )}
              </div>

              <LockInFields
                hasLockIn={newHasLockIn}
                setHasLockIn={setNewHasLockIn}
                lockedInAmount={newLockedInAmount}
                setLockedInAmount={setNewLockedInAmount}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button size="sm" variant="ghost" onClick={() => setAddingNew(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
              <Button size="sm" onClick={handleAddNew} className="bg-primary hover:bg-primary/90"><Check className="h-4 w-4 mr-1" /> Add Profile</Button>
            </div>
          </div>
        )}

        {items.map((item) => {
          const pl = (item.currentValue || 0) - (item.invested || 0);
          const pctChange = (item.invested || 0) > 0 ? (pl / (item.invested || 1)) * 100 : 0;
          const itemIsProfit = pl >= 0;

          if (editingItemId === item.id) {
            return (
              <div key={item.id} className="rounded-lg border border-primary/30 bg-card p-4 space-y-4 shadow-lg">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-3">
                    <BrokerSearch value={itemName} onChange={setItemName} placeholder="Select Broker" />
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block">Profile Logo</label>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="w-full" onClick={() => document.getElementById(`edit-logo-upload-${item.id}`)?.click()}>
                          <ImageIcon className="h-4 w-4 mr-2" /> Change Photo
                        </Button>
                        <input 
                          type="file" 
                          id={`edit-logo-upload-${item.id}`} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => handleFileUpload(e, false)} 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="h-20 w-20 rounded-xl border border-dashed flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                    {itemLogo ? (
                      <img src={itemLogo} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground opacity-30" />
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Investment Type</label>
                  <Select value={itemType} onValueChange={(v) => handleTypeChange(v, false)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Equity">Equity</SelectItem>
                      <SelectItem value="Mutual Fund">Mutual Fund</SelectItem>
                      <SelectItem value="Crypto">Crypto</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">Label Text</label>
                    <div className="relative">
                      <Input value={itemLabel} onChange={(e) => setItemLabel(e.target.value)} placeholder="Label text" className="pl-9" />
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">Label Color</label>
                    <Select value={itemLabelColor} onValueChange={setItemLabelColor}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bg-primary">Blue</SelectItem>
                        <SelectItem value="bg-accent">Purple</SelectItem>
                        <SelectItem value="bg-green-500">Green</SelectItem>
                        <SelectItem value="bg-orange-500">Orange</SelectItem>
                        <SelectItem value="bg-red-500">Red</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Allocated (₹)</label>
                    <Input type="number" value={itemAllocated} onChange={(e) => setItemAllocated(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Invested (₹)</label>
                    <Input type="number" value={itemInvested} onChange={(e) => setItemInvested(e.target.value)} disabled={itemIsUS} className={itemIsUS ? "bg-muted/50" : ""} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Current (₹)</label>
                    <Input type="number" value={itemCurrentValue} onChange={(e) => setItemCurrentValue(e.target.value)} disabled={itemIsUS} className={itemIsUS ? "bg-muted/50" : ""} />
                  </div>
                </div>

                <div className="space-y-3 border-t pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={itemIsUS} onChange={(e) => setItemIsUS(e.target.checked)} className="rounded border-input" />
                    <span className="text-sm text-foreground mb-[2px]">Invested in US?</span>
                  </label>
                  {itemIsUS && (
                    <div className="grid grid-cols-3 gap-3 bg-muted/30 p-2 rounded-lg">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">USD Rate (₹)</label>
                        <Input type="number" value={itemUsdRate} onChange={(e) => setItemUsdRate(e.target.value)} placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Invested (USD)</label>
                        <Input type="number" value={itemInvestedUSD} onChange={(e) => setItemInvestedUSD(e.target.value)} placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Current (USD)</label>
                        <Input type="number" value={itemCurrentValueUSD} onChange={(e) => setItemCurrentValueUSD(e.target.value)} placeholder="0" />
                      </div>
                    </div>
                  )}
                </div>

                <LockInFields
                  hasLockIn={itemHasLockIn}
                  setHasLockIn={setItemHasLockIn}
                  lockedInAmount={itemLockedInAmount}
                  setLockedInAmount={setItemLockedInAmount}
                />

                <div className="flex gap-2 justify-between pt-2 border-t">
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { onDeleteItem(item.id); setEditingItemId(null); }}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingItemId(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                    <Button size="sm" onClick={saveItem}><Check className="h-4 w-4 mr-1" /> Save</Button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={item.id} className="relative rounded-lg border bg-card p-4 space-y-3 cursor-pointer hover:border-primary/40 transition-shadow hover:shadow-md" onClick={() => openEditItem(item)}>
              {item.label && (
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-sm ${item.labelColor || 'bg-primary'}`}>
                  {item.label}
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
                  {item.logo ? (
                    <img src={item.logo} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground opacity-30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-card-foreground text-sm truncate pr-20 flex items-center gap-2">
                    {item.name}
                    {item.type && item.type !== 'Other' && <span className="text-muted-foreground font-normal">- {item.type}</span>}
                    {BROKER_APPS.find(b => b.name === item.name)?.package && (
                      <button
                        onClick={(e) => handleLaunchApp(e, item.name)}
                        className="p-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </h3>
                  {item.lockedInAmount && item.lockedInAmount > 0 ? (
                    <span className="text-[10px] text-orange-500 flex items-center gap-0.5 mt-0.5">
                      <Lock className="h-2.5 w-2.5" /> ₹{item.lockedInAmount.toLocaleString('en-IN')} locked
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase">Allocated</span>
                  <span className="font-medium">₹{Math.ceil(item.allocated || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase">Invested</span>
                  <span className="font-medium text-accent">₹{Math.ceil(item.invested || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase">Current</span>
                  <span className={`font-medium ${itemIsProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                    ₹{Math.ceil(item.currentValue || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[9px] uppercase">P/L</span>
                  <div className={`font-bold flex flex-col items-end ${itemIsProfit ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                    <span className="flex items-center">
                      {itemIsProfit ? "+" : ""}₹{Math.ceil(Math.abs(pl)).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px]">({pctChange.toFixed(1)}%)</span>
                  </div>
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
