import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TradeExecutionService } from '../tradeExecution.service';
import { PaperPositionRepository } from '../../repositories/paperPosition.repository';
import { TradeIdeaRepository } from '../../repositories/tradeIdea.repository';
import { AlertRepository } from '../../repositories/alert.repository';
import type {
  PaperPositionWithDetails,
  TradeIdeaWithDetails,
  AlertWithDetails,
  MarketQuote,
  ServiceResult
} from '@golden-palace/shared/types';
import type { PositionStatus, TradeStatus, AlertStatus } from '@golden-palace/database';

// Mock the repositories
const mockPaperPositionRepository = {
  findOpenPositions: vi.fn(),
  updateCurrentPrice: vi.fn(),
  close: vi.fn(),
  calculatePnL: vi.fn(),
  findByStopLoss: vi.fn(),
  findByTakeProfit: vi.fn(),
} as jest.Mocked<Partial<PaperPositionRepository>>;

const mockTradeIdeaRepository = {
  findActiveIdeas: vi.fn(),
  update: vi.fn(),
  findById: vi.fn(),
} as jest.Mocked<Partial<TradeIdeaRepository>>;

const mockAlertRepository = {
  findActiveAlerts: vi.fn(),
  trigger: vi.fn(),
  findBySymbol: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
} as jest.Mocked<Partial<AlertRepository>>;

describe('TradeExecutionService', () => {
  let tradeExecutionService: TradeExecutionService;
  const userId = 'user-123';
  const groupId = 'group-456';

  beforeEach(() => {
    vi.clearAllMocks();
    tradeExecutionService = new TradeExecutionService(
      mockPaperPositionRepository as PaperPositionRepository,
      mockTradeIdeaRepository as TradeIdeaRepository,
      mockAlertRepository as AlertRepository
    );
  });

  describe('processMarketUpdate', () => {
    const marketQuotes: MarketQuote[] = [
      {
        symbol: 'AAPL',
        price: 155.50,
        change: 5.00,
        changePercent: 3.32,
        volume: 1500000,
        high: 156.75,
        low: 150.25,
        open: 151.00,
        previousClose: 150.50,
        timestamp: new Date(),
      },
      {
        symbol: 'TSLA',
        price: 225.75,
        change: -10.25,
        changePercent: -4.34,
        volume: 2500000,
        high: 235.50,
        low: 225.00,
        open: 235.00,
        previousClose: 236.00,
        timestamp: new Date(),
      },
    ];

    it('should process market updates and trigger position updates', async () => {
      const mockOpenPositions: PaperPositionWithDetails[] = [
        {
          id: 'pos-1',
          userId,
          groupId,
          tradeIdeaId: null,
          symbol: 'AAPL',
          assetType: 'STOCK',
          quantity: 100,
          entryPrice: 150.50,
          currentPrice: 150.50,
          stopLoss: 145.00,
          takeProfit: 160.00,
          pnl: 0,
          pnlPercent: 0,
          status: 'OPEN' as PositionStatus,
          openedAt: new Date(),
          closedAt: null,
          closedPrice: null,
          closeReason: null,
          user: { id: userId, username: 'testuser', avatarUrl: null },
          group: { id: groupId, name: 'Test Group' },
          tradeIdea: null,
        },
      ];

      const mockUpdatedPosition = {
        ...mockOpenPositions[0],
        currentPrice: 155.50,
        pnl: 500, // (155.50 - 150.50) * 100
        pnlPercent: 3.32,
      };

      mockPaperPositionRepository.findOpenPositions!.mockResolvedValue(mockOpenPositions);
      mockPaperPositionRepository.updateCurrentPrice!.mockResolvedValue(1);

      const result = await tradeExecutionService.processMarketUpdate(marketQuotes);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        positionsUpdated: 1,
        positionsClosed: 0,
        alertsTriggered: 0,
        tradesExecuted: 0,
      });
      expect(mockPaperPositionRepository.findOpenPositions).toHaveBeenCalled();
      expect(mockPaperPositionRepository.updateCurrentPrice).toHaveBeenCalledWith('user-123', {
        AAPL: 155.50,
      });
    });

    it('should trigger stop loss execution', async () => {
      const mockStopLossPositions: PaperPositionWithDetails[] = [
        {
          id: 'pos-1',
          userId,
          groupId,
          tradeIdeaId: null,
          symbol: 'AAPL',
          assetType: 'STOCK',
          quantity: 100,
          entryPrice: 150.50,
          currentPrice: 144.50, // Below stop loss
          stopLoss: 145.00,
          takeProfit: 160.00,
          pnl: -600, // (144.50 - 150.50) * 100
          pnlPercent: -3.99,
          status: 'OPEN' as PositionStatus,
          openedAt: new Date(),
          closedAt: null,
          closedPrice: null,
          closeReason: null,
          user: { id: userId, username: 'testuser', avatarUrl: null },
          group: { id: groupId, name: 'Test Group' },
          tradeIdea: null,
        },
      ];

      const mockClosedPosition = {
        ...mockStopLossPositions[0],
        status: 'STOPPED' as PositionStatus,
        closedPrice: 145.00,
        closedAt: new Date(),
        closeReason: 'Stop loss triggered',
        pnl: -550, // (145.00 - 150.50) * 100
        pnlPercent: -3.65,
      };

      const quotes = [
        {
          ...marketQuotes[0],
          symbol: 'AAPL',
          price: 144.50, // Below stop loss
        },
      ];

      mockPaperPositionRepository.findOpenPositions!.mockResolvedValue(mockStopLossPositions);
      mockPaperPositionRepository.close!.mockResolvedValue(mockClosedPosition);

      const result = await tradeExecutionService.processMarketUpdate(quotes);

      expect(result.success).toBe(true);
      expect(result.data?.positionsClosed).toBe(1);
      expect(mockPaperPositionRepository.close).toHaveBeenCalledWith(
        'pos-1',
        145.00,
        'Stop loss triggered'
      );
    });

    it('should trigger take profit execution', async () => {
      const mockTakeProfitPositions: PaperPositionWithDetails[] = [
        {
          id: 'pos-1',
          userId,
          groupId,
          tradeIdeaId: null,
          symbol: 'AAPL',
          assetType: 'STOCK',
          quantity: 100,
          entryPrice: 150.50,
          currentPrice: 160.50, // Above take profit
          stopLoss: 145.00,
          takeProfit: 160.00,
          pnl: 1000, // (160.50 - 150.50) * 100
          pnlPercent: 6.64,
          status: 'OPEN' as PositionStatus,
          openedAt: new Date(),
          closedAt: null,
          closedPrice: null,
          closeReason: null,
          user: { id: userId, username: 'testuser', avatarUrl: null },
          group: { id: groupId, name: 'Test Group' },
          tradeIdea: null,
        },
      ];

      const mockClosedPosition = {
        ...mockTakeProfitPositions[0],
        status: 'CLOSED' as PositionStatus,
        closedPrice: 160.00,
        closedAt: new Date(),
        closeReason: 'Take profit triggered',
        pnl: 950, // (160.00 - 150.50) * 100
        pnlPercent: 6.31,
      };

      const quotes = [
        {
          ...marketQuotes[0],
          symbol: 'AAPL',
          price: 160.50, // Above take profit
        },
      ];

      mockPaperPositionRepository.findOpenPositions!.mockResolvedValue(mockTakeProfitPositions);
      mockPaperPositionRepository.close!.mockResolvedValue(mockClosedPosition);

      const result = await tradeExecutionService.processMarketUpdate(quotes);

      expect(result.success).toBe(true);
      expect(result.data?.positionsClosed).toBe(1);
      expect(mockPaperPositionRepository.close).toHaveBeenCalledWith(
        'pos-1',
        160.00,
        'Take profit triggered'
      );
    });

    it('should trigger price alerts', async () => {
      const mockActiveAlerts: AlertWithDetails[] = [
        {
          id: 'alert-1',
          userId,
          symbol: 'AAPL',
          condition: 'ABOVE',
          targetPrice: 155.00,
          message: 'AAPL broke resistance',
          status: 'ACTIVE' as AlertStatus,
          triggeredAt: null,
          createdAt: new Date(),
          user: { id: userId, username: 'testuser', avatarUrl: null },
        },
      ];

      mockAlertRepository.findActiveAlerts!.mockResolvedValue(mockActiveAlerts);
      mockAlertRepository.trigger!.mockResolvedValue(true);

      const result = await tradeExecutionService.processMarketUpdate(marketQuotes);

      expect(result.success).toBe(true);
      expect(result.data?.alertsTriggered).toBe(1);
      expect(mockAlertRepository.trigger).toHaveBeenCalledWith('alert-1');
    });

    it('should handle empty market quotes', async () => {
      const result = await tradeExecutionService.processMarketUpdate([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No market quotes provided');
    });

    it('should handle repository errors gracefully', async () => {
      mockPaperPositionRepository.findOpenPositions!.mockRejectedValue(new Error('Database error'));

      const result = await tradeExecutionService.processMarketUpdate(marketQuotes);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process market update');
    });
  });

  describe('executeStopLoss', () => {
    const position: PaperPositionWithDetails = {
      id: 'pos-1',
      userId,
      groupId,
      tradeIdeaId: null,
      symbol: 'AAPL',
      assetType: 'STOCK',
      quantity: 100,
      entryPrice: 150.50,
      currentPrice: 144.50,
      stopLoss: 145.00,
      takeProfit: 160.00,
      pnl: -600,
      pnlPercent: -3.99,
      status: 'OPEN' as PositionStatus,
      openedAt: new Date(),
      closedAt: null,
      closedPrice: null,
      closeReason: null,
      user: { id: userId, username: 'testuser', avatarUrl: null },
      group: { id: groupId, name: 'Test Group' },
      tradeIdea: null,
    };

    it('should execute stop loss for long position', async () => {
      const currentPrice = 144.50; // Below stop loss

      const mockClosedPosition = {
        ...position,
        status: 'STOPPED' as PositionStatus,
        closedPrice: 145.00,
        closedAt: new Date(),
        closeReason: 'Stop loss triggered',
      };

      mockPaperPositionRepository.close!.mockResolvedValue(mockClosedPosition);

      const result = await tradeExecutionService.executeStopLoss(position, currentPrice);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockClosedPosition);
      expect(mockPaperPositionRepository.close).toHaveBeenCalledWith(
        'pos-1',
        145.00,
        'Stop loss triggered'
      );
    });

    it('should not execute stop loss if price is above stop loss for long position', async () => {
      const currentPrice = 146.00; // Above stop loss

      const result = await tradeExecutionService.executeStopLoss(position, currentPrice);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stop loss conditions not met');
      expect(mockPaperPositionRepository.close).not.toHaveBeenCalled();
    });

    it('should return error if no stop loss is set', async () => {
      const positionWithoutStopLoss = { ...position, stopLoss: null };

      const result = await tradeExecutionService.executeStopLoss(positionWithoutStopLoss, 144.50);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No stop loss set for this position');
    });
  });

  describe('executeTakeProfit', () => {
    const position: PaperPositionWithDetails = {
      id: 'pos-1',
      userId,
      groupId,
      tradeIdeaId: null,
      symbol: 'AAPL',
      assetType: 'STOCK',
      quantity: 100,
      entryPrice: 150.50,
      currentPrice: 160.50,
      stopLoss: 145.00,
      takeProfit: 160.00,
      pnl: 1000,
      pnlPercent: 6.64,
      status: 'OPEN' as PositionStatus,
      openedAt: new Date(),
      closedAt: null,
      closedPrice: null,
      closeReason: null,
      user: { id: userId, username: 'testuser', avatarUrl: null },
      group: { id: groupId, name: 'Test Group' },
      tradeIdea: null,
    };

    it('should execute take profit for long position', async () => {
      const currentPrice = 160.50; // Above take profit

      const mockClosedPosition = {
        ...position,
        status: 'CLOSED' as PositionStatus,
        closedPrice: 160.00,
        closedAt: new Date(),
        closeReason: 'Take profit triggered',
      };

      mockPaperPositionRepository.close!.mockResolvedValue(mockClosedPosition);

      const result = await tradeExecutionService.executeTakeProfit(position, currentPrice);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockClosedPosition);
      expect(mockPaperPositionRepository.close).toHaveBeenCalledWith(
        'pos-1',
        160.00,
        'Take profit triggered'
      );
    });

    it('should not execute take profit if price is below take profit for long position', async () => {
      const currentPrice = 159.00; // Below take profit

      const result = await tradeExecutionService.executeTakeProfit(position, currentPrice);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Take profit conditions not met');
      expect(mockPaperPositionRepository.close).not.toHaveBeenCalled();
    });

    it('should return error if no take profit is set', async () => {
      const positionWithoutTakeProfit = { ...position, takeProfit: null };

      const result = await tradeExecutionService.executeTakeProfit(positionWithoutTakeProfit, 160.50);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No take profit set for this position');
    });
  });

  describe('checkPriceAlerts', () => {
    const marketQuote: MarketQuote = {
      symbol: 'AAPL',
      price: 155.50,
      change: 5.00,
      changePercent: 3.32,
      volume: 1500000,
      high: 156.75,
      low: 150.25,
      open: 151.00,
      previousClose: 150.50,
      timestamp: new Date(),
    };

    it('should trigger alerts when conditions are met', async () => {
      const mockActiveAlerts: AlertWithDetails[] = [
        {
          id: 'alert-1',
          userId,
          symbol: 'AAPL',
          condition: 'ABOVE',
          targetPrice: 155.00,
          message: 'AAPL broke resistance',
          status: 'ACTIVE' as AlertStatus,
          triggeredAt: null,
          createdAt: new Date(),
          user: { id: userId, username: 'testuser', avatarUrl: null },
        },
        {
          id: 'alert-2',
          userId,
          symbol: 'AAPL',
          condition: 'BELOW',
          targetPrice: 160.00, // Won't trigger
          message: 'AAPL broke support',
          status: 'ACTIVE' as AlertStatus,
          triggeredAt: null,
          createdAt: new Date(),
          user: { id: userId, username: 'testuser', avatarUrl: null },
        },
      ];

      mockAlertRepository.findBySymbol!.mockResolvedValue(mockActiveAlerts);
      mockAlertRepository.trigger!.mockResolvedValue(true);

      const result = await tradeExecutionService.checkPriceAlerts(marketQuote);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1); // Only one alert triggered
      expect(mockAlertRepository.trigger).toHaveBeenCalledTimes(1);
      expect(mockAlertRepository.trigger).toHaveBeenCalledWith('alert-1');
    });

    it('should handle CROSSES_ABOVE condition', async () => {
      const mockCrossAboveAlert: AlertWithDetails[] = [
        {
          id: 'alert-1',
          userId,
          symbol: 'AAPL',
          condition: 'CROSSES_ABOVE',
          targetPrice: 155.00,
          message: 'AAPL crossed above resistance',
          status: 'ACTIVE' as AlertStatus,
          triggeredAt: null,
          createdAt: new Date(),
          user: { id: userId, username: 'testuser', avatarUrl: null },
        },
      ];

      // Market quote shows price above target and previous close below target
      const crossQuote = {
        ...marketQuote,
        price: 155.50, // Current price above 155
        previousClose: 154.50, // Previous close below 155
      };

      mockAlertRepository.findBySymbol!.mockResolvedValue(mockCrossAboveAlert);
      mockAlertRepository.trigger!.mockResolvedValue(true);

      const result = await tradeExecutionService.checkPriceAlerts(crossQuote);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockAlertRepository.trigger).toHaveBeenCalledWith('alert-1');
    });

    it('should handle CROSSES_BELOW condition', async () => {
      const mockCrossBelowAlert: AlertWithDetails[] = [
        {
          id: 'alert-1',
          userId,
          symbol: 'AAPL',
          condition: 'CROSSES_BELOW',
          targetPrice: 155.00,
          message: 'AAPL crossed below support',
          status: 'ACTIVE' as AlertStatus,
          triggeredAt: null,
          createdAt: new Date(),
          user: { id: userId, username: 'testuser', avatarUrl: null },
        },
      ];

      // Market quote shows price below target and previous close above target
      const crossQuote = {
        ...marketQuote,
        price: 154.50, // Current price below 155
        previousClose: 155.50, // Previous close above 155
      };

      mockAlertRepository.findBySymbol!.mockResolvedValue(mockCrossBelowAlert);
      mockAlertRepository.trigger!.mockResolvedValue(true);

      const result = await tradeExecutionService.checkPriceAlerts(crossQuote);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockAlertRepository.trigger).toHaveBeenCalledWith('alert-1');
    });

    it('should return zero when no alerts are triggered', async () => {
      mockAlertRepository.findBySymbol!.mockResolvedValue([]);

      const result = await tradeExecutionService.checkPriceAlerts(marketQuote);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('autoExecuteTradeIdeas', () => {
    it('should automatically close trade ideas when targets are hit', async () => {
      const mockActiveIdeas: TradeIdeaWithDetails[] = [
        {
          id: 'trade-1',
          groupId,
          userId,
          symbol: 'AAPL',
          assetType: 'STOCK',
          direction: 'LONG',
          entryPrice: 150.50,
          stopLoss: 145.00,
          takeProfit1: 160.00,
          takeProfit2: 165.00,
          takeProfit3: 170.00,
          timeframe: '1D',
          confidence: 4,
          rationale: 'Strong earnings',
          chartUrl: null,
          tags: ['earnings'],
          status: 'ACTIVE' as TradeStatus,
          closedPrice: null,
          closedAt: null,
          pnl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: userId, username: 'testuser', avatarUrl: null },
          group: { id: groupId, name: 'Test Group' },
          paperPositions: [],
        },
      ];

      const marketQuote: MarketQuote = {
        symbol: 'AAPL',
        price: 160.50, // Above take profit 1
        change: 10.00,
        changePercent: 6.64,
        volume: 1500000,
        high: 161.00,
        low: 155.50,
        open: 156.00,
        previousClose: 150.50,
        timestamp: new Date(),
      };

      const mockClosedIdea = {
        ...mockActiveIdeas[0],
        status: 'CLOSED' as TradeStatus,
        closedPrice: 160.50,
        closedAt: new Date(),
        pnl: 10.00, // 160.50 - 150.50
      };

      mockTradeIdeaRepository.findActiveIdeas!.mockResolvedValue(mockActiveIdeas);
      mockTradeIdeaRepository.update!.mockResolvedValue(mockClosedIdea);

      const result = await tradeExecutionService.autoExecuteTradeIdeas([marketQuote]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1); // One trade idea closed
      expect(mockTradeIdeaRepository.update).toHaveBeenCalledWith('trade-1', {
        status: 'CLOSED',
        closedPrice: 160.50,
        closedAt: expect.any(Date),
        pnl: 10.00,
      });
    });

    it('should handle multiple take profit levels', async () => {
      const mockActiveIdeas: TradeIdeaWithDetails[] = [
        {
          id: 'trade-1',
          groupId,
          userId,
          symbol: 'AAPL',
          assetType: 'STOCK',
          direction: 'LONG',
          entryPrice: 150.50,
          stopLoss: 145.00,
          takeProfit1: 155.00, // Will be hit
          takeProfit2: 160.00,
          takeProfit3: 165.00,
          timeframe: '1D',
          confidence: 4,
          rationale: 'Strong earnings',
          chartUrl: null,
          tags: ['earnings'],
          status: 'ACTIVE' as TradeStatus,
          closedPrice: null,
          closedAt: null,
          pnl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: userId, username: 'testuser', avatarUrl: null },
          group: { id: groupId, name: 'Test Group' },
          paperPositions: [],
        },
      ];

      const marketQuote: MarketQuote = {
        symbol: 'AAPL',
        price: 156.00, // Above take profit 1, below 2 and 3
        change: 5.50,
        changePercent: 3.65,
        volume: 1500000,
        high: 156.50,
        low: 152.00,
        open: 152.50,
        previousClose: 150.50,
        timestamp: new Date(),
      };

      const mockClosedIdea = {
        ...mockActiveIdeas[0],
        status: 'CLOSED' as TradeStatus,
        closedPrice: 155.00, // Close at TP1 level
        closedAt: new Date(),
        pnl: 4.50, // 155.00 - 150.50
      };

      mockTradeIdeaRepository.findActiveIdeas!.mockResolvedValue(mockActiveIdeas);
      mockTradeIdeaRepository.update!.mockResolvedValue(mockClosedIdea);

      const result = await tradeExecutionService.autoExecuteTradeIdeas([marketQuote]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockTradeIdeaRepository.update).toHaveBeenCalledWith('trade-1', {
        status: 'CLOSED',
        closedPrice: 155.00, // Should close at first TP level hit
        closedAt: expect.any(Date),
        pnl: 4.50,
      });
    });

    it('should handle stop loss execution for trade ideas', async () => {
      const mockActiveIdeas: TradeIdeaWithDetails[] = [
        {
          id: 'trade-1',
          groupId,
          userId,
          symbol: 'AAPL',
          assetType: 'STOCK',
          direction: 'LONG',
          entryPrice: 150.50,
          stopLoss: 145.00,
          takeProfit1: 160.00,
          takeProfit2: null,
          takeProfit3: null,
          timeframe: '1D',
          confidence: 4,
          rationale: 'Strong earnings',
          chartUrl: null,
          tags: ['earnings'],
          status: 'ACTIVE' as TradeStatus,
          closedPrice: null,
          closedAt: null,
          pnl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: userId, username: 'testuser', avatarUrl: null },
          group: { id: groupId, name: 'Test Group' },
          paperPositions: [],
        },
      ];

      const marketQuote: MarketQuote = {
        symbol: 'AAPL',
        price: 144.00, // Below stop loss
        change: -6.50,
        changePercent: -4.32,
        volume: 2500000,
        high: 150.00,
        low: 143.50,
        open: 149.50,
        previousClose: 150.50,
        timestamp: new Date(),
      };

      const mockStoppedIdea = {
        ...mockActiveIdeas[0],
        status: 'CLOSED' as TradeStatus,
        closedPrice: 145.00, // Close at stop loss
        closedAt: new Date(),
        pnl: -5.50, // 145.00 - 150.50
      };

      mockTradeIdeaRepository.findActiveIdeas!.mockResolvedValue(mockActiveIdeas);
      mockTradeIdeaRepository.update!.mockResolvedValue(mockStoppedIdea);

      const result = await tradeExecutionService.autoExecuteTradeIdeas([marketQuote]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockTradeIdeaRepository.update).toHaveBeenCalledWith('trade-1', {
        status: 'CLOSED',
        closedPrice: 145.00,
        closedAt: expect.any(Date),
        pnl: -5.50,
      });
    });

    it('should handle short positions correctly', async () => {
      const mockShortIdea: TradeIdeaWithDetails[] = [
        {
          id: 'trade-1',
          groupId,
          userId,
          symbol: 'AAPL',
          assetType: 'STOCK',
          direction: 'SHORT',
          entryPrice: 150.50,
          stopLoss: 155.00, // Above entry for short
          takeProfit1: 145.00, // Below entry for short
          takeProfit2: null,
          takeProfit3: null,
          timeframe: '1D',
          confidence: 3,
          rationale: 'Bearish signals',
          chartUrl: null,
          tags: ['bearish'],
          status: 'ACTIVE' as TradeStatus,
          closedPrice: null,
          closedAt: null,
          pnl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: userId, username: 'testuser', avatarUrl: null },
          group: { id: groupId, name: 'Test Group' },
          paperPositions: [],
        },
      ];

      const marketQuote: MarketQuote = {
        symbol: 'AAPL',
        price: 144.00, // Below take profit for short
        change: -6.50,
        changePercent: -4.32,
        volume: 2500000,
        high: 150.00,
        low: 143.50,
        open: 149.50,
        previousClose: 150.50,
        timestamp: new Date(),
      };

      const mockClosedShort = {
        ...mockShortIdea[0],
        status: 'CLOSED' as TradeStatus,
        closedPrice: 145.00, // Close at take profit
        closedAt: new Date(),
        pnl: 5.50, // For short: 150.50 - 145.00
      };

      mockTradeIdeaRepository.findActiveIdeas!.mockResolvedValue(mockShortIdea);
      mockTradeIdeaRepository.update!.mockResolvedValue(mockClosedShort);

      const result = await tradeExecutionService.autoExecuteTradeIdeas([marketQuote]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockTradeIdeaRepository.update).toHaveBeenCalledWith('trade-1', {
        status: 'CLOSED',
        closedPrice: 145.00,
        closedAt: expect.any(Date),
        pnl: 5.50,
      });
    });

    it('should return zero when no ideas are executed', async () => {
      mockTradeIdeaRepository.findActiveIdeas!.mockResolvedValue([]);

      const result = await tradeExecutionService.autoExecuteTradeIdeas([]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('getExecutionSummary', () => {
    it('should return execution summary for user', async () => {
      const mockSummary = {
        totalExecutions: 25,
        stopLossExecutions: 8,
        takeProfitExecutions: 17,
        totalPnlFromExecutions: 1250.75,
        avgExecutionTime: 125, // milliseconds
        successRate: 68.0, // percentage
        lastExecutionTime: new Date(),
      };

      // Mock implementation would come from repository
      const result = await tradeExecutionService.getExecutionSummary(userId, 30);

      // For now, this would return a basic summary since we haven't implemented the repository method
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalExecutions: 0,
        stopLossExecutions: 0,
        takeProfitExecutions: 0,
        totalPnlFromExecutions: 0,
        avgExecutionTime: 0,
        successRate: 0,
        lastExecutionTime: null,
      });
    });
  });
});