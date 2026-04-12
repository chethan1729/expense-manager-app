import { useState } from "react";
import { useProperties, Property } from "@/hooks/useProperties";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, X, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export function PropertiesPage(props: ReturnType<typeof useProperties>) {
  const { properties, addProperty, updateProperty, deleteProperty, totalPropertyValue, totalPurchaseValue } = props;
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", totalSqft: "", purchaseRatePerSqft: "", currentRatePerSqft: "" });

  const appreciation = totalPurchaseValue > 0 ? ((totalPropertyValue - totalPurchaseValue) / totalPurchaseValue) * 100 : 0;

  const resetForm = () => setForm({ name: "", description: "", totalSqft: "", purchaseRatePerSqft: "", currentRatePerSqft: "" });

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addProperty({
      name: form.name.trim(),
      description: form.description,
      totalSqft: parseFloat(form.totalSqft) || 0,
      purchaseRatePerSqft: parseFloat(form.purchaseRatePerSqft) || 0,
      currentRatePerSqft: parseFloat(form.currentRatePerSqft) || 0,
    });
    resetForm();
    setAdding(false);
  };

  const openEdit = (p: Property) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      totalSqft: p.totalSqft.toString(),
      purchaseRatePerSqft: p.purchaseRatePerSqft.toString(),
      currentRatePerSqft: p.currentRatePerSqft.toString(),
    });
  };

  const handleSave = () => {
    if (!editingId) return;
    updateProperty(editingId, {
      name: form.name.trim(),
      description: form.description,
      totalSqft: parseFloat(form.totalSqft) || 0,
      purchaseRatePerSqft: parseFloat(form.purchaseRatePerSqft) || 0,
      currentRatePerSqft: parseFloat(form.currentRatePerSqft) || 0,
    });
    setEditingId(null);
    resetForm();
  };

  const renderForm = (onSave: () => void, onCancel: () => void, showDelete?: string) => (
    <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Property name" autoFocus />
      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} />
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Total Sqft</label>
          <Input type="number" value={form.totalSqft} onChange={(e) => setForm({ ...form, totalSqft: e.target.value })} placeholder="0" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Buy Rate/Sqft (₹)</label>
          <Input type="number" value={form.purchaseRatePerSqft} onChange={(e) => setForm({ ...form, purchaseRatePerSqft: e.target.value })} placeholder="0" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Current Rate/Sqft (₹)</label>
          <Input type="number" value={form.currentRatePerSqft} onChange={(e) => setForm({ ...form, currentRatePerSqft: e.target.value })} placeholder="0" />
        </div>
      </div>
      {(parseFloat(form.totalSqft) || 0) > 0 && (parseFloat(form.purchaseRatePerSqft) || 0) > 0 && (
        <p className="text-xs text-muted-foreground">
          Purchase value: <span className="font-medium text-foreground">₹{((parseFloat(form.totalSqft) || 0) * (parseFloat(form.purchaseRatePerSqft) || 0)).toLocaleString('en-IN')}</span>
          {" → "}Current value: <span className="font-medium text-foreground">₹{((parseFloat(form.totalSqft) || 0) * (parseFloat(form.currentRatePerSqft) || 0)).toLocaleString('en-IN')}</span>
        </p>
      )}
      <div className="flex gap-2 justify-between">
        {showDelete ? (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { deleteProperty(showDelete); setEditingId(null); resetForm(); }}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        ) : <div />}
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          <Button size="sm" onClick={onSave}><Check className="h-4 w-4 mr-1" /> Save</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {properties.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-primary/10 p-3 space-y-1">
            <span className="text-xs text-muted-foreground block">Purchase Value</span>
            <span className="font-heading font-bold text-sm text-primary">₹{totalPurchaseValue.toLocaleString('en-IN')}</span>
          </div>
          <div className="rounded-xl bg-accent/10 p-3 space-y-1">
            <span className="text-xs text-muted-foreground block">Current Value</span>
            <span className="font-heading font-bold text-sm text-accent">₹{totalPropertyValue.toLocaleString('en-IN')}</span>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <span className="text-xs text-muted-foreground block">Change</span>
            <span className={`font-heading font-bold text-sm flex items-center gap-1 ${appreciation >= 0 ? "text-primary" : "text-destructive"}`}>
              {appreciation >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {appreciation.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-foreground">My Properties</h2>
        <Button size="sm" variant="outline" onClick={() => { resetForm(); setAdding(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {adding && renderForm(handleAdd, () => { setAdding(false); resetForm(); })}

      {properties.map((p) => {
        const purchaseVal = p.totalSqft * p.purchaseRatePerSqft;
        const currentVal = p.totalSqft * p.currentRatePerSqft;
        const pctChange = purchaseVal > 0 ? ((currentVal - purchaseVal) / purchaseVal) * 100 : 0;

        if (editingId === p.id) {
          return <div key={p.id}>{renderForm(handleSave, () => { setEditingId(null); resetForm(); }, p.id)}</div>;
        }

        return (
          <div key={p.id} className="rounded-lg border bg-card p-4 space-y-2 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openEdit(p)}>
            <h3 className="font-heading font-semibold text-card-foreground text-sm">{p.name}</h3>
            {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block">Purchase</span>
                <span className="font-heading font-medium">₹{purchaseVal.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Current</span>
                <span className="font-heading font-medium">₹{currentVal.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Change</span>
                <span className={`font-heading font-medium flex items-center gap-1 ${pctChange >= 0 ? "text-primary" : "text-destructive"}`}>
                  {pctChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {pctChange.toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{p.totalSqft} sqft · ₹{p.purchaseRatePerSqft.toLocaleString('en-IN')}/sqft → ₹{p.currentRatePerSqft.toLocaleString('en-IN')}/sqft</p>
          </div>
        );
      })}

      {properties.length === 0 && !adding && (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No properties added yet.</p>
        </div>
      )}
    </div>
  );
}
