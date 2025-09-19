import type { Competition, CompetitionEntry, User } from '@prisma/client';
import { CompetitionRepository } from '../repositories/competition.repository';
import { CompetitionEntryRepository } from '../repositories/competitionEntry.repository';
import { UserRepository } from '../repositories/user.repository';
import { CacheService } from './cache.service';

export class LeaderboardService {
  constructor(
    private competitionRepository: CompetitionRepository,
    private entryRepository: CompetitionEntryRepository,
    private userRepository: UserRepository,
    private cacheService: CacheService
  ) {}

  async getLeaderboard(competitionId: string): Promise<{
    competition: Competition;
    entries: any[];
    lastUpdated: string;
  }> {
    const cacheKey = `leaderboard:${competitionId}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new Error('Competition not found');
    }

    const entries = await this.entryRepository.findByCompetitionId(competitionId);
    const userIds = entries.map(e => e.userId);
    const users = await (this.userRepository as any).findByIds?.(userIds) || [];

    const userMap = new Map(users.map((u: User) => [u.id, u]));

    const enrichedEntries = entries
      .sort((a, b) => (a.rank || 999) - (b.rank || 999))
      .map(entry => ({
        ...entry,
        user: userMap.get(entry.userId),
        movement: entry.previousRank
          ? entry.previousRank > (entry.rank || 0) ? 'up'
          : entry.previousRank < (entry.rank || 0) ? 'down'
          : 'same'
          : 'new'
      }));

    const result = {
      competition,
      entries: enrichedEntries,
      lastUpdated: new Date().toISOString()
    };

    await this.cacheService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async getGlobalLeaderboard(): Promise<{
    totalCompetitions: number;
    leaderboard: any[];
  }> {
    const competitions = await this.competitionRepository.getActiveCompetitions();
    const userStats = new Map<string, any>();

    for (const competition of competitions) {
      const entries = await this.entryRepository.findByCompetitionId(competition.id);

      for (const entry of entries) {
        if (!userStats.has(entry.userId)) {
          userStats.set(entry.userId, {
            userId: entry.userId,
            totalPnl: 0,
            totalRoi: 0,
            totalTrades: 0,
            competitionsEntered: 0,
            bestRank: null
          });
        }

        const stats = userStats.get(entry.userId);
        stats.totalPnl += entry.totalPnl;
        stats.totalRoi += entry.totalRoi;
        stats.totalTrades += entry.totalTrades;
        stats.competitionsEntered += 1;
        stats.bestRank = stats.bestRank === null || (entry.rank && entry.rank < stats.bestRank)
          ? entry.rank
          : stats.bestRank;
      }
    }

    const userIds = Array.from(userStats.keys());
    const users = await (this.userRepository as any).findByIds?.(userIds) || [];
    const userMap = new Map(users.map((u: User) => [u.id, u]));

    const leaderboard = Array.from(userStats.values())
      .map(stats => ({
        ...stats,
        user: userMap.get(stats.userId)
      }))
      .sort((a, b) => b.totalPnl - a.totalPnl);

    return {
      totalCompetitions: competitions.length,
      leaderboard
    };
  }

  async getUserRankings(userId: string): Promise<{
    userId: string;
    rankings: any[];
    bestRank: number | null;
    averageRank: number | null;
    totalCompetitions: number;
  }> {
    const entries = await (this.entryRepository as any).findByUserId?.(userId) || [];
    const rankings = [];

    for (const entry of entries) {
      const competition = await this.competitionRepository.findById(entry.competitionId);
      if (competition) {
        rankings.push({
          competitionId: entry.competitionId,
          competitionName: competition.name,
          rank: entry.rank,
          totalPnl: entry.totalPnl,
          totalRoi: entry.totalRoi
        });
      }
    }

    const ranks = rankings.filter(r => r.rank !== null).map(r => r.rank);
    const bestRank = ranks.length > 0 ? Math.min(...ranks) : null;
    const averageRank = ranks.length > 0
      ? ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length
      : null;

    return {
      userId,
      rankings,
      bestRank,
      averageRank: averageRank ? Math.round(averageRank) : null,
      totalCompetitions: entries.length
    };
  }

  async getLeaderboardHistory(
    competitionId: string,
    days: number = 7
  ): Promise<{
    competition: Competition;
    history: any[];
    trends: any;
  }> {
    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new Error('Competition not found');
    }

    const history = await (this.entryRepository as any).getHistoricalData?.(competitionId, days) || [];

    const trends = {
      participationTrend: history.length > 1 &&
        history[history.length - 1].entries.length > history[0].entries.length
          ? 'growing'
          : 'stable',
      competitiveness: 'high'
    };

    return {
      competition,
      history,
      trends
    };
  }

  async getLeaderboardInsights(competitionId: string): Promise<{
    competition: Competition;
    insights: {
      averagePnl: number;
      averageWinRate: number;
      averageConsistency: number;
      topPerformers: any[];
      distribution: any;
      competitiveGap: number;
      dominantPerformer: boolean;
    };
  }> {
    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new Error('Competition not found');
    }

    const entries = await this.entryRepository.findByCompetitionId(competitionId);

    const avgPnl = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.totalPnl, 0) / entries.length
      : 0;

    const avgWinRate = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.winRate, 0) / entries.length
      : 0;

    const avgConsistency = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.consistency, 0) / entries.length
      : 0;

    const sortedByPnl = [...entries].sort((a, b) => b.totalPnl - a.totalPnl);
    const topPerformers = sortedByPnl.slice(0, 3);

    const competitiveGap = sortedByPnl.length > 1
      ? sortedByPnl[0].totalPnl - sortedByPnl[1].totalPnl
      : 0;

    const dominantPerformer = competitiveGap > (sortedByPnl[0].totalPnl * 0.3);

    const distribution = {
      profitable: entries.filter(e => e.totalPnl > 0).length,
      breakeven: entries.filter(e => e.totalPnl === 0).length,
      loss: entries.filter(e => e.totalPnl < 0).length
    };

    return {
      competition,
      insights: {
        averagePnl: Math.round(avgPnl),
        averageWinRate: Math.round(avgWinRate),
        averageConsistency: Math.round(avgConsistency),
        topPerformers,
        distribution,
        competitiveGap,
        dominantPerformer
      }
    };
  }

  async refreshLeaderboard(competitionId: string): Promise<boolean> {
    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new Error('Competition not found');
    }

    const entries = await this.entryRepository.findByCompetitionId(competitionId);

    const sortField = competition.type === 'MONTHLY_ROI' ? 'totalRoi' :
                      competition.type === 'CONSISTENCY' ? 'consistency' :
                      competition.type === 'BEST_TRADE' ? 'bestTrade' :
                      'totalPnl';

    const sortedEntries = entries
      .sort((a, b) => {
        const aVal = a[sortField as keyof typeof a] as number || 0;
        const bVal = b[sortField as keyof typeof b] as number || 0;
        return bVal - aVal;
      });

    const rankings = sortedEntries.map((entry, index) => ({
      entryId: entry.id,
      rank: index + 1,
      previousRank: entry.rank
    }));

    await (this.entryRepository as any).updateRankings(competitionId, rankings);
    await this.cacheService.delete(`leaderboard:${competitionId}`);

    return true;
  }

  async getPrizeDistribution(competitionId: string): Promise<{
    totalPrize: number;
    distribution: Array<{
      rank: number;
      prize: number;
      userId: string;
    }>;
  }> {
    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new Error('Competition not found');
    }

    const prizePool = competition.prizePool || 0;

    if (prizePool === 0) {
      return {
        totalPrize: 0,
        distribution: []
      };
    }

    const entries = await this.entryRepository.findByCompetitionId(competitionId);
    const topThree = entries
      .filter(e => e.rank && e.rank <= 3)
      .sort((a, b) => (a.rank || 999) - (b.rank || 999));

    const distribution = topThree.map(entry => ({
      rank: entry.rank || 0,
      prize: entry.rank === 1 ? prizePool * 0.5 :
             entry.rank === 2 ? prizePool * 0.3 :
             prizePool * 0.2,
      userId: entry.userId
    }));

    return {
      totalPrize: prizePool,
      distribution
    };
  }

  async searchLeaderboard(
    competitionId: string,
    query: string
  ): Promise<any[]> {
    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new Error('Competition not found');
    }

    const entries = await this.entryRepository.findByCompetitionId(competitionId);
    const userIds = entries.map(e => e.userId);
    const users = await (this.userRepository as any).findByIds?.(userIds) || [];

    const matches = users.filter((u: any) =>
      u.username?.toLowerCase().includes(query.toLowerCase())
    );

    const matchedUserIds = new Set(matches.map((u: any) => u.id));

    return entries
      .filter(entry => matchedUserIds.has(entry.userId))
      .map(entry => ({
        ...entry,
        user: matches.find((u: any) => u.id === entry.userId)
      }));
  }

  async compareLeaderboards(
    competitionId1: string,
    competitionId2: string
  ): Promise<{
    competition1: Competition;
    competition2: Competition;
    comparison: {
      totalParticipants1: number;
      totalParticipants2: number;
      averagePnl1: number;
      averagePnl2: number;
      commonParticipants: any[];
    };
  }> {
    const competition1 = await this.competitionRepository.findById(competitionId1);
    const competition2 = await this.competitionRepository.findById(competitionId2);

    if (!competition1 || !competition2) {
      throw new Error('One or both competitions not found');
    }

    const entries1 = await this.entryRepository.findByCompetitionId(competitionId1);
    const entries2 = await this.entryRepository.findByCompetitionId(competitionId2);

    const userIds1 = new Set(entries1.map(e => e.userId));
    const userIds2 = new Set(entries2.map(e => e.userId));

    const commonUserIds = Array.from(userIds1).filter(id => userIds2.has(id));

    const avgPnl1 = entries1.length > 0
      ? entries1.reduce((sum, e) => sum + e.totalPnl, 0) / entries1.length
      : 0;

    const avgPnl2 = entries2.length > 0
      ? entries2.reduce((sum, e) => sum + e.totalPnl, 0) / entries2.length
      : 0;

    const commonParticipants = commonUserIds.map(userId => {
      const entry1 = entries1.find(e => e.userId === userId);
      const entry2 = entries2.find(e => e.userId === userId);
      return {
        userId,
        rank1: entry1?.rank,
        rank2: entry2?.rank,
        pnl1: entry1?.totalPnl,
        pnl2: entry2?.totalPnl
      };
    });

    return {
      competition1,
      competition2,
      comparison: {
        totalParticipants1: entries1.length,
        totalParticipants2: entries2.length,
        averagePnl1: Math.round(avgPnl1),
        averagePnl2: Math.round(avgPnl2),
        commonParticipants
      }
    };
  }
}