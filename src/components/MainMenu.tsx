import { Wallet, Building2, BarChart3, Coins, Landmark, Activity } from "lucide-react";
import { LiveIndexView } from "./LiveIndexView";

interface MainMenuProps {
  onNavigate: (page: string) => void;
}

const menuCards = [
  { id: "expenses", label: "Expense Manager", icon: Wallet, desc: "Track & manage your monthly expenses", color: "bg-primary/10 text-primary" },
  { id: "properties", label: "Properties", icon: Building2, desc: "Track your real estate investments", color: "bg-accent/10 text-accent" },
  { id: "reports", label: "Reports", icon: BarChart3, desc: "Visual insights & net worth", color: "bg-success/10 text-success" },
  { id: "metals", label: "Gold / Silver", icon: Coins, desc: "Manage your physical metal assets", color: "bg-amber-100 text-amber-600" },
  { id: "deposits", label: "Deposits", icon: Landmark, desc: "FD, EPF & other savings", color: "bg-teal-100 text-teal-700" },
  { id: "live-index", label: "Live Index", icon: Activity, desc: "Real-time market rates & indices", color: "bg-blue-100 text-blue-600" },
];

export function MainMenu({ onNavigate }: MainMenuProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-foreground">Welcome Back 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your finances</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {menuCards.map((card) => (
          <button
            key={card.id}
            onClick={() => onNavigate(card.id)}
            className="rounded-xl border bg-card p-5 text-left space-y-3 hover:border-primary/40 transition-all active:scale-[0.98]"
          >
            <div className={`h-11 w-11 rounded-xl ${card.color} flex items-center justify-center`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-card-foreground text-sm">{card.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
