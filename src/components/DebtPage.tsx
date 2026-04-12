import { useState } from "react";
import { useDebts, PersonalDebt, Loan } from "@/hooks/useDebts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Check, X, HandCoins, Landmark } from "lucide-react";

export function DebtPage(props: ReturnType<typeof useDebts>) {
  const { debts, loans, addDebt, updateDebt, deleteDebt, addLoan, updateLoan, deleteLoan, totalOutstanding } = props;

  const [addingDebt, setAddingDebt] = useState(false);
  const [editDebtId, setEditDebtId] = useState<string | null>(null);
  const [debtForm, setDebtForm] = useState({ personName: "", amount: "", description: "", date: new Date().toISOString().slice(0, 10), type: "owe" as "owe" | "owed" });

  const [addingLoan, setAddingLoan] = useState(false);
  const [editLoanId, setEditLoanId] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState({
    name: "", sanctionedAmount: "", totalOutstanding: "", principalPaid: "", interestPaid: "",
    interestRate: "", tenureMonths: "", paidMonths: "", startDate: new Date().toISOString().slice(0, 10),
  });

  const totalIOwe = debts.filter((d) => d.type === "owe").reduce((s, d) => s + d.amount, 0);
  const totalOwedToMe = debts.filter((d) => d.type === "owed").reduce((s, d) => s + d.amount, 0);

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
    addLoan({
      name: loanForm.name, sanctionedAmount: parseFloat(loanForm.sanctionedAmount) || 0,
      totalOutstanding: parseFloat(loanForm.totalOutstanding) || 0, principalPaid: parseFloat(loanForm.principalPaid) || 0,
      interestPaid: parseFloat(loanForm.interestPaid) || 0, interestRate: parseFloat(loanForm.interestRate) || 0,
      tenureMonths: parseInt(loanForm.tenureMonths) || 0, paidMonths: parseInt(loanForm.paidMonths) || 0,
      startDate: loanForm.startDate,
    });
    setLoanForm({ name: "", sanctionedAmount: "", totalOutstanding: "", principalPaid: "", interestPaid: "", interestRate: "", tenureMonths: "", paidMonths: "", startDate: new Date().toISOString().slice(0, 10) });
    setAddingLoan(false);
  };

  const handleSaveLoan = () => {
    if (!editLoanId) return;
    updateLoan(editLoanId, {
      name: loanForm.name, sanctionedAmount: parseFloat(loanForm.sanctionedAmount) || 0,
      totalOutstanding: parseFloat(loanForm.totalOutstanding) || 0, principalPaid: parseFloat(loanForm.principalPaid) || 0,
      interestPaid: parseFloat(loanForm.interestPaid) || 0, interestRate: parseFloat(loanForm.interestRate) || 0,
      tenureMonths: parseInt(loanForm.tenureMonths) || 0, paidMonths: parseInt(loanForm.paidMonths) || 0,
      startDate: loanForm.startDate,
    });
    setEditLoanId(null);
  };

  const openEditLoan = (l: Loan) => {
    setEditLoanId(l.id);
    setLoanForm({
      name: l.name, sanctionedAmount: l.sanctionedAmount.toString(), totalOutstanding: l.totalOutstanding.toString(),
      principalPaid: l.principalPaid.toString(), interestPaid: l.interestPaid.toString(), interestRate: l.interestRate.toString(),
      tenureMonths: l.tenureMonths.toString(), paidMonths: l.paidMonths.toString(), startDate: l.startDate,
    });
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Sanctioned (₹)</label>
          <Input type="number" value={loanForm.sanctionedAmount} onChange={(e) => setLoanForm({ ...loanForm, sanctionedAmount: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Outstanding (₹)</label>
          <Input type="number" value={loanForm.totalOutstanding} onChange={(e) => setLoanForm({ ...loanForm, totalOutstanding: e.target.value })} />
        </div>
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
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Rate (%)</label>
          <Input type="number" value={loanForm.interestRate} onChange={(e) => setLoanForm({ ...loanForm, interestRate: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tenure (mo)</label>
          <Input type="number" value={loanForm.tenureMonths} onChange={(e) => setLoanForm({ ...loanForm, tenureMonths: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Paid (mo)</label>
          <Input type="number" value={loanForm.paidMonths} onChange={(e) => setLoanForm({ ...loanForm, paidMonths: e.target.value })} />
        </div>
      </div>
      <Input type="date" value={loanForm.startDate} onChange={(e) => setLoanForm({ ...loanForm, startDate: e.target.value })} />
      <p className="text-xs text-muted-foreground">
        Total Paid: <span className="font-medium text-foreground">₹{((parseFloat(loanForm.principalPaid) || 0) + (parseFloat(loanForm.interestPaid) || 0)).toLocaleString('en-IN')}</span>
      </p>
    </div>
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
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { deleteDebt(d.id); setEditDebtId(null); }}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
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
            const totalPaid = l.principalPaid + l.interestPaid;
            const progress = l.tenureMonths > 0 ? (l.paidMonths / l.tenureMonths) * 100 : 0;

            if (editLoanId === l.id) {
              return (
                <div key={l.id} className="space-y-3">
                  {loanFormFields}
                  <div className="flex gap-2 justify-between">
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { deleteLoan(l.id); setEditLoanId(null); }}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditLoanId(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                      <Button size="sm" onClick={handleSaveLoan}><Check className="h-4 w-4 mr-1" /> Save</Button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={l.id} className="rounded-lg border bg-card p-4 space-y-3 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openEditLoan(l)}>
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-card-foreground text-sm">{l.name}</h3>
                  <span className="text-xs text-muted-foreground">{l.interestRate}% p.a.</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Sanctioned</span>
                    <span className="font-heading font-medium">₹{l.sanctionedAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Outstanding</span>
                    <span className="font-heading font-medium text-destructive">₹{l.totalOutstanding.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Total Paid</span>
                    <span className="font-heading font-medium text-primary">₹{totalPaid.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tenure: {l.paidMonths}/{l.tenureMonths} months</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
