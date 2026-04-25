import { useState, useEffect, useCallback } from 'react';

export interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

const SYMBOLS = {
  '^NSEI': 'Nifty 50',
  '^NSEBANK': 'Bank Nifty',
  '^GSPC': 'S&P 500',
  '^IXIC': 'Nasdaq',
  'NVDA': 'Nvidia',
  'AVGO': 'Broadcom',
  'TSM': 'TSM',
  'HDFCBANK.NS': 'HDFC Bank',
  'BTC-USD': 'Bitcoin',
  'RENDER-USD': 'Render',
  'FET-USD': 'Fetch.ai',
  'TAO-USD': 'Bittensor',
  'GC=F': 'Gold (Spot)',
  'SI=F': 'Silver',
  'PL=F': 'Platinum',
  'USDINR=X': 'USD/INR'
};

const PROXY_URL = 'https://corsproxy.io/?';

export function useLiveMarketData(refreshInterval = 60000) {
  const [data, setData] = useState<Record<string, MarketItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSymbol = async (symbol: string): Promise<MarketItem | null> => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&ts=${Date.now()}`;
      const response = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      
      if (!response.ok) return null;
      
      const json = await response.json();
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

      if (Object.keys(newMarketData).length === 0) {
        throw new Error('No data received from any source');
      }

      setData(newMarketData);
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
