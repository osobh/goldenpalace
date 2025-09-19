import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TradeIdeaService } from '../tradeIdea.service';
import { TradeIdeaRepository } from '../../repositories/tradeIdea.repository';
import { GroupRepository } from '../../repositories/group.repository';
import type {
  CreateTradeIdeaInput,
  UpdateTradeIdeaInput,
  GetTradeIdeasQuery,
  TradeIdeaWithDetails,
  PaginatedResult,
  ServiceResult
} from '@golden-palace/shared/types';
import type { AssetType, TradeDirection, TradeStatus } from '@golden-palace/database';

// Mock the repositories
const mockTradeIdeaRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByGroupId: vi.fn(),
  findByUserId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findBySymbol: vi.fn(),
  findActiveIdeas: vi.fn(),
  findClosedIdeas: vi.fn(),
  updateStatus: vi.fn(),
  getPerformanceStats: vi.fn(),
  getTrendingSymbols: vi.fn(),
  search: vi.fn(),
} as jest.Mocked<TradeIdeaRepository>;

const mockGroupRepository = {
  hasPermission: vi.fn(),
  findById: vi.fn(),
  isMember: vi.fn(),
} as jest.Mocked<Partial<GroupRepository>>;

describe('TradeIdeaService', () => {
  let tradeIdeaService: TradeIdeaService;
  const userId = 'user-123';
  const groupId = 'group-456';
  const tradeIdeaId = 'trade-789';

  beforeEach(() => {
    vi.clearAllMocks();
    tradeIdeaService = new TradeIdeaService(
      mockTradeIdeaRepository,
      mockGroupRepository as GroupRepository
    );
  });

  describe('createTradeIdea', () => {
    const validInput: CreateTradeIdeaInput = {
      groupId,
      symbol: 'AAPL',
      assetType: 'STOCK' as AssetType,
      direction: 'LONG' as TradeDirection,
      entryPrice: 150.50,
      stopLoss: 145.00,
      takeProfit1: 160.00,
      takeProfit2: 165.00,
      takeProfit3: 170.00,
      timeframe: '1D',
      confidence: 4,
      rationale: 'Strong earnings report expected',
      tags: ['earnings', 'tech'],
    };

    it('should create a trade idea successfully', async () => {
      const mockCreatedIdea: TradeIdeaWithDetails = {
        id: tradeIdeaId,
        ...validInput,
        userId,
        status: 'ACTIVE' as TradeStatus,
        pnl: null,
        closedPrice: null,
        closedAt: null,
        chartUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        paperPositions: [],
      };

      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockTradeIdeaRepository.create.mockResolvedValue(mockCreatedIdea);

      const result = await tradeIdeaService.createTradeIdea(userId, validInput);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedIdea);
      expect(mockGroupRepository.isMember).toHaveBeenCalledWith(groupId, userId);
      expect(mockTradeIdeaRepository.create).toHaveBeenCalledWith({
        ...validInput,
        userId,
      });
    });

    it('should return error if user is not a group member', async () => {
      mockGroupRepository.isMember!.mockResolvedValue(false);

      const result = await tradeIdeaService.createTradeIdea(userId, validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You are not a member of this group');
      expect(mockTradeIdeaRepository.create).not.toHaveBeenCalled();
    });

    it('should validate entry price is positive', async () => {
      const invalidInput = { ...validInput, entryPrice: -10 };
      mockGroupRepository.isMember!.mockResolvedValue(true);

      const result = await tradeIdeaService.createTradeIdea(userId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Entry price must be positive');
      expect(mockTradeIdeaRepository.create).not.toHaveBeenCalled();
    });

    it('should validate stop loss is below entry for long positions', async () => {
      const invalidInput = { ...validInput, stopLoss: 155.00 }; // Above entry
      mockGroupRepository.isMember!.mockResolvedValue(true);

      const result = await tradeIdeaService.createTradeIdea(userId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stop loss must be below entry price for long positions');
      expect(mockTradeIdeaRepository.create).not.toHaveBeenCalled();
    });

    it('should validate stop loss is above entry for short positions', async () => {
      const invalidInput = {
        ...validInput,
        direction: 'SHORT' as TradeDirection,
        stopLoss: 145.00
      }; // Below entry
      mockGroupRepository.isMember!.mockResolvedValue(true);

      const result = await tradeIdeaService.createTradeIdea(userId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stop loss must be above entry price for short positions');
      expect(mockTradeIdeaRepository.create).not.toHaveBeenCalled();
    });

    it('should validate take profits are in ascending order for long positions', async () => {
      const invalidInput = {
        ...validInput,
        takeProfit1: 165.00,
        takeProfit2: 160.00, // Lower than TP1
      };
      mockGroupRepository.isMember!.mockResolvedValue(true);

      const result = await tradeIdeaService.createTradeIdea(userId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Take profit levels must be in ascending order for long positions');
      expect(mockTradeIdeaRepository.create).not.toHaveBeenCalled();
    });

    it('should validate confidence rating is between 1-5', async () => {
      const invalidInput = { ...validInput, confidence: 6 };
      mockGroupRepository.isMember!.mockResolvedValue(true);

      const result = await tradeIdeaService.createTradeIdea(userId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Confidence must be between 1 and 5');
      expect(mockTradeIdeaRepository.create).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockTradeIdeaRepository.create.mockRejectedValue(new Error('Database error'));

      const result = await tradeIdeaService.createTradeIdea(userId, validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create trade idea');
    });
  });

  describe('getTradeIdea', () => {
    it('should return trade idea if user has access', async () => {
      const mockTradeIdea: TradeIdeaWithDetails = {
        id: tradeIdeaId,
        groupId,
        userId: 'other-user',
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        direction: 'LONG' as TradeDirection,
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
        user: {
          id: 'other-user',
          username: 'otheruser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        paperPositions: [],
      };

      mockTradeIdeaRepository.findById.mockResolvedValue(mockTradeIdea);
      mockGroupRepository.isMember!.mockResolvedValue(true);

      const result = await tradeIdeaService.getTradeIdea(userId, tradeIdeaId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTradeIdea);
      expect(mockGroupRepository.isMember).toHaveBeenCalledWith(groupId, userId);
    });

    it('should return error if trade idea not found', async () => {
      mockTradeIdeaRepository.findById.mockResolvedValue(null);

      const result = await tradeIdeaService.getTradeIdea(userId, tradeIdeaId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Trade idea not found');
    });

    it('should return error if user has no access to group', async () => {
      const mockTradeIdea: TradeIdeaWithDetails = {
        id: tradeIdeaId,
        groupId,
        userId: 'other-user',
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        direction: 'LONG' as TradeDirection,
        entryPrice: 150.50,
        stopLoss: null,
        takeProfit1: null,
        takeProfit2: null,
        takeProfit3: null,
        timeframe: null,
        confidence: null,
        rationale: null,
        chartUrl: null,
        tags: [],
        status: 'ACTIVE' as TradeStatus,
        closedPrice: null,
        closedAt: null,
        pnl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'other-user',
          username: 'otheruser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        paperPositions: [],
      };

      mockTradeIdeaRepository.findById.mockResolvedValue(mockTradeIdea);
      mockGroupRepository.isMember!.mockResolvedValue(false);

      const result = await tradeIdeaService.getTradeIdea(userId, tradeIdeaId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('getTradeIdeas', () => {
    const query: GetTradeIdeasQuery = {
      page: 1,
      limit: 20,
      symbol: 'AAPL',
      status: 'ACTIVE',
      direction: 'LONG',
      assetType: 'STOCK',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    it('should return paginated trade ideas for group', async () => {
      const mockResult: PaginatedResult<TradeIdeaWithDetails> = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockTradeIdeaRepository.findByGroupId.mockResolvedValue(mockResult);

      const result = await tradeIdeaService.getTradeIdeas(userId, groupId, query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(mockGroupRepository.isMember).toHaveBeenCalledWith(groupId, userId);
    });

    it('should return error if user not member of group', async () => {
      mockGroupRepository.isMember!.mockResolvedValue(false);

      const result = await tradeIdeaService.getTradeIdeas(userId, groupId, query);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied to this group');
    });
  });

  describe('updateTradeIdea', () => {
    const updateInput: UpdateTradeIdeaInput = {
      stopLoss: 148.00,
      takeProfit1: 158.00,
      rationale: 'Updated analysis based on market conditions',
      confidence: 3,
    };

    it('should update trade idea if user is owner', async () => {
      const mockOriginalIdea: TradeIdeaWithDetails = {
        id: tradeIdeaId,
        groupId,
        userId,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        direction: 'LONG' as TradeDirection,
        entryPrice: 150.50,
        stopLoss: 145.00,
        takeProfit1: 160.00,
        takeProfit2: null,
        takeProfit3: null,
        timeframe: '1D',
        confidence: 4,
        rationale: 'Original rationale',
        chartUrl: null,
        tags: ['earnings'],
        status: 'ACTIVE' as TradeStatus,
        closedPrice: null,
        closedAt: null,
        pnl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        paperPositions: [],
      };

      const mockUpdatedIdea = {
        ...mockOriginalIdea,
        ...updateInput,
        updatedAt: new Date(),
      };

      mockTradeIdeaRepository.findById.mockResolvedValue(mockOriginalIdea);
      mockTradeIdeaRepository.update.mockResolvedValue(mockUpdatedIdea);

      const result = await tradeIdeaService.updateTradeIdea(userId, tradeIdeaId, updateInput);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedIdea);
      expect(mockTradeIdeaRepository.update).toHaveBeenCalledWith(tradeIdeaId, updateInput);
    });

    it('should return error if trade idea not found', async () => {
      mockTradeIdeaRepository.findById.mockResolvedValue(null);

      const result = await tradeIdeaService.updateTradeIdea(userId, tradeIdeaId, updateInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Trade idea not found');
    });

    it('should return error if user is not owner', async () => {
      const mockOriginalIdea: TradeIdeaWithDetails = {
        id: tradeIdeaId,
        groupId,
        userId: 'other-user',
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        direction: 'LONG' as TradeDirection,
        entryPrice: 150.50,
        stopLoss: 145.00,
        takeProfit1: 160.00,
        takeProfit2: null,
        takeProfit3: null,
        timeframe: '1D',
        confidence: 4,
        rationale: 'Original rationale',
        chartUrl: null,
        tags: ['earnings'],
        status: 'ACTIVE' as TradeStatus,
        closedPrice: null,
        closedAt: null,
        pnl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'other-user',
          username: 'otheruser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        paperPositions: [],
      };

      mockTradeIdeaRepository.findById.mockResolvedValue(mockOriginalIdea);

      const result = await tradeIdeaService.updateTradeIdea(userId, tradeIdeaId, updateInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the trade idea owner can update it');
    });

    it('should return error if trade idea is closed', async () => {
      const mockClosedIdea: TradeIdeaWithDetails = {
        id: tradeIdeaId,
        groupId,
        userId,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        direction: 'LONG' as TradeDirection,
        entryPrice: 150.50,
        stopLoss: 145.00,
        takeProfit1: 160.00,
        takeProfit2: null,
        takeProfit3: null,
        timeframe: '1D',
        confidence: 4,
        rationale: 'Original rationale',
        chartUrl: null,
        tags: ['earnings'],
        status: 'CLOSED' as TradeStatus,
        closedPrice: 155.00,
        closedAt: new Date(),
        pnl: 100.50,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        paperPositions: [],
      };

      mockTradeIdeaRepository.findById.mockResolvedValue(mockClosedIdea);

      const result = await tradeIdeaService.updateTradeIdea(userId, tradeIdeaId, updateInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot update closed trade ideas');
    });
  });

  describe('closeTradeIdea', () => {
    const closedPrice = 155.50;

    it('should close trade idea successfully', async () => {
      const mockActiveIdea: TradeIdeaWithDetails = {
        id: tradeIdeaId,
        groupId,
        userId,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        direction: 'LONG' as TradeDirection,
        entryPrice: 150.50,
        stopLoss: 145.00,
        takeProfit1: 160.00,
        takeProfit2: null,
        takeProfit3: null,
        timeframe: '1D',
        confidence: 4,
        rationale: 'Test rationale',
        chartUrl: null,
        tags: ['test'],
        status: 'ACTIVE' as TradeStatus,
        closedPrice: null,
        closedAt: null,
        pnl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        paperPositions: [],
      };

      const mockClosedIdea = {
        ...mockActiveIdea,
        status: 'CLOSED' as TradeStatus,
        closedPrice,
        closedAt: new Date(),
        pnl: 5.00, // (155.50 - 150.50)
      };

      mockTradeIdeaRepository.findById.mockResolvedValue(mockActiveIdea);
      mockTradeIdeaRepository.update.mockResolvedValue(mockClosedIdea);

      const result = await tradeIdeaService.closeTradeIdea(userId, tradeIdeaId, closedPrice);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockClosedIdea);
      expect(mockTradeIdeaRepository.update).toHaveBeenCalledWith(tradeIdeaId, {
        status: 'CLOSED',
        closedPrice,
        closedAt: expect.any(Date),
        pnl: 5.00,
      });
    });

    it('should calculate negative PnL for short positions', async () => {
      const mockShortIdea: TradeIdeaWithDetails = {
        id: tradeIdeaId,
        groupId,
        userId,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        direction: 'SHORT' as TradeDirection,
        entryPrice: 150.50,
        stopLoss: 155.00,
        takeProfit1: 145.00,
        takeProfit2: null,
        takeProfit3: null,
        timeframe: '1D',
        confidence: 3,
        rationale: 'Bearish outlook',
        chartUrl: null,
        tags: ['short'],
        status: 'ACTIVE' as TradeStatus,
        closedPrice: null,
        closedAt: null,
        pnl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        paperPositions: [],
      };

      const shortClosedPrice = 155.50;
      const mockClosedShort = {
        ...mockShortIdea,
        status: 'CLOSED' as TradeStatus,
        closedPrice: shortClosedPrice,
        closedAt: new Date(),
        pnl: -5.00, // (150.50 - 155.50) for short
      };

      mockTradeIdeaRepository.findById.mockResolvedValue(mockShortIdea);
      mockTradeIdeaRepository.update.mockResolvedValue(mockClosedShort);

      const result = await tradeIdeaService.closeTradeIdea(userId, tradeIdeaId, shortClosedPrice);

      expect(result.success).toBe(true);
      expect(result.data?.pnl).toBe(-5.00);
    });

    it('should return error if trade idea not found', async () => {
      mockTradeIdeaRepository.findById.mockResolvedValue(null);

      const result = await tradeIdeaService.closeTradeIdea(userId, tradeIdeaId, closedPrice);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Trade idea not found');
    });

    it('should return error if user is not owner', async () => {
      const mockOtherUserIdea: TradeIdeaWithDetails = {
        id: tradeIdeaId,
        groupId,
        userId: 'other-user',
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        direction: 'LONG' as TradeDirection,
        entryPrice: 150.50,
        stopLoss: null,
        takeProfit1: null,
        takeProfit2: null,
        takeProfit3: null,
        timeframe: null,
        confidence: null,
        rationale: null,
        chartUrl: null,
        tags: [],
        status: 'ACTIVE' as TradeStatus,
        closedPrice: null,
        closedAt: null,
        pnl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'other-user',
          username: 'otheruser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        paperPositions: [],
      };

      mockTradeIdeaRepository.findById.mockResolvedValue(mockOtherUserIdea);

      const result = await tradeIdeaService.closeTradeIdea(userId, tradeIdeaId, closedPrice);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the trade idea owner can close it');
    });

    it('should return error if trade idea already closed', async () => {
      const mockClosedIdea: TradeIdeaWithDetails = {
        id: tradeIdeaId,
        groupId,
        userId,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        direction: 'LONG' as TradeDirection,
        entryPrice: 150.50,
        stopLoss: 145.00,
        takeProfit1: 160.00,
        takeProfit2: null,
        takeProfit3: null,
        timeframe: '1D',
        confidence: 4,
        rationale: 'Test rationale',
        chartUrl: null,
        tags: ['test'],
        status: 'CLOSED' as TradeStatus,
        closedPrice: 155.00,
        closedAt: new Date(),
        pnl: 4.50,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        paperPositions: [],
      };

      mockTradeIdeaRepository.findById.mockResolvedValue(mockClosedIdea);

      const result = await tradeIdeaService.closeTradeIdea(userId, tradeIdeaId, closedPrice);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Trade idea is already closed');
    });

    it('should validate closed price is positive', async () => {
      const result = await tradeIdeaService.closeTradeIdea(userId, tradeIdeaId, -10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Closed price must be positive');
    });
  });

  describe('deleteTradeIdea', () => {
    it('should delete trade idea if user is owner', async () => {
      const mockIdea: TradeIdeaWithDetails = {
        id: tradeIdeaId,
        groupId,
        userId,
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        direction: 'LONG' as TradeDirection,
        entryPrice: 150.50,
        stopLoss: null,
        takeProfit1: null,
        takeProfit2: null,
        takeProfit3: null,
        timeframe: null,
        confidence: null,
        rationale: null,
        chartUrl: null,
        tags: [],
        status: 'ACTIVE' as TradeStatus,
        closedPrice: null,
        closedAt: null,
        pnl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        paperPositions: [],
      };

      mockTradeIdeaRepository.findById.mockResolvedValue(mockIdea);
      mockTradeIdeaRepository.delete.mockResolvedValue(true);

      const result = await tradeIdeaService.deleteTradeIdea(userId, tradeIdeaId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockTradeIdeaRepository.delete).toHaveBeenCalledWith(tradeIdeaId);
    });

    it('should return error if trade idea not found', async () => {
      mockTradeIdeaRepository.findById.mockResolvedValue(null);

      const result = await tradeIdeaService.deleteTradeIdea(userId, tradeIdeaId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Trade idea not found');
    });

    it('should return error if user is not owner', async () => {
      const mockOtherUserIdea: TradeIdeaWithDetails = {
        id: tradeIdeaId,
        groupId,
        userId: 'other-user',
        symbol: 'AAPL',
        assetType: 'STOCK' as AssetType,
        direction: 'LONG' as TradeDirection,
        entryPrice: 150.50,
        stopLoss: null,
        takeProfit1: null,
        takeProfit2: null,
        takeProfit3: null,
        timeframe: null,
        confidence: null,
        rationale: null,
        chartUrl: null,
        tags: [],
        status: 'ACTIVE' as TradeStatus,
        closedPrice: null,
        closedAt: null,
        pnl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'other-user',
          username: 'otheruser',
          avatarUrl: null,
        },
        group: {
          id: groupId,
          name: 'Test Group',
        },
        paperPositions: [],
      };

      mockTradeIdeaRepository.findById.mockResolvedValue(mockOtherUserIdea);

      const result = await tradeIdeaService.deleteTradeIdea(userId, tradeIdeaId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the trade idea owner can delete it');
    });
  });

  describe('searchTradeIdeas', () => {
    it('should search trade ideas with query filters', async () => {
      const searchQuery = {
        groupId,
        symbol: 'AAPL',
        query: 'earnings',
        page: 1,
        limit: 10,
      };

      const mockResults: PaginatedResult<TradeIdeaWithDetails> = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockTradeIdeaRepository.search.mockResolvedValue(mockResults);

      const result = await tradeIdeaService.searchTradeIdeas(userId, searchQuery);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
      expect(mockTradeIdeaRepository.search).toHaveBeenCalledWith(searchQuery);
    });

    it('should return error if user not member of group', async () => {
      mockGroupRepository.isMember!.mockResolvedValue(false);

      const result = await tradeIdeaService.searchTradeIdeas(userId, { groupId });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied to this group');
    });
  });

  describe('getPerformanceStats', () => {
    it('should return performance statistics for user', async () => {
      const mockStats = {
        totalIdeas: 10,
        activeIdeas: 3,
        closedIdeas: 7,
        winningIdeas: 5,
        losingIdeas: 2,
        winRate: 71.43,
        totalPnl: 250.75,
        avgWin: 75.15,
        avgLoss: -25.30,
        bestTrade: 150.50,
        worstTrade: -45.20,
        profitFactor: 2.97,
      };

      mockTradeIdeaRepository.getPerformanceStats.mockResolvedValue(mockStats);

      const result = await tradeIdeaService.getPerformanceStats(userId, groupId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(mockTradeIdeaRepository.getPerformanceStats).toHaveBeenCalledWith(userId, groupId);
    });
  });

  describe('getTrendingSymbols', () => {
    it('should return trending symbols for group', async () => {
      const mockTrending = [
        { symbol: 'AAPL', count: 5, avgPnl: 25.50 },
        { symbol: 'TSLA', count: 3, avgPnl: -10.25 },
        { symbol: 'MSFT', count: 2, avgPnl: 45.75 },
      ];

      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockTradeIdeaRepository.getTrendingSymbols.mockResolvedValue(mockTrending);

      const result = await tradeIdeaService.getTrendingSymbols(userId, groupId, 7);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTrending);
      expect(mockTradeIdeaRepository.getTrendingSymbols).toHaveBeenCalledWith(groupId, 7);
    });

    it('should return error if user not member of group', async () => {
      mockGroupRepository.isMember!.mockResolvedValue(false);

      const result = await tradeIdeaService.getTrendingSymbols(userId, groupId, 7);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied to this group');
    });
  });
});