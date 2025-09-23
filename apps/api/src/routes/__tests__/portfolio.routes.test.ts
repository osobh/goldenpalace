import request from 'supertest';
import { app } from '../../app';
import { PortfolioService } from '../../services/portfolio.service';
import { AuthService } from '../../services/auth.service';
import jwt from 'jsonwebtoken';

jest.mock('../../services/portfolio.service');
jest.mock('../../services/auth.service');

describe('Portfolio Routes', () => {
  let mockPortfolioService: jest.Mocked<PortfolioService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let validToken: string;
  const userId = 'test-user-id';

  beforeEach(() => {
    mockPortfolioService = new PortfolioService() as jest.Mocked<PortfolioService>;
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;

    // Create a valid JWT token for testing
    validToken = jwt.sign(
      { userId, email: 'test@example.com' },
      process.env['JWT_ACCESS_SECRET'] || 'test-secret',
      { expiresIn: '1h' }
    );

    // Mock auth middleware to verify token
    (AuthService as jest.Mock).mockReturnValue(mockAuthService);
    mockAuthService.verifyToken = jest.fn().mockResolvedValue({
      userId,
      email: 'test@example.com'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/portfolio', () => {
    it('should return portfolio data for authenticated user', async () => {
      const mockPortfolio = {
        totalValue: 10000,
        totalProfit: 500,
        profitPercentage: 5,
        dayChange: 100,
        dayChangePercentage: 1,
        positions: [
          {
            id: 'pos1',
            symbol: 'BTC/USD',
            quantity: 0.5,
            averagePrice: 50000,
            currentPrice: 51000,
            value: 25500,
            profit: 500,
            profitPercentage: 2
          }
        ]
      };

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);

      const response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockPortfolio
      });
      expect(mockPortfolioService.getPortfolio).toHaveBeenCalledWith(userId);
    });

    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .get('/api/portfolio')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'No token provided'
      });
    });

    it('should return 401 if token is invalid', async () => {
      mockAuthService.verifyToken = jest.fn().mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired token'
      });
    });
  });

  describe('GET /api/portfolio/history', () => {
    it('should return portfolio history for authenticated user', async () => {
      const mockHistory = [
        {
          date: '2024-01-01',
          value: 10000,
          profit: 500
        },
        {
          date: '2024-01-02',
          value: 10100,
          profit: 600
        }
      ];

      mockPortfolioService.getPortfolioHistory = jest.fn().mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/portfolio/history')
        .query({ period: '7d' })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockHistory
      });
      expect(mockPortfolioService.getPortfolioHistory).toHaveBeenCalledWith(userId, '7d');
    });

    it('should use default period if not specified', async () => {
      mockPortfolioService.getPortfolioHistory = jest.fn().mockResolvedValue([]);

      await request(app)
        .get('/api/portfolio/history')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(mockPortfolioService.getPortfolioHistory).toHaveBeenCalledWith(userId, '30d');
    });
  });

  describe('GET /api/portfolio/performance', () => {
    it('should return portfolio performance metrics', async () => {
      const mockPerformance = {
        totalReturn: 15.5,
        annualizedReturn: 18.2,
        sharpeRatio: 1.5,
        maxDrawdown: -10.2,
        winRate: 65,
        averageWin: 250,
        averageLoss: -150,
        profitFactor: 1.8
      };

      mockPortfolioService.getPerformanceMetrics = jest.fn().mockResolvedValue(mockPerformance);

      const response = await request(app)
        .get('/api/portfolio/performance')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockPerformance
      });
      expect(mockPortfolioService.getPerformanceMetrics).toHaveBeenCalledWith(userId);
    });
  });

  describe('GET /api/portfolio/positions', () => {
    it('should return all positions for authenticated user', async () => {
      const mockPositions = [
        {
          id: 'pos1',
          symbol: 'BTC/USD',
          type: 'LONG',
          quantity: 0.5,
          entryPrice: 50000,
          currentPrice: 51000,
          stopLoss: 49000,
          takeProfit: 52000,
          profit: 500,
          profitPercentage: 2,
          status: 'OPEN'
        },
        {
          id: 'pos2',
          symbol: 'ETH/USD',
          type: 'LONG',
          quantity: 10,
          entryPrice: 3000,
          currentPrice: 3100,
          stopLoss: 2900,
          takeProfit: 3200,
          profit: 1000,
          profitPercentage: 3.33,
          status: 'OPEN'
        }
      ];

      mockPortfolioService.getPositions = jest.fn().mockResolvedValue(mockPositions);

      const response = await request(app)
        .get('/api/portfolio/positions')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockPositions
      });
      expect(mockPortfolioService.getPositions).toHaveBeenCalledWith(userId, 'OPEN');
    });

    it('should filter positions by status', async () => {
      mockPortfolioService.getPositions = jest.fn().mockResolvedValue([]);

      await request(app)
        .get('/api/portfolio/positions')
        .query({ status: 'CLOSED' })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(mockPortfolioService.getPositions).toHaveBeenCalledWith(userId, 'CLOSED');
    });
  });

  describe('POST /api/portfolio/positions/:id/close', () => {
    it('should close a position', async () => {
      const positionId = 'pos1';
      const mockClosedPosition = {
        id: positionId,
        symbol: 'BTC/USD',
        status: 'CLOSED',
        closePrice: 51000,
        closeTime: new Date().toISOString(),
        realizedProfit: 500
      };

      mockPortfolioService.closePosition = jest.fn().mockResolvedValue(mockClosedPosition);

      const response = await request(app)
        .post(`/api/portfolio/positions/${positionId}/close`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockClosedPosition
      });
      expect(mockPortfolioService.closePosition).toHaveBeenCalledWith(userId, positionId);
    });

    it('should return 404 if position not found', async () => {
      const error = new Error('Position not found');
      (error as any).statusCode = 404;
      mockPortfolioService.closePosition = jest.fn().mockRejectedValue(error);

      const response = await request(app)
        .post('/api/portfolio/positions/invalid-id/close')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Position not found'
      });
    });
  });

  describe('PUT /api/portfolio/positions/:id', () => {
    it('should update position stop loss and take profit', async () => {
      const positionId = 'pos1';
      const updateData = {
        stopLoss: 49500,
        takeProfit: 52500
      };

      const mockUpdatedPosition = {
        id: positionId,
        symbol: 'BTC/USD',
        stopLoss: 49500,
        takeProfit: 52500
      };

      mockPortfolioService.updatePosition = jest.fn().mockResolvedValue(mockUpdatedPosition);

      const response = await request(app)
        .put(`/api/portfolio/positions/${positionId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedPosition
      });
      expect(mockPortfolioService.updatePosition).toHaveBeenCalledWith(userId, positionId, updateData);
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put('/api/portfolio/positions/pos1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ invalidField: 'value' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid update data'
      });
    });
  });
});