import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Leaderboard } from '../Leaderboard';
import { CompetitionService } from '../../../services/competition.service';
import React from 'react';

vi.mock('../../../services/competition.service');

describe('Leaderboard', () => {
  let competitionService: CompetitionService;

  beforeEach(() => {
    competitionService = new CompetitionService();
    vi.clearAllMocks();
  });

  describe('Leaderboard Display', () => {
    it('should display leaderboard entries with rank, username, and score', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'AlphaTrader', score: 15000, pnl: 5000, roi: 0.5, totalTrades: 150, winRate: 0.65 },
        { rank: 2, userId: 'user2', username: 'BetaInvestor', score: 12000, pnl: 4000, roi: 0.4, totalTrades: 120, winRate: 0.60 },
        { rank: 3, userId: 'user3', username: 'GammaHedge', score: 10000, pnl: 3500, roi: 0.35, totalTrades: 100, winRate: 0.58 },
        { rank: 4, userId: 'user4', username: 'DeltaNeutral', score: 8000, pnl: 2800, roi: 0.28, totalTrades: 90, winRate: 0.55 },
        { rank: 5, userId: 'user5', username: 'ThetaDecay', score: 7500, pnl: 2500, roi: 0.25, totalTrades: 80, winRate: 0.53 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<Leaderboard service={competitionService} competitionId="comp1" />);

      await waitFor(() => {
        expect(screen.getByText('AlphaTrader')).toBeInTheDocument();
        expect(screen.getByText('BetaInvestor')).toBeInTheDocument();
        expect(screen.getByText('GammaHedge')).toBeInTheDocument();
        expect(screen.getByText('DeltaNeutral')).toBeInTheDocument();
        expect(screen.getByText('ThetaDecay')).toBeInTheDocument();
      });

      expect(screen.getByText('15,000')).toBeInTheDocument();
      expect(screen.getByText('12,000')).toBeInTheDocument();
      expect(screen.getByText('+$5,000')).toBeInTheDocument();
      expect(screen.getByText('50.00%')).toBeInTheDocument();
      expect(screen.getByText('65.00%')).toBeInTheDocument();
    });

    it('should highlight current user row', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'TopTrader', score: 10000 },
        { rank: 2, userId: 'currentUser', username: 'You', score: 8000 },
        { rank: 3, userId: 'user3', username: 'Trader3', score: 6000 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<Leaderboard service={competitionService} competitionId="comp1" currentUserId="currentUser" />);

      await waitFor(() => {
        const userRow = screen.getByTestId('leaderboard-row-currentUser');
        expect(userRow).toHaveClass('current-user');
      });
    });

    it('should show medals for top 3 positions', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'Gold', score: 10000 },
        { rank: 2, userId: 'user2', username: 'Silver', score: 8000 },
        { rank: 3, userId: 'user3', username: 'Bronze', score: 6000 },
        { rank: 4, userId: 'user4', username: 'Fourth', score: 5000 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<Leaderboard service={competitionService} competitionId="comp1" />);

      await waitFor(() => {
        expect(screen.getByTestId('medal-gold')).toBeInTheDocument();
        expect(screen.getByTestId('medal-silver')).toBeInTheDocument();
        expect(screen.getByTestId('medal-bronze')).toBeInTheDocument();
        expect(screen.queryByTestId('medal-4')).not.toBeInTheDocument();
      });
    });

    it('should display position changes', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'Climber', score: 10000, previousRank: 3 },
        { rank: 2, userId: 'user2', username: 'Steady', score: 8000, previousRank: 2 },
        { rank: 3, userId: 'user3', username: 'Faller', score: 6000, previousRank: 1 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<Leaderboard service={competitionService} competitionId="comp1" />);

      await waitFor(() => {
        const climberChange = screen.getByTestId('position-change-user1');
        expect(climberChange).toHaveClass('position-up');
        expect(climberChange).toHaveTextContent('▲ 2');

        const steadyRow = screen.getByTestId('leaderboard-row-user2');
        expect(within(steadyRow).queryByTestId(/position-change/)).not.toBeInTheDocument();

        const fallerChange = screen.getByTestId('position-change-user3');
        expect(fallerChange).toHaveClass('position-down');
        expect(fallerChange).toHaveTextContent('▼ 2');
      });
    });
  });

  describe('Pagination', () => {
    it('should paginate results', async () => {
      const mockLeaderboard = Array.from({ length: 25 }, (_, i) => ({
        rank: i + 1,
        userId: `user${i + 1}`,
        username: `Trader${i + 1}`,
        score: 10000 - i * 100
      }));

      vi.spyOn(competitionService, 'getLeaderboard')
        .mockResolvedValueOnce(mockLeaderboard.slice(0, 10))
        .mockResolvedValueOnce(mockLeaderboard.slice(10, 20))
        .mockResolvedValueOnce(mockLeaderboard.slice(20, 25));

      render(<Leaderboard service={competitionService} competitionId="comp1" pageSize={10} />);

      await waitFor(() => {
        expect(screen.getByText('Trader1')).toBeInTheDocument();
        expect(screen.getByText('Trader10')).toBeInTheDocument();
        expect(screen.queryByText('Trader11')).not.toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: 'Next' });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.queryByText('Trader1')).not.toBeInTheDocument();
        expect(screen.getByText('Trader11')).toBeInTheDocument();
        expect(screen.getByText('Trader20')).toBeInTheDocument();
      });

      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    });

    it('should disable pagination buttons appropriately', async () => {
      const mockLeaderboard = Array.from({ length: 5 }, (_, i) => ({
        rank: i + 1,
        userId: `user${i + 1}`,
        username: `Trader${i + 1}`,
        score: 10000 - i * 100
      }));

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<Leaderboard service={competitionService} competitionId="comp1" pageSize={10} />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: 'Previous' });
        const nextButton = screen.getByRole('button', { name: 'Next' });

        expect(prevButton).toBeDisabled();
        expect(nextButton).toBeDisabled();
      });
    });
  });

  describe('Sorting', () => {
    it('should sort by different columns', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'Alpha', score: 10000, pnl: 3000, winRate: 0.7 },
        { rank: 2, userId: 'user2', username: 'Beta', score: 8000, pnl: 4000, winRate: 0.6 },
        { rank: 3, userId: 'user3', username: 'Gamma', score: 6000, pnl: 2000, winRate: 0.8 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<Leaderboard service={competitionService} competitionId="comp1" />);

      await waitFor(() => {
        expect(screen.getByText('Alpha')).toBeInTheDocument();
      });

      const pnlHeader = screen.getByRole('columnheader', { name: /P&L/ });
      fireEvent.click(pnlHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('Beta')).toBeInTheDocument();
        expect(within(rows[2]).getByText('Alpha')).toBeInTheDocument();
        expect(within(rows[3]).getByText('Gamma')).toBeInTheDocument();
      });

      const winRateHeader = screen.getByRole('columnheader', { name: /Win Rate/ });
      fireEvent.click(winRateHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('Gamma')).toBeInTheDocument();
        expect(within(rows[2]).getByText('Alpha')).toBeInTheDocument();
        expect(within(rows[3]).getByText('Beta')).toBeInTheDocument();
      });
    });

    it('should toggle sort direction', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'User1', score: 10000 },
        { rank: 2, userId: 'user2', username: 'User2', score: 8000 },
        { rank: 3, userId: 'user3', username: 'User3', score: 6000 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<Leaderboard service={competitionService} competitionId="comp1" />);

      await waitFor(() => {
        expect(screen.getByText('User1')).toBeInTheDocument();
      });

      const scoreHeader = screen.getByRole('columnheader', { name: /Score/ });
      fireEvent.click(scoreHeader);

      await waitFor(() => {
        const sortIcon = within(scoreHeader).getByTestId('sort-desc');
        expect(sortIcon).toBeInTheDocument();
      });

      fireEvent.click(scoreHeader);

      await waitFor(() => {
        const sortIcon = within(scoreHeader).getByTestId('sort-asc');
        expect(sortIcon).toBeInTheDocument();

        const rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('User3')).toBeInTheDocument();
        expect(within(rows[2]).getByText('User2')).toBeInTheDocument();
        expect(within(rows[3]).getByText('User1')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter by username', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'AlphaTrader', score: 10000 },
        { rank: 2, userId: 'user2', username: 'BetaInvestor', score: 8000 },
        { rank: 3, userId: 'user3', username: 'AlphaBeta', score: 6000 },
        { rank: 4, userId: 'user4', username: 'GammaTrader', score: 5000 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<Leaderboard service={competitionService} competitionId="comp1" />);

      await waitFor(() => {
        expect(screen.getByText('AlphaTrader')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by username...');
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });

      await waitFor(() => {
        expect(screen.getByText('AlphaTrader')).toBeInTheDocument();
        expect(screen.getByText('AlphaBeta')).toBeInTheDocument();
        expect(screen.queryByText('BetaInvestor')).not.toBeInTheDocument();
        expect(screen.queryByText('GammaTrader')).not.toBeInTheDocument();
      });
    });

    it('should show message when no results match filter', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'Trader1', score: 10000 },
        { rank: 2, userId: 'user2', username: 'Trader2', score: 8000 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<Leaderboard service={competitionService} competitionId="comp1" />);

      await waitFor(() => {
        expect(screen.getByText('Trader1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by username...');
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

      await waitFor(() => {
        expect(screen.getByText('No traders found matching your search')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update leaderboard in real-time', async () => {
      const initialLeaderboard = [
        { rank: 1, userId: 'user1', username: 'Leader', score: 10000 },
        { rank: 2, userId: 'user2', username: 'Follower', score: 8000 }
      ];

      const updatedLeaderboard = [
        { rank: 1, userId: 'user2', username: 'Follower', score: 11000 },
        { rank: 2, userId: 'user1', username: 'Leader', score: 10000 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValueOnce(initialLeaderboard);
      vi.spyOn(competitionService, 'subscribeToLeaderboard').mockImplementation((id, callback) => {
        setTimeout(() => callback(updatedLeaderboard), 100);
        return () => {};
      });

      render(<Leaderboard service={competitionService} competitionId="comp1" realTimeUpdates={true} />);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('Leader')).toBeInTheDocument();
        expect(within(rows[1]).getByText('1')).toBeInTheDocument();
      });

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('Follower')).toBeInTheDocument();
        expect(within(rows[1]).getByText('1')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should show update indicator when data refreshes', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'Trader1', score: 10000 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);
      vi.spyOn(competitionService, 'subscribeToLeaderboard').mockImplementation((id, callback) => {
        setTimeout(() => callback(mockLeaderboard), 100);
        return () => {};
      });

      render(<Leaderboard service={competitionService} competitionId="comp1" realTimeUpdates={true} />);

      await waitFor(() => {
        expect(screen.getByText('Trader1')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('update-indicator')).toBeInTheDocument();
      }, { timeout: 200 });

      await waitFor(() => {
        expect(screen.queryByTestId('update-indicator')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Statistics Display', () => {
    it('should display competition statistics', async () => {
      const mockLeaderboard = Array.from({ length: 100 }, (_, i) => ({
        rank: i + 1,
        userId: `user${i + 1}`,
        username: `Trader${i + 1}`,
        score: 10000 - i * 50,
        pnl: 5000 - i * 25,
        winRate: 0.7 - i * 0.005
      }));

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard.slice(0, 10));

      render(<Leaderboard service={competitionService} competitionId="comp1" showStats={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('total-participants')).toHaveTextContent('100');
        expect(screen.getByTestId('avg-score')).toHaveTextContent('7,525');
        expect(screen.getByTestId('top-score')).toHaveTextContent('10,000');
        expect(screen.getByTestId('avg-win-rate')).toHaveTextContent('45.25%');
      });
    });
  });

  describe('Export Functionality', () => {
    it('should export leaderboard as CSV', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'Trader1', score: 10000, pnl: 5000, roi: 0.5 },
        { rank: 2, userId: 'user2', username: 'Trader2', score: 8000, pnl: 4000, roi: 0.4 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      const mockDownload = vi.fn();
      global.URL.createObjectURL = vi.fn();
      global.document.createElement = vi.fn().mockImplementation((tag) => {
        if (tag === 'a') {
          return {
            click: mockDownload,
            setAttribute: vi.fn(),
            style: {}
          };
        }
        return {};
      });

      render(<Leaderboard service={competitionService} competitionId="comp1" showExport={true} />);

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: 'Export CSV' });
        fireEvent.click(exportButton);
      });

      expect(mockDownload).toHaveBeenCalled();
    });

    it('should export leaderboard as JSON', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'Trader1', score: 10000 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      const mockDownload = vi.fn();
      global.URL.createObjectURL = vi.fn();
      global.document.createElement = vi.fn().mockImplementation((tag) => {
        if (tag === 'a') {
          return {
            click: mockDownload,
            setAttribute: vi.fn(),
            style: {}
          };
        }
        return {};
      });

      render(<Leaderboard service={competitionService} competitionId="comp1" showExport={true} />);

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: 'Export JSON' });
        fireEvent.click(exportButton);
      });

      expect(mockDownload).toHaveBeenCalled();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should show condensed view on mobile', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'Trader1', score: 10000, pnl: 5000 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
      window.dispatchEvent(new Event('resize'));

      render(<Leaderboard service={competitionService} competitionId="comp1" />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-leaderboard')).toBeInTheDocument();
        expect(screen.queryByTestId('desktop-leaderboard')).not.toBeInTheDocument();
      });
    });

    it('should show swipeable cards on mobile', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'Trader1', score: 10000 },
        { rank: 2, userId: 'user2', username: 'Trader2', score: 8000 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });

      render(<Leaderboard service={competitionService} competitionId="comp1" />);

      await waitFor(() => {
        const cards = screen.getAllByTestId(/leaderboard-card/);
        expect(cards).toHaveLength(2);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'Trader1', score: 10000 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<Leaderboard service={competitionService} competitionId="comp1" />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Competition leaderboard');
        expect(screen.getByRole('columnheader', { name: /Rank/ })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /Trader/ })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /Score/ })).toBeInTheDocument();
      });
    });

    it('should be keyboard navigable', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'Trader1', score: 10000 },
        { rank: 2, userId: 'user2', username: 'Trader2', score: 8000 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<Leaderboard service={competitionService} competitionId="comp1" />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search by username...');
        searchInput.focus();
        expect(document.activeElement).toBe(searchInput);

        fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
        expect(document.activeElement).toHaveAttribute('role', 'columnheader');
      });
    });

    it('should announce updates to screen readers', async () => {
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', username: 'Trader1', score: 10000 }
      ];

      vi.spyOn(competitionService, 'getLeaderboard').mockResolvedValue(mockLeaderboard);

      render(<Leaderboard service={competitionService} competitionId="comp1" />);

      await waitFor(() => {
        const liveRegion = screen.getByRole('status', { hidden: true });
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});