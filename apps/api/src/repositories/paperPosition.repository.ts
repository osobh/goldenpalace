import { PrismaClient } from '@golden-palace/database';
import type {
  PaperPositionWithDetails,
  PortfolioSummary,
  TradingMetrics,
  PaginatedResult
} from '@golden-palace/shared';
import type { AssetType, PositionStatus } from '@golden-palace/database';

export interface CreatePaperPositionData {
  userId: string;
  groupId: string;
  tradeIdeaId?: string;
  symbol: string;
  assetType: AssetType;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface UpdatePaperPositionData {
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  status?: PositionStatus;
  closedPrice?: number;
  closeReason?: string;
  pnl?: number;
  pnlPercent?: number;
}

export interface GetPositionsQuery {
  page?: number;
  limit?: number;
  status?: PositionStatus;
  symbol?: string;
  assetType?: AssetType;
  sortBy?: 'openedAt' | 'closedAt' | 'symbol' | 'pnl' | 'pnlPercent';
  sortOrder?: 'asc' | 'desc';
}

export class PaperPositionRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreatePaperPositionData): Promise<PaperPositionWithDetails> {
    const position = await this.prisma.paperPosition.create({
      data: {
        userId: data.userId,
        groupId: data.groupId,
        tradeIdeaId: data.tradeIdeaId || null,
        symbol: data.symbol.toUpperCase(),
        assetType: data.assetType,
        quantity: data.quantity,
        entryPrice: data.entryPrice,
        currentPrice: data.currentPrice,
        stopLoss: data.stopLoss || null,
        takeProfit: data.takeProfit || null,
        pnl: 0,
        pnlPercent: 0,
        status: 'OPEN',
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
        tradeIdea: {
          select: {
            id: true,
            symbol: true,
            direction: true,
          },
        },
      },
    });

    return this.mapToPaperPositionWithDetails(position);
  }

  async findById(id: string): Promise<PaperPositionWithDetails | null> {
    const position = await this.prisma.paperPosition.findUnique({
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
        tradeIdea: {
          select: {
            id: true,
            symbol: true,
            direction: true,
          },
        },
      },
    });

    return position ? this.mapToPaperPositionWithDetails(position) : null;
  }

  async findByUserId(
    userId: string,
    options: GetPositionsQuery
  ): Promise<PaginatedResult<PaperPositionWithDetails>> {
    const {
      page = 1,
      limit = 20,
      status,
      symbol,
      assetType,
      sortBy = 'openedAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      ...(status && { status }),
      ...(symbol && { symbol: symbol.toUpperCase() }),
      ...(assetType && { assetType }),
    };

    const orderBy: any = {
      [sortBy]: sortOrder,
    };

    const [positions, total] = await Promise.all([
      this.prisma.paperPosition.findMany({
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
          tradeIdea: {
            select: {
              id: true,
              symbol: true,
              direction: true,
            },
          },
        },
      }),
      this.prisma.paperPosition.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: positions.map(this.mapToPaperPositionWithDetails),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findByGroupId(
    groupId: string,
    options: GetPositionsQuery
  ): Promise<PaginatedResult<PaperPositionWithDetails>> {
    const {
      page = 1,
      limit = 20,
      status,
      symbol,
      assetType,
      sortBy = 'openedAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;

    const where: any = {
      groupId,
      ...(status && { status }),
      ...(symbol && { symbol: symbol.toUpperCase() }),
      ...(assetType && { assetType }),
    };

    const orderBy: any = {
      [sortBy]: sortOrder,
    };

    const [positions, total] = await Promise.all([
      this.prisma.paperPosition.findMany({
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
          tradeIdea: {
            select: {
              id: true,
              symbol: true,
              direction: true,
            },
          },
        },
      }),
      this.prisma.paperPosition.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: positions.map(this.mapToPaperPositionWithDetails),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findBySymbol(
    symbol: string,
    options: GetPositionsQuery
  ): Promise<PaginatedResult<PaperPositionWithDetails>> {
    return this.findByUserId('', { ...options, symbol });
  }

  async update(id: string, data: UpdatePaperPositionData): Promise<PaperPositionWithDetails> {
    // Calculate PnL if current price is updated
    const updateData: any = {
      ...(data.currentPrice !== undefined && { currentPrice: data.currentPrice }),
      ...(data.stopLoss !== undefined && { stopLoss: data.stopLoss }),
      ...(data.takeProfit !== undefined && { takeProfit: data.takeProfit }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.closedPrice !== undefined && { closedPrice: data.closedPrice }),
      ...(data.closeReason !== undefined && { closeReason: data.closeReason }),
    };

    // If current price is being updated, calculate PnL
    if (data.currentPrice !== undefined) {
      const position = await this.prisma.paperPosition.findUnique({
        where: { id },
        select: { entryPrice: true, quantity: true },
      });

      if (position) {
        const pnl = (data.currentPrice - Number(position.entryPrice)) * Number(position.quantity);
        const pnlPercent = ((data.currentPrice - Number(position.entryPrice)) / Number(position.entryPrice)) * 100;

        updateData.pnl = pnl;
        updateData.pnlPercent = pnlPercent;
      }
    }

    const updatedPosition = await this.prisma.paperPosition.update({
      where: { id },
      data: updateData,
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
        tradeIdea: {
          select: {
            id: true,
            symbol: true,
            direction: true,
          },
        },
      },
    });

    return this.mapToPaperPositionWithDetails(updatedPosition);
  }

  async close(id: string, closePrice: number, closeReason?: string): Promise<PaperPositionWithDetails> {
    const position = await this.prisma.paperPosition.findUnique({
      where: { id },
      select: { entryPrice: true, quantity: true },
    });

    if (!position) {
      throw new Error('Position not found');
    }

    const pnl = (closePrice - Number(position.entryPrice)) * Number(position.quantity);
    const pnlPercent = ((closePrice - Number(position.entryPrice)) / Number(position.entryPrice)) * 100;

    const closedPosition = await this.prisma.paperPosition.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedPrice: closePrice,
        closedAt: new Date(),
        closeReason: closeReason || 'Manual close',
        currentPrice: closePrice,
        pnl,
        pnlPercent,
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
        tradeIdea: {
          select: {
            id: true,
            symbol: true,
            direction: true,
          },
        },
      },
    });

    return this.mapToPaperPositionWithDetails(closedPosition);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.paperPosition.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getPortfolioSummary(userId: string, groupId?: string): Promise<PortfolioSummary> {
    try {
      console.log(`[Portfolio] Getting summary for user ${userId}, group ${groupId}`);

      const where: any = {
        userId,
        ...(groupId && { groupId }),
      };

      // Get all open positions for proper calculation
      const openPositions = await this.prisma.paperPosition.findMany({
        where: { ...where, status: 'OPEN' },
        select: {
          id: true,
          currentPrice: true,
          quantity: true,
          entryPrice: true,
          pnl: true,
        },
      });

      const closedPositionsCount = await this.prisma.paperPosition.count({
        where: { ...where, status: 'CLOSED' },
      });

      console.log(`[Portfolio] Found ${openPositions.length} open positions, ${closedPositionsCount} closed positions`);

      // Calculate total portfolio value properly (sum of each position's market value)
      let totalValue = 0;
      let totalUnrealizedPnL = 0;

      for (const position of openPositions) {
        const currentPrice = Number(position.currentPrice || 0);
        const quantity = Number(position.quantity || 0);
        const entryPrice = Number(position.entryPrice || 0);

        // Market value = current price * quantity
        const marketValue = currentPrice * quantity;
        totalValue += marketValue;

        // Calculate PnL if not already stored
        let positionPnL = Number(position.pnl || 0);
        if (positionPnL === 0 && currentPrice > 0 && entryPrice > 0) {
          positionPnL = (currentPrice - entryPrice) * quantity;
        }
        totalUnrealizedPnL += positionPnL;
      }

      // Get total realized PnL from closed positions
      const totalPnLResult = await this.prisma.paperPosition.aggregate({
        where: { ...where, status: 'CLOSED' },
        _sum: {
          pnl: true,
        },
      });

      const totalRealizedPnL = Number(totalPnLResult._sum.pnl || 0);
      const totalPnL = totalRealizedPnL + totalUnrealizedPnL;

      // Calculate daily P&L for open positions
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      let dayPnL = 0;

      for (const position of openPositions) {
        const quantity = Number(position.quantity);
        const currentPrice = Number(position.currentPrice || 0);
        const entryPrice = Number(position.entryPrice);
        const openedAt = new Date(position.openedAt);

        if (openedAt >= todayStart) {
          // Position opened today: P&L is from entry price
          dayPnL += (currentPrice - entryPrice) * quantity;
        } else {
          // Position opened on previous day: P&L is from yesterday's closing price
          // For simplicity, we'll use entry price as a proxy for yesterday's close
          // In a real implementation, we'd track historical prices
          const yesterdayClosePrice = await this.getYesterdayClosingPrice(position.symbol, entryPrice);
          dayPnL += (currentPrice - yesterdayClosePrice) * quantity;
        }
      }

      const result = {
        totalValue: Number(totalValue.toFixed(2)),
        totalPnl: Number(totalPnL.toFixed(2)),
        totalPnlPercent: totalValue > 0 ? Number(((totalPnL / totalValue) * 100).toFixed(2)) : 0,
        dayPnl: Number(dayPnL.toFixed(2)),
        dayPnlPercent: totalValue > 0 ? Number(((dayPnL / totalValue) * 100).toFixed(2)) : 0,
        openPositions: openPositions.length,
        closedPositions: closedPositionsCount,
        activeAlerts: 0, // Would come from alerts repository
        buyingPower: 10000.00, // Simplified - would be calculated based on account balance
      };

      console.log(`[Portfolio] Summary calculated:`, result);
      return result;
    } catch (error) {
      console.error(`[Portfolio] Error calculating summary for user ${userId}:`, error);
      throw error;
    }
  }

  private async getYesterdayClosingPrice(symbol: string, fallbackPrice: number): Promise<number> {
    // In a real implementation, this would fetch from historical price data
    // For now, we'll use a simple approximation
    // This simulates small overnight movement for testing purposes
    const overnightChange = fallbackPrice * 0.001; // 0.1% overnight change
    return fallbackPrice - overnightChange;
  }

  async createDailySnapshot(userId: string, groupId?: string): Promise<any> {
    const summary = await this.getPortfolioSummary(userId, groupId);

    // Create a snapshot record (in-memory for now, would be persisted in production)
    const snapshot = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      groupId,
      date: new Date(),
      portfolioValue: summary.totalValue,
      dailyPnl: summary.dayPnl,
      totalPnl: summary.totalPnl,
      openPositions: summary.openPositions,
      closedPositions: summary.closedPositions,
    };

    // Store in memory (in production, this would be saved to database)
    if (!this.dailySnapshots) {
      this.dailySnapshots = new Map();
    }
    const userSnapshots = this.dailySnapshots.get(userId) || [];
    userSnapshots.push(snapshot);
    this.dailySnapshots.set(userId, userSnapshots);

    return snapshot;
  }

  async getDailyPnLHistory(userId: string, days: number = 30): Promise<any[]> {
    // In production, this would query from database
    if (!this.dailySnapshots) {
      this.dailySnapshots = new Map();
    }

    const userSnapshots = this.dailySnapshots.get(userId) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return userSnapshots
      .filter(snapshot => snapshot.date >= cutoffDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private dailySnapshots?: Map<string, any[]>;

  async getTradingMetrics(userId: string, groupId?: string, days?: number): Promise<TradingMetrics> {
    const where: any = {
      userId,
      ...(groupId && { groupId }),
      ...(days && {
        closedAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      }),
    };

    const closedPositions = await this.prisma.paperPosition.findMany({
      where: { ...where, status: 'CLOSED', pnl: { not: null } },
      select: { pnl: true, pnlPercent: true, openedAt: true, closedAt: true },
      orderBy: { closedAt: 'asc' },
    });

    const pnlValues = closedPositions
      .map(pos => pos.pnl as number)
      .filter(pnl => pnl !== null);

    const totalTrades = pnlValues.length;
    const winningTrades = pnlValues.filter(pnl => pnl > 0).length;
    const losingTrades = pnlValues.filter(pnl => pnl < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

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

    // Calculate Sharpe ratio (simplified)
    const returns = pnlValues.map(pnl => pnl / 10000); // Normalize by account size
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length || 0;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length || 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningTotal = 0;

    for (const pnl of pnlValues) {
      runningTotal += pnl;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      const drawdown = ((peak - runningTotal) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate current streak
    let currentStreak = 0;
    for (let i = pnlValues.length - 1; i >= 0; i--) {
      if (pnlValues[i] > 0) {
        if (currentStreak >= 0) currentStreak++;
        else break;
      } else if (pnlValues[i] < 0) {
        if (currentStreak <= 0) currentStreak--;
        else break;
      }
    }

    // Calculate longest streaks
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    for (const pnl of pnlValues) {
      if (pnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      } else if (pnl < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
      }
    }

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: Number(winRate.toFixed(2)),
      totalPnl: Number(totalPnl.toFixed(2)),
      avgWin: Number(avgWin.toFixed(2)),
      avgLoss: Number(avgLoss.toFixed(2)),
      bestTrade: Number(bestTrade.toFixed(2)),
      worstTrade: Number(worstTrade.toFixed(2)),
      profitFactor: Number(profitFactor.toFixed(2)),
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      currentStreak,
      longestWinStreak,
      longestLossStreak,
    };
  }

  async getTopPerformers(groupId: string, limit: number = 10): Promise<any[]> {
    const topPerformers = await this.prisma.paperPosition.findMany({
      where: {
        groupId,
        status: 'CLOSED',
        pnl: { not: null },
      },
      orderBy: {
        pnlPercent: 'desc',
      },
      take: limit,
      select: {
        id: true,
        symbol: true,
        pnl: true,
        pnlPercent: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    return topPerformers.map(pos => ({
      id: pos.id,
      symbol: pos.symbol,
      pnl: Number(pos.pnl || 0),
      pnlPercent: Number(pos.pnlPercent || 0),
      user: pos.user,
    }));
  }

  async calculatePnL(id: string, currentPrice: number): Promise<{ pnl: number; pnlPercent: number }> {
    const position = await this.prisma.paperPosition.findUnique({
      where: { id },
      select: { entryPrice: true, quantity: true },
    });

    if (!position) {
      throw new Error('Position not found');
    }

    const pnl = (currentPrice - Number(position.entryPrice)) * Number(position.quantity);
    const pnlPercent = ((currentPrice - Number(position.entryPrice)) / Number(position.entryPrice)) * 100;

    return {
      pnl: Number(pnl.toFixed(2)),
      pnlPercent: Number(pnlPercent.toFixed(2)),
    };
  }

  async updateCurrentPrice(userId: string, priceUpdates: Record<string, number>): Promise<number> {
    let updatedCount = 0;

    for (const [symbol, price] of Object.entries(priceUpdates)) {
      const positions = await this.prisma.paperPosition.findMany({
        where: {
          userId,
          symbol: symbol.toUpperCase(),
          status: 'OPEN',
        },
        select: { id: true, entryPrice: true, quantity: true },
      });

      for (const position of positions) {
        const pnl = (price - Number(position.entryPrice)) * Number(position.quantity);
        const pnlPercent = ((price - Number(position.entryPrice)) / Number(position.entryPrice)) * 100;

        await this.prisma.paperPosition.update({
          where: { id: position.id },
          data: {
            currentPrice: price,
            pnl,
            pnlPercent,
          },
        });

        updatedCount++;
      }
    }

    return updatedCount;
  }

  async getOpenPositions(userId?: string, symbols?: string[]): Promise<PaperPositionWithDetails[]> {
    const where: any = {
      status: 'OPEN',
      ...(userId && { userId }),
      ...(symbols && symbols.length > 0 && {
        symbol: {
          in: symbols.map(s => s.toUpperCase()),
        },
      }),
    };

    const positions = await this.prisma.paperPosition.findMany({
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
        tradeIdea: {
          select: {
            id: true,
            symbol: true,
            direction: true,
          },
        },
      },
    });

    return positions.map(this.mapToPaperPositionWithDetails);
  }

  async getClosedPositions(
    userId?: string,
    groupId?: string,
    days?: number
  ): Promise<PaperPositionWithDetails[]> {
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

    const positions = await this.prisma.paperPosition.findMany({
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
        tradeIdea: {
          select: {
            id: true,
            symbol: true,
            direction: true,
          },
        },
      },
      orderBy: {
        closedAt: 'desc',
      },
    });

    return positions.map(this.mapToPaperPositionWithDetails);
  }

  private mapToPaperPositionWithDetails(position: any): PaperPositionWithDetails {
    return {
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
      group: position.group,
      tradeIdea: position.tradeIdea,
    };
  }
}