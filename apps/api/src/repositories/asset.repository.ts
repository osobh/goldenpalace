import type { PortfolioAsset, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class AssetRepository {
  async create(data: Prisma.PortfolioAssetCreateInput): Promise<PortfolioAsset> {
    return prisma.portfolioAsset.create({ data });
  }

  async findById(id: string): Promise<PortfolioAsset | null> {
    return prisma.portfolioAsset.findUnique({
      where: { id }
    });
  }

  async findByPortfolioId(portfolioId: string): Promise<PortfolioAsset[]> {
    return prisma.portfolioAsset.findMany({
      where: { portfolioId },
      orderBy: { allocation: 'desc' }
    });
  }

  async findBySymbol(portfolioId: string, symbol: string): Promise<PortfolioAsset | null> {
    return prisma.portfolioAsset.findFirst({
      where: {
        portfolioId,
        symbol
      }
    });
  }

  async update(id: string, data: Prisma.PortfolioAssetUpdateInput): Promise<PortfolioAsset> {
    return prisma.portfolioAsset.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.portfolioAsset.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteByPortfolioId(portfolioId: string): Promise<boolean> {
    try {
      await prisma.portfolioAsset.deleteMany({
        where: { portfolioId }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async updatePrices(assets: PortfolioAsset[]): Promise<boolean> {
    try {
      const updates = assets.map(asset =>
        prisma.portfolioAsset.update({
          where: { id: asset.id },
          data: {
            currentPrice: asset.currentPrice,
            marketValue: asset.marketValue,
            unrealizedGain: asset.unrealizedGain,
            unrealizedGainPct: asset.unrealizedGainPct,
            updatedAt: new Date()
          }
        })
      );

      await prisma.$transaction(updates);
      return true;
    } catch (error) {
      return false;
    }
  }

  async calculateAllocations(portfolioId: string): Promise<PortfolioAsset[]> {
    const assets = await this.findByPortfolioId(portfolioId);
    const totalValue = assets.reduce((sum, asset) => sum + Number(asset.marketValue || 0), 0);

    if (totalValue === 0) return assets;

    const updatedAssets = assets.map(asset => ({
      ...asset,
      allocation: (Number(asset.marketValue || 0) / totalValue) * 100
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
    let price = Number(asset.currentPrice || 0);

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Add some realistic volatility
      price = Number(price) * (1 + (Math.random() - 0.5) * 0.02);
      prices.push({ date, price });
    }

    return prices;
  }

  async getTotalValue(portfolioId: string): Promise<number> {
    const assets = await this.findByPortfolioId(portfolioId);
    return assets.reduce((sum, asset) => sum + Number(asset.marketValue || 0), 0);
  }

  async getTopPerformers(portfolioId: string, limit: number = 5): Promise<PortfolioAsset[]> {
    return prisma.portfolioAsset.findMany({
      where: { portfolioId },
      orderBy: { unrealizedGainPct: 'desc' },
      take: limit
    });
  }

  async getWorstPerformers(portfolioId: string, limit: number = 5): Promise<PortfolioAsset[]> {
    return prisma.portfolioAsset.findMany({
      where: { portfolioId },
      orderBy: { unrealizedGainPct: 'asc' },
      take: limit
    });
  }

  async updateRealizedPnl(
    id: string,
    realizedPnl: number
  ): Promise<PortfolioAsset> {
    return prisma.portfolioAsset.update({
      where: { id },
      data: {
        // Note: PortfolioAsset doesn't have realizedPnl field, skipping
        updatedAt: new Date()
      }
    });
  }
}