import { Server as SocketIOServer, Socket } from 'socket.io';
import { MarketDataService } from '../services/marketData.service';

export interface MarketDataUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  open?: number;
  high?: number;
  low?: number;
}

export interface SubscriptionData {
  symbols: string[];
  portfolioId?: string;
}

export class MarketDataHandler {
  private marketDataService: MarketDataService;
  private activeSubscriptions: Map<string, Set<string>> = new Map(); // socketId -> symbols
  private symbolSubscribers: Map<string, Set<string>> = new Map(); // symbol -> socketIds
  private updateInterval: NodeJS.Timeout | null = null;
  private marketOverviewInterval: NodeJS.Timeout | null = null;
  private newsInterval: NodeJS.Timeout | null = null;
  private lastPrices: Map<string, number> = new Map();

  constructor(private io: SocketIOServer) {
    this.marketDataService = new MarketDataService();
    this.setupEventHandlers();
    this.startPeriodicUpdates();
    this.startMarketOverviewUpdates();
    this.startNewsUpdates();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[MarketData] Client connected: ${socket.id}`);

      // Handle market data subscription
      socket.on('market:subscribe', (data: SubscriptionData) => {
        this.handleSubscription(socket, data);
      });

      // Handle unsubscription
      socket.on('market:unsubscribe', (symbols: string[]) => {
        this.handleUnsubscription(socket, symbols);
      });

      // Handle portfolio-specific market data
      socket.on('portfolio:subscribe', (portfolioId: string) => {
        socket.join(`portfolio:${portfolioId}`);
        console.log(`[MarketData] Client ${socket.id} subscribed to portfolio ${portfolioId}`);
      });

      // Handle market overview subscription
      socket.on('market:overview:subscribe', () => {
        socket.join('market:overview');
        console.log(`[MarketData] Client ${socket.id} subscribed to market overview`);
        this.sendInitialMarketOverview(socket);
      });

      // Handle news subscription
      socket.on('news:subscribe', (data?: { tickers?: string[]; topics?: string[] }) => {
        const room = data ? `news:${JSON.stringify(data)}` : 'news:general';
        socket.join(room);
        console.log(`[MarketData] Client ${socket.id} subscribed to news: ${room}`);
        this.sendInitialNews(socket, data?.tickers, data?.topics);
      });

      // Handle symbol search request
      socket.on('symbol:search', async (data: { keywords: string; requestId?: string }) => {
        try {
          const results = await this.marketDataService.searchSymbol(data.keywords);
          socket.emit('symbol:search:results', {
            requestId: data.requestId,
            keywords: data.keywords,
            results,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          socket.emit('symbol:search:error', {
            requestId: data.requestId,
            keywords: data.keywords,
            error: error instanceof Error ? error.message : 'Search failed',
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleSubscription(socket: Socket, data: SubscriptionData): void {
    const { symbols, portfolioId } = data;

    console.log(`[MarketData] Client ${socket.id} subscribing to symbols:`, symbols);

    // Initialize socket subscription if not exists
    if (!this.activeSubscriptions.has(socket.id)) {
      this.activeSubscriptions.set(socket.id, new Set());
    }

    const socketSymbols = this.activeSubscriptions.get(socket.id)!;

    // Add symbols to socket's subscription
    symbols.forEach(symbol => {
      socketSymbols.add(symbol);

      // Track which sockets are subscribed to each symbol
      if (!this.symbolSubscribers.has(symbol)) {
        this.symbolSubscribers.set(symbol, new Set());
      }
      this.symbolSubscribers.get(symbol)!.add(socket.id);
    });

    // Join portfolio room if specified
    if (portfolioId) {
      socket.join(`portfolio:${portfolioId}`);
    }

    // Send initial price data for subscribed symbols
    this.sendInitialPrices(socket, symbols);
  }

  private handleUnsubscription(socket: Socket, symbols: string[]): void {
    console.log(`[MarketData] Client ${socket.id} unsubscribing from symbols:`, symbols);

    const socketSymbols = this.activeSubscriptions.get(socket.id);
    if (!socketSymbols) return;

    symbols.forEach(symbol => {
      socketSymbols.delete(symbol);

      // Remove socket from symbol subscribers
      const subscribers = this.symbolSubscribers.get(symbol);
      if (subscribers) {
        subscribers.delete(socket.id);

        // Clean up empty symbol entries
        if (subscribers.size === 0) {
          this.symbolSubscribers.delete(symbol);
        }
      }
    });
  }

  private handleDisconnect(socket: Socket): void {
    console.log(`[MarketData] Client disconnected: ${socket.id}`);

    const socketSymbols = this.activeSubscriptions.get(socket.id);
    if (socketSymbols) {
      // Remove socket from all symbol subscribers
      socketSymbols.forEach(symbol => {
        const subscribers = this.symbolSubscribers.get(symbol);
        if (subscribers) {
          subscribers.delete(socket.id);

          // Clean up empty symbol entries
          if (subscribers.size === 0) {
            this.symbolSubscribers.delete(symbol);
          }
        }
      });

      // Remove socket subscription
      this.activeSubscriptions.delete(socket.id);
    }
  }

  private async sendInitialPrices(socket: Socket, symbols: string[]): Promise<void> {
    try {
      const priceUpdates: MarketDataUpdate[] = [];

      for (const symbol of symbols) {
        const [price, stats] = await Promise.all([
          this.marketDataService.getCurrentPrice(symbol),
          this.marketDataService.getMarketStats(symbol)
        ]);

        const lastPrice = this.lastPrices.get(symbol) || price;
        const change = price - lastPrice;
        const changePercent = lastPrice > 0 ? (change / lastPrice) * 100 : 0;

        const update: MarketDataUpdate = {
          symbol,
          price: Number(price.toFixed(2)),
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          volume: stats.volume,
          timestamp: new Date().toISOString(),
          open: stats.open,
          high: stats.high,
          low: stats.low
        };

        priceUpdates.push(update);
        this.lastPrices.set(symbol, price);
      }

      socket.emit('market:data', priceUpdates);
      console.log(`[MarketData] Sent initial prices for ${symbols.length} symbols to ${socket.id}`);

    } catch (error) {
      console.error(`[MarketData] Error sending initial prices:`, error);
      socket.emit('market:error', {
        message: 'Failed to fetch initial market data',
        symbols
      });
    }
  }

  private startPeriodicUpdates(): void {
    const updateInterval = parseInt(process.env.MARKET_DATA_UPDATE_INTERVAL || '60000');

    this.updateInterval = setInterval(async () => {
      await this.broadcastMarketUpdates();
    }, updateInterval);

    console.log(`[MarketData] Started periodic updates every ${updateInterval}ms`);
  }

  private async broadcastMarketUpdates(): Promise<void> {
    const allSymbols = Array.from(this.symbolSubscribers.keys());

    if (allSymbols.length === 0) {
      return; // No subscriptions, skip update
    }

    try {
      console.log(`[MarketData] Broadcasting updates for ${allSymbols.length} symbols`);

      const updates: MarketDataUpdate[] = [];

      // Batch fetch prices for all subscribed symbols
      for (const symbol of allSymbols) {
        try {
          const [price, stats] = await Promise.all([
            this.marketDataService.getCurrentPrice(symbol),
            this.marketDataService.getMarketStats(symbol)
          ]);

          const lastPrice = this.lastPrices.get(symbol) || price;
          const change = price - lastPrice;
          const changePercent = lastPrice > 0 ? (change / lastPrice) * 100 : 0;

          const update: MarketDataUpdate = {
            symbol,
            price: Number(price.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            volume: stats.volume,
            timestamp: new Date().toISOString(),
            open: stats.open,
            high: stats.high,
            low: stats.low
          };

          updates.push(update);
          this.lastPrices.set(symbol, price);

        } catch (error) {
          console.error(`[MarketData] Error fetching data for ${symbol}:`, error);
        }
      }

      // Broadcast updates to relevant subscribers
      updates.forEach(update => {
        const subscribers = this.symbolSubscribers.get(update.symbol);
        if (subscribers && subscribers.size > 0) {
          subscribers.forEach(socketId => {
            this.io.to(socketId).emit('market:update', update);
          });
        }
      });

      // Broadcast to general market feed
      if (updates.length > 0) {
        this.io.to('market:feed').emit('market:batch', updates);
      }

    } catch (error) {
      console.error(`[MarketData] Error during periodic update:`, error);
    }
  }

  // Portfolio-specific market data updates
  async broadcastPortfolioUpdate(portfolioId: string, assets: Array<{ symbol: string; quantity: number }>): Promise<void> {
    try {
      const portfolioData = [];

      for (const asset of assets) {
        const price = await this.marketDataService.getCurrentPrice(asset.symbol);
        const value = price * asset.quantity;

        portfolioData.push({
          symbol: asset.symbol,
          price: Number(price.toFixed(2)),
          quantity: asset.quantity,
          value: Number(value.toFixed(2)),
          timestamp: new Date().toISOString()
        });
      }

      this.io.to(`portfolio:${portfolioId}`).emit('portfolio:update', {
        portfolioId,
        assets: portfolioData,
        timestamp: new Date().toISOString()
      });

      console.log(`[MarketData] Broadcasted portfolio update for ${portfolioId}`);

    } catch (error) {
      console.error(`[MarketData] Error broadcasting portfolio update:`, error);
    }
  }

  // Manual price broadcast (for testing or immediate updates)
  async broadcastPriceUpdate(symbol: string): Promise<void> {
    try {
      const [price, stats] = await Promise.all([
        this.marketDataService.getCurrentPrice(symbol),
        this.marketDataService.getMarketStats(symbol)
      ]);

      const lastPrice = this.lastPrices.get(symbol) || price;
      const change = price - lastPrice;
      const changePercent = lastPrice > 0 ? (change / lastPrice) * 100 : 0;

      const update: MarketDataUpdate = {
        symbol,
        price: Number(price.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        volume: stats.volume,
        timestamp: new Date().toISOString(),
        open: stats.open,
        high: stats.high,
        low: stats.low
      };

      this.lastPrices.set(symbol, price);

      // Broadcast to specific symbol subscribers
      const subscribers = this.symbolSubscribers.get(symbol);
      if (subscribers && subscribers.size > 0) {
        subscribers.forEach(socketId => {
          this.io.to(socketId).emit('market:update', update);
        });
      }

      console.log(`[MarketData] Broadcasted update for ${symbol}: $${price}`);

    } catch (error) {
      console.error(`[MarketData] Error broadcasting price update for ${symbol}:`, error);
    }
  }

  // Get current subscription stats
  getSubscriptionStats(): { totalSockets: number; totalSymbols: number; symbolsMap: Record<string, number> } {
    const symbolsMap: Record<string, number> = {};

    this.symbolSubscribers.forEach((subscribers, symbol) => {
      symbolsMap[symbol] = subscribers.size;
    });

    return {
      totalSockets: this.activeSubscriptions.size,
      totalSymbols: this.symbolSubscribers.size,
      symbolsMap
    };
  }

  // Enhanced periodic updates for market overview
  private startMarketOverviewUpdates(): void {
    // Update market overview every 5 minutes
    this.marketOverviewInterval = setInterval(async () => {
      await this.broadcastMarketOverview();
    }, 5 * 60 * 1000);

    console.log('[MarketData] Started market overview updates every 5 minutes');
  }

  // News updates
  private startNewsUpdates(): void {
    // Update news every 10 minutes
    this.newsInterval = setInterval(async () => {
      await this.broadcastNews();
    }, 10 * 60 * 1000);

    console.log('[MarketData] Started news updates every 10 minutes');
  }

  // Send initial market overview to new subscribers
  private async sendInitialMarketOverview(socket: Socket): Promise<void> {
    try {
      const [movers, status] = await Promise.all([
        this.marketDataService.getMarketMovers(),
        this.marketDataService.getMarketStatus()
      ]);

      socket.emit('market:overview:data', {
        movers,
        status,
        timestamp: new Date().toISOString()
      });

      console.log(`[MarketData] Sent initial market overview to ${socket.id}`);
    } catch (error) {
      console.error('[MarketData] Error sending initial market overview:', error);
      socket.emit('market:overview:error', {
        message: 'Failed to fetch market overview',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Send initial news to new subscribers
  private async sendInitialNews(socket: Socket, tickers?: string[], topics?: string[]): Promise<void> {
    try {
      const news = await this.marketDataService.getNewsSentiment(tickers, topics, 20);

      socket.emit('news:data', {
        ...news,
        tickers,
        topics,
        timestamp: new Date().toISOString()
      });

      console.log(`[MarketData] Sent initial news to ${socket.id}`);
    } catch (error) {
      console.error('[MarketData] Error sending initial news:', error);
      socket.emit('news:error', {
        message: 'Failed to fetch news',
        tickers,
        topics,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Broadcast market overview to all subscribers
  private async broadcastMarketOverview(): Promise<void> {
    try {
      const [movers, status] = await Promise.all([
        this.marketDataService.getMarketMovers(),
        this.marketDataService.getMarketStatus()
      ]);

      const overview = {
        movers,
        status,
        timestamp: new Date().toISOString()
      };

      this.io.to('market:overview').emit('market:overview:update', overview);
      console.log('[MarketData] Broadcasted market overview update');
    } catch (error) {
      console.error('[MarketData] Error broadcasting market overview:', error);
    }
  }

  // Broadcast news updates
  private async broadcastNews(): Promise<void> {
    try {
      // Broadcast general news
      const generalNews = await this.marketDataService.getNewsSentiment(undefined, undefined, 20);
      this.io.to('news:general').emit('news:update', {
        ...generalNews,
        timestamp: new Date().toISOString()
      });

      console.log('[MarketData] Broadcasted general news update');

      // Note: For ticker-specific news, we would need to track which tickers
      // users are subscribed to and broadcast accordingly. This is a simplified implementation.
    } catch (error) {
      console.error('[MarketData] Error broadcasting news:', error);
    }
  }

  // Get enhanced subscription stats
  getSubscriptionStats(): {
    totalSockets: number;
    totalSymbols: number;
    symbolsMap: Record<string, number>;
    marketOverviewSubscribers: number;
    newsSubscribers: number;
  } {
    const symbolsMap: Record<string, number> = {};

    this.symbolSubscribers.forEach((subscribers, symbol) => {
      symbolsMap[symbol] = subscribers.size;
    });

    return {
      totalSockets: this.activeSubscriptions.size,
      totalSymbols: this.symbolSubscribers.size,
      symbolsMap,
      marketOverviewSubscribers: this.io.sockets.adapter.rooms.get('market:overview')?.size || 0,
      newsSubscribers: this.io.sockets.adapter.rooms.get('news:general')?.size || 0
    };
  }

  // Manual triggers for testing
  async triggerMarketOverviewUpdate(): Promise<void> {
    await this.broadcastMarketOverview();
  }

  async triggerNewsUpdate(): Promise<void> {
    await this.broadcastNews();
  }

  // Get API status for monitoring
  getApiStatus(): any {
    return this.marketDataService.getApiStatus();
  }

  // Cleanup resources
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.marketOverviewInterval) {
      clearInterval(this.marketOverviewInterval);
      this.marketOverviewInterval = null;
    }

    if (this.newsInterval) {
      clearInterval(this.newsInterval);
      this.newsInterval = null;
    }

    this.activeSubscriptions.clear();
    this.symbolSubscribers.clear();
    this.lastPrices.clear();

    console.log('[MarketData] Handler destroyed');
  }
}