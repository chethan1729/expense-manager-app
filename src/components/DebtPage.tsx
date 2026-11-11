import { useState } from "react";
import { useDebts, PersonalDebt, Loan, LoanInterestRatePeriod, LoanTransactionKind, getCurrentLoanInterestRate, summarizeLoanMetrics } from "@/hooks/useDebts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Check, X, HandCoins, Landmark, ArrowLeft, Image as ImageIcon, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

export function DebtPage(props: ReturnType<typeof useDebts>) {
  const { debts, loans, addDebt, updateDebt, deleteDebt, addLoan, updateLoan, deleteLoan, addLoanTransaction, updateLoanTransaction, deleteLoanTransaction, totalOutstanding } = props;

  const [addingDebt, setAddingDebt] = useState(false);
  const [editDebtId, setEditDebtId] = useState<string | null>(null);
  const [debtForm, setDebtForm] = useState({ personName: "", amount: "", description: "", date: new Date().toISOString().slice(0, 10), type: "owe" as "owe" | "owed" });

  const [addingLoan, setAddingLoan] = useState(false);
  const [editLoanId, setEditLoanId] = useState<string | null>(null);
  const [expandedLoanDetailsId, setExpandedLoanDetailsId] = useState<string | null>(null);
  const [expandedRateHistoryId, setExpandedRateHistoryId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [loanForm, setLoanForm] = useState({
    name: "", sanctionedAmount: "", totalOutstanding: "", principalPaid: "", interestPaid: "",
    totalSanctionedAmount: "", preEmiTenureMonths: "", preEmiStartDate: "", emiTenureMonths: "", emiStartDate: "", interestRate: "", image: "",
  });
  const [interestRateHistory, setInterestRateHistory] = useState<LoanInterestRatePeriod[]>([
    { id: crypto.randomUUID(), rate: 0, startDate: today },
  ]);

  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [addingTransaction, setAddingTransaction] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState("");
  const [transactionMonthFilter, setTransactionMonthFilter] = useState("all");
  const [transactionYearFilter, setTransactionYearFilter] = useState("all");
  const [transactionKindFilter, setTransactionKindFilter] = useState<LoanTransactionKind | "all">("all");
  const [transactionSort, setTransactionSort] = useState<"newest" | "oldest">("newest");
  const [txForm, setTxForm] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    kind: "emi" as LoanTransactionKind,
    principal: "",
    interest: "",
    transactionType: "",
  });

  const totalIOwe = debts.filter((d) => d.type === "owe").reduce((s, d) => s + d.amount, 0);
  const totalOwedToMe = debts.filter((d) => d.type === "owed").reduce((s, d) => s + d.amount, 0);

  const formatRateDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return "";
    const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() - (end.getDate() < start.getDate() ? 1 : 0));
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return years > 0 ? `${years}y${remainingMonths > 0 ? ` ${remainingMonths}m` : ""}` : `${remainingMonths}m`;
  };

  const handleAddDebt = () => {
    if (!debtForm.personName.trim()) return;
    addDebt({ personName: debtForm.personName, amount: parseFloat(debtForm.amount) || 0, description: debtForm.description, date: debtForm.date, type: debtForm.type });
    setDebtForm({ personName: "", amount: "", description: "", date: new Date().toISOString().slice(0, 10), type: "owe" });
    setAddingDebt(false);
  };

  const handleSaveDebt = () => {
    if (!editDebtId) return;
    updateDebt(editDebtId, { personName: debtForm.personName, amount: parseFloat(debtForm.amount) || 0, description: debtForm.description, date: debtForm.date, type: debtForm.type });
    setEditDebtId(null);
  };

  const openEditDebt = (d: PersonalDebt) => {
    setEditDebtId(d.id);
    setDebtForm({ personName: d.personName, amount: d.amount.toString(), description: d.description, date: d.date, type: d.type });
  };

  const handleAddLoan = () => {
    if (!loanForm.name.trim()) return;
    const currentInterestRate = [...interestRateHistory].reverse().find((period) => !period.endDate)?.rate ?? 0;
    addLoan({
      name: loanForm.name, totalSanctionedAmount: parseFloat(loanForm.totalSanctionedAmount) || 0, sanctionedAmount: parseFloat(loanForm.sanctionedAmount) || 0,
      totalOutstanding: parseFloat(loanForm.totalOutstanding) || 0, principalPaid: parseFloat(loanForm.principalPaid) || 0,
      interestPaid: parseFloat(loanForm.interestPaid) || 0, interestRate: currentInterestRate,
      interestRateHistory,
      tenureMonths: parseInt(loanForm.emiTenureMonths) || 0, paidMonths: 0,
      startDate: loanForm.emiStartDate,
      preEmiTenureMonths: parseInt(loanForm.preEmiTenureMonths) || 0, preEmiStartDate: loanForm.preEmiStartDate || undefined,
      emiTenureMonths: parseInt(loanForm.emiTenureMonths) || 0, emiStartDate: loanForm.emiStartDate || undefined,
      image: loanForm.image || undefined,
      transactions: [],
    });
    setLoanForm({ name: "", sanctionedAmount: "", totalOutstanding: "", principalPaid: "", interestPaid: "", totalSanctionedAmount: "", preEmiTenureMonths: "", preEmiStartDate: "", emiTenureMonths: "", emiStartDate: "", interestRate: "", image: "" });
    setInterestRateHistory([{ id: crypto.randomUUID(), rate: 0, startDate: today }]);
    setAddingLoan(false);
  };

  const handleSaveLoan = () => {
    if (!editLoanId) return;
    const currentInterestRate = [...interestRateHistory].reverse().find((period) => !period.endDate)?.rate ?? 0;
    updateLoan(editLoanId, {
      name: loanForm.name, totalSanctionedAmount: parseFloat(loanForm.totalSanctionedAmount) || 0, sanctionedAmount: parseFloat(loanForm.sanctionedAmount) || 0,
      totalOutstanding: parseFloat(loanForm.totalOutstanding) || 0, principalPaid: parseFloat(loanForm.principalPaid) || 0,
      interestPaid: parseFloat(loanForm.interestPaid) || 0, interestRate: currentInterestRate,
      interestRateHistory,
      tenureMonths: parseInt(loanForm.emiTenureMonths) || 0, paidMonths: 0,
      startDate: loanForm.emiStartDate,
      preEmiTenureMonths: parseInt(loanForm.preEmiTenureMonths) || 0, preEmiStartDate: loanForm.preEmiStartDate || undefined,
      emiTenureMonths: parseInt(loanForm.emiTenureMonths) || 0, emiStartDate: loanForm.emiStartDate || undefined,
      image: loanForm.image || undefined,
    });
    setEditLoanId(null);
  };

  const openEditLoan = (l: Loan) => {
    setEditLoanId(l.id);
    setLoanForm({
      name: l.name, sanctionedAmount: l.sanctionedAmount.toString(), totalSanctionedAmount: (l.totalSanctionedAmount || l.sanctionedAmount || 0).toString(), totalOutstanding: l.totalOutstanding.toString(),
      principalPaid: l.principalPaid.toString(), interestPaid: l.interestPaid.toString(), interestRate: l.interestRate.toString(),
      preEmiTenureMonths: (l.preEmiTenureMonths || 0).toString(), preEmiStartDate: l.preEmiStartDate || "", emiTenureMonths: (l.emiTenureMonths || l.tenureMonths || 0).toString(), emiStartDate: l.emiStartDate || l.startDate || "", image: l.image || "",
    });
    setInterestRateHistory(l.interestRateHistory?.length ? l.interestRateHistory : [{ id: crypto.randomUUID(), rate: l.interestRate || 0, startDate: l.startDate || today }]);
  };

  const updateInterestRatePeriod = (id: string, updates: Partial<LoanInterestRatePeriod>) => {
    setInterestRateHistory((periods) => periods.map((period) => period.id === id ? { ...period, ...updates } : period));
  };

  const addInterestRatePeriod = () => {
    setInterestRateHistory((periods) => {
      const previous = periods[periods.length - 1];
      const nextStart = previous?.endDate
        ? new Date(new Date(previous.endDate).getTime() + 86400000).toISOString().slice(0, 10)
        : today;
      return [...periods, { id: crypto.randomUUID(), rate: 0, startDate: nextStart }];
    });
  };

  const removeInterestRatePeriod = (id: string) => {
    setInterestRateHistory((periods) => periods.length > 1 ? periods.filter((period) => period.id !== id) : periods);
  };

  const handleLoanImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setLoanForm((current) => ({ ...current, image: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const getTransactionTypeLabel = (kind?: LoanTransactionKind) => {
    switch (kind) {
      case "pre-emi": return "Pre-EMI";
      case "lumpsum": return "Lumpsum";
      case "other": return "Other";
      default: return "EMI";
    }
  };

  const getDefaultTransactionKind = (loan: Loan): LoanTransactionKind => {
    const current = new Date();
    const preStart = loan.preEmiStartDate ? new Date(loan.preEmiStartDate) : null;
    const emiStart = loan.emiStartDate ? new Date(loan.emiStartDate) : null;
    if (preStart && loan.preEmiTenureMonths && current >= preStart) {
      const elapsed = (current.getFullYear() - preStart.getFullYear()) * 12 + current.getMonth() - preStart.getMonth();
      if (elapsed < loan.preEmiTenureMonths && (!emiStart || current < emiStart)) return "pre-emi";
    }
    if (emiStart && current >= emiStart) return "emi";
    return "emi";
  };

  const resetTransactionForm = (loan?: Loan) => {
    setTxForm({ amount: "", date: new Date().toISOString().slice(0, 10), kind: loan ? getDefaultTransactionKind(loan) : "emi", principal: "", interest: "", transactionType: "" });
    setEditingTransactionId(null);
    setTransactionError("");
  };

  const debtFormFields = (
    <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
      <Input value={debtForm.personName} onChange={(e) => setDebtForm({ ...debtForm, personName: e.target.value })} placeholder="Person name" autoFocus />
      <Input type="number" value={debtForm.amount} onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })} placeholder="Amount (₹)" />
      <Input value={debtForm.description} onChange={(e) => setDebtForm({ ...debtForm, description: e.target.value })} placeholder="Description" />
      <div className="grid grid-cols-2 gap-3">
        <Input type="date" value={debtForm.date} onChange={(e) => setDebtForm({ ...debtForm, date: e.target.value })} />
        <select
          value={debtForm.type}
          onChange={(e) => setDebtForm({ ...debtForm, type: e.target.value as "owe" | "owed" })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="owe">I Owe</option>
          <option value="owed">Owed to Me</option>
        </select>
      </div>
    </div>
  );

  const loanFormFields = (
    <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
      <Input value={loanForm.name} onChange={(e) => setLoanForm({ ...loanForm, name: e.target.value })} placeholder="Loan name" autoFocus />
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground font-medium block">Loan Photo</label>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => document.getElementById("loan-img-upload")?.click()}>
            <ImageIcon className="h-4 w-4 mr-2" /> {loanForm.image ? "Change Photo" : "Upload Photo"}
          </Button>
          <input id="loan-img-upload" type="file" className="hidden" accept="image/*" onChange={handleLoanImageUpload} />
          {loanForm.image && <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setLoanForm({ ...loanForm, image: "" })}><X className="h-4 w-4" /></Button>}
        </div>
        {loanForm.image && <div className="h-32 rounded-lg overflow-hidden border"><img src={loanForm.image} alt="Loan preview" className="h-full w-full object-cover" /></div>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Total Sanctioned (₹)</label>
          <Input type="number" value={loanForm.totalSanctionedAmount} onChange={(e) => setLoanForm({ ...loanForm, totalSanctionedAmount: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Disbursed (₹)</label>
          <Input type="number" value={loanForm.sanctionedAmount} onChange={(e) => setLoanForm({ ...loanForm, sanctionedAmount: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Outstanding (₹)</label>
        <Input type="number" value={loanForm.totalOutstanding} onChange={(e) => setLoanForm({ ...loanForm, totalOutstanding: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Principal Paid (₹)</label>
          <Input type="number" value={loanForm.principalPaid} onChange={(e) => setLoanForm({ ...loanForm, principalPaid: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Interest Paid (₹)</label>
          <Input type="number" value={loanForm.interestPaid} onChange={(e) => setLoanForm({ ...loanForm, interestPaid: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground font-medium">Interest Rate History</label>
          <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={addInterestRatePeriod} aria-label="Add interest rate period">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {interestRateHistory.map((period, index) => (
          <div key={period.id} className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5 items-end">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Rate (%)</label>
              <Input className="h-8 px-2 text-xs" type="number" step="0.01" value={period.rate || ""} onChange={(e) => updateInterestRatePeriod(period.id, { rate: parseFloat(e.target.value) || 0 })} placeholder="7.25" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Start date</label>
              <Input className="h-8 px-2 text-xs" type="date" value={period.startDate} onChange={(e) => updateInterestRatePeriod(period.id, { startDate: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">End date</label>
              <Input className="h-8 px-2 text-xs" type="date" value={period.endDate || ""} onChange={(e) => updateInterestRatePeriod(period.id, { endDate: e.target.value || undefined })} />
            </div>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeInterestRatePeriod(period.id)} disabled={interestRateHistory.length === 1} aria-label={`Remove interest rate ${index + 1}`}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground">Leave the end date empty for the current rate. A new period starts the day after the previous end date.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Pre-EMI Tenure (months)</label>
          <Input type="number" value={loanForm.preEmiTenureMonths} onChange={(e) => setLoanForm({ ...loanForm, preEmiTenureMonths: e.target.value })} placeholder="0" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Pre-EMI Start Date</label>
          <Input type="date" value={loanForm.preEmiStartDate} onChange={(e) => setLoanForm({ ...loanForm, preEmiStartDate: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">EMI Tenure (months)</label>
          <Input type="number" value={loanForm.emiTenureMonths} onChange={(e) => setLoanForm({ ...loanForm, emiTenureMonths: e.target.value })} placeholder="0" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">EMI Start Date</label>
          <Input type="date" value={loanForm.emiStartDate} onChange={(e) => setLoanForm({ ...loanForm, emiStartDate: e.target.value })} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Total Paid: <span className="font-medium text-foreground">₹{((parseFloat(loanForm.principalPaid) || 0) + (parseFloat(loanForm.interestPaid) || 0)).toLocaleString('en-IN')}</span>
      </p>
    </div>
  );

  const renderTransactionForm = (loan: Loan) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (txForm.kind === "other" && !txForm.transactionType.trim()) {
          setTransactionError("Enter a transaction type.");
          return;
        }
        const principal = ["emi", "lumpsum", "other"].includes(txForm.kind) ? (parseFloat(txForm.principal) || 0) : 0;
        const interest = ["emi", "pre-emi", "other"].includes(txForm.kind) ? (parseFloat(txForm.interest) || 0) : 0;
        const otherAmount = txForm.kind === "other" ? (parseFloat(txForm.amount) || 0) : 0;
        if (txForm.kind === "other" && principal === 0 && interest === 0 && otherAmount === 0) {
          setTransactionError("Enter at least one amount: Amount, Interest, or Principal.");
                  return;
        }
        setTransactionError("");
        const transaction = {
          description: txForm.transactionType.trim() || getTransactionTypeLabel(txForm.kind),
          transactionType: txForm.kind === "other" ? txForm.transactionType.trim() : undefined,
          amount: principal + interest + otherAmount,
          date: txForm.date,
          kind: txForm.kind,
          principal: ["emi", "lumpsum", "other"].includes(txForm.kind) ? principal : undefined,
          interest: ["emi", "pre-emi", "other"].includes(txForm.kind) ? interest : undefined,
        };
        if (editingTransactionId) updateLoanTransaction(loan.id, editingTransactionId, transaction);
        else addLoanTransaction(loan.id, transaction);
        resetTransactionForm(loan);
        setAddingTransaction(false);
      }}
      className="rounded-xl border border-primary/30 bg-card p-4 space-y-3"
    >
      <label className="text-xs text-muted-foreground block">Payment type</label>
      <select
        value={txForm.kind}
        onChange={(e) => { setTxForm({ ...txForm, kind: e.target.value as LoanTransactionKind }); setTransactionError(""); }}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="emi">EMI</option>
        <option value="pre-emi">Pre-EMI</option>
        <option value="lumpsum">Lumpsum</option>
        <option value="other">Other</option>
      </select>

      <label className="text-xs text-muted-foreground block">Transaction date</label>
      <Input type="date" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} />
      {txForm.kind === "other" && (
        <>
          <label className="text-xs text-muted-foreground block">Transaction type</label>
            <Input value={txForm.transactionType} onChange={(e) => { setTxForm({ ...txForm, transactionType: e.target.value }); setTransactionError(""); }} placeholder="e.g. Processing fee" autoFocus />
          <label className="text-xs text-muted-foreground block">Amount (₹)</label>
            <Input type="number" value={txForm.amount} onChange={(e) => { setTxForm({ ...txForm, amount: e.target.value }); setTransactionError(""); }} />
          <label className="text-xs text-muted-foreground block">Interest paid (₹)</label>
            <Input type="number" value={txForm.interest} onChange={(e) => { setTxForm({ ...txForm, interest: e.target.value }); setTransactionError(""); }} />
          <label className="text-xs text-muted-foreground block">Principal paid (₹)</label>
            <Input type="number" value={txForm.principal} onChange={(e) => { setTxForm({ ...txForm, principal: e.target.value }); setTransactionError(""); }} />
          <p className="text-[10px] text-muted-foreground">Enter at least one amount: Amount, Interest, or Principal.</p>
            {transactionError && <p className="text-xs text-destructive">{transactionError}</p>}
        </>
      )}
      {["emi", "lumpsum"].includes(txForm.kind) && (
        <>
          <label className="text-xs text-muted-foreground block">Principal paid (₹)</label>
          <Input type="number" value={txForm.principal} onChange={(e) => setTxForm({ ...txForm, principal: e.target.value })} />
        </>
      )}
      {["emi", "pre-emi"].includes(txForm.kind) && (
        <>
          <label className="text-xs text-muted-foreground block">Interest paid (₹)</label>
          <Input type="number" value={txForm.interest} onChange={(e) => setTxForm({ ...txForm, interest: e.target.value })} />
        </>
      )}

      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" type="button" onClick={() => setAddingTransaction(false)}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
        <Button size="sm" type="submit">
          <Check className="h-4 w-4 mr-1" /> {editingTransactionId ? "Update" : "Save"}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="loans">
        <TabsList className="w-full">
          <TabsTrigger value="debts" className="flex-1">Personal Debts</TabsTrigger>
          <TabsTrigger value="loans" className="flex-1">Loans</TabsTrigger>
        </TabsList>

        <TabsContent value="debts" className="space-y-4 mt-4">
          {(totalIOwe > 0 || totalOwedToMe > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-destructive/10 p-3 space-y-1">
                <span className="text-xs text-muted-foreground block">I Owe</span>
                <span className="font-heading font-bold text-sm text-destructive">₹{totalIOwe.toLocaleString('en-IN')}</span>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 space-y-1">
                <span className="text-xs text-muted-foreground block">Owed to Me</span>
                <span className="font-heading font-bold text-sm text-primary">₹{totalOwedToMe.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-foreground">Debts</h2>
            <Button size="sm" variant="outline" onClick={() => setAddingDebt(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {addingDebt && (
            <div className="space-y-3">
              {debtFormFields}
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setAddingDebt(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                <Button size="sm" onClick={handleAddDebt}><Check className="h-4 w-4 mr-1" /> Add</Button>
              </div>
            </div>
          )}

          {debts.map((d) => {
            if (editDebtId === d.id) {
              return (
                <div key={d.id} className="space-y-3">
                  {debtFormFields}
                  <div className="flex gap-2 justify-between">
                    <ConfirmDeleteDialog title="Delete this debt?" description="This personal debt record will be permanently removed." onConfirm={() => { deleteDebt(d.id); setEditDebtId(null); }}>
                      <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                    </ConfirmDeleteDialog>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditDebtId(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                      <Button size="sm" onClick={handleSaveDebt}><Check className="h-4 w-4 mr-1" /> Save</Button>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={d.id} className="rounded-lg border bg-card p-4 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openEditDebt(d)}>
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-card-foreground text-sm">{d.personName}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d.type === "owe" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                    {d.type === "owe" ? "I Owe" : "Owed to Me"}
                  </span>
                </div>
                <p className="font-heading font-bold text-foreground mt-1">₹{d.amount.toLocaleString('en-IN')}</p>
                {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">{d.date}</p>
              </div>
            );
          })}

          {debts.length === 0 && !addingDebt && (
            <div className="text-center py-12 text-muted-foreground">
              <HandCoins className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No debts recorded yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="loans" className="space-y-4 mt-4">
          {selectedLoanId ? (
            (() => {
              const loanForTx = loans.find(l => l.id === selectedLoanId);
              if (!loanForTx) return null;
              const totalPaid = loanForTx.principalPaid + loanForTx.interestPaid;
              const summary = summarizeLoanMetrics(loanForTx);

              return (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  <button 
                    onClick={() => { setSelectedLoanId(null); setAddingTransaction(false); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to Loans
                  </button>

                  <div className="rounded-xl border bg-card overflow-hidden space-y-3">
                    <div className="p-4 space-y-3">
                    <h3 className="font-heading font-bold text-card-foreground text-sm">{loanForTx.name}</h3>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Total Sanctioned</span>
                        <span className="font-heading font-medium">₹{(loanForTx.totalSanctionedAmount || loanForTx.sanctionedAmount).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Disbursed</span>
                        <span className="font-heading font-medium">₹{loanForTx.sanctionedAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Outstanding</span>
                        <span className="font-heading font-medium text-destructive">₹{summary.totalOutstanding.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Total Paid</span>
                        <span className="font-heading font-medium text-primary">₹{summary.totalPaid.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
                      <span className="text-muted-foreground">Principal paid <b className="text-foreground">₹{summary.principalPaid.toLocaleString('en-IN')}</b></span>
                      <span className="text-muted-foreground">Interest paid <b className="text-foreground">₹{summary.interestPaid.toLocaleString('en-IN')}</b></span>
                      <span className="text-muted-foreground">Tenure reduced <b className="text-foreground">{summary.tenureReduced} mo</b></span>
                      <span className="text-muted-foreground">Interest saved <b className="text-foreground">₹{summary.interestSaved.toLocaleString('en-IN')}</b></span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground"><span>Amount payment progress</span><span>{Math.round(summary.amountProgress)}%</span></div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${summary.amountProgress}%` }} /></div>
                    </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <h2 className="font-heading font-semibold text-foreground">Transactions</h2>
                    <Button size="sm" variant="outline" onClick={() => { resetTransactionForm(loanForTx); setAddingTransaction(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> Record Transaction
                    </Button>
                  </div>

                  {addingTransaction && renderTransactionForm(loanForTx)}

                  {(() => {
                    const transactions = (loanForTx.transactions || [])
                      .filter((transaction) => transactionMonthFilter === "all" || transaction.date.slice(5, 7) === transactionMonthFilter)
                      .filter((transaction) => transactionYearFilter === "all" || transaction.date.slice(0, 4) === transactionYearFilter)
                      .filter((transaction) => transactionKindFilter === "all" || transaction.kind === transactionKindFilter)
                      .sort((a, b) => transactionSort === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
                    const years = Array.from(new Set((loanForTx.transactions || []).map((transaction) => transaction.date.slice(0, 4)))).sort().reverse();

                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-3">
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-1">Month</label>
                            <select value={transactionMonthFilter} onChange={(e) => setTransactionMonthFilter(e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                              <option value="all">All months</option>
                              {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={(index + 1).toString().padStart(2, "0")}>{new Date(2000, index, 1).toLocaleString("en", { month: "long" })}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-1">Year</label>
                            <select value={transactionYearFilter} onChange={(e) => setTransactionYearFilter(e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                              <option value="all">All years</option>
                              {years.map((year) => <option key={year} value={year}>{year}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-1">Payment type</label>
                            <select value={transactionKindFilter} onChange={(e) => setTransactionKindFilter(e.target.value as LoanTransactionKind | "all")} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                              <option value="all">All types</option>
                              <option value="emi">EMI</option>
                              <option value="pre-emi">Pre-EMI</option>
                              <option value="lumpsum">Lumpsum</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-1">Sort</label>
                            <select value={transactionSort} onChange={(e) => setTransactionSort(e.target.value as "newest" | "oldest")} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                              <option value="newest">Newest first</option>
                              <option value="oldest">Oldest first</option>
                            </select>
                          </div>
                        </div>

                  <div className="space-y-3">
                    {transactions.map((t) => (
                      <div key={t.id} className="rounded-lg border bg-card p-3 flex justify-between items-center">
                        <div className="space-y-0.5">
                          <h4 className="font-heading font-semibold text-xs text-card-foreground">{t.transactionType || getTransactionTypeLabel(t.kind)}</h4>
                          <p className="text-[10px] text-muted-foreground">{t.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-heading font-bold text-xs text-foreground">₹{t.amount.toLocaleString('en-IN')}</span>
                            <p className="text-[9px] text-muted-foreground">
                              <span className="text-emerald-600">P: ₹{(t.principal || 0).toLocaleString('en-IN')}</span>{" · "}
                              <span className="text-red-600">I: ₹{(t.interest || 0).toLocaleString('en-IN')}</span>{t.kind === "other" ? <>{" · "}<span className="text-red-600">Other: ₹{Math.max(0, t.amount - (t.principal || 0) - (t.interest || 0)).toLocaleString('en-IN')}</span></> : null}
                            </p>
                          </div>
                          <Button 
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditingTransactionId(t.id);
                              setTxForm({
                                amount: t.amount ? t.amount.toString() : "",
                                date: t.date,
                                kind: t.kind || "emi",
                                principal: t.principal?.toString() || "",
                                interest: t.interest?.toString() || "",
                                transactionType: t.transactionType || (t.kind === "other" ? t.description : ""),
                              });
                              setAddingTransaction(true);
                            }}
                            aria-label="Edit transaction"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <ConfirmDeleteDialog title="Delete this transaction?" description="This payment will be removed and the loan totals recalculated." onConfirm={() => deleteLoanTransaction(loanForTx.id, t.id)}>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" aria-label="Delete transaction">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </ConfirmDeleteDialog>
                        </div>
                      </div>
                    ))}

                    {transactions.length === 0 && !addingTransaction && (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="text-xs">No transactions match the selected filters.</p>
                      </div>
                    )}
                  </div>
                      </>
                    );
                  })()}
                </div>
              );
            })()
          ) : (
            <>
              {totalOutstanding > 0 && (
                <div className="rounded-xl bg-destructive/10 p-3 space-y-1">
                  <span className="text-xs text-muted-foreground block">Total Outstanding</span>
                  <span className="font-heading font-bold text-sm text-destructive">₹{totalOutstanding.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="font-heading font-semibold text-foreground">Loans</h2>
                <Button size="sm" variant="outline" onClick={() => setAddingLoan(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              {addingLoan && (
                <div className="space-y-3">
                  {loanFormFields}
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setAddingLoan(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                    <Button size="sm" onClick={handleAddLoan}><Check className="h-4 w-4 mr-1" /> Add</Button>
                  </div>
                </div>
              )}

              {loans.map((l) => {
                const summary = summarizeLoanMetrics(l);
                const totalPaid = summary.principalPaid + summary.interestPaid;

                if (editLoanId === l.id) {
                  return (
                    <div key={l.id} className="space-y-3">
                      {loanFormFields}
                      <div className="flex gap-2 justify-between">
                        <ConfirmDeleteDialog title="Delete this loan?" description="The loan and its transaction history will be permanently removed." onConfirm={() => { deleteLoan(l.id); setEditLoanId(null); }}>
                          <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                        </ConfirmDeleteDialog>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditLoanId(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                          <Button size="sm" onClick={handleSaveLoan}><Check className="h-4 w-4 mr-1" /> Save</Button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={l.id} className="rounded-lg border bg-card overflow-hidden cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openEditLoan(l)}>
                    {l.image && <img src={l.image} alt={l.name} className="h-32 w-full object-cover" />}
                    <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading font-semibold text-card-foreground text-xs">{l.name}</h3>
                      <span className="text-xs text-muted-foreground">{getCurrentLoanInterestRate(l).toFixed(2)}% p.a.</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Total Sanctioned</span>
                        <span className="font-heading font-medium">₹{(l.totalSanctionedAmount || l.sanctionedAmount).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Disbursed</span>
                        <span className="font-heading font-medium">₹{l.sanctionedAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Outstanding</span>
                        <span className="font-heading font-medium text-destructive">₹{summary.totalOutstanding.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-xs">
                      <div><span className="text-muted-foreground block">Principal Paid</span><span className="font-medium text-emerald-600">₹{summary.principalPaid.toLocaleString('en-IN')}</span></div>
                      <div><span className="text-muted-foreground block">Interest Paid</span><span className="font-medium text-red-600">₹{summary.interestPaid.toLocaleString('en-IN')}</span></div>
                      <div><span className="text-muted-foreground block">Other</span><span className="font-medium text-red-600">₹{summary.otherPaid.toLocaleString('en-IN')}</span></div>
                      <div><span className="text-muted-foreground block">Total Paid</span><span className="font-medium text-red-600">₹{summary.totalPaid.toLocaleString('en-IN')}</span></div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground"><span>Amount payment progress</span><span>{Math.round(summary.amountProgress)}%</span></div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${summary.amountProgress}%` }} /></div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Total tenure progress</span>
                        <span>{summary.elapsedMonths}/{summary.totalTenureMonths} months</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                        <div className="h-full bg-red-300 dark:bg-red-900 transition-all" style={{ width: `${summary.preEmiWidth}%` }} />
                        <div className="h-full bg-orange-500 transition-all" style={{ width: `${summary.emiWidth}%` }} />
                      </div>
                    </div>
                    <div className="pt-2 border-t flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-muted-foreground hover:text-foreground font-semibold px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedLoanDetailsId((current) => current === l.id ? null : l.id);
                        }}
                      >
                        {expandedLoanDetailsId === l.id ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                        View details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/5 font-semibold px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLoanId(l.id);
                        }}
                      >
                        View Transactions
                      </Button>
                    </div>
                    {expandedLoanDetailsId === l.id && (
                      <div className="border-t pt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <section className="rounded-lg border bg-muted/20 p-3 space-y-3">
                          <button className="w-full flex items-center justify-between text-xs font-semibold text-foreground" onClick={() => setExpandedRateHistoryId((current) => current === l.id ? null : l.id)}>
                            <span>{expandedRateHistoryId === l.id ? "Hide interest rate changes" : "Show interest rate changes"}</span>
                            {expandedRateHistoryId === l.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                          {expandedRateHistoryId === l.id && <div className="space-y-2">
                            {(l.interestRateHistory?.length ? l.interestRateHistory : [{ id: "legacy", rate: l.interestRate, startDate: l.startDate }]).map((period) => (
                              <div key={period.id} className="flex items-center justify-between rounded-md bg-card px-2.5 py-2 text-xs">
                                <span className="font-semibold">{period.rate.toFixed(2)}% p.a.</span>
                                <span className="text-muted-foreground">{period.startDate || "No start date"} {period.endDate ? `to ${period.endDate}` : "to present"} {formatRateDuration(period.startDate, period.endDate) && <span className="font-medium">({formatRateDuration(period.startDate, period.endDate)})</span>}</span>
                              </div>
                            ))}
                          </div>}
                        </section>
                        <section className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                          <h4 className="text-xs font-semibold text-foreground">Interest calculation</h4>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <span className="text-muted-foreground">Current rate <b className="text-foreground">{getCurrentLoanInterestRate(l).toFixed(2)}%</b></span>
                            <span className="text-muted-foreground">Total tenure <b className="text-foreground">{summary.totalTenureMonths} mo</b></span>
                            <span className="text-muted-foreground">Opening interest <b className="text-foreground">₹{summary.openingInterest.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></span>
                            <span className="text-muted-foreground">Opening principal <b className="text-foreground">₹{summary.openingPrincipal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></span>
                            <span className="text-muted-foreground">Approx. total interest <b className="text-foreground">₹{summary.estimatedTotalInterest.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></span>
                            <span className="text-muted-foreground">Scheduled EMI <b className="text-foreground">₹{summary.scheduledPayment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></span>
                            <span className="text-muted-foreground">Lumpsum interest saved <b className="text-emerald-600">₹{summary.interestSavedByLumpsum.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></span>
                            <span className="text-muted-foreground">Tenure reduced <b className="text-emerald-600">{summary.tenureReducedByLumpsum} mo</b></span>
                          </div>
                        </section>
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}

              {loans.length === 0 && !addingLoan && (
                <div className="text-center py-12 text-muted-foreground">
                  <Landmark className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No loans recorded yet.</p>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
