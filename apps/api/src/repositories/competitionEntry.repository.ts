import type { CompetitionEntry, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class CompetitionEntryRepository {
  async create(data: Prisma.CompetitionEntryCreateInput): Promise<CompetitionEntry> {
    return prisma.competitionEntry.create({ data });
  }

  async findById(id: string): Promise<CompetitionEntry | null> {
    return prisma.competitionEntry.findUnique({
      where: { id }
    });
  }

  async findByCompetitionId(competitionId: string): Promise<CompetitionEntry[]> {
    return prisma.competitionEntry.findMany({
      where: { competitionId },
      orderBy: { rank: 'asc' }
    });
  }

  async findByUserId(userId: string): Promise<CompetitionEntry[]> {
    return prisma.competitionEntry.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async findByCompetitionAndUser(
    competitionId: string,
    userId: string
  ): Promise<CompetitionEntry | null> {
    return prisma.competitionEntry.findFirst({
      where: {
        competitionId,
        userId
      }
    });
  }

  async update(
    id: string,
    data: Prisma.CompetitionEntryUpdateInput
  ): Promise<CompetitionEntry> {
    return prisma.competitionEntry.update({
      where: { id },
      data
    });
  }

  async updateStats(
    id: string,
    stats: {
      totalPnl?: number;
      totalRoi?: number;
      winRate?: number;
      totalTrades?: number;
      bestTrade?: number | null;
      worstTrade?: number | null;
      currentStreak?: number;
      maxStreak?: number;
      averagePnl?: number;
      consistency?: number;
      lastUpdated: Date;
    }
  ): Promise<CompetitionEntry> {
    return prisma.competitionEntry.update({
      where: { id },
      data: stats
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.competitionEntry.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async updateRankings(
    competitionId: string,
    rankings: Array<{ entryId: string; rank: number; previousRank: number | null }>
  ): Promise<boolean> {
    try {
      await prisma.$transaction(
        rankings.map(({ entryId, rank, previousRank }) =>
          prisma.competitionEntry.update({
            where: { id: entryId },
            data: { rank, previousRank }
          })
        )
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async getTopPerformers(
    competitionId: string,
    limit: number = 10
  ): Promise<CompetitionEntry[]> {
    return prisma.competitionEntry.findMany({
      where: { competitionId },
      orderBy: { rank: 'asc' },
      take: limit
    });
  }

  async getBottomPerformers(
    competitionId: string,
    limit: number = 10
  ): Promise<CompetitionEntry[]> {
    return prisma.competitionEntry.findMany({
      where: {
        competitionId,
        rank: { not: null }
      },
      orderBy: { rank: 'desc' },
      take: limit
    });
  }

  async getPerformanceHistory(
    entryId: string,
    days: number = 7
  ): Promise<Array<{
    date: string;
    pnl: number;
    trades: number;
    rank: number | null;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await prisma.$queryRaw<Array<{
      date: Date;
      pnl: number;
      trades: number;
      rank: number | null;
    }>>`
      SELECT
        DATE(last_updated) as date,
        total_pnl as pnl,
        total_trades as trades,
        rank
      FROM competition_entries
      WHERE id = ${entryId}
        AND last_updated >= ${startDate}
      ORDER BY date ASC
    `;

    return history.map(h => ({
      date: h.date.toISOString().split('T')[0],
      pnl: h.pnl,
      trades: h.trades,
      rank: h.rank
    }));
  }

  async getHistoricalData(
    competitionId: string,
    days: number = 7
  ): Promise<Array<{
    date: string;
    entries: CompetitionEntry[];
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dates = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const results = await Promise.all(
      dates.map(async (date) => {
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const entries = await prisma.competitionEntry.findMany({
          where: {
            competitionId,
            lastUpdated: { lte: endOfDay }
          },
          orderBy: { rank: 'asc' }
        });

        return { date, entries };
      })
    );

    return results;
  }

  async countByCompetition(competitionId: string): Promise<number> {
    return prisma.competitionEntry.count({
      where: { competitionId }
    });
  }

  async getAverageStats(competitionId: string): Promise<{
    avgPnl: number;
    avgRoi: number;
    avgWinRate: number;
    avgTrades: number;
  }> {
    const stats = await prisma.competitionEntry.aggregate({
      where: { competitionId },
      _avg: {
        totalPnl: true,
        totalRoi: true,
        winRate: true,
        totalTrades: true
      }
    });

    return {
      avgPnl: stats._avg.totalPnl || 0,
      avgRoi: stats._avg.totalRoi || 0,
      avgWinRate: stats._avg.winRate || 0,
      avgTrades: stats._avg.totalTrades || 0
    };
  }

  async getMostImprovedEntries(
    competitionId: string,
    limit: number = 5
  ): Promise<CompetitionEntry[]> {
    return prisma.competitionEntry.findMany({
      where: {
        competitionId,
        previousRank: { not: null },
        rank: { not: null }
      },
      orderBy: [
        {
          rank: 'asc'
        }
      ],
      take: limit
    });
  }

  async getEntriesWithUsers(competitionId: string): Promise<Array<
    CompetitionEntry & {
      user: { id: string; username: string; avatarUrl: string | null };
    }
  >> {
    return prisma.competitionEntry.findMany({
      where: { competitionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { rank: 'asc' }
    });
  }

  async bulkUpdate(
    updates: Array<{
      id: string;
      data: Prisma.CompetitionEntryUpdateInput;
    }>
  ): Promise<boolean> {
    try {
      await prisma.$transaction(
        updates.map(({ id, data }) =>
          prisma.competitionEntry.update({
            where: { id },
            data
          })
        )
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async getStreakLeaders(
    competitionId: string,
    limit: number = 10
  ): Promise<CompetitionEntry[]> {
    return prisma.competitionEntry.findMany({
      where: { competitionId },
      orderBy: { currentStreak: 'desc' },
      take: limit
    });
  }

  async getConsistencyLeaders(
    competitionId: string,
    limit: number = 10
  ): Promise<CompetitionEntry[]> {
    return prisma.competitionEntry.findMany({
      where: { competitionId },
      orderBy: { consistency: 'desc' },
      take: limit
    });
  }

  async deleteByCompetitionId(competitionId: string): Promise<boolean> {
    try {
      await prisma.competitionEntry.deleteMany({
        where: { competitionId }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getRecentlyUpdated(limit: number = 10): Promise<CompetitionEntry[]> {
    return prisma.competitionEntry.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit
    });
  }

  async findAll(): Promise<CompetitionEntry[]> {
    return prisma.competitionEntry.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        competition: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }
}