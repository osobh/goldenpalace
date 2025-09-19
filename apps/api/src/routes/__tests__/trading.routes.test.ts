import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import supertest from 'supertest';
import { app } from '../../app';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { TradeIdeaService } from '../../services/tradeIdea.service';
import { PortfolioService } from '../../services/portfolio.service';
import { TradeExecutionService } from '../../services/tradeExecution.service';
import type { User, Group } from '@golden-palace/database';

describe('Trading Routes Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;
  let authService: AuthService;
  let groupService: GroupService;
  let tradeIdeaService: TradeIdeaService;
  let portfolioService: PortfolioService;
  let tradeExecutionService: TradeExecutionService;

  // Test data
  let testUser: User;
  let testGroup: Group;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    request = supertest(app);

    // Initialize services (these would normally be injected via DI)
    authService = new AuthService();
    groupService = new GroupService();
    tradeIdeaService = new TradeIdeaService();
    portfolioService = new PortfolioService();
    tradeExecutionService = new TradeExecutionService();
  });

  beforeEach(async () => {
    // Create test user and group for each test
    const userResult = await authService.register({
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });

    if (!userResult.success) {
      throw new Error('Failed to create test user');
    }

    testUser = userResult.data.user;
    accessToken = userResult.data.accessToken;
    refreshToken = userResult.data.refreshToken;

    // Create test group
    const groupResult = await groupService.createGroup(testUser.id, {
      name: `Test Trading Group ${Date.now()}`,
      description: 'Test group for trading features',
      groupType: 'PRIVATE',
    });

    if (!groupResult.success) {
      throw new Error('Failed to create test group');
    }

    testGroup = groupResult.data;
  });

  afterAll(async () => {
    // Cleanup would happen here in a real implementation
    // For now, we rely on test database cleanup
  });

  describe('POST /api/trading/ideas', () => {
    const validTradeIdea = {
      groupId: '',
      symbol: 'AAPL',
      assetType: 'STOCK',
      direction: 'LONG',
      entryPrice: 150.50,
      stopLoss: 145.00,
      takeProfit1: 160.00,
      takeProfit2: 165.00,
      timeframe: '1D',
      confidence: 4,
      rationale: 'Strong earnings report expected',
      tags: ['earnings', 'tech'],
    };

    it('should create a trade idea successfully', async () => {
      const tradeIdea = { ...validTradeIdea, groupId: testGroup.id };

      const response = await request
        .post('/api/trading/ideas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(tradeIdea)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          symbol: 'AAPL',
          assetType: 'STOCK',
          direction: 'LONG',
          entryPrice: 150.50,
          stopLoss: 145.00,
          takeProfit1: 160.00,
          status: 'ACTIVE',
          user: {
            id: testUser.id,
            username: testUser.username,
          },
          group: {
            id: testGroup.id,
            name: testGroup.name,
          },
        },
      });
    });

    it('should return 401 without authentication', async () => {
      const tradeIdea = { ...validTradeIdea, groupId: testGroup.id };

      await request
        .post('/api/trading/ideas')
        .send(tradeIdea)
        .expect(401);
    });

    it('should return 400 for invalid input', async () => {
      const invalidTradeIdea = {
        ...validTradeIdea,
        groupId: testGroup.id,
        entryPrice: -10, // Invalid negative price
      };

      const response = await request
        .post('/api/trading/ideas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidTradeIdea)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Entry price must be positive');
    });

    it('should return 403 for non-member trying to post to group', async () => {
      // Create another user
      const otherUserResult = await authService.register({
        username: `otheruser_${Date.now()}`,
        email: `other_${Date.now()}@example.com`,
        password: 'TestPassword123!',
      });

      const otherToken = otherUserResult.data.accessToken;
      const tradeIdea = { ...validTradeIdea, groupId: testGroup.id };

      const response = await request
        .post('/api/trading/ideas')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(tradeIdea)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You are not a member of this group');
    });

    it('should validate stop loss levels correctly', async () => {
      const invalidStopLoss = {
        ...validTradeIdea,
        groupId: testGroup.id,
        stopLoss: 155.00, // Above entry for long position
      };

      const response = await request
        .post('/api/trading/ideas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidStopLoss)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Stop loss must be below entry price for long positions');
    });
  });

  describe('GET /api/trading/ideas/:id', () => {
    let createdTradeIdea: any;

    beforeEach(async () => {
      const tradeIdea = {
        groupId: testGroup.id,
        symbol: 'AAPL',
        assetType: 'STOCK',
        direction: 'LONG',
        entryPrice: 150.50,
        stopLoss: 145.00,
        takeProfit1: 160.00,
        confidence: 4,
        rationale: 'Test trade idea',
      };

      const response = await request
        .post('/api/trading/ideas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(tradeIdea);

      createdTradeIdea = response.body.data;
    });

    it('should get trade idea by id', async () => {
      const response = await request
        .get(`/api/trading/ideas/${createdTradeIdea.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: createdTradeIdea.id,
          symbol: 'AAPL',
          direction: 'LONG',
          entryPrice: 150.50,
          status: 'ACTIVE',
        },
      });
    });

    it('should return 404 for non-existent trade idea', async () => {
      await request
        .get('/api/trading/ideas/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request
        .get(`/api/trading/ideas/${createdTradeIdea.id}`)
        .expect(401);
    });
  });

  describe('GET /api/trading/groups/:groupId/ideas', () => {
    beforeEach(async () => {
      // Create multiple trade ideas for testing pagination
      const tradeIdeas = [
        {
          groupId: testGroup.id,
          symbol: 'AAPL',
          direction: 'LONG',
          entryPrice: 150.50,
        },
        {
          groupId: testGroup.id,
          symbol: 'TSLA',
          direction: 'SHORT',
          entryPrice: 225.75,
        },
        {
          groupId: testGroup.id,
          symbol: 'MSFT',
          direction: 'LONG',
          entryPrice: 315.25,
        },
      ];

      for (const idea of tradeIdeas) {
        await request
          .post('/api/trading/ideas')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(idea);
      }
    });

    it('should get paginated trade ideas for group', async () => {
      const response = await request
        .get(`/api/trading/groups/${testGroup.id}/ideas`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          data: expect.any(Array),
          total: expect.any(Number),
          page: 1,
          limit: 2,
          totalPages: expect.any(Number),
          hasNext: expect.any(Boolean),
          hasPrev: false,
        },
      });

      expect(response.body.data.data).toHaveLength(2);
    });

    it('should filter trade ideas by symbol', async () => {
      const response = await request
        .get(`/api/trading/groups/${testGroup.id}/ideas`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ symbol: 'AAPL' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].symbol).toBe('AAPL');
    });

    it('should filter trade ideas by direction', async () => {
      const response = await request
        .get(`/api/trading/groups/${testGroup.id}/ideas`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ direction: 'LONG' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2); // AAPL and MSFT are LONG
    });

    it('should return 403 for non-member access', async () => {
      const otherUserResult = await authService.register({
        username: `otheruser_${Date.now()}`,
        email: `other_${Date.now()}@example.com`,
        password: 'TestPassword123!',
      });

      const otherToken = otherUserResult.data.accessToken;

      await request
        .get(`/api/trading/groups/${testGroup.id}/ideas`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/trading/ideas/:id', () => {
    let createdTradeIdea: any;

    beforeEach(async () => {
      const tradeIdea = {
        groupId: testGroup.id,
        symbol: 'AAPL',
        direction: 'LONG',
        entryPrice: 150.50,
        stopLoss: 145.00,
        takeProfit1: 160.00,
        confidence: 4,
      };

      const response = await request
        .post('/api/trading/ideas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(tradeIdea);

      createdTradeIdea = response.body.data;
    });

    it('should update trade idea successfully', async () => {
      const updateData = {
        stopLoss: 148.00,
        takeProfit1: 158.00,
        confidence: 3,
        rationale: 'Updated based on market conditions',
      };

      const response = await request
        .put(`/api/trading/ideas/${createdTradeIdea.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: createdTradeIdea.id,
          stopLoss: 148.00,
          takeProfit1: 158.00,
          confidence: 3,
          rationale: 'Updated based on market conditions',
        },
      });
    });

    it('should return 403 for non-owner update attempt', async () => {
      const otherUserResult = await authService.register({
        username: `otheruser_${Date.now()}`,
        email: `other_${Date.now()}@example.com`,
        password: 'TestPassword123!',
      });

      const otherToken = otherUserResult.data.accessToken;

      // Add other user to group first
      await groupService.addMember(testGroup.id, testUser.id, {
        userId: otherUserResult.data.user.id,
        role: 'MEMBER',
      });

      const updateData = { stopLoss: 148.00 };

      await request
        .put(`/api/trading/ideas/${createdTradeIdea.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        confidence: 6, // Invalid confidence > 5
      };

      const response = await request
        .put(`/api/trading/ideas/${createdTradeIdea.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Confidence must be between 1 and 5');
    });
  });

  describe('POST /api/trading/ideas/:id/close', () => {
    let createdTradeIdea: any;

    beforeEach(async () => {
      const tradeIdea = {
        groupId: testGroup.id,
        symbol: 'AAPL',
        direction: 'LONG',
        entryPrice: 150.50,
        stopLoss: 145.00,
        takeProfit1: 160.00,
      };

      const response = await request
        .post('/api/trading/ideas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(tradeIdea);

      createdTradeIdea = response.body.data;
    });

    it('should close trade idea successfully', async () => {
      const closeData = { closedPrice: 155.50 };

      const response = await request
        .post(`/api/trading/ideas/${createdTradeIdea.id}/close`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(closeData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: createdTradeIdea.id,
          status: 'CLOSED',
          closedPrice: 155.50,
          pnl: 5.00, // 155.50 - 150.50
          closedAt: expect.any(String),
        },
      });
    });

    it('should validate closed price', async () => {
      const invalidCloseData = { closedPrice: -10 };

      const response = await request
        .post(`/api/trading/ideas/${createdTradeIdea.id}/close`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidCloseData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Closed price must be positive');
    });
  });

  describe('DELETE /api/trading/ideas/:id', () => {
    let createdTradeIdea: any;

    beforeEach(async () => {
      const tradeIdea = {
        groupId: testGroup.id,
        symbol: 'AAPL',
        direction: 'LONG',
        entryPrice: 150.50,
      };

      const response = await request
        .post('/api/trading/ideas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(tradeIdea);

      createdTradeIdea = response.body.data;
    });

    it('should delete trade idea successfully', async () => {
      await request
        .delete(`/api/trading/ideas/${createdTradeIdea.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify it's deleted
      await request
        .get(`/api/trading/ideas/${createdTradeIdea.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 403 for non-owner delete attempt', async () => {
      const otherUserResult = await authService.register({
        username: `otheruser_${Date.now()}`,
        email: `other_${Date.now()}@example.com`,
        password: 'TestPassword123!',
      });

      const otherToken = otherUserResult.data.accessToken;

      await request
        .delete(`/api/trading/ideas/${createdTradeIdea.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('POST /api/trading/positions', () => {
    const validPosition = {
      groupId: '',
      symbol: 'AAPL',
      assetType: 'STOCK',
      quantity: 100,
      entryPrice: 150.50,
      stopLoss: 145.00,
      takeProfit: 160.00,
    };

    it('should create paper position successfully', async () => {
      const position = { ...validPosition, groupId: testGroup.id };

      const response = await request
        .post('/api/trading/positions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(position)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          symbol: 'AAPL',
          assetType: 'STOCK',
          quantity: 100,
          entryPrice: 150.50,
          currentPrice: 150.50,
          status: 'OPEN',
          user: {
            id: testUser.id,
            username: testUser.username,
          },
        },
      });
    });

    it('should validate position input', async () => {
      const invalidPosition = {
        ...validPosition,
        groupId: testGroup.id,
        quantity: -10, // Invalid negative quantity
      };

      const response = await request
        .post('/api/trading/positions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidPosition)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Quantity must be positive');
    });
  });

  describe('GET /api/trading/positions/:id', () => {
    let createdPosition: any;

    beforeEach(async () => {
      const position = {
        groupId: testGroup.id,
        symbol: 'AAPL',
        assetType: 'STOCK',
        quantity: 100,
        entryPrice: 150.50,
      };

      const response = await request
        .post('/api/trading/positions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(position);

      createdPosition = response.body.data;
    });

    it('should get position by id', async () => {
      const response = await request
        .get(`/api/trading/positions/${createdPosition.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: createdPosition.id,
          symbol: 'AAPL',
          quantity: 100,
          status: 'OPEN',
        },
      });
    });

    it('should return 404 for non-existent position', async () => {
      await request
        .get('/api/trading/positions/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /api/trading/portfolio/summary', () => {
    beforeEach(async () => {
      // Create some positions for portfolio summary
      const positions = [
        {
          groupId: testGroup.id,
          symbol: 'AAPL',
          assetType: 'STOCK',
          quantity: 100,
          entryPrice: 150.50,
        },
        {
          groupId: testGroup.id,
          symbol: 'TSLA',
          assetType: 'STOCK',
          quantity: 50,
          entryPrice: 225.75,
        },
      ];

      for (const position of positions) {
        await request
          .post('/api/trading/positions')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(position);
      }
    });

    it('should get portfolio summary', async () => {
      const response = await request
        .get('/api/trading/portfolio/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ groupId: testGroup.id })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          totalValue: expect.any(Number),
          totalPnl: expect.any(Number),
          openPositions: expect.any(Number),
          closedPositions: expect.any(Number),
          buyingPower: expect.any(Number),
        },
      });
    });

    it('should require groupId parameter', async () => {
      await request
        .get('/api/trading/portfolio/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('POST /api/trading/positions/:id/close', () => {
    let createdPosition: any;

    beforeEach(async () => {
      const position = {
        groupId: testGroup.id,
        symbol: 'AAPL',
        assetType: 'STOCK',
        quantity: 100,
        entryPrice: 150.50,
      };

      const response = await request
        .post('/api/trading/positions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(position);

      createdPosition = response.body.data;
    });

    it('should close position successfully', async () => {
      const closeData = {
        closePrice: 155.50,
        closeReason: 'Manual close',
      };

      const response = await request
        .post(`/api/trading/positions/${createdPosition.id}/close`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(closeData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: createdPosition.id,
          status: 'CLOSED',
          closedPrice: 155.50,
          closeReason: 'Manual close',
          pnl: expect.any(Number),
          closedAt: expect.any(String),
        },
      });
    });

    it('should validate close price', async () => {
      const invalidCloseData = { closePrice: -10 };

      const response = await request
        .post(`/api/trading/positions/${createdPosition.id}/close`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidCloseData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Close price must be positive');
    });
  });

  describe('POST /api/trading/market-update', () => {
    beforeEach(async () => {
      // Create some positions and trade ideas for market update testing
      await request
        .post('/api/trading/positions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          groupId: testGroup.id,
          symbol: 'AAPL',
          assetType: 'STOCK',
          quantity: 100,
          entryPrice: 150.50,
          stopLoss: 145.00,
          takeProfit: 160.00,
        });
    });

    it('should process market update successfully', async () => {
      const marketData = {
        quotes: [
          {
            symbol: 'AAPL',
            price: 155.50,
            change: 5.00,
            changePercent: 3.32,
            volume: 1500000,
            high: 156.75,
            low: 150.25,
            open: 151.00,
            previousClose: 150.50,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response = await request
        .post('/api/trading/market-update')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(marketData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          positionsUpdated: expect.any(Number),
          positionsClosed: expect.any(Number),
          alertsTriggered: expect.any(Number),
          tradesExecuted: expect.any(Number),
        },
      });
    });

    it('should require valid market quote format', async () => {
      const invalidMarketData = {
        quotes: [
          {
            symbol: 'AAPL',
            price: -10, // Invalid negative price
          },
        ],
      };

      await request
        .post('/api/trading/market-update')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidMarketData)
        .expect(400);
    });

    it('should require authentication', async () => {
      const marketData = {
        quotes: [
          {
            symbol: 'AAPL',
            price: 155.50,
            change: 5.00,
            changePercent: 3.32,
            volume: 1500000,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      await request
        .post('/api/trading/market-update')
        .send(marketData)
        .expect(401);
    });
  });

  describe('GET /api/trading/groups/:groupId/performance', () => {
    beforeEach(async () => {
      // Create and close some trade ideas for performance metrics
      const tradeIdea = {
        groupId: testGroup.id,
        symbol: 'AAPL',
        direction: 'LONG',
        entryPrice: 150.50,
      };

      const response = await request
        .post('/api/trading/ideas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(tradeIdea);

      // Close the trade idea
      await request
        .post(`/api/trading/ideas/${response.body.data.id}/close`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ closedPrice: 155.50 });
    });

    it('should get performance statistics', async () => {
      const response = await request
        .get(`/api/trading/groups/${testGroup.id}/performance`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          totalIdeas: expect.any(Number),
          activeIdeas: expect.any(Number),
          closedIdeas: expect.any(Number),
          winningIdeas: expect.any(Number),
          losingIdeas: expect.any(Number),
          winRate: expect.any(Number),
          totalPnl: expect.any(Number),
          avgWin: expect.any(Number),
          avgLoss: expect.any(Number),
        },
      });
    });

    it('should return 403 for non-member access', async () => {
      const otherUserResult = await authService.register({
        username: `otheruser_${Date.now()}`,
        email: `other_${Date.now()}@example.com`,
        password: 'TestPassword123!',
      });

      const otherToken = otherUserResult.data.accessToken;

      await request
        .get(`/api/trading/groups/${testGroup.id}/performance`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });
});