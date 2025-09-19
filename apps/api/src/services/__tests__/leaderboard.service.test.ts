import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Competition, CompetitionEntry, User } from '@prisma/client';
import { LeaderboardService } from '../leaderboard.service';
import type { CompetitionRepository } from '../../repositories/competition.repository';
import type { CompetitionEntryRepository } from '../../repositories/competitionEntry.repository';
import type { UserRepository } from '../../repositories/user.repository';
import type { CacheService } from '../cache.service';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let competitionRepository: CompetitionRepository;
  let entryRepository: CompetitionEntryRepository;
  let userRepository: UserRepository;
  let cacheService: CacheService;

  const mockCompetition: Competition = {
    id: 'comp123',
    groupId: 'group123',
    name: 'Weekly Trading Competition',
    type: 'WEEKLY_PNL',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-07'),
    status: 'ACTIVE',
    prizePool: 10000,
    minTrades: 5,
    maxParticipants: 100,
    createdBy: 'admin123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockUser: User = {
    id: 'user123',
    email: 'user@test.com',
    username: 'trader1',
    passwordHash: 'hash',
    role: 'USER',
    isVerified: true,
    verificationToken: null,
    resetToken: null,
    resetTokenExpiry: null,
    avatarUrl: null,
    bio: null,
    settings: {},
    lastLogin: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockEntry: CompetitionEntry = {
    id: 'entry123',
    competitionId: 'comp123',
    userId: 'user123',
    joinedAt: new Date('2024-01-01'),
    totalPnl: 1000,
    totalRoi: 20,
    winRate: 75,
    totalTrades: 10,
    bestTrade: 500,
    worstTrade: -100,
    currentStreak: 3,
    maxStreak: 5,
    averagePnl: 100,
    consistency: 85,
    lastUpdated: new Date('2024-01-05'),
    rank: 1,
    previousRank: 2,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-05')
  };

  beforeEach(() => {
    competitionRepository = {
      findById: vi.fn(),
      findByGroupId: vi.fn(),
      getActiveCompetitions: vi.fn()
    } as unknown as CompetitionRepository;

    entryRepository = {
      findByCompetitionId: vi.fn(),
      getTopPerformers: vi.fn(),
      updateRankings: vi.fn(),
      findById: vi.fn()
    } as unknown as CompetitionEntryRepository;

    userRepository = {
      findById: vi.fn(),
      findByIds: vi.fn()
    } as unknown as UserRepository;

    cacheService = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn()
    } as unknown as CacheService;

    service = new LeaderboardService(
      competitionRepository,
      entryRepository,
      userRepository,
      cacheService
    );
  });

  describe('getLeaderboard', () => {
    it('should return cached leaderboard if available', async () => {
      const cachedData = {
        competition: mockCompetition,
        entries: [
          { ...mockEntry, user: mockUser, movement: 'up' }
        ],
        lastUpdated: new Date().toISOString()
      };

      vi.mocked(cacheService.get).mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getLeaderboard('comp123');

      expect(result).toEqual(cachedData);
      expect(competitionRepository.findById).not.toHaveBeenCalled();
    });

    it('should generate leaderboard if not cached', async () => {
      const entries = [
        { ...mockEntry, rank: 1, previousRank: 2 },
        { ...mockEntry, id: 'entry2', userId: 'user2', rank: 2, previousRank: 1, totalPnl: 800 }
      ];
      const users = [
        mockUser,
        { ...mockUser, id: 'user2', username: 'trader2' }
      ];

      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(competitionRepository.findById).mockResolvedValue(mockCompetition);
      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue(entries);
      vi.mocked(userRepository.findByIds).mockResolvedValue(users);

      const result = await service.getLeaderboard('comp123');

      expect(result.competition).toEqual(mockCompetition);
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].movement).toBe('up');
      expect(result.entries[1].movement).toBe('down');
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should handle competition not found', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(competitionRepository.findById).mockResolvedValue(null);

      await expect(service.getLeaderboard('comp123'))
        .rejects.toThrow('Competition not found');
    });

    it('should sort entries by rank', async () => {
      const entries = [
        { ...mockEntry, rank: 3 },
        { ...mockEntry, id: 'entry2', rank: 1 },
        { ...mockEntry, id: 'entry3', rank: 2 }
      ];

      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(competitionRepository.findById).mockResolvedValue(mockCompetition);
      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue(entries);
      vi.mocked(userRepository.findByIds).mockResolvedValue([mockUser]);

      const result = await service.getLeaderboard('comp123');

      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[1].rank).toBe(2);
      expect(result.entries[2].rank).toBe(3);
    });
  });

  describe('getGlobalLeaderboard', () => {
    it('should aggregate leaderboard across all active competitions', async () => {
      const competitions = [mockCompetition, { ...mockCompetition, id: 'comp2' }];
      const entries = [
        { ...mockEntry, totalPnl: 1000 },
        { ...mockEntry, id: 'entry2', userId: 'user2', competitionId: 'comp2', totalPnl: 1200 }
      ];
      const users = [
        mockUser,
        { ...mockUser, id: 'user2', username: 'trader2' }
      ];

      vi.mocked(competitionRepository.getActiveCompetitions).mockResolvedValue(competitions);
      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue(entries);
      vi.mocked(userRepository.findByIds).mockResolvedValue(users);

      const result = await service.getGlobalLeaderboard();

      expect(result.totalCompetitions).toBe(2);
      expect(result.leaderboard).toHaveLength(2);
      expect(result.leaderboard[0].totalPnl).toBe(1200);
      expect(result.leaderboard[1].totalPnl).toBe(1000);
    });

    it('should combine entries for same user across competitions', async () => {
      const competitions = [mockCompetition, { ...mockCompetition, id: 'comp2' }];
      const entries1 = [{ ...mockEntry, totalPnl: 500, totalTrades: 5 }];
      const entries2 = [{ ...mockEntry, competitionId: 'comp2', totalPnl: 700, totalTrades: 8 }];

      vi.mocked(competitionRepository.getActiveCompetitions).mockResolvedValue(competitions);
      vi.mocked(entryRepository.findByCompetitionId)
        .mockResolvedValueOnce(entries1)
        .mockResolvedValueOnce(entries2);
      vi.mocked(userRepository.findByIds).mockResolvedValue([mockUser]);

      const result = await service.getGlobalLeaderboard();

      expect(result.leaderboard).toHaveLength(1);
      expect(result.leaderboard[0].totalPnl).toBe(1200);
      expect(result.leaderboard[0].totalTrades).toBe(13);
      expect(result.leaderboard[0].competitionsEntered).toBe(2);
    });
  });

  describe('getUserRankings', () => {
    it('should get user rankings across all competitions', async () => {
      const entries = [
        { ...mockEntry, competitionId: 'comp1', rank: 1 },
        { ...mockEntry, id: 'entry2', competitionId: 'comp2', rank: 5 },
        { ...mockEntry, id: 'entry3', competitionId: 'comp3', rank: 3 }
      ];

      vi.mocked(entryRepository.findByUserId).mockResolvedValue(entries);
      vi.mocked(competitionRepository.findById).mockResolvedValue(mockCompetition);

      const result = await service.getUserRankings('user123');

      expect(result.userId).toBe('user123');
      expect(result.rankings).toHaveLength(3);
      expect(result.rankings[0].rank).toBe(1);
      expect(result.bestRank).toBe(1);
      expect(result.averageRank).toBe(3);
      expect(result.totalCompetitions).toBe(3);
    });

    it('should handle user with no competition entries', async () => {
      vi.mocked(entryRepository.findByUserId).mockResolvedValue([]);

      const result = await service.getUserRankings('user123');

      expect(result.rankings).toHaveLength(0);
      expect(result.bestRank).toBeNull();
      expect(result.averageRank).toBeNull();
      expect(result.totalCompetitions).toBe(0);
    });
  });

  describe('getLeaderboardHistory', () => {
    it('should retrieve historical leaderboard data', async () => {
      const historicalData = [
        { date: '2024-01-01', entries: [mockEntry] },
        { date: '2024-01-02', entries: [{ ...mockEntry, totalPnl: 1200 }] },
        { date: '2024-01-03', entries: [{ ...mockEntry, totalPnl: 1500 }] }
      ];

      vi.mocked(competitionRepository.findById).mockResolvedValue(mockCompetition);
      vi.mocked(entryRepository.getHistoricalData).mockResolvedValue(historicalData);

      const result = await service.getLeaderboardHistory('comp123', 7);

      expect(result.competition).toEqual(mockCompetition);
      expect(result.history).toHaveLength(3);
      expect(result.trends).toBeDefined();
    });

    it('should throw error if competition not found', async () => {
      vi.mocked(competitionRepository.findById).mockResolvedValue(null);

      await expect(service.getLeaderboardHistory('comp123', 7))
        .rejects.toThrow('Competition not found');
    });
  });

  describe('getLeaderboardInsights', () => {
    it('should generate insights from leaderboard data', async () => {
      const entries = [
        { ...mockEntry, totalPnl: 1000, winRate: 80, consistency: 90 },
        { ...mockEntry, id: 'entry2', totalPnl: 800, winRate: 70, consistency: 85 },
        { ...mockEntry, id: 'entry3', totalPnl: 600, winRate: 60, consistency: 80 }
      ];

      vi.mocked(competitionRepository.findById).mockResolvedValue(mockCompetition);
      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue(entries);

      const result = await service.getLeaderboardInsights('comp123');

      expect(result.competition).toEqual(mockCompetition);
      expect(result.insights.averagePnl).toBe(800);
      expect(result.insights.averageWinRate).toBe(70);
      expect(result.insights.averageConsistency).toBe(85);
      expect(result.insights.topPerformers).toHaveLength(3);
      expect(result.insights.distribution).toBeDefined();
    });

    it('should identify competitive gaps', async () => {
      const entries = [
        { ...mockEntry, totalPnl: 5000 },
        { ...mockEntry, id: 'entry2', totalPnl: 1000 },
        { ...mockEntry, id: 'entry3', totalPnl: 900 }
      ];

      vi.mocked(competitionRepository.findById).mockResolvedValue(mockCompetition);
      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue(entries);

      const result = await service.getLeaderboardInsights('comp123');

      expect(result.insights.competitiveGap).toBeGreaterThan(3000);
      expect(result.insights.dominantPerformer).toBe(true);
    });
  });

  describe('refreshLeaderboard', () => {
    it('should update rankings and refresh cache', async () => {
      const entries = [
        { ...mockEntry, totalPnl: 1000 },
        { ...mockEntry, id: 'entry2', totalPnl: 1200 }
      ];

      vi.mocked(competitionRepository.findById).mockResolvedValue(mockCompetition);
      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue(entries);
      vi.mocked(entryRepository.updateRankings).mockResolvedValue(true);

      const result = await service.refreshLeaderboard('comp123');

      expect(result).toBe(true);
      expect(entryRepository.updateRankings).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalledWith('leaderboard:comp123');
    });

    it('should throw error if competition not found', async () => {
      vi.mocked(competitionRepository.findById).mockResolvedValue(null);

      await expect(service.refreshLeaderboard('comp123'))
        .rejects.toThrow('Competition not found');
    });
  });

  describe('getPrizeDistribution', () => {
    it('should calculate prize distribution for top performers', async () => {
      const entries = [
        { ...mockEntry, rank: 1 },
        { ...mockEntry, id: 'entry2', rank: 2 },
        { ...mockEntry, id: 'entry3', rank: 3 },
        { ...mockEntry, id: 'entry4', rank: 4 }
      ];

      vi.mocked(competitionRepository.findById).mockResolvedValue(mockCompetition);
      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue(entries);

      const result = await service.getPrizeDistribution('comp123');

      expect(result.totalPrize).toBe(10000);
      expect(result.distribution).toHaveLength(3);
      expect(result.distribution[0].prize).toBe(5000); // 50% for 1st
      expect(result.distribution[1].prize).toBe(3000); // 30% for 2nd
      expect(result.distribution[2].prize).toBe(2000); // 20% for 3rd
    });

    it('should handle competition without prize pool', async () => {
      const competitionNoPrize = { ...mockCompetition, prizePool: null };

      vi.mocked(competitionRepository.findById).mockResolvedValue(competitionNoPrize);

      const result = await service.getPrizeDistribution('comp123');

      expect(result.totalPrize).toBe(0);
      expect(result.distribution).toHaveLength(0);
    });
  });

  describe('searchLeaderboard', () => {
    it('should search entries by username', async () => {
      const entries = [
        { ...mockEntry, userId: 'user1' },
        { ...mockEntry, id: 'entry2', userId: 'user2' },
        { ...mockEntry, id: 'entry3', userId: 'user3' }
      ];
      const users = [
        { ...mockUser, id: 'user1', username: 'alice' },
        { ...mockUser, id: 'user2', username: 'bob' },
        { ...mockUser, id: 'user3', username: 'charlie' }
      ];

      vi.mocked(competitionRepository.findById).mockResolvedValue(mockCompetition);
      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue(entries);
      vi.mocked(userRepository.findByIds).mockResolvedValue(users);

      const result = await service.searchLeaderboard('comp123', 'bob');

      expect(result).toHaveLength(1);
      expect(result[0].user.username).toBe('bob');
    });

    it('should return empty array if no matches found', async () => {
      vi.mocked(competitionRepository.findById).mockResolvedValue(mockCompetition);
      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue([mockEntry]);
      vi.mocked(userRepository.findByIds).mockResolvedValue([mockUser]);

      const result = await service.searchLeaderboard('comp123', 'nonexistent');

      expect(result).toHaveLength(0);
    });
  });

  describe('compareLeaderboards', () => {
    it('should compare two competition leaderboards', async () => {
      const comp1 = mockCompetition;
      const comp2 = { ...mockCompetition, id: 'comp2', name: 'Monthly Competition' };

      const entries1 = [
        { ...mockEntry, totalPnl: 1000 },
        { ...mockEntry, id: 'entry2', userId: 'user2', totalPnl: 800 }
      ];
      const entries2 = [
        { ...mockEntry, competitionId: 'comp2', totalPnl: 1200 },
        { ...mockEntry, id: 'entry3', userId: 'user3', competitionId: 'comp2', totalPnl: 600 }
      ];

      vi.mocked(competitionRepository.findById)
        .mockResolvedValueOnce(comp1)
        .mockResolvedValueOnce(comp2);
      vi.mocked(entryRepository.findByCompetitionId)
        .mockResolvedValueOnce(entries1)
        .mockResolvedValueOnce(entries2);

      const result = await service.compareLeaderboards('comp123', 'comp2');

      expect(result.competition1).toEqual(comp1);
      expect(result.competition2).toEqual(comp2);
      expect(result.comparison.totalParticipants1).toBe(2);
      expect(result.comparison.totalParticipants2).toBe(2);
      expect(result.comparison.averagePnl1).toBe(900);
      expect(result.comparison.averagePnl2).toBe(900);
      expect(result.comparison.commonParticipants).toHaveLength(1);
    });
  });
});