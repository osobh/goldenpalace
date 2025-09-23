import { Router, Request, Response } from 'express';
import { PortfolioService } from '../services/portfolio.service';
import { AuthMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware';
import { TokenService } from '../services/token.service';
import { UserRepository } from '../repositories/user.repository';
import { PortfolioRepository } from '../repositories/portfolio.repository';
import { PaperPositionRepository } from '../repositories/paperPosition.repository';
import { TradeIdeaRepository } from '../repositories/tradeIdea.repository';
import { GroupRepository } from '../repositories/group.repository';
import { prisma } from '../lib/prisma';

const router = Router();

// Initialize repositories
const portfolioRepository = new PortfolioRepository();
const paperPositionRepository = new PaperPositionRepository(prisma);
const tradeIdeaRepository = new TradeIdeaRepository(prisma);
const groupRepository = new GroupRepository(prisma);
const userRepository = new UserRepository(prisma);

// Initialize services with dependencies
const portfolioService = new PortfolioService(
  paperPositionRepository,
  tradeIdeaRepository,
  groupRepository
);
const tokenService = new TokenService();
const authMiddleware = new AuthMiddleware(tokenService, userRepository);

// GET /api/portfolio - Get all user's portfolios
router.get('/', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const portfolios = await portfolioRepository.findByUserId(userId);

    // Format response to match frontend expectations
    const formattedPortfolios = portfolios.map(portfolio => {
      const initialBalance = Number(portfolio.initialBalance);
      const totalReturn = Number(portfolio.totalReturn);
      const currentValue = Number(portfolio.currentValue);
      const dayChange = Number(portfolio.dayChange);

      // Calculate percentage returns
      const totalReturnPercentage = initialBalance > 0 ? (totalReturn / initialBalance) * 100 : 0;
      const dayChangePercentage = (currentValue - dayChange) > 0 ? (dayChange / (currentValue - dayChange)) * 100 : 0;

      return {
        id: portfolio.id,
        name: portfolio.name,
        description: portfolio.description,
        totalValue: currentValue,
        totalReturn: totalReturn,
        totalReturnPercentage: totalReturnPercentage,
        dayChange: dayChange,
        dayChangePercentage: dayChangePercentage,
        initialBalance: initialBalance,
        currency: portfolio.currency,
        isPublic: portfolio.isPublic,
        portfolioType: portfolio.portfolioType,
        riskTolerance: portfolio.riskTolerance,
        assets: [],
        riskMetrics: {
          volatility: 15,
          sharpeRatio: 1.2,
          beta: 1.0,
          maxDrawdown: -5
        },
        createdAt: portfolio.createdAt,
        updatedAt: portfolio.updatedAt
      };
    });

    res.json({
      success: true,
      data: formattedPortfolios
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch portfolios'
    });
  }
});

// GET /api/portfolio/:id - Get specific portfolio
router.get('/:id', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const portfolio = await portfolioRepository.findById(id);

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    // Check if user owns this portfolio
    if (portfolio.userId !== userId && !portfolio.isPublic) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const formattedPortfolio = {
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description,
      totalValue: Number(portfolio.currentValue),
      totalReturn: Number(portfolio.totalReturn),
      dayChange: Number(portfolio.dayChange),
      initialBalance: Number(portfolio.initialBalance),
      currency: portfolio.currency,
      isPublic: portfolio.isPublic,
      portfolioType: portfolio.portfolioType,
      riskTolerance: portfolio.riskTolerance,
      assets: [],
      riskMetrics: {
        volatility: 15,
        sharpeRatio: 1.2,
        beta: 1.0,
        maxDrawdown: -5
      },
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt
    };

    res.json({
      success: true,
      data: formattedPortfolio
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch portfolio'
    });
  }
});

// POST /api/portfolio - Create a new portfolio
router.post('/', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const {
      name,
      description,
      initialBalance,
      currency = 'USD',
      isPublic = false,
      portfolioType = 'PAPER',
      riskTolerance = 'BALANCED'
    } = req.body;

    // Validate required fields
    if (!name || initialBalance === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name and initial balance are required'
      });
    }

    const portfolio = await portfolioRepository.create({
      name,
      description,
      initialBalance,
      currentValue: initialBalance,
      totalReturn: 0,
      totalReturnPct: 0,
      dayChange: 0,
      dayChangePct: 0,
      currency,
      isPublic,
      portfolioType,
      riskTolerance,
      user: {
        connect: { id: userId }
      }
    });

    // Format the response to match frontend expectations
    const formattedPortfolio = {
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description,
      totalValue: Number(portfolio.currentValue),
      totalReturn: Number(portfolio.totalReturn),
      totalReturnPercentage: 0,
      dayChange: Number(portfolio.dayChange),
      dayChangePercentage: 0,
      initialBalance: Number(portfolio.initialBalance),
      currency: portfolio.currency,
      isPublic: portfolio.isPublic,
      portfolioType: portfolio.portfolioType,
      riskTolerance: portfolio.riskTolerance,
      status: 'ACTIVE',
      assets: [],
      riskMetrics: {
        volatility: 15,
        sharpeRatio: 1.2,
        beta: 1.0,
        maxDrawdown: -5
      },
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt
    };

    res.status(201).json({
      success: true,
      data: formattedPortfolio
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create portfolio'
    });
  }
});

// PUT /api/portfolio/:id - Update a portfolio
router.put('/:id', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if user owns this portfolio
    const existing = await portfolioRepository.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const portfolio = await portfolioRepository.update(id, req.body);

    res.json({
      success: true,
      data: portfolio
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update portfolio'
    });
  }
});

// DELETE /api/portfolio/:id - Delete a portfolio
router.delete('/:id', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if user owns this portfolio
    const existing = await portfolioRepository.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const success = await portfolioRepository.delete(id);

    res.json({
      success,
      message: success ? 'Portfolio deleted successfully' : 'Failed to delete portfolio'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete portfolio'
    });
  }
});

// GET /api/portfolio/paper-trading - Get user's paper trading portfolio summary (legacy endpoint)
router.get('/paper-trading', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const groupId = req.query.groupId as string | undefined;

    // Get portfolio summary
    const summaryResult = await portfolioService.getPortfolioSummary(userId, groupId);

    if (!summaryResult.success) {
      return res.status(400).json({
        success: false,
        error: summaryResult.error
      });
    }

    // Get user positions for more detailed data
    const positionsResult = await portfolioService.getUserPositions(userId, {
      page: 1,
      limit: 100,
      status: 'OPEN'
    });

    // Format response to match frontend expectations
    const portfolioData = {
      id: `portfolio-${userId}`,
      name: 'Main Portfolio',
      totalValue: summaryResult.data?.totalValue || 0,
      totalReturn: summaryResult.data?.totalProfitLoss || 0,
      totalReturnPercentage: summaryResult.data?.profitLossPercentage || 0,
      dayChange: 0, // Would need to calculate from historical data
      dayChangePercentage: 0,
      initialBalance: 100000, // Default initial balance
      assets: positionsResult.success && positionsResult.data ?
        positionsResult.data.data.map(pos => ({
          id: pos.id,
          symbol: pos.symbol,
          name: pos.symbol,
          quantity: pos.quantity,
          averagePrice: pos.entryPrice,
          currentPrice: pos.currentPrice,
          value: pos.quantity * pos.currentPrice,
          costBasis: pos.quantity * pos.entryPrice,
          return: pos.profitLoss || 0,
          returnPercentage: pos.profitLossPercentage || 0,
          dayChange: 0,
          dayChangePercentage: 0,
          type: pos.assetType
        })) : [],
      riskMetrics: {
        volatility: 15,
        sharpeRatio: 1.2,
        beta: 1.0,
        maxDrawdown: -5
      },
      performance: {
        '1D': 0,
        '1W': 2,
        '1M': 5,
        '3M': 12,
        '6M': 18,
        '1Y': 25,
        'YTD': 20,
        'ALL': summaryResult.data?.profitLossPercentage || 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Return as array to match frontend expectations
    res.json({
      success: true,
      data: [portfolioData]
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch portfolio'
    });
  }
});

// GET /api/portfolio/history - Get portfolio history (placeholder for now)
router.get('/history', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const period = (req.query.period as string) || '30d';

    // Generate mock history data for now
    const days = parseInt(period) || 30;
    const history = [];
    const now = Date.now();
    const baseValue = 100000;

    for (let i = days; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const randomChange = (Math.random() - 0.48) * 0.02; // -1% to +1.2% daily change
      const value = baseValue * (1 + randomChange * (days - i));

      history.push({
        date: date.toISOString(),
        value: Math.round(value * 100) / 100,
        profit: Math.round((value - baseValue) * 100) / 100
      });
    }

    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch portfolio history'
    });
  }
});

// GET /api/portfolio/performance - Get performance metrics
router.get('/performance', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const groupId = req.query.groupId as string | undefined;
    const days = req.query.days ? parseInt(req.query.days as string) : undefined;

    const metricsResult = await portfolioService.getTradingMetrics(userId, groupId, days);

    if (!metricsResult.success) {
      return res.status(400).json({
        success: false,
        error: metricsResult.error
      });
    }

    const metrics = metricsResult.data!;

    // Format response to match frontend expectations
    const performance = {
      totalReturn: metrics.totalReturn || 0,
      annualizedReturn: (metrics.totalReturn || 0) * (365 / (days || 30)),
      sharpeRatio: metrics.sharpeRatio || 0,
      maxDrawdown: metrics.maxDrawdown || 0,
      winRate: metrics.winRate || 0,
      averageWin: metrics.averageWinAmount || 0,
      averageLoss: metrics.averageLossAmount || 0,
      profitFactor: metrics.profitFactor || 0,
      totalTrades: metrics.totalTrades || 0,
      winningTrades: metrics.winningTrades || 0,
      losingTrades: metrics.losingTrades || 0
    };

    res.json({
      success: true,
      data: performance
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch performance metrics'
    });
  }
});

// GET /api/portfolio/positions - Get all positions
router.get('/positions', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const status = req.query.status as 'OPEN' | 'CLOSED' | undefined;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const result = await portfolioService.getUserPositions(userId, {
      page,
      limit,
      status,
      orderBy: 'createdAt',
      orderDir: 'desc'
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Format positions to match frontend expectations
    const positions = result.data!.data.map(pos => ({
      id: pos.id,
      symbol: pos.symbol,
      type: pos.side || 'LONG',
      quantity: pos.quantity,
      entryPrice: pos.entryPrice,
      currentPrice: pos.currentPrice,
      stopLoss: pos.stopLoss,
      takeProfit: pos.takeProfit,
      profit: pos.profitLoss || 0,
      profitPercentage: pos.profitLossPercentage || 0,
      status: pos.status,
      createdAt: pos.createdAt,
      closedAt: pos.closedAt
    }));

    res.json({
      success: true,
      data: positions,
      pagination: result.data!.pagination
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch positions'
    });
  }
});

// POST /api/portfolio/positions/:id/close - Close a position
router.post('/positions/:id/close', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const closePrice = req.body.closePrice || req.body.currentPrice;

    if (!closePrice) {
      return res.status(400).json({
        success: false,
        error: 'Close price is required'
      });
    }

    const result = await portfolioService.closePosition(userId, id, closePrice);

    if (!result.success) {
      const statusCode = result.error === 'Position not found' ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to close position'
    });
  }
});

// PUT /api/portfolio/positions/:id - Update position
router.put('/positions/:id', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { stopLoss, takeProfit, currentPrice } = req.body;

    // Validate update data
    if (!stopLoss && !takeProfit && !currentPrice) {
      return res.status(400).json({
        success: false,
        error: 'Invalid update data'
      });
    }

    const updateData: any = {};
    if (stopLoss !== undefined) updateData.stopLoss = stopLoss;
    if (takeProfit !== undefined) updateData.takeProfit = takeProfit;
    if (currentPrice !== undefined) updateData.currentPrice = currentPrice;

    const result = await portfolioService.updatePosition(userId, id, updateData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update position'
    });
  }
});

// POST /api/portfolio/:id/assets - Add asset to portfolio
router.post('/:id/assets', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const portfolioId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if user owns this portfolio
    const portfolio = await portfolioRepository.findById(portfolioId);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    if (portfolio.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const {
      symbol,
      name,
      assetType,
      subcategory,
      quantity,
      averageCost,
      currentPrice,
      valuationMethod,
      description,
      customAttributes,
      notes
    } = req.body;

    // Validate required fields
    if (!name || !assetType || quantity <= 0 || averageCost <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Name, asset type, quantity, and average cost are required'
      });
    }

    // Calculate derived fields
    const totalCost = Number(quantity) * Number(averageCost);
    const marketValue = currentPrice ? Number(quantity) * Number(currentPrice) : totalCost;
    const unrealizedGain = marketValue - totalCost;
    const unrealizedGainPct = totalCost > 0 ? (unrealizedGain / totalCost) * 100 : 0;

    // Create the asset
    const asset = await prisma.portfolioAsset.create({
      data: {
        portfolioId,
        symbol: symbol || '',
        name,
        assetType,
        subcategory,
        quantity: Number(quantity),
        averageCost: Number(averageCost),
        currentPrice: currentPrice ? Number(currentPrice) : Number(averageCost),
        marketValue,
        totalCost,
        unrealizedGain,
        unrealizedGainPct,
        valuationMethod: valuationMethod || 'MARKET_PRICE',
        description,
        customAttributes: customAttributes || {},
        notes,
        lastValuationDate: new Date()
      }
    });

    // Update portfolio current value
    const assets = await prisma.portfolioAsset.findMany({
      where: { portfolioId }
    });

    const newCurrentValue = assets.reduce((sum, asset) => sum + Number(asset.marketValue || 0), 0);
    const totalReturn = newCurrentValue - Number(portfolio.initialBalance);
    const totalReturnPct = Number(portfolio.initialBalance) > 0 ? (totalReturn / Number(portfolio.initialBalance)) * 100 : 0;

    await portfolioRepository.update(portfolioId, {
      currentValue: newCurrentValue,
      totalReturn,
      totalReturnPct
    });

    res.status(201).json({
      success: true,
      data: asset
    });
  } catch (error: any) {
    console.error('Error adding asset:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add asset'
    });
  }
});

// GET /api/portfolio/:id/assets - Get portfolio assets
router.get('/:id/assets', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const portfolioId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if user owns this portfolio
    const portfolio = await portfolioRepository.findById(portfolioId);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    if (portfolio.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const assets = await prisma.portfolioAsset.findMany({
      where: { portfolioId },
      orderBy: { createdAt: 'desc' }
    });

    // Format assets for frontend
    const formattedAssets = assets.map(asset => ({
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      assetType: asset.assetType,
      subcategory: asset.subcategory,
      quantity: Number(asset.quantity),
      averagePrice: Number(asset.averageCost),
      currentPrice: Number(asset.currentPrice || 0),
      totalValue: Number(asset.marketValue || 0),
      totalCost: Number(asset.totalCost),
      unrealizedPnl: Number(asset.unrealizedGain || 0),
      percentageGain: Number(asset.unrealizedGainPct || 0),
      valuationMethod: asset.valuationMethod,
      description: asset.description,
      customAttributes: asset.customAttributes,
      notes: asset.notes,
      lastValuationDate: asset.lastValuationDate,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt
    }));

    res.json({
      success: true,
      data: formattedAssets
    });
  } catch (error: any) {
    console.error('Error fetching assets:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch assets'
    });
  }
});

// PUT /api/portfolio/:portfolioId/assets/:assetId - Update asset
router.put('/:portfolioId/assets/:assetId', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const { portfolioId, assetId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if user owns this portfolio
    const portfolio = await portfolioRepository.findById(portfolioId);
    if (!portfolio || portfolio.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const updateData = req.body;

    // Recalculate derived fields if quantity, cost, or price changed
    if (updateData.quantity || updateData.averageCost || updateData.currentPrice) {
      const asset = await prisma.portfolioAsset.findUnique({
        where: { id: assetId }
      });

      if (!asset) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      const quantity = updateData.quantity !== undefined ? Number(updateData.quantity) : Number(asset.quantity);
      const averageCost = updateData.averageCost !== undefined ? Number(updateData.averageCost) : Number(asset.averageCost);
      const currentPrice = updateData.currentPrice !== undefined ? Number(updateData.currentPrice) : Number(asset.currentPrice || asset.averageCost);

      const totalCost = quantity * averageCost;
      const marketValue = quantity * currentPrice;
      const unrealizedGain = marketValue - totalCost;
      const unrealizedGainPct = totalCost > 0 ? (unrealizedGain / totalCost) * 100 : 0;

      updateData.totalCost = totalCost;
      updateData.marketValue = marketValue;
      updateData.unrealizedGain = unrealizedGain;
      updateData.unrealizedGainPct = unrealizedGainPct;
      updateData.lastValuationDate = new Date();
    }

    const updatedAsset = await prisma.portfolioAsset.update({
      where: { id: assetId },
      data: updateData
    });

    res.json({
      success: true,
      data: updatedAsset
    });
  } catch (error: any) {
    console.error('Error updating asset:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update asset'
    });
  }
});

// DELETE /api/portfolio/:portfolioId/assets/:assetId - Delete asset
router.delete('/:portfolioId/assets/:assetId', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const { portfolioId, assetId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if user owns this portfolio
    const portfolio = await portfolioRepository.findById(portfolioId);
    if (!portfolio || portfolio.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await prisma.portfolioAsset.delete({
      where: { id: assetId }
    });

    // Update portfolio current value after deletion
    const assets = await prisma.portfolioAsset.findMany({
      where: { portfolioId }
    });

    const newCurrentValue = assets.reduce((sum, asset) => sum + Number(asset.marketValue || 0), 0);
    const totalReturn = newCurrentValue - Number(portfolio.initialBalance);
    const totalReturnPct = Number(portfolio.initialBalance) > 0 ? (totalReturn / Number(portfolio.initialBalance)) * 100 : 0;

    await portfolioRepository.update(portfolioId, {
      currentValue: newCurrentValue,
      totalReturn,
      totalReturnPct
    });

    res.json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting asset:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete asset'
    });
  }
});

export const portfolioRoutes = router;