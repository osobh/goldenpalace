import type { Competition, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class CompetitionRepository {
  async create(data: Prisma.CompetitionCreateInput): Promise<Competition> {
    return prisma.competition.create({ data });
  }

  async findById(id: string): Promise<Competition | null> {
    return prisma.competition.findUnique({
      where: { id }
    });
  }

  async findByGroupId(groupId: string): Promise<Competition[]> {
    return prisma.competition.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByGroupIdWithPagination(
    groupId: string,
    page: number,
    limit: number,
    filters?: {
      status?: string;
      type?: string;
      startDateFrom?: Date;
      startDateTo?: Date;
    }
  ): Promise<{ competitions: Competition[]; total: number }> {
    const where: Prisma.CompetitionWhereInput = { groupId };

    if (filters) {
      if (filters.status) where.status = filters.status;
      if (filters.type) where.type = filters.type;
      if (filters.startDateFrom || filters.startDateTo) {
        where.startDate = {};
        if (filters.startDateFrom) where.startDate.gte = filters.startDateFrom;
        if (filters.startDateTo) where.startDate.lte = filters.startDateTo;
      }
    }

    const [competitions, total] = await Promise.all([
      prisma.competition.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.competition.count({ where })
    ]);

    return { competitions, total };
  }

  async update(id: string, data: Prisma.CompetitionUpdateInput): Promise<Competition> {
    return prisma.competition.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.competition.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getActiveCompetitions(): Promise<Competition[]> {
    return prisma.competition.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: new Date() }
      },
      orderBy: { startDate: 'asc' }
    });
  }

  async getUpcomingCompetitions(limit: number = 10): Promise<Competition[]> {
    return prisma.competition.findMany({
      where: {
        status: 'PENDING',
        startDate: { gt: new Date() }
      },
      take: limit,
      orderBy: { startDate: 'asc' }
    });
  }

  async getCompletedCompetitions(groupId?: string): Promise<Competition[]> {
    const where: Prisma.CompetitionWhereInput = {
      status: 'COMPLETED'
    };

    if (groupId) where.groupId = groupId;

    return prisma.competition.findMany({
      where,
      orderBy: { endDate: 'desc' }
    });
  }

  async getCompetitionsByCreator(createdBy: string): Promise<Competition[]> {
    return prisma.competition.findMany({
      where: { createdBy },
      orderBy: { createdAt: 'desc' }
    });
  }

  async countByStatus(groupId?: string): Promise<Record<string, number>> {
    const where: Prisma.CompetitionWhereInput = {};
    if (groupId) where.groupId = groupId;

    const counts = await prisma.competition.groupBy({
      by: ['status'],
      where,
      _count: { status: true }
    });

    return counts.reduce((acc, curr) => {
      acc[curr.status] = curr._count.status;
      return acc;
    }, {} as Record<string, number>);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Competition[]> {
    return prisma.competition.findMany({
      where: {
        OR: [
          {
            startDate: { gte: startDate, lte: endDate }
          },
          {
            endDate: { gte: startDate, lte: endDate }
          },
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: endDate } }
            ]
          }
        ]
      },
      orderBy: { startDate: 'asc' }
    });
  }

  async updateStatus(id: string, status: string): Promise<Competition> {
    return prisma.competition.update({
      where: { id },
      data: { status, updatedAt: new Date() }
    });
  }

  async findExpiredActive(): Promise<Competition[]> {
    return prisma.competition.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: new Date() }
      }
    });
  }

  async findReadyToStart(): Promise<Competition[]> {
    return prisma.competition.findMany({
      where: {
        status: 'PENDING',
        startDate: { lte: new Date() }
      }
    });
  }

  async getStatistics(competitionId: string): Promise<{
    totalParticipants: number;
    averagePnl: number;
    averageRoi: number;
    totalTrades: number;
  }> {
    const stats = await prisma.competitionEntry.aggregate({
      where: { competitionId },
      _count: { id: true },
      _avg: {
        totalPnl: true,
        totalRoi: true,
        totalTrades: true
      },
      _sum: {
        totalTrades: true
      }
    });

    return {
      totalParticipants: stats._count.id,
      averagePnl: stats._avg.totalPnl || 0,
      averageRoi: stats._avg.totalRoi || 0,
      totalTrades: stats._sum.totalTrades || 0
    };
  }

  async getPopularCompetitions(limit: number = 10): Promise<Competition[]> {
    const popular = await prisma.competitionEntry.groupBy({
      by: ['competitionId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit
    });

    const competitionIds = popular.map(p => p.competitionId);

    return prisma.competition.findMany({
      where: { id: { in: competitionIds } }
    });
  }

  async searchCompetitions(query: string, groupId?: string): Promise<Competition[]> {
    const where: Prisma.CompetitionWhereInput = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { type: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (groupId) where.groupId = groupId;

    return prisma.competition.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async getWithDetails(id: string): Promise<Competition & {
    _count: { entries: number };
    creator: { id: string; username: string };
    group: { id: string; name: string };
  } | null> {
    return prisma.competition.findUnique({
      where: { id },
      include: {
        _count: { select: { entries: true } },
        creator: { select: { id: true, username: true } },
        group: { select: { id: true, name: true } }
      }
    });
  }

  async bulkUpdateStatus(
    ids: string[],
    status: string
  ): Promise<Prisma.BatchPayload> {
    return prisma.competition.updateMany({
      where: { id: { in: ids } },
      data: { status, updatedAt: new Date() }
    });
  }
}