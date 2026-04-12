import { useLiveMarketData } from "@/hooks/useLiveMarketData";
import { TrendingUp, TrendingDown, RefreshCcw, Activity, LayoutGrid } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LiveIndexViewProps {
  fullPage?: boolean;
}

const CATEGORIES = [
  { 
    id: "india", 
    name: "Indian Markets", 
    symbols: ["^NSEI", "^NSEBANK"] 
  },
  { 
    id: "global", 
    name: "Global & US", 
    symbols: ["^GSPC", "^IXIC", "NVDA", "AVGO", "TSM"] 
  },
  { 
    id: "crypto", 
    name: "Cryptocurrencies", 
    symbols: ["BTC-USD", "RENDER-USD", "FET-USD", "TAO-USD"] 
  },
  { 
    id: "metals", 
    name: "Commodities", 
    symbols: ["GOLD22K_1G", "SILVER_1G", "PLATINUM_1G"] 
  }
];

const LOGOS: Record<string, string> = {
  '^NSEI': '🇮🇳',
  '^NSEBANK': '🏦',
  '^GSPC': '🇺🇸',
  '^IXIC': '🇺🇸',
  'NVDA': '🟢',
  'AVGO': '🔴',
  'TSM': '🔵',
  'BTC-USD': '🟠',
  'RENDER-USD': '🫧',
  'FET-USD': '🧠',
  'TAO-USD': '🕸️',
  'GOLD22K_1G': '👑',
  'SILVER_1G': '⚪',
  'PLATINUM_1G': '🔘',
  'GC=F': '🟡',
  'SI=F': '🥈',
  'PL=F': '💿'
};

export function LiveIndexView({ fullPage }: LiveIndexViewProps) {
  const { data, loading, error, refresh } = useLiveMarketData();

  if (loading && Object.keys(data).length === 0) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="space-y-3">
            <Skeleton className="h-4 w-32 rounded" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
          {fullPage ? <LayoutGrid className="h-4 w-4 text-primary" /> : <Activity className="h-4 w-4 text-primary" />}
          {fullPage ? "Live Market Overview" : "Live Index"}
          {error && <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded ml-2">Offline</span>}
        </h2>
        <button 
          onClick={() => refresh()} 
          className="bg-card border border-border/50 rounded-full p-2 text-muted-foreground hover:text-primary transition-all shadow-sm active:scale-90"
          title="Refresh rates"
        >
          <RefreshCcw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {CATEGORIES.map((cat) => {
        // Filter symbols that have data
        const availableSymbols = cat.symbols.filter(s => data[s]);
        if (availableSymbols.length === 0) return null;

        return (
          <div key={cat.id} className="space-y-3">
            <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">
              {cat.name}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {availableSymbols.map((symbol) => {
                const item = data[symbol]!;
                const isPositive = item.changePercent >= 0;
                const isINR = item.currency === 'INR' || symbol.endsWith('_1G');

                return (
                  <div 
                    key={symbol} 
                    className="bg-card border border-border/50 rounded-xl p-4 shadow-sm hover:border-primary/30 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base leading-none">{LOGOS[symbol] || '📈'}</span>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
                        {item.name}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-heading font-bold text-lg text-foreground">
                        {isINR ? '₹' : (symbol === 'BTC-USD' || symbol.endsWith('-USD') ? '$' : '')}
                        {item.price.toLocaleString('en-IN', {
                          maximumFractionDigits: item.price > 1000 ? 0 : 2
                        })}
                      </p>
                      <div className={`flex items-center gap-1 font-medium text-xs ${isPositive ? 'text-emerald-500' : 'text-destructive'}`}>
                        {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        <span>{Math.abs(item.changePercent).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}


