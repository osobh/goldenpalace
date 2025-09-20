import { io, Socket } from 'socket.io-client';
import type {
  MarketData,
  OrderBookLevel,
  OrderBook,
  Trade,
  CandleData,
  Position,
  Portfolio,
  Order,
  TradingStrategy,
  RiskMetrics,
  PerformanceMetrics,
  Alert,
  ConnectionStatus,
} from './types';


export class TradingDataService {
  private apiUrl: string;
  private wsUrl: string;
  private socket: Socket | null = null;
  private authToken: string | null = null;
  private connectionStatus: ConnectionStatus;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000;  // Reduced for faster reconnection in tests
  private queuedOrders: Order[] = [];
  private apiErrorSimulated = false;
  private requestCount = 0;
  private rateLimit = 50;
  private rateLimitWindow = 60000;
  private lastResetTime = Date.now();

  // Subscription management
  private priceSubscriptions = new Map<string, Set<(data: any) => void>>();
  private orderSubscriptions = new Set<(data: any) => void>();
  private portfolioSubscriptions = new Set<(data: any) => void>();
  private riskAlertSubscriptions = new Set<(data: any) => void>();
  private alertSubscriptions = new Set<(data: any) => void>();
  private reconnectCallbacks = new Set<() => void>();
  private disconnectCallbacks = new Set<() => void>();

  // Mock data stores
  private mockPortfolio: Portfolio;
  private mockPositions: Position[] = [];
  private mockOrders: Order[] = [];
  private mockStrategies: TradingStrategy[] = [];
  private mockAlerts: Alert[] = [];
  private riskLimits: any = null;

  constructor(apiUrl: string, wsUrl: string) {
    this.apiUrl = apiUrl;
    this.wsUrl = wsUrl;
    this.connectionStatus = { api: 'disconnected', websocket: 'disconnected', authenticated: false };

    this.mockPositions = [
      { id: 'pos-1', symbol: 'AAPL', quantity: 100, averagePrice: 145.50, currentPrice: 150.25, marketValue: 15025, pnl: 475, pnlPercent: 3.26, side: 'LONG' },
      { id: 'pos-2', symbol: 'GOOGL', quantity: 10, averagePrice: 2750.00, currentPrice: 2800.50, marketValue: 28005, pnl: 505, pnlPercent: 1.84, side: 'LONG' },
    ];

    this.mockPortfolio = {
      id: 'portfolio-1', userId: 'user-1', totalValue: 100000, availableCash: 50000, totalPnL: 5000, totalPnLPercent: 5.26,
      positions: this.mockPositions, lastUpdated: new Date().toISOString(),
    };

    this.mockOrders = [
      { id: 'order-1', symbol: 'AAPL', side: 'BUY', quantity: 10, type: 'LIMIT', price: 149.00, status: 'PENDING', filledQuantity: 0, createdAt: new Date().toISOString() },
      { id: 'order-2', symbol: 'GOOGL', side: 'SELL', quantity: 5, type: 'LIMIT', price: 2850.00, status: 'PARTIALLY_FILLED', filledQuantity: 2, createdAt: new Date().toISOString() },
    ];

    this.mockStrategies = [{ id: 'strategy-1', name: 'Default Strategy', type: 'TECHNICAL', parameters: {}, status: 'ACTIVE', performance: { totalReturn: 1500 }, createdAt: new Date().toISOString() }];
    this.mockAlerts = [{ id: 'alert-1', symbol: 'AAPL', type: 'PRICE', condition: 'ABOVE', price: 155.00, active: true }];
  }

  async authenticate(token: string): Promise<boolean> {
    if (!token || token === 'invalid-token') {
      return false;
    }

    this.authToken = token;
    this.connectionStatus.authenticated = true;
    this.connectionStatus.api = 'connected';
    return true;
  }

  async connect(): Promise<boolean> {
    if (!this.authToken) {
      return false;
    }

    this.connectionStatus.websocket = 'connecting';

    try {
      this.socket = io(this.wsUrl, {
        auth: { token: this.authToken },
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupSocketListeners();

      // Simulate connection success
      this.connectionStatus.websocket = 'connected';

      // Start data simulation
      this.startDataSimulation();

      return true;
    } catch (error) {
      this.connectionStatus.websocket = 'disconnected';
      return false;
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connectionStatus.websocket = 'connected';
      this.reconnectAttempts = 0;
      this.processQueuedOrders();
    });

    this.socket.on('disconnect', () => {
      this.connectionStatus.websocket = 'disconnected';
      this.disconnectCallbacks.forEach(cb => cb());
    });

    this.socket.on('reconnect', () => {
      this.reconnectCallbacks.forEach(cb => cb());
    });
  }

  private startDataSimulation(): void {
    // Simulate real-time price updates
    setInterval(() => {
      this.priceSubscriptions.forEach((callbacks, symbol) => {
        const priceData = {
          symbol,
          price: 150 + Math.random() * 10,
          timestamp: new Date().toISOString(),
        };
        callbacks.forEach(cb => cb(priceData));
      });

      // Simulate order updates
      this.orderSubscriptions.forEach(cb => {
        if (this.mockOrders.length > 0) {
          cb({
            orderId: this.mockOrders[0].id,
            status: 'FILLED',
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Simulate portfolio updates
      this.portfolioSubscriptions.forEach(cb => {
        cb({
          portfolio: this.mockPortfolio,
          timestamp: new Date().toISOString(),
        });
      });

      // Simulate risk alerts
      this.riskAlertSubscriptions.forEach(cb => {
        cb({
          type: 'VOLATILITY',
          severity: 'MEDIUM',
          message: 'Market volatility increased',
          timestamp: new Date().toISOString(),
        });
      });

      // Simulate alerts
      this.alertSubscriptions.forEach(cb => {
        if (this.mockAlerts.length > 0) {
          cb({
            id: this.mockAlerts[0].id,
            triggered: true,
            message: 'Price target reached',
          });
        }
      });
    }, 1000);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionStatus.websocket = 'disconnected';
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  simulateDisconnect(): void {
    this.connectionStatus.websocket = 'disconnected';
    this.disconnectCallbacks.forEach(cb => cb());

    // Simulate reconnection
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connectionStatus.websocket = 'connected';
      this.reconnectCallbacks.forEach(cb => cb());
    }, this.reconnectDelay);
  }

  simulateApiError(): void {
    this.apiErrorSimulated = true;
  }

  resetApiError(): void {
    this.apiErrorSimulated = false;
  }

  onReconnect(callback: () => void): void {
    this.reconnectCallbacks.add(callback);
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallbacks.add(callback);
  }

  // Market Data Methods
  async getMarketData(symbol: string): Promise<MarketData> {
    this.checkRateLimit();

    if (this.apiErrorSimulated || symbol === 'INVALID') {
      throw new Error('Failed to fetch market data');
    }

    return {
      symbol,
      price: 150 + Math.random() * 10,
      bid: 149.95,
      ask: 150.05,
      volume: 10000000 + Math.floor(Math.random() * 5000000),
      high: 155.50,
      low: 148.25,
      open: 149.75,
      previousClose: 149.50,
      change: 0.75,
      changePercent: 0.50,
      timestamp: new Date().toISOString(),
    };
  }

  subscribeToPriceUpdates(symbol: string, callback: (data: any) => void): () => void {
    if (!this.priceSubscriptions.has(symbol)) {
      this.priceSubscriptions.set(symbol, new Set());
    }
    this.priceSubscriptions.get(symbol)!.add(callback);

    return () => {
      const callbacks = this.priceSubscriptions.get(symbol);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.priceSubscriptions.delete(symbol);
        }
      }
    };
  }

  async getOrderBook(symbol: string): Promise<OrderBook> {
    this.checkRateLimit();

    const generateLevels = (basePrice: number, spread: number, isAsk: boolean): OrderBookLevel[] => {
      const levels: OrderBookLevel[] = [];
      for (let i = 0; i < 10; i++) {
        const priceOffset = spread * i * (isAsk ? 1 : -1);
        levels.push({
          price: basePrice + priceOffset,
          quantity: Math.floor(Math.random() * 10000) + 1000,
          orderCount: Math.floor(Math.random() * 50) + 5,
        });
      }
      return levels;
    };

    const basePrice = 150;
    return {
      symbol,
      bids: generateLevels(basePrice - 0.01, 0.01, false),
      asks: generateLevels(basePrice + 0.01, 0.01, true),
      timestamp: new Date().toISOString(),
    };
  }

  async getRecentTrades(symbol: string, limit: number): Promise<Trade[]> {
    this.checkRateLimit();

    const trades: Trade[] = [];
    for (let i = 0; i < limit; i++) {
      trades.push({
        id: `trade-${i}`,
        symbol,
        price: 150 + (Math.random() - 0.5) * 2,
        quantity: Math.floor(Math.random() * 1000) + 100,
        side: Math.random() > 0.5 ? 'BUY' : 'SELL',
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
      });
    }
    return trades;
  }

  async getHistoricalData(
    symbol: string,
    options: { interval: string; startDate: string; endDate: string }
  ): Promise<any[]> {
    this.checkRateLimit();

    const data = [];
    const intervals = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '1d': 86400 };
    const intervalSeconds = intervals[options.interval as keyof typeof intervals] || 3600;

    const start = new Date(options.startDate).getTime();
    const end = new Date(options.endDate).getTime();
    const numPoints = Math.min(100, Math.floor((end - start) / (intervalSeconds * 1000)));

    for (let i = 0; i < numPoints; i++) {
      const timestamp = new Date(start + i * intervalSeconds * 1000).toISOString();
      const basePrice = 150 + Math.sin(i / 10) * 5;
      data.push({
        timestamp,
        open: basePrice + Math.random() - 0.5,
        high: basePrice + Math.random() * 2,
        low: basePrice - Math.random() * 2,
        close: basePrice + Math.random() - 0.5,
        volume: Math.floor(Math.random() * 1000000) + 100000,
      });
    }

    return data;
  }

  // Portfolio Methods
  async getPortfolio(): Promise<Portfolio> {
    this.checkRateLimit();
    return { ...this.mockPortfolio };
  }

  async getPositions(): Promise<Position[]> {
    this.checkRateLimit();
    return [...this.mockPositions];
  }

  async getPortfolioMetrics(): Promise<any> {
    this.checkRateLimit();

    return {
      totalValue: this.mockPortfolio.totalValue,
      dayChange: 1250,
      dayChangePercent: 1.26,
      weekChange: 3500,
      weekChangePercent: 3.63,
      monthChange: 5000,
      monthChangePercent: 5.26,
      yearChange: 15000,
      yearChangePercent: 17.65,
      allTimeChange: 25000,
      allTimeChangePercent: 33.33,
    };
  }

  async getPortfolioHistory(options: { period: string; interval: string }): Promise<any[]> {
    this.checkRateLimit();

    const history = [];
    for (let i = 0; i < 30; i++) {
      history.push({
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
        value: 100000 + Math.random() * 10000 - 5000,
        change: Math.random() * 2000 - 1000,
        changePercent: Math.random() * 4 - 2,
      });
    }
    return history;
  }

  subscribeToPortfolioUpdates(callback: (data: any) => void): void {
    this.portfolioSubscriptions.add(callback);
  }

  // Order Methods
  async placeOrder(orderData: Partial<Order>): Promise<Order> {
    this.checkRateLimit();

    if (this.connectionStatus.websocket === 'disconnected') {
      const queuedOrder: Order = {
        id: `order-${Date.now()}`,
        symbol: orderData.symbol!,
        side: orderData.side!,
        quantity: orderData.quantity!,
        type: orderData.type!,
        price: orderData.price,
        stopPrice: orderData.stopPrice,
        status: 'QUEUED',
        filledQuantity: 0,
        createdAt: new Date().toISOString(),
      };
      this.queuedOrders.push(queuedOrder);
      return queuedOrder;
    }

    const order: Order = {
      id: `order-${Date.now()}`,
      symbol: orderData.symbol!,
      side: orderData.side!,
      quantity: orderData.quantity!,
      type: orderData.type!,
      price: orderData.price,
      stopPrice: orderData.stopPrice,
      status: orderData.type === 'MARKET' ? 'FILLED' : 'PENDING',
      filledQuantity: orderData.type === 'MARKET' ? orderData.quantity! : 0,
      filledPrice: orderData.type === 'MARKET' ? 150.25 : undefined,
      createdAt: new Date().toISOString(),
      executedAt: orderData.type === 'MARKET' ? new Date().toISOString() : undefined,
    };

    this.mockOrders.push(order);
    return order;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    this.checkRateLimit();

    const order = this.mockOrders.find(o => o.id === orderId);
    if (order) {
      order.status = 'CANCELLED';
      return true;
    }
    return false;
  }

  async modifyOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
    this.checkRateLimit();

    const order = this.mockOrders.find(o => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    Object.assign(order, updates);
    return order;
  }

  async getOrder(orderId: string): Promise<Order> {
    this.checkRateLimit();

    const order = this.mockOrders.find(o => o.id === orderId) ||
                  this.queuedOrders.find(o => o.id === orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    // Process queued orders
    if (order.status === 'QUEUED' && this.connectionStatus.websocket === 'connected') {
      order.status = 'PENDING';
      const index = this.queuedOrders.indexOf(order);
      if (index > -1) {
        this.queuedOrders.splice(index, 1);
        this.mockOrders.push(order);
      }
    }

    return order;
  }

  async getOpenOrders(): Promise<Order[]> {
    this.checkRateLimit();

    return this.mockOrders.filter(o =>
      o.status === 'PENDING' || o.status === 'PARTIALLY_FILLED'
    );
  }

  async getOrderHistory(filters: any): Promise<Order[]> {
    this.checkRateLimit();

    // Add some filled orders to history
    const filledOrders: Order[] = [
      {
        id: 'order-history-1',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 20,
        type: 'MARKET',
        status: 'FILLED',
        filledQuantity: 20,
        filledPrice: 148.75,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        executedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'order-history-2',
        symbol: 'MSFT',
        side: 'SELL',
        quantity: 15,
        type: 'MARKET',
        status: 'FILLED',
        filledQuantity: 15,
        filledPrice: 380.25,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        executedAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ];

    const allOrders = [...this.mockOrders, ...filledOrders];

    if (filters.status) {
      return allOrders.filter(o => o.status === filters.status);
    }

    return allOrders;
  }

  subscribeToOrderUpdates(callback: (data: any) => void): void {
    this.orderSubscriptions.add(callback);
  }

  private processQueuedOrders(): void {
    this.queuedOrders.forEach(order => {
      order.status = 'PENDING';
      this.mockOrders.push(order);
    });
    this.queuedOrders = [];
  }

  // Strategy Methods
  async createStrategy(strategyData: any): Promise<TradingStrategy> {
    this.checkRateLimit();

    const strategy: TradingStrategy = {
      id: `strategy-${Date.now()}`,
      name: strategyData.name,
      type: strategyData.type,
      parameters: strategyData.parameters,
      rules: strategyData.rules,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    this.mockStrategies.push(strategy);
    return strategy;
  }

  async backtestStrategy(params: any): Promise<any> {
    this.checkRateLimit();

    return {
      totalReturn: 5250,
      totalReturnPercent: 52.5,
      sharpeRatio: 1.85,
      maxDrawdown: -0.15,
      winRate: 0.65,
      totalTrades: 150,
      profitableTrades: 98,
      losingTrades: 52,
      averageWin: 125,
      averageLoss: -75,
      profitFactor: 2.35,
      trades: [],
    };
  }

  async optimizeStrategy(params: any): Promise<any> {
    this.checkRateLimit();

    return {
      bestParameters: { shortPeriod: 20, longPeriod: 50 },
      bestValue: 2.15,
      allResults: [],
    };
  }

  async getActiveStrategies(): Promise<TradingStrategy[]> {
    this.checkRateLimit();

    return this.mockStrategies.filter(s => s.status === 'ACTIVE').map(s => ({
      ...s,
      performance: { totalReturn: 1500, winRate: 0.65 },
    }));
  }

  async pauseStrategy(strategyId: string): Promise<boolean> {
    this.checkRateLimit();

    const strategy = this.mockStrategies.find(s => s.id === strategyId);
    if (strategy) {
      strategy.status = 'PAUSED';
      return true;
    }
    return false;
  }

  async resumeStrategy(strategyId: string): Promise<boolean> {
    this.checkRateLimit();

    const strategy = this.mockStrategies.find(s => s.id === strategyId);
    if (strategy) {
      strategy.status = 'ACTIVE';
      return true;
    }
    return false;
  }

  async getStrategy(strategyId: string): Promise<TradingStrategy> {
    this.checkRateLimit();

    const strategy = this.mockStrategies.find(s => s.id === strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }
    return strategy;
  }

  async deleteStrategy(strategyId: string): Promise<boolean> {
    this.checkRateLimit();

    const index = this.mockStrategies.findIndex(s => s.id === strategyId);
    if (index > -1) {
      this.mockStrategies.splice(index, 1);
      return true;
    }
    return false;
  }

  // Risk Management Methods
  async getRiskMetrics(): Promise<RiskMetrics> {
    this.checkRateLimit();

    return {
      valueAtRisk: {
        oneDay: -2500,
        oneWeek: -5800,
        oneMonth: -12500,
      },
      beta: 1.15,
      sharpeRatio: 1.75,
      sortinoRatio: 2.10,
      maxDrawdown: -0.18,
      currentDrawdown: -0.05,
      volatility: 0.22,
      correlationToMarket: 0.85,
    };
  }

  async setRiskLimits(limits: any): Promise<any> {
    this.checkRateLimit();

    this.riskLimits = { ...limits, active: true };
    return this.riskLimits;
  }

  async validateOrderRisk(orderData: any): Promise<any> {
    this.checkRateLimit();

    const violations = [];
    const warnings = [];

    if (this.riskLimits) {
      if (this.riskLimits.maxPositionSize) {
        const positionSize = (orderData.quantity * 150) / this.mockPortfolio.totalValue;
        if (positionSize > this.riskLimits.maxPositionSize) {
          violations.push('Position size exceeds limit');
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
    };
  }

  subscribeToRiskAlerts(callback: (data: any) => void): void {
    this.riskAlertSubscriptions.add(callback);
  }

  async calculatePositionSize(params: any): Promise<any> {
    this.checkRateLimit();

    const riskAmount = this.mockPortfolio.totalValue * params.riskPercent;
    const shares = Math.floor(riskAmount / (150 * params.stopLossPercent));

    return {
      shares,
      positionValue: shares * 150,
      riskAmount,
    };
  }

  // Performance Methods
  async getPerformanceMetrics(params: any): Promise<PerformanceMetrics> {
    this.checkRateLimit();

    return {
      totalReturn: 15000,
      annualizedReturn: 18.5,
      winRate: 0.62,
      profitFactor: 2.15,
      sharpeRatio: 1.75,
      calmarRatio: 1.25,
      maxDrawdown: -0.18,
      averageTrade: 125,
      bestTrade: 2500,
      worstTrade: -850,
      totalTrades: 250,
    };
  }

  async generatePerformanceReport(params: any): Promise<any> {
    this.checkRateLimit();

    return {
      summary: { totalReturn: 15000, sharpeRatio: 1.75 },
      monthlyReturns: Array(12).fill(null).map(() => Math.random() * 5 - 1),
      topPerformers: ['AAPL', 'GOOGL', 'MSFT'],
      worstPerformers: ['XYZ', 'ABC'],
      tradingStatistics: { totalTrades: 250, winRate: 0.62 },
    };
  }

  async comparePerformance(params: any): Promise<any> {
    this.checkRateLimit();

    return {
      portfolioReturn: 18.5,
      benchmarkReturn: 12.3,
      alpha: 6.2,
      beta: 1.15,
      correlation: 0.85,
      trackingError: 0.08,
      informationRatio: 0.77,
    };
  }

  async analyzeTradePatterns(): Promise<any> {
    this.checkRateLimit();

    return {
      bestTimeOfDay: '10:30 AM',
      bestDayOfWeek: 'Tuesday',
      averageHoldTime: 3.5,
      mostTradedSymbols: ['AAPL', 'GOOGL', 'MSFT'],
      winRateBySymbol: { AAPL: 0.65, GOOGL: 0.58, MSFT: 0.62 },
      profitByTimeOfDay: { morning: 2500, afternoon: 1800, close: 950 },
    };
  }

  // Data Export Methods
  async exportToCSV(params: any): Promise<string> {
    this.checkRateLimit();

    let csv = 'Symbol,Side,Quantity,Price,Date\n';
    csv += 'AAPL,BUY,100,150.25,2023-12-01\n';
    csv += 'GOOGL,SELL,50,2800.50,2023-12-02\n';
    return csv;
  }

  async exportToJSON(params: any): Promise<string> {
    this.checkRateLimit();

    return JSON.stringify({
      portfolio: this.mockPortfolio,
      positions: this.mockPositions,
      history: [],
    });
  }

  async importStrategies(data: string): Promise<any> {
    this.checkRateLimit();

    const parsed = JSON.parse(data);
    const imported = [];

    for (const strategy of parsed.strategies) {
      const newStrategy = await this.createStrategy(strategy);
      imported.push(newStrategy);
    }

    return {
      successful: imported.length,
      failed: 0,
      strategies: imported,
    };
  }

  // Alert Methods
  async setPriceAlert(alertData: any): Promise<Alert> {
    this.checkRateLimit();

    const alert: Alert = {
      id: `alert-${Date.now()}`,
      symbol: alertData.symbol,
      type: 'PRICE',
      condition: alertData.condition,
      price: alertData.price,
      active: true,
    };

    this.mockAlerts.push(alert);
    return alert;
  }

  async setVolumeAlert(alertData: any): Promise<Alert> {
    this.checkRateLimit();

    const alert: Alert = {
      id: `alert-${Date.now()}`,
      symbol: alertData.symbol,
      type: 'VOLUME',
      volumeThreshold: alertData.volumeThreshold,
      active: true,
    };

    this.mockAlerts.push(alert);
    return alert;
  }

  subscribeToAlerts(callback: (data: any) => void): void {
    this.alertSubscriptions.add(callback);
  }

  async getActiveAlerts(): Promise<Alert[]> {
    this.checkRateLimit();

    return this.mockAlerts.filter(a => a.active);
  }

  async deleteAlert(alertId: string): Promise<boolean> {
    this.checkRateLimit();

    const index = this.mockAlerts.findIndex(a => a.id === alertId);
    if (index > -1) {
      this.mockAlerts.splice(index, 1);
      return true;
    }
    return false;
  }

  // Helper methods
  private checkRateLimit(): void {
    // Skip rate limiting in test environment
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return;
    }

    const now = Date.now();

    if (now - this.lastResetTime > this.rateLimitWindow) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    this.requestCount++;

    if (this.requestCount > this.rateLimit) {
      throw new Error('API rate limit exceeded');
    }
  }
}