export class MarketDataService {
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  async getCurrentPrice(symbol: string): Promise<number> {
    const cached = this.getFromCache(`price:${symbol}`);
    if (cached) return cached;

    // Simulate market data with realistic prices
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
    const currentPrice = price + (Math.random() - 0.5) * variance;

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

    const currentPrice = await this.getCurrentPrice(symbol);
    const prices = [];
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
}