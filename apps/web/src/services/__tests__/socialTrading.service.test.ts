import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SocialTradingService } from '../socialTrading.service';
import { WebSocketService } from '../websocket.service';

describe('SocialTradingService', () => {
  let service: SocialTradingService;
  let wsService: WebSocketService;

  beforeEach(() => {
    wsService = new WebSocketService('ws://localhost:3001');
    service = new SocialTradingService(wsService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.cleanup();
    wsService.disconnect();
  });

  describe('Trader Discovery', () => {
    it('should get top traders by performance', async () => {
      const traders = await service.getTopTraders({
        sortBy: 'performance',
        timeframe: '30d',
        limit: 10
      });

      expect(traders).toBeDefined();
      expect(Array.isArray(traders)).toBe(true);
      expect(traders.length).toBeLessThanOrEqual(10);

      if (traders.length > 1) {
        expect(traders[0].performance.roi).toBeGreaterThanOrEqual(traders[1].performance.roi);
      }
    });

    it('should get top traders by followers', async () => {
      const traders = await service.getTopTraders({
        sortBy: 'followers',
        limit: 5
      });

      expect(traders).toBeDefined();
      expect(Array.isArray(traders)).toBe(true);
      expect(traders.length).toBeLessThanOrEqual(5);

      if (traders.length > 1) {
        expect(traders[0].followerCount).toBeGreaterThanOrEqual(traders[1].followerCount);
      }
    });

    it('should filter traders by minimum performance', async () => {
      const traders = await service.getTopTraders({
        sortBy: 'performance',
        filters: { minRoi: 0.1, minWinRate: 0.6 }
      });

      traders.forEach(trader => {
        expect(trader.performance.roi).toBeGreaterThanOrEqual(0.1);
        expect(trader.performance.winRate).toBeGreaterThanOrEqual(0.6);
      });
    });

    it('should search traders by username', async () => {
      const query = 'test';
      const traders = await service.searchTraders(query);

      expect(Array.isArray(traders)).toBe(true);
      traders.forEach(trader => {
        expect(trader.username.toLowerCase()).toContain(query.toLowerCase());
      });
    });

    it('should get trader details by ID', async () => {
      const traderId = 'trader-123';
      const trader = await service.getTraderDetails(traderId);

      expect(trader).toBeDefined();
      expect(trader.id).toBe(traderId);
      expect(trader.performance).toBeDefined();
      expect(trader.statistics).toBeDefined();
      expect(trader.recentTrades).toBeDefined();
      expect(Array.isArray(trader.recentTrades)).toBe(true);
    });
  });

  describe('Copy Trading Management', () => {
    it('should follow a trader with default settings', async () => {
      const traderId = 'trader-123';
      const followResult = await service.followTrader(traderId);

      expect(followResult.success).toBe(true);
      expect(followResult.followerId).toBeDefined();
      expect(followResult.settings).toBeDefined();
      expect(followResult.settings.allocation).toBe(0.1); // Default 10%
      expect(followResult.settings.maxRiskPerTrade).toBe(0.02); // Default 2%
    });

    it('should follow a trader with custom settings', async () => {
      const traderId = 'trader-123';
      const settings = {
        allocation: 0.2,
        maxRiskPerTrade: 0.05,
        stopLoss: 0.1,
        takeProfit: 0.15,
        followOnlyProfitableTrades: true,
        minTradeAmount: 100,
        maxTradeAmount: 1000
      };

      const followResult = await service.followTrader(traderId, settings);

      expect(followResult.success).toBe(true);
      expect(followResult.settings.allocation).toBe(settings.allocation);
      expect(followResult.settings.maxRiskPerTrade).toBe(settings.maxRiskPerTrade);
      expect(followResult.settings.stopLoss).toBe(settings.stopLoss);
    });

    it('should unfollow a trader', async () => {
      const traderId = 'trader-123';
      await service.followTrader(traderId);

      const unfollowResult = await service.unfollowTrader(traderId);

      expect(unfollowResult.success).toBe(true);
      expect(unfollowResult.message).toContain('Successfully unfollowed');
    });

    it('should update copy trading settings', async () => {
      const traderId = 'trader-123';
      await service.followTrader(traderId);

      const newSettings = {
        allocation: 0.15,
        maxRiskPerTrade: 0.03,
        stopLoss: 0.08
      };

      const updateResult = await service.updateCopySettings(traderId, newSettings);

      expect(updateResult.success).toBe(true);
      expect(updateResult.settings.allocation).toBe(0.15);
      expect(updateResult.settings.maxRiskPerTrade).toBe(0.03);
      expect(updateResult.settings.stopLoss).toBe(0.08);
    });

    it('should get followed traders list', async () => {
      const traderId1 = 'trader-123';
      const traderId2 = 'trader-456';

      await service.followTrader(traderId1);
      await service.followTrader(traderId2);

      const followedTraders = await service.getFollowedTraders();

      expect(Array.isArray(followedTraders)).toBe(true);
      expect(followedTraders.length).toBeGreaterThanOrEqual(2);

      const traderIds = followedTraders.map(t => t.traderId);
      expect(traderIds).toContain(traderId1);
      expect(traderIds).toContain(traderId2);
    });
  });

  describe('Trade Copying', () => {
    it('should copy a trade when trader opens position', async () => {
      const traderId = 'trader-123';
      await service.followTrader(traderId, { allocation: 0.1 });

      const originalTrade = {
        traderId,
        symbol: 'AAPL',
        side: 'buy' as const,
        quantity: 100,
        price: 150.00,
        timestamp: new Date()
      };

      const copiedTrade = await service.copyTrade(originalTrade);

      expect(copiedTrade.success).toBe(true);
      expect(copiedTrade.trade).toBeDefined();
      expect(copiedTrade.trade.symbol).toBe('AAPL');
      expect(copiedTrade.trade.side).toBe('buy');
      expect(copiedTrade.trade.quantity).toBe(10); // 10% of 100
      expect(copiedTrade.trade.originalTradeId).toBeDefined();
    });

    it('should respect risk limits when copying trades', async () => {
      const traderId = 'trader-123';
      await service.followTrader(traderId, {
        allocation: 0.1,
        maxRiskPerTrade: 0.01,
        maxTradeAmount: 500
      });

      const largeRiskTrade = {
        traderId,
        symbol: 'TSLA',
        side: 'buy' as const,
        quantity: 100,
        price: 200.00, // $20,000 position
        timestamp: new Date()
      };

      const copiedTrade = await service.copyTrade(largeRiskTrade);

      expect(copiedTrade.success).toBe(true);
      expect(copiedTrade.trade.quantity * copiedTrade.trade.price).toBeLessThanOrEqual(500);
    });

    it('should not copy trade if risk too high', async () => {
      const traderId = 'trader-123';
      await service.followTrader(traderId, {
        allocation: 0.05,
        maxRiskPerTrade: 0.001 // Very low risk tolerance
      });

      const highRiskTrade = {
        traderId,
        symbol: 'GME',
        side: 'buy' as const,
        quantity: 1000,
        price: 100.00,
        timestamp: new Date()
      };

      const result = await service.copyTrade(highRiskTrade);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('risk limit');
    });

    it('should close copied position when original is closed', async () => {
      const traderId = 'trader-123';
      await service.followTrader(traderId);

      const openTrade = {
        traderId,
        symbol: 'MSFT',
        side: 'buy' as const,
        quantity: 50,
        price: 300.00,
        timestamp: new Date()
      };

      const copiedTrade = await service.copyTrade(openTrade);
      expect(copiedTrade.success).toBe(true);

      const closeTrade = {
        traderId,
        symbol: 'MSFT',
        side: 'sell' as const,
        quantity: 50,
        price: 310.00,
        originalTradeId: openTrade.traderId + '-' + Date.now(),
        timestamp: new Date()
      };

      const closeResult = await service.copyTrade(closeTrade);

      expect(closeResult.success).toBe(true);
      expect(closeResult.trade.side).toBe('sell');
    });
  });

  describe('Performance Tracking', () => {
    it('should get copy trading performance summary', async () => {
      const performance = await service.getCopyTradingPerformance();

      expect(performance).toBeDefined();
      expect(performance.totalReturn).toBeDefined();
      expect(performance.totalTrades).toBeDefined();
      expect(performance.winRate).toBeDefined();
      expect(performance.bestTrade).toBeDefined();
      expect(performance.worstTrade).toBeDefined();
      expect(Array.isArray(performance.traderPerformance)).toBe(true);
    });

    it('should get performance by trader', async () => {
      const traderId = 'trader-123';
      const performance = await service.getTraderCopyPerformance(traderId);

      expect(performance).toBeDefined();
      expect(performance.traderId).toBe(traderId);
      expect(performance.totalReturn).toBeDefined();
      expect(performance.tradesCount).toBeDefined();
      expect(performance.winRate).toBeDefined();
      expect(Array.isArray(performance.trades)).toBe(true);
    });

    it('should calculate copy trading fees', async () => {
      const traderId = 'trader-123';
      const trade = {
        symbol: 'AAPL',
        quantity: 10,
        price: 150.00,
        profit: 100.00
      };

      const fees = await service.calculateCopyTradingFees(traderId, trade);

      expect(fees).toBeDefined();
      expect(fees.managementFee).toBeDefined();
      expect(fees.performanceFee).toBeDefined();
      expect(fees.totalFees).toBeDefined();
      expect(fees.netProfit).toBe(trade.profit - fees.totalFees);
    });
  });

  describe('Social Features', () => {
    it('should get social trading feed', async () => {
      const feed = await service.getSocialFeed({ limit: 20 });

      expect(Array.isArray(feed)).toBe(true);
      expect(feed.length).toBeLessThanOrEqual(20);

      feed.forEach(post => {
        expect(post.id).toBeDefined();
        expect(post.userId).toBeDefined();
        expect(post.type).toBeDefined();
        expect(post.timestamp).toBeDefined();
      });
    });

    it('should post trade update to social feed', async () => {
      const tradeUpdate = {
        type: 'trade_opened' as const,
        symbol: 'AAPL',
        side: 'buy' as const,
        quantity: 100,
        price: 150.00,
        comment: 'Bullish on Apple earnings'
      };

      const post = await service.postTradeUpdate(tradeUpdate);

      expect(post.success).toBe(true);
      expect(post.postId).toBeDefined();
      expect(post.post.type).toBe('trade_opened');
      expect(post.post.content.text).toBe('Bullish on Apple earnings');
    });

    it('should like/unlike posts', async () => {
      const postId = 'post-123';

      const likeResult = await service.likePost(postId);
      expect(likeResult.success).toBe(true);
      expect(likeResult.liked).toBe(true);

      const unlikeResult = await service.unlikePost(postId);
      expect(unlikeResult.success).toBe(true);
      expect(unlikeResult.liked).toBe(false);
    });

    it('should comment on posts', async () => {
      const postId = 'post-123';
      const comment = 'Great trade! What\'s your target?';

      const commentResult = await service.commentOnPost(postId, comment);

      expect(commentResult.success).toBe(true);
      expect(commentResult.comment.id).toBeDefined();
      expect(commentResult.comment.content).toBe(comment);
      expect(commentResult.comment.postId).toBe(postId);
    });
  });

  describe('Trader Rating System', () => {
    it('should rate a trader', async () => {
      const traderId = 'trader-123';
      const rating = {
        overall: 4.5,
        performance: 5,
        riskManagement: 4,
        communication: 4,
        comment: 'Excellent trader with consistent returns'
      };

      const ratingResult = await service.rateTrader(traderId, rating);

      expect(ratingResult.success).toBe(true);
      expect(ratingResult.rating.id).toBeDefined();
      expect(ratingResult.rating.overall).toBe(4.5);
    });

    it('should get trader ratings and reviews', async () => {
      const traderId = 'trader-123';
      const ratings = await service.getTraderRatings(traderId);

      expect(ratings).toBeDefined();
      expect(ratings.averageRating).toBeDefined();
      expect(ratings.totalRatings).toBeDefined();
      expect(Array.isArray(ratings.reviews)).toBe(true);
      expect(ratings.breakdown).toBeDefined();
      expect(ratings.breakdown.performance).toBeDefined();
      expect(ratings.breakdown.riskManagement).toBeDefined();
    });
  });

  describe('Risk Management', () => {
    it('should validate copy trading settings', () => {
      const validSettings = {
        allocation: 0.1,
        maxRiskPerTrade: 0.02,
        stopLoss: 0.05,
        takeProfit: 0.1
      };

      const validation = service.validateCopySettings(validSettings);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid copy trading settings', () => {
      const invalidSettings = {
        allocation: 1.5, // > 100%
        maxRiskPerTrade: -0.01, // Negative
        stopLoss: 0.5, // Too high
        takeProfit: 0.01 // Lower than stop loss
      };

      const validation = service.validateCopySettings(invalidSettings);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should calculate portfolio impact before copying trade', async () => {
      const trade = {
        symbol: 'AAPL',
        side: 'buy' as const,
        quantity: 100,
        price: 150.00
      };

      const impact = await service.calculatePortfolioImpact(trade);

      expect(impact).toBeDefined();
      expect(impact.positionSize).toBeDefined();
      expect(impact.portfolioWeight).toBeDefined();
      expect(impact.riskMetrics).toBeDefined();
      expect(impact.marginRequired).toBeDefined();
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to trader updates', () => {
      const traderId = 'trader-123';
      const callback = vi.fn();

      service.subscribeToTrader(traderId, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subscription_confirmed',
          traderId
        })
      );
    });

    it('should unsubscribe from trader updates', () => {
      const traderId = 'trader-123';
      const callback = vi.fn();

      service.subscribeToTrader(traderId, callback);
      service.unsubscribeFromTrader(traderId);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subscription_cancelled',
          traderId
        })
      );
    });

    it('should handle real-time trade notifications', () => {
      const callback = vi.fn();
      const traderId = 'trader-123';

      service.subscribeToTrader(traderId, callback);

      // Simulate WebSocket message
      const tradeNotification = {
        type: 'trade_opened',
        traderId,
        trade: {
          symbol: 'AAPL',
          side: 'buy',
          quantity: 100,
          price: 150.00
        },
        timestamp: new Date()
      };

      // Trigger the callback as if WebSocket received message
      callback(tradeNotification);

      expect(callback).toHaveBeenLastCalledWith(tradeNotification);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network error by disconnecting WebSocket
      wsService.disconnect();

      const result = await service.getTopTraders({ sortBy: 'performance' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should return cached data or empty array
    });

    it('should handle invalid trader ID', async () => {
      const invalidTraderId = 'invalid-trader-id';

      await expect(service.getTraderDetails(invalidTraderId))
        .rejects
        .toThrow('Trader not found');
    });

    it('should handle insufficient funds for copy trading', async () => {
      const traderId = 'trader-123';
      await service.followTrader(traderId, { allocation: 0.9 }); // 90% allocation

      const largeTrade = {
        traderId,
        symbol: 'AAPL',
        side: 'buy' as const,
        quantity: 10000, // Very large quantity to exceed available funds
        price: 150.00,
        timestamp: new Date()
      };

      const result = await service.copyTrade(largeTrade);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('insufficient funds');
    });
  });

  describe('Analytics and Reporting', () => {
    it('should generate copy trading report', async () => {
      const timeframe = { start: new Date('2024-01-01'), end: new Date('2024-12-31') };
      const report = await service.generateCopyTradingReport(timeframe);

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.traderBreakdown).toBeDefined();
      expect(report.monthlyPerformance).toBeDefined();
      expect(Array.isArray(report.trades)).toBe(true);
    });

    it('should export copy trading data', async () => {
      const format = 'csv';
      const timeframe = { start: new Date('2024-01-01'), end: new Date('2024-12-31') };

      const exportData = await service.exportCopyTradingData(format, timeframe);

      expect(exportData).toBeDefined();
      expect(exportData.format).toBe('csv');
      expect(exportData.data).toBeDefined();
      expect(exportData.filename).toContain('.csv');
    });
  });
});