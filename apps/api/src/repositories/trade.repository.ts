import type { Trade, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class TradeRepository {
  async create(data: Prisma.TradeCreateInput): Promise<Trade> {
    return prisma.trade.create({ data });
  }

  async findById(id: string): Promise<Trade | null> {
    return prisma.trade.findUnique({
      where: { id }
    });
  }

  async findByUserId(userId: string): Promise<Trade[]> {
    return prisma.trade.findMany({
      where: { userId },
      orderBy: { entryTime: 'desc' }
    });
  }

  async findByGroupId(groupId: string): Promise<Trade[]> {
    return prisma.trade.findMany({
      where: { groupId },
      orderBy: { entryTime: 'desc' }
    });
  }

  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Trade[]> {
    return prisma.trade.findMany({
      where: {
        userId,
        entryTime: { gte: startDate },
        exitTime: { lte: endDate },
        status: 'CLOSED'
      },
      orderBy: { entryTime: 'asc' }
    });
  }

  async calculateStats(trades: Trade[]): Promise<{
    totalPnl: number;
    totalRoi: number;
    winRate: number;
    totalTrades: number;
    averagePnl: number;
  }> {
    if (trades.length === 0) {
      return {
        totalPnl: 0,
        totalRoi: 0,
        winRate: 0,
        totalTrades: 0,
        averagePnl: 0
      };
    }

    const totalPnl = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const totalRoi = trades.reduce((sum, trade) => sum + (trade.roi || 0), 0);
    const winningTrades = trades.filter(trade => (trade.pnl || 0) > 0).length;
    const winRate = (winningTrades / trades.length) * 100;
    const averagePnl = totalPnl / trades.length;

    return {
      totalPnl,
      totalRoi,
      winRate,
      totalTrades: trades.length,
      averagePnl
    };
  }

  async getBestTrade(trades: Trade[]): Promise<number | null> {
    if (trades.length === 0) return null;
    return Math.max(...trades.map(t => t.pnl || 0));
  }

  async getWorstTrade(trades: Trade[]): Promise<number | null> {
    if (trades.length === 0) return null;
    return Math.min(...trades.map(t => t.pnl || 0));
  }

  async calculateConsistency(trades: Trade[]): Promise<number> {
    if (trades.length < 2) return 0;

    const pnls = trades.map(t => t.pnl || 0);
    const mean = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length;

    const variance = pnls.reduce((sum, pnl) => {
      return sum + Math.pow(pnl - mean, 2);
    }, 0) / pnls.length;

    const stdDev = Math.sqrt(variance);
    const coefficient = mean !== 0 ? (stdDev / Math.abs(mean)) : 0;

    const consistency = Math.max(0, Math.min(100, 100 - (coefficient * 100)));

    return Math.round(consistency);
  }

  async getWinningStreak(trades: Trade[]): Promise<{
    current: number;
    max: number;
  }> {
    if (trades.length === 0) {
      return { current: 0, max: 0 };
    }

    let currentStreak = 0;
    let maxStreak = 0;

    const sortedTrades = trades.sort((a, b) =>
      new Date(a.exitTime || a.entryTime).getTime() -
      new Date(b.exitTime || b.entryTime).getTime()
    );

    for (const trade of sortedTrades) {
      if ((trade.pnl || 0) > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return { current: currentStreak, max: maxStreak };
  }

  async update(id: string, data: Prisma.TradeUpdateInput): Promise<Trade> {
    return prisma.trade.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.trade.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getTradesBySymbol(
    userId: string,
    symbol: string
  ): Promise<Trade[]> {
    return prisma.trade.findMany({
      where: {
        userId,
        symbol
      },
      orderBy: { entryTime: 'desc' }
    });
  }

  async getOpenTrades(userId: string): Promise<Trade[]> {
    return prisma.trade.findMany({
      where: {
        userId,
        status: 'OPEN'
      },
      orderBy: { entryTime: 'desc' }
    });
  }

  async closeTrade(
    id: string,
    exitPrice: number,
    exitTime: Date
  ): Promise<Trade> {
    const trade = await prisma.trade.findUnique({ where: { id } });

    if (!trade) {
      throw new Error('Trade not found');
    }

    const pnl = trade.type === 'LONG'
      ? (exitPrice - trade.entryPrice) * trade.quantity
      : (trade.entryPrice - exitPrice) * trade.quantity;

    const roi = (pnl / (trade.entryPrice * trade.quantity)) * 100;

    return prisma.trade.update({
      where: { id },
      data: {
        exitPrice,
        exitTime,
        pnl,
        roi,
        status: 'CLOSED'
      }
    });
  }

  async getTopTrades(
    userId: string,
    limit: number = 10
  ): Promise<Trade[]> {
    return prisma.trade.findMany({
      where: {
        userId,
        status: 'CLOSED'
      },
      orderBy: { pnl: 'desc' },
      take: limit
    });
  }

  async getWorstTrades(
    userId: string,
    limit: number = 10
  ): Promise<Trade[]> {
    return prisma.trade.findMany({
      where: {
        userId,
        status: 'CLOSED'
      },
      orderBy: { pnl: 'asc' },
      take: limit
    });
  }

  async getTradeStatsByPeriod(
    userId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<{
    period: string;
    totalTrades: number;
    totalPnl: number;
    winRate: number;
  }[]> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 12));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 5));
        break;
    }

    const trades = await prisma.trade.findMany({
      where: {
        userId,
        exitTime: { gte: startDate },
        status: 'CLOSED'
      },
      orderBy: { exitTime: 'asc' }
    });

    const grouped = trades.reduce((acc, trade) => {
      const date = new Date(trade.exitTime!);
      let key: string;

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
      }

      if (!acc[key]) {
        acc[key] = { trades: [], totalPnl: 0, wins: 0 };
      }

      acc[key].trades.push(trade);
      acc[key].totalPnl += trade.pnl || 0;
      if ((trade.pnl || 0) > 0) acc[key].wins++;

      return acc;
    }, {} as Record<string, { trades: Trade[]; totalPnl: number; wins: number }>);

    return Object.entries(grouped).map(([period, data]) => ({
      period,
      totalTrades: data.trades.length,
      totalPnl: data.totalPnl,
      winRate: data.trades.length > 0 ? (data.wins / data.trades.length) * 100 : 0
    }));
  }

  async bulkCreate(trades: Prisma.TradeCreateInput[]): Promise<number> {
    const result = await prisma.trade.createMany({
      data: trades
    });
    return result.count;
  }

  async getSymbolPerformance(
    userId: string
  ): Promise<Array<{
    symbol: string;
    totalTrades: number;
    totalPnl: number;
    winRate: number;
  }>> {
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        status: 'CLOSED'
      }
    });

    const grouped = trades.reduce((acc, trade) => {
      if (!acc[trade.symbol]) {
        acc[trade.symbol] = { trades: [], totalPnl: 0, wins: 0 };
      }

      acc[trade.symbol].trades.push(trade);
      acc[trade.symbol].totalPnl += trade.pnl || 0;
      if ((trade.pnl || 0) > 0) acc[trade.symbol].wins++;

      return acc;
    }, {} as Record<string, { trades: Trade[]; totalPnl: number; wins: number }>);

    return Object.entries(grouped).map(([symbol, data]) => ({
      symbol,
      totalTrades: data.trades.length,
      totalPnl: data.totalPnl,
      winRate: data.trades.length > 0 ? (data.wins / data.trades.length) * 100 : 0
    }));
  }
}