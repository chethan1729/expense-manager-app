import { useState } from "react";
import { usePreciousMetals, MetalType, PreciousMetalItem } from "@/hooks/usePreciousMetals";
import { AddMetalDialog } from "./AddMetalDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  RefreshCcw, 
  Coins,
  Scale
} from "lucide-react";

export function PreciousMetalsPage(props: ReturnType<typeof usePreciousMetals>) {
  const { 
    items, 
    rates,
    loading, 
    fetchRates, 
    addItem, 
    updateItem,
    deleteItem, 
    calculateCurrentValue, 
    getSummary,
    getRateForType
  } = props;

  const [editingItem, setEditingItem] = useState<PreciousMetalItem | null>(null);

  const summary = getSummary();

  const renderSummaryCard = (label: string, value: number, gain: number, color: string) => (
    <Card className="p-4 space-y-2 border-none shadow-sm bg-card/50 backdrop-blur-sm">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold font-heading">₹{value.toLocaleString('en-IN')}</p>
      <div className={`flex items-center gap-1 text-xs font-bold ${gain >= 0 ? "text-success" : "text-destructive"}`}>
        {gain >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(gain).toFixed(2)}%
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading">Precious Metals</h2>
          <p className="text-xs text-muted-foreground">Track your gold, silver & platinum</p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={fetchRates} 
          disabled={loading}
          className="rounded-full h-9 w-9"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {renderSummaryCard("Gold", summary.gold.total, summary.gold.gain, "text-yellow-500")}
        {renderSummaryCard("Silver", summary.silver.total, summary.silver.gain, "text-slate-400")}
        {renderSummaryCard("Platinum", summary.platinum.total, summary.platinum.gain, "text-indigo-400")}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Your Collection ({items.length})
          </h3>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed">
            <Coins className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">No ornaments added yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const currentVal = calculateCurrentValue(item);
              const gain = ((currentVal - item.purchasedValue) / item.purchasedValue) * 100;
              const rate = getRateForType(item.type);

              return (
                <Card 
                  key={item.id} 
                  className="p-4 flex items-center justify-between group overflow-hidden relative border-none shadow-sm bg-card/80 cursor-pointer hover:bg-card/100 transition-colors"
                  onClick={() => setEditingItem(item)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                      item.type.includes("Gold") ? "bg-yellow-100 text-yellow-600" : 
                      item.type === "Silver" ? "bg-slate-100 text-slate-600" : "bg-indigo-100 text-indigo-600"
                    }`}>
                      <Scale className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{item.name || item.type}</h4>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{item.weight}g</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium">
                        <span>Buy: ₹{Math.ceil(item.purchasedValue / item.weight).toLocaleString('en-IN')}/g</span>
                        <span className="opacity-20">|</span>
                        <span>Now: ₹{rate.toLocaleString('en-IN')}/g</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-sm">₹{Math.ceil(currentVal).toLocaleString('en-IN')}</p>
                    <p className={`text-[10px] font-bold ${gain >= 0 ? "text-success" : "text-destructive"}`}>
                      {gain >= 0 ? "+" : ""}{gain.toFixed(1)}%
                    </p>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(item.id);
                    }}
                    className="absolute -right-10 group-hover:right-0 top-0 bottom-0 bg-destructive text-destructive-foreground px-3 transition-all flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Add Button & Edit Dialog */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50">
        <AddMetalDialog 
          rates={rates}
          onAdd={(name, type, weight, purchasedValue) => addItem({ name, type, weight, purchasedValue, date: new Date().toISOString() })} 
          onUpdate={updateItem}
          initialItem={editingItem}
          onClose={() => setEditingItem(null)}
        />
      </div>
    </div>
  );
}
