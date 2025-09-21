import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompetitionService } from '../competition.service';
import { CompetitionRepository } from '../../repositories/competition.repository';
import { CompetitionEntryRepository } from '../../repositories/competitionEntry.repository';
import { GroupRepository } from '../../repositories/group.repository';
import { PaperPositionRepository } from '../../repositories/paperPosition.repository';
import type {
  CreateCompetitionInput,
  UpdateCompetitionInput,
  GetCompetitionsQuery,
  CompetitionWithDetails,
  CompetitionEntryWithDetails,
  LeaderboardEntry,
  CompetitionStats,
  PaginatedResult,
  ServiceResult
} from '@golden-palace/shared';
import type { CompetitionType, CompetitionStatus, GroupRole } from '@golden-palace/database';

// Mock the repositories
const mockCompetitionRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByGroupId: vi.fn(),
  findActive: vi.fn(),
  findUpcoming: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  updateStatus: vi.fn(),
  getStats: vi.fn(),
  getUserStats: vi.fn(),
} as jest.Mocked<CompetitionRepository>;

const mockCompetitionEntryRepository = {
  create: vi.fn(),
  findByCompetitionId: vi.fn(),
  findByUserId: vi.fn(),
  findByCompetitionAndUser: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  updateScores: vi.fn(),
  getLeaderboard: vi.fn(),
  calculateRankings: vi.fn(),
} as jest.Mocked<CompetitionEntryRepository>;

const mockGroupRepository = {
  hasPermission: vi.fn(),
  findById: vi.fn(),
  isMember: vi.fn(),
} as jest.Mocked<Partial<GroupRepository>>;

const mockPaperPositionRepository = {
  findByUserId: vi.fn(),
  getTradingMetrics: vi.fn(),
} as jest.Mocked<Partial<PaperPositionRepository>>;

describe('CompetitionService', () => {
  let competitionService: CompetitionService;
  const userId = 'user-123';
  const groupId = 'group-456';
  const competitionId = 'comp-789';

  beforeEach(() => {
    vi.clearAllMocks();
    competitionService = new CompetitionService(
      mockCompetitionRepository,
      mockCompetitionEntryRepository,
      mockGroupRepository as GroupRepository,
      mockPaperPositionRepository as PaperPositionRepository
    );
  });

  describe('createCompetition', () => {
    const validInput: CreateCompetitionInput = {
      groupId,
      name: 'Monthly Trading Competition',
      description: 'Test your trading skills',
      type: 'MONTHLY_ROI' as CompetitionType,
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-10-31'),
      entryFee: 100,
      prizePool: 5000,
      prizeDistribution: [
        { rank: 1, percentage: 50 },
        { rank: 2, percentage: 30 },
        { rank: 3, percentage: 20 },
      ],
      minTrades: 10,
    };

    it('should create a competition successfully', async () => {
      const mockCreatedCompetition: CompetitionWithDetails = {
        id: competitionId,
        ...validInput,
        status: 'PENDING' as CompetitionStatus,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        rules: null,
        group: {
          id: groupId,
          name: 'Test Group',
        },
        creator: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        entries: [],
        entryCount: 0,
      };

      mockGroupRepository.hasPermission!.mockResolvedValue(true);
      mockCompetitionRepository.create.mockResolvedValue(mockCreatedCompetition);

      const result = await competitionService.createCompetition(userId, validInput);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedCompetition);
      expect(mockGroupRepository.hasPermission).toHaveBeenCalledWith(groupId, userId, ['OWNER', 'ADMIN', 'MODERATOR']);
      expect(mockCompetitionRepository.create).toHaveBeenCalledWith({
        ...validInput,
        createdBy: userId,
      });
    });

    it('should return error if user lacks permissions', async () => {
      mockGroupRepository.hasPermission!.mockResolvedValue(false);

      const result = await competitionService.createCompetition(userId, validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You do not have permission to create competitions in this group');
      expect(mockCompetitionRepository.create).not.toHaveBeenCalled();
    });

    it('should validate start date is in the future', async () => {
      const invalidInput = {
        ...validInput,
        startDate: new Date('2020-01-01'), // Past date
      };
      mockGroupRepository.hasPermission!.mockResolvedValue(true);

      const result = await competitionService.createCompetition(userId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Start date must be in the future');
      expect(mockCompetitionRepository.create).not.toHaveBeenCalled();
    });

    it('should validate end date is after start date', async () => {
      const invalidInput = {
        ...validInput,
        endDate: new Date('2025-09-01'), // Before start date
      };
      mockGroupRepository.hasPermission!.mockResolvedValue(true);

      const result = await competitionService.createCompetition(userId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('End date must be after start date');
      expect(mockCompetitionRepository.create).not.toHaveBeenCalled();
    });

    it('should validate prize distribution totals 100%', async () => {
      const invalidInput = {
        ...validInput,
        prizeDistribution: [
          { rank: 1, percentage: 50 },
          { rank: 2, percentage: 30 },
          { rank: 3, percentage: 15 }, // Total = 95%
        ],
      };
      mockGroupRepository.hasPermission!.mockResolvedValue(true);

      const result = await competitionService.createCompetition(userId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Prize distribution must total 100%');
      expect(mockCompetitionRepository.create).not.toHaveBeenCalled();
    });

    it('should validate minimum trades is reasonable', async () => {
      const invalidInput = {
        ...validInput,
        minTrades: 1000, // Unreasonably high
      };
      mockGroupRepository.hasPermission!.mockResolvedValue(true);

      const result = await competitionService.createCompetition(userId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Minimum trades must be between 0 and 500');
      expect(mockCompetitionRepository.create).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      mockGroupRepository.hasPermission!.mockResolvedValue(true);
      mockCompetitionRepository.create.mockRejectedValue(new Error('Database error'));

      const result = await competitionService.createCompetition(userId, validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create competition');
    });
  });

  describe('getCompetition', () => {
    it('should return competition if user has access', async () => {
      const mockCompetition: CompetitionWithDetails = {
        id: competitionId,
        groupId,
        name: 'Test Competition',
        description: 'Test description',
        type: 'WEEKLY_PNL' as CompetitionType,
        startDate: new Date(),
        endDate: new Date(),
        entryFee: 100,
        prizePool: 5000,
        prizeDistribution: null,
        rules: null,
        minTrades: 5,
        status: 'ACTIVE' as CompetitionStatus,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        group: {
          id: groupId,
          name: 'Test Group',
        },
        creator: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
        entries: [],
        entryCount: 0,
      };

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockGroupRepository.isMember!.mockResolvedValue(true);

      const result = await competitionService.getCompetition(userId, competitionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCompetition);
      expect(mockGroupRepository.isMember).toHaveBeenCalledWith(groupId, userId);
    });

    it('should return error if competition not found', async () => {
      mockCompetitionRepository.findById.mockResolvedValue(null);

      const result = await competitionService.getCompetition(userId, competitionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Competition not found');
    });

    it('should return error if user has no access to group', async () => {
      const mockCompetition: CompetitionWithDetails = {
        id: competitionId,
        groupId,
        name: 'Test Competition',
        description: null,
        type: 'WEEKLY_PNL' as CompetitionType,
        startDate: new Date(),
        endDate: new Date(),
        entryFee: null,
        prizePool: null,
        prizeDistribution: null,
        rules: null,
        minTrades: 5,
        status: 'ACTIVE' as CompetitionStatus,
        createdBy: 'other-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: groupId, name: 'Test Group' },
        creator: { id: 'other-user', username: 'otheruser', avatarUrl: null },
        entries: [],
        entryCount: 0,
      };

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockGroupRepository.isMember!.mockResolvedValue(false);

      const result = await competitionService.getCompetition(userId, competitionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('joinCompetition', () => {
    const mockCompetition: CompetitionWithDetails = {
      id: competitionId,
      groupId,
      name: 'Test Competition',
      description: null,
      type: 'WEEKLY_PNL' as CompetitionType,
      startDate: new Date(Date.now() + 86400000), // Tomorrow
      endDate: new Date(Date.now() + 86400000 * 7), // Next week
      entryFee: 100,
      prizePool: 5000,
      prizeDistribution: null,
      rules: null,
      minTrades: 5,
      status: 'PENDING' as CompetitionStatus,
      createdBy: 'other-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      group: { id: groupId, name: 'Test Group' },
      creator: { id: 'other-user', username: 'otheruser', avatarUrl: null },
      entries: [],
      entryCount: 0,
    };

    it('should join competition successfully', async () => {
      const mockEntry: CompetitionEntryWithDetails = {
        id: 'entry-123',
        competitionId,
        userId,
        startingBalance: 10000,
        currentBalance: 10000,
        totalTrades: 0,
        winningTrades: 0,
        roi: 0,
        rank: null,
        prizeAmount: null,
        updatedAt: new Date(),
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
      };

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockCompetitionEntryRepository.findByCompetitionAndUser.mockResolvedValue(null);
      mockCompetitionEntryRepository.create.mockResolvedValue(mockEntry);

      const result = await competitionService.joinCompetition(userId, competitionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEntry);
      expect(mockCompetitionEntryRepository.create).toHaveBeenCalledWith({
        competitionId,
        userId,
        startingBalance: 10000,
      });
    });

    it('should return error if already joined', async () => {
      const existingEntry: CompetitionEntryWithDetails = {
        id: 'entry-123',
        competitionId,
        userId,
        startingBalance: 10000,
        currentBalance: 10000,
        totalTrades: 0,
        winningTrades: 0,
        roi: 0,
        rank: null,
        prizeAmount: null,
        updatedAt: new Date(),
        user: { id: userId, username: 'testuser', avatarUrl: null },
      };

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockCompetitionEntryRepository.findByCompetitionAndUser.mockResolvedValue(existingEntry);

      const result = await competitionService.joinCompetition(userId, competitionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You have already joined this competition');
      expect(mockCompetitionEntryRepository.create).not.toHaveBeenCalled();
    });

    it('should return error if competition not found', async () => {
      mockCompetitionRepository.findById.mockResolvedValue(null);

      const result = await competitionService.joinCompetition(userId, competitionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Competition not found');
    });

    it('should return error if user not member of group', async () => {
      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockGroupRepository.isMember!.mockResolvedValue(false);

      const result = await competitionService.joinCompetition(userId, competitionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You must be a member of the group to join this competition');
    });

    it('should return error if competition already started', async () => {
      const startedCompetition = {
        ...mockCompetition,
        status: 'ACTIVE' as CompetitionStatus,
        startDate: new Date(Date.now() - 86400000), // Yesterday
      };

      mockCompetitionRepository.findById.mockResolvedValue(startedCompetition);
      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockCompetitionEntryRepository.findByCompetitionAndUser.mockResolvedValue(null);

      const result = await competitionService.joinCompetition(userId, competitionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Competition has already started');
    });

    it('should return error if competition is cancelled', async () => {
      const cancelledCompetition = {
        ...mockCompetition,
        status: 'CANCELLED' as CompetitionStatus,
      };

      mockCompetitionRepository.findById.mockResolvedValue(cancelledCompetition);
      mockGroupRepository.isMember!.mockResolvedValue(true);

      const result = await competitionService.joinCompetition(userId, competitionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Competition is cancelled');
    });
  });

  describe('updateCompetition', () => {
    const updateInput: UpdateCompetitionInput = {
      name: 'Updated Competition Name',
      description: 'Updated description',
      prizePool: 7500,
    };

    it('should update competition if user is creator', async () => {
      const mockCompetition: CompetitionWithDetails = {
        id: competitionId,
        groupId,
        name: 'Original Name',
        description: 'Original description',
        type: 'WEEKLY_PNL' as CompetitionType,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 86400000 * 7),
        entryFee: 100,
        prizePool: 5000,
        prizeDistribution: null,
        rules: null,
        minTrades: 5,
        status: 'PENDING' as CompetitionStatus,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: groupId, name: 'Test Group' },
        creator: { id: userId, username: 'testuser', avatarUrl: null },
        entries: [],
        entryCount: 0,
      };

      const updatedCompetition = {
        ...mockCompetition,
        ...updateInput,
      };

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockCompetitionRepository.update.mockResolvedValue(updatedCompetition);

      const result = await competitionService.updateCompetition(userId, competitionId, updateInput);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedCompetition);
      expect(mockCompetitionRepository.update).toHaveBeenCalledWith(competitionId, updateInput);
    });

    it('should allow admin to update competition', async () => {
      const mockCompetition: CompetitionWithDetails = {
        id: competitionId,
        groupId,
        name: 'Original Name',
        description: null,
        type: 'WEEKLY_PNL' as CompetitionType,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 86400000 * 7),
        entryFee: null,
        prizePool: 5000,
        prizeDistribution: null,
        rules: null,
        minTrades: 5,
        status: 'PENDING' as CompetitionStatus,
        createdBy: 'other-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: groupId, name: 'Test Group' },
        creator: { id: 'other-user', username: 'otheruser', avatarUrl: null },
        entries: [],
        entryCount: 0,
      };

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockGroupRepository.hasPermission!.mockResolvedValue(true);
      mockCompetitionRepository.update.mockResolvedValue({ ...mockCompetition, ...updateInput });

      const result = await competitionService.updateCompetition(userId, competitionId, updateInput);

      expect(result.success).toBe(true);
      expect(mockGroupRepository.hasPermission).toHaveBeenCalledWith(groupId, userId, ['OWNER', 'ADMIN']);
    });

    it('should return error if competition not found', async () => {
      mockCompetitionRepository.findById.mockResolvedValue(null);

      const result = await competitionService.updateCompetition(userId, competitionId, updateInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Competition not found');
    });

    it('should return error if user lacks permissions', async () => {
      const mockCompetition: CompetitionWithDetails = {
        id: competitionId,
        groupId,
        name: 'Original Name',
        description: null,
        type: 'WEEKLY_PNL' as CompetitionType,
        startDate: new Date(),
        endDate: new Date(),
        entryFee: null,
        prizePool: 5000,
        prizeDistribution: null,
        rules: null,
        minTrades: 5,
        status: 'PENDING' as CompetitionStatus,
        createdBy: 'other-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: groupId, name: 'Test Group' },
        creator: { id: 'other-user', username: 'otheruser', avatarUrl: null },
        entries: [],
        entryCount: 0,
      };

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockGroupRepository.hasPermission!.mockResolvedValue(false);

      const result = await competitionService.updateCompetition(userId, competitionId, updateInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You do not have permission to update this competition');
    });

    it('should return error if competition already started', async () => {
      const startedCompetition: CompetitionWithDetails = {
        id: competitionId,
        groupId,
        name: 'Original Name',
        description: null,
        type: 'WEEKLY_PNL' as CompetitionType,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000 * 7),
        entryFee: null,
        prizePool: 5000,
        prizeDistribution: null,
        rules: null,
        minTrades: 5,
        status: 'ACTIVE' as CompetitionStatus,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: groupId, name: 'Test Group' },
        creator: { id: userId, username: 'testuser', avatarUrl: null },
        entries: [],
        entryCount: 0,
      };

      mockCompetitionRepository.findById.mockResolvedValue(startedCompetition);

      const result = await competitionService.updateCompetition(userId, competitionId, updateInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot update competition after it has started');
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard for active competition', async () => {
      const mockCompetition: CompetitionWithDetails = {
        id: competitionId,
        groupId,
        name: 'Test Competition',
        description: null,
        type: 'WEEKLY_PNL' as CompetitionType,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000 * 6),
        entryFee: null,
        prizePool: 5000,
        prizeDistribution: null,
        rules: null,
        minTrades: 5,
        status: 'ACTIVE' as CompetitionStatus,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: groupId, name: 'Test Group' },
        creator: { id: userId, username: 'testuser', avatarUrl: null },
        entries: [],
        entryCount: 3,
      };

      const mockLeaderboard: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user-1',
          username: 'trader1',
          avatarUrl: null,
          totalTrades: 15,
          winningTrades: 12,
          roi: 25.5,
          pnl: 2550,
          winRate: 80,
          consistency: 0.85,
          prizeAmount: 2500,
        },
        {
          rank: 2,
          userId: 'user-2',
          username: 'trader2',
          avatarUrl: null,
          totalTrades: 12,
          winningTrades: 8,
          roi: 18.2,
          pnl: 1820,
          winRate: 66.7,
          consistency: 0.72,
          prizeAmount: 1500,
        },
      ];

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockGroupRepository.isMember!.mockResolvedValue(true);
      mockCompetitionEntryRepository.getLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await competitionService.getLeaderboard(userId, competitionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLeaderboard);
      expect(mockCompetitionEntryRepository.getLeaderboard).toHaveBeenCalledWith(competitionId);
    });

    it('should return error if competition not found', async () => {
      mockCompetitionRepository.findById.mockResolvedValue(null);

      const result = await competitionService.getLeaderboard(userId, competitionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Competition not found');
    });

    it('should return error if user not member of group', async () => {
      const mockCompetition: CompetitionWithDetails = {
        id: competitionId,
        groupId,
        name: 'Test Competition',
        description: null,
        type: 'WEEKLY_PNL' as CompetitionType,
        startDate: new Date(),
        endDate: new Date(),
        entryFee: null,
        prizePool: null,
        prizeDistribution: null,
        rules: null,
        minTrades: 5,
        status: 'ACTIVE' as CompetitionStatus,
        createdBy: 'other-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: groupId, name: 'Test Group' },
        creator: { id: 'other-user', username: 'otheruser', avatarUrl: null },
        entries: [],
        entryCount: 0,
      };

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockGroupRepository.isMember!.mockResolvedValue(false);

      const result = await competitionService.getLeaderboard(userId, competitionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('updateScores', () => {
    it('should update scores for active competition', async () => {
      const mockCompetition: CompetitionWithDetails = {
        id: competitionId,
        groupId,
        name: 'Test Competition',
        description: null,
        type: 'WEEKLY_PNL' as CompetitionType,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000 * 6),
        entryFee: null,
        prizePool: null,
        prizeDistribution: null,
        rules: null,
        minTrades: 5,
        status: 'ACTIVE' as CompetitionStatus,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: groupId, name: 'Test Group' },
        creator: { id: userId, username: 'testuser', avatarUrl: null },
        entries: [],
        entryCount: 3,
      };

      const mockEntries: CompetitionEntryWithDetails[] = [
        {
          id: 'entry-1',
          competitionId,
          userId: 'user-1',
          startingBalance: 10000,
          currentBalance: 12500,
          totalTrades: 15,
          winningTrades: 12,
          roi: 25,
          rank: null,
          prizeAmount: null,
          updatedAt: new Date(),
          user: { id: 'user-1', username: 'trader1', avatarUrl: null },
        },
      ];

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockCompetitionEntryRepository.findByCompetitionId.mockResolvedValue(mockEntries);
      mockPaperPositionRepository.getTradingMetrics!.mockResolvedValue({
        totalTrades: 15,
        winningTrades: 12,
        losingTrades: 3,
        winRate: 80,
        totalPnl: 2500,
        avgWin: 250,
        avgLoss: -50,
        bestTrade: 500,
        worstTrade: -100,
        profitFactor: 5,
        sharpeRatio: 1.5,
        maxDrawdown: 5,
        currentStreak: 3,
        longestWinStreak: 8,
        longestLossStreak: 2,
      });
      mockCompetitionEntryRepository.updateScores.mockResolvedValue(true);
      mockCompetitionEntryRepository.calculateRankings.mockResolvedValue(true);

      const result = await competitionService.updateScores(competitionId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockCompetitionEntryRepository.updateScores).toHaveBeenCalled();
      expect(mockCompetitionEntryRepository.calculateRankings).toHaveBeenCalledWith(competitionId);
    });

    it('should return error if competition not active', async () => {
      const mockCompetition: CompetitionWithDetails = {
        id: competitionId,
        groupId,
        name: 'Test Competition',
        description: null,
        type: 'WEEKLY_PNL' as CompetitionType,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 86400000 * 7),
        entryFee: null,
        prizePool: null,
        prizeDistribution: null,
        rules: null,
        minTrades: 5,
        status: 'PENDING' as CompetitionStatus,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: groupId, name: 'Test Group' },
        creator: { id: userId, username: 'testuser', avatarUrl: null },
        entries: [],
        entryCount: 0,
      };

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);

      const result = await competitionService.updateScores(competitionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Competition is not active');
    });
  });

  describe('endCompetition', () => {
    it('should end competition and distribute prizes', async () => {
      const mockCompetition: CompetitionWithDetails = {
        id: competitionId,
        groupId,
        name: 'Test Competition',
        description: null,
        type: 'WEEKLY_PNL' as CompetitionType,
        startDate: new Date(Date.now() - 86400000 * 7),
        endDate: new Date(Date.now() - 3600000), // 1 hour ago
        entryFee: 100,
        prizePool: 5000,
        prizeDistribution: [
          { rank: 1, percentage: 50 },
          { rank: 2, percentage: 30 },
          { rank: 3, percentage: 20 },
        ],
        rules: null,
        minTrades: 5,
        status: 'ACTIVE' as CompetitionStatus,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: groupId, name: 'Test Group' },
        creator: { id: userId, username: 'testuser', avatarUrl: null },
        entries: [],
        entryCount: 5,
      };

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockGroupRepository.hasPermission!.mockResolvedValue(true);
      mockCompetitionRepository.updateStatus.mockResolvedValue(true);

      const result = await competitionService.endCompetition(userId, competitionId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockCompetitionRepository.updateStatus).toHaveBeenCalledWith(competitionId, 'COMPLETED');
    });

    it('should return error if competition not found', async () => {
      mockCompetitionRepository.findById.mockResolvedValue(null);

      const result = await competitionService.endCompetition(userId, competitionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Competition not found');
    });

    it('should return error if user lacks permissions', async () => {
      const mockCompetition: CompetitionWithDetails = {
        id: competitionId,
        groupId,
        name: 'Test Competition',
        description: null,
        type: 'WEEKLY_PNL' as CompetitionType,
        startDate: new Date(),
        endDate: new Date(),
        entryFee: null,
        prizePool: null,
        prizeDistribution: null,
        rules: null,
        minTrades: 5,
        status: 'ACTIVE' as CompetitionStatus,
        createdBy: 'other-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: groupId, name: 'Test Group' },
        creator: { id: 'other-user', username: 'otheruser', avatarUrl: null },
        entries: [],
        entryCount: 0,
      };

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockGroupRepository.hasPermission!.mockResolvedValue(false);

      const result = await competitionService.endCompetition(userId, competitionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You do not have permission to end this competition');
    });

    it('should return error if competition not active', async () => {
      const mockCompetition: CompetitionWithDetails = {
        id: competitionId,
        groupId,
        name: 'Test Competition',
        description: null,
        type: 'WEEKLY_PNL' as CompetitionType,
        startDate: new Date(),
        endDate: new Date(),
        entryFee: null,
        prizePool: null,
        prizeDistribution: null,
        rules: null,
        minTrades: 5,
        status: 'COMPLETED' as CompetitionStatus,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        group: { id: groupId, name: 'Test Group' },
        creator: { id: userId, username: 'testuser', avatarUrl: null },
        entries: [],
        entryCount: 0,
      };

      mockCompetitionRepository.findById.mockResolvedValue(mockCompetition);
      mockGroupRepository.hasPermission!.mockResolvedValue(true);

      const result = await competitionService.endCompetition(userId, competitionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Competition is not active');
    });
  });

  describe('getCompetitionStats', () => {
    it('should return competition statistics', async () => {
      const mockStats: CompetitionStats = {
        totalCompetitions: 25,
        activeCompetitions: 3,
        completedCompetitions: 20,
        totalPrizePool: 125000,
        totalParticipants: 450,
        avgParticipantsPerCompetition: 18,
        topPerformer: {
          userId: 'top-user',
          username: 'champion',
          totalWins: 8,
          totalPrize: 35000,
        },
      };

      mockCompetitionRepository.getStats.mockResolvedValue(mockStats);

      const result = await competitionService.getCompetitionStats(groupId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(mockCompetitionRepository.getStats).toHaveBeenCalledWith(groupId);
    });
  });
});