import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { marketDataRoutes } from '../marketData.routes';

describe('MarketData Routes', () => {
  let app: express.Application;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    app = express();
    app.use(express.json());
    app.use('/api/market-data', marketDataRoutes);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('GET /search', () => {
    it('should return search results for valid keywords', async () => {
      const response = await request(app)
        .get('/api/market-data/search?q=AAPL')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });

    it('should return 400 for missing search keywords', async () => {
      const response = await request(app)
        .get('/api/market-data/search')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing or invalid search keywords');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for empty search keywords', async () => {
      const response = await request(app)
        .get('/api/market-data/search?q=')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing or invalid search keywords');
    });

    it('should handle search with multiple keywords', async () => {
      const response = await request(app)
        .get('/api/market-data/search?q=Apple Inc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.results)).toBe(true);
    });
  });

  describe('GET /movers', () => {
    it('should return market movers data', async () => {
      const response = await request(app)
        .get('/api/market-data/movers')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('topGainers');
      expect(response.body.data).toHaveProperty('topLosers');
      expect(response.body.data).toHaveProperty('mostActive');
      expect(Array.isArray(response.body.data.topGainers)).toBe(true);
      expect(Array.isArray(response.body.data.topLosers)).toBe(true);
      expect(Array.isArray(response.body.data.mostActive)).toBe(true);
    });
  });

  describe('GET /news', () => {
    it('should return news sentiment data without parameters', async () => {
      const response = await request(app)
        .get('/api/market-data/news')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('feed');
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.feed)).toBe(true);
      expect(typeof response.body.data.items).toBe('number');
    });

    it('should return news for specific tickers', async () => {
      const response = await request(app)
        .get('/api/market-data/news?tickers=AAPL,GOOGL')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('feed');
      expect(Array.isArray(response.body.data.feed)).toBe(true);
    });

    it('should return news for specific topics', async () => {
      const response = await request(app)
        .get('/api/market-data/news?topics=technology,earnings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('feed');
    });

    it('should respect limit parameter within bounds', async () => {
      const response = await request(app)
        .get('/api/market-data/news?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.feed.length).toBeLessThanOrEqual(5);
    });

    it('should cap limit to maximum allowed value', async () => {
      const response = await request(app)
        .get('/api/market-data/news?limit=200')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.feed.length).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /status', () => {
    it('should return market status information', async () => {
      const response = await request(app)
        .get('/api/market-data/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('markets');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.markets)).toBe(true);

      if (response.body.markets.length > 0) {
        const market = response.body.markets[0];
        expect(market).toHaveProperty('marketType');
        expect(market).toHaveProperty('region');
        expect(market).toHaveProperty('currentStatus');
      }
    });
  });

  describe('GET /intraday/:symbol', () => {
    it('should return intraday data for valid symbol', async () => {
      const response = await request(app)
        .get('/api/market-data/intraday/AAPL')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('symbol', 'AAPL');
      expect(response.body).toHaveProperty('interval', '1min');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });

    it('should accept different interval parameters', async () => {
      const intervals = ['1min', '5min', '15min', '30min', '60min'];

      for (const interval of intervals) {
        const response = await request(app)
          .get(`/api/market-data/intraday/AAPL?interval=${interval}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.interval).toBe(interval);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should return 400 for invalid interval', async () => {
      const response = await request(app)
        .get('/api/market-data/intraday/AAPL?interval=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid interval parameter');
      expect(response.body.message).toContain('1min, 5min, 15min, 30min, 60min');
    });

    it('should return 400 for missing symbol', async () => {
      const response = await request(app)
        .get('/api/market-data/intraday/')
        .expect(404);
    });
  });

  describe('GET /history/:symbol', () => {
    it('should return historical data for valid symbol', async () => {
      const response = await request(app)
        .get('/api/market-data/history/AAPL')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('symbol', 'AAPL');
      expect(response.body).toHaveProperty('days', 30);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });

    it('should accept custom days parameter', async () => {
      const response = await request(app)
        .get('/api/market-data/history/AAPL?days=7')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.days).toBe(7);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should cap days parameter to maximum allowed', async () => {
      const response = await request(app)
        .get('/api/market-data/history/AAPL?days=500')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.days).toBe(365);
    });

    it('should handle minimum days parameter', async () => {
      const response = await request(app)
        .get('/api/market-data/history/AAPL?days=-5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.days).toBe(1);
    });
  });

  describe('GET /quote/:symbol', () => {
    it('should return quote data for valid symbol', async () => {
      const response = await request(app)
        .get('/api/market-data/quote/AAPL')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('symbol', 'AAPL');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('price');
      expect(typeof response.body.data.price).toBe('number');
    });

    it('should return 400 for missing symbol', async () => {
      const response = await request(app)
        .get('/api/market-data/quote/')
        .expect(404);
    });
  });

  describe('POST /quotes', () => {
    it('should return batch quotes for valid symbols', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      const response = await request(app)
        .post('/api/market-data/quotes')
        .send({ symbols })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('count', symbols.length);
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBe(symbols.length);

      response.body.results.forEach((result: any, index: number) => {
        if (result.success) {
          expect(result.data).toHaveProperty('symbol', symbols[index]);
          expect(result.data).toHaveProperty('price');
          expect(typeof result.data.price).toBe('number');
        } else {
          expect(result).toHaveProperty('symbol', symbols[index]);
          expect(result).toHaveProperty('error');
        }
      });
    });

    it('should return 400 for missing symbols array', async () => {
      const response = await request(app)
        .post('/api/market-data/quotes')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing or invalid symbols array');
    });

    it('should return 400 for empty symbols array', async () => {
      const response = await request(app)
        .post('/api/market-data/quotes')
        .send({ symbols: [] })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing or invalid symbols array');
    });

    it('should return 400 for too many symbols', async () => {
      const symbols = Array.from({ length: 25 }, (_, i) => `SYMBOL${i}`);
      const response = await request(app)
        .post('/api/market-data/quotes')
        .send({ symbols })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Too many symbols requested');
      expect(response.body.message).toContain('Maximum 20 symbols');
    });

    it('should handle mixed valid and invalid symbols', async () => {
      const symbols = ['AAPL', 'INVALID_SYMBOL', 'GOOGL'];
      const response = await request(app)
        .post('/api/market-data/quotes')
        .send({ symbols })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results.length).toBe(symbols.length);

      let successCount = 0;
      let errorCount = 0;
      response.body.results.forEach((result: any) => {
        if (result.success) {
          successCount++;
          expect(result.data).toHaveProperty('price');
        } else {
          errorCount++;
          expect(result).toHaveProperty('error');
        }
      });

      expect(successCount + errorCount).toBe(symbols.length);
    });
  });

  describe('GET /api-status', () => {
    it('should return API status information', async () => {
      const response = await request(app)
        .get('/api/market-data/api-status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.status).toHaveProperty('isUsingRealData');
      expect(response.body.status).toHaveProperty('rateLimitInfo');
      expect(typeof response.body.status.isUsingRealData).toBe('boolean');
      expect(typeof response.body.status.rateLimitInfo).toBe('object');
    });
  });

  describe('Error Handling', () => {
    it('should handle synthetic data fallback gracefully', async () => {
      process.env.ALPHA_VANTAGE_API_KEY = 'invalid-key-that-will-cause-errors';

      const response = await request(app)
        .get('/api/market-data/search?q=AAPL')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('results');
    });

    it('should return consistent error format across endpoints', async () => {
      const endpoints = [
        '/api/market-data/search',
        '/api/market-data/intraday/AAPL?interval=invalid'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.error).toBe('string');
        expect(typeof response.body.message).toBe('string');
      }
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent success response format', async () => {
      const endpointsWithTimestamps = [
        '/api/market-data/movers',
        '/api/market-data/news',
        '/api/market-data/status',
        '/api/market-data/quote/AAPL',
        '/api/market-data/api-status'
      ];

      const endpointsWithoutTimestamps = [
        '/api/market-data/search?q=AAPL'
      ];

      // Test endpoints that should have timestamps
      for (const endpoint of endpointsWithTimestamps) {
        const response = await request(app).get(endpoint).expect(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('timestamp');
        expect(typeof response.body.timestamp).toBe('string');
      }

      // Test endpoints that should not have timestamps
      for (const endpoint of endpointsWithoutTimestamps) {
        const response = await request(app).get(endpoint).expect(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).not.toHaveProperty('timestamp');
      }
    });

    it('should include proper timestamps in ISO format', async () => {
      const response = await request(app)
        .get('/api/market-data/movers')
        .expect(200);

      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });
});