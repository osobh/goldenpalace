import { AlphaVantageClient } from './alphaVantageClient';

export class MarketDataService {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private alphaVantageClient: AlphaVantageClient;
  private isUsingRealData: boolean;

  constructor() {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    this.alphaVantageClient = new AlphaVantageClient(apiKey);
    // Use real data if we have a valid API key (not demo) regardless of environment
    this.isUsingRealData = apiKey !== 'demo';

    console.log('[MarketDataService] Initialized with',
      this.isUsingRealData ? `real Alpha Vantage data (${apiKey.substring(0, 4)}***)` : 'synthetic data'
    );
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    const cached = this.getFromCache(`price:${symbol}`);
    if (cached) return cached;

    let currentPrice: number;

    if (this.isUsingRealData) {
      try {
        // Use smart data fetching for better real-time accuracy
        const smartData = await this.alphaVantageClient.getSmartPriceData(symbol, true);
        currentPrice = smartData.currentPrice;

        console.log(`[MarketDataService] Got ${smartData.isRealTime ? 'real-time' : 'daily'} price for ${symbol}: $${currentPrice}`);

        // Cache real-time data for less time
        const cacheTime = smartData.isRealTime ? 60 : 300; // 1 min for real-time, 5 min for daily
        this.setCache(`price:${symbol}`, currentPrice, cacheTime);
        return currentPrice;
      } catch (error) {
        console.warn(`[MarketDataService] Failed to get real data for ${symbol}, falling back to synthetic:`, error);
      }
    }

    // Fallback to synthetic data
    const basePrices: Record<string, number> = {
      AAPL: 180,
      GOOGL: 140,
      MSFT: 380,
      AMZN: 170,
      TSLA: 250,
      BTC: 45000,
      ETH: 2500,
      SPY: 450
    };

    const price = basePrices[symbol] || 100 + Math.random() * 200;
    const variance = price * 0.002;
    currentPrice = price + (Math.random() - 0.5) * variance;

    this.setCache(`price:${symbol}`, currentPrice, 60);
    return currentPrice;
  }

  async getBatchPrices(symbols: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    for (const symbol of symbols) {
      prices[symbol] = await this.getCurrentPrice(symbol);
    }

    return prices;
  }

  async getHistoricalPrices(
    symbol: string,
    days: number
  ): Promise<Array<{ date: Date; price: number }>> {
    const cached = this.getFromCache(`history:${symbol}:${days}`);
    if (cached) return cached;

    let prices: Array<{ date: Date; price: number }>;

    if (this.isUsingRealData) {
      try {
        const realData = await this.alphaVantageClient.getHistoricalPrices(symbol, days);
        prices = realData.map(item => ({ date: item.date, price: item.price }));
        console.log(`[MarketDataService] Got real historical data for ${symbol}: ${prices.length} points`);
        this.setCache(`history:${symbol}:${days}`, prices, 1800); // Cache for 30 minutes
        return prices;
      } catch (error) {
        console.warn(`[MarketDataService] Failed to get real historical data for ${symbol}, falling back to synthetic:`, error);
      }
    }

    // Fallback to synthetic data
    const currentPrice = await this.getCurrentPrice(symbol);
    prices = [];
    const volatility = 0.02;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const randomReturn = (Math.random() - 0.5) * volatility;
      const price = currentPrice * (1 + randomReturn * Math.sqrt(i));

      prices.push({ date, price });
    }

    this.setCache(`history:${symbol}:${days}`, prices, 300);
    return prices;
  }

  async getVolatility(symbols: string | string[] | Record<string, any>): Promise<Record<string, number>> {
    const symbolArray = Array.isArray(symbols) ? symbols :
                       typeof symbols === 'string' ? [symbols] :
                       Object.values(symbols).map(s => (s as any).symbol || '');
    const volatilities: Record<string, number> = {};

    for (const symbol of symbolArray) {
      if (!symbol) continue;

      const history = await this.getHistoricalPrices(symbol, 30);
      const returns = [];

      for (let i = 1; i < history.length; i++) {
        const dailyReturn = (history[i].price - history[i - 1].price) / history[i - 1].price;
        returns.push(dailyReturn);
      }

      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized

      volatilities[symbol] = volatility;
    }

    return volatilities;
  }

  async getCorrelations(symbols: string[]): Promise<Record<string, number>> {
    const correlations: Record<string, number> = {};

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const corr = 0.3 + Math.random() * 0.5; // Realistic correlation range
        correlations[`${symbols[i]}-${symbols[j]}`] = corr;
        correlations[`${symbols[j]}-${symbols[i]}`] = corr;
      }
    }

    return correlations;
  }

  async getBenchmarkReturns(benchmark: string = 'SPY'): Promise<number> {
    const history = await this.getHistoricalPrices(benchmark, 365);
    const startPrice = history[0].price;
    const endPrice = history[history.length - 1].price;

    return (endPrice - startPrice) / startPrice;
  }

  async getVolume(symbols: string | Record<string, any>): Promise<Record<string, number>> {
    const symbolArray = typeof symbols === 'string' ? [symbols] :
                       Array.isArray(symbols) ? symbols :
                       Object.keys(symbols);

    const volumes: Record<string, number> = {};

    const baseVolumes: Record<string, number> = {
      AAPL: 50000000,
      GOOGL: 20000000,
      MSFT: 30000000,
      AMZN: 25000000,
      TSLA: 40000000,
      BTC: 10000000,
      ETH: 5000000,
      SPY: 80000000
    };

    for (const symbol of symbolArray) {
      const baseVolume = baseVolumes[symbol] || 1000000;
      const variance = baseVolume * 0.2;
      volumes[symbol] = baseVolume + (Math.random() - 0.5) * variance;
    }

    return volumes;
  }

  async getMarketStats(symbol: string): Promise<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    marketCap: number;
    peRatio: number;
    dividendYield: number;
  }> {
    if (this.isUsingRealData) {
      try {
        const realStats = await this.alphaVantageClient.getMarketStats(symbol);
        console.log(`[MarketDataService] Got real market stats for ${symbol}`);
        return {
          open: realStats.open,
          high: realStats.high,
          low: realStats.low,
          close: realStats.close,
          volume: realStats.volume,
          marketCap: realStats.close * realStats.volume * 100, // Estimate
          peRatio: 15 + Math.random() * 20, // Not available in free Alpha Vantage
          dividendYield: Math.random() * 4 // Not available in free Alpha Vantage
        };
      } catch (error) {
        console.warn(`[MarketDataService] Failed to get real market stats for ${symbol}, falling back to synthetic:`, error);
      }
    }

    // Fallback to synthetic data
    const currentPrice = await this.getCurrentPrice(symbol);
    const volumes = await this.getVolume([symbol]);

    return {
      open: currentPrice * (1 + (Math.random() - 0.5) * 0.02),
      high: currentPrice * (1 + Math.random() * 0.03),
      low: currentPrice * (1 - Math.random() * 0.03),
      close: currentPrice,
      volume: volumes[symbol],
      marketCap: currentPrice * volumes[symbol] * 100,
      peRatio: 15 + Math.random() * 20,
      dividendYield: Math.random() * 4
    };
  }

  async getRiskFreeRate(): Promise<number> {
    return 0.045; // Current US Treasury 10-year yield approximation
  }

  async getMarketReturn(): Promise<number> {
    return 0.10; // Historical S&P 500 average annual return
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttlSeconds: number = 60): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000
    });
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;

    const rates: Record<string, number> = {
      'USD-EUR': 0.92,
      'USD-GBP': 0.79,
      'USD-JPY': 149.50,
      'EUR-USD': 1.09,
      'GBP-USD': 1.27,
      'JPY-USD': 0.0067
    };

    return rates[`${from}-${to}`] || 1;
  }

  // Enhanced methods using new Alpha Vantage capabilities
  async searchSymbol(keywords: string): Promise<Array<{
    symbol: string;
    name: string;
    type: string;
    region: string;
    marketOpen: string;
    marketClose: string;
    timezone: string;
    currency: string;
    matchScore: number;
  }>> {
    if (!this.isUsingRealData) {
      // Return mock search results for demo mode
      const mockResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          type: 'Equity',
          region: 'United States',
          marketOpen: '09:30',
          marketClose: '16:00',
          timezone: 'UTC-04',
          currency: 'USD',
          matchScore: 1.0
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc. Class A',
          type: 'Equity',
          region: 'United States',
          marketOpen: '09:30',
          marketClose: '16:00',
          timezone: 'UTC-04',
          currency: 'USD',
          matchScore: 0.8
        }
      ].filter(result =>
        result.symbol.toLowerCase().includes(keywords.toLowerCase()) ||
        result.name.toLowerCase().includes(keywords.toLowerCase())
      );

      return mockResults;
    }

    try {
      return await this.alphaVantageClient.searchSymbol(keywords);
    } catch (error) {
      console.error(`[MarketDataService] Symbol search failed for '${keywords}':`, error);
      return [];
    }
  }

  async getMarketMovers(): Promise<{
    topGainers: Array<{
      ticker: string;
      price: number;
      changeAmount: number;
      changePercentage: number;
      volume: number;
    }>;
    topLosers: Array<{
      ticker: string;
      price: number;
      changeAmount: number;
      changePercentage: number;
      volume: number;
    }>;
    mostActive: Array<{
      ticker: string;
      price: number;
      changeAmount: number;
      changePercentage: number;
      volume: number;
    }>;
  }> {
    const cached = this.getFromCache('market:movers');
    if (cached) return cached;

    if (!this.isUsingRealData) {
      // Return mock market movers for demo mode
      const mockMovers = {
        topGainers: [
          { ticker: 'AAPL', price: 185.50, changeAmount: 5.25, changePercentage: 2.91, volume: 45000000 },
          { ticker: 'MSFT', price: 385.20, changeAmount: 8.75, changePercentage: 2.33, volume: 28000000 }
        ],
        topLosers: [
          { ticker: 'TSLA', price: 245.30, changeAmount: -8.20, changePercentage: -3.24, volume: 52000000 },
          { ticker: 'AMZN', price: 165.80, changeAmount: -4.50, changePercentage: -2.64, volume: 31000000 }
        ],
        mostActive: [
          { ticker: 'SPY', price: 455.60, changeAmount: 2.10, changePercentage: 0.46, volume: 85000000 },
          { ticker: 'TSLA', price: 245.30, changeAmount: -8.20, changePercentage: -3.24, volume: 52000000 }
        ]
      };

      this.setCache('market:movers', mockMovers, 300);
      return mockMovers;
    }

    try {
      const movers = await this.alphaVantageClient.getMarketMovers();
      this.setCache('market:movers', movers, 300); // Cache for 5 minutes
      return movers;
    } catch (error) {
      console.error(`[MarketDataService] Failed to fetch market movers:`, error);
      throw error;
    }
  }

  async getNewsSentiment(
    tickers?: string[],
    topics?: string[],
    limit: number = 20
  ): Promise<{
    items: number;
    feed: Array<{
      title: string;
      url: string;
      timePublished: Date;
      authors: string[];
      summary: string;
      source: string;
      overallSentimentScore: number;
      overallSentimentLabel: string;
      tickerSentiment: Array<{
        ticker: string;
        relevanceScore: number;
        tickerSentimentScore: number;
        tickerSentimentLabel: string;
      }>;
    }>;
  }> {
    const cacheKey = `news:${tickers?.join(',') || 'general'}:${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (!this.isUsingRealData) {
      // Return mock news for demo mode
      const mockNews = {
        items: 2,
        feed: [
          {
            title: 'Market Rally Continues as Tech Stocks Surge',
            url: 'https://example.com/news1',
            timePublished: new Date(),
            authors: ['Market Reporter'],
            summary: 'Technology stocks led the market higher today with strong earnings reports.',
            source: 'Financial News',
            overallSentimentScore: 0.75,
            overallSentimentLabel: 'Bullish',
            tickerSentiment: [
              {
                ticker: 'AAPL',
                relevanceScore: 0.9,
                tickerSentimentScore: 0.8,
                tickerSentimentLabel: 'Bullish'
              }
            ]
          },
          {
            title: 'Federal Reserve Signals Potential Rate Changes',
            url: 'https://example.com/news2',
            timePublished: new Date(Date.now() - 3600000),
            authors: ['Economics Reporter'],
            summary: 'Fed officials hint at upcoming monetary policy adjustments.',
            source: 'Economics Today',
            overallSentimentScore: -0.2,
            overallSentimentLabel: 'Bearish',
            tickerSentiment: [
              {
                ticker: 'SPY',
                relevanceScore: 0.8,
                tickerSentimentScore: -0.3,
                tickerSentimentLabel: 'Bearish'
              }
            ]
          }
        ]
      };

      this.setCache(cacheKey, mockNews, 600); // Cache for 10 minutes
      return mockNews;
    }

    try {
      const news = await this.alphaVantageClient.getNewsSentiment(tickers, topics, undefined, undefined, 'LATEST', limit);
      const result = {
        items: news.items,
        feed: news.feed.map(item => ({
          title: item.title,
          url: item.url,
          timePublished: item.timePublished,
          authors: item.authors,
          summary: item.summary,
          source: item.source,
          overallSentimentScore: item.overallSentimentScore,
          overallSentimentLabel: item.overallSentimentLabel,
          tickerSentiment: item.tickerSentiment
        }))
      };

      this.setCache(cacheKey, result, 600); // Cache for 10 minutes
      return result;
    } catch (error) {
      console.error(`[MarketDataService] Failed to fetch news sentiment:`, error);
      throw error;
    }
  }

  async getMarketStatus(): Promise<Array<{
    marketType: string;
    region: string;
    primaryExchanges: string;
    localOpen: string;
    localClose: string;
    currentStatus: string;
    notes: string;
  }>> {
    const cached = this.getFromCache('market:status');
    if (cached) return cached;

    if (!this.isUsingRealData) {
      // Return mock market status for demo mode
      const mockStatus = [
        {
          marketType: 'Equity',
          region: 'United States',
          primaryExchanges: 'NASDAQ, NYSE',
          localOpen: '09:30',
          localClose: '16:00',
          currentStatus: 'open',
          notes: 'Market is currently open for trading'
        }
      ];

      this.setCache('market:status', mockStatus, 300);
      return mockStatus;
    }

    try {
      const status = await this.alphaVantageClient.getMarketStatus();
      this.setCache('market:status', status, 300); // Cache for 5 minutes
      return status;
    } catch (error) {
      console.error(`[MarketDataService] Failed to fetch market status:`, error);
      throw error;
    }
  }

  async getIntradayPrices(
    symbol: string,
    interval: '1min' | '5min' | '15min' | '30min' | '60min' = '1min'
  ): Promise<Array<{ datetime: Date; open: number; high: number; low: number; close: number; volume: number }>> {
    const cached = this.getFromCache(`intraday:${symbol}:${interval}`);
    if (cached) return cached;

    if (!this.isUsingRealData) {
      // Generate synthetic intraday data
      const currentPrice = await this.getCurrentPrice(symbol);
      const data = [];
      const now = new Date();

      for (let i = 60; i >= 0; i--) {
        const datetime = new Date(now.getTime() - i * 60000); // 1 minute intervals
        const variance = currentPrice * 0.001;
        const price = currentPrice + (Math.random() - 0.5) * variance;

        data.push({
          datetime,
          open: price * (1 + (Math.random() - 0.5) * 0.001),
          high: price * (1 + Math.random() * 0.002),
          low: price * (1 - Math.random() * 0.002),
          close: price,
          volume: Math.floor(100000 + Math.random() * 500000)
        });
      }

      this.setCache(`intraday:${symbol}:${interval}`, data, 60);
      return data;
    }

    try {
      const data = await this.alphaVantageClient.getIntradayPrices(symbol, interval);
      this.setCache(`intraday:${symbol}:${interval}`, data, 60); // Cache for 1 minute
      return data;
    } catch (error) {
      console.error(`[MarketDataService] Failed to fetch intraday data for ${symbol}:`, error);
      throw error;
    }
  }

  // Rate limiting and API status
  getApiStatus(): {
    isUsingRealData: boolean;
    rateLimitInfo: {
      requestCount: number;
      lastRequestTime: number;
      timeUntilNextRequest: number;
      isDemoMode: boolean;
    };
  } {
    return {
      isUsingRealData: this.isUsingRealData,
      rateLimitInfo: this.alphaVantageClient.getRateLimitInfo()
    };
  }
}