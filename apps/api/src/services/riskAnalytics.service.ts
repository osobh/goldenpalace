import { RiskMetricsRepository } from '../repositories/riskMetrics.repository';
import { PortfolioRepository } from '../repositories/portfolio.repository';
import { AssetRepository } from '../repositories/asset.repository';
import { MarketDataService } from './marketData.service';
import type {
  RiskMetrics,
  PositionRisk,
  StressTestResult,
  RiskLevel,
  TimeHorizon,
  ConfidenceLevel,
  CalculateRiskInput,
  StressTestInput,
  RiskLimitsInput,
  RiskReportInput,
  MonteCarloSimulation,
  LiquidityRisk
} from '@golden-palace/shared';

export class RiskAnalyticsService {
  constructor(
    private riskMetricsRepository: RiskMetricsRepository,
    private portfolioRepository: PortfolioRepository,
    private assetRepository: AssetRepository,
    private marketDataService: MarketDataService
  ) {}

  async calculateRiskMetrics(input: CalculateRiskInput): Promise<RiskMetrics> {
    const portfolio = await this.portfolioRepository.findById(input.portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const assets = await this.assetRepository.findByPortfolioId(input.portfolioId);
    const returns = await this.portfolioRepository.getReturns?.(input.portfolioId, input.timeHorizon) ||
                    this.generateReturns(portfolio, 30);

    // Calculate VaR using historical simulation
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor(returns.length * (1 - input.confidenceLevel));
    const valueAtRisk = Math.abs(sortedReturns[varIndex] * portfolio.totalValue);

    // Calculate CVaR (Expected Shortfall)
    const tailReturns = sortedReturns.slice(0, varIndex + 1);
    const conditionalVaR = Math.abs(
      tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length * portfolio.totalValue
    );

    // Calculate volatility
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    const annualizedVolatility = volatility * Math.sqrt(252);

    // Calculate Sharpe Ratio
    const riskFreeRate = await this.marketDataService.getRiskFreeRate();
    const excessReturn = avgReturn * 252 - riskFreeRate;
    const sharpeRatio = excessReturn / annualizedVolatility;

    // Calculate Sortino Ratio (using downside volatility)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideVolatility = downsideReturns.length > 0 ?
      Math.sqrt(downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length) * Math.sqrt(252) :
      0;
    const sortinoRatio = downsideVolatility > 0 ? excessReturn / downsideVolatility : 0;

    // Calculate maximum drawdown
    const { maxDrawdown, currentDrawdown } = await this.calculateDrawdown(input.portfolioId);

    // Calculate Beta and Alpha
    const marketReturn = await this.marketDataService.getMarketReturn();
    const beta = this.calculateBeta(returns, marketReturn);
    const alpha = avgReturn * 252 - (riskFreeRate + beta * (marketReturn - riskFreeRate));

    // Get correlations if requested
    const correlations = input.includeCorrelations ?
      await this.marketDataService.getCorrelations(assets.map(a => a.symbol)) :
      {};

    // Determine risk level
    const riskScore = this.calculateRiskScore({
      volatility: annualizedVolatility,
      sharpeRatio,
      maxDrawdown,
      valueAtRisk
    });
    const riskLevel = this.determineRiskLevel(riskScore);

    const metrics: RiskMetrics = {
      portfolioId: input.portfolioId,
      calculatedAt: new Date(),
      timeHorizon: input.timeHorizon,
      confidenceLevel: input.confidenceLevel,
      valueAtRisk,
      conditionalVaR,
      expectedShortfall: conditionalVaR,
      volatility,
      annualizedVolatility,
      downsideVolatility,
      sharpeRatio,
      sortinoRatio,
      calmarRatio: maxDrawdown > 0 ? (avgReturn * 252) / maxDrawdown : 0,
      informationRatio: 0,
      beta,
      alpha,
      treynorRatio: beta > 0 ? excessReturn / beta : 0,
      jensenAlpha: alpha,
      maxDrawdown,
      maxDrawdownDuration: 0,
      currentDrawdown,
      recoveryTime: 0,
      correlation: correlations,
      covariance: {},
      trackingError: 0,
      riskLevel,
      riskScore
    };

    await this.riskMetricsRepository.saveMetrics(metrics);
    return metrics;
  }

  async calculatePositionRisks(portfolioId: string): Promise<PositionRisk[]> {
    const portfolio = await this.portfolioRepository.findById(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const assets = await this.assetRepository.findByPortfolioId(portfolioId);
    const volatilities = await this.marketDataService.getVolatility(assets.map(a => a.symbol));

    return assets.map(asset => {
      const volatility = volatilities[asset.symbol] || 0.2;
      const exposure = asset.totalValue;
      const percentageOfPortfolio = (exposure / portfolio.totalValue) * 100;

      // Individual VaR at 95% confidence
      const individualVaR = exposure * volatility * 1.645 / Math.sqrt(252);

      // Marginal VaR approximation
      const marginalVaR = individualVaR * (exposure / portfolio.totalValue);

      // Component VaR
      const componentVaR = marginalVaR * percentageOfPortfolio / 100;

      // Concentration risk increases exponentially with allocation
      const concentrationRisk = Math.pow(percentageOfPortfolio / 100, 2) * 100;

      return {
        assetId: asset.id,
        symbol: asset.symbol,
        exposure,
        percentageOfPortfolio,
        individualVaR,
        marginalVaR,
        componentVaR,
        incrementalVaR: marginalVaR,
        beta: 1,
        correlation: 0.5,
        volatility,
        concentrationRisk,
        liquidityRisk: 0,
        creditRisk: 0
      };
    });
  }

  async runStressTests(input: StressTestInput): Promise<StressTestResult[]> {
    const portfolio = await this.portfolioRepository.findById(input.portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const assets = await this.assetRepository.findByPortfolioId(input.portfolioId);
    const results: StressTestResult[] = [];

    for (const scenario of input.scenarios) {
      const assetImpacts = assets.map(asset => {
        const stressedPrice = asset.currentPrice * (1 + scenario.marketChange / 100);
        const stressedValue = stressedPrice * asset.quantity;
        const loss = asset.totalValue - stressedValue;

        return {
          symbol: asset.symbol,
          currentValue: asset.totalValue,
          stressedValue,
          loss,
          lossPercentage: (loss / asset.totalValue) * 100
        };
      });

      const totalLoss = assetImpacts.reduce((sum, impact) => sum + impact.loss, 0);
      const portfolioLoss = totalLoss;
      const lossPercentage = (portfolioLoss / portfolio.totalValue) * 100;

      // Calculate stressed metrics
      const stressedVolatility = 0.3 * scenario.volatilityMultiplier;
      const stressedVaR = portfolio.totalValue * stressedVolatility * 1.645 / Math.sqrt(252);

      const severity: RiskLevel =
        lossPercentage > 30 ? 'EXTREME' :
        lossPercentage > 20 ? 'HIGH' :
        lossPercentage > 10 ? 'MEDIUM' : 'LOW';

      results.push({
        scenarioName: scenario.name,
        portfolioValue: portfolio.totalValue - portfolioLoss,
        portfolioLoss,
        lossPercentage: Math.abs(lossPercentage),
        assetImpacts,
        metricsUnderStress: {
          var: stressedVaR,
          volatility: stressedVolatility,
          sharpeRatio: -0.5,
          maxDrawdown: Math.abs(lossPercentage)
        },
        probability: 0.05,
        severity
      });
    }

    return results;
  }

  async setRiskLimits(input: RiskLimitsInput): Promise<any> {
    const portfolio = await this.portfolioRepository.findById(input.portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    // Validate risk limits
    if (input.maxDrawdown > 100) {
      throw new Error('Invalid risk limits');
    }

    const limits = {
      id: `limit_${Date.now()}`,
      portfolioId: input.portfolioId,
      maxDrawdown: input.maxDrawdown,
      maxVaR: input.maxVaR,
      maxLeverage: input.maxLeverage || 1,
      maxConcentration: input.maxConcentration,
      maxVolatility: input.maxVolatility,
      minSharpeRatio: input.minSharpeRatio,
      breaches: [],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.riskMetricsRepository.saveMetrics(limits);
    return limits;
  }

  async checkRiskLimits(portfolioId: string, limits: any): Promise<any> {
    const portfolio = await this.portfolioRepository.findById(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const metrics = await this.riskMetricsRepository.findLatest(portfolioId) as any;
    const breaches: any[] = [];

    if (limits.maxDrawdown && metrics.maxDrawdown > limits.maxDrawdown) {
      breaches.push({
        limitType: 'maxDrawdown',
        currentValue: metrics.maxDrawdown,
        limitValue: limits.maxDrawdown,
        breachAmount: metrics.maxDrawdown - limits.maxDrawdown,
        breachPercentage: ((metrics.maxDrawdown - limits.maxDrawdown) / limits.maxDrawdown) * 100,
        breachedAt: new Date(),
        resolved: false
      });
    }

    if (limits.maxVaR && metrics.valueAtRisk > limits.maxVaR) {
      breaches.push({
        limitType: 'maxVaR',
        currentValue: metrics.valueAtRisk,
        limitValue: limits.maxVaR,
        breachAmount: metrics.valueAtRisk - limits.maxVaR,
        breachPercentage: ((metrics.valueAtRisk - limits.maxVaR) / limits.maxVaR) * 100,
        breachedAt: new Date(),
        resolved: false
      });
    }

    if (limits.maxVolatility && metrics.volatility > limits.maxVolatility) {
      breaches.push({
        limitType: 'maxVolatility',
        currentValue: metrics.volatility,
        limitValue: limits.maxVolatility,
        breachAmount: metrics.volatility - limits.maxVolatility,
        breachPercentage: ((metrics.volatility - limits.maxVolatility) / limits.maxVolatility) * 100,
        breachedAt: new Date(),
        resolved: false
      });
    }

    return {
      breaches,
      allWithinLimits: breaches.length === 0
    };
  }

  async runMonteCarloSimulation(
    portfolioId: string,
    numberOfSimulations: number,
    timeHorizon: TimeHorizon
  ): Promise<MonteCarloSimulation> {
    const portfolio = await this.portfolioRepository.findById(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const returns = await this.portfolioRepository.getReturns?.(portfolioId, timeHorizon) ||
                    this.generateReturns(portfolio, 30);

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);

    const simResults: number[] = [];
    const paths: any[] = [];

    for (let sim = 0; sim < numberOfSimulations; sim++) {
      let value = portfolio.totalValue;
      const path = [value];

      // Simulate daily returns for the time horizon
      const days = this.getDaysFromHorizon(timeHorizon);
      for (let day = 0; day < days; day++) {
        const randomReturn = avgReturn + stdDev * this.normalRandom();
        value *= (1 + randomReturn);
        path.push(value);
      }

      simResults.push(value);

      if (sim < 100) { // Store first 100 paths
        paths.push({
          simulationId: sim,
          finalValue: value,
          maxValue: Math.max(...path),
          minValue: Math.min(...path),
          path
        });
      }
    }

    simResults.sort((a, b) => a - b);

    const percentiles: Record<number, number> = {};
    [5, 10, 25, 50, 75, 90, 95].forEach(p => {
      percentiles[p] = simResults[Math.floor(simResults.length * p / 100)];
    });

    const probabilityOfLoss = simResults.filter(v => v < portfolio.totalValue).length / numberOfSimulations;
    const expectedReturn = (simResults.reduce((a, b) => a + b, 0) / numberOfSimulations - portfolio.totalValue) / portfolio.totalValue;

    return {
      portfolioId,
      numberOfSimulations,
      timeHorizon,
      results: {
        expectedReturn,
        expectedVolatility: stdDev * Math.sqrt(this.getDaysFromHorizon(timeHorizon)),
        percentiles,
        probabilityOfLoss,
        probabilityOfTarget: 0.5,
        bestCase: {
          value: simResults[simResults.length - 1],
          probability: 1 / numberOfSimulations
        },
        worstCase: {
          value: simResults[0],
          probability: 1 / numberOfSimulations
        },
        mostLikely: {
          value: percentiles[50],
          probability: 0.5
        },
        paths
      }
    };
  }

  async calculateLiquidityRisk(portfolioId: string): Promise<LiquidityRisk> {
    const portfolio = await this.portfolioRepository.findById(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const assets = await this.assetRepository.findByPortfolioId(portfolioId);
    const volumes = await this.marketDataService.getVolume(assets.map(a => a.symbol));

    const byAsset = assets.map(asset => {
      const avgDailyVolume = volumes[asset.symbol] || 1000000;
      const daysToLiquidate = asset.totalValue / (avgDailyVolume * 0.1); // 10% of daily volume
      const marketImpact = Math.min(0.05, asset.totalValue / avgDailyVolume);
      const liquidityScore = Math.max(0, Math.min(100, 100 - daysToLiquidate * 10));

      return {
        symbol: asset.symbol,
        value: asset.totalValue,
        averageDailyVolume: avgDailyVolume,
        daysToLiquidate,
        marketImpact,
        liquidityScore
      };
    });

    const totalValue = portfolio.totalValue;
    const immediatelyLiquid = byAsset.filter(a => a.daysToLiquidate < 0.1).reduce((sum, a) => sum + a.value, 0);
    const liquidWithin1Day = byAsset.filter(a => a.daysToLiquidate < 1).reduce((sum, a) => sum + a.value, 0);
    const liquidWithin1Week = byAsset.filter(a => a.daysToLiquidate < 7).reduce((sum, a) => sum + a.value, 0);
    const illiquid = totalValue - liquidWithin1Week;

    const avgDaysToLiquidate = byAsset.reduce((sum, a) => sum + a.daysToLiquidate * a.value, 0) / totalValue;
    const liquidityScore = Math.max(0, Math.min(100, 100 - avgDaysToLiquidate * 10));

    return {
      portfolioId,
      overall: {
        liquidityScore,
        daysToLiquidate: avgDaysToLiquidate,
        immediatelyLiquid,
        liquidWithin1Day,
        liquidWithin1Week,
        illiquid
      },
      byAsset,
      stressedLiquidity: {
        marketStress: 0.5,
        volumeReduction: 0.7,
        spreadWidening: 2,
        estimatedCost: totalValue * 0.02
      }
    };
  }

  async generateRiskReport(input: RiskReportInput): Promise<any> {
    const portfolio = await this.portfolioRepository.findById(input.portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const metrics = await this.riskMetricsRepository.findLatest(input.portfolioId) as any ||
                    await this.calculateRiskMetrics({
                      portfolioId: input.portfolioId,
                      timeHorizon: '1M',
                      confidenceLevel: 0.95
                    });

    const positionRisks = await this.calculatePositionRisks(input.portfolioId);

    const historicalValues = await this.portfolioRepository.getHistoricalValues?.(
      input.portfolioId,
      new Date(input.startDate),
      new Date(input.endDate)
    ) || [];

    let worstDay = { date: new Date(), loss: 0 };
    let bestDay = { date: new Date(), gain: 0 };

    for (let i = 1; i < historicalValues.length; i++) {
      const change = historicalValues[i].value - historicalValues[i - 1].value;
      if (change < worstDay.loss) {
        worstDay = { date: historicalValues[i].date, loss: Math.abs(change) };
      }
      if (change > bestDay.gain) {
        bestDay = { date: historicalValues[i].date, gain: change };
      }
    }

    // VaR backtesting for regulatory reports
    let varBacktest = null;
    if (input.reportType === 'REGULATORY') {
      const returns = await this.portfolioRepository.getReturns?.(input.portfolioId, '1M') ||
                      this.generateReturns(portfolio, 100);
      const violations = returns.filter(r => r < -metrics.valueAtRisk / portfolio.totalValue).length;
      const expectedViolations = returns.length * (1 - 0.95);

      varBacktest = {
        violations,
        expectedViolations,
        kupiecTest: {
          statistic: Math.abs(violations - expectedViolations),
          pValue: 0.95,
          passed: Math.abs(violations - expectedViolations) < expectedViolations * 0.5
        }
      };
    }

    return {
      id: `report_${Date.now()}`,
      portfolioId: input.portfolioId,
      reportType: input.reportType,
      generatedAt: new Date(),
      period: {
        start: new Date(input.startDate),
        end: new Date(input.endDate)
      },
      executiveSummary: {
        overallRiskLevel: metrics.riskLevel,
        riskScore: metrics.riskScore,
        keyRisks: this.identifyKeyRisks(metrics),
        recommendations: this.generateRecommendations(metrics)
      },
      metrics,
      positionRisks,
      stressTests: [],
      correlations: {
        assets: [],
        matrix: [],
        significantCorrelations: [],
        clusterAnalysis: []
      },
      historicalAnalysis: {
        worstDay,
        bestDay,
        volatilityTrend: [],
        varBacktest
      },
      riskAttribution: {
        byAsset: {},
        byAssetClass: {},
        bySector: {},
        byRegion: {}
      }
    };
  }

  private generateReturns(portfolio: any, days: number): number[] {
    const returns: number[] = [];
    for (let i = 0; i < days; i++) {
      returns.push((Math.random() - 0.5) * 0.04);
    }
    return returns;
  }

  private async calculateDrawdown(portfolioId: string): Promise<{ maxDrawdown: number; currentDrawdown: number }> {
    const history = await this.portfolioRepository.getHistoricalValues?.(portfolioId, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()) || [];

    if (history.length === 0) {
      return { maxDrawdown: 0, currentDrawdown: 0 };
    }

    let peak = history[0].value;
    let maxDrawdown = 0;

    for (const point of history) {
      if (point.value > peak) {
        peak = point.value;
      }
      const drawdown = ((peak - point.value) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    const currentValue = history[history.length - 1].value;
    const currentDrawdown = ((peak - currentValue) / peak) * 100;

    return { maxDrawdown, currentDrawdown: Math.max(0, currentDrawdown) };
  }

  private calculateBeta(returns: number[], marketReturn: number): number {
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const covariance = returns.reduce((sum, r) => sum + (r - avgReturn) * (marketReturn - marketReturn), 0) / returns.length;
    const marketVariance = Math.pow(marketReturn, 2);
    return marketVariance > 0 ? covariance / marketVariance : 1;
  }

  private calculateRiskScore(metrics: any): number {
    const volatilityScore = Math.min(30, metrics.volatility * 100);
    const varScore = Math.min(30, metrics.valueAtRisk / 10000 * 30);
    const drawdownScore = Math.min(20, metrics.maxDrawdown);
    const sharpeScore = Math.max(0, 20 - Math.max(0, 2 - metrics.sharpeRatio) * 10);

    return Math.min(100, volatilityScore + varScore + drawdownScore + sharpeScore);
  }

  private determineRiskLevel(riskScore: number): RiskLevel {
    if (riskScore < 25) return 'LOW';
    if (riskScore < 50) return 'MEDIUM';
    if (riskScore < 75) return 'HIGH';
    return 'EXTREME';
  }

  private getDaysFromHorizon(horizon: TimeHorizon): number {
    const days: Record<TimeHorizon, number> = {
      '1D': 1,
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365
    };
    return days[horizon] || 30;
  }

  private normalRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private identifyKeyRisks(metrics: any): string[] {
    const risks = [];
    if (metrics.volatility > 0.3) risks.push('High volatility');
    if (metrics.sharpeRatio < 0.5) risks.push('Low risk-adjusted returns');
    if (metrics.maxDrawdown > 20) risks.push('Significant drawdown risk');
    if (metrics.valueAtRisk > 1000) risks.push('High Value at Risk');
    return risks;
  }

  private generateRecommendations(metrics: any): string[] {
    const recommendations = [];
    if (metrics.volatility > 0.3) recommendations.push('Consider diversifying portfolio');
    if (metrics.sharpeRatio < 0.5) recommendations.push('Improve risk-adjusted returns');
    if (metrics.maxDrawdown > 20) recommendations.push('Implement stop-loss strategies');
    return recommendations;
  }
}