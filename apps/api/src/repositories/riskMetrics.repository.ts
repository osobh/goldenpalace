import type { Prisma, RiskMetrics } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class RiskMetricsRepository {
  async create(data: Prisma.RiskMetricsCreateInput): Promise<RiskMetrics> {
    return prisma.riskMetrics.create({ data });
  }

  async findById(id: string): Promise<RiskMetrics | null> {
    return prisma.riskMetrics.findUnique({
      where: { id }
    });
  }

  async findByPortfolioId(
    portfolioId: string,
    limit: number = 100
  ): Promise<RiskMetrics[]> {
    return prisma.riskMetrics.findMany({
      where: { portfolioId },
      orderBy: { calculatedAt: 'desc' },
      take: limit
    });
  }

  async findLatest(portfolioId: string): Promise<RiskMetrics | null> {
    return prisma.riskMetrics.findFirst({
      where: { portfolioId },
      orderBy: { calculatedAt: 'desc' }
    });
  }

  async update(
    id: string,
    data: Prisma.RiskMetricsUpdateInput
  ): Promise<RiskMetrics> {
    return prisma.riskMetrics.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.riskMetrics.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getHistorical(
    portfolioId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RiskMetrics[]> {
    return prisma.riskMetrics.findMany({
      where: {
        portfolioId,
        calculatedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { calculatedAt: 'asc' }
    });
  }

  async saveMetrics(metrics: any): Promise<boolean> {
    try {
      await prisma.riskMetrics.create({
        data: {
          portfolioId: metrics.portfolioId,
          calculatedAt: new Date(),
          timeHorizon: metrics.timeHorizon,
          confidenceLevel: metrics.confidenceLevel,
          valueAtRisk: metrics.valueAtRisk,
          conditionalVaR: metrics.conditionalVaR,
          expectedShortfall: metrics.expectedShortfall,
          volatility: metrics.volatility,
          annualizedVolatility: metrics.annualizedVolatility,
          downsideVolatility: metrics.downsideVolatility || 0,
          sharpeRatio: metrics.sharpeRatio,
          sortinoRatio: metrics.sortinoRatio || 0,
          calmarRatio: metrics.calmarRatio || 0,
          informationRatio: metrics.informationRatio || 0,
          beta: metrics.beta || 0,
          alpha: metrics.alpha || 0,
          treynorRatio: metrics.treynorRatio || 0,
          jensenAlpha: metrics.jensenAlpha || 0,
          maxDrawdown: metrics.maxDrawdown,
          maxDrawdownDuration: metrics.maxDrawdownDuration || 0,
          currentDrawdown: metrics.currentDrawdown,
          recoveryTime: metrics.recoveryTime || 0,
          correlation: metrics.correlation || {},
          covariance: metrics.covariance || {},
          trackingError: metrics.trackingError || 0,
          riskLevel: metrics.riskLevel,
          riskScore: metrics.riskScore
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to save risk metrics:', error);
      return false;
    }
  }

  async getLatestByTimeHorizon(
    portfolioId: string,
    timeHorizon: string
  ): Promise<RiskMetrics | null> {
    return prisma.riskMetrics.findFirst({
      where: {
        portfolioId,
        timeHorizon
      },
      orderBy: { calculatedAt: 'desc' }
    });
  }

  async deleteOldMetrics(
    portfolioId: string,
    daysToKeep: number = 90
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.riskMetrics.deleteMany({
      where: {
        portfolioId,
        calculatedAt: { lt: cutoffDate }
      }
    });

    return result.count;
  }

  async getAverageMetrics(
    portfolioId: string,
    period: number = 30
  ): Promise<{
    avgVaR: number;
    avgVolatility: number;
    avgSharpe: number;
    avgDrawdown: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const metrics = await prisma.riskMetrics.aggregate({
      where: {
        portfolioId,
        calculatedAt: { gte: startDate }
      },
      _avg: {
        valueAtRisk: true,
        volatility: true,
        sharpeRatio: true,
        maxDrawdown: true
      }
    });

    return {
      avgVaR: metrics._avg.valueAtRisk || 0,
      avgVolatility: metrics._avg.volatility || 0,
      avgSharpe: metrics._avg.sharpeRatio || 0,
      avgDrawdown: metrics._avg.maxDrawdown || 0
    };
  }

  async countByRiskLevel(portfolioId: string): Promise<Record<string, number>> {
    const counts = await prisma.riskMetrics.groupBy({
      by: ['riskLevel'],
      where: { portfolioId },
      _count: { riskLevel: true }
    });

    return counts.reduce((acc, curr) => {
      acc[curr.riskLevel] = curr._count.riskLevel;
      return acc;
    }, {} as Record<string, number>);
  }

  async findBreaches(
    portfolioId: string,
    limits: {
      maxVaR?: number;
      maxVolatility?: number;
      minSharpe?: number;
      maxDrawdown?: number;
    }
  ): Promise<RiskMetrics[]> {
    const where: Prisma.RiskMetricsWhereInput = { portfolioId };
    const orConditions: Prisma.RiskMetricsWhereInput[] = [];

    if (limits.maxVaR !== undefined) {
      orConditions.push({ valueAtRisk: { gt: limits.maxVaR } });
    }
    if (limits.maxVolatility !== undefined) {
      orConditions.push({ volatility: { gt: limits.maxVolatility } });
    }
    if (limits.minSharpe !== undefined) {
      orConditions.push({ sharpeRatio: { lt: limits.minSharpe } });
    }
    if (limits.maxDrawdown !== undefined) {
      orConditions.push({ maxDrawdown: { gt: limits.maxDrawdown } });
    }

    if (orConditions.length > 0) {
      where.OR = orConditions;
    }

    return prisma.riskMetrics.findMany({
      where,
      orderBy: { calculatedAt: 'desc' }
    });
  }
}