import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CompetitionEntry, Trade } from '@prisma/client';
import { CompetitionEntryService } from '../competitionEntry.service';
import type { CompetitionEntryRepository } from '../../repositories/competitionEntry.repository';
import type { TradeRepository } from '../../repositories/trade.repository';

describe('CompetitionEntryService', () => {
  let service: CompetitionEntryService;
  let entryRepository: CompetitionEntryRepository;
  let tradeRepository: TradeRepository;

  const mockEntry: CompetitionEntry = {
    id: 'entry123',
    competitionId: 'comp123',
    userId: 'user123',
    joinedAt: new Date('2024-01-01'),
    totalPnl: 0,
    totalRoi: 0,
    winRate: 0,
    totalTrades: 0,
    bestTrade: null,
    worstTrade: null,
    currentStreak: 0,
    maxStreak: 0,
    averagePnl: 0,
    consistency: 0,
    lastUpdated: new Date('2024-01-01'),
    rank: null,
    previousRank: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockTrade: Trade = {
    id: 'trade123',
    groupId: 'group123',
    userId: 'user123',
    symbol: 'BTC/USDT',
    type: 'LONG',
    entryPrice: 50000,
    exitPrice: 55000,
    quantity: 0.1,
    pnl: 500,
    roi: 10,
    entryTime: new Date('2024-01-02'),
    exitTime: new Date('2024-01-03'),
    status: 'CLOSED',
    stopLoss: 49000,
    takeProfit: 55000,
    notes: null,
    tags: [],
    imageUrl: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-03')
  };

  beforeEach(() => {
    entryRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByCompetitionId: vi.fn(),
      findByUserId: vi.fn(),
      findByCompetitionAndUser: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateStats: vi.fn(),
      updateRankings: vi.fn(),
      getTopPerformers: vi.fn()
    } as unknown as CompetitionEntryRepository;

    tradeRepository = {
      findByUserAndDateRange: vi.fn(),
      calculateStats: vi.fn(),
      getBestTrade: vi.fn(),
      getWorstTrade: vi.fn(),
      calculateConsistency: vi.fn(),
      getWinningStreak: vi.fn()
    } as unknown as TradeRepository;

    service = new CompetitionEntryService(entryRepository, tradeRepository);
  });

  describe('createEntry', () => {
    it('should create a new competition entry', async () => {
      vi.mocked(entryRepository.findByCompetitionAndUser).mockResolvedValue(null);
      vi.mocked(entryRepository.create).mockResolvedValue(mockEntry);

      const result = await service.createEntry({
        competitionId: 'comp123',
        userId: 'user123'
      });

      expect(result).toEqual(mockEntry);
      expect(entryRepository.create).toHaveBeenCalledWith({
        competitionId: 'comp123',
        userId: 'user123',
        joinedAt: expect.any(Date)
      });
    });

    it('should throw error if user already joined', async () => {
      vi.mocked(entryRepository.findByCompetitionAndUser).mockResolvedValue(mockEntry);

      await expect(service.createEntry({
        competitionId: 'comp123',
        userId: 'user123'
      })).rejects.toThrow('User already joined this competition');
    });
  });

  describe('updateEntryStats', () => {
    it('should update entry statistics based on trades', async () => {
      const trades = [mockTrade, { ...mockTrade, id: 'trade124', pnl: 300, roi: 6 }];
      const updatedEntry = {
        ...mockEntry,
        totalPnl: 800,
        totalRoi: 16,
        winRate: 100,
        totalTrades: 2,
        bestTrade: 500,
        worstTrade: 300,
        averagePnl: 400,
        consistency: 85
      };

      vi.mocked(entryRepository.findById).mockResolvedValue(mockEntry);
      vi.mocked(tradeRepository.findByUserAndDateRange).mockResolvedValue(trades);
      vi.mocked(tradeRepository.calculateStats).mockResolvedValue({
        totalPnl: 800,
        totalRoi: 16,
        winRate: 100,
        totalTrades: 2,
        averagePnl: 400
      });
      vi.mocked(tradeRepository.getBestTrade).mockResolvedValue(500);
      vi.mocked(tradeRepository.getWorstTrade).mockResolvedValue(300);
      vi.mocked(tradeRepository.calculateConsistency).mockResolvedValue(85);
      vi.mocked(tradeRepository.getWinningStreak).mockResolvedValue({
        current: 2,
        max: 2
      });
      vi.mocked(entryRepository.updateStats).mockResolvedValue(updatedEntry);

      const result = await service.updateEntryStats(
        'entry123',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result).toEqual(updatedEntry);
      expect(tradeRepository.findByUserAndDateRange).toHaveBeenCalledWith(
        'user123',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
    });

    it('should handle no trades scenario', async () => {
      vi.mocked(entryRepository.findById).mockResolvedValue(mockEntry);
      vi.mocked(tradeRepository.findByUserAndDateRange).mockResolvedValue([]);
      vi.mocked(entryRepository.updateStats).mockResolvedValue(mockEntry);

      const result = await service.updateEntryStats(
        'entry123',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result).toEqual(mockEntry);
      expect(entryRepository.updateStats).toHaveBeenCalledWith('entry123', {
        totalPnl: 0,
        totalRoi: 0,
        winRate: 0,
        totalTrades: 0,
        bestTrade: null,
        worstTrade: null,
        currentStreak: 0,
        maxStreak: 0,
        averagePnl: 0,
        consistency: 0,
        lastUpdated: expect.any(Date)
      });
    });

    it('should throw error if entry not found', async () => {
      vi.mocked(entryRepository.findById).mockResolvedValue(null);

      await expect(service.updateEntryStats(
        'entry123',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )).rejects.toThrow('Competition entry not found');
    });
  });

  describe('getEntryPerformance', () => {
    it('should calculate entry performance metrics', async () => {
      const entryWithStats = {
        ...mockEntry,
        totalPnl: 1000,
        totalRoi: 20,
        winRate: 75,
        totalTrades: 10,
        consistency: 90,
        rank: 2
      };

      vi.mocked(entryRepository.findById).mockResolvedValue(entryWithStats);

      const result = await service.getEntryPerformance('entry123');

      expect(result).toEqual({
        entry: entryWithStats,
        performance: {
          profitability: 1000,
          efficiency: 20,
          reliability: 75,
          activity: 10,
          consistency: 90,
          overall: expect.any(Number)
        },
        improvements: {
          fromLastWeek: expect.any(Object),
          suggestions: expect.any(Array)
        }
      });
    });

    it('should throw error if entry not found', async () => {
      vi.mocked(entryRepository.findById).mockResolvedValue(null);

      await expect(service.getEntryPerformance('entry123'))
        .rejects.toThrow('Competition entry not found');
    });
  });

  describe('compareEntries', () => {
    it('should compare two competition entries', async () => {
      const entry1 = { ...mockEntry, id: 'entry1', totalPnl: 1000, winRate: 80 };
      const entry2 = { ...mockEntry, id: 'entry2', totalPnl: 800, winRate: 85 };

      vi.mocked(entryRepository.findById)
        .mockResolvedValueOnce(entry1)
        .mockResolvedValueOnce(entry2);

      const result = await service.compareEntries('entry1', 'entry2');

      expect(result).toEqual({
        entry1,
        entry2,
        comparison: {
          pnlDifference: 200,
          roiDifference: 0,
          winRateDifference: -5,
          tradesDifference: 0,
          winner: 'entry1',
          metrics: expect.any(Array)
        }
      });
    });

    it('should throw error if either entry not found', async () => {
      vi.mocked(entryRepository.findById)
        .mockResolvedValueOnce(mockEntry)
        .mockResolvedValueOnce(null);

      await expect(service.compareEntries('entry1', 'entry2'))
        .rejects.toThrow('One or both entries not found');
    });
  });

  describe('getEntryHistory', () => {
    it('should retrieve entry performance history', async () => {
      const historyData = [
        { date: '2024-01-01', pnl: 100, trades: 2, rank: 5 },
        { date: '2024-01-02', pnl: 250, trades: 3, rank: 3 },
        { date: '2024-01-03', pnl: 500, trades: 5, rank: 2 }
      ];

      vi.mocked(entryRepository.findById).mockResolvedValue(mockEntry);
      vi.mocked(entryRepository.getPerformanceHistory).mockResolvedValue(historyData);

      const result = await service.getEntryHistory('entry123', 7);

      expect(result).toEqual({
        entry: mockEntry,
        history: historyData,
        trends: {
          pnlTrend: 'up',
          rankTrend: 'improving',
          activityTrend: 'increasing'
        }
      });
    });
  });

  describe('bulkUpdateStats', () => {
    it('should update stats for multiple entries', async () => {
      const entries = [
        { ...mockEntry, id: 'entry1' },
        { ...mockEntry, id: 'entry2' }
      ];

      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue(entries);
      vi.mocked(tradeRepository.findByUserAndDateRange).mockResolvedValue([mockTrade]);
      vi.mocked(tradeRepository.calculateStats).mockResolvedValue({
        totalPnl: 500,
        totalRoi: 10,
        winRate: 100,
        totalTrades: 1,
        averagePnl: 500
      });
      vi.mocked(entryRepository.updateStats).mockResolvedValue(mockEntry);

      const result = await service.bulkUpdateStats(
        'comp123',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result.updated).toBe(2);
      expect(result.failed).toBe(0);
      expect(entryRepository.updateStats).toHaveBeenCalledTimes(2);
    });

    it('should handle failures gracefully', async () => {
      const entries = [
        { ...mockEntry, id: 'entry1' },
        { ...mockEntry, id: 'entry2' }
      ];

      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue(entries);
      vi.mocked(tradeRepository.findByUserAndDateRange)
        .mockResolvedValueOnce([mockTrade])
        .mockRejectedValueOnce(new Error('Database error'));

      const result = await service.bulkUpdateStats(
        'comp123',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result.updated).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('deleteEntry', () => {
    it('should delete a competition entry', async () => {
      vi.mocked(entryRepository.findById).mockResolvedValue(mockEntry);
      vi.mocked(entryRepository.delete).mockResolvedValue(true);

      const result = await service.deleteEntry('entry123');

      expect(result).toBe(true);
      expect(entryRepository.delete).toHaveBeenCalledWith('entry123');
    });

    it('should throw error if entry not found', async () => {
      vi.mocked(entryRepository.findById).mockResolvedValue(null);

      await expect(service.deleteEntry('entry123'))
        .rejects.toThrow('Competition entry not found');
    });
  });

  describe('getEntriesByUser', () => {
    it('should retrieve all entries for a user', async () => {
      const entries = [
        { ...mockEntry, id: 'entry1', competitionId: 'comp1' },
        { ...mockEntry, id: 'entry2', competitionId: 'comp2' }
      ];

      vi.mocked(entryRepository.findByUserId).mockResolvedValue(entries);

      const result = await service.getEntriesByUser('user123');

      expect(result).toEqual(entries);
      expect(entryRepository.findByUserId).toHaveBeenCalledWith('user123');
    });

    it('should return empty array if no entries found', async () => {
      vi.mocked(entryRepository.findByUserId).mockResolvedValue([]);

      const result = await service.getEntriesByUser('user123');

      expect(result).toEqual([]);
    });
  });

  describe('updateRankings', () => {
    it('should update rankings for all entries in a competition', async () => {
      const entries = [
        { ...mockEntry, id: 'entry1', totalPnl: 1000 },
        { ...mockEntry, id: 'entry2', totalPnl: 800 },
        { ...mockEntry, id: 'entry3', totalPnl: 1200 }
      ];

      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue(entries);
      vi.mocked(entryRepository.updateRankings).mockResolvedValue(true);

      const result = await service.updateRankings('comp123', 'WEEKLY_PNL');

      expect(result).toBe(true);
      expect(entryRepository.updateRankings).toHaveBeenCalledWith(
        'comp123',
        expect.arrayContaining([
          { entryId: 'entry3', rank: 1, previousRank: null },
          { entryId: 'entry1', rank: 2, previousRank: null },
          { entryId: 'entry2', rank: 3, previousRank: null }
        ])
      );
    });

    it('should rank by ROI for MONTHLY_ROI competitions', async () => {
      const entries = [
        { ...mockEntry, id: 'entry1', totalRoi: 25 },
        { ...mockEntry, id: 'entry2', totalRoi: 30 },
        { ...mockEntry, id: 'entry3', totalRoi: 20 }
      ];

      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue(entries);
      vi.mocked(entryRepository.updateRankings).mockResolvedValue(true);

      const result = await service.updateRankings('comp123', 'MONTHLY_ROI');

      expect(result).toBe(true);
      expect(entryRepository.updateRankings).toHaveBeenCalledWith(
        'comp123',
        expect.arrayContaining([
          { entryId: 'entry2', rank: 1, previousRank: null },
          { entryId: 'entry1', rank: 2, previousRank: null },
          { entryId: 'entry3', rank: 3, previousRank: null }
        ])
      );
    });

    it('should preserve previous rankings', async () => {
      const entries = [
        { ...mockEntry, id: 'entry1', totalPnl: 1000, rank: 2 },
        { ...mockEntry, id: 'entry2', totalPnl: 800, rank: 1 }
      ];

      vi.mocked(entryRepository.findByCompetitionId).mockResolvedValue(entries);
      vi.mocked(entryRepository.updateRankings).mockResolvedValue(true);

      await service.updateRankings('comp123', 'WEEKLY_PNL');

      expect(entryRepository.updateRankings).toHaveBeenCalledWith(
        'comp123',
        expect.arrayContaining([
          { entryId: 'entry1', rank: 1, previousRank: 2 },
          { entryId: 'entry2', rank: 2, previousRank: 1 }
        ])
      );
    });
  });

  describe('getTopPerformers', () => {
    it('should retrieve top performers', async () => {
      const topEntries = [
        { ...mockEntry, id: 'entry1', rank: 1 },
        { ...mockEntry, id: 'entry2', rank: 2 },
        { ...mockEntry, id: 'entry3', rank: 3 }
      ];

      vi.mocked(entryRepository.getTopPerformers).mockResolvedValue(topEntries);

      const result = await service.getTopPerformers('comp123', 5);

      expect(result).toEqual(topEntries);
      expect(entryRepository.getTopPerformers).toHaveBeenCalledWith('comp123', 5);
    });
  });
});