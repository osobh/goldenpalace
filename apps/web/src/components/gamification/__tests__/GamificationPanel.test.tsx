import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { GamificationPanel } from '../GamificationPanel';
import { GamificationService } from '../../../services/gamification.service';
import React from 'react';

vi.mock('../../../services/gamification.service');

describe('GamificationPanel', () => {
  let gamificationService: GamificationService;

  beforeEach(() => {
    gamificationService = new GamificationService();
    vi.clearAllMocks();
  });

  describe('XP and Level Display', () => {
    it('should display current level and XP progress', async () => {
      const mockProgress = {
        currentLevel: 15,
        nextLevel: 16,
        currentXP: 2500,
        xpToNextLevel: 1500,
        progressPercentage: 62.5,
        totalXP: 25000
      };

      vi.spyOn(gamificationService, 'getLevelProgress').mockReturnValue(mockProgress);
      vi.spyOn(gamificationService, 'getUserProgress').mockResolvedValue({
        userId: 'user1',
        level: 15,
        totalXP: 25000,
        currentLevelXP: 2500,
        prestigeLevel: 0,
        levelUpEvents: [],
        lastActivity: new Date()
      });

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      await waitFor(() => {
        expect(screen.getByText('Level 15')).toBeInTheDocument();
        expect(screen.getByText('25,000 XP')).toBeInTheDocument();
        expect(screen.getByTestId('xp-progress-bar')).toHaveStyle({ width: '62.5%' });
        expect(screen.getByText('2,500 / 4,000 XP')).toBeInTheDocument();
      });
    });

    it('should show prestige badge when user has prestiged', async () => {
      vi.spyOn(gamificationService, 'getUserProgress').mockResolvedValue({
        userId: 'user1',
        level: 10,
        totalXP: 5000,
        currentLevelXP: 500,
        prestigeLevel: 2,
        levelUpEvents: [],
        lastActivity: new Date()
      });

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      await waitFor(() => {
        expect(screen.getByTestId('prestige-badge')).toBeInTheDocument();
        expect(screen.getByText('Prestige 2')).toBeInTheDocument();
      });
    });

    it('should animate level up', async () => {
      const initialProgress = {
        userId: 'user1',
        level: 9,
        totalXP: 4900,
        currentLevelXP: 400,
        prestigeLevel: 0,
        levelUpEvents: [],
        lastActivity: new Date()
      };

      const leveledUpProgress = {
        userId: 'user1',
        level: 10,
        totalXP: 5100,
        currentLevelXP: 100,
        prestigeLevel: 0,
        levelUpEvents: [{ level: 9, newLevel: 10, timestamp: new Date(), xpEarned: 200 }],
        lastActivity: new Date()
      };

      vi.spyOn(gamificationService, 'getUserProgress')
        .mockResolvedValueOnce(initialProgress)
        .mockResolvedValueOnce(leveledUpProgress);

      const { rerender } = render(<GamificationPanel service={gamificationService} userId="user1" />);

      await waitFor(() => {
        expect(screen.getByText('Level 9')).toBeInTheDocument();
      });

      rerender(<GamificationPanel service={gamificationService} userId="user1" />);

      await waitFor(() => {
        expect(screen.getByText('Level 10')).toBeInTheDocument();
        expect(screen.getByTestId('level-up-animation')).toBeInTheDocument();
      });
    });
  });

  describe('Daily Challenges', () => {
    it('should display daily challenges with progress', async () => {
      const mockChallenges = [
        {
          id: 'challenge1',
          type: 'EXECUTE_TRADES',
          name: 'Trade Master',
          description: 'Execute 5 trades',
          progress: 3,
          maxProgress: 5,
          xpReward: 100,
          completed: false,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000)
        },
        {
          id: 'challenge2',
          type: 'PROFIT_TARGET',
          name: 'Profit Hunter',
          description: 'Achieve $500 profit',
          progress: 200,
          maxProgress: 500,
          xpReward: 150,
          completed: false,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000)
        },
        {
          id: 'challenge3',
          type: 'WIN_STREAK',
          name: 'Winning Streak',
          description: 'Get 3 wins in a row',
          progress: 3,
          maxProgress: 3,
          xpReward: 200,
          completed: true,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000)
        }
      ];

      vi.spyOn(gamificationService, 'getDailyChallenges').mockResolvedValue(mockChallenges);

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      const challengesTab = screen.getByRole('tab', { name: 'Challenges' });
      fireEvent.click(challengesTab);

      await waitFor(() => {
        expect(screen.getByText('Trade Master')).toBeInTheDocument();
        expect(screen.getByText('3 / 5')).toBeInTheDocument();
        expect(screen.getByText('Execute 5 trades')).toBeInTheDocument();
        expect(screen.getByText('100 XP')).toBeInTheDocument();

        expect(screen.getByText('Profit Hunter')).toBeInTheDocument();
        expect(screen.getByText('$200 / $500')).toBeInTheDocument();

        const completedChallenge = screen.getByTestId('challenge-challenge3');
        expect(completedChallenge).toHaveClass('completed');
        expect(within(completedChallenge).getByText('✓ Completed')).toBeInTheDocument();
      });
    });

    it('should show time remaining for challenges', async () => {
      const mockChallenge = {
        id: 'challenge1',
        name: 'Daily Task',
        description: 'Complete today',
        progress: 0,
        maxProgress: 1,
        xpReward: 50,
        completed: false,
        expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000 + 30 * 60 * 1000)
      };

      vi.spyOn(gamificationService, 'getDailyChallenges').mockResolvedValue([mockChallenge]);

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      const challengesTab = screen.getByRole('tab', { name: 'Challenges' });
      fireEvent.click(challengesTab);

      await waitFor(() => {
        expect(screen.getByText(/3h 30m remaining/)).toBeInTheDocument();
      });
    });

    it('should claim completed challenges', async () => {
      const mockChallenge = {
        id: 'challenge1',
        name: 'Completed Task',
        progress: 5,
        maxProgress: 5,
        xpReward: 100,
        completed: true,
        claimed: false
      };

      vi.spyOn(gamificationService, 'getDailyChallenges').mockResolvedValue([mockChallenge]);
      vi.spyOn(gamificationService, 'completeChallenge').mockResolvedValue({
        completed: true,
        xpAwarded: 100,
        bonusReward: { type: 'BADGE', value: 'Daily Champion' }
      });

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      const challengesTab = screen.getByRole('tab', { name: 'Challenges' });
      fireEvent.click(challengesTab);

      await waitFor(() => {
        const claimButton = screen.getByRole('button', { name: 'Claim Reward' });
        fireEvent.click(claimButton);
      });

      await waitFor(() => {
        expect(screen.getByText('+100 XP')).toBeInTheDocument();
        expect(screen.getByText('Badge Earned: Daily Champion')).toBeInTheDocument();
      });
    });
  });

  describe('Achievements', () => {
    it('should display achievement categories and progress', async () => {
      const mockAchievements = [
        {
          id: 'ach1',
          name: 'First Trade',
          description: 'Complete your first trade',
          category: 'TRADING',
          rarity: 'COMMON',
          xpReward: 100,
          unlocked: true,
          unlockedAt: new Date(),
          progress: 1,
          maxProgress: 1
        },
        {
          id: 'ach2',
          name: 'Profit Master',
          description: 'Earn $10,000 in profits',
          category: 'PROFIT',
          rarity: 'EPIC',
          xpReward: 1000,
          unlocked: false,
          progress: 7500,
          maxProgress: 10000
        },
        {
          id: 'ach3',
          name: 'Social Butterfly',
          description: 'Follow 10 traders',
          category: 'SOCIAL',
          rarity: 'UNCOMMON',
          xpReward: 200,
          unlocked: false,
          progress: 3,
          maxProgress: 10
        }
      ];

      vi.spyOn(gamificationService, 'getAchievementProgress').mockResolvedValue(mockAchievements);

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      const achievementsTab = screen.getByRole('tab', { name: 'Achievements' });
      fireEvent.click(achievementsTab);

      await waitFor(() => {
        expect(screen.getByText('First Trade')).toBeInTheDocument();
        expect(screen.getByTestId('achievement-ach1')).toHaveClass('unlocked');

        expect(screen.getByText('Profit Master')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();

        expect(screen.getByText('Social Butterfly')).toBeInTheDocument();
        expect(screen.getByText('3 / 10')).toBeInTheDocument();
      });
    });

    it('should filter achievements by category', async () => {
      const mockAchievements = [
        { id: 'ach1', name: 'Trading Achievement', category: 'TRADING', unlocked: false },
        { id: 'ach2', name: 'Profit Achievement', category: 'PROFIT', unlocked: false },
        { id: 'ach3', name: 'Social Achievement', category: 'SOCIAL', unlocked: false }
      ];

      vi.spyOn(gamificationService, 'getAchievementProgress').mockResolvedValue(mockAchievements);

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      const achievementsTab = screen.getByRole('tab', { name: 'Achievements' });
      fireEvent.click(achievementsTab);

      await waitFor(() => {
        expect(screen.getByText('Trading Achievement')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByRole('combobox', { name: 'Filter by category' });
      fireEvent.change(categoryFilter, { target: { value: 'PROFIT' } });

      expect(screen.queryByText('Trading Achievement')).not.toBeInTheDocument();
      expect(screen.getByText('Profit Achievement')).toBeInTheDocument();
      expect(screen.queryByText('Social Achievement')).not.toBeInTheDocument();
    });

    it('should show achievement rarity badges', async () => {
      const mockAchievements = [
        { id: 'ach1', name: 'Common', rarity: 'COMMON', unlocked: true },
        { id: 'ach2', name: 'Rare', rarity: 'RARE', unlocked: true },
        { id: 'ach3', name: 'Legendary', rarity: 'LEGENDARY', unlocked: true },
        { id: 'ach4', name: 'Mythic', rarity: 'MYTHIC', unlocked: true }
      ];

      vi.spyOn(gamificationService, 'getAchievementProgress').mockResolvedValue(mockAchievements);

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      const achievementsTab = screen.getByRole('tab', { name: 'Achievements' });
      fireEvent.click(achievementsTab);

      await waitFor(() => {
        expect(screen.getByTestId('rarity-COMMON')).toHaveClass('rarity-common');
        expect(screen.getByTestId('rarity-RARE')).toHaveClass('rarity-rare');
        expect(screen.getByTestId('rarity-LEGENDARY')).toHaveClass('rarity-legendary');
        expect(screen.getByTestId('rarity-MYTHIC')).toHaveClass('rarity-mythic');
      });
    });
  });

  describe('Leaderboard Integration', () => {
    it('should show user position in global leaderboard', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user2', username: 'TopPlayer', score: 50000 },
        { rank: 2, userId: 'user3', username: 'SecondBest', score: 45000 },
        { rank: 3, userId: 'user1', username: 'You', score: 40000 },
        { rank: 4, userId: 'user4', username: 'Player4', score: 35000 },
        { rank: 5, userId: 'user5', username: 'Player5', score: 30000 }
      ];

      vi.spyOn(gamificationService, 'getGlobalLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      const leaderboardTab = screen.getByRole('tab', { name: 'Leaderboard' });
      fireEvent.click(leaderboardTab);

      await waitFor(() => {
        expect(screen.getByText('Your Rank: #3')).toBeInTheDocument();
        expect(screen.getByText('40,000 XP')).toBeInTheDocument();

        const userRow = screen.getByTestId('leaderboard-user1');
        expect(userRow).toHaveClass('highlight');
      });
    });

    it('should show nearby competitors', async () => {
      const mockNearby = [
        { rank: 23, userId: 'user4', username: 'JustAbove', score: 15200 },
        { rank: 24, userId: 'user1', username: 'You', score: 15000 },
        { rank: 25, userId: 'user5', username: 'JustBelow', score: 14800 }
      ];

      vi.spyOn(gamificationService, 'getNearbyCompetitors').mockResolvedValue(mockNearby);

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      const leaderboardTab = screen.getByRole('tab', { name: 'Leaderboard' });
      fireEvent.click(leaderboardTab);

      await waitFor(() => {
        expect(screen.getByText('Nearby Competitors')).toBeInTheDocument();
        expect(screen.getByText('JustAbove')).toBeInTheDocument();
        expect(screen.getByText('JustBelow')).toBeInTheDocument();
        expect(screen.getByText('+200 XP to rank up')).toBeInTheDocument();
      });
    });
  });

  describe('Weekly Quests', () => {
    it('should display weekly quests with stages', async () => {
      const mockQuests = [
        {
          id: 'quest1',
          name: 'Trading Marathon',
          description: 'Complete 100 trades this week',
          duration: 'WEEKLY',
          stages: [
            { requirement: { trades: 25 }, progress: 25, maxProgress: 25, completed: true },
            { requirement: { trades: 50 }, progress: 35, maxProgress: 50, completed: false },
            { requirement: { trades: 100 }, progress: 35, maxProgress: 100, completed: false }
          ],
          currentStage: 1,
          stagesCompleted: 1,
          xpReward: 1000,
          completed: false,
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        }
      ];

      vi.spyOn(gamificationService, 'getWeeklyQuests').mockResolvedValue(mockQuests);

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      const questsTab = screen.getByRole('tab', { name: 'Quests' });
      fireEvent.click(questsTab);

      await waitFor(() => {
        expect(screen.getByText('Trading Marathon')).toBeInTheDocument();
        expect(screen.getByText('Stage 2 of 3')).toBeInTheDocument();
        expect(screen.getByTestId('quest-stage-0')).toHaveClass('completed');
        expect(screen.getByTestId('quest-stage-1')).toHaveClass('in-progress');
        expect(screen.getByTestId('quest-stage-2')).toHaveClass('locked');
      });
    });

    it('should show quest rewards', async () => {
      const mockQuest = {
        id: 'quest1',
        name: 'Epic Quest',
        xpReward: 2500,
        bonusRewards: [
          { type: 'BADGE', value: 'Quest Master' },
          { type: 'TITLE', value: 'The Persistent' }
        ]
      };

      vi.spyOn(gamificationService, 'getWeeklyQuests').mockResolvedValue([mockQuest]);

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      const questsTab = screen.getByRole('tab', { name: 'Quests' });
      fireEvent.click(questsTab);

      await waitFor(() => {
        expect(screen.getByText('2,500 XP')).toBeInTheDocument();
        expect(screen.getByText('Badge: Quest Master')).toBeInTheDocument();
        expect(screen.getByText('Title: The Persistent')).toBeInTheDocument();
      });
    });
  });

  describe('Statistics', () => {
    it('should display user statistics', async () => {
      const mockStats = {
        totalXPEarned: 125000,
        dailyAverage: 850,
        favoriteAction: 'PROFITABLE_TRADE',
        achievementsUnlocked: 45,
        challengesCompleted: 120,
        questsCompleted: 15,
        currentStreak: 7,
        bestStreak: 14
      };

      vi.spyOn(gamificationService, 'getUserStatistics').mockResolvedValue(mockStats);

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      const statsTab = screen.getByRole('tab', { name: 'Stats' });
      fireEvent.click(statsTab);

      await waitFor(() => {
        expect(screen.getByText('Total XP Earned')).toBeInTheDocument();
        expect(screen.getByText('125,000')).toBeInTheDocument();
        expect(screen.getByText('Daily Average')).toBeInTheDocument();
        expect(screen.getByText('850 XP')).toBeInTheDocument();
        expect(screen.getByText('Current Streak')).toBeInTheDocument();
        expect(screen.getByText('7 days')).toBeInTheDocument();
      });
    });

    it('should show XP source breakdown chart', async () => {
      const mockSources = {
        TRADE_EXECUTED: 25000,
        PROFITABLE_TRADE: 35000,
        ACHIEVEMENT_UNLOCKED: 20000,
        CHALLENGE_COMPLETED: 15000,
        QUEST_COMPLETED: 30000
      };

      vi.spyOn(gamificationService, 'getXPSourceStats').mockResolvedValue(mockSources);

      render(<GamificationPanel service={gamificationService} userId="user1" />);

      const statsTab = screen.getByRole('tab', { name: 'Stats' });
      fireEvent.click(statsTab);

      await waitFor(() => {
        expect(screen.getByTestId('xp-sources-chart')).toBeInTheDocument();
        expect(screen.getByText('Profitable Trades: 35,000 XP')).toBeInTheDocument();
        expect(screen.getByText('Quests: 30,000 XP')).toBeInTheDocument();
      });
    });
  });

  describe('Notifications', () => {
    it('should show XP gain notifications', async () => {
      const { rerender } = render(<GamificationPanel service={gamificationService} userId="user1" />);

      const mockXPGain = {
        action: 'PROFITABLE_TRADE',
        xpAwarded: 250,
        bonusXP: 50,
        totalMultiplier: 1.5
      };

      vi.spyOn(gamificationService, 'getRecentXPGains').mockResolvedValue([mockXPGain]);

      rerender(<GamificationPanel service={gamificationService} userId="user1" showNotifications={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('xp-notification')).toBeInTheDocument();
        expect(screen.getByText('+250 XP')).toBeInTheDocument();
        expect(screen.getByText('Profitable Trade')).toBeInTheDocument();
      });
    });

    it('should show level up notification', async () => {
      vi.spyOn(gamificationService, 'checkForLevelUp').mockResolvedValue({
        leveledUp: true,
        oldLevel: 9,
        newLevel: 10,
        rewards: [
          { type: 'BADGE', value: 'Level 10 Badge' },
          { type: 'TITLE', value: 'Experienced Trader' }
        ]
      });

      render(<GamificationPanel service={gamificationService} userId="user1" showNotifications={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('level-up-notification')).toBeInTheDocument();
        expect(screen.getByText('Level Up!')).toBeInTheDocument();
        expect(screen.getByText('You reached Level 10!')).toBeInTheDocument();
        expect(screen.getByText('Badge: Level 10 Badge')).toBeInTheDocument();
        expect(screen.getByText('Title: Experienced Trader')).toBeInTheDocument();
      });
    });
  });
});