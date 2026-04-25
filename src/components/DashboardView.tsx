import { useState } from "react";
import { Wallet, TrendingDown, TrendingUp, Pencil, Check, X, GripVertical, TrendingUpIcon, ChevronRight, Coins } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { FundSection } from "@/hooks/useExpenses";
import { BALANCE_TRACKING_FUNDS, SIMPLE_FUNDS } from "@/hooks/useExpenses";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LiveIndexView } from "./LiveIndexView";

interface SortableItemProps {
  section: FundSection & { totals: any };
  onSelect: (id: string) => void;
}

function SortableFundItem({ section, onSelect }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  const isBalance = BALANCE_TRACKING_FUNDS.includes(section.id);
  const isSimple = SIMPLE_FUNDS.includes(section.id);
  const totals = section.totals;
  const currentBalance: number = isBalance ? (totals.currentBalance ?? 0) : 0;
  const progress = totals.estimated > 0 ? (totals.spent / totals.estimated) * 100 : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative mb-3 rounded-xl border bg-card transition-all ${isDragging ? "opacity-50 ring-2 ring-primary border-primary shadow-lg" : "hover:border-primary/40"}`}
    >
      <div className="flex">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center px-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Content Area */}
        <button
          onClick={() => onSelect(section.id)}
          className="flex-1 p-4 pl-0 text-left space-y-2"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-card-foreground text-sm">{section.name}</h3>
            <span className="text-xs text-muted-foreground">
              {section.id === "investment-fund" ? `${(section.investmentItems || []).length} profiles` : `${section.expenses.length} items`}
            </span>
          </div>

          {isSimple ? (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block">Allocated</span>
                <span className="font-heading font-medium">₹{totals.estimated.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Spent</span>
                <span className="font-heading font-medium">₹{totals.spent.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Remaining</span>
                <span className={`font-heading font-medium ${totals.remaining < 0 ? "text-destructive" : "text-primary"}`}>
                  ₹{totals.remaining.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ) : isBalance ? (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block">This Month</span>
                <span className="font-heading font-medium">₹{totals.estimated.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Used</span>
                <span className="font-heading font-medium text-accent">₹{totals.spent.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Balance</span>
                <span className={`font-heading font-medium ${currentBalance < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                  ₹{currentBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ) : section.id === "investment-fund" ? (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block">Allocated</span>
                <span className="font-heading font-medium">₹{totals.estimated.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Invested</span>
                <span className="font-heading font-medium text-accent">₹{Math.ceil(totals.spent).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Current Value</span>
                <span className="font-heading font-medium text-emerald-600 dark:text-emerald-400">₹{Math.ceil(totals.currentValue || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block">Allocated</span>
                <span className="font-heading font-medium">₹{totals.estimated.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Spent</span>
                <span className="font-heading font-medium">₹{totals.spent.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Remaining</span>
                <span className={`font-heading font-medium ${totals.remaining < 0 ? "text-destructive" : "text-primary"}`}>
                  ₹{totals.remaining.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {totals.estimated > 0 && section.id !== "investment-fund" && (
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progress > 100 ? "bg-destructive" : progress > 80 ? "bg-accent" : "bg-primary"}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

interface DashboardViewProps {
  dashboardData: {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    unallocatedBudget: number;
    sections: (FundSection & { totals: any })[];
  };
  onSelectSection: (id: string) => void;
  onUpdateBudget: (budget: number) => void;
  onReorderSections: (sections: FundSection[]) => void;
}

export function DashboardView({ dashboardData, onSelectSection, onUpdateBudget, onReorderSections }: DashboardViewProps) {
  const { totalBudget, totalSpent, totalRemaining, unallocatedBudget } = dashboardData;
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState(totalBudget.toString());

  const handleSaveBudget = () => {
    onUpdateBudget(parseFloat(budgetValue) || 0);
    setEditingBudget(false);
  };

  const summaryCards = [
    { label: "Total Budget", value: totalBudget, icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Spent", value: totalSpent, icon: TrendingDown, color: "text-accent", bg: "bg-accent/10" },
    {
      label: "Remaining",
      value: totalRemaining,
      icon: TrendingUp,
      color: totalRemaining < 0 ? "text-destructive" : "text-primary",
      bg: totalRemaining < 0 ? "bg-destructive/10" : "bg-primary/10",
    },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = dashboardData.sections.findIndex((s) => s.id === active.id);
      const newIndex = dashboardData.sections.findIndex((s) => s.id === over?.id);

      const reorderedSections = arrayMove(dashboardData.sections, oldIndex, newIndex);
      onReorderSections(reorderedSections);
    }
  };

  return (
    <div className="space-y-6">
      {editingBudget ? (
        <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
          <label className="text-sm font-medium text-foreground">Total Monthly Budget (₹)</label>
          <Input type="number" value={budgetValue} onChange={(e) => setBudgetValue(e.target.value)} autoFocus />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditingBudget(false)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSaveBudget}>
              <Check className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {summaryCards.map((card, i) => (
            <div
              key={card.label}
              className={`rounded-xl ${card.bg} p-3 space-y-1 ${i === 0 ? "cursor-pointer hover:ring-2 ring-primary/30" : ""}`}
              onClick={i === 0 ? () => { setBudgetValue(totalBudget.toString()); setEditingBudget(true); } : undefined}
            >
              <div className="flex items-center gap-1">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                {i === 0 && <Pencil className="h-3 w-3 text-muted-foreground" />}
              </div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`font-heading font-bold text-sm ${card.color}`}>
                ₹{card.value.toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-foreground">Fund Overview</h2>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${unallocatedBudget > 0 ? "bg-accent/10 text-accent" : unallocatedBudget < 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            {unallocatedBudget >= 0 ? `₹${unallocatedBudget.toLocaleString('en-IN')} unallocated` : `₹${Math.abs(unallocatedBudget).toLocaleString('en-IN')} over-allocated`}
          </span>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={dashboardData.sections.filter((s) => !["hobby-fund", "ai-fund", "free-fund"].includes(s.id)).map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {dashboardData.sections
              .filter((s) => !["hobby-fund", "ai-fund", "free-fund"].includes(s.id))
              .map((section) => (
              <SortableFundItem
                key={section.id}
                section={section}
                onSelect={onSelectSection}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
