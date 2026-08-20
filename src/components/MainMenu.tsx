import { useState, useEffect } from "react";
import { Wallet, Building2, BarChart3, Coins, Landmark, Activity, Receipt, Zap, ShieldCheck, PieChart, Share2, Target, TrendingUp, TrendingDown, BrainCircuit } from "lucide-react";
import { Share } from "@capacitor/share";
import { useNetWorthHistory } from "@/hooks/useNetWorthHistory";
import { useTransactions } from "@/hooks/useTransactions";
import { useLiveMarketData } from "@/hooks/useLiveMarketData";

interface MainMenuProps {
  onNavigate: (page: string) => void;
  pendingAutomatedTransactionCount?: number;
}

const menuCards = [
  { id: "expenses", label: "Expense Manager", icon: Wallet, desc: "Track & manage your monthly expenses", color: "bg-primary/10 text-primary" },
  { id: "transactions", label: "Transactions", icon: Receipt, desc: "Record & view quick transactions", color: "bg-indigo-100 text-indigo-600" },
  { id: "automated-transactions", label: "Automated Transactions", icon: Zap, desc: "AI-powered SMS transaction approval", color: "bg-purple-100 text-purple-600", badge: true },
  { id: "finance-assistant", label: "Finance AI", icon: BrainCircuit, desc: "Chat with your personal finance assistant", color: "bg-violet-100 text-violet-600" },
  { id: "properties", label: "Properties", icon: Building2, desc: "Track your real estate investments", color: "bg-accent/10 text-accent" },
  { id: "goals", label: "Goals", icon: Target, desc: "Plan & track your financial goals", color: "bg-rose-100 text-rose-600" },
  { id: "wife-investments", label: "Wife's Investments", icon: Landmark, desc: "Manage your wife's portfolio separately", color: "bg-indigo-100 text-indigo-600" },
  { id: "reports", label: "Reports", icon: BarChart3, desc: "Visual insights & net worth", color: "bg-success/10 text-success" },
  { id: "metals", label: "Gold / Silver", icon: Coins, desc: "Manage your physical metal assets", color: "bg-amber-100 text-amber-600" },
  { id: "deposits", label: "Deposits", icon: Landmark, desc: "FD, EPF & other savings", color: "bg-teal-100 text-teal-700" },
  { id: "investment-planner", label: "Investment Planner", icon: PieChart, desc: "Plan your investment diversification", color: "bg-pink-100 text-pink-600" },
  { id: "live-index", label: "Live Index", icon: Activity, desc: "Real-time market rates & indices", color: "bg-blue-100 text-blue-600" },
  { id: "backup-restore", label: "Backup & Restore", icon: ShieldCheck, desc: "Backup your data to a file", color: "bg-emerald-100 text-emerald-600" },
];

export function MainMenu({ onNavigate, pendingAutomatedTransactionCount = 0 }: MainMenuProps) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const { history } = useNetWorthHistory();
  const { getTransactionsForDate, getMonthKey } = useTransactions();
  const { data: marketData } = useLiveMarketData(60000);

  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Slide 0: Net Worth
  let netWorthDiff = 0;
  let isNetWorthUp = true;
  let currentNetWorth = 0;
  if (history.length >= 2) {
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    netWorthDiff = last.netWorth - prev.netWorth;
    isNetWorthUp = netWorthDiff >= 0;
    currentNetWorth = last.netWorth;
  } else if (history.length === 1) {
    currentNetWorth = history[0].netWorth;
  }

  // Slide 1: Today's Spends
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const monthKey = getMonthKey(today);
  const todayTransactions = getTransactionsForDate(dateStr, monthKey);
  const todaySpent = todayTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Slide 2: Markets
  const getIndexItem = (symbol: string) => marketData[symbol];

  return (
    <div className="space-y-6">
      <div className="h-16 relative overflow-hidden">
        {/* Slide 0: Net Worth */}
        <div className={`absolute inset-0 transition-all duration-500 transform ${bannerIndex === 0 ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}>
          <p className="text-sm text-muted-foreground">Current Net Worth</p>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="font-heading text-xl font-bold text-foreground">₹{(currentNetWorth || 0).toLocaleString('en-IN')}</h1>
            {history.length >= 2 && (
              <span className={`text-xs font-bold flex items-center ${isNetWorthUp ? "text-emerald-500" : "text-red-500"}`}>
                {isNetWorthUp ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                ₹{(Math.abs(netWorthDiff) || 0).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* Slide 1: Today's Spends */}
        <div className={`absolute inset-0 transition-all duration-500 transform ${bannerIndex === 1 ? "translate-y-0 opacity-100" : bannerIndex < 1 ? "translate-y-full opacity-0" : "-translate-y-full opacity-0"}`}>
          <p className="text-sm text-muted-foreground">Spent Today</p>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="font-heading text-xl font-bold text-accent">₹{(todaySpent || 0).toLocaleString('en-IN')}</h1>
            {todaySpent > 0 && <span className="text-xs text-muted-foreground font-medium">across {todayTransactions.length} transactions</span>}
          </div>
        </div>

        {/* Slide 2: Markets */}
        <div className={`absolute inset-0 transition-all duration-500 transform ${bannerIndex === 2 ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
          <div className="flex items-center justify-between h-full pr-2">
            {['^NSEI', 'HDFCBANK.NS', 'NVDA', 'GOLD22K_1G'].map((symbol) => {
              const item = getIndexItem(symbol);
              if (!item) return null;
              const isUp = item.changePercent >= 0;
              return (
                <div key={symbol} className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-[70px]">{item.name === 'Gold 22k (1g)' ? 'Gold 22k' : item.name}</span>
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs font-bold text-foreground">{(item.price || 0).toLocaleString('en-IN')}</span>
                    <span className={`text-[9px] font-bold ${isUp ? "text-emerald-500" : "text-red-500"}`}>
                      {isUp ? "▲" : "▼"}{Math.abs(item.changePercent).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {menuCards.map((card: any) => (
          <button
            key={card.id}
            onClick={() => onNavigate(card.id)}
            className="rounded-xl border bg-card p-5 text-left space-y-3 hover:border-primary/40 transition-all active:scale-[0.98] relative"
          >
            {card.badge && pendingAutomatedTransactionCount > 0 && (
              <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                {Math.min(pendingAutomatedTransactionCount, 9)}
              </div>
            )}
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
      <div className="pt-4 border-t">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 p-5 space-y-4 border border-indigo-100 dark:border-indigo-900/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center">
              <Share2 className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-foreground text-sm">Spread the word!</h3>
              <p className="text-[11px] text-muted-foreground">Share this app with your friends & family</p>
            </div>
          </div>
          <button 
            onClick={async () => {
              try {
                await Share.share({
                  title: "Download Expense Manager",
                  text: "Manage your finances like a pro! Download the Expense Manager app APK from this drive link:",
                  url: "https://drive.google.com/drive/folders/1nbz3Zf0n0Ht-K6h8KmXy_ymsUKbjhskJ?usp=sharing",
                  dialogTitle: "Share App APK",
                });
              } catch (err) {
                console.error("Shared failed", err);
              }
            }}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Share2 className="h-3.5 w-3.5" /> Share App APK
          </button>
        </div>
      </div>
    </div>
  );
}
