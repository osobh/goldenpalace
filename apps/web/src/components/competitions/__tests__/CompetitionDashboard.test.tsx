import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CompetitionDashboard } from '../CompetitionDashboard';
import { CompetitionService } from '../../../services/competition.service';
import React from 'react';

vi.mock('../../../services/competition.service');

describe('CompetitionDashboard', () => {
  let competitionService: CompetitionService;

  beforeEach(() => {
    competitionService = new CompetitionService();
    vi.clearAllMocks();
  });

  describe('Competition List', () => {
    it('should display active competitions', async () => {
      const mockCompetitions = [
        {
          id: 'comp1',
          name: 'Daily Trading Challenge',
          type: 'DAILY_PNL',
          status: 'ACTIVE',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-02'),
          entryFee: 100,
          prizePool: 10000,
          participants: 50,
          maxParticipants: 100,
          rules: { minTrades: 5 }
        },
        {
          id: 'comp2',
          name: 'Weekly ROI Contest',
          type: 'WEEKLY_ROI',
          status: 'ACTIVE',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-08'),
          entryFee: 500,
          prizePool: 50000,
          participants: 150,
          maxParticipants: 200,
          rules: { minBalance: 1000 }
        }
      ];

      vi.spyOn(competitionService, 'getActiveCompetitions').mockResolvedValue(mockCompetitions);

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      await waitFor(() => {
        expect(screen.getByText('Daily Trading Challenge')).toBeInTheDocument();
        expect(screen.getByText('Weekly ROI Contest')).toBeInTheDocument();
      });

      expect(screen.getByText('50 / 100')).toBeInTheDocument();
      expect(screen.getByText('150 / 200')).toBeInTheDocument();
      expect(screen.getByText('$10,000')).toBeInTheDocument();
      expect(screen.getByText('$50,000')).toBeInTheDocument();
    });

    it('should filter competitions by type', async () => {
      const mockCompetitions = [
        {
          id: 'comp1',
          name: 'Daily PnL Challenge',
          type: 'DAILY_PNL',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(),
          entryFee: 100,
          prizePool: 10000,
          participants: 50,
          maxParticipants: 100
        },
        {
          id: 'comp2',
          name: 'Monthly Volume Contest',
          type: 'MONTHLY_VOLUME',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(),
          entryFee: 200,
          prizePool: 20000,
          participants: 75,
          maxParticipants: 150
        }
      ];

      vi.spyOn(competitionService, 'getActiveCompetitions').mockResolvedValue(mockCompetitions);

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      await waitFor(() => {
        expect(screen.getByText('Daily PnL Challenge')).toBeInTheDocument();
      });

      const filterSelect = screen.getByLabelText('Filter by type');
      fireEvent.change(filterSelect, { target: { value: 'MONTHLY_VOLUME' } });

      expect(screen.queryByText('Daily PnL Challenge')).not.toBeInTheDocument();
      expect(screen.getByText('Monthly Volume Contest')).toBeInTheDocument();
    });

    it('should show competition countdown timer', async () => {
      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockCompetition = {
        id: 'comp1',
        name: 'Daily Challenge',
        type: 'DAILY_PNL',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate,
        entryFee: 100,
        prizePool: 10000,
        participants: 50,
        maxParticipants: 100
      };

      vi.spyOn(competitionService, 'getActiveCompetitions').mockResolvedValue([mockCompetition]);

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      await waitFor(() => {
        expect(screen.getByText(/Time remaining:/)).toBeInTheDocument();
        expect(screen.getByText(/23h \d+m \d+s/)).toBeInTheDocument();
      });
    });
  });

  describe('Join Competition', () => {
    it('should allow joining a competition', async () => {
      const mockCompetition = {
        id: 'comp1',
        name: 'Trading Contest',
        type: 'DAILY_PNL',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(),
        entryFee: 100,
        prizePool: 10000,
        participants: 50,
        maxParticipants: 100
      };

      vi.spyOn(competitionService, 'getActiveCompetitions').mockResolvedValue([mockCompetition]);
      vi.spyOn(competitionService, 'joinCompetition').mockResolvedValue({
        success: true,
        participantId: 'part1',
        message: 'Successfully joined competition'
      });

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      await waitFor(() => {
        expect(screen.getByText('Trading Contest')).toBeInTheDocument();
      });

      const joinButton = screen.getByRole('button', { name: /Join \(\$100\)/ });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText('Successfully joined competition')).toBeInTheDocument();
      });

      expect(competitionService.joinCompetition).toHaveBeenCalledWith('comp1', 'user1', expect.any(String));
    });

    it('should show error when join fails', async () => {
      const mockCompetition = {
        id: 'comp1',
        name: 'Trading Contest',
        type: 'DAILY_PNL',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(),
        entryFee: 100,
        prizePool: 10000,
        participants: 100,
        maxParticipants: 100
      };

      vi.spyOn(competitionService, 'getActiveCompetitions').mockResolvedValue([mockCompetition]);
      vi.spyOn(competitionService, 'joinCompetition').mockRejectedValue(
        new Error('Competition is full')
      );

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      await waitFor(() => {
        expect(screen.getByText('Trading Contest')).toBeInTheDocument();
      });

      const joinButton = screen.getByRole('button', { name: /Join \(\$100\)/ });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText('Competition is full')).toBeInTheDocument();
      });
    });

    it('should disable join button when competition is full', async () => {
      const mockCompetition = {
        id: 'comp1',
        name: 'Trading Contest',
        type: 'DAILY_PNL',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(),
        entryFee: 100,
        prizePool: 10000,
        participants: 100,
        maxParticipants: 100
      };

      vi.spyOn(competitionService, 'getActiveCompetitions').mockResolvedValue([mockCompetition]);

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      await waitFor(() => {
        const joinButton = screen.getByRole('button', { name: /Full/ });
        expect(joinButton).toBeDisabled();
      });
    });
  });

  describe('My Competitions', () => {
    it('should display user competitions', async () => {
      const mockParticipations = [
        {
          competitionId: 'comp1',
          competitionName: 'My Daily Contest',
          userId: 'user1',
          portfolioId: 'portfolio1',
          joinedAt: new Date(),
          score: 1500,
          rank: 3,
          pnl: 500,
          roi: 0.15
        },
        {
          competitionId: 'comp2',
          competitionName: 'Weekly Challenge',
          userId: 'user1',
          portfolioId: 'portfolio2',
          joinedAt: new Date(),
          score: 2000,
          rank: 1,
          pnl: 1000,
          roi: 0.25
        }
      ];

      vi.spyOn(competitionService, 'getUserCompetitions').mockResolvedValue(mockParticipations);

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      const myCompTab = screen.getByRole('tab', { name: 'My Competitions' });
      fireEvent.click(myCompTab);

      await waitFor(() => {
        expect(screen.getByText('My Daily Contest')).toBeInTheDocument();
        expect(screen.getByText('Weekly Challenge')).toBeInTheDocument();
      });

      expect(screen.getByText('#3')).toBeInTheDocument();
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('+$500')).toBeInTheDocument();
      expect(screen.getByText('+$1,000')).toBeInTheDocument();
      expect(screen.getByText('15.00%')).toBeInTheDocument();
      expect(screen.getByText('25.00%')).toBeInTheDocument();
    });

    it('should show trophy icon for top 3 positions', async () => {
      const mockParticipations = [
        {
          competitionId: 'comp1',
          competitionName: 'Contest 1',
          userId: 'user1',
          rank: 1,
          score: 3000,
          pnl: 1500
        },
        {
          competitionId: 'comp2',
          competitionName: 'Contest 2',
          userId: 'user1',
          rank: 2,
          score: 2500,
          pnl: 1200
        },
        {
          competitionId: 'comp3',
          competitionName: 'Contest 3',
          userId: 'user1',
          rank: 3,
          score: 2000,
          pnl: 1000
        },
        {
          competitionId: 'comp4',
          competitionName: 'Contest 4',
          userId: 'user1',
          rank: 10,
          score: 1000,
          pnl: 500
        }
      ];

      vi.spyOn(competitionService, 'getUserCompetitions').mockResolvedValue(mockParticipations);

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      const myCompTab = screen.getByRole('tab', { name: 'My Competitions' });
      fireEvent.click(myCompTab);

      await waitFor(() => {
        expect(screen.getByTestId('trophy-gold')).toBeInTheDocument();
        expect(screen.getByTestId('trophy-silver')).toBeInTheDocument();
        expect(screen.getByTestId('trophy-bronze')).toBeInTheDocument();
        expect(screen.queryByTestId('trophy-10')).not.toBeInTheDocument();
      });
    });
  });

  describe('Competition Details', () => {
    it('should show competition details modal', async () => {
      const mockCompetition = {
        id: 'comp1',
        name: 'Trading Marathon',
        type: 'MONTHLY_ROI',
        status: 'ACTIVE',
        description: 'Compete for the highest ROI this month',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        entryFee: 250,
        prizePool: 25000,
        participants: 80,
        maxParticipants: 100,
        rules: {
          minTrades: 10,
          minBalance: 5000,
          allowedAssets: ['BTC', 'ETH', 'AAPL', 'GOOGL']
        },
        prizes: [
          { position: 1, amount: 10000 },
          { position: 2, amount: 7500 },
          { position: 3, amount: 5000 },
          { position: '4-10', amount: 357 }
        ]
      };

      vi.spyOn(competitionService, 'getActiveCompetitions').mockResolvedValue([mockCompetition]);
      vi.spyOn(competitionService, 'getCompetitionById').mockResolvedValue(mockCompetition);

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      await waitFor(() => {
        expect(screen.getByText('Trading Marathon')).toBeInTheDocument();
      });

      const detailsButton = screen.getByRole('button', { name: 'View Details' });
      fireEvent.click(detailsButton);

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(within(modal).getByText('Trading Marathon')).toBeInTheDocument();
        expect(within(modal).getByText('Compete for the highest ROI this month')).toBeInTheDocument();
        expect(within(modal).getByText('Prize Distribution')).toBeInTheDocument();
        expect(within(modal).getByText('1st Place: $10,000')).toBeInTheDocument();
        expect(within(modal).getByText('2nd Place: $7,500')).toBeInTheDocument();
        expect(within(modal).getByText('3rd Place: $5,000')).toBeInTheDocument();
        expect(within(modal).getByText('4-10 Place: $357')).toBeInTheDocument();
      });
    });

    it('should show competition rules', async () => {
      const mockCompetition = {
        id: 'comp1',
        name: 'Contest',
        type: 'DAILY_PNL',
        status: 'ACTIVE',
        rules: {
          minTrades: 10,
          maxLeverage: 5,
          minBalance: 1000,
          allowShort: false
        }
      };

      vi.spyOn(competitionService, 'getActiveCompetitions').mockResolvedValue([mockCompetition]);
      vi.spyOn(competitionService, 'getCompetitionById').mockResolvedValue(mockCompetition);

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      await waitFor(() => {
        const detailsButton = screen.getByRole('button', { name: 'View Details' });
        fireEvent.click(detailsButton);
      });

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(within(modal).getByText('Competition Rules')).toBeInTheDocument();
        expect(within(modal).getByText('Minimum trades: 10')).toBeInTheDocument();
        expect(within(modal).getByText('Maximum leverage: 5x')).toBeInTheDocument();
        expect(within(modal).getByText('Minimum balance: $1,000')).toBeInTheDocument();
        expect(within(modal).getByText('Short selling: Not allowed')).toBeInTheDocument();
      });
    });
  });

  describe('Leaderboard Preview', () => {
    it('should show top 5 participants', async () => {
      const mockLeaderboard = [
        { userId: 'user2', username: 'TraderPro', score: 5000, pnl: 2500, roi: 0.5, rank: 1 },
        { userId: 'user3', username: 'CryptoKing', score: 4500, pnl: 2200, roi: 0.44, rank: 2 },
        { userId: 'user1', username: 'You', score: 4000, pnl: 2000, roi: 0.4, rank: 3 },
        { userId: 'user4', username: 'BullRunner', score: 3500, pnl: 1750, roi: 0.35, rank: 4 },
        { userId: 'user5', username: 'MoonShot', score: 3000, pnl: 1500, roi: 0.3, rank: 5 }
      ];

      vi.spyOn(competitionService, 'getActiveCompetitions').mockResolvedValue([
        { id: 'comp1', name: 'Contest', type: 'DAILY_PNL', status: 'ACTIVE' }
      ]);
      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      await waitFor(() => {
        const leaderboardSection = screen.getByTestId('leaderboard-preview');
        expect(within(leaderboardSection).getByText('TraderPro')).toBeInTheDocument();
        expect(within(leaderboardSection).getByText('CryptoKing')).toBeInTheDocument();
        expect(within(leaderboardSection).getByText('You')).toBeInTheDocument();
        expect(within(leaderboardSection).getByText('BullRunner')).toBeInTheDocument();
        expect(within(leaderboardSection).getByText('MoonShot')).toBeInTheDocument();
      });

      const userRow = screen.getByTestId('leaderboard-row-user1');
      expect(userRow).toHaveClass('highlight');
    });

    it('should navigate to full leaderboard', async () => {
      const onNavigate = vi.fn();

      vi.spyOn(competitionService, 'getActiveCompetitions').mockResolvedValue([
        { id: 'comp1', name: 'Contest', type: 'DAILY_PNL', status: 'ACTIVE' }
      ]);

      render(<CompetitionDashboard service={competitionService} userId="user1" onNavigate={onNavigate} />);

      await waitFor(() => {
        const viewFullButton = screen.getByRole('button', { name: 'View Full Leaderboard' });
        fireEvent.click(viewFullButton);
      });

      expect(onNavigate).toHaveBeenCalledWith('/competitions/comp1/leaderboard');
    });
  });

  describe('Competition Statistics', () => {
    it('should display competition statistics', async () => {
      const mockStats = {
        totalCompetitions: 15,
        wins: 3,
        top3Finishes: 7,
        totalEarnings: 25000,
        avgPosition: 8.5,
        winRate: 0.2,
        currentStreak: 2
      };

      vi.spyOn(competitionService, 'getUserStatistics').mockResolvedValue(mockStats);

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      const statsTab = screen.getByRole('tab', { name: 'Statistics' });
      fireEvent.click(statsTab);

      await waitFor(() => {
        expect(screen.getByText('Total Competitions')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('Wins')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('Top 3 Finishes')).toBeInTheDocument();
        expect(screen.getByText('7')).toBeInTheDocument();
        expect(screen.getByText('Total Earnings')).toBeInTheDocument();
        expect(screen.getByText('$25,000')).toBeInTheDocument();
        expect(screen.getByText('Win Rate')).toBeInTheDocument();
        expect(screen.getByText('20%')).toBeInTheDocument();
      });
    });

    it('should show competition history chart', async () => {
      const mockHistory = [
        { date: '2024-01-01', position: 5, earnings: 500 },
        { date: '2024-01-02', position: 3, earnings: 2000 },
        { date: '2024-01-03', position: 1, earnings: 5000 },
        { date: '2024-01-04', position: 8, earnings: 0 },
        { date: '2024-01-05', position: 2, earnings: 3000 }
      ];

      vi.spyOn(competitionService, 'getUserCompetitionHistory').mockResolvedValue(mockHistory);

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      const statsTab = screen.getByRole('tab', { name: 'Statistics' });
      fireEvent.click(statsTab);

      await waitFor(() => {
        expect(screen.getByTestId('competition-history-chart')).toBeInTheDocument();
        expect(screen.getByText('Competition Performance')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update leaderboard in real-time', async () => {
      const initialLeaderboard = [
        { userId: 'user1', username: 'You', score: 1000, rank: 5 }
      ];

      const updatedLeaderboard = [
        { userId: 'user1', username: 'You', score: 1500, rank: 3 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard')
        .mockResolvedValueOnce(initialLeaderboard)
        .mockResolvedValueOnce(updatedLeaderboard);

      vi.spyOn(competitionService, 'subscribeToLeaderboard').mockImplementation((compId, callback) => {
        setTimeout(() => callback(updatedLeaderboard), 100);
        return () => {};
      });

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      await waitFor(() => {
        expect(screen.getByText('#5')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('#3')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should show position change indicator', async () => {
      const mockLeaderboard = [
        { userId: 'user1', username: 'You', score: 2000, rank: 3, previousRank: 5 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      await waitFor(() => {
        const indicator = screen.getByTestId('position-change-up');
        expect(indicator).toBeInTheDocument();
        expect(indicator).toHaveTextContent('+2');
      });
    });
  });

  describe('Competition Creation', () => {
    it('should allow creating private competition', async () => {
      vi.spyOn(competitionService, 'createCompetition').mockResolvedValue({
        id: 'new-comp',
        name: 'Friends Trading Contest',
        type: 'DAILY_PNL',
        isPrivate: true,
        inviteCode: 'ABC123'
      });

      render(<CompetitionDashboard service={competitionService} userId="user1" isAdmin={true} />);

      const createButton = screen.getByRole('button', { name: 'Create Competition' });
      fireEvent.click(createButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText('Competition Name');
      const typeSelect = within(modal).getByLabelText('Competition Type');
      const entryFeeInput = within(modal).getByLabelText('Entry Fee');
      const prizePoolInput = within(modal).getByLabelText('Prize Pool');
      const privateCheckbox = within(modal).getByLabelText('Private Competition');

      fireEvent.change(nameInput, { target: { value: 'Friends Trading Contest' } });
      fireEvent.change(typeSelect, { target: { value: 'DAILY_PNL' } });
      fireEvent.change(entryFeeInput, { target: { value: '50' } });
      fireEvent.change(prizePoolInput, { target: { value: '1000' } });
      fireEvent.click(privateCheckbox);

      const submitButton = within(modal).getByRole('button', { name: 'Create' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Competition created successfully!')).toBeInTheDocument();
        expect(screen.getByText('Invite Code: ABC123')).toBeInTheDocument();
      });
    });

    it('should validate competition creation form', async () => {
      render(<CompetitionDashboard service={competitionService} userId="user1" isAdmin={true} />);

      const createButton = screen.getByRole('button', { name: 'Create Competition' });
      fireEvent.click(createButton);

      const modal = screen.getByRole('dialog');
      const submitButton = within(modal).getByRole('button', { name: 'Create' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(within(modal).getByText('Competition name is required')).toBeInTheDocument();
        expect(within(modal).getByText('Entry fee must be positive')).toBeInTheDocument();
        expect(within(modal).getByText('Prize pool must be positive')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', async () => {
      vi.spyOn(competitionService, 'getActiveCompetitions').mockResolvedValue([
        { id: 'comp1', name: 'Contest 1' },
        { id: 'comp2', name: 'Contest 2' }
      ]);

      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      await waitFor(() => {
        expect(screen.getByText('Contest 1')).toBeInTheDocument();
      });

      const firstJoinButton = screen.getAllByRole('button', { name: /Join/ })[0];
      firstJoinButton.focus();
      expect(document.activeElement).toBe(firstJoinButton);

      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
      expect(document.activeElement).not.toBe(firstJoinButton);
    });

    it('should have proper ARIA labels', async () => {
      render(<CompetitionDashboard service={competitionService} userId="user1" />);

      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Competition sections');
      expect(screen.getByRole('tab', { name: 'Active Competitions' })).toHaveAttribute('aria-selected');
    });
  });
});