import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TradingDataService } from '../tradingData.service';
import type {
  MarketData,
  OrderBook,
  Trade,
  Portfolio,
  Position,
  Order,
  TradingStrategy,
  RiskMetrics,
  PerformanceMetrics,
} from '../tradingData.service';

describe('TradingDataService', () => {
  let tradingService: TradingDataService;
  const mockApiUrl = 'http://test-api.example.com';
  const mockWsUrl = 'ws://test-ws.example.com';
  const mockAuthToken = 'test-auth-token-123';

  beforeEach(() => {
    tradingService = new TradingDataService(mockApiUrl, mockWsUrl);
    vi.useFakeTimers();
  });

  afterEach(() => {
    tradingService.disconnect();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with API and WebSocket URLs', () => {
      expect(tradingService).toBeDefined();
      expect(tradingService.getConnectionStatus()).toEqual({
        api: 'disconnected',
        websocket: 'disconnected',
        authenticated: false,
      });
    });

    it('should authenticate with valid token', async () => {
      const result = await tradingService.authenticate(mockAuthToken);
      expect(result).toBe(true);
      expect(tradingService.getConnectionStatus().authenticated).toBe(true);
    });

    it('should reject invalid authentication', async () => {
      const result = await tradingService.authenticate('invalid-token');
      expect(result).toBe(false);
      expect(tradingService.getConnectionStatus().authenticated).toBe(false);
    });

    it('should establish WebSocket connection after authentication', async () => {
      await tradingService.authenticate(mockAuthToken);
      const connected = await tradingService.connect();
      expect(connected).toBe(true);
      expect(tradingService.getConnectionStatus().websocket).toBe('connected');
    });

    it('should handle reconnection on disconnect', async () => {
      await tradingService.authenticate(mockAuthToken);
      await tradingService.connect();

      const reconnectSpy = vi.fn();
      tradingService.onReconnect(reconnectSpy);

      // Simulate disconnect
      tradingService.simulateDisconnect();

      vi.advanceTimersByTime(5000);

      expect(reconnectSpy).toHaveBeenCalled();
      expect(tradingService.getConnectionStatus().websocket).toBe('connected');
    });
  });

  describe('market data', () => {
    beforeEach(async () => {
      await tradingService.authenticate(mockAuthToken);
      await tradingService.connect();
    });

    it('should fetch real-time market data for a symbol', async () => {
      const marketData = await tradingService.getMarketData('AAPL');

      expect(marketData).toMatchObject({
        symbol: 'AAPL',
        price: expect.any(Number),
        bid: expect.any(Number),
        ask: expect.any(Number),
        volume: expect.any(Number),
        high: expect.any(Number),
        low: expect.any(Number),
        open: expect.any(Number),
        previousClose: expect.any(Number),
        change: expect.any(Number),
        changePercent: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should subscribe to real-time price updates', async () => {
      const priceUpdateSpy = vi.fn();

      tradingService.subscribeToPriceUpdates('AAPL', priceUpdateSpy);

      // Simulate price updates
      await vi.advanceTimersByTime(1000);

      expect(priceUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'AAPL',
          price: expect.any(Number),
          timestamp: expect.any(String),
        })
      );
    });

    it('should unsubscribe from price updates', () => {
      const priceUpdateSpy = vi.fn();

      const unsubscribe = tradingService.subscribeToPriceUpdates('AAPL', priceUpdateSpy);
      unsubscribe();

      // Simulate price updates after unsubscribe
      vi.advanceTimersByTime(1000);

      expect(priceUpdateSpy).not.toHaveBeenCalled();
    });

    it('should fetch order book data', async () => {
      const orderBook = await tradingService.getOrderBook('AAPL');

      expect(orderBook).toMatchObject({
        symbol: 'AAPL',
        bids: expect.arrayContaining([
          expect.objectContaining({
            price: expect.any(Number),
            quantity: expect.any(Number),
            orderCount: expect.any(Number),
          }),
        ]),
        asks: expect.arrayContaining([
          expect.objectContaining({
            price: expect.any(Number),
            quantity: expect.any(Number),
            orderCount: expect.any(Number),
          }),
        ]),
        timestamp: expect.any(String),
      });
    });

    it('should fetch recent trades', async () => {
      const trades = await tradingService.getRecentTrades('AAPL', 100);

      expect(trades).toHaveLength(100);
      expect(trades[0]).toMatchObject({
        id: expect.any(String),
        symbol: 'AAPL',
        price: expect.any(Number),
        quantity: expect.any(Number),
        side: expect.stringMatching(/^(BUY|SELL)$/),
        timestamp: expect.any(String),
      });
    });

    it('should fetch historical data with different intervals', async () => {
      const intervals = ['1m', '5m', '15m', '1h', '1d'] as const;

      for (const interval of intervals) {
        const historicalData = await tradingService.getHistoricalData('AAPL', {
          interval,
          startDate: '2023-01-01',
          endDate: '2023-12-31',
        });

        expect(historicalData.length).toBeGreaterThan(0);
        expect(historicalData[0]).toMatchObject({
          timestamp: expect.any(String),
          open: expect.any(Number),
          high: expect.any(Number),
          low: expect.any(Number),
          close: expect.any(Number),
          volume: expect.any(Number),
        });
      }
    });
  });

  describe('portfolio management', () => {
    beforeEach(async () => {
      await tradingService.authenticate(mockAuthToken);
      await tradingService.connect();
    });

    it('should fetch user portfolio', async () => {
      const portfolio = await tradingService.getPortfolio();

      expect(portfolio).toMatchObject({
        id: expect.any(String),
        userId: expect.any(String),
        totalValue: expect.any(Number),
        availableCash: expect.any(Number),
        totalPnL: expect.any(Number),
        totalPnLPercent: expect.any(Number),
        positions: expect.any(Array),
        lastUpdated: expect.any(String),
      });
    });

    it('should fetch portfolio positions', async () => {
      const positions = await tradingService.getPositions();

      expect(positions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            symbol: expect.any(String),
            quantity: expect.any(Number),
            averagePrice: expect.any(Number),
            currentPrice: expect.any(Number),
            marketValue: expect.any(Number),
            pnl: expect.any(Number),
            pnlPercent: expect.any(Number),
            side: expect.stringMatching(/^(LONG|SHORT)$/),
          }),
        ])
      );
    });

    it('should calculate portfolio metrics', async () => {
      const metrics = await tradingService.getPortfolioMetrics();

      expect(metrics).toMatchObject({
        totalValue: expect.any(Number),
        dayChange: expect.any(Number),
        dayChangePercent: expect.any(Number),
        weekChange: expect.any(Number),
        weekChangePercent: expect.any(Number),
        monthChange: expect.any(Number),
        monthChangePercent: expect.any(Number),
        yearChange: expect.any(Number),
        yearChangePercent: expect.any(Number),
        allTimeChange: expect.any(Number),
        allTimeChangePercent: expect.any(Number),
      });
    });

    it('should track portfolio value history', async () => {
      const history = await tradingService.getPortfolioHistory({
        period: '1M',
        interval: '1d',
      });

      expect(history).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            timestamp: expect.any(String),
            value: expect.any(Number),
            change: expect.any(Number),
            changePercent: expect.any(Number),
          }),
        ])
      );
    });

    it('should subscribe to portfolio updates', () => {
      const updateSpy = vi.fn();

      tradingService.subscribeToPortfolioUpdates(updateSpy);

      vi.advanceTimersByTime(1000);

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          portfolio: expect.any(Object),
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('order management', () => {
    beforeEach(async () => {
      await tradingService.authenticate(mockAuthToken);
      await tradingService.connect();
    });

    it('should place market order', async () => {
      const order = await tradingService.placeOrder({
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 10,
        type: 'MARKET',
      });

      expect(order).toMatchObject({
        id: expect.any(String),
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 10,
        type: 'MARKET',
        status: 'FILLED',
        filledQuantity: 10,
        filledPrice: expect.any(Number),
        createdAt: expect.any(String),
        executedAt: expect.any(String),
      });
    });

    it('should place limit order', async () => {
      const order = await tradingService.placeOrder({
        symbol: 'AAPL',
        side: 'SELL',
        quantity: 5,
        type: 'LIMIT',
        price: 150.00,
      });

      expect(order).toMatchObject({
        id: expect.any(String),
        symbol: 'AAPL',
        side: 'SELL',
        quantity: 5,
        type: 'LIMIT',
        price: 150.00,
        status: expect.stringMatching(/^(PENDING|PARTIALLY_FILLED|FILLED)$/),
        filledQuantity: expect.any(Number),
        createdAt: expect.any(String),
      });
    });

    it('should place stop-loss order', async () => {
      const order = await tradingService.placeOrder({
        symbol: 'AAPL',
        side: 'SELL',
        quantity: 10,
        type: 'STOP_LOSS',
        stopPrice: 140.00,
      });

      expect(order).toMatchObject({
        id: expect.any(String),
        type: 'STOP_LOSS',
        stopPrice: 140.00,
        status: 'PENDING',
      });
    });

    it('should place stop-limit order', async () => {
      const order = await tradingService.placeOrder({
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 20,
        type: 'STOP_LIMIT',
        stopPrice: 145.00,
        price: 146.00,
      });

      expect(order).toMatchObject({
        id: expect.any(String),
        type: 'STOP_LIMIT',
        stopPrice: 145.00,
        price: 146.00,
        status: 'PENDING',
      });
    });

    it('should cancel order', async () => {
      const order = await tradingService.placeOrder({
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 10,
        type: 'LIMIT',
        price: 140.00,
      });

      const cancelled = await tradingService.cancelOrder(order.id);

      expect(cancelled).toBe(true);

      const cancelledOrder = await tradingService.getOrder(order.id);
      expect(cancelledOrder.status).toBe('CANCELLED');
    });

    it('should modify order', async () => {
      const order = await tradingService.placeOrder({
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 10,
        type: 'LIMIT',
        price: 140.00,
      });

      const modified = await tradingService.modifyOrder(order.id, {
        quantity: 15,
        price: 141.00,
      });

      expect(modified).toMatchObject({
        id: order.id,
        quantity: 15,
        price: 141.00,
      });
    });

    it('should fetch open orders', async () => {
      const orders = await tradingService.getOpenOrders();

      expect(orders).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            status: expect.stringMatching(/^(PENDING|PARTIALLY_FILLED)$/),
          }),
        ])
      );
    });

    it('should fetch order history', async () => {
      const history = await tradingService.getOrderHistory({
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        status: 'FILLED',
      });

      expect(history).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            status: 'FILLED',
            filledQuantity: expect.any(Number),
            filledPrice: expect.any(Number),
          }),
        ])
      );
    });

    it('should subscribe to order status updates', () => {
      const updateSpy = vi.fn();

      tradingService.subscribeToOrderUpdates(updateSpy);

      vi.advanceTimersByTime(1000);

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: expect.any(String),
          status: expect.any(String),
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('trading strategies', () => {
    beforeEach(async () => {
      await tradingService.authenticate(mockAuthToken);
      await tradingService.connect();
    });

    it('should create a new trading strategy', async () => {
      const strategy = await tradingService.createStrategy({
        name: 'Moving Average Crossover',
        type: 'TECHNICAL',
        parameters: {
          shortPeriod: 20,
          longPeriod: 50,
          symbol: 'AAPL',
          quantity: 100,
        },
        rules: {
          entry: 'shortMA > longMA',
          exit: 'shortMA < longMA',
          stopLoss: 0.02,
          takeProfit: 0.05,
        },
      });

      expect(strategy).toMatchObject({
        id: expect.any(String),
        name: 'Moving Average Crossover',
        type: 'TECHNICAL',
        status: 'ACTIVE',
        createdAt: expect.any(String),
      });
    });

    it('should backtest a strategy', async () => {
      const backtestResults = await tradingService.backtestStrategy({
        strategyId: 'strategy-1',
        startDate: '2022-01-01',
        endDate: '2023-12-31',
        initialCapital: 10000,
      });

      expect(backtestResults).toMatchObject({
        totalReturn: expect.any(Number),
        totalReturnPercent: expect.any(Number),
        sharpeRatio: expect.any(Number),
        maxDrawdown: expect.any(Number),
        winRate: expect.any(Number),
        totalTrades: expect.any(Number),
        profitableTrades: expect.any(Number),
        losingTrades: expect.any(Number),
        averageWin: expect.any(Number),
        averageLoss: expect.any(Number),
        profitFactor: expect.any(Number),
        trades: expect.any(Array),
      });
    });

    it('should optimize strategy parameters', async () => {
      const optimizationResults = await tradingService.optimizeStrategy({
        strategyId: 'strategy-1',
        parameters: [
          { name: 'shortPeriod', min: 10, max: 30, step: 5 },
          { name: 'longPeriod', min: 40, max: 60, step: 5 },
        ],
        optimizationTarget: 'sharpeRatio',
        startDate: '2022-01-01',
        endDate: '2023-12-31',
      });

      expect(optimizationResults).toMatchObject({
        bestParameters: expect.any(Object),
        bestValue: expect.any(Number),
        allResults: expect.any(Array),
      });
    });

    it('should get active strategies', async () => {
      const strategies = await tradingService.getActiveStrategies();

      expect(strategies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            status: 'ACTIVE',
            performance: expect.any(Object),
          }),
        ])
      );
    });

    it('should pause and resume strategy', async () => {
      const strategyId = 'strategy-1';

      const paused = await tradingService.pauseStrategy(strategyId);
      expect(paused).toBe(true);

      let strategy = await tradingService.getStrategy(strategyId);
      expect(strategy.status).toBe('PAUSED');

      const resumed = await tradingService.resumeStrategy(strategyId);
      expect(resumed).toBe(true);

      strategy = await tradingService.getStrategy(strategyId);
      expect(strategy.status).toBe('ACTIVE');
    });

    it('should delete strategy', async () => {
      const strategyId = 'strategy-1';

      const deleted = await tradingService.deleteStrategy(strategyId);
      expect(deleted).toBe(true);

      await expect(tradingService.getStrategy(strategyId)).rejects.toThrow('Strategy not found');
    });
  });

  describe('risk management', () => {
    beforeEach(async () => {
      await tradingService.authenticate(mockAuthToken);
      await tradingService.connect();
    });

    it('should calculate portfolio risk metrics', async () => {
      const riskMetrics = await tradingService.getRiskMetrics();

      expect(riskMetrics).toMatchObject({
        valueAtRisk: {
          oneDay: expect.any(Number),
          oneWeek: expect.any(Number),
          oneMonth: expect.any(Number),
        },
        beta: expect.any(Number),
        sharpeRatio: expect.any(Number),
        sortinoRatio: expect.any(Number),
        maxDrawdown: expect.any(Number),
        currentDrawdown: expect.any(Number),
        volatility: expect.any(Number),
        correlationToMarket: expect.any(Number),
      });
    });

    it('should set risk limits', async () => {
      const limits = await tradingService.setRiskLimits({
        maxPositionSize: 0.1, // 10% of portfolio
        maxLeverage: 2,
        maxDailyLoss: 0.02, // 2% daily loss limit
        maxDrawdown: 0.15, // 15% max drawdown
        stopLossRequired: true,
      });

      expect(limits).toMatchObject({
        maxPositionSize: 0.1,
        maxLeverage: 2,
        maxDailyLoss: 0.02,
        maxDrawdown: 0.15,
        stopLossRequired: true,
        active: true,
      });
    });

    it('should validate order against risk limits', async () => {
      await tradingService.setRiskLimits({
        maxPositionSize: 0.1,
        maxLeverage: 2,
      });

      const validation = await tradingService.validateOrderRisk({
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 1000,
        type: 'MARKET',
      });

      expect(validation).toMatchObject({
        isValid: expect.any(Boolean),
        violations: expect.any(Array),
        warnings: expect.any(Array),
      });
    });

    it('should trigger risk alerts', () => {
      const alertSpy = vi.fn();

      tradingService.subscribeToRiskAlerts(alertSpy);

      // Simulate risk alert
      vi.advanceTimersByTime(1000);

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
          severity: expect.stringMatching(/^(LOW|MEDIUM|HIGH|CRITICAL)$/),
          message: expect.any(String),
          timestamp: expect.any(String),
        })
      );
    });

    it('should calculate position sizing', async () => {
      const sizing = await tradingService.calculatePositionSize({
        symbol: 'AAPL',
        riskPercent: 0.01, // 1% risk per trade
        stopLossPercent: 0.02, // 2% stop loss
      });

      expect(sizing).toMatchObject({
        shares: expect.any(Number),
        positionValue: expect.any(Number),
        riskAmount: expect.any(Number),
      });
    });
  });

  describe('performance analytics', () => {
    beforeEach(async () => {
      await tradingService.authenticate(mockAuthToken);
      await tradingService.connect();
    });

    it('should calculate performance metrics', async () => {
      const performance = await tradingService.getPerformanceMetrics({
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      expect(performance).toMatchObject({
        totalReturn: expect.any(Number),
        annualizedReturn: expect.any(Number),
        winRate: expect.any(Number),
        profitFactor: expect.any(Number),
        sharpeRatio: expect.any(Number),
        calmarRatio: expect.any(Number),
        maxDrawdown: expect.any(Number),
        averageTrade: expect.any(Number),
        bestTrade: expect.any(Number),
        worstTrade: expect.any(Number),
        totalTrades: expect.any(Number),
      });
    });

    it('should generate performance report', async () => {
      const report = await tradingService.generatePerformanceReport({
        period: 'MONTHLY',
        year: 2023,
      });

      expect(report).toMatchObject({
        summary: expect.any(Object),
        monthlyReturns: expect.any(Array),
        topPerformers: expect.any(Array),
        worstPerformers: expect.any(Array),
        tradingStatistics: expect.any(Object),
      });
    });

    it('should compare performance to benchmark', async () => {
      const comparison = await tradingService.comparePerformance({
        benchmark: 'SPY',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      expect(comparison).toMatchObject({
        portfolioReturn: expect.any(Number),
        benchmarkReturn: expect.any(Number),
        alpha: expect.any(Number),
        beta: expect.any(Number),
        correlation: expect.any(Number),
        trackingError: expect.any(Number),
        informationRatio: expect.any(Number),
      });
    });

    it('should analyze trade patterns', async () => {
      const patterns = await tradingService.analyzeTradePatterns();

      expect(patterns).toMatchObject({
        bestTimeOfDay: expect.any(String),
        bestDayOfWeek: expect.any(String),
        averageHoldTime: expect.any(Number),
        mostTradedSymbols: expect.any(Array),
        winRateBySymbol: expect.any(Object),
        profitByTimeOfDay: expect.any(Object),
      });
    });
  });

  describe('data export and import', () => {
    beforeEach(async () => {
      await tradingService.authenticate(mockAuthToken);
      await tradingService.connect();
    });

    it('should export trading data to CSV', async () => {
      const csv = await tradingService.exportToCSV({
        dataType: 'TRADES',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      expect(csv).toMatch(/^Symbol,Side,Quantity,Price,Date/);
      expect(csv.split('\n').length).toBeGreaterThan(1);
    });

    it('should export to JSON format', async () => {
      const jsonData = await tradingService.exportToJSON({
        dataType: 'PORTFOLIO',
        includeHistory: true,
      });

      const parsed = JSON.parse(jsonData);
      expect(parsed).toMatchObject({
        portfolio: expect.any(Object),
        positions: expect.any(Array),
        history: expect.any(Array),
      });
    });

    it('should import trading strategies from file', async () => {
      const strategyData = JSON.stringify({
        strategies: [
          {
            name: 'Imported Strategy',
            type: 'TECHNICAL',
            parameters: {},
          },
        ],
      });

      const imported = await tradingService.importStrategies(strategyData);

      expect(imported).toMatchObject({
        successful: 1,
        failed: 0,
        strategies: expect.any(Array),
      });
    });
  });

  describe('alerts and notifications', () => {
    beforeEach(async () => {
      await tradingService.authenticate(mockAuthToken);
      await tradingService.connect();
    });

    it('should set price alert', async () => {
      const alert = await tradingService.setPriceAlert({
        symbol: 'AAPL',
        condition: 'ABOVE',
        price: 150.00,
        notification: {
          email: true,
          push: true,
        },
      });

      expect(alert).toMatchObject({
        id: expect.any(String),
        symbol: 'AAPL',
        condition: 'ABOVE',
        price: 150.00,
        active: true,
      });
    });

    it('should set volume alert', async () => {
      const alert = await tradingService.setVolumeAlert({
        symbol: 'AAPL',
        volumeThreshold: 1000000,
        timeWindow: '1H',
      });

      expect(alert).toMatchObject({
        id: expect.any(String),
        type: 'VOLUME',
        active: true,
      });
    });

    it('should trigger alerts when conditions are met', () => {
      const alertSpy = vi.fn();

      tradingService.subscribeToAlerts(alertSpy);

      // Simulate alert trigger
      vi.advanceTimersByTime(1000);

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          triggered: true,
          message: expect.any(String),
        })
      );
    });

    it('should manage alert subscriptions', async () => {
      const alerts = await tradingService.getActiveAlerts();

      expect(alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            active: true,
          }),
        ])
      );

      const alertId = alerts[0].id;
      const deleted = await tradingService.deleteAlert(alertId);

      expect(deleted).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      await tradingService.authenticate(mockAuthToken);

      // Simulate API error
      tradingService.simulateApiError();

      await expect(tradingService.getMarketData('INVALID')).rejects.toThrow('Failed to fetch market data');
    });

    it('should handle WebSocket disconnection', async () => {
      await tradingService.authenticate(mockAuthToken);
      await tradingService.connect();

      const disconnectSpy = vi.fn();
      tradingService.onDisconnect(disconnectSpy);

      tradingService.simulateDisconnect();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(tradingService.getConnectionStatus().websocket).toBe('disconnected');
    });

    it('should queue orders when offline', async () => {
      await tradingService.authenticate(mockAuthToken);

      // Disconnect to simulate offline
      tradingService.disconnect();

      const order = await tradingService.placeOrder({
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 10,
        type: 'MARKET',
      });

      expect(order.status).toBe('QUEUED');

      // Reconnect
      await tradingService.connect();

      // Check if order was sent
      const sentOrder = await tradingService.getOrder(order.id);
      expect(sentOrder.status).not.toBe('QUEUED');
    });

    it('should handle rate limiting', async () => {
      await tradingService.authenticate(mockAuthToken);

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(tradingService.getMarketData('AAPL'));
      }

      const results = await Promise.allSettled(promises);
      const rateLimited = results.filter(r => r.status === 'rejected' && r.reason.message.includes('rate limit'));

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});