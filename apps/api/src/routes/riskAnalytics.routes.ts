import { Router } from 'express';
import type { Request, Response } from 'express';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { RiskAnalyticsService } from '../services/riskAnalytics.service';
import { RiskMetricsRepository } from '../repositories/riskMetrics.repository';
import { PortfolioRepository } from '../repositories/portfolio.repository';
import { AssetRepository } from '../repositories/asset.repository';
import { MarketDataService } from '../services/marketData.service';
import { TokenService } from '../services/token.service';
import { UserRepository } from '../repositories/user.repository';
import {
  calculateRiskSchema,
  stressTestSchema,
  riskLimitsSchema,
  riskReportSchema
} from '@golden-palace/shared';

const router = Router();
const validationMiddleware = new ValidationMiddleware();

// Initialize dependencies
const riskMetricsRepository = new RiskMetricsRepository();
const portfolioRepository = new PortfolioRepository();
const assetRepository = new AssetRepository();
const marketDataService = new MarketDataService();
const userRepository = new UserRepository();
const tokenService = new TokenService();
const authMiddleware = new AuthMiddleware(tokenService, userRepository);

const riskAnalyticsService = new RiskAnalyticsService(
  riskMetricsRepository,
  portfolioRepository,
  assetRepository,
  marketDataService
);

router.use(authMiddleware.authenticate);

// Calculate risk metrics for a portfolio
router.post(
  '/calculate',
  validationMiddleware.validate(calculateRiskSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const riskMetrics = await riskAnalyticsService.calculateRiskMetrics(req.body);

      res.json({
        success: true,
        data: riskMetrics
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to calculate risk metrics'
      });
    }
  }
);

// Get historical risk metrics for a portfolio
router.get(
  '/portfolio/:portfolioId/history',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { portfolioId } = req.params;
      const { limit = 100, timeHorizon } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      let metrics;
      if (timeHorizon) {
        metrics = await riskMetricsRepository.getLatestByTimeHorizon(
          portfolioId,
          timeHorizon as string
        );
      } else {
        metrics = await riskMetricsRepository.findByPortfolioId(
          portfolioId,
          Number(limit)
        );
      }

      res.json({
        success: true,
        data: metrics
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get risk history'
      });
    }
  }
);

// Get latest risk metrics for a portfolio
router.get(
  '/portfolio/:portfolioId/latest',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { portfolioId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const latestMetrics = await riskMetricsRepository.findLatest(portfolioId);

      if (!latestMetrics) {
        return res.status(404).json({
          success: false,
          error: 'No risk metrics found for this portfolio'
        });
      }

      res.json({
        success: true,
        data: latestMetrics
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get latest risk metrics'
      });
    }
  }
);

// Calculate position risks for a portfolio
router.get(
  '/portfolio/:portfolioId/positions',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { portfolioId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const positionRisks = await riskAnalyticsService.calculatePositionRisks(portfolioId);

      res.json({
        success: true,
        data: positionRisks
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to calculate position risks'
      });
    }
  }
);

// Run stress tests
router.post(
  '/stress-test',
  validationMiddleware.validate(stressTestSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const stressTestResults = await riskAnalyticsService.runStressTests(req.body);

      res.json({
        success: true,
        data: stressTestResults
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to run stress tests'
      });
    }
  }
);

// Set risk limits for a portfolio
router.post(
  '/limits',
  validationMiddleware.validate(riskLimitsSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const limits = await riskAnalyticsService.setRiskLimits(req.body);

      res.json({
        success: true,
        data: limits
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to set risk limits'
      });
    }
  }
);

// Check risk limit breaches
router.get(
  '/portfolio/:portfolioId/breaches',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { portfolioId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // For now, return empty breaches since we need to implement limits storage
      const breaches = {
        breaches: [],
        allWithinLimits: true
      };

      res.json({
        success: true,
        data: breaches
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check risk breaches'
      });
    }
  }
);

// Run Monte Carlo simulation
router.post(
  '/monte-carlo',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { portfolioId, numberOfSimulations = 1000, timeHorizon = '1M' } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      if (!portfolioId) {
        return res.status(400).json({
          success: false,
          error: 'Portfolio ID is required'
        });
      }

      const simulation = await riskAnalyticsService.runMonteCarloSimulation(
        portfolioId,
        numberOfSimulations,
        timeHorizon
      );

      res.json({
        success: true,
        data: simulation
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to run Monte Carlo simulation'
      });
    }
  }
);

// Calculate liquidity risk
router.get(
  '/portfolio/:portfolioId/liquidity',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { portfolioId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const liquidityRisk = await riskAnalyticsService.calculateLiquidityRisk(portfolioId);

      res.json({
        success: true,
        data: liquidityRisk
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to calculate liquidity risk'
      });
    }
  }
);

// Generate risk report
router.post(
  '/report',
  validationMiddleware.validate(riskReportSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const report = await riskAnalyticsService.generateRiskReport(req.body);

      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate risk report'
      });
    }
  }
);

// Get risk metrics aggregates/summary
router.get(
  '/portfolio/:portfolioId/summary',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { portfolioId } = req.params;
      const { period = 30 } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const summary = await riskMetricsRepository.getAverageMetrics(
        portfolioId,
        Number(period)
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get risk summary'
      });
    }
  }
);

export const riskAnalyticsRoutes = router;