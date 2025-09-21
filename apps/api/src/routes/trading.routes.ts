import express from 'express';
import { z } from 'zod';
import { TradeIdeaService } from '../services/tradeIdea.service';
import { PortfolioService } from '../services/portfolio.service';
import { TradeExecutionService } from '../services/tradeExecution.service';
import { TradeIdeaRepository } from '../repositories/tradeIdea.repository';
import { PaperPositionRepository } from '../repositories/paperPosition.repository';
import { AlertRepository } from '../repositories/alert.repository';
import { GroupRepository } from '../repositories/group.repository';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { TokenService } from '../services/token.service';
import { UserRepository } from '../repositories/user.repository';
import { prisma } from '../lib/prisma';
import { PrismaClient } from '@golden-palace/database';
import type {
  CreateTradeIdeaInput,
  UpdateTradeIdeaInput,
  GetTradeIdeasQuery,
  CreatePaperPositionInput,
  UpdatePositionInput,
  MarketQuote
} from '@golden-palace/shared';
import {
  createTradeIdeaSchema,
  updateTradeIdeaSchema,
  getTradeIdeasQuerySchema,
  createPaperPositionSchema,
  updatePositionSchema
} from '@golden-palace/shared';

const router = express.Router();

// Initialize repositories and services
const tradeIdeaRepository = new TradeIdeaRepository(prisma);
const paperPositionRepository = new PaperPositionRepository(prisma);
const alertRepository = new AlertRepository(prisma);
const groupRepository = new GroupRepository(prisma);

const tradeIdeaService = new TradeIdeaService(tradeIdeaRepository, groupRepository);
const portfolioService = new PortfolioService(paperPositionRepository, tradeIdeaRepository, groupRepository);
const tradeExecutionService = new TradeExecutionService(paperPositionRepository, tradeIdeaRepository, alertRepository);

const tokenService = new TokenService();
const userRepository = new UserRepository();
const authMiddleware = new AuthMiddleware(tokenService, userRepository);
const validationMiddleware = new ValidationMiddleware();

// Validation schemas
const closeTradeIdeaSchema = z.object({
  closedPrice: z.number().positive('Closed price must be positive'),
});

const closePositionSchema = z.object({
  closePrice: z.number().positive('Close price must be positive'),
  closeReason: z.string().optional(),
});

const marketUpdateSchema = z.object({
  quotes: z.array(z.object({
    symbol: z.string(),
    price: z.number().positive(),
    change: z.number(),
    changePercent: z.number(),
    volume: z.number().nonnegative(),
    high: z.number().positive(),
    low: z.number().positive(),
    open: z.number().positive(),
    previousClose: z.number().positive(),
    timestamp: z.string().transform(str => new Date(str)),
  })),
});

// ===================
// TRADE IDEAS ROUTES
// ===================

/**
 * @route POST /api/trading/ideas
 * @desc Create a new trade idea
 * @access Private
 */
router.post(
  '/ideas',
  authMiddleware.authenticate.bind(authMiddleware),
  validationMiddleware.validate(createTradeIdeaSchema),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const input: CreateTradeIdeaInput = req.body;

      const result = await tradeIdeaService.createTradeIdea(userId, input);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route GET /api/trading/ideas/:id
 * @desc Get a specific trade idea
 * @access Private
 */
router.get(
  '/ideas/:id',
  authMiddleware.authenticate.bind(authMiddleware),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const result = await tradeIdeaService.getTradeIdea(userId, id);

      if (!result.success) {
        const statusCode = result.error === 'Trade idea not found' ? 404 : 403;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route GET /api/trading/groups/:groupId/ideas
 * @desc Get trade ideas for a group
 * @access Private
 */
router.get(
  '/groups/:groupId/ideas',
  authMiddleware.authenticate.bind(authMiddleware),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;

      // Parse query parameters
      const query: GetTradeIdeasQuery = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        symbol: req.query.symbol as string,
        status: req.query.status as any,
        direction: req.query.direction as any,
        assetType: req.query.assetType as any,
        userId: req.query.userId as string,
        sortBy: (req.query.sortBy as any) || 'createdAt',
        sortOrder: (req.query.sortOrder as any) || 'desc',
      };

      const result = await tradeIdeaService.getTradeIdeas(userId, groupId, query);

      if (!result.success) {
        const statusCode = result.error === 'Access denied to this group' ? 403 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route PUT /api/trading/ideas/:id
 * @desc Update a trade idea
 * @access Private
 */
router.put(
  '/ideas/:id',
  authMiddleware.authenticate.bind(authMiddleware),
  validationMiddleware.validate(updateTradeIdeaSchema),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const input: UpdateTradeIdeaInput = req.body;

      const result = await tradeIdeaService.updateTradeIdea(userId, id, input);

      if (!result.success) {
        const statusCode = result.error === 'Trade idea not found' ? 404 :
                          result.error?.includes('Only the trade idea owner') ? 403 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route POST /api/trading/ideas/:id/close
 * @desc Close a trade idea
 * @access Private
 */
router.post(
  '/ideas/:id/close',
  authMiddleware.authenticate.bind(authMiddleware),
  validationMiddleware.validate(closeTradeIdeaSchema),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { closedPrice } = req.body;

      const result = await tradeIdeaService.closeTradeIdea(userId, id, closedPrice);

      if (!result.success) {
        const statusCode = result.error === 'Trade idea not found' ? 404 :
                          result.error?.includes('Only the trade idea owner') ? 403 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route DELETE /api/trading/ideas/:id
 * @desc Delete a trade idea
 * @access Private
 */
router.delete(
  '/ideas/:id',
  authMiddleware.authenticate.bind(authMiddleware),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const result = await tradeIdeaService.deleteTradeIdea(userId, id);

      if (!result.success) {
        const statusCode = result.error === 'Trade idea not found' ? 404 :
                          result.error?.includes('Only the trade idea owner') ? 403 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route GET /api/trading/groups/:groupId/performance
 * @desc Get performance statistics for a group
 * @access Private
 */
router.get(
  '/groups/:groupId/performance',
  authMiddleware.authenticate.bind(authMiddleware),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;

      const result = await tradeIdeaService.getPerformanceStats(userId, groupId);

      if (!result.success) {
        return res.status(403).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route GET /api/trading/groups/:groupId/trending
 * @desc Get trending symbols for a group
 * @access Private
 */
router.get(
  '/groups/:groupId/trending',
  authMiddleware.authenticate.bind(authMiddleware),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const days = req.query.days ? parseInt(req.query.days as string) : 7;

      const result = await tradeIdeaService.getTrendingSymbols(userId, groupId, days);

      if (!result.success) {
        return res.status(403).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// ===================
// PORTFOLIO ROUTES
// ===================

/**
 * @route POST /api/trading/positions
 * @desc Create a new paper position
 * @access Private
 */
router.post(
  '/positions',
  authMiddleware.authenticate.bind(authMiddleware),
  validationMiddleware.validate(createPaperPositionSchema),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const input: CreatePaperPositionInput = req.body;
      const { groupId, ...positionData } = input;

      const result = await portfolioService.createPaperPosition(userId, groupId!, positionData);

      if (!result.success) {
        const statusCode = result.error?.includes('not a member') ? 403 : 400;
        return res.status(statusCode).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route GET /api/trading/positions/:id
 * @desc Get a specific position
 * @access Private
 */
router.get(
  '/positions/:id',
  authMiddleware.authenticate.bind(authMiddleware),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const result = await portfolioService.getPosition(userId, id);

      if (!result.success) {
        const statusCode = result.error === 'Position not found' ? 404 : 403;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route GET /api/trading/positions
 * @desc Get user's positions
 * @access Private
 */
router.get(
  '/positions',
  authMiddleware.authenticate.bind(authMiddleware),
  async (req, res) => {
    try {
      const userId = req.user!.id;

      const query = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        status: req.query.status as any,
        symbol: req.query.symbol as string,
        assetType: req.query.assetType as any,
        sortBy: (req.query.sortBy as any) || 'openedAt',
        sortOrder: (req.query.sortOrder as any) || 'desc',
      };

      const result = await portfolioService.getUserPositions(userId, query);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route GET /api/trading/groups/:groupId/positions
 * @desc Get positions for a group
 * @access Private
 */
router.get(
  '/groups/:groupId/positions',
  authMiddleware.authenticate.bind(authMiddleware),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;

      const query = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        status: req.query.status as any,
        symbol: req.query.symbol as string,
        assetType: req.query.assetType as any,
        sortBy: (req.query.sortBy as any) || 'openedAt',
        sortOrder: (req.query.sortOrder as any) || 'desc',
      };

      const result = await portfolioService.getGroupPositions(userId, groupId, query);

      if (!result.success) {
        const statusCode = result.error === 'Access denied to this group' ? 403 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route PUT /api/trading/positions/:id
 * @desc Update a position
 * @access Private
 */
router.put(
  '/positions/:id',
  authMiddleware.authenticate.bind(authMiddleware),
  validationMiddleware.validate(updatePositionSchema),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const input: UpdatePositionInput = req.body;

      const result = await portfolioService.updatePosition(userId, id, input);

      if (!result.success) {
        const statusCode = result.error === 'Position not found' ? 404 :
                          result.error?.includes('Only the position owner') ? 403 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route POST /api/trading/positions/:id/close
 * @desc Close a position
 * @access Private
 */
router.post(
  '/positions/:id/close',
  authMiddleware.authenticate.bind(authMiddleware),
  validationMiddleware.validate(closePositionSchema),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { closePrice, closeReason } = req.body;

      const result = await portfolioService.closePosition(userId, id, closePrice, closeReason);

      if (!result.success) {
        const statusCode = result.error === 'Position not found' ? 404 :
                          result.error?.includes('Only the position owner') ? 403 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route DELETE /api/trading/positions/:id
 * @desc Delete a position
 * @access Private
 */
router.delete(
  '/positions/:id',
  authMiddleware.authenticate.bind(authMiddleware),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const result = await portfolioService.deletePosition(userId, id);

      if (!result.success) {
        const statusCode = result.error === 'Position not found' ? 404 :
                          result.error?.includes('Only the position owner') ? 403 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route GET /api/trading/portfolio/summary
 * @desc Get portfolio summary
 * @access Private
 */
router.get(
  '/portfolio/summary',
  authMiddleware.authenticate.bind(authMiddleware),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const groupId = req.query.groupId as string;

      if (!groupId) {
        return res.status(400).json({
          success: false,
          error: 'groupId parameter is required',
        });
      }

      const result = await portfolioService.getPortfolioSummary(userId, groupId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route GET /api/trading/metrics
 * @desc Get trading metrics
 * @access Private
 */
router.get(
  '/metrics',
  authMiddleware.authenticate.bind(authMiddleware),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const groupId = req.query.groupId as string;
      const days = req.query.days ? parseInt(req.query.days as string) : undefined;

      const result = await portfolioService.getTradingMetrics(userId, groupId, days);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route GET /api/trading/groups/:groupId/top-performers
 * @desc Get top performing positions for a group
 * @access Private
 */
router.get(
  '/groups/:groupId/top-performers',
  authMiddleware.authenticate.bind(authMiddleware),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const result = await portfolioService.getTopPerformers(userId, groupId, limit);

      if (!result.success) {
        const statusCode = result.error === 'Access denied to this group' ? 403 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// ===================
// EXECUTION ROUTES
// ===================

/**
 * @route POST /api/trading/market-update
 * @desc Process market data update
 * @access Private
 */
router.post(
  '/market-update',
  authMiddleware.authenticate.bind(authMiddleware),
  validationMiddleware.validate(marketUpdateSchema),
  async (req, res) => {
    try {
      const { quotes } = req.body;

      const result = await tradeExecutionService.processMarketUpdate(quotes);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @route GET /api/trading/execution/summary
 * @desc Get execution summary
 * @access Private
 */
router.get(
  '/execution/summary',
  authMiddleware.authenticate.bind(authMiddleware),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const days = req.query.days ? parseInt(req.query.days as string) : undefined;

      const result = await tradeExecutionService.getExecutionSummary(userId, days);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

export { router as tradingRoutes };