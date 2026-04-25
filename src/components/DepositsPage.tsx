import { useState } from "react";
import { useDeposits, INDIAN_BANKS, FDEntry, OtherSavingsEntry } from "@/hooks/useDeposits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X, Trash2, Plus, Landmark, TrendingUp, Edit2, Lock } from "lucide-react";

// Fund label colors for FD labels
const FUND_LABEL_OPTIONS = [
  { id: "hobby-fund", name: "Hobby Fund", color: "bg-violet-500" },
  { id: "loan-fund", name: "Loan Fund", color: "bg-rose-500" },
  { id: "wishlist-fund", name: "Wishlist Fund", color: "bg-amber-500" },
  { id: "learning-fund", name: "Learning Fund", color: "bg-sky-500" },
  { id: "emergency-fund", name: "Emergency Fund", color: "bg-red-600" },
  { id: "saving-fund", name: "Saving Fund", color: "bg-emerald-600" },
];

function BankBadge({ bankKey, size = "md" }: { bankKey: string; size?: "sm" | "md" | "lg" }) {
  const bank = INDIAN_BANKS.find(b => b.key === bankKey);
  if (!bank) return null;
  const sizeClass = size === "sm" ? "h-8 w-8 text-[10px]" : size === "lg" ? "h-14 w-14 text-base" : "h-10 w-10 text-xs";
  return (
    <div className={`${sizeClass} ${bank.color} ${bank.textColor} rounded-xl flex items-center justify-center font-bold shrink-0 shadow-sm`}>
      {bank.abbr.slice(0, 4)}
    </div>
  );
}

function getDaysToMaturity(maturityDate: string): number {
  const today = new Date();
  const mat = new Date(maturityDate);
  return Math.ceil((mat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function MaturityBadge({ maturityDate }: { maturityDate: string }) {
  const days = getDaysToMaturity(maturityDate);
  if (days < 0) return <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">Matured</span>;
  if (days <= 30) return <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Due in {days}d</span>;
  if (days <= 90) return <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{Math.round(days / 30)}mo</span>;
  return <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{Math.round(days / 30)}mo</span>;
}

export function DepositsPage(props: ReturnType<typeof useDeposits>) {
  const {
    sortedFDs, data, loading,
    addFD, updateFD, deleteFD,
    setEPF,
    addOtherSavings, updateOtherSavings, deleteOtherSavings,
    totalFDAmount, totalEPF, totalOtherSavings, grandTotal,
  } = props;

  const [activeTab, setActiveTab] = useState<"fd" | "epf" | "other">("fd");
  const [showAddFD, setShowAddFD] = useState(false);
  const [editingFD, setEditingFD] = useState<FDEntry | null>(null);
  const [showAddOther, setShowAddOther] = useState(false);
  const [editingOther, setEditingOther] = useState<OtherSavingsEntry | null>(null);
  const [editingEPF, setEditingEPF] = useState(false);
  const [epfValue, setEpfValue] = useState((data.epf?.totalAccumulated || 0).toString());
  const [epfLockedIn, setEpfLockedIn] = useState(data.epf?.isLockedIn || false);

  // FD form state
  const [fdBank, setFdBank] = useState("");
  const [fdOpenDate, setFdOpenDate] = useState("");
  const [fdMatDate, setFdMatDate] = useState("");
  const [fdROI, setFdROI] = useState("");
  const [fdInvested, setFdInvested] = useState("");
  const [fdMaturity, setFdMaturity] = useState("");
  const [fdLabel, setFdLabel] = useState<string>("none");

  // Other savings form state
  const [osName, setOsName] = useState("");
  const [osAmount, setOsAmount] = useState("");
  const [osLockedIn, setOsLockedIn] = useState(false);

  // Edit other savings
  const [editOsName, setEditOsName] = useState("");
  const [editOsAmount, setEditOsAmount] = useState("");
  const [editOsLockedIn, setEditOsLockedIn] = useState(false);

  const resetFDForm = () => {
    setFdBank(""); setFdOpenDate(""); setFdMatDate(""); setFdROI(""); setFdInvested(""); setFdMaturity(""); setFdLabel("none");
  };

  const handleAddFD = () => {
    if (!fdBank || !fdMatDate || !fdInvested) return;
    const bankInfo = INDIAN_BANKS.find(b => b.key === fdBank);
    const labelInfo = FUND_LABEL_OPTIONS.find(l => l.id === fdLabel);
    addFD({
      bankName: bankInfo?.name || fdBank,
      bankKey: fdBank,
      openingDate: fdOpenDate,
      maturityDate: fdMatDate,
      rateOfInterest: parseFloat(fdROI) || 0,
      investedAmount: parseFloat(fdInvested) || 0,
      maturityAmount: parseFloat(fdMaturity) || 0,
      fundLabel: fdLabel === "none" ? undefined : fdLabel,
      labelColor: labelInfo?.color,
    });
    resetFDForm();
    setShowAddFD(false);
  };

  const handleSaveEditFD = () => {
    if (!editingFD) return;
    const bankInfo = INDIAN_BANKS.find(b => b.key === fdBank);
    const labelInfo = FUND_LABEL_OPTIONS.find(l => l.id === fdLabel);
    updateFD(editingFD.id, {
      bankName: bankInfo?.name || fdBank,
      bankKey: fdBank,
      openingDate: fdOpenDate,
      maturityDate: fdMatDate,
      rateOfInterest: parseFloat(fdROI) || 0,
      investedAmount: parseFloat(fdInvested) || 0,
      maturityAmount: parseFloat(fdMaturity) || 0,
      fundLabel: fdLabel === "none" ? undefined : fdLabel,
      labelColor: labelInfo?.color,
    });
    setEditingFD(null);
  };

  const openEditFD = (fd: FDEntry) => {
    setEditingFD(fd);
    setFdBank(fd.bankKey);
    setFdOpenDate(fd.openingDate);
    setFdMatDate(fd.maturityDate);
    setFdROI(fd.rateOfInterest.toString());
    setFdInvested(fd.investedAmount.toString());
    setFdMaturity(fd.maturityAmount.toString());
    setFdLabel(fd.fundLabel || "none");
  };

  const renderFDForm = ({ onSave, onCancel, saveLabel }: { onSave: () => void; onCancel: () => void; saveLabel: string }) => (
    <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-4 shadow-lg">
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-1 block">Select Bank</label>
        <div className="grid grid-cols-5 gap-2">
          {INDIAN_BANKS.map(bank => (
            <button
              key={bank.key}
              onClick={() => setFdBank(bank.key)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${fdBank === bank.key ? "border-primary bg-primary/10" : "border-transparent bg-muted/40 hover:bg-muted"}`}
            >
              <div className={`h-9 w-9 ${bank.color} ${bank.textColor} rounded-lg flex items-center justify-center text-[9px] font-black shadow-sm`}>
                {bank.abbr.slice(0, 5)}
              </div>
              <span className="text-[8px] text-muted-foreground text-center leading-tight">{bank.abbr}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Opening Date</label>
          <Input type="date" value={fdOpenDate} onChange={e => setFdOpenDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Maturity Date</label>
          <Input type="date" value={fdMatDate} onChange={e => setFdMatDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Rate (% p.a.)</label>
          <Input type="number" step="0.01" value={fdROI} onChange={e => setFdROI(e.target.value)} placeholder="7.5" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Invested (₹)</label>
          <Input type="number" value={fdInvested} onChange={e => setFdInvested(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Maturity Amt (₹)</label>
          <Input type="number" value={fdMaturity} onChange={e => setFdMaturity(e.target.value)} placeholder="0" />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-muted-foreground mb-1 block">Fund Label (optional)</label>
        <Select value={fdLabel} onValueChange={setFdLabel}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Assign to a fund..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No label</SelectItem>
            {FUND_LABEL_OPTIONS.map(fund => (
              <SelectItem key={fund.id} value={fund.id}>
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${fund.color}`} />
                  {fund.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
        <Button size="sm" onClick={onSave} disabled={!fdBank || !fdMatDate || !fdInvested}>
          <Check className="h-4 w-4 mr-1" /> {saveLabel}
        </Button>
      </div>
    </div>
  );

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Loading deposits...</div>;

  return (
    <div className="space-y-6 pb-20">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Savings & Deposits</span>
          </div>
          <p className="font-heading text-2xl font-bold text-primary">₹{grandTotal.toLocaleString('en-IN')}</p>
          <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
            <span>FD: <span className="text-foreground font-semibold">₹{totalFDAmount.toLocaleString('en-IN')}</span></span>
            <span>EPF: <span className="text-foreground font-semibold">₹{totalEPF.toLocaleString('en-IN')}</span></span>
            <span>Other: <span className="text-foreground font-semibold">₹{totalOtherSavings.toLocaleString('en-IN')}</span></span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("fd")}
          className={`rounded-xl border p-3 space-y-1 cursor-pointer transition-all ${activeTab === "fd" ? "border-primary bg-primary/10" : "bg-card hover:border-primary/40"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Fixed Deposits</span>
            <Landmark className="h-4 w-4 text-primary" />
          </div>
          <p className="font-heading font-bold text-lg">₹{totalFDAmount.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-muted-foreground">{data.fds.length} entries</p>
        </div>

        <div
          onClick={() => setActiveTab("epf")}
          className={`rounded-xl border p-3 space-y-1 cursor-pointer transition-all ${activeTab === "epf" ? "border-primary bg-primary/10" : "bg-card hover:border-primary/40"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">EPF / PPF</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-heading font-bold text-lg text-emerald-600">₹{totalEPF.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-muted-foreground">{data.epf ? `Updated ${data.epf.lastUpdated}` : "Not configured"}</p>
        </div>

        <div
          onClick={() => setActiveTab("other")}
          className={`col-span-2 rounded-xl border p-3 space-y-1 cursor-pointer transition-all ${activeTab === "other" ? "border-primary bg-primary/10" : "bg-card hover:border-primary/40"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Other Savings</span>
          </div>
          <p className="font-heading font-bold text-lg">₹{totalOtherSavings.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-muted-foreground">{data.otherSavings.length} accounts</p>
        </div>
      </div>

      {/* Tab: FD */}
      {activeTab === "fd" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold">Fixed Deposits ({data.fds.length})</h2>
            <Button size="sm" variant="outline" onClick={() => { resetFDForm(); setShowAddFD(true); setEditingFD(null); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Deposit
            </Button>
          </div>

          {showAddFD && !editingFD && (
            renderFDForm({ onSave: handleAddFD, onCancel: () => setShowAddFD(false), saveLabel: "Add FD" })
          )}

          {editingFD && (
            renderFDForm({ onSave: handleSaveEditFD, onCancel: () => setEditingFD(null), saveLabel: "Save" })
          )}

          <div className="space-y-3">
            {sortedFDs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Landmark className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No FD entries yet. Add one above.</p>
              </div>
            ) : (
              sortedFDs.map(fd => {
                const labelInfo = FUND_LABEL_OPTIONS.find(l => l.id === fd.fundLabel);
                const gain = fd.maturityAmount - fd.investedAmount;
                return (
                  <div
                    key={fd.id}
                    className="rounded-lg border bg-card p-4 space-y-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <BankBadge bankKey={fd.bankKey} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading font-semibold text-sm">{fd.bankName}</h3>
                          {labelInfo && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded text-white font-bold ${labelInfo.color}`}>
                              {labelInfo.name.replace(" Fund", "")}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Opens: {fd.openingDate || "—"}</p>
                      </div>
                      <MaturityBadge maturityDate={fd.maturityDate} />
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditFD(fd)}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteFD(fd.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Invested</span>
                        <span className="font-semibold">₹{fd.investedAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Maturity</span>
                        <span className="font-semibold text-emerald-600">₹{fd.maturityAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Rate</span>
                        <span className="font-semibold text-primary">{fd.rateOfInterest}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Gain</span>
                        <span className="font-semibold text-emerald-600">+₹{gain.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground border-t pt-2">
                      Matures: <span className="text-foreground font-medium">{fd.maturityDate}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab: EPF */}
      {activeTab === "epf" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold">EPF / PPF</h2>
            <Button size="sm" variant="outline" onClick={() => { setEditingEPF(true); setEpfValue((data.epf?.totalAccumulated || 0).toString()); setEpfLockedIn(data.epf?.isLockedIn || false); }}>
              <Edit2 className="h-4 w-4 mr-1" /> {data.epf ? "Update" : "Configure"}
            </Button>
          </div>

          {editingEPF && (
            <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-3">
              <label className="text-sm font-medium">Total EPF/PPF Accumulated (₹)</label>
              <Input type="number" value={epfValue} onChange={e => setEpfValue(e.target.value)} placeholder="0" autoFocus />
              <div className="flex items-center space-x-2 py-2">
                <Switch id="epf-lock-in" checked={epfLockedIn} onCheckedChange={setEpfLockedIn} />
                <Label htmlFor="epf-lock-in" className="text-xs">Mark as Locked-in</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setEditingEPF(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                <Button size="sm" onClick={() => { setEPF(parseFloat(epfValue) || 0, epfLockedIn); setEditingEPF(false); }}>
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          )}

          {data.epf ? (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-5 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <span className="text-sm text-muted-foreground">Total Accumulated</span>
                {data.epf.isLockedIn && <Lock className="h-3.5 w-3.5 text-muted-foreground ml-auto" />}
              </div>
              <p className="text-3xl font-bold font-heading text-emerald-600">₹{data.epf.totalAccumulated.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground">Last updated: {data.epf.lastUpdated}</p>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No EPF data configured. Click Configure to add.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Other Savings */}
      {activeTab === "other" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold">Other Savings ({data.otherSavings.length})</h2>
            <Button size="sm" variant="outline" onClick={() => { setShowAddOther(true); setEditingOther(null); setOsName(""); setOsAmount(""); setOsLockedIn(false); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Savings
            </Button>
          </div>

          {showAddOther && !editingOther && (
            <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-3">
              <Input value={osName} onChange={e => setOsName(e.target.value)} placeholder="Savings name (e.g. Post Office)" autoFocus />
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Total Amount (₹)</label>
                <Input type="number" value={osAmount} onChange={e => setOsAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="flex items-center space-x-2 py-1">
                <Switch id="os-lock-in" checked={osLockedIn} onCheckedChange={setOsLockedIn} />
                <Label htmlFor="os-lock-in" className="text-xs">Mark as Locked-in</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setShowAddOther(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                <Button size="sm" onClick={() => { if (osName) { addOtherSavings(osName, parseFloat(osAmount) || 0, osLockedIn); setShowAddOther(false); } }}>
                  <Check className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          )}

          {editingOther && (
            <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-3">
              <Input value={editOsName} onChange={e => setEditOsName(e.target.value)} placeholder="Savings name" autoFocus />
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Total Amount (₹)</label>
                <Input type="number" value={editOsAmount} onChange={e => setEditOsAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="flex items-center space-x-2 py-1">
                <Switch id="edit-os-lock-in" checked={editOsLockedIn} onCheckedChange={setEditOsLockedIn} />
                <Label htmlFor="edit-os-lock-in" className="text-xs">Mark as Locked-in</Label>
              </div>
              <div className="flex gap-2 justify-between">
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { deleteOtherSavings(editingOther.id); setEditingOther(null); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditingOther(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                  <Button size="sm" onClick={() => { updateOtherSavings(editingOther.id, { name: editOsName, totalAmount: parseFloat(editOsAmount) || 0, isLockedIn: editOsLockedIn }); setEditingOther(null); }}>
                    <Check className="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {data.otherSavings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No other savings added yet.</p>
              </div>
            ) : (
              data.otherSavings.map(s => (
                <div
                  key={s.id}
                  className="rounded-lg border bg-card p-4 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => { setEditingOther(s); setEditOsName(s.name); setEditOsAmount(s.totalAmount.toString()); setEditOsLockedIn(s.isLockedIn || false); setShowAddOther(false); }}
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm flex items-center gap-1">
                      {s.name}
                      {s.isLockedIn && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold text-primary">₹{s.totalAmount.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
