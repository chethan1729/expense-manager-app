import { Wallet, TrendingDown, TrendingUp, IndianRupee } from "lucide-react";
import type { FundSection } from "@/hooks/useExpenses";

interface DashboardViewProps {
  dashboardData: {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    sections: (FundSection & { totals: { estimated: number; spent: number; remaining: number } })[];
  };
  onSelectSection: (id: string) => void;
}

export function DashboardView({ dashboardData, onSelectSection }: DashboardViewProps) {
  const { totalBudget, totalSpent, totalRemaining } = dashboardData;

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-xl ${card.bg} p-3 space-y-1`}>
            <card.icon className={`h-4 w-4 ${card.color}`} />
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={`font-heading font-bold text-sm ${card.color}`}>
              ₹{card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="font-heading font-semibold text-foreground">Fund Overview</h2>
        {dashboardData.sections.map((section) => {
          const progress = section.totals.estimated > 0
            ? (section.totals.spent / section.totals.estimated) * 100
            : 0;
          return (
            <button
              key={section.id}
              onClick={() => onSelectSection(section.id)}
              className="w-full rounded-lg border bg-card p-4 text-left space-y-2 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-card-foreground text-sm">
                  {section.name}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {section.expenses.length} items
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block">Estimated</span>
                  <span className="font-heading font-medium">₹{section.totals.estimated.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Spent</span>
                  <span className="font-heading font-medium">₹{section.totals.spent.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Remaining</span>
                  <span className={`font-heading font-medium ${section.totals.remaining < 0 ? "text-destructive" : "text-primary"}`}>
                    ₹{section.totals.remaining.toLocaleString()}
                  </span>
                </div>
              </div>
              {section.totals.estimated > 0 && (
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progress > 100 ? "bg-destructive" : progress > 80 ? "bg-accent" : "bg-primary"}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
