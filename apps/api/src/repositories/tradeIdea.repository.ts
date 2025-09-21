import { PrismaClient } from '@golden-palace/database';
import type {
  TradeIdeaWithDetails,
  GetTradeIdeasQuery,
  PaginatedResult,
  TradeIdeaPerformanceStats,
  TrendingSymbol,
  TradeIdeaSearchQuery
} from '@golden-palace/shared';
import type { AssetType, TradeDirection, TradeStatus } from '@golden-palace/database';

export interface CreateTradeIdeaData {
  userId: string;
  groupId: string;
  symbol: string;
  assetType?: AssetType;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  timeframe?: string;
  confidence?: number;
  rationale?: string;
  chartUrl?: string;
  tags?: string[];
}

export interface UpdateTradeIdeaData {
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  timeframe?: string;
  confidence?: number;
  rationale?: string;
  chartUrl?: string;
  tags?: string[];
  status?: TradeStatus;
  closedPrice?: number;
  closedAt?: Date;
  pnl?: number;
}

export class TradeIdeaRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateTradeIdeaData): Promise<TradeIdeaWithDetails> {
    const tradeIdea = await this.prisma.tradeIdea.create({
      data: {
        userId: data.userId,
        groupId: data.groupId,
        symbol: data.symbol.toUpperCase(),
        assetType: data.assetType || null,
        direction: data.direction,
        entryPrice: data.entryPrice,
        stopLoss: data.stopLoss || null,
        takeProfit1: data.takeProfit1 || null,
        takeProfit2: data.takeProfit2 || null,
        takeProfit3: data.takeProfit3 || null,
        timeframe: data.timeframe || null,
        confidence: data.confidence || null,
        rationale: data.rationale || null,
        chartUrl: data.chartUrl || null,
        tags: data.tags || [],
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        paperPositions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return this.mapToTradeIdeaWithDetails(tradeIdea);
  }

  async findById(id: string): Promise<TradeIdeaWithDetails | null> {
    const tradeIdea = await this.prisma.tradeIdea.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        paperPositions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return tradeIdea ? this.mapToTradeIdeaWithDetails(tradeIdea) : null;
  }

  async findByGroupId(
    groupId: string,
    options: GetTradeIdeasQuery
  ): Promise<PaginatedResult<TradeIdeaWithDetails>> {
    const {
      page = 1,
      limit = 20,
      symbol,
      status,
      direction,
      assetType,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;

    const where: any = {
      groupId,
      ...(symbol && { symbol: symbol.toUpperCase() }),
      ...(status && { status }),
      ...(direction && { direction }),
      ...(assetType && { assetType }),
      ...(userId && { userId }),
    };

    const orderBy: any = {
      [sortBy]: sortOrder,
    };

    const [tradeIdeas, total] = await Promise.all([
      this.prisma.tradeIdea.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
          },
          paperPositions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.tradeIdea.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: tradeIdeas.map(this.mapToTradeIdeaWithDetails),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findByUserId(
    userId: string,
    options: GetTradeIdeasQuery
  ): Promise<PaginatedResult<TradeIdeaWithDetails>> {
    const {
      page = 1,
      limit = 20,
      symbol,
      status,
      direction,
      assetType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      ...(symbol && { symbol: symbol.toUpperCase() }),
      ...(status && { status }),
      ...(direction && { direction }),
      ...(assetType && { assetType }),
    };

    const orderBy: any = {
      [sortBy]: sortOrder,
    };

    const [tradeIdeas, total] = await Promise.all([
      this.prisma.tradeIdea.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
          },
          paperPositions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.tradeIdea.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: tradeIdeas.map(this.mapToTradeIdeaWithDetails),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async update(id: string, data: UpdateTradeIdeaData): Promise<TradeIdeaWithDetails> {
    const tradeIdea = await this.prisma.tradeIdea.update({
      where: { id },
      data: {
        ...(data.stopLoss !== undefined && { stopLoss: data.stopLoss }),
        ...(data.takeProfit1 !== undefined && { takeProfit1: data.takeProfit1 }),
        ...(data.takeProfit2 !== undefined && { takeProfit2: data.takeProfit2 }),
        ...(data.takeProfit3 !== undefined && { takeProfit3: data.takeProfit3 }),
        ...(data.timeframe !== undefined && { timeframe: data.timeframe }),
        ...(data.confidence !== undefined && { confidence: data.confidence }),
        ...(data.rationale !== undefined && { rationale: data.rationale }),
        ...(data.chartUrl !== undefined && { chartUrl: data.chartUrl }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.closedPrice !== undefined && { closedPrice: data.closedPrice }),
        ...(data.closedAt !== undefined && { closedAt: data.closedAt }),
        ...(data.pnl !== undefined && { pnl: data.pnl }),
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        paperPositions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return this.mapToTradeIdeaWithDetails(tradeIdea);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.tradeIdea.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async findBySymbol(
    symbol: string,
    options: GetTradeIdeasQuery
  ): Promise<PaginatedResult<TradeIdeaWithDetails>> {
    return this.findByGroupId('', { ...options, symbol });
  }

  async findActiveIdeas(symbols?: string[]): Promise<TradeIdeaWithDetails[]> {
    const where: any = {
      status: 'ACTIVE',
      ...(symbols && symbols.length > 0 && {
        symbol: {
          in: symbols.map(s => s.toUpperCase()),
        },
      }),
    };

    const tradeIdeas = await this.prisma.tradeIdea.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        paperPositions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return tradeIdeas.map(this.mapToTradeIdeaWithDetails);
  }

  async findClosedIdeas(
    userId?: string,
    groupId?: string,
    days?: number
  ): Promise<TradeIdeaWithDetails[]> {
    const where: any = {
      status: 'CLOSED',
      ...(userId && { userId }),
      ...(groupId && { groupId }),
      ...(days && {
        closedAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      }),
    };

    const tradeIdeas = await this.prisma.tradeIdea.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        paperPositions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        closedAt: 'desc',
      },
    });

    return tradeIdeas.map(this.mapToTradeIdeaWithDetails);
  }

  async updateStatus(id: string, status: TradeStatus): Promise<boolean> {
    try {
      await this.prisma.tradeIdea.update({
        where: { id },
        data: { status },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getPerformanceStats(
    userId: string,
    groupId?: string
  ): Promise<TradeIdeaPerformanceStats> {
    const where: any = {
      userId,
      ...(groupId && { groupId }),
    };

    const [total, active, closed] = await Promise.all([
      this.prisma.tradeIdea.count({ where }),
      this.prisma.tradeIdea.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.tradeIdea.count({ where: { ...where, status: 'CLOSED' } }),
    ]);

    const closedIdeas = await this.prisma.tradeIdea.findMany({
      where: { ...where, status: 'CLOSED', pnl: { not: null } },
      select: { pnl: true },
    });

    const pnlValues = closedIdeas
      .map(idea => idea.pnl as number)
      .filter(pnl => pnl !== null);

    const winningIdeas = pnlValues.filter(pnl => pnl > 0).length;
    const losingIdeas = pnlValues.filter(pnl => pnl < 0).length;
    const winRate = closed > 0 ? (winningIdeas / closed) * 100 : 0;

    const totalPnl = pnlValues.reduce((sum, pnl) => sum + pnl, 0);
    const wins = pnlValues.filter(pnl => pnl > 0);
    const losses = pnlValues.filter(pnl => pnl < 0);

    const avgWin = wins.length > 0 ? wins.reduce((sum, pnl) => sum + pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((sum, pnl) => sum + pnl, 0) / losses.length : 0;

    const bestTrade = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
    const worstTrade = pnlValues.length > 0 ? Math.min(...pnlValues) : 0;

    const grossProfit = wins.reduce((sum, pnl) => sum + pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, pnl) => sum + pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    return {
      totalIdeas: total,
      activeIdeas: active,
      closedIdeas: closed,
      winningIdeas,
      losingIdeas,
      winRate: Number(winRate.toFixed(2)),
      totalPnl: Number(totalPnl.toFixed(2)),
      avgWin: Number(avgWin.toFixed(2)),
      avgLoss: Number(avgLoss.toFixed(2)),
      bestTrade: Number(bestTrade.toFixed(2)),
      worstTrade: Number(worstTrade.toFixed(2)),
      profitFactor: Number(profitFactor.toFixed(2)),
    };
  }

  async getTrendingSymbols(groupId: string, days: number = 7): Promise<TrendingSymbol[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.prisma.tradeIdea.groupBy({
      by: ['symbol'],
      where: {
        groupId,
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        symbol: true,
      },
      _avg: {
        pnl: true,
      },
      orderBy: {
        _count: {
          symbol: 'desc',
        },
      },
      take: 10,
    });

    return result.map(item => ({
      symbol: item.symbol,
      count: item._count.symbol,
      avgPnl: Number((item._avg.pnl || 0).toFixed(2)),
    }));
  }

  async search(query: TradeIdeaSearchQuery): Promise<PaginatedResult<TradeIdeaWithDetails>> {
    const { groupId, symbol, query: searchQuery, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      groupId,
      ...(symbol && { symbol: symbol.toUpperCase() }),
      ...(searchQuery && {
        OR: [
          { symbol: { contains: searchQuery.toUpperCase() } },
          { rationale: { contains: searchQuery, mode: 'insensitive' } },
          { tags: { has: searchQuery.toLowerCase() } },
        ],
      }),
    };

    const [tradeIdeas, total] = await Promise.all([
      this.prisma.tradeIdea.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
          },
          paperPositions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.tradeIdea.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: tradeIdeas.map(this.mapToTradeIdeaWithDetails),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  private mapToTradeIdeaWithDetails(tradeIdea: any): TradeIdeaWithDetails {
    return {
      id: tradeIdea.id,
      groupId: tradeIdea.groupId,
      userId: tradeIdea.userId,
      symbol: tradeIdea.symbol,
      assetType: tradeIdea.assetType,
      direction: tradeIdea.direction,
      entryPrice: Number(tradeIdea.entryPrice),
      stopLoss: tradeIdea.stopLoss ? Number(tradeIdea.stopLoss) : null,
      takeProfit1: tradeIdea.takeProfit1 ? Number(tradeIdea.takeProfit1) : null,
      takeProfit2: tradeIdea.takeProfit2 ? Number(tradeIdea.takeProfit2) : null,
      takeProfit3: tradeIdea.takeProfit3 ? Number(tradeIdea.takeProfit3) : null,
      timeframe: tradeIdea.timeframe,
      confidence: tradeIdea.confidence,
      rationale: tradeIdea.rationale,
      chartUrl: tradeIdea.chartUrl,
      tags: tradeIdea.tags,
      status: tradeIdea.status,
      closedPrice: tradeIdea.closedPrice ? Number(tradeIdea.closedPrice) : null,
      closedAt: tradeIdea.closedAt,
      pnl: tradeIdea.pnl ? Number(tradeIdea.pnl) : null,
      createdAt: tradeIdea.createdAt,
      updatedAt: tradeIdea.updatedAt,
      user: tradeIdea.user,
      group: tradeIdea.group,
      paperPositions: tradeIdea.paperPositions.map((position: any) => ({
        id: position.id,
        userId: position.userId,
        groupId: position.groupId,
        tradeIdeaId: position.tradeIdeaId,
        symbol: position.symbol,
        assetType: position.assetType,
        quantity: Number(position.quantity),
        entryPrice: Number(position.entryPrice),
        currentPrice: position.currentPrice ? Number(position.currentPrice) : null,
        stopLoss: position.stopLoss ? Number(position.stopLoss) : null,
        takeProfit: position.takeProfit ? Number(position.takeProfit) : null,
        pnl: position.pnl ? Number(position.pnl) : null,
        pnlPercent: position.pnlPercent ? Number(position.pnlPercent) : null,
        status: position.status,
        openedAt: position.openedAt,
        closedAt: position.closedAt,
        closedPrice: position.closedPrice ? Number(position.closedPrice) : null,
        closeReason: position.closeReason,
        user: position.user,
        group: { id: position.groupId, name: tradeIdea.group.name },
        tradeIdea: position.tradeIdeaId ? {
          id: tradeIdea.id,
          symbol: tradeIdea.symbol,
          direction: tradeIdea.direction,
        } : null,
      })),
    };
  }
}