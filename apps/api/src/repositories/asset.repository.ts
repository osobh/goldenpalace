import type { Asset, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class AssetRepository {
  async create(data: Prisma.AssetCreateInput): Promise<Asset> {
    return prisma.asset.create({ data });
  }

  async findById(id: string): Promise<Asset | null> {
    return prisma.asset.findUnique({
      where: { id }
    });
  }

  async findByPortfolioId(portfolioId: string): Promise<Asset[]> {
    return prisma.asset.findMany({
      where: { portfolioId },
      orderBy: { allocation: 'desc' }
    });
  }

  async findBySymbol(portfolioId: string, symbol: string): Promise<Asset | null> {
    return prisma.asset.findFirst({
      where: {
        portfolioId,
        symbol
      }
    });
  }

  async update(id: string, data: Prisma.AssetUpdateInput): Promise<Asset> {
    return prisma.asset.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.asset.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteByPortfolioId(portfolioId: string): Promise<boolean> {
    try {
      await prisma.asset.deleteMany({
        where: { portfolioId }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async updatePrices(assets: Asset[]): Promise<boolean> {
    try {
      const updates = assets.map(asset =>
        prisma.asset.update({
          where: { id: asset.id },
          data: {
            currentPrice: asset.currentPrice,
            totalValue: asset.totalValue,
            unrealizedPnl: asset.unrealizedPnl,
            percentageGain: asset.percentageGain,
            lastUpdated: new Date()
          }
        })
      );

      await prisma.$transaction(updates);
      return true;
    } catch (error) {
      return false;
    }
  }

  async calculateAllocations(portfolioId: string): Promise<Asset[]> {
    const assets = await this.findByPortfolioId(portfolioId);
    const totalValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);

    if (totalValue === 0) return assets;

    const updatedAssets = assets.map(asset => ({
      ...asset,
      allocation: (asset.totalValue / totalValue) * 100
    }));

    // Update allocations in database
    for (const asset of updatedAssets) {
      await this.update(asset.id, { allocation: asset.allocation });
    }

    return updatedAssets;
  }

  async getHistoricalPrices(
    assetId: string,
    days: number = 30
  ): Promise<Array<{ date: Date; price: number }>> {
    const asset = await this.findById(assetId);
    if (!asset) return [];

    // Generate synthetic historical prices
    const prices = [];
    let price = asset.currentPrice;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Add some realistic volatility
      price = price * (1 + (Math.random() - 0.5) * 0.02);
      prices.push({ date, price });
    }

    return prices;
  }

  async getTotalValue(portfolioId: string): Promise<number> {
    const assets = await this.findByPortfolioId(portfolioId);
    return assets.reduce((sum, asset) => sum + asset.totalValue, 0);
  }

  async getTopPerformers(portfolioId: string, limit: number = 5): Promise<Asset[]> {
    return prisma.asset.findMany({
      where: { portfolioId },
      orderBy: { percentageGain: 'desc' },
      take: limit
    });
  }

  async getWorstPerformers(portfolioId: string, limit: number = 5): Promise<Asset[]> {
    return prisma.asset.findMany({
      where: { portfolioId },
      orderBy: { percentageGain: 'asc' },
      take: limit
    });
  }

  async updateRealizedPnl(
    id: string,
    realizedPnl: number
  ): Promise<Asset> {
    return prisma.asset.update({
      where: { id },
      data: {
        realizedPnl,
        updatedAt: new Date()
      }
    });
  }
}