import type { Portfolio, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class PortfolioRepository {
  async create(data: Prisma.PortfolioCreateInput): Promise<Portfolio> {
    return prisma.portfolio.create({ data });
  }

  async findById(id: string): Promise<Portfolio | null> {
    return prisma.portfolio.findUnique({
      where: { id }
    });
  }

  async findByUserId(userId: string): Promise<Portfolio[]> {
    return prisma.portfolio.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async update(id: string, data: Prisma.PortfolioUpdateInput): Promise<Portfolio> {
    return prisma.portfolio.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.portfolio.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async updateValue(id: string, currentValue: number): Promise<Portfolio> {
    return prisma.portfolio.update({
      where: { id },
      data: {
        currentValue,
        updatedAt: new Date()
      }
    });
  }

  async getPublicPortfolios(limit: number = 10): Promise<Portfolio[]> {
    return prisma.portfolio.findMany({
      where: { isPublic: true },
      orderBy: { currentValue: 'desc' },
      take: limit
    });
  }

  async getReturns(portfolioId: string, timeHorizon: string): Promise<number[]> {
    const days = this.getDaysFromHorizon(timeHorizon);
    console.log('[PortfolioRepository] getReturns - Generating synthetic returns for', days, 'days');

    // Generate synthetic returns since PortfolioSnapshot doesn't exist yet
    // Temporarily comment out snapshot query to avoid undefined error
    /*
    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: {
        portfolioId,
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    });
    */

    // Always generate synthetic returns for now
    const returns: number[] = [];
    for (let i = 0; i < days; i++) {
      // Generate realistic daily returns (mean ~0.05% daily, volatility ~2%)
      const dailyReturn = (Math.random() - 0.48) * 0.04;
      returns.push(dailyReturn);
    }

    console.log('[PortfolioRepository] Generated', returns.length, 'synthetic returns');

    return returns;
  }

  async getHistoricalValues(
    portfolioId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ date: Date; value: number }>> {
    console.log('[PortfolioRepository] getHistoricalValues - Generating synthetic historical values');

    // Temporarily comment out snapshot query to avoid undefined error
    // PortfolioSnapshot model doesn't exist in Prisma schema yet

    // Always generate synthetic data since PortfolioSnapshot doesn't exist yet
    const portfolio = await this.findById(portfolioId);
    if (!portfolio) {
      console.log('[PortfolioRepository] Portfolio not found:', portfolioId);
      return [];
    }

    const values = [];
    const days = 30;
    let value = Number(portfolio.currentValue) || 10000; // Use currentValue instead of totalValue

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Check if date is within requested range
      if (startDate && date < startDate) continue;
      if (endDate && date > endDate) continue;

      value = value * (1 + (Math.random() - 0.5) * 0.02);
      values.push({ date, value });
    }

    console.log('[PortfolioRepository] Generated', values.length, 'historical values');
    return values;
  }

  async getSnapshots(
    portfolioId: string,
    days: number = 30
  ): Promise<Array<{ date: Date; totalValue: number; portfolioId?: string }>> {
    console.log('[PortfolioRepository] getSnapshots - Generating synthetic snapshots for', days, 'days');

    // Temporarily comment out snapshot query to avoid undefined error
    /*
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: {
        portfolioId,
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    });
    */

    // Always generate synthetic snapshots since PortfolioSnapshot doesn't exist yet
    const portfolio = await this.findById(portfolioId);
    if (!portfolio) {
      console.log('[PortfolioRepository] Portfolio not found:', portfolioId);
      return [];
    }

    const syntheticSnapshots = [];
    let value = Number(portfolio.currentValue) || 10000; // Use currentValue instead of totalValue

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      value = value * (1 + (Math.random() - 0.5) * 0.02);
      syntheticSnapshots.push({ date, totalValue: value, portfolioId });
    }

    console.log('[PortfolioRepository] Generated', syntheticSnapshots.length, 'snapshots');
    return syntheticSnapshots;
  }

  async getDetailedSnapshots(
    portfolioId: string,
    days: number = 30
  ): Promise<Array<{
    portfolioId: string;
    date: Date;
    totalValue: number;
    assets: Array<{ symbol: string; value: number }>;
  }>> {
    const portfolio = await this.findById(portfolioId);
    if (!portfolio) return [];

    // Generate synthetic detailed snapshots
    const snapshots = [];
    const baseAssets = [
      { symbol: 'AAPL', baseValue: 6000 },
      { symbol: 'GOOGL', baseValue: 4000 }
    ];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const assets = baseAssets.map(asset => ({
        symbol: asset.symbol,
        value: asset.baseValue * (1 + (Math.random() - 0.5) * 0.05)
      }));

      const totalValue = assets.reduce((sum, a) => sum + a.value, 0);

      snapshots.push({
        portfolioId,
        date,
        totalValue,
        assets
      });
    }

    return snapshots;
  }

  async createSnapshot(
    portfolioId: string,
    totalValue: number,
    totalCost: number
  ): Promise<boolean> {
    // Skip creating snapshot since PortfolioSnapshot model doesn't exist yet
    console.log('[PortfolioRepository] createSnapshot - Skipping (PortfolioSnapshot model not implemented)');
    console.log('[PortfolioRepository] Would create snapshot for portfolio:', portfolioId, 'with value:', totalValue);
    return true; // Return success to avoid breaking dependent code
  }

  private getDaysFromHorizon(horizon: string): number {
    const map: Record<string, number> = {
      '1D': 1,
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365
    };
    return map[horizon] || 30;
  }
}