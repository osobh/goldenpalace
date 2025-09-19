import type { CompetitionEntry, Trade } from '@prisma/client';
import { CompetitionEntryRepository } from '../repositories/competitionEntry.repository';
import { TradeRepository } from '../repositories/trade.repository';

export class CompetitionEntryService {
  constructor(
    private entryRepository: CompetitionEntryRepository,
    private tradeRepository: TradeRepository
  ) {}

  async createEntry(data: {
    competitionId: string;
    userId: string;
  }): Promise<CompetitionEntry> {
    const existingEntry = await this.entryRepository.findByCompetitionAndUser(
      data.competitionId,
      data.userId
    );

    if (existingEntry) {
      throw new Error('User already joined this competition');
    }

    return this.entryRepository.create({
      competition: { connect: { id: data.competitionId } },
      user: { connect: { id: data.userId } },
      joinedAt: new Date(),
      totalPnl: 0,
      totalRoi: 0,
      winRate: 0,
      totalTrades: 0,
      currentStreak: 0,
      maxStreak: 0,
      averagePnl: 0,
      consistency: 0,
      lastUpdated: new Date()
    } as any);
  }

  async updateEntryStats(
    entryId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CompetitionEntry> {
    const entry = await this.entryRepository.findById(entryId);

    if (!entry) {
      throw new Error('Competition entry not found');
    }

    const trades = await this.tradeRepository.findByUserAndDateRange(
      entry.userId,
      startDate,
      endDate
    );

    if (trades.length === 0) {
      return this.entryRepository.updateStats(entryId, {
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
        lastUpdated: new Date()
      });
    }

    const stats = await this.tradeRepository.calculateStats(trades);
    const bestTrade = await this.tradeRepository.getBestTrade(trades);
    const worstTrade = await this.tradeRepository.getWorstTrade(trades);
    const consistency = await this.tradeRepository.calculateConsistency(trades);
    const streaks = await this.tradeRepository.getWinningStreak(trades);

    return this.entryRepository.updateStats(entryId, {
      totalPnl: stats.totalPnl,
      totalRoi: stats.totalRoi,
      winRate: stats.winRate,
      totalTrades: stats.totalTrades,
      bestTrade,
      worstTrade,
      currentStreak: streaks.current,
      maxStreak: streaks.max,
      averagePnl: stats.averagePnl,
      consistency,
      lastUpdated: new Date()
    });
  }

  async getEntryPerformance(entryId: string): Promise<{
    entry: CompetitionEntry;
    performance: {
      profitability: number;
      efficiency: number;
      reliability: number;
      activity: number;
      consistency: number;
      overall: number;
    };
    improvements: {
      fromLastWeek: any;
      suggestions: string[];
    };
  }> {
    const entry = await this.entryRepository.findById(entryId);

    if (!entry) {
      throw new Error('Competition entry not found');
    }

    const performance = {
      profitability: entry.totalPnl,
      efficiency: entry.totalRoi,
      reliability: entry.winRate,
      activity: entry.totalTrades,
      consistency: entry.consistency,
      overall: (
        entry.totalPnl * 0.3 +
        entry.totalRoi * 0.2 +
        entry.winRate * 0.2 +
        entry.totalTrades * 0.1 +
        entry.consistency * 0.2
      )
    };

    const suggestions = [];
    if (entry.winRate < 50) suggestions.push('Focus on improving win rate');
    if (entry.consistency < 70) suggestions.push('Work on trading consistency');
    if (entry.totalTrades < 10) suggestions.push('Increase trading activity');

    return {
      entry,
      performance,
      improvements: {
        fromLastWeek: {
          pnl: 0,
          roi: 0,
          winRate: 0,
          trades: 0
        },
        suggestions
      }
    };
  }

  async compareEntries(
    entryId1: string,
    entryId2: string
  ): Promise<{
    entry1: CompetitionEntry;
    entry2: CompetitionEntry;
    comparison: {
      pnlDifference: number;
      roiDifference: number;
      winRateDifference: number;
      tradesDifference: number;
      winner: string;
      metrics: any[];
    };
  }> {
    const entry1 = await this.entryRepository.findById(entryId1);
    const entry2 = await this.entryRepository.findById(entryId2);

    if (!entry1 || !entry2) {
      throw new Error('One or both entries not found');
    }

    const comparison = {
      pnlDifference: entry1.totalPnl - entry2.totalPnl,
      roiDifference: entry1.totalRoi - entry2.totalRoi,
      winRateDifference: entry1.winRate - entry2.winRate,
      tradesDifference: entry1.totalTrades - entry2.totalTrades,
      winner: entry1.totalPnl > entry2.totalPnl ? entryId1 : entryId2,
      metrics: [
        { metric: 'PNL', entry1: entry1.totalPnl, entry2: entry2.totalPnl },
        { metric: 'ROI', entry1: entry1.totalRoi, entry2: entry2.totalRoi },
        { metric: 'Win Rate', entry1: entry1.winRate, entry2: entry2.winRate }
      ]
    };

    return { entry1, entry2, comparison };
  }

  async getEntryHistory(
    entryId: string,
    days: number = 7
  ): Promise<{
    entry: CompetitionEntry;
    history: any[];
    trends: {
      pnlTrend: string;
      rankTrend: string;
      activityTrend: string;
    };
  }> {
    const entry = await this.entryRepository.findById(entryId);

    if (!entry) {
      throw new Error('Competition entry not found');
    }

    const history = await (this.entryRepository as any).getPerformanceHistory?.(entryId, days) || [];

    const trends = {
      pnlTrend: history.length > 1 && history[history.length - 1].pnl > history[0].pnl ? 'up' : 'down',
      rankTrend: history.length > 1 && history[history.length - 1].rank < history[0].rank ? 'improving' : 'declining',
      activityTrend: history.length > 1 && history[history.length - 1].trades > history[0].trades ? 'increasing' : 'decreasing'
    };

    return { entry, history, trends };
  }

  async bulkUpdateStats(
    competitionId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    updated: number;
    failed: number;
    errors?: any[];
  }> {
    const entries = await this.entryRepository.findByCompetitionId(competitionId);
    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const entry of entries) {
      try {
        const trades = await this.tradeRepository.findByUserAndDateRange(
          entry.userId,
          startDate,
          endDate
        );

        if (trades.length > 0) {
          const stats = await this.tradeRepository.calculateStats(trades);
          await this.entryRepository.updateStats(entry.id, {
            totalPnl: stats.totalPnl,
            totalRoi: stats.totalRoi,
            winRate: stats.winRate,
            totalTrades: stats.totalTrades,
            lastUpdated: new Date()
          });
        }

        updated++;
      } catch (error) {
        failed++;
        errors.push({ entryId: entry.id, error });
      }
    }

    return { updated, failed, errors: errors.length > 0 ? errors : undefined };
  }

  async deleteEntry(entryId: string): Promise<boolean> {
    const entry = await this.entryRepository.findById(entryId);

    if (!entry) {
      throw new Error('Competition entry not found');
    }

    return this.entryRepository.delete(entryId);
  }

  async getEntriesByUser(userId: string): Promise<CompetitionEntry[]> {
    return this.entryRepository.findByUserId(userId);
  }

  async updateRankings(
    competitionId: string,
    type: string
  ): Promise<boolean> {
    const entries = await this.entryRepository.findByCompetitionId(competitionId);

    const sortField = type === 'MONTHLY_ROI' ? 'totalRoi' :
                      type === 'CONSISTENCY' ? 'consistency' :
                      type === 'BEST_TRADE' ? 'bestTrade' :
                      'totalPnl';

    const sortedEntries = entries.sort((a, b) => {
      const aVal = a[sortField as keyof typeof a] as number || 0;
      const bVal = b[sortField as keyof typeof b] as number || 0;
      return bVal - aVal;
    });

    const rankings = sortedEntries.map((entry, index) => ({
      entryId: entry.id,
      rank: index + 1,
      previousRank: entry.rank
    }));

    return (this.entryRepository as any).updateRankings(competitionId, rankings);
  }

  async getTopPerformers(
    competitionId: string,
    limit: number = 5
  ): Promise<CompetitionEntry[]> {
    return (this.entryRepository as any).getTopPerformers(competitionId, limit);
  }
}