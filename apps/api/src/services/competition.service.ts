import type { Competition } from '@prisma/client';
import { CompetitionRepository } from '../repositories/competition.repository';
import { CompetitionEntryRepository } from '../repositories/competitionEntry.repository';

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class CompetitionService {
  constructor(
    private competitionRepository: CompetitionRepository,
    private entryRepository: CompetitionEntryRepository,
    private groupRepository?: any
  ) {}

  async createCompetition(
    userId: string,
    data: {
      groupId: string;
      name: string;
      type: string;
      startDate: Date;
      endDate: Date;
      prizePool?: number;
      minTrades?: number;
      maxParticipants?: number;
      prizeDistribution?: Record<string, number>;
    }
  ): Promise<ServiceResult<Competition>> {
    try {
      if (this.groupRepository?.hasPermission) {
        const hasPermission = await this.groupRepository.hasPermission(
          data.groupId,
          userId,
          ['OWNER', 'ADMIN', 'MODERATOR']
        );
        if (!hasPermission) {
          return {
            success: false,
            error: 'You do not have permission to create competitions in this group'
          };
        }
      }

      if (data.startDate < new Date()) {
        return {
          success: false,
          error: 'Start date must be in the future'
        };
      }

      if (data.endDate <= data.startDate) {
        return {
          success: false,
          error: 'End date must be after start date'
        };
      }

      if (data.prizeDistribution) {
        const total = Object.values(data.prizeDistribution).reduce((sum, val) => sum + val, 0);
        if (Math.abs(total - 100) > 0.01) {
          return {
            success: false,
            error: 'Prize distribution must total 100%'
          };
        }
      }

      if (data.minTrades && (data.minTrades < 1 || data.minTrades > 1000)) {
        return {
          success: false,
          error: 'Minimum trades must be between 1 and 1000'
        };
      }

      const overlapping = await (this.competitionRepository as any).findByDateRange?.(
        data.startDate,
        data.endDate
      ) || [];

      const hasOverlap = overlapping.some((comp: any) =>
        comp.groupId === data.groupId && comp.type === data.type
      );

      if (hasOverlap) {
        return {
          success: false,
          error: 'Competition overlaps with existing competition'
        };
      }

      const competition = await this.competitionRepository.create({
        ...data,
        createdBy: userId,
        status: 'PENDING',
        minTrades: data.minTrades || 5,
        maxParticipants: data.maxParticipants || 100
      } as any);

      return {
        success: true,
        data: competition
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create competition'
      };
    }
  }

  async getCompetition(
    competitionId: string,
    userId: string
  ): Promise<ServiceResult<Competition>> {
    try {
      const competition = await this.competitionRepository.findById(competitionId);

      if (!competition) {
        return {
          success: false,
          error: 'Competition not found'
        };
      }

      if (this.groupRepository?.isMember) {
        const isMember = await this.groupRepository.isMember(competition.groupId, userId);
        if (!isMember) {
          return {
            success: false,
            error: 'You are not a member of this group'
          };
        }
      }

      return {
        success: true,
        data: competition
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get competition'
      };
    }
  }

  async joinCompetition(
    competitionId: string,
    userId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const competition = await this.competitionRepository.findById(competitionId);

      if (!competition) {
        return {
          success: false,
          error: 'Competition not found'
        };
      }

      if (this.groupRepository?.isMember) {
        const isMember = await this.groupRepository.isMember(competition.groupId, userId);
        if (!isMember) {
          return {
            success: false,
            error: 'You are not a member of this group'
          };
        }
      }

      if (competition.status !== 'ACTIVE' && competition.status !== 'PENDING') {
        return {
          success: false,
          error: 'Competition is not accepting participants'
        };
      }

      if (competition.status === 'ACTIVE' && new Date() > competition.startDate) {
        return {
          success: false,
          error: 'Competition has already started'
        };
      }

      const existingEntry = await this.entryRepository.findByCompetitionAndUser(
        competitionId,
        userId
      );

      if (existingEntry) {
        return {
          success: false,
          error: 'Already joined this competition'
        };
      }

      const entryCount = await (this.entryRepository as any).countByCompetition?.(competitionId) || 0;

      if (competition.maxParticipants && entryCount >= competition.maxParticipants) {
        return {
          success: false,
          error: 'Competition is full'
        };
      }

      await this.entryRepository.create({
        competition: { connect: { id: competitionId } },
        user: { connect: { id: userId } },
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

      return {
        success: true,
        data: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to join competition'
      };
    }
  }

  async updateCompetition(
    competitionId: string,
    userId: string,
    data: Partial<{
      name: string;
      endDate: Date;
      prizePool: number;
      minTrades: number;
      maxParticipants: number;
    }>
  ): Promise<ServiceResult<Competition>> {
    try {
      const competition = await this.competitionRepository.findById(competitionId);

      if (!competition) {
        return {
          success: false,
          error: 'Competition not found'
        };
      }

      if (this.groupRepository?.hasPermission) {
        const hasPermission = await this.groupRepository.hasPermission(
          competition.groupId,
          userId,
          ['OWNER', 'ADMIN']
        );

        const isCreator = competition.createdBy === userId;

        if (!hasPermission && !isCreator) {
          return {
            success: false,
            error: 'You do not have permission to update this competition'
          };
        }
      }

      if (competition.status === 'COMPLETED' || competition.status === 'CANCELLED') {
        return {
          success: false,
          error: 'Cannot update completed or cancelled competition'
        };
      }

      if (competition.status === 'ACTIVE') {
        return {
          success: false,
          error: 'Cannot update active competition'
        };
      }

      if (data.endDate && data.endDate <= competition.startDate) {
        return {
          success: false,
          error: 'End date must be after start date'
        };
      }

      if (data.maxParticipants) {
        const currentEntries = await (this.entryRepository as any).countByCompetition?.(competitionId) || 0;
        if (data.maxParticipants < currentEntries) {
          return {
            success: false,
            error: 'Cannot reduce max participants below current count'
          };
        }
      }

      const updated = await this.competitionRepository.update(competitionId, data);

      return {
        success: true,
        data: updated
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update competition'
      };
    }
  }

  async getLeaderboard(
    competitionId: string,
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      const competition = await this.competitionRepository.findById(competitionId);

      if (!competition) {
        return {
          success: false,
          error: 'Competition not found'
        };
      }

      if (this.groupRepository?.isMember) {
        const isMember = await this.groupRepository.isMember(competition.groupId, userId);
        if (!isMember) {
          return {
            success: false,
            error: 'You are not a member of this group'
          };
        }
      }

      const entries = await (this.entryRepository as any).getEntriesWithUsers?.(competitionId) || [];

      return {
        success: true,
        data: {
          competition,
          leaderboard: entries.map((entry: any, index: number) => ({
            rank: entry.rank || index + 1,
            userId: entry.userId,
            username: entry.user?.username,
            avatarUrl: entry.user?.avatarUrl,
            totalPnl: entry.totalPnl,
            totalRoi: entry.totalRoi,
            winRate: entry.winRate,
            totalTrades: entry.totalTrades,
            consistency: entry.consistency,
            movement: entry.previousRank
              ? entry.previousRank > (entry.rank || 0) ? 'up'
              : entry.previousRank < (entry.rank || 0) ? 'down'
              : 'same'
              : 'new'
          }))
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get leaderboard'
      };
    }
  }

  async updateScores(competitionId: string): Promise<ServiceResult<boolean>> {
    try {
      const competition = await this.competitionRepository.findById(competitionId);

      if (!competition) {
        return {
          success: false,
          error: 'Competition not found'
        };
      }

      if (competition.status !== 'ACTIVE') {
        return {
          success: false,
          error: 'Competition is not active'
        };
      }

      const entries = await this.entryRepository.findByCompetitionId(competitionId);

      const sortField = competition.type === 'MONTHLY_ROI' ? 'totalRoi' :
                        competition.type === 'CONSISTENCY' ? 'consistency' :
                        competition.type === 'BEST_TRADE' ? 'bestTrade' :
                        'totalPnl';

      const sortedEntries = entries
        .filter(e => e.totalTrades >= competition.minTrades)
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

      const result = await (this.entryRepository as any).updateRankings(competitionId, rankings);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update scores'
      };
    }
  }

  async endCompetition(
    competitionId: string,
    userId: string
  ): Promise<ServiceResult<Competition>> {
    try {
      const competition = await this.competitionRepository.findById(competitionId);

      if (!competition) {
        return {
          success: false,
          error: 'Competition not found'
        };
      }

      if (this.groupRepository?.hasPermission) {
        const hasPermission = await this.groupRepository.hasPermission(
          competition.groupId,
          userId,
          ['OWNER', 'ADMIN']
        );

        const isCreator = competition.createdBy === userId;

        if (!hasPermission && !isCreator) {
          return {
            success: false,
            error: 'You do not have permission to end this competition'
          };
        }
      }

      if (competition.status !== 'ACTIVE') {
        return {
          success: false,
          error: 'Competition is not active'
        };
      }

      await this.updateScores(competitionId);

      const updated = await (this.competitionRepository as any).updateStatus?.(competitionId, 'COMPLETED') ||
                      await this.competitionRepository.update(competitionId, { status: 'COMPLETED' });

      return {
        success: true,
        data: updated
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to end competition'
      };
    }
  }

  async getCompetitionStats(
    competitionId: string,
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      const competition = await this.competitionRepository.findById(competitionId);

      if (!competition) {
        return {
          success: false,
          error: 'Competition not found'
        };
      }

      if (this.groupRepository?.isMember) {
        const isMember = await this.groupRepository.isMember(competition.groupId, userId);
        if (!isMember) {
          return {
            success: false,
            error: 'You are not a member of this group'
          };
        }
      }

      const stats = await (this.competitionRepository as any).getStatistics?.(competitionId) || {};
      const topPerformers = await (this.entryRepository as any).getTopPerformers?.(competitionId, 5) || [];
      const entries = await this.entryRepository.findByCompetitionId(competitionId);

      const distribution = entries.reduce((acc, entry) => {
        const bracket = Math.floor(entry.totalPnl / 1000) * 1000;
        const key = `${bracket}-${bracket + 999}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        data: {
          ...stats,
          topPerformers: topPerformers.map((p: any) => ({
            userId: p.userId,
            totalPnl: p.totalPnl,
            rank: p.rank
          })),
          distribution
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get competition statistics'
      };
    }
  }

  async deleteCompetition(competitionId: string): Promise<boolean> {
    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new Error('Competition not found');
    }

    const hasEntries = await (this.entryRepository as any).countByCompetition?.(competitionId) || 0;

    if (hasEntries > 0) {
      throw new Error('Cannot delete competition with participants');
    }

    return this.competitionRepository.delete(competitionId);
  }

  async getActiveCompetitions(): Promise<Competition[]> {
    return this.competitionRepository.getActiveCompetitions();
  }

  async getUpcomingCompetitions(limit: number = 10): Promise<Competition[]> {
    return this.competitionRepository.getUpcomingCompetitions(limit);
  }

  async searchCompetitions(query: string, groupId?: string): Promise<Competition[]> {
    return this.competitionRepository.searchCompetitions(query, groupId);
  }

  async getGroupCompetitions(
    groupId: string,
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: string;
      type?: string;
      startDateFrom?: Date;
      startDateTo?: Date;
    }
  ): Promise<{ competitions: Competition[]; total: number }> {
    return this.competitionRepository.findByGroupIdWithPagination(
      groupId,
      page,
      limit,
      filters
    );
  }

  async getCompetitionWithDetails(competitionId: string): Promise<any> {
    const details = await (this.competitionRepository as any).getWithDetails?.(competitionId);

    if (!details) {
      throw new Error('Competition not found');
    }

    const stats = await (this.competitionRepository as any).getStatistics?.(competitionId) || {};

    return {
      ...details,
      statistics: stats
    };
  }

  async processScheduledActions(): Promise<{
    started: number;
    ended: number;
  }> {
    const readyToStart = await (this.competitionRepository as any).findReadyToStart?.() || [];
    const readyToEnd = await (this.competitionRepository as any).findExpiredActive?.() || [];

    const startedIds = [];
    const endedIds = [];

    for (const comp of readyToStart) {
      try {
        await (this.competitionRepository as any).updateStatus?.(comp.id, 'ACTIVE') ||
        await this.competitionRepository.update(comp.id, { status: 'ACTIVE' });
        startedIds.push(comp.id);
      } catch (error) {
        console.error(`Failed to start competition ${comp.id}:`, error);
      }
    }

    for (const comp of readyToEnd) {
      try {
        await this.updateScores(comp.id);
        await (this.competitionRepository as any).updateStatus?.(comp.id, 'COMPLETED') ||
        await this.competitionRepository.update(comp.id, { status: 'COMPLETED' });
        endedIds.push(comp.id);
      } catch (error) {
        console.error(`Failed to end competition ${comp.id}:`, error);
      }
    }

    return {
      started: startedIds.length,
      ended: endedIds.length
    };
  }
}