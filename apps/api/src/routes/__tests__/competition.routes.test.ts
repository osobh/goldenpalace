import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import supertest from 'supertest';
import { app } from '../../app';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { CompetitionService } from '../../services/competition.service';
import { PaperPositionRepository } from '../../repositories/paperPosition.repository';
import { database } from '@golden-palace/database';
import type { User, Group, Competition, CompetitionEntry } from '@golden-palace/database';

describe('Competition Routes Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;
  let authService: AuthService;
  let groupService: GroupService;
  let competitionService: CompetitionService;
  let paperPositionRepository: PaperPositionRepository;

  // Test data
  let testUser: User;
  let testGroup: Group;
  let accessToken: string;
  let refreshToken: string;
  let testCompetition: Competition;

  beforeAll(async () => {
    request = supertest(app);

    // Initialize services
    authService = new AuthService();
    groupService = new GroupService();
    competitionService = new CompetitionService();
    paperPositionRepository = new PaperPositionRepository(database);
  });

  beforeEach(async () => {
    // Create test user
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
      name: `Test Competition Group ${Date.now()}`,
      description: 'Test group for competitions',
      groupType: 'PRIVATE',
    });

    if (!groupResult.success) {
      throw new Error('Failed to create test group');
    }

    testGroup = groupResult.data;
  });

  afterAll(async () => {
    // Cleanup would happen here
  });

  describe('POST /api/competitions', () => {
    const validCompetition = {
      groupId: '',
      name: 'Weekly Trading Championship',
      description: 'Test your skills in our weekly competition',
      type: 'WEEKLY_PNL',
      startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      endDate: new Date(Date.now() + 86400000 * 8).toISOString(), // Next week
      entryFee: 100,
      prizePool: 5000,
      prizeDistribution: [
        { rank: 1, percentage: 50 },
        { rank: 2, percentage: 30 },
        { rank: 3, percentage: 20 },
      ],
      minTrades: 5,
    };

    it('should create a competition successfully', async () => {
      const competition = { ...validCompetition, groupId: testGroup.id };

      const response = await request
        .post('/api/competitions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(competition)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          name: 'Weekly Trading Championship',
          type: 'WEEKLY_PNL',
          status: 'PENDING',
          prizePool: 5000,
          createdBy: testUser.id,
          group: {
            id: testGroup.id,
            name: testGroup.name,
          },
        },
      });

      testCompetition = response.body.data;
    });

    it('should return 401 without authentication', async () => {
      const competition = { ...validCompetition, groupId: testGroup.id };

      await request
        .post('/api/competitions')
        .send(competition)
        .expect(401);
    });

    it('should return 400 for invalid input', async () => {
      const invalidCompetition = {
        ...validCompetition,
        groupId: testGroup.id,
        startDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday (invalid)
      };

      const response = await request
        .post('/api/competitions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidCompetition)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Start date must be in the future');
    });

    it('should return 403 for non-admin creating competition', async () => {
      // Create another user
      const otherUserResult = await authService.register({
        username: `otheruser_${Date.now()}`,
        email: `other_${Date.now()}@example.com`,
        password: 'TestPassword123!',
      });

      // Add them as regular member
      await groupService.addMember(testGroup.id, testUser.id, {
        userId: otherUserResult.data.user.id,
        role: 'MEMBER',
      });

      const otherToken = otherUserResult.data.accessToken;
      const competition = { ...validCompetition, groupId: testGroup.id };

      const response = await request
        .post('/api/competitions')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(competition)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You do not have permission to create competitions in this group');
    });

    it('should validate prize distribution totals 100%', async () => {
      const invalidCompetition = {
        ...validCompetition,
        groupId: testGroup.id,
        prizeDistribution: [
          { rank: 1, percentage: 50 },
          { rank: 2, percentage: 30 },
          { rank: 3, percentage: 10 }, // Total = 90%
        ],
      };

      const response = await request
        .post('/api/competitions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidCompetition)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Prize distribution must total 100%');
    });
  });

  describe('GET /api/competitions/:id', () => {
    beforeEach(async () => {
      // Create a test competition
      const competition = {
        groupId: testGroup.id,
        name: 'Test Competition',
        type: 'WEEKLY_PNL',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 8).toISOString(),
        minTrades: 5,
      };

      const response = await request
        .post('/api/competitions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(competition);

      testCompetition = response.body.data;
    });

    it('should get competition by id', async () => {
      const response = await request
        .get(`/api/competitions/${testCompetition.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: testCompetition.id,
          name: 'Test Competition',
          type: 'WEEKLY_PNL',
          status: 'PENDING',
        },
      });
    });

    it('should return 404 for non-existent competition', async () => {
      await request
        .get('/api/competitions/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request
        .get(`/api/competitions/${testCompetition.id}`)
        .expect(401);
    });
  });

  describe('POST /api/competitions/:id/join', () => {
    beforeEach(async () => {
      // Create a test competition
      const competition = {
        groupId: testGroup.id,
        name: 'Joinable Competition',
        type: 'WEEKLY_PNL',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 8).toISOString(),
        entryFee: 100,
        prizePool: 5000,
        minTrades: 5,
      };

      const response = await request
        .post('/api/competitions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(competition);

      testCompetition = response.body.data;
    });

    it('should join competition successfully', async () => {
      const response = await request
        .post(`/api/competitions/${testCompetition.id}/join`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ startingBalance: 10000 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          competitionId: testCompetition.id,
          userId: testUser.id,
          startingBalance: 10000,
          totalTrades: 0,
          winningTrades: 0,
          roi: 0,
        },
      });
    });

    it('should return error if already joined', async () => {
      // Join once
      await request
        .post(`/api/competitions/${testCompetition.id}/join`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ startingBalance: 10000 });

      // Try to join again
      const response = await request
        .post(`/api/competitions/${testCompetition.id}/join`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ startingBalance: 10000 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You have already joined this competition');
    });

    it('should return error if not group member', async () => {
      // Create another user not in the group
      const otherUserResult = await authService.register({
        username: `outsider_${Date.now()}`,
        email: `outsider_${Date.now()}@example.com`,
        password: 'TestPassword123!',
      });

      const otherToken = otherUserResult.data.accessToken;

      const response = await request
        .post(`/api/competitions/${testCompetition.id}/join`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ startingBalance: 10000 })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You must be a member of the group to join this competition');
    });
  });

  describe('GET /api/competitions/:id/leaderboard', () => {
    let activeCompetition: any;

    beforeEach(async () => {
      // Create and start a competition
      const competition = {
        groupId: testGroup.id,
        name: 'Active Competition',
        type: 'WEEKLY_PNL',
        startDate: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        prizePool: 5000,
        minTrades: 5,
      };

      const response = await request
        .post('/api/competitions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(competition);

      activeCompetition = response.body.data;

      // Join the competition
      await request
        .post(`/api/competitions/${activeCompetition.id}/join`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ startingBalance: 10000 });

      // Create some trades for scoring
      await paperPositionRepository.create({
        userId: testUser.id,
        groupId: testGroup.id,
        symbol: 'AAPL',
        assetType: 'STOCK',
        quantity: 100,
        entryPrice: 150,
        currentPrice: 155,
      });
    });

    it('should get competition leaderboard', async () => {
      const response = await request
        .get(`/api/competitions/${activeCompetition.id}/leaderboard`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            rank: expect.any(Number),
            userId: expect.any(String),
            username: expect.any(String),
            totalTrades: expect.any(Number),
            roi: expect.any(Number),
          }),
        ]),
      });
    });

    it('should return 404 for non-existent competition', async () => {
      await request
        .get('/api/competitions/non-existent/leaderboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/competitions/:id', () => {
    beforeEach(async () => {
      // Create a test competition
      const competition = {
        groupId: testGroup.id,
        name: 'Editable Competition',
        type: 'WEEKLY_PNL',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 8).toISOString(),
        prizePool: 5000,
        minTrades: 5,
      };

      const response = await request
        .post('/api/competitions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(competition);

      testCompetition = response.body.data;
    });

    it('should update competition successfully', async () => {
      const updateData = {
        name: 'Updated Competition Name',
        description: 'New description',
        prizePool: 7500,
      };

      const response = await request
        .put(`/api/competitions/${testCompetition.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: testCompetition.id,
          name: 'Updated Competition Name',
          description: 'New description',
          prizePool: 7500,
        },
      });
    });

    it('should return 403 for non-creator update', async () => {
      // Create another user
      const otherUserResult = await authService.register({
        username: `otheruser_${Date.now()}`,
        email: `other_${Date.now()}@example.com`,
        password: 'TestPassword123!',
      });

      // Add them as member
      await groupService.addMember(testGroup.id, testUser.id, {
        userId: otherUserResult.data.user.id,
        role: 'MEMBER',
      });

      const otherToken = otherUserResult.data.accessToken;
      const updateData = { name: 'Unauthorized Update' };

      const response = await request
        .put(`/api/competitions/${testCompetition.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You do not have permission to update this competition');
    });

    it('should not allow update after competition starts', async () => {
      // Create a started competition
      const startedCompetition = {
        groupId: testGroup.id,
        name: 'Started Competition',
        type: 'WEEKLY_PNL',
        startDate: new Date(Date.now() - 3600000).toISOString(), // Started 1 hour ago
        endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        minTrades: 5,
      };

      const createResponse = await request
        .post('/api/competitions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(startedCompetition);

      const started = createResponse.body.data;

      const response = await request
        .put(`/api/competitions/${started.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Cannot Update' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot update competition after it has started');
    });
  });

  describe('POST /api/competitions/:id/end', () => {
    let activeCompetition: any;

    beforeEach(async () => {
      // Create an active competition
      const competition = {
        groupId: testGroup.id,
        name: 'Competition to End',
        type: 'WEEKLY_PNL',
        startDate: new Date(Date.now() - 86400000 * 7).toISOString(), // Started a week ago
        endDate: new Date(Date.now() - 3600000).toISOString(), // Ended 1 hour ago
        prizePool: 5000,
        prizeDistribution: [
          { rank: 1, percentage: 50 },
          { rank: 2, percentage: 30 },
          { rank: 3, percentage: 20 },
        ],
        minTrades: 5,
      };

      const response = await request
        .post('/api/competitions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(competition);

      activeCompetition = response.body.data;
    });

    it('should end competition successfully', async () => {
      const response = await request
        .post(`/api/competitions/${activeCompetition.id}/end`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: true,
      });
    });

    it('should return 403 for non-admin ending competition', async () => {
      // Create another user
      const otherUserResult = await authService.register({
        username: `member_${Date.now()}`,
        email: `member_${Date.now()}@example.com`,
        password: 'TestPassword123!',
      });

      // Add them as member
      await groupService.addMember(testGroup.id, testUser.id, {
        userId: otherUserResult.data.user.id,
        role: 'MEMBER',
      });

      const otherToken = otherUserResult.data.accessToken;

      const response = await request
        .post(`/api/competitions/${activeCompetition.id}/end`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You do not have permission to end this competition');
    });
  });

  describe('GET /api/competitions', () => {
    beforeEach(async () => {
      // Create multiple competitions
      const competitions = [
        {
          groupId: testGroup.id,
          name: 'Competition 1',
          type: 'WEEKLY_PNL',
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 8).toISOString(),
          prizePool: 1000,
          minTrades: 5,
        },
        {
          groupId: testGroup.id,
          name: 'Competition 2',
          type: 'MONTHLY_ROI',
          startDate: new Date(Date.now() + 86400000 * 2).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 32).toISOString(),
          prizePool: 5000,
          minTrades: 10,
        },
        {
          groupId: testGroup.id,
          name: 'Competition 3',
          type: 'BEST_TRADE',
          startDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 10).toISOString(),
          prizePool: 2500,
          minTrades: 3,
        },
      ];

      for (const comp of competitions) {
        await request
          .post('/api/competitions')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(comp);
      }
    });

    it('should get paginated competitions', async () => {
      const response = await request
        .get('/api/competitions')
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

    it('should filter competitions by type', async () => {
      const response = await request
        .get('/api/competitions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'MONTHLY_ROI' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].type).toBe('MONTHLY_ROI');
    });

    it('should filter competitions by group', async () => {
      const response = await request
        .get('/api/competitions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ groupId: testGroup.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.every((c: any) => c.groupId === testGroup.id)).toBe(true);
    });

    it('should sort competitions by prize pool', async () => {
      const response = await request
        .get('/api/competitions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ sortBy: 'prizePool', sortOrder: 'desc' })
        .expect(200);

      expect(response.body.success).toBe(true);
      const prizes = response.body.data.data.map((c: any) => c.prizePool);
      expect(prizes).toEqual([...prizes].sort((a, b) => b - a));
    });
  });

  describe('GET /api/competitions/stats', () => {
    beforeEach(async () => {
      // Create some competitions for stats
      const competitions = [
        {
          groupId: testGroup.id,
          name: 'Stats Competition 1',
          type: 'WEEKLY_PNL',
          startDate: new Date(Date.now() - 86400000 * 14).toISOString(),
          endDate: new Date(Date.now() - 86400000 * 7).toISOString(),
          prizePool: 5000,
          minTrades: 5,
        },
        {
          groupId: testGroup.id,
          name: 'Stats Competition 2',
          type: 'MONTHLY_ROI',
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 31).toISOString(),
          prizePool: 10000,
          minTrades: 10,
        },
      ];

      for (const comp of competitions) {
        await request
          .post('/api/competitions')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(comp);
      }
    });

    it('should get competition statistics', async () => {
      const response = await request
        .get('/api/competitions/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ groupId: testGroup.id })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          totalCompetitions: expect.any(Number),
          activeCompetitions: expect.any(Number),
          completedCompetitions: expect.any(Number),
          totalPrizePool: expect.any(Number),
          totalParticipants: expect.any(Number),
          avgParticipantsPerCompetition: expect.any(Number),
        },
      });
    });
  });

  describe('GET /api/competitions/user/:userId/stats', () => {
    it('should get user competition statistics', async () => {
      const response = await request
        .get(`/api/competitions/user/${testUser.id}/stats`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          totalCompetitions: expect.any(Number),
          wins: expect.any(Number),
          topThreeFinishes: expect.any(Number),
          totalPrizeWon: expect.any(Number),
          avgRoi: expect.any(Number),
          bestRoi: expect.any(Number),
          worstRoi: expect.any(Number),
          currentStreak: expect.any(Number),
          longestStreak: expect.any(Number),
        },
      });
    });

    it('should return 401 without authentication', async () => {
      await request
        .get(`/api/competitions/user/${testUser.id}/stats`)
        .expect(401);
    });
  });
});