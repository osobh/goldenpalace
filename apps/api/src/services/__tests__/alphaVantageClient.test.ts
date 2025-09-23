import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AlphaVantageClient } from '../alphaVantageClient';

describe('AlphaVantageClient', () => {
  let client: AlphaVantageClient;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    client = new AlphaVantageClient('test-api-key');
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('Rate Limiting', () => {
    it('should enforce minimum interval between requests for demo mode', async () => {
      const demoClient = new AlphaVantageClient('demo');

      // Mock fetch to return empty response initially
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });

      const startTime = Date.now();

      // First request should go through immediately and fail due to empty response
      await expect(demoClient.getCurrentPrice('AAPL')).rejects.toThrow('No price data found for symbol: AAPL');

      const firstRequestTime = Date.now() - startTime;
      expect(firstRequestTime).toBeLessThan(1000); // Should be immediate

      // Second request should be delayed by rate limiting
      const secondStartTime = Date.now();
      await expect(demoClient.getCurrentPrice('GOOGL')).rejects.toThrow('No price data found for symbol: GOOGL');

      const secondRequestTime = Date.now() - secondStartTime;
      expect(secondRequestTime).toBeGreaterThanOrEqual(11900); // Should wait ~12 seconds
    }, 15000); // Increase timeout to 15 seconds

    it('should enforce shorter interval for standard API key', async () => {
      const standardClient = new AlphaVantageClient('standard-key');

      // Mock fetch to avoid actual API calls
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '02. open': '180.00',
            '03. high': '185.00',
            '04. low': '179.00',
            '05. price': '182.50',
            '06. volume': '50000000',
            '07. latest trading day': '2025-01-15',
            '08. previous close': '181.00',
            '09. change': '1.50',
            '10. change percent': '0.83%'
          }
        })
      });

      global.fetch = mockFetch;

      const startTime = Date.now();

      // First request
      await standardClient.getCurrentPrice('AAPL');
      const firstRequestTime = Date.now() - startTime;
      expect(firstRequestTime).toBeLessThan(1000);

      // Second request should be delayed by shorter interval
      const secondStartTime = Date.now();
      await standardClient.getCurrentPrice('GOOGL');
      const secondRequestTime = Date.now() - secondStartTime;
      expect(secondRequestTime).toBeGreaterThanOrEqual(700); // Should wait ~0.8 seconds
    });

    it('should track request count correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '182.50'
          }
        })
      });

      globalThis.fetch = mockFetch;

      expect(client.getRequestCount()).toBe(0);

      // This should work with the mock and increment request count
      const price = await client.getCurrentPrice('AAPL');
      expect(price).toBe(182.50);
      expect(client.getRequestCount()).toBe(1);
    });
  });

  describe('Demo Mode Detection', () => {
    it('should correctly identify demo mode', () => {
      const demoClient = new AlphaVantageClient('demo');
      expect(demoClient.isDemoMode()).toBe(true);

      const realClient = new AlphaVantageClient('real-api-key');
      expect(realClient.isDemoMode()).toBe(false);
    });
  });

  describe('API Response Parsing', () => {
    it('should parse GLOBAL_QUOTE response correctly', async () => {
      const mockResponse = {
        'Global Quote': {
          '01. symbol': 'AAPL',
          '02. open': '180.00',
          '03. high': '185.00',
          '04. low': '179.00',
          '05. price': '182.50',
          '06. volume': '50000000',
          '07. latest trading day': '2025-01-15',
          '08. previous close': '181.00',
          '09. change': '1.50',
          '10. change percent': '0.83%'
        }
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      globalThis.fetch = mockFetch;

      // This should work with proper mock
      const price = await client.getCurrentPrice('AAPL');
      expect(price).toBe(182.50);
    });

    it('should handle missing quote data', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });

      global.fetch = mockFetch;

      await expect(async () => {
        await client.getCurrentPrice('INVALID');
      }).rejects.toThrow('No price data found for symbol: INVALID');
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      });

      global.fetch = mockFetch;

      await expect(async () => {
        await client.getCurrentPrice('AAPL');
      }).rejects.toThrow('Alpha Vantage API error: 500');
    });

    it('should handle rate limit exceeded response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          'Information': 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute'
        })
      });

      global.fetch = mockFetch;

      await expect(async () => {
        await client.getCurrentPrice('AAPL');
      }).rejects.toThrow('Alpha Vantage API rate limit exceeded');
    });

    it('should handle network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      await expect(async () => {
        await client.getCurrentPrice('AAPL');
      }).rejects.toThrow('Network error');
    });
  });
});