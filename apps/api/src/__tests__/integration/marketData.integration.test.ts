import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioc } from 'socket.io-client';
import { marketDataRoutes } from '../../routes/marketData.routes';
import { MarketDataHandler } from '../../websocket/marketData.handler';
import { MarketDataService } from '../../services/marketData.service';

describe('Market Data Integration Tests', () => {
  let app: express.Application;
  let httpServer: any;
  let io: SocketIOServer;
  let marketDataHandler: MarketDataHandler;
  let clientSocket: any;
  let serverPort: number;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(async () => {
    originalEnv = { ...process.env };

    // Set up Express app with market data routes
    app = express();
    app.use(express.json());
    app.use('/api/market-data', marketDataRoutes);

    // Create HTTP server and Socket.IO server
    httpServer = createServer(app);
    io = new SocketIOServer(httpServer, {
      cors: { origin: "*" }
    });

    // Initialize market data handler
    marketDataHandler = new MarketDataHandler(io);

    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    process.env = originalEnv;
    vi.restoreAllMocks();

    if (marketDataHandler) {
      marketDataHandler.destroy();
    }

    if (io) {
      io.close();
    }

    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(resolve);
      });
    }
  });

  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('End-to-End Market Data Flow', () => {
    it('should provide market data through both REST API and WebSocket', async () => {
      // Test REST API endpoint
      const restResponse = await request(app)
        .get('/api/market-data/quote/AAPL')
        .expect(200);

      expect(restResponse.body).toHaveProperty('success', true);
      expect(restResponse.body).toHaveProperty('symbol', 'AAPL');
      expect(restResponse.body).toHaveProperty('data');
      expect(restResponse.body.data).toHaveProperty('price');
      expect(typeof restResponse.body.data.price).toBe('number');

      // Test WebSocket connection and subscription
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket test timeout'));
        }, 5000);

        clientSocket = ioc(`http://localhost:${serverPort}`);

        clientSocket.on('connect', () => {
          // Subscribe to AAPL market data
          clientSocket.emit('market:subscribe', { symbols: ['AAPL'] });
        });

        clientSocket.on('market:data', (data) => {
          try {
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);

            const priceUpdate = data[0];
            expect(priceUpdate).toHaveProperty('symbol', 'AAPL');
            expect(priceUpdate).toHaveProperty('price');
            expect(priceUpdate).toHaveProperty('timestamp');
            expect(typeof priceUpdate.price).toBe('number');

            // Compare REST and WebSocket prices (should be consistent)
            const restPrice = restResponse.body.data.price;
            const wsPrice = priceUpdate.price;

            // Prices should be similar (allowing for small variations due to caching)
            expect(Math.abs(restPrice - wsPrice)).toBeLessThan(restPrice * 0.01); // Within 1%

            clearTimeout(timeout);
            resolve();
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });

        clientSocket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    it('should handle symbol search through REST API and WebSocket', async () => {
      // Test REST API search
      const restResponse = await request(app)
        .get('/api/market-data/search?q=AAPL')
        .expect(200);

      expect(restResponse.body).toHaveProperty('success', true);
      expect(restResponse.body).toHaveProperty('results');
      expect(Array.isArray(restResponse.body.results)).toBe(true);

      // Test WebSocket search
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket search test timeout'));
        }, 5000);

        clientSocket = ioc(`http://localhost:${serverPort}`);

        clientSocket.on('connect', () => {
          clientSocket.emit('symbol:search', {
            keywords: 'AAPL',
            requestId: 'integration-test'
          });
        });

        clientSocket.on('symbol:search:results', (data) => {
          try {
            expect(data).toHaveProperty('requestId', 'integration-test');
            expect(data).toHaveProperty('keywords', 'AAPL');
            expect(data).toHaveProperty('results');
            expect(Array.isArray(data.results)).toBe(true);

            // Results should be consistent between REST and WebSocket
            expect(data.results.length).toBe(restResponse.body.results.length);

            clearTimeout(timeout);
            resolve();
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });

        clientSocket.on('symbol:search:error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Search error: ${error.error}`));
        });
      });
    });

    it('should provide market overview data through REST and WebSocket', async () => {
      // Test REST API endpoints
      const [moversResponse, statusResponse] = await Promise.all([
        request(app).get('/api/market-data/movers').expect(200),
        request(app).get('/api/market-data/status').expect(200)
      ]);

      expect(moversResponse.body).toHaveProperty('success', true);
      expect(moversResponse.body).toHaveProperty('data');
      expect(moversResponse.body.data).toHaveProperty('topGainers');
      expect(moversResponse.body.data).toHaveProperty('topLosers');
      expect(moversResponse.body.data).toHaveProperty('mostActive');

      expect(statusResponse.body).toHaveProperty('success', true);
      expect(statusResponse.body).toHaveProperty('markets');

      // Test WebSocket market overview
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Market overview WebSocket test timeout'));
        }, 5000);

        clientSocket = ioc(`http://localhost:${serverPort}`);

        clientSocket.on('connect', () => {
          clientSocket.emit('market:overview:subscribe');
        });

        clientSocket.on('market:overview:data', (data) => {
          try {
            expect(data).toHaveProperty('movers');
            expect(data).toHaveProperty('status');
            expect(data).toHaveProperty('timestamp');

            // Data structure should match REST API
            expect(data.movers).toHaveProperty('topGainers');
            expect(data.movers).toHaveProperty('topLosers');
            expect(data.movers).toHaveProperty('mostActive');

            clearTimeout(timeout);
            resolve();
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
      });
    });

    it('should provide news data through REST and WebSocket', async () => {
      // Test REST API news endpoint
      const restResponse = await request(app)
        .get('/api/market-data/news?limit=5')
        .expect(200);

      expect(restResponse.body).toHaveProperty('success', true);
      expect(restResponse.body).toHaveProperty('data');
      expect(restResponse.body.data).toHaveProperty('feed');
      expect(restResponse.body.data).toHaveProperty('items');

      // Test WebSocket news subscription
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('News WebSocket test timeout'));
        }, 5000);

        clientSocket = ioc(`http://localhost:${serverPort}`);

        clientSocket.on('connect', () => {
          clientSocket.emit('news:subscribe');
        });

        clientSocket.on('news:data', (data) => {
          try {
            expect(data).toHaveProperty('feed');
            expect(data).toHaveProperty('items');
            expect(data).toHaveProperty('timestamp');
            expect(Array.isArray(data.feed)).toBe(true);

            clearTimeout(timeout);
            resolve();
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
      });
    });
  });

  describe('API Status and Monitoring Integration', () => {
    it('should provide consistent API status through REST and WebSocket handler', async () => {
      // Test REST API status
      const restResponse = await request(app)
        .get('/api/market-data/api-status')
        .expect(200);

      expect(restResponse.body).toHaveProperty('success', true);
      expect(restResponse.body).toHaveProperty('status');
      expect(restResponse.body.status).toHaveProperty('isUsingRealData');
      expect(restResponse.body.status).toHaveProperty('rateLimitInfo');

      // Get status from WebSocket handler
      const wsStatus = marketDataHandler.getApiStatus();

      expect(wsStatus).toHaveProperty('isUsingRealData');
      expect(wsStatus).toHaveProperty('rateLimitInfo');

      // Status should be consistent
      expect(wsStatus.isUsingRealData).toBe(restResponse.body.status.isUsingRealData);
      expect(wsStatus.rateLimitInfo.isDemoMode).toBe(restResponse.body.status.rateLimitInfo.isDemoMode);
    });

    it('should track subscription statistics correctly', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Subscription stats test timeout'));
        }, 5000);

        clientSocket = ioc(`http://localhost:${serverPort}`);

        clientSocket.on('connect', () => {
          // WebSocket handler doesn't track total sockets directly, only symbol subscriptions
          let initialStats = marketDataHandler.getSubscriptionStats();
          expect(initialStats.totalSymbols).toBe(0);

          // Subscribe to symbols
          clientSocket.emit('market:subscribe', { symbols: ['AAPL', 'GOOGL', 'MSFT'] });

          // Check stats after subscription
          setTimeout(() => {
            const stats = marketDataHandler.getSubscriptionStats();
            expect(stats.totalSymbols).toBe(3);
            expect(stats.symbolsMap).toHaveProperty('AAPL', 1);
            expect(stats.symbolsMap).toHaveProperty('GOOGL', 1);
            expect(stats.symbolsMap).toHaveProperty('MSFT', 1);

            clearTimeout(timeout);
            resolve();
          }, 100);
        });
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully across REST and WebSocket', async () => {
      // Test REST API error handling with invalid parameters
      const invalidResponse = await request(app)
        .get('/api/market-data/intraday/AAPL?interval=invalid')
        .expect(400);

      expect(invalidResponse.body).toHaveProperty('error');
      expect(invalidResponse.body).toHaveProperty('message');

      // Test WebSocket error handling
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Error handling test timeout'));
        }, 5000);

        // Mock the service to throw an error
        const originalSearchSymbol = MarketDataService.prototype.searchSymbol;
        vi.spyOn(MarketDataService.prototype, 'searchSymbol').mockRejectedValue(
          new Error('Integration test error')
        );

        clientSocket = ioc(`http://localhost:${serverPort}`);

        clientSocket.on('connect', () => {
          clientSocket.emit('symbol:search', {
            keywords: 'INVALID',
            requestId: 'error-test'
          });
        });

        clientSocket.on('symbol:search:error', (data) => {
          try {
            expect(data).toHaveProperty('requestId', 'error-test');
            expect(data).toHaveProperty('error');
            expect(data.error).toContain('Integration test error');

            // Restore the original method
            MarketDataService.prototype.searchSymbol = originalSearchSymbol;

            clearTimeout(timeout);
            resolve();
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
      });
    });

    it('should handle synthetic data mode consistently', async () => {
      // Ensure we're in synthetic mode by removing API key
      delete process.env.ALPHA_VANTAGE_API_KEY;

      // Test REST API in synthetic mode
      const restResponse = await request(app)
        .get('/api/market-data/quote/TESTSTOCK')
        .expect(200);

      expect(restResponse.body).toHaveProperty('success', true);
      expect(restResponse.body.data.price).toBeGreaterThan(0);

      // Test WebSocket in synthetic mode
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Synthetic mode test timeout'));
        }, 5000);

        clientSocket = ioc(`http://localhost:${serverPort}`);

        clientSocket.on('connect', () => {
          clientSocket.emit('market:subscribe', { symbols: ['TESTSTOCK'] });
        });

        clientSocket.on('market:data', (data) => {
          try {
            expect(Array.isArray(data)).toBe(true);
            expect(data[0]).toHaveProperty('symbol', 'TESTSTOCK');
            expect(data[0].price).toBeGreaterThan(0);

            // Verify API status shows synthetic mode
            const status = marketDataHandler.getApiStatus();
            expect(status.isUsingRealData).toBe(false);

            clearTimeout(timeout);
            resolve();
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple symbol subscriptions efficiently', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NFLX', 'NVDA'];

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Multiple subscription test timeout'));
        }, 10000);

        let receivedUpdates = 0;
        const expectedUpdates = symbols.length;

        clientSocket = ioc(`http://localhost:${serverPort}`);

        clientSocket.on('connect', () => {
          // Subscribe to multiple symbols
          clientSocket.emit('market:subscribe', { symbols });
        });

        clientSocket.on('market:data', (data) => {
          try {
            expect(Array.isArray(data)).toBe(true);
            receivedUpdates += data.length;

            // Check that we received data for all symbols
            if (receivedUpdates >= expectedUpdates) {
              const stats = marketDataHandler.getSubscriptionStats();
              expect(stats.totalSymbols).toBe(symbols.length);

              clearTimeout(timeout);
              resolve();
            }
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
      });
    });

    it('should handle rapid API requests without errors', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app).get(`/api/market-data/quote/STOCK${i}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.price).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Consistency and Caching', () => {
    it('should provide consistent data across multiple requests', async () => {
      const symbol = 'AAPL';

      // Make multiple requests for the same symbol
      const [response1, response2, response3] = await Promise.all([
        request(app).get(`/api/market-data/quote/${symbol}`),
        request(app).get(`/api/market-data/quote/${symbol}`),
        request(app).get(`/api/market-data/quote/${symbol}`)
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);

      // Prices should be consistent due to caching
      const price1 = response1.body.data.price;
      const price2 = response2.body.data.price;
      const price3 = response3.body.data.price;

      expect(price1).toBe(price2);
      expect(price2).toBe(price3);
    });

    it('should maintain data consistency between services', async () => {
      const symbol = 'AAPL';

      // Get data through REST API
      const restResponse = await request(app)
        .get(`/api/market-data/quote/${symbol}`)
        .expect(200);

      // Get data through direct service call
      const service = new MarketDataService();
      const [directPrice, directStats] = await Promise.all([
        service.getCurrentPrice(symbol),
        service.getMarketStats(symbol)
      ]);

      // Prices should be reasonably consistent (allowing for synthetic data variation)
      const priceDifference = Math.abs(restResponse.body.data.price - directPrice);
      const priceRatio = priceDifference / Math.max(restResponse.body.data.price, directPrice);
      expect(priceRatio).toBeLessThan(0.1); // Within 10% for synthetic data

      // Market stats should be consistent
      expect(typeof directStats.volume).toBe('number');
      expect(typeof directStats.open).toBe('number');
      expect(typeof directStats.high).toBe('number');
      expect(typeof directStats.low).toBe('number');
    });
  });
});