import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { MarketDataHandler } from '../marketData.handler';
import { MarketDataService } from '../../services/marketData.service';

describe('MarketDataHandler', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let handler: MarketDataHandler;
  let clientSocket: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };

    // Create HTTP server and Socket.IO server
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: { origin: "*" }
    });

    // Create handler
    handler = new MarketDataHandler(io);

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        resolve();
      });
    });
  });

  afterEach(async () => {
    process.env = originalEnv;
    vi.restoreAllMocks();

    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }

    if (handler) {
      handler.destroy();
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

  describe('Client Connection and Disconnection', () => {
    it('should handle client connections', (done) => {
      io.on('connection', (socket) => {
        expect(socket.id).toBeDefined();
        expect(typeof socket.id).toBe('string');
        done();
      });

      // Simulate client connection
      const { Server } = require('socket.io');
      const { createServer } = require('http');
      const ioc = require('socket.io-client');

      const address = httpServer.address();
      clientSocket = ioc(`http://localhost:${address.port}`);
    });

    it('should handle client disconnections', (done) => {
      let socketId: string;

      io.on('connection', (socket) => {
        socketId = socket.id;

        socket.on('disconnect', () => {
          // Verify socket is removed from subscriptions
          const stats = handler.getSubscriptionStats();
          expect(stats.totalSockets).toBe(0);
          done();
        });

        // Disconnect after a brief moment
        setTimeout(() => {
          socket.disconnect();
        }, 50);
      });

      const { Server } = require('socket.io');
      const { createServer } = require('http');
      const ioc = require('socket.io-client');

      const address = httpServer.address();
      clientSocket = ioc(`http://localhost:${address.port}`);
    });
  });

  describe('Market Data Subscriptions', () => {
    it('should handle market data subscription', (done) => {
      io.on('connection', (socket) => {
        socket.on('market:subscribe', (data) => {
          expect(data).toHaveProperty('symbols');
          expect(Array.isArray(data.symbols)).toBe(true);
          expect(data.symbols).toContain('AAPL');

          // Verify subscription is tracked
          const stats = handler.getSubscriptionStats();
          expect(stats.totalSockets).toBe(1);
          expect(stats.symbolsMap).toHaveProperty('AAPL', 1);
          done();
        });

        // Emit subscription after connection
        setTimeout(() => {
          socket.emit('market:subscribe', { symbols: ['AAPL', 'GOOGL'] });
        }, 10);
      });

      const { Server } = require('socket.io');
      const { createServer } = require('http');
      const ioc = require('socket.io-client');

      const address = httpServer.address();
      clientSocket = ioc(`http://localhost:${address.port}`);
    });

    it('should handle market data unsubscription', (done) => {
      let testSocket: any;

      io.on('connection', (socket) => {
        testSocket = socket;

        socket.on('market:subscribe', () => {
          // After subscription, test unsubscription
          setTimeout(() => {
            socket.emit('market:unsubscribe', ['AAPL']);

            // Verify unsubscription
            setTimeout(() => {
              const stats = handler.getSubscriptionStats();
              expect(stats.symbolsMap).not.toHaveProperty('AAPL');
              expect(stats.symbolsMap).toHaveProperty('GOOGL', 1);
              done();
            }, 10);
          }, 10);
        });

        socket.on('market:unsubscribe', (symbols) => {
          expect(Array.isArray(symbols)).toBe(true);
          expect(symbols).toContain('AAPL');
        });

        // Subscribe first
        setTimeout(() => {
          socket.emit('market:subscribe', { symbols: ['AAPL', 'GOOGL'] });
        }, 10);
      });

      const { Server } = require('socket.io');
      const { createServer } = require('http');
      const ioc = require('socket.io-client');

      const address = httpServer.address();
      clientSocket = ioc(`http://localhost:${address.port}`);
    });

    it('should send initial price data on subscription', (done) => {
      let receivedData = false;

      io.on('connection', (socket) => {
        socket.on('market:data', (data) => {
          expect(Array.isArray(data)).toBe(true);
          expect(data.length).toBeGreaterThan(0);

          const priceUpdate = data[0];
          expect(priceUpdate).toHaveProperty('symbol');
          expect(priceUpdate).toHaveProperty('price');
          expect(priceUpdate).toHaveProperty('timestamp');
          expect(typeof priceUpdate.price).toBe('number');

          receivedData = true;
          done();
        });

        // Subscribe to get initial data
        setTimeout(() => {
          socket.emit('market:subscribe', { symbols: ['AAPL'] });
        }, 10);
      });

      const { Server } = require('socket.io');
      const { createServer } = require('http');
      const ioc = require('socket.io-client');

      const address = httpServer.address();
      clientSocket = ioc(`http://localhost:${address.port}`);
    });
  });

  describe('Portfolio Subscriptions', () => {
    it('should handle portfolio subscription', (done) => {
      io.on('connection', (socket) => {
        socket.on('portfolio:subscribe', (portfolioId) => {
          expect(typeof portfolioId).toBe('string');
          expect(portfolioId).toBe('test-portfolio-123');
          done();
        });

        setTimeout(() => {
          socket.emit('portfolio:subscribe', 'test-portfolio-123');
        }, 10);
      });

      const { Server } = require('socket.io');
      const { createServer } = require('http');
      const ioc = require('socket.io-client');

      const address = httpServer.address();
      clientSocket = ioc(`http://localhost:${address.port}`);
    });
  });

  describe('Market Overview Subscriptions', () => {
    it('should handle market overview subscription', (done) => {
      let receivedOverview = false;

      io.on('connection', (socket) => {
        socket.on('market:overview:data', (data) => {
          expect(data).toHaveProperty('movers');
          expect(data).toHaveProperty('status');
          expect(data).toHaveProperty('timestamp');
          expect(data.movers).toHaveProperty('topGainers');
          expect(data.movers).toHaveProperty('topLosers');
          expect(data.movers).toHaveProperty('mostActive');

          receivedOverview = true;
          done();
        });

        setTimeout(() => {
          socket.emit('market:overview:subscribe');
        }, 10);
      });

      const { Server } = require('socket.io');
      const { createServer } = require('http');
      const ioc = require('socket.io-client');

      const address = httpServer.address();
      clientSocket = ioc(`http://localhost:${address.port}`);
    });
  });

  describe('News Subscriptions', () => {
    it('should handle news subscription without parameters', (done) => {
      io.on('connection', (socket) => {
        socket.on('news:data', (data) => {
          expect(data).toHaveProperty('feed');
          expect(data).toHaveProperty('items');
          expect(data).toHaveProperty('timestamp');
          expect(Array.isArray(data.feed)).toBe(true);
          expect(typeof data.items).toBe('number');

          done();
        });

        setTimeout(() => {
          socket.emit('news:subscribe');
        }, 10);
      });

      const { Server } = require('socket.io');
      const { createServer } = require('http');
      const ioc = require('socket.io-client');

      const address = httpServer.address();
      clientSocket = ioc(`http://localhost:${address.port}`);
    });

    it('should handle news subscription with tickers and topics', (done) => {
      io.on('connection', (socket) => {
        socket.on('news:data', (data) => {
          expect(data).toHaveProperty('feed');
          expect(data).toHaveProperty('tickers');
          expect(data).toHaveProperty('topics');
          expect(data.tickers).toEqual(['AAPL', 'GOOGL']);
          expect(data.topics).toEqual(['technology']);

          done();
        });

        setTimeout(() => {
          socket.emit('news:subscribe', {
            tickers: ['AAPL', 'GOOGL'],
            topics: ['technology']
          });
        }, 10);
      });

      const { Server } = require('socket.io');
      const { createServer } = require('http');
      const ioc = require('socket.io-client');

      const address = httpServer.address();
      clientSocket = ioc(`http://localhost:${address.port}`);
    });
  });

  describe('Symbol Search', () => {
    it('should handle symbol search requests', (done) => {
      io.on('connection', (socket) => {
        socket.on('symbol:search:results', (data) => {
          expect(data).toHaveProperty('requestId', 'test-123');
          expect(data).toHaveProperty('keywords', 'AAPL');
          expect(data).toHaveProperty('results');
          expect(data).toHaveProperty('timestamp');
          expect(Array.isArray(data.results)).toBe(true);

          done();
        });

        setTimeout(() => {
          socket.emit('symbol:search', {
            keywords: 'AAPL',
            requestId: 'test-123'
          });
        }, 10);
      });

      const { Server } = require('socket.io');
      const { createServer } = require('http');
      const ioc = require('socket.io-client');

      const address = httpServer.address();
      clientSocket = ioc(`http://localhost:${address.port}`);
    });

    it('should handle symbol search errors', (done) => {
      // Mock MarketDataService to throw error
      vi.spyOn(MarketDataService.prototype, 'searchSymbol').mockRejectedValue(
        new Error('Search failed')
      );

      io.on('connection', (socket) => {
        socket.on('symbol:search:error', (data) => {
          expect(data).toHaveProperty('requestId', 'error-test');
          expect(data).toHaveProperty('keywords', 'INVALID');
          expect(data).toHaveProperty('error', 'Search failed');
          expect(data).toHaveProperty('timestamp');

          done();
        });

        setTimeout(() => {
          socket.emit('symbol:search', {
            keywords: 'INVALID',
            requestId: 'error-test'
          });
        }, 10);
      });

      const { Server } = require('socket.io');
      const { createServer } = require('http');
      const ioc = require('socket.io-client');

      const address = httpServer.address();
      clientSocket = ioc(`http://localhost:${address.port}`);
    });
  });

  describe('Subscription Statistics', () => {
    it('should provide accurate subscription statistics', async () => {
      const stats = handler.getSubscriptionStats();

      expect(stats).toHaveProperty('totalSockets');
      expect(stats).toHaveProperty('totalSymbols');
      expect(stats).toHaveProperty('symbolsMap');
      expect(stats).toHaveProperty('marketOverviewSubscribers');
      expect(stats).toHaveProperty('newsSubscribers');

      expect(typeof stats.totalSockets).toBe('number');
      expect(typeof stats.totalSymbols).toBe('number');
      expect(typeof stats.symbolsMap).toBe('object');
      expect(typeof stats.marketOverviewSubscribers).toBe('number');
      expect(typeof stats.newsSubscribers).toBe('number');
    });
  });

  describe('Portfolio Updates', () => {
    it('should broadcast portfolio updates to correct room', async () => {
      const portfolioId = 'test-portfolio-456';
      const assets = [
        { symbol: 'AAPL', quantity: 10 },
        { symbol: 'GOOGL', quantity: 5 }
      ];

      // This should not throw an error
      await expect(handler.broadcastPortfolioUpdate(portfolioId, assets)).resolves.not.toThrow();
    });
  });

  describe('Manual Price Updates', () => {
    it('should broadcast individual price updates', async () => {
      const symbol = 'AAPL';

      // This should not throw an error
      await expect(handler.broadcastPriceUpdate(symbol)).resolves.not.toThrow();
    });
  });

  describe('API Status', () => {
    it('should return API status information', () => {
      const status = handler.getApiStatus();

      expect(status).toHaveProperty('isUsingRealData');
      expect(status).toHaveProperty('rateLimitInfo');
      expect(typeof status.isUsingRealData).toBe('boolean');
      expect(typeof status.rateLimitInfo).toBe('object');
    });
  });

  describe('Manual Triggers', () => {
    it('should trigger market overview updates manually', async () => {
      await expect(handler.triggerMarketOverviewUpdate()).resolves.not.toThrow();
    });

    it('should trigger news updates manually', async () => {
      await expect(handler.triggerNewsUpdate()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in periodic updates gracefully', async () => {
      // Mock MarketDataService to throw errors
      vi.spyOn(MarketDataService.prototype, 'getCurrentPrice').mockRejectedValue(
        new Error('API Error')
      );

      // Trigger manual update - should not throw
      await expect(handler.broadcastPriceUpdate('AAPL')).resolves.not.toThrow();
    });

    it('should handle errors in market overview updates gracefully', async () => {
      // Mock MarketDataService to throw errors
      vi.spyOn(MarketDataService.prototype, 'getMarketMovers').mockRejectedValue(
        new Error('Movers API Error')
      );

      // Trigger manual update - should not throw
      await expect(handler.triggerMarketOverviewUpdate()).resolves.not.toThrow();
    });

    it('should handle errors in news updates gracefully', async () => {
      // Mock MarketDataService to throw errors
      vi.spyOn(MarketDataService.prototype, 'getNewsSentiment').mockRejectedValue(
        new Error('News API Error')
      );

      // Trigger manual update - should not throw
      await expect(handler.triggerNewsUpdate()).resolves.not.toThrow();
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should clean up resources properly on destroy', () => {
      const stats = handler.getSubscriptionStats();

      handler.destroy();

      // After destroy, all subscriptions should be cleared
      const newStats = handler.getSubscriptionStats();
      expect(newStats.totalSockets).toBe(0);
      expect(newStats.totalSymbols).toBe(0);
      expect(Object.keys(newStats.symbolsMap)).toHaveLength(0);
    });
  });
});