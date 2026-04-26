import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

// Symbol configuration with display names
const SYMBOLS = {
  'CL=F': { name: 'Crude Oil', currency: 'USD' },
  'GC=F': { name: 'Gold', currency: 'USD' },
  '^GDAXI': { name: 'DAX 40', currency: 'EUR' },
  '^GSPC': { name: 'S&P 500', currency: 'USD' },
} as const;

export class MarketDataService {
  private static instance: MarketDataService;
  private cache: Map<string, { data: MarketQuote[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60 * 1000; // 60 seconds

  private constructor() {}

  static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  async getMarketData(): Promise<MarketQuote[]> {
    const cacheKey = 'market-data';
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const symbols = Object.keys(SYMBOLS);

      // Fetch quotes individually to better handle errors
      const marketData: MarketQuote[] = [];

      for (const symbol of symbols) {
        try {
          const quote = await yahooFinance.quote(symbol);
          const config = SYMBOLS[symbol as keyof typeof SYMBOLS];

          // Extract current price and change with better fallbacks
          const price = quote?.regularMarketPrice
            ?? quote?.price
            ?? quote?.preMarketPrice
            ?? quote?.postMarketPrice
            ?? 0;

          const change = quote?.regularMarketChange
            ?? quote?.priceChange
            ?? 0;

          const changePercent = quote?.regularMarketChangePercent
            ?? quote?.percentChange
            ?? 0;

          marketData.push({
            symbol: this.formatSymbol(symbol),
            name: config.name,
            price: Math.round(price * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            currency: config.currency,
          });

          console.log(`[Markets] ${symbol}: $${price} (${changePercent.toFixed(2)}%)`);
        } catch {
          console.warn(`[Markets] Failed to fetch ${symbol}, using fallback`);
          // Use fallback for this symbol
          const fallback = this.getFallbackData().find(d => d.symbol === this.formatSymbol(symbol));
          if (fallback) {
            marketData.push(fallback);
          }
        }
      }

      // Update cache
      this.cache.set(cacheKey, { data: marketData, timestamp: Date.now() });

      return marketData;
    } catch (err) {
      console.error('[Markets] Yahoo Finance API error:', err);

      // Return cached data if available, even if expired
      if (cached) {
        console.log('[Markets] Using expired cache due to API error');
        return cached.data;
      }

      // Fallback to placeholder data if no cache
      console.log('[Markets] Using fallback data');
      return this.getFallbackData();
    }
  }

  private formatSymbol(symbol: string): string {
    // Convert Yahoo Finance symbols to display format
    const symbolMap: Record<string, string> = {
      'CL=F': 'OIL',
      'GC=F': 'GOLD',
      '^GDAXI': 'DAX',
      '^GSPC': 'SPX',
    };
    return symbolMap[symbol] || symbol;
  }

  private getFallbackData(): MarketQuote[] {
    // Fallback data if API fails completely
    return [
      {
        symbol: 'OIL',
        name: 'Crude Oil',
        price: 78.5,
        change: 0,
        changePercent: 0,
        currency: 'USD',
      },
      {
        symbol: 'GOLD',
        name: 'Gold',
        price: 2650.0,
        change: 0,
        changePercent: 0,
        currency: 'USD',
      },
      {
        symbol: 'DAX',
        name: 'DAX 40',
        price: 22800.0,
        change: 0,
        changePercent: 0,
        currency: 'EUR',
      },
      {
        symbol: 'SPX',
        name: 'S&P 500',
        price: 6100.0,
        change: 0,
        changePercent: 0,
        currency: 'USD',
      },
    ];
  }

  clearCache(): void {
    this.cache.clear();
  }
}
