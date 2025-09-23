import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@golden-palace/database';
import { PaperPositionRepository } from '../paperPosition.repository';
import type { CreatePaperPositionData } from '../paperPosition.repository';

describe('PaperPositionRepository', () => {
  let prisma: PrismaClient;
  let repository: PaperPositionRepository;
  let testUserId: string;
  let testGroupId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    repository = new PaperPositionRepository(prisma);

    // Create test data
    const testUser = await prisma.user.create({
      data: {
        username: `test_user_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        passwordHash: 'test_hash',
      },
    });
    testUserId = testUser.id;

    const testGroup = await prisma.group.create({
      data: {
        name: `test_group_${Date.now()}`,
        creatorId: testUserId,
        isPublic: false,
      },
    });
    testGroupId = testGroup.id;

    // Add user as member of the group
    await prisma.groupMember.create({
      data: {
        groupId: testGroupId,
        userId: testUserId,
        role: 'ADMIN',
      },
    });
  });

  afterEach(async () => {
    // Clean up test data in reverse order of dependencies
    await prisma.groupMember.deleteMany({
      where: { userId: testUserId },
    });

    await prisma.paperPosition.deleteMany({
      where: { userId: testUserId },
    });

    await prisma.group.deleteMany({
      where: { id: testGroupId },
    });

    await prisma.user.delete({
      where: { id: testUserId },
    });

    await prisma.$disconnect();
  });

  describe('Daily P&L Calculation', () => {
    it('should calculate daily P&L for positions opened today', async () => {
      // Create a position opened today
      const position = await repository.create({
        userId: testUserId,
        groupId: testGroupId,
        symbol: 'AAPL',
        assetType: 'STOCK',
        quantity: 10,
        entryPrice: 150,
        currentPrice: 155,
      });

      // Update position with higher price
      await repository.update(position.id, {
        currentPrice: 160,
      });

      const summary = await repository.getPortfolioSummary(testUserId);

      // Day P&L should be (160 - 150) * 10 = 100
      expect(summary.dayPnl).toBe(100);
      expect(summary.dayPnlPercent).toBeCloseTo(6.25, 2); // 100 / 1600 * 100
    });

    it('should calculate daily P&L for positions opened on previous days', async () => {
      // Create a position with opening date in the past
      const positionData: CreatePaperPositionData = {
        userId: testUserId,
        groupId: testGroupId,
        symbol: 'GOOGL',
        assetType: 'STOCK',
        quantity: 5,
        entryPrice: 2800,
        currentPrice: 2850,
      };

      const position = await repository.create(positionData);

      // Manually update the opening date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(16, 0, 0, 0); // Set to market close yesterday

      await prisma.paperPosition.update({
        where: { id: position.id },
        data: {
          openedAt: yesterday,
          // Set yesterday's closing price
          currentPrice: 2830,
        },
      });

      // Update to today's price
      await repository.update(position.id, {
        currentPrice: 2850,
      });

      const summary = await repository.getPortfolioSummary(testUserId);

      // Day P&L should be approximately (2850 - (2830 - small overnight change)) * 5
      // The overnight change is 0.1% of 2830 = 2.83, so yesterday's close was ~2827.17
      // Day P&L = (2850 - 2827.17) * 5 = 22.83 * 5 = 114.15
      expect(summary.dayPnl).toBeCloseTo(114.15, 1);
      expect(summary.dayPnlPercent).toBeCloseTo(0.80, 1); // 114.15 / 14250 * 100
    });

    it('should handle multiple positions for daily P&L calculation', async () => {
      // Position 1: Opened today
      const position1 = await repository.create({
        userId: testUserId,
        groupId: testGroupId,
        symbol: 'AAPL',
        assetType: 'STOCK',
        quantity: 10,
        entryPrice: 150,
        currentPrice: 155,
      });

      // Position 2: Opened yesterday
      const position2 = await repository.create({
        userId: testUserId,
        groupId: testGroupId,
        symbol: 'MSFT',
        assetType: 'STOCK',
        quantity: 5,
        entryPrice: 350,
        currentPrice: 360,
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(16, 0, 0, 0);

      await prisma.paperPosition.update({
        where: { id: position2.id },
        data: {
          openedAt: yesterday,
          currentPrice: 355, // Yesterday's closing price
        },
      });

      // Update both positions with today's prices
      await repository.update(position1.id, { currentPrice: 160 });
      await repository.update(position2.id, { currentPrice: 365 });

      const summary = await repository.getPortfolioSummary(testUserId);

      // Day P&L calculation:
      // Position 1: (160 - 150) * 10 = 100 (opened today)
      // Position 2: (365 - (355 - overnight change)) * 5 = (365 - 354.645) * 5 = 51.775
      // Total: ~151.78
      expect(summary.dayPnl).toBeCloseTo(151.78, 1);
    });

    it('should return zero daily P&L for closed positions', async () => {
      const position = await repository.create({
        userId: testUserId,
        groupId: testGroupId,
        symbol: 'TSLA',
        assetType: 'STOCK',
        quantity: 10,
        entryPrice: 700,
        currentPrice: 720,
      });

      // Close the position
      await repository.close(position.id, 730, 'Take profit');

      const summary = await repository.getPortfolioSummary(testUserId);

      // Closed positions don't contribute to daily P&L
      expect(summary.dayPnl).toBe(0);
      expect(summary.dayPnlPercent).toBe(0);
    });

    it('should handle negative daily P&L', async () => {
      const position = await repository.create({
        userId: testUserId,
        groupId: testGroupId,
        symbol: 'META',
        assetType: 'STOCK',
        quantity: 10,
        entryPrice: 300,
        currentPrice: 290,
      });

      const summary = await repository.getPortfolioSummary(testUserId);

      // Day P&L should be (290 - 300) * 10 = -100
      expect(summary.dayPnl).toBe(-100);
      expect(summary.dayPnlPercent).toBeCloseTo(-3.45, 1); // -100 / 2900 * 100
    });
  });

  describe('Daily P&L History Tracking', () => {
    it('should track daily P&L snapshots', async () => {
      const position = await repository.create({
        userId: testUserId,
        groupId: testGroupId,
        symbol: 'NVDA',
        assetType: 'STOCK',
        quantity: 5,
        entryPrice: 400,
        currentPrice: 410,
      });

      // Create daily snapshot
      const dailySnapshot = await repository.createDailySnapshot(testUserId, testGroupId);

      expect(dailySnapshot).toBeDefined();
      expect(dailySnapshot.userId).toBe(testUserId);
      expect(dailySnapshot.portfolioValue).toBe(2050); // 410 * 5
      expect(dailySnapshot.dailyPnl).toBe(50); // (410 - 400) * 5
      expect(dailySnapshot.totalPnl).toBe(50);
      expect(dailySnapshot.date).toBeInstanceOf(Date);
    });

    it('should retrieve daily P&L history', async () => {
      // Create positions and snapshots over multiple days
      const position = await repository.create({
        userId: testUserId,
        groupId: testGroupId,
        symbol: 'AMD',
        assetType: 'STOCK',
        quantity: 10,
        entryPrice: 100,
        currentPrice: 105,
      });

      // Day 1 snapshot
      await repository.createDailySnapshot(testUserId, testGroupId);

      // Day 2 - update price
      await repository.update(position.id, { currentPrice: 110 });
      await repository.createDailySnapshot(testUserId, testGroupId);

      // Day 3 - update price
      await repository.update(position.id, { currentPrice: 108 });
      await repository.createDailySnapshot(testUserId, testGroupId);

      const history = await repository.getDailyPnLHistory(testUserId, 7);

      expect(history.length).toBe(3);
      expect(history[0].dailyPnl).toBe(50); // First day
      expect(history[1].dailyPnl).toBe(50); // Second day gain
      expect(history[2].dailyPnl).toBe(-20); // Third day loss
    });

    it('should calculate cumulative P&L over time', async () => {
      const position = await repository.create({
        userId: testUserId,
        groupId: testGroupId,
        symbol: 'SPY',
        assetType: 'ETF',
        quantity: 10,
        entryPrice: 400,
        currentPrice: 410,
      });

      // Create multiple snapshots
      const snapshots = [];
      const prices = [410, 415, 412, 420, 418];

      for (const price of prices) {
        await repository.update(position.id, { currentPrice: price });
        const snapshot = await repository.createDailySnapshot(testUserId, testGroupId);
        snapshots.push(snapshot);
      }

      const lastSnapshot = snapshots[snapshots.length - 1];
      expect(lastSnapshot.totalPnl).toBe(180); // (418 - 400) * 10
    });
  });

  describe('Intraday P&L Tracking', () => {
    it('should track P&L changes throughout the day', async () => {
      const position = await repository.create({
        userId: testUserId,
        groupId: testGroupId,
        symbol: 'AMZN',
        assetType: 'STOCK',
        quantity: 10,
        entryPrice: 3000,
        currentPrice: 3010,
      });

      // Get opening snapshot
      const openingSummary = await repository.getPortfolioSummary(testUserId);
      expect(openingSummary.dayPnl).toBe(100);

      // Update price during the day
      await repository.update(position.id, { currentPrice: 3020 });
      const middaySummary = await repository.getPortfolioSummary(testUserId);
      expect(middaySummary.dayPnl).toBe(200);

      // Another update
      await repository.update(position.id, { currentPrice: 3015 });
      const closingSummary = await repository.getPortfolioSummary(testUserId);
      expect(closingSummary.dayPnl).toBe(150);
    });

    it('should reset daily P&L at market open', async () => {
      // Create position yesterday
      const position = await repository.create({
        userId: testUserId,
        groupId: testGroupId,
        symbol: 'NFLX',
        assetType: 'STOCK',
        quantity: 5,
        entryPrice: 500,
        currentPrice: 510,
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await prisma.paperPosition.update({
        where: { id: position.id },
        data: { openedAt: yesterday },
      });

      // Create yesterday's closing snapshot
      await repository.createDailySnapshot(testUserId, testGroupId);

      // New day - price hasn't changed yet
      const todayOpen = await repository.getPortfolioSummary(testUserId);
      expect(todayOpen.dayPnl).toBe(0); // Reset to 0 at market open

      // Price moves during the day
      await repository.update(position.id, { currentPrice: 515 });
      const todayUpdate = await repository.getPortfolioSummary(testUserId);
      expect(todayUpdate.dayPnl).toBe(25); // (515 - 510) * 5
    });
  });

  describe('Performance Impact', () => {
    it('should efficiently calculate daily P&L for large portfolios', async () => {
      const startTime = Date.now();

      // Create 50 positions
      const positions = [];
      for (let i = 0; i < 50; i++) {
        const position = await repository.create({
          userId: testUserId,
          groupId: testGroupId,
          symbol: `STOCK${i}`,
          assetType: 'STOCK',
          quantity: Math.floor(Math.random() * 100) + 1,
          entryPrice: Math.floor(Math.random() * 500) + 50,
          currentPrice: Math.floor(Math.random() * 500) + 50,
        });
        positions.push(position);
      }

      const summary = await repository.getPortfolioSummary(testUserId);
      const endTime = Date.now();

      // Should complete within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(summary.openPositions).toBe(50);
      expect(summary.dayPnl).toBeDefined();
      expect(summary.dayPnlPercent).toBeDefined();
    });
  });
});