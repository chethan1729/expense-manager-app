import { useState } from "react";
import { useProperties, Property } from "@/hooks/useProperties";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, X, TrendingUp, TrendingDown, Building2, MapPin, FolderOpen, Image as ImageIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export function PropertiesPage(props: ReturnType<typeof useProperties>) {
  const { properties, addProperty, updateProperty, deleteProperty, totalPropertyValue, totalPurchaseValue } = props;
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", totalSqft: "", purchaseRatePerSqft: "", currentRatePerSqft: "",
    image: "", locationUrl: "", driveUrl: "",
  });

  const appreciation = totalPurchaseValue > 0 ? ((totalPropertyValue - totalPurchaseValue) / totalPurchaseValue) * 100 : 0;

  const resetForm = () => setForm({
    name: "", description: "", totalSqft: "", purchaseRatePerSqft: "", currentRatePerSqft: "",
    image: "", locationUrl: "", driveUrl: "",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addProperty({
      name: form.name.trim(),
      description: form.description,
      totalSqft: parseFloat(form.totalSqft) || 0,
      purchaseRatePerSqft: parseFloat(form.purchaseRatePerSqft) || 0,
      currentRatePerSqft: parseFloat(form.currentRatePerSqft) || 0,
      image: form.image || undefined,
      locationUrl: form.locationUrl.trim() || undefined,
      driveUrl: form.driveUrl.trim() || undefined,
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
      image: p.image || "",
      locationUrl: p.locationUrl || "",
      driveUrl: p.driveUrl || "",
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
      image: form.image || undefined,
      locationUrl: form.locationUrl.trim() || undefined,
      driveUrl: form.driveUrl.trim() || undefined,
    });
    setEditingId(null);
    resetForm();
  };

  const renderForm = (onSave: () => void, onCancel: () => void, showDelete?: string) => (
    <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Property name" autoFocus />
      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} />

      {/* Image Upload */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground font-medium block">Property Photo</label>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => document.getElementById('property-img-upload')?.click()}>
            <ImageIcon className="h-4 w-4 mr-2" /> {form.image ? "Change Photo" : "Upload Photo"}
          </Button>
          <input type="file" id="property-img-upload" className="hidden" accept="image/*" onChange={handleImageUpload} />
          {form.image && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setForm({ ...form, image: "" })}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {form.image && (
          <div className="h-32 rounded-lg overflow-hidden border">
            <img src={form.image} alt="Preview" className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      {/* Location & Drive */}
      <div className="space-y-2">
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1 block">
            <MapPin className="h-3 w-3 inline mr-1" />Google Maps Link
          </label>
          <Input value={form.locationUrl} onChange={(e) => setForm({ ...form, locationUrl: e.target.value })} placeholder="https://maps.google.com/..." />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1 block">
            <FolderOpen className="h-3 w-3 inline mr-1" />Drive Link (Documents)
          </label>
          <Input value={form.driveUrl} onChange={(e) => setForm({ ...form, driveUrl: e.target.value })} placeholder="https://drive.google.com/..." />
        </div>
      </div>

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
          <div key={p.id} className="rounded-xl border bg-card overflow-hidden cursor-pointer hover:border-primary/40 transition-all hover:shadow-md" onClick={() => openEdit(p)}>
            {/* Image section with overlaid property name */}
            {p.image ? (
              <div className="relative h-36 w-full">
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-heading font-bold text-white text-sm drop-shadow-lg">{p.name}</h3>
                  {p.description && <p className="text-[11px] text-white/80 mt-0.5 line-clamp-1">{p.description}</p>}
                </div>
              </div>
            ) : (
              <div className="px-4 pt-4">
                <h3 className="font-heading font-semibold text-card-foreground text-sm">{p.name}</h3>
                {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
              </div>
            )}

            {/* Details section */}
            <div className="p-4 space-y-2">
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

              {/* Location & Drive links */}
              {(p.locationUrl || p.driveUrl) && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  {p.locationUrl && (
                    <button
                      onClick={(e) => { e.stopPropagation(); window.open(p.locationUrl, '_blank'); }}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <MapPin className="h-3 w-3" /> Location
                    </button>
                  )}
                  {p.driveUrl && (
                    <button
                      onClick={(e) => { e.stopPropagation(); window.open(p.driveUrl, '_blank'); }}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                    >
                      <FolderOpen className="h-3 w-3" /> Documents
                    </button>
                  )}
                </div>
              )}
            </div>
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
