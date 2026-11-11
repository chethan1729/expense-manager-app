import { useState, useEffect, useCallback } from 'react';

export interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  unavailable?: boolean;
}

const SYMBOLS = {
  '^NSEI': 'Nifty 50',
  '^NSEBANK': 'Bank Nifty',
  '^STI': 'Singapore STI',
  '^SSEC': 'Shanghai Composite',
  '^N225': 'Nikkei 225',
  '^FTSE': 'FTSE 100',
  '^GSPC': 'S&P 500',
  '^IXIC': 'Nasdaq',
  '^DJI': 'Dow Jones',
  'NVDA': 'Nvidia',
  'ASML': 'ASML',
  'AVGO': 'Broadcom',
  'TSM': 'TSM',
  'GOOGL': 'Google',
  'MSFT': 'Microsoft',
  'META': 'Meta',
  'AAPL': 'Apple',
  'HDFCBANK.NS': 'HDFC Bank',
  'BAJAJHFL.NS': 'Bajaj Housing Finance',
  'LT.NS': 'L&T',
  'VBL.NS': 'Varun Beverages',
  'SONACOMS.NS': 'Sona BLW Precision Forgings',
  'BTC-USD': 'Bitcoin',
  'RENDER-USD': 'Render',
  'FET-USD': 'Fetch.ai',
  'TAO-USD': 'Bittensor',
  'GC=F': 'Gold (Spot)',
  'SI=F': 'Silver',
  'PL=F': 'Platinum',
  'USDINR=X': 'USD/INR',
  'GOLD22K_1G': 'Gold 22K (1g)',
  'SILVER_1G': 'Silver (1g)',
  'PLATINUM_1G': 'Platinum (1g)'
};

const PROXY_URL = 'https://corsproxy.io/?';
const FALLBACK_PROXY_URL = 'https://api.allorigins.win/raw?url=';

const CACHED_MARKET_DATA_KEY = 'live-market-data-cache';

function createMarketFallbackData() {
  return Object.keys(SYMBOLS).reduce<Record<string, MarketItem>>((result, symbol) => {
    result[symbol] = {
      symbol,
      name: SYMBOLS[symbol as keyof typeof SYMBOLS],
      price: 0,
      change: 0,
      changePercent: 0,
      currency: symbol.endsWith('.NS') ? 'INR' : 'USD',
      unavailable: true,
    };
    return result;
  }, {});
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs))]);
}

async function fetchMarketJson(url: string) {
  const encodedUrl = encodeURIComponent(url);
  for (const endpoint of [url, `${PROXY_URL}${encodedUrl}`, `${FALLBACK_PROXY_URL}${encodedUrl}`]) {
    try {
      const response = await withTimeout(fetch(endpoint, { headers: { 'Accept': 'application/json' }, cache: 'no-store' }), 5000);
      if (response.ok) return await response.json();
    } catch {
      // Try the next transport.
    }
  }
  return null;
}

export function useLiveMarketData(refreshInterval = 60000) {
  const [data, setData] = useState<Record<string, MarketItem>>(() => {
    try {
      return { ...createMarketFallbackData(), ...JSON.parse(localStorage.getItem(CACHED_MARKET_DATA_KEY) || '{}') };
    } catch {
      return createMarketFallbackData();
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSymbol = async (symbol: string): Promise<MarketItem | null> => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&ts=${Date.now()}`;
      const json = await fetchMarketJson(url);
      if (!json) return null;
      const result = json.chart?.result?.[0];
      
      if (result && result.meta) {
        const meta = result.meta;
        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || price;
        const change = price - prevClose;
        const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

        return {
          symbol,
          name: SYMBOLS[symbol as keyof typeof SYMBOLS] || meta.symbol || symbol,
          price,
          change,
          changePercent,
          currency: meta.currency || 'USD'
        };
      }
      return null;
    } catch (err) {
      return null;
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const symbolsList = Object.keys(SYMBOLS);
      const results = await Promise.all(symbolsList.map(s => fetchSymbol(s)));
      
      const newMarketData: Record<string, MarketItem> = {};
      results.forEach(item => {
        if (item) {
          newMarketData[item.symbol] = item;
        }
      });

      // Special handling for localized commodities (Gold, Silver, Platinum in INR per 1g)
      const goldSpot = newMarketData['GC=F'];
      const silverSpot = newMarketData['SI=F'];
      const platinumSpot = newMarketData['PL=F'];
      const usdinr = newMarketData['USDINR=X'];
      
      const TROY_OUNCE_TO_GRAMS = 31.1035;

      if (usdinr) {
        if (goldSpot) {
          const pricePerGram22k = (goldSpot.price / TROY_OUNCE_TO_GRAMS) * (22/24) * usdinr.price;
          newMarketData['GOLD22K_1G'] = {
            symbol: 'GOLD22K_1G',
            name: 'Gold 22k (1g)',
            price: Math.round(pricePerGram22k),
            change: 0,
            changePercent: goldSpot.changePercent,
            currency: 'INR'
          };
        }

        if (silverSpot) {
          const pricePerGramSilver = (silverSpot.price / TROY_OUNCE_TO_GRAMS) * usdinr.price;
          newMarketData['SILVER_1G'] = {
            symbol: 'SILVER_1G',
            name: 'Silver (1g)',
            price: Math.round(pricePerGramSilver),
            change: 0,
            changePercent: silverSpot.changePercent,
            currency: 'INR'
          };
        }

        if (platinumSpot) {
          const pricePerGramPlatinum = (platinumSpot.price / TROY_OUNCE_TO_GRAMS) * usdinr.price;
          newMarketData['PLATINUM_1G'] = {
            symbol: 'PLATINUM_1G',
            name: 'Platinum (1g)',
            price: Math.round(pricePerGramPlatinum),
            change: 0,
            changePercent: platinumSpot.changePercent,
            currency: 'INR'
          };
        }
      }

      const fallbackData = symbolsList.reduce<Record<string, MarketItem>>((result, symbol) => {
        if (!newMarketData[symbol] && !data[symbol]) {
          result[symbol] = {
            symbol,
            name: SYMBOLS[symbol as keyof typeof SYMBOLS],
            price: 0,
            change: 0,
            changePercent: 0,
            currency: symbol.endsWith('.NS') ? 'INR' : 'USD',
            unavailable: true,
          };
        }
        return result;
      }, {});

      setData((previous) => {
        const merged = { ...fallbackData, ...previous, ...newMarketData };
        localStorage.setItem(CACHED_MARKET_DATA_KEY, JSON.stringify(merged));
        return merged;
      });
      setError(null);
    } catch (err) {
      console.error('Market data fetch error:', err);
      setError('Market data currently unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refresh: fetchData };
}
