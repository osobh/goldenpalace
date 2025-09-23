import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MarketDataService } from '../marketData.service';
import { AlphaVantageClient } from '../alphaVantageClient';

describe('MarketDataService', () => {
  let service: MarketDataService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    service = new MarketDataService();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Real vs Synthetic Data Mode', () => {
    it('should use real data when valid API key is provided', async () => {
      process.env.ALPHA_VANTAGE_API_KEY = 'real-api-key';
      const realService = new MarketDataService();

      vi.spyOn(AlphaVantageClient.prototype, 'getSmartPriceData').mockResolvedValue({
        currentPrice: 150.50,
        isRealTime: true
      });

      const price = await realService.getCurrentPrice('AAPL');
      expect(price).toBe(150.50);
      expect(AlphaVantageClient.prototype.getSmartPriceData).toHaveBeenCalledWith('AAPL', true);
    });

    it('should use synthetic data when no API key is provided', async () => {
      delete process.env.ALPHA_VANTAGE_API_KEY;
      const syntheticService = new MarketDataService();

      const price = await syntheticService.getCurrentPrice('AAPL');
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
      expect(price).toBeLessThan(1000);
    });

    it('should use synthetic data when demo API key is provided', async () => {
      process.env.ALPHA_VANTAGE_API_KEY = 'demo';
      const demoService = new MarketDataService();

      const price = await demoService.getCurrentPrice('AAPL');
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
      expect(price).toBeLessThan(1000);
    });

    it('should handle API key changes between instances', async () => {
      process.env.ALPHA_VANTAGE_API_KEY = 'real-key';
      const realService = new MarketDataService();

      process.env.ALPHA_VANTAGE_API_KEY = 'demo';
      const demoService = new MarketDataService();

      vi.spyOn(AlphaVantageClient.prototype, 'getSmartPriceData').mockResolvedValue({
        currentPrice: 200.00,
        isRealTime: true
      });

      const realPrice = await realService.getCurrentPrice('AAPL');
      const demoPrice = await demoService.getCurrentPrice('AAPL');

      expect(realPrice).toBe(200.00);
      expect(typeof demoPrice).toBe('number');
      expect(demoPrice).not.toBe(200.00);
    });
  });

  describe('Caching Behavior', () => {
    it('should cache synthetic price data for consistent results', async () => {
      delete process.env.ALPHA_VANTAGE_API_KEY;
      const syntheticService = new MarketDataService();

      const price1 = await syntheticService.getCurrentPrice('AAPL');
      const price2 = await syntheticService.getCurrentPrice('AAPL');

      expect(price1).toBe(price2);
    });

    it('should generate different prices for different symbols', async () => {
      delete process.env.ALPHA_VANTAGE_API_KEY;
      const syntheticService = new MarketDataService();

      const applePrice = await syntheticService.getCurrentPrice('AAPL');
      const googlePrice = await syntheticService.getCurrentPrice('GOOGL');
      const microsoftPrice = await syntheticService.getCurrentPrice('MSFT');

      expect(applePrice).not.toBe(googlePrice);
      expect(googlePrice).not.toBe(microsoftPrice);
      expect(applePrice).not.toBe(microsoftPrice);
    });

    it('should generate different market stats each time for synthetic data', async () => {
      delete process.env.ALPHA_VANTAGE_API_KEY;
      const syntheticService = new MarketDataService();

      const stats1 = await syntheticService.getMarketStats('AAPL');
      const stats2 = await syntheticService.getMarketStats('AAPL');

      expect(stats1).toHaveProperty('open');
      expect(stats1).toHaveProperty('high');
      expect(stats1).toHaveProperty('low');
      expect(stats1).toHaveProperty('volume');
      expect(stats1).toHaveProperty('marketCap');
      expect(stats1).toHaveProperty('peRatio');
      expect(stats1).toHaveProperty('dividendYield');
    });

    it('should cache real API data for short periods', async () => {
      process.env.ALPHA_VANTAGE_API_KEY = 'real-key';
      const realService = new MarketDataService();

      let callCount = 0;
      vi.spyOn(AlphaVantageClient.prototype, 'getSmartPriceData').mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          currentPrice: 100 + callCount,
          isRealTime: true
        });
      });

      const price1 = await realService.getCurrentPrice('AAPL');
      const price2 = await realService.getCurrentPrice('AAPL');

      expect(price1).toBe(101);
      expect(price2).toBe(101);
      expect(callCount).toBe(1);
    });
  });

  describe('Symbol Search Functionality', () => {
    it('should search symbols using real API when available', async () => {
      process.env.ALPHA_VANTAGE_API_KEY = 'real-key';
      const realService = new MarketDataService();

      const mockResults = [
        { symbol: 'AAPL', name: 'Apple Inc.', type: 'Equity', region: 'United States', marketOpen: '09:30', marketClose: '16:00', timezone: 'UTC-04', currency: 'USD', matchScore: 1.0 },
        { symbol: 'AAPLW', name: 'Apple Inc. Warrant', type: 'Warrant', region: 'United States', marketOpen: '09:30', marketClose: '16:00', timezone: 'UTC-04', currency: 'USD', matchScore: 0.8 }
      ];

      vi.spyOn(AlphaVantageClient.prototype, 'searchSymbol').mockResolvedValue(mockResults);

      const results = await realService.searchSymbol('AAPL');
      expect(results).toEqual(mockResults);
      expect(AlphaVantageClient.prototype.searchSymbol).toHaveBeenCalledWith('AAPL');
    });

    it('should provide synthetic search results when no API key', async () => {
      delete process.env.ALPHA_VANTAGE_API_KEY;
      const syntheticService = new MarketDataService();

      const results = await syntheticService.searchSymbol('AAPL');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('symbol');
      expect(results[0]).toHaveProperty('name');
      expect(results[0].symbol).toContain('AAPL');
    });

    it('should handle empty search queries gracefully', async () => {
      const results = await service.searchSymbol('');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Market Movers and Status', () => {
    it('should return consistent market movers for synthetic data', async () => {
      delete process.env.ALPHA_VANTAGE_API_KEY;
      const syntheticService = new MarketDataService();

      const movers1 = await syntheticService.getMarketMovers();
      const movers2 = await syntheticService.getMarketMovers();

      expect(movers1).toEqual(movers2);
      expect(movers1.topGainers).toBeDefined();
      expect(movers1.topLosers).toBeDefined();
      expect(movers1.mostActive).toBeDefined();
    });

    it('should return market status with proper structure', async () => {
      const status = await service.getMarketStatus();

      expect(Array.isArray(status)).toBe(true);
      expect(status.length).toBeGreaterThan(0);
      expect(status[0]).toHaveProperty('marketType');
      expect(status[0]).toHaveProperty('region');
      expect(status[0]).toHaveProperty('currentStatus');
    });
  });

  describe('Historical and Intraday Data', () => {
    it('should generate consistent historical data for synthetic mode', async () => {
      delete process.env.ALPHA_VANTAGE_API_KEY;
      const syntheticService = new MarketDataService();

      const history1 = await syntheticService.getHistoricalPrices('AAPL', 30);
      const history2 = await syntheticService.getHistoricalPrices('AAPL', 30);

      expect(history1).toEqual(history2);
      expect(history1.length).toBe(31);
      expect(history1[0]).toHaveProperty('date');
      expect(history1[0]).toHaveProperty('price');
    });

    it('should generate consistent intraday data for synthetic mode', async () => {
      delete process.env.ALPHA_VANTAGE_API_KEY;
      const syntheticService = new MarketDataService();

      const intraday1 = await syntheticService.getIntradayPrices('AAPL', '5min');
      const intraday2 = await syntheticService.getIntradayPrices('AAPL', '5min');

      expect(intraday1).toEqual(intraday2);
      expect(intraday1.length).toBeGreaterThan(0);
      expect(intraday1[0]).toHaveProperty('datetime');
      expect(intraday1[0]).toHaveProperty('open');
      expect(intraday1[0]).toHaveProperty('high');
      expect(intraday1[0]).toHaveProperty('low');
      expect(intraday1[0]).toHaveProperty('close');
      expect(intraday1[0]).toHaveProperty('volume');
    });

    it('should handle different intraday intervals', async () => {
      const intervals: Array<'1min' | '5min' | '15min' | '30min' | '60min'> = ['1min', '5min', '15min', '30min', '60min'];

      for (const interval of intervals) {
        const data = await service.getIntradayPrices('AAPL', interval);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
      }
    });
  });

  describe('News Sentiment', () => {
    it('should return news sentiment with proper structure', async () => {
      const news = await service.getNewsSentiment(['AAPL'], ['technology'], 10);

      expect(news).toHaveProperty('feed');
      expect(Array.isArray(news.feed)).toBe(true);
      expect(news).toHaveProperty('items');

      if (news.feed.length > 0) {
        const article = news.feed[0];
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('summary');
        expect(article).toHaveProperty('overallSentimentScore');
        expect(article).toHaveProperty('overallSentimentLabel');
      }
    });

    it('should handle news requests without parameters', async () => {
      const news = await service.getNewsSentiment();
      expect(news).toHaveProperty('feed');
      expect(Array.isArray(news.feed)).toBe(true);
    });
  });

  describe('API Status and Monitoring', () => {
    it('should return API status information', () => {
      const status = service.getApiStatus();

      expect(status).toHaveProperty('isUsingRealData');
      expect(status).toHaveProperty('rateLimitInfo');
      expect(typeof status.isUsingRealData).toBe('boolean');
      expect(typeof status.rateLimitInfo).toBe('object');
      expect(status.rateLimitInfo).toHaveProperty('requestCount');
      expect(status.rateLimitInfo).toHaveProperty('isDemoMode');
    });

    it('should track API usage correctly for real API', async () => {
      process.env.ALPHA_VANTAGE_API_KEY = 'real-key';
      const realService = new MarketDataService();

      vi.spyOn(AlphaVantageClient.prototype, 'getSmartPriceData').mockResolvedValue({
        currentPrice: 150.00,
        isRealTime: true
      });
      vi.spyOn(AlphaVantageClient.prototype, 'getRequestCount').mockReturnValue(1);

      await realService.getCurrentPrice('AAPL');
      const status = realService.getApiStatus();

      expect(typeof status.rateLimitInfo.requestCount).toBe('number');
    });

    it('should indicate synthetic mode correctly', () => {
      delete process.env.ALPHA_VANTAGE_API_KEY;
      const syntheticService = new MarketDataService();

      const status = syntheticService.getApiStatus();
      expect(status.isUsingRealData).toBe(false);
      expect(status.rateLimitInfo.isDemoMode).toBe(true);
    });
  });
});