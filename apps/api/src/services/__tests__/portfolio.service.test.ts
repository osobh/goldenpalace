import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortfolioService } from '../portfolio.service';
import { PaperPositionRepository } from '../../repositories/paperPosition.repository';
import { TradeIdeaRepository } from '../../repositories/tradeIdea.repository';
import { GroupRepository } from '../../repositories/group.repository';
import type {
  CreatePaperPositionInput,
  UpdatePositionInput,
  PaperPositionWithDetails,
  PortfolioSummary,
  PaginatedResult,
  ServiceResult
} from '@golden-palace/shared/types';
import type { AssetType, PositionStatus } from '@golden-palace/database';

// Mock the repositories
const mockPaperPositionRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(),
  findByGroupId: vi.fn(),
  findBySymbol: vi.fn(),
  update: vi.fn(),
  close: vi.fn(),
  delete: vi.fn(),
  getPortfolioSummary: vi.fn(),
  getTradingMetrics: vi.fn(),
  getTopPerformers: vi.fn(),
  calculatePnL: vi.fn(),
  updateCurrentPrice: vi.fn(),
  getOpenPositions: vi.fn(),
  getClosedPositions: vi.fn(),
} as jest.Mocked<PaperPositionRepository>;

const mockTradeIdeaRepository = {
  findById: vi.fn(),
} as jest.Mocked<Partial<TradeIdeaRepository>>;

const mockGroupRepository = {
  isMember: vi.fn(),
  findById: vi.fn(),
} as jest.Mocked<Partial<GroupRepository>>;

describe('PortfolioService', () => {
  let portfolioService: PortfolioService;
  const userId = 'user-123';
  const groupId = 'group-456';
  const positionId = 'position-789';

  beforeEach(() => {
    vi.clearAllMocks();
    portfolioService = new PortfolioService(
      mockPaperPositionRepository,
      mockTradeIdeaRepository as TradeIdeaRepository,
      mockGroupRepository as GroupRepository
    );
  });

  describe('createPaperPosition', () => {
    const validInput: CreatePaperPositionInput = {
      symbol: 'AAPL',
      assetType: 'STOCK' as AssetType,
      quantity: 100,
      entryPrice: 150.50,
      stopLoss: 145.00,
      takeProfit: 160.00,
    };

    it('should create a paper position successfully', async () => {
      const mockCreatedPosition: PaperPositionWithDetails = {
        id: positionId,
        userId,
        groupId,
        tradeIdeaId: null,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
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
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        tradeIdea: null,
      };

      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockPaperPositionRepository.create.mockResolvedValue(mockCreatedPosition);

      const result = await portfolioService.createPaperPosition(userId, groupId, validInput);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedPosition);
      expect(mockGroupRepository.isMember).toHaveBeenCalledWith(groupId, userId);
      expect(mockPaperPositionRepository.create).toHaveBeenCalledWith({
        ...validInput,
        userId,
        groupId,
        currentPrice: validInput.entryPrice,
      });
    });

    it('should create position linked to trade idea', async () => {
      const inputWithTradeIdea = {
        ...validInput,
        tradeIdeaId: 'trade-123',
      };

      const mockTradeIdea = {
        id: 'trade-123',
        groupId,
        userId,
        symbol: 'AAPL',
        direction: 'LONG',
      };

      const mockCreatedPosition: PaperPositionWithDetails = {
        id: positionId,
        userId,
        groupId,
        tradeIdeaId: 'trade-123',
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
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
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        tradeIdea: {
          id: 'trade-123',
          symbol: 'AAPL',
          direction: 'LONG',
        },
      };

      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockTradeIdeaRepository.findById!.mockResolvedValue(mockTradeIdea);
      mockPaperPositionRepository.create.mockResolvedValue(mockCreatedPosition);

      const result = await portfolioService.createPaperPosition(userId, groupId, inputWithTradeIdea);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedPosition);
      expect(mockTradeIdeaRepository.findById).toHaveBeenCalledWith('trade-123');
    });

    it('should return error if user is not a group member', async () => {
      mockGroupRepository.isMember!.mockResolvedValue(false);

      const result = await portfolioService.createPaperPosition(userId, groupId, validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You are not a member of this group');
      expect(mockPaperPositionRepository.create).not.toHaveBeenCalled();
    });

    it('should return error if trade idea not found', async () => {
      const inputWithInvalidTradeIdea = {
        ...validInput,
        tradeIdeaId: 'invalid-trade',
      };

      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockTradeIdeaRepository.findById!.mockResolvedValue(null);

      const result = await portfolioService.createPaperPosition(userId, groupId, inputWithInvalidTradeIdea);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Trade idea not found');
      expect(mockPaperPositionRepository.create).not.toHaveBeenCalled();
    });

    it('should return error if trade idea belongs to different group', async () => {
      const inputWithTradeIdea = {
        ...validInput,
        tradeIdeaId: 'trade-123',
      };

      const mockTradeIdea = {
        id: 'trade-123',
        groupId: 'different-group',
        userId,
        symbol: 'AAPL',
        direction: 'LONG',
      };

      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockTradeIdeaRepository.findById!.mockResolvedValue(mockTradeIdea);

      const result = await portfolioService.createPaperPosition(userId, groupId, inputWithTradeIdea);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Trade idea belongs to a different group');
      expect(mockPaperPositionRepository.create).not.toHaveBeenCalled();
    });

    it('should validate quantity is positive', async () => {
      const invalidInput = { ...validInput, quantity: -10 };
      mockGroupRepository.isMember!.mockResolvedValue(true);

      const result = await portfolioService.createPaperPosition(userId, groupId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quantity must be positive');
      expect(mockPaperPositionRepository.create).not.toHaveBeenCalled();
    });

    it('should validate entry price is positive', async () => {
      const invalidInput = { ...validInput, entryPrice: -10 };
      mockGroupRepository.isMember!.mockResolvedValue(true);

      const result = await portfolioService.createPaperPosition(userId, groupId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Entry price must be positive');
      expect(mockPaperPositionRepository.create).not.toHaveBeenCalled();
    });

    it('should validate stop loss is positive if provided', async () => {
      const invalidInput = { ...validInput, stopLoss: -10 };
      mockGroupRepository.isMember!.mockResolvedValue(true);

      const result = await portfolioService.createPaperPosition(userId, groupId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stop loss must be positive if provided');
      expect(mockPaperPositionRepository.create).not.toHaveBeenCalled();
    });

    it('should validate take profit is positive if provided', async () => {
      const invalidInput = { ...validInput, takeProfit: -10 };
      mockGroupRepository.isMember!.mockResolvedValue(true);

      const result = await portfolioService.createPaperPosition(userId, groupId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Take profit must be positive if provided');
      expect(mockPaperPositionRepository.create).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockPaperPositionRepository.create.mockRejectedValue(new Error('Database error'));

      const result = await portfolioService.createPaperPosition(userId, groupId, validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create paper position');
    });
  });

  describe('getPosition', () => {
    it('should return position if user has access', async () => {
      const mockPosition: PaperPositionWithDetails = {
        id: positionId,
        userId,
        groupId,
        tradeIdeaId: null,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        quantity: 100,
        entryPrice: 150.50,
        currentPrice: 155.00,
        stopLoss: 145.00,
        takeProfit: 160.00,
        pnl: 450,
        pnlPercent: 2.99,
        status: 'OPEN' as PositionStatus,
        openedAt: new Date(),
        closedAt: null,
        closedPrice: null,
        closeReason: null,
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        tradeIdea: null,
      };

      mockPaperPositionRepository.findById.mockResolvedValue(mockPosition);
      mockGroupRepository.isMember!.mockResolvedValue(true);

      const result = await portfolioService.getPosition(userId, positionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPosition);
      expect(mockGroupRepository.isMember).toHaveBeenCalledWith(groupId, userId);
    });

    it('should return error if position not found', async () => {
      mockPaperPositionRepository.findById.mockResolvedValue(null);

      const result = await portfolioService.getPosition(userId, positionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position not found');
    });

    it('should return error if user has no access to group', async () => {
      const mockPosition: PaperPositionWithDetails = {
        id: positionId,
        userId: 'other-user',
        groupId,
        tradeIdeaId: null,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        quantity: 100,
        entryPrice: 150.50,
        currentPrice: 155.00,
        stopLoss: 145.00,
        takeProfit: 160.00,
        pnl: 450,
        pnlPercent: 2.99,
        status: 'OPEN' as PositionStatus,
        openedAt: new Date(),
        closedAt: null,
        closedPrice: null,
        closeReason: null,
        user: {
          id: 'other-user',
          username: 'otheruser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        tradeIdea: null,
      };

      mockPaperPositionRepository.findById.mockResolvedValue(mockPosition);
      mockGroupRepository.isMember!.mockResolvedValue(false);

      const result = await portfolioService.getPosition(userId, positionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('getUserPositions', () => {
    const query = {
      page: 1,
      limit: 20,
      status: 'OPEN' as PositionStatus,
      symbol: 'AAPL',
      sortBy: 'openedAt' as const,
      sortOrder: 'desc' as const,
    };

    it('should return paginated user positions', async () => {
      const mockResult: PaginatedResult<PaperPositionWithDetails> = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockPaperPositionRepository.findByUserId.mockResolvedValue(mockResult);

      const result = await portfolioService.getUserPositions(userId, query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(mockPaperPositionRepository.findByUserId).toHaveBeenCalledWith(userId, query);
    });
  });

  describe('getGroupPositions', () => {
    const query = {
      page: 1,
      limit: 20,
      status: 'OPEN' as PositionStatus,
    };

    it('should return paginated group positions if user is member', async () => {
      const mockResult: PaginatedResult<PaperPositionWithDetails> = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockPaperPositionRepository.findByGroupId.mockResolvedValue(mockResult);

      const result = await portfolioService.getGroupPositions(userId, groupId, query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(mockGroupRepository.isMember).toHaveBeenCalledWith(groupId, userId);
    });

    it('should return error if user not member of group', async () => {
      mockGroupRepository.isMember!.mockResolvedValue(false);

      const result = await portfolioService.getGroupPositions(userId, groupId, query);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied to this group');
    });
  });

  describe('updatePosition', () => {
    const updateInput: UpdatePositionInput = {
      currentPrice: 155.00,
      stopLoss: 148.00,
      takeProfit: 162.00,
    };

    it('should update position if user is owner', async () => {
      const mockOriginalPosition: PaperPositionWithDetails = {
        id: positionId,
        userId,
        groupId,
        tradeIdeaId: null,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
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
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        tradeIdea: null,
      };

      const mockUpdatedPosition = {
        ...mockOriginalPosition,
        ...updateInput,
        pnl: 450, // (155.00 - 150.50) * 100
        pnlPercent: 2.99,
      };

      mockPaperPositionRepository.findById.mockResolvedValue(mockOriginalPosition);
      mockPaperPositionRepository.update.mockResolvedValue(mockUpdatedPosition);

      const result = await portfolioService.updatePosition(userId, positionId, updateInput);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedPosition);
      expect(mockPaperPositionRepository.update).toHaveBeenCalledWith(positionId, updateInput);
    });

    it('should return error if position not found', async () => {
      mockPaperPositionRepository.findById.mockResolvedValue(null);

      const result = await portfolioService.updatePosition(userId, positionId, updateInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position not found');
    });

    it('should return error if user is not owner', async () => {
      const mockOtherUserPosition: PaperPositionWithDetails = {
        id: positionId,
        userId: 'other-user',
        groupId,
        tradeIdeaId: null,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
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
        user: {
          id: 'other-user',
          username: 'otheruser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        tradeIdea: null,
      };

      mockPaperPositionRepository.findById.mockResolvedValue(mockOtherUserPosition);

      const result = await portfolioService.updatePosition(userId, positionId, updateInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the position owner can update it');
    });

    it('should return error if position is closed', async () => {
      const mockClosedPosition: PaperPositionWithDetails = {
        id: positionId,
        userId,
        groupId,
        tradeIdeaId: null,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        quantity: 100,
        entryPrice: 150.50,
        currentPrice: 155.00,
        stopLoss: 145.00,
        takeProfit: 160.00,
        pnl: 450,
        pnlPercent: 2.99,
        status: 'CLOSED' as PositionStatus,
        openedAt: new Date(),
        closedAt: new Date(),
        closedPrice: 155.00,
        closeReason: 'Manual close',
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        tradeIdea: null,
      };

      mockPaperPositionRepository.findById.mockResolvedValue(mockClosedPosition);

      const result = await portfolioService.updatePosition(userId, positionId, updateInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot update closed positions');
    });
  });

  describe('closePosition', () => {
    const closePrice = 155.50;
    const closeReason = 'Take profit hit';

    it('should close position successfully', async () => {
      const mockOpenPosition: PaperPositionWithDetails = {
        id: positionId,
        userId,
        groupId,
        tradeIdeaId: null,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        quantity: 100,
        entryPrice: 150.50,
        currentPrice: 155.50,
        stopLoss: 145.00,
        takeProfit: 160.00,
        pnl: 500,
        pnlPercent: 3.32,
        status: 'OPEN' as PositionStatus,
        openedAt: new Date(),
        closedAt: null,
        closedPrice: null,
        closeReason: null,
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        tradeIdea: null,
      };

      const mockClosedPosition = {
        ...mockOpenPosition,
        status: 'CLOSED' as PositionStatus,
        closedPrice: closePrice,
        closedAt: new Date(),
        closeReason,
        pnl: 500, // (155.50 - 150.50) * 100
        pnlPercent: 3.32,
      };

      mockPaperPositionRepository.findById.mockResolvedValue(mockOpenPosition);
      mockPaperPositionRepository.close.mockResolvedValue(mockClosedPosition);

      const result = await portfolioService.closePosition(userId, positionId, closePrice, closeReason);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockClosedPosition);
      expect(mockPaperPositionRepository.close).toHaveBeenCalledWith(positionId, closePrice, closeReason);
    });

    it('should return error if position not found', async () => {
      mockPaperPositionRepository.findById.mockResolvedValue(null);

      const result = await portfolioService.closePosition(userId, positionId, closePrice, closeReason);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position not found');
    });

    it('should return error if user is not owner', async () => {
      const mockOtherUserPosition: PaperPositionWithDetails = {
        id: positionId,
        userId: 'other-user',
        groupId,
        tradeIdeaId: null,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        quantity: 100,
        entryPrice: 150.50,
        currentPrice: 155.50,
        stopLoss: 145.00,
        takeProfit: 160.00,
        pnl: 500,
        pnlPercent: 3.32,
        status: 'OPEN' as PositionStatus,
        openedAt: new Date(),
        closedAt: null,
        closedPrice: null,
        closeReason: null,
        user: {
          id: 'other-user',
          username: 'otheruser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        tradeIdea: null,
      };

      mockPaperPositionRepository.findById.mockResolvedValue(mockOtherUserPosition);

      const result = await portfolioService.closePosition(userId, positionId, closePrice, closeReason);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the position owner can close it');
    });

    it('should return error if position already closed', async () => {
      const mockClosedPosition: PaperPositionWithDetails = {
        id: positionId,
        userId,
        groupId,
        tradeIdeaId: null,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        quantity: 100,
        entryPrice: 150.50,
        currentPrice: 155.00,
        stopLoss: 145.00,
        takeProfit: 160.00,
        pnl: 450,
        pnlPercent: 2.99,
        status: 'CLOSED' as PositionStatus,
        openedAt: new Date(),
        closedAt: new Date(),
        closedPrice: 155.00,
        closeReason: 'Previous close',
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        tradeIdea: null,
      };

      mockPaperPositionRepository.findById.mockResolvedValue(mockClosedPosition);

      const result = await portfolioService.closePosition(userId, positionId, closePrice, closeReason);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position is already closed');
    });

    it('should validate close price is positive', async () => {
      const result = await portfolioService.closePosition(userId, positionId, -10, closeReason);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Close price must be positive');
    });
  });

  describe('deletePosition', () => {
    it('should delete position if user is owner', async () => {
      const mockPosition: PaperPositionWithDetails = {
        id: positionId,
        userId,
        groupId,
        tradeIdeaId: null,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        quantity: 100,
        entryPrice: 150.50,
        currentPrice: 155.50,
        stopLoss: 145.00,
        takeProfit: 160.00,
        pnl: 500,
        pnlPercent: 3.32,
        status: 'OPEN' as PositionStatus,
        openedAt: new Date(),
        closedAt: null,
        closedPrice: null,
        closeReason: null,
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        tradeIdea: null,
      };

      mockPaperPositionRepository.findById.mockResolvedValue(mockPosition);
      mockPaperPositionRepository.delete.mockResolvedValue(true);

      const result = await portfolioService.deletePosition(userId, positionId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockPaperPositionRepository.delete).toHaveBeenCalledWith(positionId);
    });

    it('should return error if position not found', async () => {
      mockPaperPositionRepository.findById.mockResolvedValue(null);

      const result = await portfolioService.deletePosition(userId, positionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position not found');
    });

    it('should return error if user is not owner', async () => {
      const mockOtherUserPosition: PaperPositionWithDetails = {
        id: positionId,
        userId: 'other-user',
        groupId,
        tradeIdeaId: null,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        quantity: 100,
        entryPrice: 150.50,
        currentPrice: 155.50,
        stopLoss: 145.00,
        takeProfit: 160.00,
        pnl: 500,
        pnlPercent: 3.32,
        status: 'OPEN' as PositionStatus,
        openedAt: new Date(),
        closedAt: null,
        closedPrice: null,
        closeReason: null,
        user: {
          id: 'other-user',
          username: 'otheruser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        tradeIdea: null,
      };

      mockPaperPositionRepository.findById.mockResolvedValue(mockOtherUserPosition);

      const result = await portfolioService.deletePosition(userId, positionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the position owner can delete it');
    });
  });

  describe('getPortfolioSummary', () => {
    it('should return portfolio summary for user', async () => {
      const mockSummary: PortfolioSummary = {
        totalValue: 15500.75,
        totalPnl: 750.50,
        totalPnlPercent: 5.09,
        dayPnl: 125.25,
        dayPnlPercent: 0.82,
        openPositions: 5,
        closedPositions: 12,
        activeAlerts: 3,
        buyingPower: 8500.00,
      };

      mockPaperPositionRepository.getPortfolioSummary.mockResolvedValue(mockSummary);

      const result = await portfolioService.getPortfolioSummary(userId, groupId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSummary);
      expect(mockPaperPositionRepository.getPortfolioSummary).toHaveBeenCalledWith(userId, groupId);
    });
  });

  describe('updateCurrentPrices', () => {
    it('should update current prices for all open positions', async () => {
      const priceUpdates = {
        AAPL: 155.50,
        TSLA: 225.75,
        MSFT: 315.25,
      };

      const updatedCount = 5;
      mockPaperPositionRepository.updateCurrentPrice.mockResolvedValue(updatedCount);

      const result = await portfolioService.updateCurrentPrices(userId, priceUpdates);

      expect(result.success).toBe(true);
      expect(result.data).toBe(updatedCount);
      expect(mockPaperPositionRepository.updateCurrentPrice).toHaveBeenCalledWith(userId, priceUpdates);
    });

    it('should handle empty price updates', async () => {
      const result = await portfolioService.updateCurrentPrices(userId, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('No price updates provided');
    });
  });

  describe('getTradingMetrics', () => {
    it('should return trading metrics for user', async () => {
      const mockMetrics = {
        totalTrades: 25,
        winningTrades: 18,
        losingTrades: 7,
        winRate: 72.0,
        totalPnl: 1250.75,
        avgWin: 125.50,
        avgLoss: -45.25,
        bestTrade: 325.00,
        worstTrade: -125.50,
        profitFactor: 3.52,
        sharpeRatio: 1.85,
        maxDrawdown: 8.5,
        currentStreak: 3,
        longestWinStreak: 8,
        longestLossStreak: 3,
      };

      mockPaperPositionRepository.getTradingMetrics.mockResolvedValue(mockMetrics);

      const result = await portfolioService.getTradingMetrics(userId, groupId, 30);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMetrics);
      expect(mockPaperPositionRepository.getTradingMetrics).toHaveBeenCalledWith(userId, groupId, 30);
    });
  });

  describe('getTopPerformers', () => {
    it('should return top performing positions for group', async () => {
      const mockTopPerformers = [
        {
          id: 'pos-1',
          symbol: 'AAPL',
          pnl: 325.50,
          pnlPercent: 15.25,
          user: { username: 'trader1' },
        },
        {
          id: 'pos-2',
          symbol: 'TSLA',
          pnl: 275.00,
          pnlPercent: 12.75,
          user: { username: 'trader2' },
        },
      ];

      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockPaperPositionRepository.getTopPerformers.mockResolvedValue(mockTopPerformers);

      const result = await portfolioService.getTopPerformers(userId, groupId, 10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTopPerformers);
      expect(mockPaperPositionRepository.getTopPerformers).toHaveBeenCalledWith(groupId, 10);
    });

    it('should return error if user not member of group', async () => {
      mockGroupRepository.isMember!.mockResolvedValue(false);

      const result = await portfolioService.getTopPerformers(userId, groupId, 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied to this group');
    });
  });
});