import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';
import { TokenService } from '../../services/token.service';
import { HashService } from '../../services/hash.service';

describe('Risk Analytics Routes Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let portfolioId: string;

  beforeAll(async () => {
    const hashService = new HashService();
    const hashedPassword = await hashService.hash('TestPassword123!');

    const user = await prisma.user.create({
      data: {
        email: 'risktest@test.com',
        username: 'risktrader',
        passwordHash: hashedPassword
      }
    });

    userId = user.id;

    const tokenService = new TokenService();
    authToken = tokenService.generateAccessToken({
      userId: user.id,
      email: user.email
    });

    const portfolio = await prisma.portfolio.create({
      data: {
        userId,
        name: 'Test Risk Portfolio',
        description: 'Portfolio for risk analytics testing',
        initialBalance: 10000,
        currentBalance: 10000,
        totalValue: 15000,
        currency: 'USD',
        isPublic: false,
        status: 'ACTIVE'
      }
    });

    portfolioId = portfolio.id;

    await prisma.asset.createMany({
      data: [
        {
          portfolioId,
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
          currency: 'USD'
        },
        {
          portfolioId,
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
          currency: 'USD'
        }
      ]
    });
  });

  afterAll(async () => {
    await prisma.asset.deleteMany({ where: { portfolioId } });
    await prisma.portfolio.delete({ where: { id: portfolioId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  describe('POST /api/risk/calculate', () => {
    it('should calculate risk metrics for portfolio', async () => {
      const response = await request(app)
        .post('/api/risk/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioId,
          timeHorizon: '1M',
          confidenceLevel: 0.95,
          includeCorrelations: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('valueAtRisk');
      expect(response.body.data).toHaveProperty('sharpeRatio');
      expect(response.body.data).toHaveProperty('volatility');
      expect(response.body.data).toHaveProperty('maxDrawdown');
      expect(response.body.data.riskLevel).toMatch(/LOW|MEDIUM|HIGH|EXTREME/);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/risk/calculate')
        .send({
          portfolioId,
          timeHorizon: '1M',
          confidenceLevel: 0.95
        });

      expect(response.status).toBe(401);
    });

    it('should validate confidence level', async () => {
      const response = await request(app)
        .post('/api/risk/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioId,
          timeHorizon: '1M',
          confidenceLevel: 1.5
        });

      expect(response.status).toBe(400);
    });

    it('should validate time horizon', async () => {
      const response = await request(app)
        .post('/api/risk/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioId,
          timeHorizon: 'INVALID',
          confidenceLevel: 0.95
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/risk/position-risks/:portfolioId', () => {
    it('should get position-level risk metrics', async () => {
      const response = await request(app)
        .get(`/api/risk/position-risks/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0]).toHaveProperty('symbol');
      expect(response.body.data[0]).toHaveProperty('individualVaR');
      expect(response.body.data[0]).toHaveProperty('concentrationRisk');
    });

    it('should return 404 for invalid portfolio', async () => {
      const response = await request(app)
        .get('/api/risk/position-risks/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/risk/stress-test', () => {
    it('should run stress test scenarios', async () => {
      const response = await request(app)
        .post('/api/risk/stress-test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioId,
          scenarios: [
            {
              name: 'Market Crash',
              marketChange: -30,
              volatilityMultiplier: 2,
              correlationShock: 0.2,
              duration: '1W'
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0]).toHaveProperty('scenarioName');
      expect(response.body.data[0]).toHaveProperty('portfolioLoss');
      expect(response.body.data[0]).toHaveProperty('severity');
      expect(response.body.data[0].assetImpacts).toBeInstanceOf(Array);
    });

    it('should validate scenario parameters', async () => {
      const response = await request(app)
        .post('/api/risk/stress-test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioId,
          scenarios: [
            {
              name: 'Invalid',
              marketChange: -150, // Invalid: > 100%
              volatilityMultiplier: -1, // Invalid: negative
              correlationShock: 2, // Invalid: > 1
              duration: '1W'
            }
          ]
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/risk/limits', () => {
    it('should set risk limits for portfolio', async () => {
      const response = await request(app)
        .post('/api/risk/limits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioId,
          maxDrawdown: 20,
          maxVaR: 1000,
          maxLeverage: 2,
          maxConcentration: 40,
          maxVolatility: 30,
          minSharpeRatio: 0.5
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('maxDrawdown');
      expect(response.body.data.active).toBe(true);
    });

    it('should validate risk limit values', async () => {
      const response = await request(app)
        .post('/api/risk/limits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioId,
          maxDrawdown: 150, // Invalid: > 100%
          maxVaR: -100, // Invalid: negative
          maxLeverage: 0 // Invalid: not positive
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/risk/limits/:portfolioId/check', () => {
    it('should check risk limit breaches', async () => {
      await request(app)
        .post('/api/risk/limits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioId,
          maxDrawdown: 5,
          maxVaR: 100,
          maxVolatility: 10
        });

      const response = await request(app)
        .get(`/api/risk/limits/${portfolioId}/check`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('breaches');
      expect(response.body.data).toHaveProperty('allWithinLimits');
    });
  });

  describe('POST /api/risk/monte-carlo', () => {
    it('should run Monte Carlo simulation', async () => {
      const response = await request(app)
        .post('/api/risk/monte-carlo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioId,
          numberOfSimulations: 100,
          timeHorizon: '1Y'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('numberOfSimulations');
      expect(response.body.data.numberOfSimulations).toBe(100);
      expect(response.body.data.results).toHaveProperty('expectedReturn');
      expect(response.body.data.results).toHaveProperty('probabilityOfLoss');
      expect(response.body.data.results).toHaveProperty('percentiles');
    });

    it('should limit number of simulations', async () => {
      const response = await request(app)
        .post('/api/risk/monte-carlo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioId,
          numberOfSimulations: 100000,
          timeHorizon: '1Y'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Maximum 10000 simulations');
    });
  });

  describe('GET /api/risk/liquidity/:portfolioId', () => {
    it('should calculate liquidity risk', async () => {
      const response = await request(app)
        .get(`/api/risk/liquidity/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overall).toHaveProperty('liquidityScore');
      expect(response.body.data.overall).toHaveProperty('daysToLiquidate');
      expect(response.body.data.byAsset).toBeInstanceOf(Array);
      expect(response.body.data.stressedLiquidity).toHaveProperty('estimatedCost');
    });
  });

  describe('POST /api/risk/report', () => {
    it('should generate risk report', async () => {
      const response = await request(app)
        .post('/api/risk/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioId,
          reportType: 'DETAILED',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          includeCharts: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportType');
      expect(response.body.data.reportType).toBe('DETAILED');
      expect(response.body.data).toHaveProperty('executiveSummary');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('positionRisks');
    });

    it('should generate regulatory report with VaR backtesting', async () => {
      const response = await request(app)
        .post('/api/risk/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioId,
          reportType: 'REGULATORY',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.data.reportType).toBe('REGULATORY');
      expect(response.body.data.historicalAnalysis.varBacktest).toBeDefined();
      expect(response.body.data.historicalAnalysis.varBacktest.kupiecTest).toHaveProperty('passed');
    });

    it('should validate report date range', async () => {
      const response = await request(app)
        .post('/api/risk/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioId,
          reportType: 'SUMMARY',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid date range');
    });
  });

  describe('GET /api/risk/history/:portfolioId', () => {
    it('should get historical risk metrics', async () => {
      const response = await request(app)
        .get(`/api/risk/history/${portfolioId}`)
        .query({ days: 30 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/risk/alerts/:portfolioId', () => {
    it('should get risk alerts', async () => {
      const response = await request(app)
        .get(`/api/risk/alerts/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/risk/alerts/:alertId/acknowledge', () => {
    it('should acknowledge risk alert', async () => {
      // First create an alert
      const alert = await prisma.riskAlert.create({
        data: {
          portfolioId,
          alertType: 'HIGH_VOLATILITY',
          severity: 'HIGH',
          message: 'High volatility detected',
          details: { volatility: 0.35 },
          triggered: new Date()
        }
      });

      const response = await request(app)
        .post(`/api/risk/alerts/${alert.id}/acknowledge`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.acknowledged).toBe(true);

      await prisma.riskAlert.delete({ where: { id: alert.id } });
    });
  });

  describe('GET /api/risk/compare', () => {
    it('should compare risk metrics across portfolios', async () => {
      const portfolio2 = await prisma.portfolio.create({
        data: {
          userId,
          name: 'Second Portfolio',
          initialBalance: 5000,
          currentBalance: 5000,
          totalValue: 6000,
          currency: 'USD',
          isPublic: false,
          status: 'ACTIVE'
        }
      });

      const response = await request(app)
        .get('/api/risk/compare')
        .query({ portfolioIds: [portfolioId, portfolio2.id].join(',') })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('portfolios');
      expect(response.body.data.portfolios).toHaveLength(2);
      expect(response.body.data).toHaveProperty('comparison');

      await prisma.portfolio.delete({ where: { id: portfolio2.id } });
    });
  });
});