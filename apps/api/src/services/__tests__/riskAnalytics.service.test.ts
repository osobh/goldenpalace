import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskAnalyticsService } from '../riskAnalytics.service';
import { RiskMetricsRepository } from '../../repositories/riskMetrics.repository';
import { PortfolioRepository } from '../../repositories/portfolio.repository';
import { AssetRepository } from '../../repositories/asset.repository';
import { MarketDataService } from '../marketData.service';
import type { Portfolio, Asset } from '@prisma/client';
import type { RiskMetrics, PositionRisk, StressTestResult } from '@golden-palace/shared';

describe('RiskAnalyticsService', () => {
  let riskService: RiskAnalyticsService;
  let riskMetricsRepository: RiskMetricsRepository;
  let portfolioRepository: PortfolioRepository;
  let assetRepository: AssetRepository;
  let marketDataService: MarketDataService;

  const mockPortfolio: Portfolio = {
    id: 'portfolio123',
    userId: 'user123',
    name: 'Test Portfolio',
    description: 'Test portfolio',
    initialBalance: 10000,
    currentBalance: 10000,
    totalValue: 15000,
    currency: 'USD',
    isPublic: false,
    status: 'ACTIVE',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockAssets: Asset[] = [
    {
      id: 'asset1',
      portfolioId: 'portfolio123',
      symbol: 'AAPL',
      name: 'Apple Inc',
      type: 'STOCK',
      quantity: 10,
      averagePrice: 150,
      currentPrice: 180,
      totalValue: 1800,
      costBasis: 1500,
      unrealizedPnl: 300,
      realizedPnl: 0,
      percentageGain: 20,
      allocation: 40,
      currency: 'USD',
      lastUpdated: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: 'asset2',
      portfolioId: 'portfolio123',
      symbol: 'GOOGL',
      name: 'Alphabet Inc',
      type: 'STOCK',
      quantity: 5,
      averagePrice: 2000,
      currentPrice: 2200,
      totalValue: 11000,
      costBasis: 10000,
      unrealizedPnl: 1000,
      realizedPnl: 0,
      percentageGain: 10,
      allocation: 60,
      currency: 'USD',
      lastUpdated: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ];

  beforeEach(() => {
    riskMetricsRepository = {
      create: vi.fn(),
      findByPortfolioId: vi.fn(),
      findLatest: vi.fn(),
      update: vi.fn(),
      getHistorical: vi.fn(),
      saveMetrics: vi.fn()
    } as unknown as RiskMetricsRepository;

    portfolioRepository = {
      findById: vi.fn(),
      getHistoricalValues: vi.fn(),
      getReturns: vi.fn()
    } as unknown as PortfolioRepository;

    assetRepository = {
      findByPortfolioId: vi.fn(),
      getHistoricalPrices: vi.fn()
    } as unknown as AssetRepository;

    marketDataService = {
      getHistoricalPrices: vi.fn(),
      getVolatility: vi.fn(),
      getCorrelations: vi.fn(),
      getBenchmarkReturns: vi.fn()
    } as unknown as MarketDataService;

    riskService = new RiskAnalyticsService(
      riskMetricsRepository,
      portfolioRepository,
      assetRepository,
      marketDataService
    );
  });

  describe('calculateRiskMetrics', () => {
    it('should calculate Value at Risk (VaR)', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(portfolioRepository.getReturns).mockResolvedValue([0.02, -0.01, 0.03, -0.02, 0.01]);

      const result = await riskService.calculateRiskMetrics({
        portfolioId: 'portfolio123',
        timeHorizon: '1M',
        confidenceLevel: 0.95
      });

      expect(result.valueAtRisk).toBeGreaterThan(0);
      expect(result.confidenceLevel).toBe(0.95);
    });

    it('should calculate Conditional VaR (CVaR)', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(portfolioRepository.getReturns).mockResolvedValue([0.02, -0.01, 0.03, -0.05, 0.01, -0.03]);

      const result = await riskService.calculateRiskMetrics({
        portfolioId: 'portfolio123',
        timeHorizon: '1M',
        confidenceLevel: 0.95
      });

      expect(result.conditionalVaR).toBeGreaterThan(result.valueAtRisk);
      expect(result.expectedShortfall).toBeGreaterThan(0);
    });

    it('should calculate Sharpe ratio', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(portfolioRepository.getReturns).mockResolvedValue([0.02, 0.01, 0.03, 0.02, 0.01]);
      vi.mocked(marketDataService.getBenchmarkReturns).mockResolvedValue(0.02);

      const result = await riskService.calculateRiskMetrics({
        portfolioId: 'portfolio123',
        timeHorizon: '1M',
        confidenceLevel: 0.95
      });

      expect(result.sharpeRatio).toBeDefined();
      expect(result.sharpeRatio).not.toBeNaN();
    });

    it('should calculate maximum drawdown', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(portfolioRepository.getHistoricalValues).mockResolvedValue([
        { date: new Date('2024-01-01'), value: 10000 },
        { date: new Date('2024-01-02'), value: 11000 },
        { date: new Date('2024-01-03'), value: 9000 },
        { date: new Date('2024-01-04'), value: 9500 }
      ]);

      const result = await riskService.calculateRiskMetrics({
        portfolioId: 'portfolio123',
        timeHorizon: '1M',
        confidenceLevel: 0.95
      });

      expect(result.maxDrawdown).toBeCloseTo(18.18, 1);
      expect(result.currentDrawdown).toBeDefined();
    });

    it('should calculate correlations between assets', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(marketDataService.getCorrelations).mockResolvedValue({
        'AAPL-GOOGL': 0.7,
        'GOOGL-AAPL': 0.7
      });

      const result = await riskService.calculateRiskMetrics({
        portfolioId: 'portfolio123',
        timeHorizon: '1M',
        confidenceLevel: 0.95,
        includeCorrelations: true
      });

      expect(result.correlation).toHaveProperty('AAPL-GOOGL');
      expect(result.correlation['AAPL-GOOGL']).toBe(0.7);
    });

    it('should determine risk level based on metrics', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(portfolioRepository.getReturns).mockResolvedValue([0.02, -0.01, 0.03, -0.02, 0.01]);

      const result = await riskService.calculateRiskMetrics({
        portfolioId: 'portfolio123',
        timeHorizon: '1M',
        confidenceLevel: 0.95
      });

      expect(result.riskLevel).toMatch(/LOW|MEDIUM|HIGH|EXTREME/);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should throw error if portfolio not found', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(null);

      await expect(riskService.calculateRiskMetrics({
        portfolioId: 'invalid',
        timeHorizon: '1M',
        confidenceLevel: 0.95
      })).rejects.toThrow('Portfolio not found');
    });
  });

  describe('calculatePositionRisks', () => {
    it('should calculate individual VaR for each position', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(marketDataService.getVolatility).mockResolvedValue({
        AAPL: 0.25,
        GOOGL: 0.30
      });

      const result = await riskService.calculatePositionRisks('portfolio123');

      expect(result).toHaveLength(2);
      expect(result[0].individualVaR).toBeGreaterThan(0);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('should calculate marginal VaR', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(marketDataService.getVolatility).mockResolvedValue({
        AAPL: 0.25,
        GOOGL: 0.30
      });

      const result = await riskService.calculatePositionRisks('portfolio123');

      expect(result[0].marginalVaR).toBeDefined();
      expect(result[0].marginalVaR).not.toBeNaN();
    });

    it('should calculate concentration risk', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);

      const result = await riskService.calculatePositionRisks('portfolio123');

      expect(result[1].concentrationRisk).toBeGreaterThan(result[0].concentrationRisk);
      expect(result[1].percentageOfPortfolio).toBe(60);
    });
  });

  describe('runStressTests', () => {
    it('should run market crash scenario', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);

      const result = await riskService.runStressTests({
        portfolioId: 'portfolio123',
        scenarios: [{
          name: 'Market Crash',
          marketChange: -30,
          volatilityMultiplier: 2,
          correlationShock: 0.2,
          duration: '1W'
        }]
      });

      expect(result).toHaveLength(1);
      expect(result[0].scenarioName).toBe('Market Crash');
      expect(result[0].portfolioLoss).toBeGreaterThan(0);
      expect(result[0].lossPercentage).toBeCloseTo(30, 5);
    });

    it('should calculate asset impacts under stress', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);

      const result = await riskService.runStressTests({
        portfolioId: 'portfolio123',
        scenarios: [{
          name: 'Tech Sector Crash',
          marketChange: -40,
          volatilityMultiplier: 3,
          correlationShock: 0.5,
          duration: '1M'
        }]
      });

      expect(result[0].assetImpacts).toHaveLength(2);
      expect(result[0].assetImpacts[0].loss).toBeGreaterThan(0);
      expect(result[0].severity).toMatch(/LOW|MEDIUM|HIGH|EXTREME/);
    });

    it('should calculate stressed metrics', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);

      const result = await riskService.runStressTests({
        portfolioId: 'portfolio123',
        scenarios: [{
          name: 'High Volatility',
          marketChange: -10,
          volatilityMultiplier: 3,
          correlationShock: 0,
          duration: '1D'
        }]
      });

      expect(result[0].metricsUnderStress.volatility).toBeGreaterThan(0);
      expect(result[0].metricsUnderStress.var).toBeGreaterThan(0);
    });
  });

  describe('setRiskLimits', () => {
    it('should set risk limits for portfolio', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(riskMetricsRepository.saveMetrics).mockResolvedValue(true);

      const result = await riskService.setRiskLimits({
        portfolioId: 'portfolio123',
        maxDrawdown: 20,
        maxVaR: 1000,
        maxLeverage: 2,
        maxConcentration: 40,
        maxVolatility: 30,
        minSharpeRatio: 0.5
      });

      expect(result.maxDrawdown).toBe(20);
      expect(result.active).toBe(true);
    });

    it('should validate risk limits', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);

      await expect(riskService.setRiskLimits({
        portfolioId: 'portfolio123',
        maxDrawdown: 150,
        maxVaR: 1000,
        maxLeverage: 1,
        maxConcentration: 40,
        maxVolatility: 30,
        minSharpeRatio: 0
      })).rejects.toThrow('Invalid risk limits');
    });
  });

  describe('checkRiskLimits', () => {
    it('should detect limit breaches', async () => {
      const mockLimits = {
        maxDrawdown: 10,
        maxVaR: 500,
        maxVolatility: 20
      };

      const mockMetrics = {
        maxDrawdown: 15,
        valueAtRisk: 600,
        volatility: 25
      };

      vi.mocked(riskMetricsRepository.findLatest).mockResolvedValue(mockMetrics);
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);

      const result = await riskService.checkRiskLimits('portfolio123', mockLimits);

      expect(result.breaches).toHaveLength(3);
      expect(result.breaches[0].limitType).toBe('maxDrawdown');
      expect(result.breaches[0].breachAmount).toBe(5);
    });

    it('should not report breaches when within limits', async () => {
      const mockLimits = {
        maxDrawdown: 20,
        maxVaR: 1000
      };

      const mockMetrics = {
        maxDrawdown: 10,
        valueAtRisk: 500
      };

      vi.mocked(riskMetricsRepository.findLatest).mockResolvedValue(mockMetrics);
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);

      const result = await riskService.checkRiskLimits('portfolio123', mockLimits);

      expect(result.breaches).toHaveLength(0);
      expect(result.allWithinLimits).toBe(true);
    });
  });

  describe('runMonteCarloSimulation', () => {
    it('should run Monte Carlo simulation', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(portfolioRepository.getReturns).mockResolvedValue([0.01, 0.02, -0.01, 0.03]);

      const result = await riskService.runMonteCarloSimulation(
        'portfolio123',
        1000,
        '1Y'
      );

      expect(result.numberOfSimulations).toBe(1000);
      expect(result.results.expectedReturn).toBeDefined();
      expect(result.results.probabilityOfLoss).toBeGreaterThanOrEqual(0);
      expect(result.results.probabilityOfLoss).toBeLessThanOrEqual(1);
    });

    it('should generate distribution percentiles', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(portfolioRepository.getReturns).mockResolvedValue([0.01, 0.02, -0.01, 0.03]);

      const result = await riskService.runMonteCarloSimulation(
        'portfolio123',
        1000,
        '6M'
      );

      expect(result.results.percentiles).toHaveProperty('5');
      expect(result.results.percentiles).toHaveProperty('95');
      expect(result.results.percentiles[95]).toBeGreaterThan(result.results.percentiles[5]);
    });

    it('should identify best and worst cases', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(portfolioRepository.getReturns).mockResolvedValue([0.01, 0.02, -0.01, 0.03]);

      const result = await riskService.runMonteCarloSimulation(
        'portfolio123',
        1000,
        '3M'
      );

      expect(result.results.bestCase.value).toBeGreaterThan(result.results.worstCase.value);
      expect(result.results.mostLikely.value).toBeLessThan(result.results.bestCase.value);
      expect(result.results.mostLikely.value).toBeGreaterThan(result.results.worstCase.value);
    });
  });

  describe('calculateLiquidityRisk', () => {
    it('should assess portfolio liquidity', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(marketDataService.getVolume).mockResolvedValue({
        AAPL: 50000000,
        GOOGL: 20000000
      });

      const result = await riskService.calculateLiquidityRisk('portfolio123');

      expect(result.overall.liquidityScore).toBeGreaterThanOrEqual(0);
      expect(result.overall.liquidityScore).toBeLessThanOrEqual(100);
      expect(result.overall.daysToLiquidate).toBeGreaterThan(0);
    });

    it('should calculate days to liquidate each asset', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(marketDataService.getVolume).mockResolvedValue({
        AAPL: 50000000,
        GOOGL: 20000000
      });

      const result = await riskService.calculateLiquidityRisk('portfolio123');

      expect(result.byAsset).toHaveLength(2);
      expect(result.byAsset[0].daysToLiquidate).toBeLessThan(1);
      expect(result.byAsset[0].marketImpact).toBeGreaterThanOrEqual(0);
    });

    it('should calculate stressed liquidity conditions', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(marketDataService.getVolume).mockResolvedValue({
        AAPL: 50000000,
        GOOGL: 20000000
      });

      const result = await riskService.calculateLiquidityRisk('portfolio123');

      expect(result.stressedLiquidity.volumeReduction).toBeGreaterThan(0);
      expect(result.stressedLiquidity.spreadWidening).toBeGreaterThan(0);
      expect(result.stressedLiquidity.estimatedCost).toBeGreaterThan(0);
    });
  });

  describe('generateRiskReport', () => {
    it('should generate comprehensive risk report', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(assetRepository.findByPortfolioId).mockResolvedValue(mockAssets);
      vi.mocked(riskMetricsRepository.findLatest).mockResolvedValue({
        valueAtRisk: 500,
        sharpeRatio: 1.2,
        volatility: 0.15,
        maxDrawdown: 10,
        riskLevel: 'MEDIUM',
        riskScore: 45
      });

      const result = await riskService.generateRiskReport({
        portfolioId: 'portfolio123',
        reportType: 'DETAILED',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        includeCharts: true
      });

      expect(result.reportType).toBe('DETAILED');
      expect(result.executiveSummary).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.positionRisks).toBeDefined();
    });

    it('should include historical analysis', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(portfolioRepository.getHistoricalValues).mockResolvedValue([
        { date: new Date('2024-01-01'), value: 10000 },
        { date: new Date('2024-01-02'), value: 9500 },
        { date: new Date('2024-01-03'), value: 10500 }
      ]);

      const result = await riskService.generateRiskReport({
        portfolioId: 'portfolio123',
        reportType: 'DETAILED',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      });

      expect(result.historicalAnalysis.worstDay.loss).toBe(500);
      expect(result.historicalAnalysis.bestDay.gain).toBe(1000);
    });

    it('should perform VaR backtesting', async () => {
      vi.mocked(portfolioRepository.findById).mockResolvedValue(mockPortfolio);
      vi.mocked(portfolioRepository.getReturns).mockResolvedValue(
        Array(100).fill(0).map(() => Math.random() * 0.1 - 0.05)
      );

      const result = await riskService.generateRiskReport({
        portfolioId: 'portfolio123',
        reportType: 'REGULATORY',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      });

      expect(result.historicalAnalysis.varBacktest).toBeDefined();
      expect(result.historicalAnalysis.varBacktest.kupiecTest.passed).toBeDefined();
    });
  });
});