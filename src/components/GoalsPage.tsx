import { useState } from "react";
import { useGoals, Goal, GoalSubTarget, GoalFundingSource } from "@/hooks/useGoals";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, Check, X, Target, Calendar, TrendingUp, Wallet,
  ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import type { InvestmentItem, Expense } from "@/hooks/useExpenses";
import type { FDEntry, EPFEntry, OtherSavingsEntry } from "@/hooks/useDeposits";

interface AvailableSource {
  sourceType: "investment-profile" | "fd" | "saving-fund" | "epf" | "other-savings";
  sourceId: string;
  sourceName: string;
  totalBalance: number;
  availableBalance: number;
}

interface GoalsPageProps {
  goalsHook: ReturnType<typeof useGoals>;
  investmentItems: InvestmentItem[];
  fds: FDEntry[];
  savingFundExpenses: Expense[];
  epf: EPFEntry | null;
  otherSavings: OtherSavingsEntry[];
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function GoalsPage({ goalsHook, investmentItems, fds, savingFundExpenses, epf, otherSavings }: GoalsPageProps) {
  const { goals, addGoal, updateGoal, deleteGoal, getSourceAllocated, getGoalProgress } = goalsHook;
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formMonth, setFormMonth] = useState((new Date().getMonth() + 1).toString());
  const [formYear, setFormYear] = useState((new Date().getFullYear() + 1).toString());
  const [formSubTargets, setFormSubTargets] = useState<GoalSubTarget[]>([]);
  const [formFunding, setFormFunding] = useState<GoalFundingSource[]>([]);

  // Sub-target add form
  const [stName, setStName] = useState("");
  const [stAmount, setStAmount] = useState("");

  // Funding add form
  const [showFundingPicker, setShowFundingPicker] = useState(false);

  const resetForm = () => {
    setFormName(""); setFormTarget(""); setFormSubTargets([]); setFormFunding([]);
    setFormMonth((new Date().getMonth() + 1).toString());
    setFormYear((new Date().getFullYear() + 1).toString());
    setStName(""); setStAmount(""); setShowFundingPicker(false);
  };

  const openEdit = (g: Goal) => {
    setEditingId(g.id);
    setFormName(g.name);
    setFormTarget(g.targetAmount.toString());
    const [y, m] = g.targetDate.split("-");
    setFormMonth(parseInt(m).toString());
    setFormYear(y);
    setFormSubTargets([...g.subTargets]);
    setFormFunding([...g.fundingSources]);
    setAdding(false);
  };

  const getAvailableSources = (excludeGoalId?: string): AvailableSource[] => {
    const sources: AvailableSource[] = [];
    investmentItems.forEach((item) => {
      const total = item.currentValue || 0;
      const used = getSourceAllocated("investment-profile", item.id, excludeGoalId);
      sources.push({
        sourceType: "investment-profile", sourceId: item.id,
        sourceName: `${item.name}${item.type && item.type !== "Other" ? ` - ${item.type}` : ""}`,
        totalBalance: total, availableBalance: Math.max(0, total - used),
      });
    });
    fds.forEach((fd) => {
      const total = fd.investedAmount || 0;
      const used = getSourceAllocated("fd", fd.id, excludeGoalId);
      sources.push({
        sourceType: "fd", sourceId: fd.id, sourceName: `FD - ${fd.bankName}`,
        totalBalance: total, availableBalance: Math.max(0, total - used),
      });
    });
    savingFundExpenses.forEach((exp) => {
      const total = (exp.totalAllocated || 0) - (exp.totalSpent || 0) + (exp.saved || 0);
      const used = getSourceAllocated("saving-fund", exp.id, excludeGoalId);
      sources.push({
        sourceType: "saving-fund", sourceId: exp.id, sourceName: `Saving - ${exp.description}`,
        totalBalance: total, availableBalance: Math.max(0, total - used),
      });
    });
    if (epf) {
      const total = epf.totalAccumulated;
      const used = getSourceAllocated("epf", epf.id, excludeGoalId);
      sources.push({
        sourceType: "epf", sourceId: epf.id, sourceName: "EPF",
        totalBalance: total, availableBalance: Math.max(0, total - used),
      });
    }
    otherSavings.forEach((s) => {
      const total = s.totalAmount;
      const used = getSourceAllocated("other-savings", s.id, excludeGoalId);
      sources.push({
        sourceType: "other-savings", sourceId: s.id, sourceName: s.name,
        totalBalance: total, availableBalance: Math.max(0, total - used),
      });
    });
    return sources;
  };

  const subTargetTotal = formSubTargets.reduce((s, t) => s + t.amount, 0);
  const targetAmt = parseFloat(formTarget) || 0;
  const subTargetRemaining = targetAmt - subTargetTotal;

  const handleAddSubTarget = () => {
    if (!stName.trim() || !stAmount) return;
    const amt = parseFloat(stAmount) || 0;
    if (amt <= 0 || amt > subTargetRemaining) return;
    setFormSubTargets((prev) => [...prev, { id: crypto.randomUUID(), name: stName.trim(), amount: amt }]);
    setStName(""); setStAmount("");
  };

  const handleAddFunding = (source: AvailableSource, amount: number) => {
    if (amount <= 0 || amount > source.availableBalance) return;
    const existing = formFunding.find((f) => f.sourceId === source.sourceId);
    if (existing) {
      setFormFunding((prev) => prev.map((f) =>
        f.sourceId === source.sourceId ? { ...f, allocatedAmount: f.allocatedAmount + amount } : f
      ));
    } else {
      setFormFunding((prev) => [...prev, {
        id: crypto.randomUUID(), sourceType: source.sourceType,
        sourceId: source.sourceId, sourceName: source.sourceName, allocatedAmount: amount,
      }]);
    }
  };

  const handleSave = () => {
    if (!formName.trim() || targetAmt <= 0) return;
    const goalData = {
      name: formName.trim(), targetAmount: targetAmt,
      targetDate: `${formYear}-${formMonth.padStart(2, "0")}`,
      subTargets: formSubTargets, fundingSources: formFunding,
    };
    if (editingId) {
      updateGoal(editingId, goalData);
      setEditingId(null);
    } else {
      addGoal(goalData);
      setAdding(false);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteGoal(id);
    if (editingId === id) { setEditingId(null); resetForm(); }
  };

  const FundingPicker = ({ excludeGoalId }: { excludeGoalId?: string }) => {
    const [pickAmt, setPickAmt] = useState("");
    const [selectedSource, setSelectedSource] = useState<AvailableSource | null>(null);
    const sources = getAvailableSources(excludeGoalId);
    // Subtract amounts already added in current form
    const adjustedSources = sources.map((s) => {
      const formUsed = formFunding.filter((f) => f.sourceId === s.sourceId).reduce((sum, f) => sum + f.allocatedAmount, 0);
      return { ...s, availableBalance: Math.max(0, s.availableBalance - formUsed) };
    }).filter((s) => s.totalBalance > 0);

    const investmentSources = adjustedSources.filter((s) => s.sourceType === "investment-profile");
    const fdSources = adjustedSources.filter((s) => s.sourceType === "fd");
    const savingSources = adjustedSources.filter((s) => s.sourceType === "saving-fund");
    const epfSources = adjustedSources.filter((s) => s.sourceType === "epf");
    const otherSavingSources = adjustedSources.filter((s) => s.sourceType === "other-savings");

    const renderGroup = (title: string, items: AvailableSource[]) => {
      if (items.length === 0) return null;
      return (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{title}</p>
          {items.map((src) => (
            <div key={src.sourceId} className={`rounded-lg border p-2.5 space-y-2 ${selectedSource?.sourceId === src.sourceId ? "border-primary bg-primary/5" : "bg-muted/20"}`}>
              <button className="w-full text-left flex justify-between items-center" onClick={() => setSelectedSource(selectedSource?.sourceId === src.sourceId ? null : src)}>
                <span className="text-xs font-medium truncate pr-2">{src.sourceName}</span>
                <span className={`text-xs font-bold shrink-0 ${src.availableBalance > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                  ₹{src.availableBalance.toLocaleString("en-IN")}
                </span>
              </button>
              {selectedSource?.sourceId === src.sourceId && src.availableBalance > 0 && (
                <div className="flex gap-2">
                  <Input type="number" value={pickAmt} onChange={(e) => setPickAmt(e.target.value)} placeholder="Amount" className="h-8 text-xs" />
                  <Button size="sm" className="h-8 text-xs px-3" onClick={() => {
                    const amt = parseFloat(pickAmt) || 0;
                    if (amt > 0 && amt <= src.availableBalance) {
                      handleAddFunding(src, amt);
                      setPickAmt(""); setSelectedSource(null);
                    }
                  }}><Plus className="h-3 w-3 mr-1" />Add</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="space-y-3 rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Select Funding Source</p>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowFundingPicker(false)}><X className="h-3 w-3" /></Button>
        </div>
        {adjustedSources.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No funding sources available. Create investment profiles, FDs, or saving fund entries first.</p>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {renderGroup("Investment Profiles", investmentSources)}
            {renderGroup("EPF", epfSources)}
            {renderGroup("Other Savings", otherSavingSources)}
            {renderGroup("Fixed Deposits", fdSources)}
            {renderGroup("Saving Funds", savingSources)}
          </div>
        )}
      </div>
    );
  };

  const renderGoalForm = () => (
    <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-4">
      <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Goal name (e.g. Assetz Registration)" autoFocus />
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">Target Amount (₹)</label>
        <Input type="number" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} placeholder="100000" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1 block">Target Month</label>
          <Select value={formMonth} onValueChange={setFormMonth}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1 block">Target Year</label>
          <Select value={formYear} onValueChange={setFormYear}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{[2025,2026,2027,2028,2029,2030].map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Sub-targets */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Sub-targets</p>
          {targetAmt > 0 && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${subTargetRemaining >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-50 text-red-600"}`}>
            ₹{subTargetRemaining.toLocaleString("en-IN")} unassigned
          </span>}
        </div>
        {formSubTargets.map((st) => (
          <div key={st.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
            <span className="text-xs">{st.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">₹{st.amount.toLocaleString("en-IN")}</span>
              <button onClick={() => setFormSubTargets((prev) => prev.filter((t) => t.id !== st.id))} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        {targetAmt > 0 && subTargetRemaining > 0 && (
          <div className="flex gap-2">
            <Input value={stName} onChange={(e) => setStName(e.target.value)} placeholder="Sub-target name" className="h-8 text-xs" />
            <Input type="number" value={stAmount} onChange={(e) => setStAmount(e.target.value)} placeholder="Amount" className="h-8 text-xs w-28" />
            <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleAddSubTarget}><Plus className="h-3 w-3" /></Button>
          </div>
        )}
      </div>

      {/* Funding Sources */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Funding Sources</p>
          <span className="text-[10px] font-medium text-muted-foreground">
            ₹{formFunding.reduce((s, f) => s + f.allocatedAmount, 0).toLocaleString("en-IN")} allocated
          </span>
        </div>
        {formFunding.map((f) => (
          <div key={f.id} className="flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2">
            <span className="text-xs truncate pr-2">{f.sourceName}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary">₹{f.allocatedAmount.toLocaleString("en-IN")}</span>
              <button onClick={() => setFormFunding((prev) => prev.filter((x) => x.id !== f.id))} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        {showFundingPicker ? (
          <FundingPicker excludeGoalId={editingId || undefined} />
        ) : (
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setShowFundingPicker(true)}>
            <Wallet className="h-3 w-3 mr-1" /> Add Funding Source
          </Button>
        )}
      </div>

      <div className="flex gap-2 justify-between pt-2 border-t">
        {editingId && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(editingId)}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        )}
        {!editingId && <div />}
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setEditingId(null); resetForm(); }}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          <Button size="sm" onClick={handleSave}><Check className="h-4 w-4 mr-1" /> Save</Button>
        </div>
      </div>
    </div>
  );

  const getStatusColor = (progress: ReturnType<typeof getGoalProgress>) => {
    if (progress.percent >= 100) return { bg: "bg-emerald-500", text: "text-emerald-600", label: "Achieved" };
    if (progress.monthsLeft <= 0) return { bg: "bg-red-500", text: "text-red-500", label: "Overdue" };
    if (progress.percent >= 60) return { bg: "bg-emerald-500", text: "text-emerald-600", label: "On Track" };
    if (progress.percent >= 30) return { bg: "bg-amber-500", text: "text-amber-600", label: "Behind" };
    return { bg: "bg-orange-500", text: "text-orange-600", label: "At Risk" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-foreground">My Goals</h2>
        <Button size="sm" variant="outline" onClick={() => { resetForm(); setAdding(true); setEditingId(null); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Goal
        </Button>
      </div>

      {adding && renderGoalForm()}

      {goals.map((goal) => {
        if (editingId === goal.id) return <div key={goal.id}>{renderGoalForm()}</div>;

        const progress = getGoalProgress(goal);
        const status = getStatusColor(progress);
        const isExpanded = expandedId === goal.id;
        const [y, m] = goal.targetDate.split("-");
        const targetLabel = `${MONTHS[parseInt(m) - 1]} ${y}`;

        return (
          <div key={goal.id} className="rounded-xl border bg-card overflow-hidden hover:border-primary/40 transition-all">
            {/* Header */}
            <div className="p-4 space-y-3 cursor-pointer" onClick={() => openEdit(goal)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="font-heading font-bold text-sm text-card-foreground">{goal.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {targetLabel}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${status.bg}`}>{status.label}</span>
                  </div>
                </div>
                {/* Circular progress */}
                <div className="relative h-12 w-12 shrink-0">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                    <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeDasharray={`${Math.min(progress.percent, 100) * 0.9425} 94.25`} strokeLinecap="round" className={status.text} />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold ${status.text}`}>
                    {Math.round(progress.percent)}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">₹{progress.totalFunded.toLocaleString("en-IN")} funded</span>
                  <span className="font-medium">₹{goal.targetAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${status.bg}`} style={{ width: `${Math.min(progress.percent, 100)}%` }} />
                </div>
              </div>

              {/* Monthly savings info */}
              {progress.remaining > 0 && progress.monthsLeft > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    <span className="font-bold">{progress.monthsLeft} month{progress.monthsLeft !== 1 ? "s" : ""}</span> left · Save <span className="font-bold">₹{Math.ceil(progress.perMonth).toLocaleString("en-IN")}/mo</span> to reach target
                  </p>
                </div>
              )}
              {progress.remaining > 0 && progress.monthsLeft <= 0 && (
                <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <p className="text-[11px] text-red-700 dark:text-red-400">
                    Target date passed · <span className="font-bold">₹{progress.remaining.toLocaleString("en-IN")}</span> still needed
                  </p>
                </div>
              )}
            </div>

            {/* Expandable details */}
            <button className="w-full border-t px-4 py-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted/30 transition-colors" onClick={() => setExpandedId(isExpanded ? null : goal.id)}>
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {isExpanded ? "Hide" : "Show"} Details
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t">
                {goal.subTargets.length > 0 && (
                  <div className="space-y-1.5 pt-3">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Sub-targets</p>
                    {goal.subTargets.map((st) => (
                      <div key={st.id} className="flex justify-between items-center bg-muted/20 rounded-lg px-3 py-1.5">
                        <span className="text-xs">{st.name}</span>
                        <span className="text-xs font-medium">₹{st.amount.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                )}
                {goal.fundingSources.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Funding Sources</p>
                    {goal.fundingSources.map((f) => (
                      <div key={f.id} className="flex justify-between items-center bg-primary/5 rounded-lg px-3 py-1.5">
                        <span className="text-xs truncate pr-2">{f.sourceName}</span>
                        <span className="text-xs font-bold text-primary">₹{f.allocatedAmount.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {goals.length === 0 && !adding && (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No goals set yet.</p>
          <p className="text-xs mt-1">Create your first financial goal to start tracking.</p>
        </div>
      )}
    </div>
  );
}
