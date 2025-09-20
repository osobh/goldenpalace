import { describe, it, expect, beforeEach } from 'vitest';
import { GamificationService } from '../gamification.service';

describe('GamificationService', () => {
  let service: GamificationService;

  beforeEach(() => {
    service = new GamificationService();
  });

  describe('XP System', () => {
    it('should award XP for trade execution', async () => {
      const result = await service.awardXP('user1', 'TRADE_EXECUTED', {
        tradeValue: 10000,
        profit: 500
      });

      expect(result.xpAwarded).toBe(50);
      expect(result.action).toBe('TRADE_EXECUTED');
      expect(result.bonusXP).toBe(0);
    });

    it('should award XP for profitable trade', async () => {
      const result = await service.awardXP('user1', 'PROFITABLE_TRADE', {
        profit: 1000,
        roi: 0.15
      });

      expect(result.xpAwarded).toBe(150);
      expect(result.action).toBe('PROFITABLE_TRADE');
      expect(result.bonusXP).toBeGreaterThan(0);
    });

    it('should award XP for achievement unlock', async () => {
      const result = await service.awardXP('user1', 'ACHIEVEMENT_UNLOCKED', {
        achievementRarity: 'LEGENDARY'
      });

      expect(result.xpAwarded).toBe(500);
      expect(result.action).toBe('ACHIEVEMENT_UNLOCKED');
    });

    it('should award XP for competition participation', async () => {
      const result = await service.awardXP('user1', 'COMPETITION_JOINED', {
        competitionTier: 'GOLD'
      });

      expect(result.xpAwarded).toBe(100);
      expect(result.action).toBe('COMPETITION_JOINED');
    });

    it('should award XP for leaderboard placement', async () => {
      const result = await service.awardXP('user1', 'LEADERBOARD_TOP10', {
        position: 3,
        participants: 100
      });

      expect(result.xpAwarded).toBe(300);
      expect(result.bonusXP).toBe(100);
    });

    it('should apply streak multiplier', async () => {
      await service.awardXP('user1', 'DAILY_LOGIN', {});
      await service.awardXP('user1', 'DAILY_LOGIN', {});
      const result = await service.awardXP('user1', 'DAILY_LOGIN', {});

      expect(result.streakMultiplier).toBeGreaterThan(1);
      expect(result.xpAwarded).toBeGreaterThan(25);
    });
  });

  describe('Level Progression', () => {
    it('should calculate level from total XP', () => {
      expect(service.calculateLevel(0)).toBe(1);
      expect(service.calculateLevel(100)).toBe(1);
      expect(service.calculateLevel(500)).toBe(2);
      expect(service.calculateLevel(1500)).toBe(3);
      expect(service.calculateLevel(5000)).toBe(5);
    });

    it('should calculate XP required for next level', () => {
      expect(service.getXPRequiredForLevel(1)).toBe(0);
      expect(service.getXPRequiredForLevel(2)).toBe(500);
      expect(service.getXPRequiredForLevel(3)).toBe(1500);
      expect(service.getXPRequiredForLevel(10)).toBe(40500);
    });

    it('should calculate progress to next level', () => {
      const progress1 = service.getLevelProgress(250);
      expect(progress1.currentLevel).toBe(1);
      expect(progress1.nextLevel).toBe(2);
      expect(progress1.currentXP).toBe(250);
      expect(progress1.xpToNextLevel).toBe(250);
      expect(progress1.progressPercentage).toBe(50);

      const progress2 = service.getLevelProgress(2000);
      expect(progress2.currentLevel).toBe(3);
      expect(progress2.nextLevel).toBe(4);
      expect(progress2.progressPercentage).toBeCloseTo(20, 0);
    });

    it('should track level up events', async () => {
      const user = await service.getUserProgress('user1');
      expect(user.level).toBe(1);

      await service.addXPToUser('user1', 600);
      const updated = await service.getUserProgress('user1');
      expect(updated.level).toBe(2);
      expect(updated.levelUpEvents).toHaveLength(1);
      expect(updated.levelUpEvents[0].newLevel).toBe(2);
    });

    it('should unlock level rewards', async () => {
      await service.addXPToUser('user1', 600);
      const rewards = await service.getLevelRewards('user1', 2);

      expect(rewards).toHaveLength(1);
      expect(rewards[0].type).toBe('BADGE');
      expect(rewards[0].unlocked).toBe(true);
    });
  });

  describe('Prestige System', () => {
    it('should allow prestige at max level', async () => {
      await service.setUserLevel('user1', 100, 500000);
      const canPrestige = await service.canPrestige('user1');
      expect(canPrestige).toBe(true);
    });

    it('should reset level on prestige', async () => {
      await service.setUserLevel('user1', 100, 500000);
      const result = await service.prestige('user1');

      expect(result.success).toBe(true);
      expect(result.newPrestigeLevel).toBe(1);
      expect(result.rewards).toContainEqual(
        expect.objectContaining({ type: 'PRESTIGE_BADGE' })
      );

      const user = await service.getUserProgress('user1');
      expect(user.level).toBe(1);
      expect(user.prestigeLevel).toBe(1);
    });

    it('should apply prestige bonuses', async () => {
      await service.setUserLevel('user1', 100, 500000);
      await service.prestige('user1');

      const result = await service.awardXP('user1', 'TRADE_EXECUTED', {
        tradeValue: 10000
      });

      expect(result.prestigeMultiplier).toBe(1.1);
      expect(result.xpAwarded).toBe(55);
    });

    it('should track prestige history', async () => {
      await service.setUserLevel('user1', 100, 500000);
      await service.prestige('user1');

      const history = await service.getPrestigeHistory('user1');
      expect(history).toHaveLength(1);
      expect(history[0].prestigeLevel).toBe(1);
      expect(history[0].totalXPBeforePrestige).toBe(500000);
    });
  });

  describe('Daily Challenges', () => {
    it('should generate daily challenges', async () => {
      const challenges = await service.getDailyChallenges('user1');

      expect(challenges).toHaveLength(3);
      expect(challenges[0].type).toBeDefined();
      expect(challenges[0].requirement).toBeDefined();
      expect(challenges[0].xpReward).toBeGreaterThan(0);
      expect(challenges[0].completed).toBe(false);
    });

    it('should track challenge progress', async () => {
      const challenges = await service.getDailyChallenges('user1');
      const challenge = challenges.find(c => c.type === 'EXECUTE_TRADES');

      await service.updateChallengeProgress('user1', challenge!.id, {
        tradesExecuted: 3
      });

      const updated = await service.getChallengeById('user1', challenge!.id);
      expect(updated.progress).toBe(3);
      expect(updated.completed).toBe(false);
    });

    it('should complete challenges and award XP', async () => {
      const challenges = await service.getDailyChallenges('user1');
      const challenge = challenges[0];

      const result = await service.completeChallenge('user1', challenge.id);

      expect(result.completed).toBe(true);
      expect(result.xpAwarded).toBe(challenge.xpReward);
      expect(result.bonusReward).toBeDefined();
    });

    it('should reset daily challenges', async () => {
      const challenges1 = await service.getDailyChallenges('user1');
      await service.resetDailyChallenges('user1');
      const challenges2 = await service.getDailyChallenges('user1');

      expect(challenges2).toHaveLength(3);
      expect(challenges2[0].id).not.toBe(challenges1[0].id);
    });

    it('should track challenge streak', async () => {
      const challenges = await service.getDailyChallenges('user1');

      for (const challenge of challenges) {
        await service.completeChallenge('user1', challenge.id);
      }

      const stats = await service.getUserStats('user1');
      expect(stats.dailyChallengeStreak).toBe(1);
      expect(stats.allChallengesCompleted).toBe(true);
    });
  });

  describe('Weekly Quests', () => {
    it('should generate weekly quests', async () => {
      const quests = await service.getWeeklyQuests('user1');

      expect(quests).toHaveLength(5);
      expect(quests[0].duration).toBe('WEEKLY');
      expect(quests[0].xpReward).toBeGreaterThan(500);
      expect(quests[0].stages).toBeDefined();
    });

    it('should track quest stages', async () => {
      const quests = await service.getWeeklyQuests('user1');
      const quest = quests.find(q => q.type === 'PROFIT_MILESTONE');

      await service.updateQuestProgress('user1', quest!.id, {
        currentProfit: 5000
      });

      const updated = await service.getQuestById('user1', quest!.id);
      expect(updated.currentStage).toBe(1);
      expect(updated.stagesCompleted).toBe(1);
    });

    it('should complete quest stages', async () => {
      const quests = await service.getWeeklyQuests('user1');
      const quest = quests[0];

      for (let i = 0; i < quest.stages.length; i++) {
        await service.completeQuestStage('user1', quest.id, i);
      }

      const completed = await service.getQuestById('user1', quest.id);
      expect(completed.completed).toBe(true);
      expect(completed.xpAwarded).toBe(quest.xpReward);
    });

    it('should unlock bonus quests', async () => {
      const quests = await service.getWeeklyQuests('user1');

      for (const quest of quests) {
        await service.forceCompleteQuest('user1', quest.id);
      }

      const bonusQuests = await service.getBonusQuests('user1');
      expect(bonusQuests).toHaveLength(1);
      expect(bonusQuests[0].type).toBe('BONUS');
      expect(bonusQuests[0].xpReward).toBeGreaterThan(1000);
    });
  });

  describe('Seasonal Events', () => {
    it('should create seasonal events', async () => {
      const event = await service.createSeasonalEvent({
        name: 'Summer Trading Festival',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        xpMultiplier: 2,
        specialChallenges: true
      });

      expect(event.id).toBeDefined();
      expect(event.active).toBe(true);
      expect(event.xpMultiplier).toBe(2);
    });

    it('should apply event multipliers', async () => {
      await service.createSeasonalEvent({
        name: 'Double XP Weekend',
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        xpMultiplier: 2
      });

      const result = await service.awardXP('user1', 'TRADE_EXECUTED', {
        tradeValue: 10000
      });

      expect(result.eventMultiplier).toBe(2);
      expect(result.xpAwarded).toBe(100);
    });

    it('should track event participation', async () => {
      const event = await service.createSeasonalEvent({
        name: 'Trading Marathon',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await service.joinEvent('user1', event.id);
      const participation = await service.getEventParticipation('user1', event.id);

      expect(participation.joined).toBe(true);
      expect(participation.xpEarned).toBe(0);
      expect(participation.rank).toBe(0);
    });

    it('should generate event leaderboard', async () => {
      const event = await service.createSeasonalEvent({
        name: 'Competition Event',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await service.joinEvent('user1', event.id);
      await service.joinEvent('user2', event.id);
      await service.addEventXP('user1', event.id, 1000);
      await service.addEventXP('user2', event.id, 1500);

      const leaderboard = await service.getEventLeaderboard(event.id);
      expect(leaderboard[0].userId).toBe('user2');
      expect(leaderboard[0].xpEarned).toBe(1500);
      expect(leaderboard[1].userId).toBe('user1');
    });
  });

  describe('XP Boosters', () => {
    it('should apply time-limited boosters', async () => {
      await service.activateBooster('user1', {
        type: '2X_XP',
        duration: 3600000,
        multiplier: 2
      });

      const result = await service.awardXP('user1', 'TRADE_EXECUTED', {
        tradeValue: 10000
      });

      expect(result.boosterMultiplier).toBe(2);
      expect(result.xpAwarded).toBe(100);
    });

    it('should stack multiple boosters', async () => {
      await service.activateBooster('user1', {
        type: '2X_XP',
        multiplier: 2
      });
      await service.activateBooster('user1', {
        type: 'WEEKEND_BOOST',
        multiplier: 1.5
      });

      const result = await service.awardXP('user1', 'TRADE_EXECUTED', {
        tradeValue: 10000
      });

      expect(result.totalMultiplier).toBe(3);
      expect(result.xpAwarded).toBe(150);
    });

    it('should expire boosters', async () => {
      await service.activateBooster('user1', {
        type: '2X_XP',
        duration: 100,
        multiplier: 2
      });

      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await service.awardXP('user1', 'TRADE_EXECUTED', {
        tradeValue: 10000
      });

      expect(result.boosterMultiplier).toBe(1);
      expect(result.xpAwarded).toBe(50);
    });
  });

  describe('Milestone Rewards', () => {
    it('should unlock milestone rewards', async () => {
      const milestones = await service.getMilestoneRewards();

      expect(milestones).toContainEqual(
        expect.objectContaining({
          level: 10,
          rewards: expect.arrayContaining([
            expect.objectContaining({ type: 'BADGE' })
          ])
        })
      );
    });

    it('should claim milestone rewards', async () => {
      await service.setUserLevel('user1', 10, 5000);
      const rewards = await service.claimMilestoneRewards('user1', 10);

      expect(rewards).toHaveLength(2);
      expect(rewards).toContainEqual(
        expect.objectContaining({ type: 'BADGE' })
      );
      expect(rewards).toContainEqual(
        expect.objectContaining({ type: 'TITLE' })
      );
    });

    it('should track claimed milestones', async () => {
      await service.setUserLevel('user1', 10, 5000);
      await service.claimMilestoneRewards('user1', 10);

      const result = await service.claimMilestoneRewards('user1', 10);
      expect(result).toHaveLength(0);

      const claimed = await service.getClaimedMilestones('user1');
      expect(claimed).toContain(10);
    });
  });

  describe('Statistics and Analytics', () => {
    it('should track XP sources', async () => {
      await service.awardXP('user1', 'TRADE_EXECUTED', { tradeValue: 10000 });
      await service.awardXP('user1', 'PROFITABLE_TRADE', { profit: 500 });
      await service.awardXP('user1', 'ACHIEVEMENT_UNLOCKED', { achievementRarity: 'RARE' });

      const stats = await service.getXPSourceStats('user1');
      expect(stats.TRADE_EXECUTED).toBe(50);
      expect(stats.PROFITABLE_TRADE).toBeGreaterThan(0);
      expect(stats.ACHIEVEMENT_UNLOCKED).toBe(200);
    });

    it('should calculate daily XP earnings', async () => {
      await service.awardXP('user1', 'TRADE_EXECUTED', { tradeValue: 10000 });
      await service.awardXP('user1', 'PROFITABLE_TRADE', { profit: 500 });

      const daily = await service.getDailyXPEarnings('user1');
      expect(daily.today).toBeGreaterThan(0);
      expect(daily.average).toBeGreaterThan(0);
    });

    it('should generate progress report', async () => {
      await service.addXPToUser('user1', 2500);
      await service.completeChallenge('user1', 'challenge1');

      const report = await service.getProgressReport('user1');
      expect(report.currentLevel).toBe(4);
      expect(report.totalXP).toBe(2500);
      expect(report.challengesCompleted).toBe(1);
      expect(report.nextMilestone).toBe(10);
    });
  });
});