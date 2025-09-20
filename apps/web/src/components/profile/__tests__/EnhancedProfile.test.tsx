import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { EnhancedProfile } from '../EnhancedProfile';
import { GamificationService } from '../../../services/gamification.service';
import { CompetitionService } from '../../../services/competition.service';
import React from 'react';

vi.mock('../../../services/gamification.service');
vi.mock('../../../services/competition.service');

describe('EnhancedProfile', () => {
  let gamificationService: GamificationService;
  let competitionService: CompetitionService;

  const mockUser = {
    id: 'user123',
    username: 'ProTrader',
    email: 'trader@example.com',
    avatar: '/avatar.jpg',
    joinDate: new Date('2024-01-01'),
    bio: 'Experienced trader focused on tech stocks',
    followersCount: 1250,
    followingCount: 89,
    totalTrades: 3456,
    winRate: 0.68,
    totalPnL: 125000,
    roi: 0.35
  };

  beforeEach(() => {
    gamificationService = new GamificationService();
    competitionService = new CompetitionService();
    vi.clearAllMocks();
  });

  describe('Profile Header', () => {
    it('should display user basic information', async () => {
      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      expect(screen.getByText('ProTrader')).toBeInTheDocument();
      expect(screen.getByText('trader@example.com')).toBeInTheDocument();
      expect(screen.getByText('Experienced trader focused on tech stocks')).toBeInTheDocument();
      expect(screen.getByAltText('ProTrader avatar')).toHaveAttribute('src', '/avatar.jpg');
    });

    it('should display level and prestige information', async () => {
      vi.spyOn(gamificationService, 'getUserProgress').mockResolvedValue({
        userId: 'user123',
        level: 42,
        totalXP: 125000,
        currentLevelXP: 2500,
        prestigeLevel: 2,
        levelUpEvents: [],
        lastActivity: new Date()
      });

      vi.spyOn(gamificationService, 'getLevelProgress').mockReturnValue({
        currentLevel: 42,
        nextLevel: 43,
        currentXP: 2500,
        xpToNextLevel: 1500,
        progressPercentage: 62.5,
        totalXP: 125000
      });

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('level-badge')).toHaveTextContent('Level 42');
        expect(screen.getByTestId('prestige-indicator')).toHaveTextContent('Prestige II');
        expect(screen.getByTestId('xp-display')).toHaveTextContent('125,000 XP');
        expect(screen.getByTestId('level-progress-bar')).toHaveStyle({ width: '62.5%' });
      });
    });

    it('should show follow/unfollow button for other users', () => {
      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
          isOwnProfile={false}
        />
      );

      const followButton = screen.getByRole('button', { name: 'Follow' });
      expect(followButton).toBeInTheDocument();

      fireEvent.click(followButton);
      expect(screen.getByRole('button', { name: 'Unfollow' })).toBeInTheDocument();
    });

    it('should show edit profile button for own profile', () => {
      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
          isOwnProfile={true}
        />
      );

      expect(screen.getByRole('button', { name: 'Edit Profile' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Follow' })).not.toBeInTheDocument();
    });
  });

  describe('Trading Statistics', () => {
    it('should display trading performance metrics', () => {
      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      expect(screen.getByTestId('total-trades')).toHaveTextContent('3,456');
      expect(screen.getByTestId('win-rate')).toHaveTextContent('68.00%');
      expect(screen.getByTestId('total-pnl')).toHaveTextContent('+$125,000');
      expect(screen.getByTestId('roi')).toHaveTextContent('35.00%');
    });

    it('should show performance chart', async () => {
      const mockPerformance = [
        { date: '2024-01-01', value: 100000 },
        { date: '2024-01-15', value: 105000 },
        { date: '2024-02-01', value: 115000 },
        { date: '2024-02-15', value: 125000 }
      ];

      vi.spyOn(competitionService, 'getUserPerformanceHistory').mockResolvedValue(mockPerformance);

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
        expect(screen.getByText('Portfolio Performance')).toBeInTheDocument();
      });
    });

    it('should display best and worst trades', async () => {
      const mockTrades = {
        bestTrade: { symbol: 'AAPL', profit: 5000, roi: 0.25, date: '2024-02-01' },
        worstTrade: { symbol: 'TSLA', profit: -2000, roi: -0.10, date: '2024-01-15' }
      };

      vi.spyOn(competitionService, 'getUserBestWorstTrades').mockResolvedValue(mockTrades);

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Best Trade')).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('+$5,000')).toBeInTheDocument();
        expect(screen.getByText('+25.00%')).toBeInTheDocument();

        expect(screen.getByText('Worst Trade')).toBeInTheDocument();
        expect(screen.getByText('TSLA')).toBeInTheDocument();
        expect(screen.getByText('-$2,000')).toBeInTheDocument();
        expect(screen.getByText('-10.00%')).toBeInTheDocument();
      });
    });
  });

  describe('Achievement Showcase', () => {
    it('should display featured achievements', async () => {
      const mockAchievements = [
        {
          id: 'ach1',
          name: 'Diamond Hands',
          description: 'Hold a position for 30+ days',
          category: 'TRADING',
          rarity: 'LEGENDARY',
          icon: '💎',
          unlockedAt: new Date('2024-02-01')
        },
        {
          id: 'ach2',
          name: 'Bull Run Champion',
          description: 'Make 10 profitable trades in a row',
          category: 'STREAK',
          rarity: 'EPIC',
          icon: '🐂',
          unlockedAt: new Date('2024-01-15')
        },
        {
          id: 'ach3',
          name: 'Risk Manager',
          description: 'Never exceed 2% risk per trade for 100 trades',
          category: 'RISK',
          rarity: 'RARE',
          icon: '🛡️',
          unlockedAt: new Date('2024-01-20')
        }
      ];

      vi.spyOn(gamificationService, 'getUserFeaturedAchievements').mockResolvedValue(mockAchievements);

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Featured Achievements')).toBeInTheDocument();
        expect(screen.getByText('Diamond Hands')).toBeInTheDocument();
        expect(screen.getByText('Bull Run Champion')).toBeInTheDocument();
        expect(screen.getByText('Risk Manager')).toBeInTheDocument();

        const legendaryBadge = screen.getByTestId('rarity-badge-ach1');
        expect(legendaryBadge).toHaveClass('legendary');
      });
    });

    it('should show achievement progress', async () => {
      const mockProgress = {
        totalAchievements: 150,
        unlockedAchievements: 89,
        progressByCategory: {
          TRADING: { unlocked: 25, total: 30 },
          PROFIT: { unlocked: 18, total: 25 },
          STREAK: { unlocked: 12, total: 20 },
          RISK: { unlocked: 15, total: 20 },
          SOCIAL: { unlocked: 8, total: 15 },
          COMPETITION: { unlocked: 11, total: 20 },
          LEARNING: { unlocked: 0, total: 10 },
          SPECIAL: { unlocked: 0, total: 10 }
        }
      };

      vi.spyOn(gamificationService, 'getAchievementStats').mockResolvedValue(mockProgress);

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Achievement Progress')).toBeInTheDocument();
        expect(screen.getByText('89 / 150')).toBeInTheDocument();
        expect(screen.getByTestId('achievement-progress-bar')).toHaveStyle({
          width: `${(89/150)*100}%`
        });

        expect(screen.getByText('Trading: 25/30')).toBeInTheDocument();
        expect(screen.getByText('Profit: 18/25')).toBeInTheDocument();
      });
    });

    it('should open achievement details modal', async () => {
      const mockAchievement = {
        id: 'ach1',
        name: 'Market Master',
        description: 'Complete 1000 trades',
        longDescription: 'This prestigious achievement is awarded to traders who have completed 1000 trades, demonstrating exceptional market experience.',
        category: 'TRADING',
        rarity: 'MYTHIC',
        xpReward: 5000,
        unlockedAt: new Date('2024-02-15'),
        progress: 1000,
        maxProgress: 1000
      };

      vi.spyOn(gamificationService, 'getUserFeaturedAchievements').mockResolvedValue([mockAchievement]);

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      await waitFor(() => {
        const achievementCard = screen.getByTestId('achievement-card-ach1');
        fireEvent.click(achievementCard);
      });

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(within(modal).getByText('Market Master')).toBeInTheDocument();
        expect(within(modal).getByText(/This prestigious achievement/)).toBeInTheDocument();
        expect(within(modal).getByText('5,000 XP')).toBeInTheDocument();
        expect(within(modal).getByText('Unlocked on Feb 15, 2024')).toBeInTheDocument();
      });
    });
  });

  describe('Competition History', () => {
    it('should display recent competition results', async () => {
      const mockCompetitions = [
        {
          id: 'comp1',
          name: 'Weekly Trading Championship',
          endDate: new Date('2024-02-20'),
          rank: 3,
          participants: 150,
          prize: 1000,
          score: 8500
        },
        {
          id: 'comp2',
          name: 'Daily PnL Contest',
          endDate: new Date('2024-02-19'),
          rank: 1,
          participants: 50,
          prize: 500,
          score: 2500
        },
        {
          id: 'comp3',
          name: 'Monthly ROI Challenge',
          endDate: new Date('2024-01-31'),
          rank: 12,
          participants: 200,
          prize: 0,
          score: 5000
        }
      ];

      vi.spyOn(competitionService, 'getUserCompetitionHistory').mockResolvedValue(mockCompetitions);

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Competition History')).toBeInTheDocument();

        const firstPlace = screen.getByTestId('competition-comp2');
        expect(within(firstPlace).getByTestId('medal-gold')).toBeInTheDocument();
        expect(within(firstPlace).getByText('#1')).toBeInTheDocument();
        expect(within(firstPlace).getByText('$500')).toBeInTheDocument();

        const thirdPlace = screen.getByTestId('competition-comp1');
        expect(within(thirdPlace).getByTestId('medal-bronze')).toBeInTheDocument();
        expect(within(thirdPlace).getByText('#3')).toBeInTheDocument();
        expect(within(thirdPlace).getByText('$1,000')).toBeInTheDocument();

        const noMedal = screen.getByTestId('competition-comp3');
        expect(within(noMedal).queryByTestId(/medal/)).not.toBeInTheDocument();
        expect(within(noMedal).getByText('#12')).toBeInTheDocument();
      });
    });

    it('should show competition statistics summary', async () => {
      const mockStats = {
        totalCompetitions: 45,
        wins: 8,
        top3Finishes: 18,
        totalPrizeWon: 25000,
        averageRank: 15.5,
        bestRank: 1,
        competitionWinRate: 0.178
      };

      vi.spyOn(competitionService, 'getUserCompetitionStats').mockResolvedValue(mockStats);

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('competitions-entered')).toHaveTextContent('45');
        expect(screen.getByTestId('competition-wins')).toHaveTextContent('8');
        expect(screen.getByTestId('top-3-finishes')).toHaveTextContent('18');
        expect(screen.getByTestId('total-prize-won')).toHaveTextContent('$25,000');
      });
    });
  });

  describe('Badge Collection', () => {
    it('should display earned badges', async () => {
      const mockBadges = [
        { id: 'badge1', name: 'Early Adopter', icon: '🌟', earned: true, earnedDate: '2024-01-01' },
        { id: 'badge2', name: 'Verified Trader', icon: '✓', earned: true, earnedDate: '2024-01-05' },
        { id: 'badge3', name: 'Top Performer', icon: '🏆', earned: true, earnedDate: '2024-02-01' },
        { id: 'badge4', name: 'Risk Expert', icon: '🛡️', earned: false },
        { id: 'badge5', name: 'Social Trader', icon: '👥', earned: false }
      ];

      vi.spyOn(gamificationService, 'getUserBadges').mockResolvedValue(mockBadges);

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Badges')).toBeInTheDocument();

        const earnedBadges = screen.getAllByTestId(/badge-earned/);
        expect(earnedBadges).toHaveLength(3);

        const unearnedBadges = screen.getAllByTestId(/badge-unearned/);
        expect(unearnedBadges).toHaveLength(2);

        expect(screen.getByText('Early Adopter')).toBeInTheDocument();
        expect(screen.getByText('🌟')).toBeInTheDocument();
      });
    });

    it('should show badge tooltips on hover', async () => {
      const mockBadge = {
        id: 'badge1',
        name: 'Diamond Trader',
        icon: '💎',
        description: 'Achieved $100K+ in profits',
        earned: true,
        earnedDate: '2024-02-01'
      };

      vi.spyOn(gamificationService, 'getUserBadges').mockResolvedValue([mockBadge]);

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      await waitFor(() => {
        const badge = screen.getByTestId('badge-earned-badge1');
        fireEvent.mouseEnter(badge);
      });

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText('Achieved $100K+ in profits')).toBeInTheDocument();
        expect(screen.getByText('Earned on Feb 1, 2024')).toBeInTheDocument();
      });
    });
  });

  describe('Activity Timeline', () => {
    it('should display recent activities', async () => {
      const mockActivities = [
        {
          id: 'act1',
          type: 'ACHIEVEMENT_UNLOCKED',
          title: 'Unlocked "Profit Master"',
          timestamp: new Date('2024-02-20T10:30:00'),
          icon: '🏆',
          xpEarned: 500
        },
        {
          id: 'act2',
          type: 'COMPETITION_WON',
          title: 'Won Daily Trading Contest',
          timestamp: new Date('2024-02-19T16:00:00'),
          icon: '🥇',
          prize: 500
        },
        {
          id: 'act3',
          type: 'LEVEL_UP',
          title: 'Reached Level 42',
          timestamp: new Date('2024-02-18T14:20:00'),
          icon: '⬆️',
          xpEarned: 200
        },
        {
          id: 'act4',
          type: 'TRADE_MILESTONE',
          title: 'Completed 1000th trade',
          timestamp: new Date('2024-02-17T09:15:00'),
          icon: '📈'
        }
      ];

      vi.spyOn(gamificationService, 'getUserActivityTimeline').mockResolvedValue(mockActivities);

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      const timelineTab = screen.getByRole('tab', { name: 'Activity' });
      fireEvent.click(timelineTab);

      await waitFor(() => {
        expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
        expect(screen.getByText('Unlocked "Profit Master"')).toBeInTheDocument();
        expect(screen.getByText('Won Daily Trading Contest')).toBeInTheDocument();
        expect(screen.getByText('Reached Level 42')).toBeInTheDocument();
        expect(screen.getByText('Completed 1000th trade')).toBeInTheDocument();

        expect(screen.getByText('+500 XP')).toBeInTheDocument();
        expect(screen.getByText('$500 Prize')).toBeInTheDocument();
      });
    });

    it('should filter activities by type', async () => {
      const mockActivities = [
        { id: 'act1', type: 'ACHIEVEMENT_UNLOCKED', title: 'Achievement 1', timestamp: new Date() },
        { id: 'act2', type: 'COMPETITION_WON', title: 'Competition 1', timestamp: new Date() },
        { id: 'act3', type: 'LEVEL_UP', title: 'Level Up 1', timestamp: new Date() },
        { id: 'act4', type: 'ACHIEVEMENT_UNLOCKED', title: 'Achievement 2', timestamp: new Date() }
      ];

      vi.spyOn(gamificationService, 'getUserActivityTimeline').mockResolvedValue(mockActivities);

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      const timelineTab = screen.getByRole('tab', { name: 'Activity' });
      fireEvent.click(timelineTab);

      await waitFor(() => {
        const filterSelect = screen.getByLabelText('Filter activities');
        fireEvent.change(filterSelect, { target: { value: 'ACHIEVEMENT_UNLOCKED' } });
      });

      expect(screen.getByText('Achievement 1')).toBeInTheDocument();
      expect(screen.getByText('Achievement 2')).toBeInTheDocument();
      expect(screen.queryByText('Competition 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Level Up 1')).not.toBeInTheDocument();
    });
  });

  describe('Social Features', () => {
    it('should display followers and following counts', () => {
      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      expect(screen.getByTestId('followers-count')).toHaveTextContent('1,250');
      expect(screen.getByTestId('following-count')).toHaveTextContent('89');
    });

    it('should show mutual followers for other profiles', async () => {
      const mockMutualFollowers = [
        { id: 'user1', username: 'Trader1', avatar: '/avatar1.jpg' },
        { id: 'user2', username: 'Trader2', avatar: '/avatar2.jpg' },
        { id: 'user3', username: 'Trader3', avatar: '/avatar3.jpg' }
      ];

      vi.spyOn(competitionService, 'getMutualFollowers').mockResolvedValue(mockMutualFollowers);

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
          isOwnProfile={false}
          currentUserId="current123"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Followed by Trader1, Trader2 and 1 other')).toBeInTheDocument();
      });
    });

    it('should allow copying profile link', async () => {
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined)
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      const shareButton = screen.getByRole('button', { name: 'Share Profile' });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('/profile/user123')
        );
        expect(screen.getByText('Profile link copied!')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should show mobile-optimized layout on small screens', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
      window.dispatchEvent(new Event('resize'));

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      expect(screen.getByTestId('mobile-profile-layout')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-profile-layout')).not.toBeInTheDocument();
    });

    it('should show tabs instead of sidebar on mobile', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });

      render(
        <EnhancedProfile
          user={mockUser}
          gamificationService={gamificationService}
          competitionService={competitionService}
        />
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Stats' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Achievements' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Competitions' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument();
    });
  });
});