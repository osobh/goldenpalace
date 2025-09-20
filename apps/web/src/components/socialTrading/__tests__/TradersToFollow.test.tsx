import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TradersToFollow } from '../TradersToFollow';
import { SocialTradingService } from '../../../services/socialTrading.service';
import { WebSocketService } from '../../../services/websocket.service';

// Mock trader data for testing
const mockTraders = [
  {
    id: 'trader-1',
    username: 'ProTrader',
    displayName: 'Pro Trader',
    avatar: 'https://example.com/avatar1.jpg',
    verified: true,
    followerCount: 1250,
    followingCount: 120,
    joinDate: new Date('2023-01-15'),
    bio: 'Professional trader with 10+ years experience',
    performance: {
      roi: 0.35,
      winRate: 0.72,
      totalTrades: 450,
      averageHoldTime: 2.5,
      maxDrawdown: 0.15,
      sharpeRatio: 1.8,
      monthlyReturns: [0.05, 0.03, -0.01, 0.08, 0.04, 0.02]
    },
    statistics: {
      totalVolume: 2500000,
      profitableDays: 180,
      totalDays: 250,
      averageTradeSize: 5000,
      riskScore: 6.5,
      consistency: 0.85
    },
    recentTrades: [],
    ranking: {
      overall: 12,
      category: 'Growth',
      percentile: 0.95
    }
  },
  {
    id: 'trader-2',
    username: 'RiskMaster',
    displayName: 'Risk Master',
    avatar: 'https://example.com/avatar2.jpg',
    verified: false,
    followerCount: 890,
    followingCount: 200,
    joinDate: new Date('2023-03-20'),
    bio: 'Conservative trader focused on capital preservation',
    performance: {
      roi: 0.18,
      winRate: 0.65,
      totalTrades: 320,
      averageHoldTime: 5.2,
      maxDrawdown: 0.08,
      sharpeRatio: 2.2,
      monthlyReturns: [0.02, 0.015, 0.01, 0.025, 0.018, 0.012]
    },
    statistics: {
      totalVolume: 1200000,
      profitableDays: 160,
      totalDays: 245,
      averageTradeSize: 3750,
      riskScore: 3.2,
      consistency: 0.92
    },
    recentTrades: [],
    ranking: {
      overall: 45,
      category: 'Conservative',
      percentile: 0.82
    }
  }
];

describe('TradersToFollow', () => {
  let mockSocialTradingService: SocialTradingService;
  let mockWebSocketService: WebSocketService;

  beforeEach(() => {
    mockWebSocketService = new WebSocketService('ws://localhost:3001');
    mockSocialTradingService = new SocialTradingService(mockWebSocketService);

    // Mock service methods
    vi.spyOn(mockSocialTradingService, 'getTopTraders').mockResolvedValue(mockTraders);
    vi.spyOn(mockSocialTradingService, 'searchTraders').mockResolvedValue(mockTraders);
    vi.spyOn(mockSocialTradingService, 'getTraderDetails').mockResolvedValue(mockTraders[0]);
    vi.spyOn(mockSocialTradingService, 'followTrader').mockResolvedValue({
      success: true,
      followerId: 'follower-123',
      settings: {
        allocation: 0.1,
        maxRiskPerTrade: 0.02,
        stopLoss: 0.05,
        takeProfit: 0.1
      }
    });
    vi.spyOn(mockSocialTradingService, 'unfollowTrader').mockResolvedValue({
      success: true,
      message: 'Successfully unfollowed trader'
    });
    vi.spyOn(mockSocialTradingService, 'getFollowedTraders').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockSocialTradingService.cleanup();
    mockWebSocketService.disconnect();
  });

  describe('Initial Rendering', () => {
    it('should render the traders to follow component', async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      expect(screen.getByText('Traders to Follow')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search traders...')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument();
    });

    it('should load and display top traders on mount', async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
        expect(screen.getByText('RiskMaster')).toBeInTheDocument();
      });

      expect(mockSocialTradingService.getTopTraders).toHaveBeenCalledWith({
        sortBy: 'performance',
        limit: 20
      });
    });

    it('should show loading state while fetching traders', () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      expect(screen.getByTestId('traders-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading traders...')).toBeInTheDocument();
    });

    it('should handle empty traders list', async () => {
      vi.spyOn(mockSocialTradingService, 'getTopTraders').mockResolvedValue([]);

      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('No traders found')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('should search traders when typing in search input', async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      const searchInput = screen.getByPlaceholderText('Search traders...');
      fireEvent.change(searchInput, { target: { value: 'Pro' } });

      await waitFor(() => {
        expect(mockSocialTradingService.searchTraders).toHaveBeenCalledWith('Pro');
      });
    });

    it('should debounce search input to avoid excessive API calls', async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      const searchInput = screen.getByPlaceholderText('Search traders...');
      fireEvent.change(searchInput, { target: { value: 'P' } });
      fireEvent.change(searchInput, { target: { value: 'Pr' } });
      fireEvent.change(searchInput, { target: { value: 'Pro' } });

      // Should only call search once after debounce
      await waitFor(() => {
        expect(mockSocialTradingService.searchTraders).toHaveBeenCalledTimes(1);
        expect(mockSocialTradingService.searchTraders).toHaveBeenCalledWith('Pro');
      });
    });

    it('should clear search and reload top traders when search is cleared', async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      const searchInput = screen.getByPlaceholderText('Search traders...');
      fireEvent.change(searchInput, { target: { value: 'Pro' } });

      await waitFor(() => {
        expect(mockSocialTradingService.searchTraders).toHaveBeenCalled();
      });

      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(mockSocialTradingService.getTopTraders).toHaveBeenCalledTimes(2);
      });
    });

    it('should sort traders by different criteria', async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      const sortSelect = screen.getByRole('combobox', { name: /sort by/i });

      fireEvent.change(sortSelect, { target: { value: 'followers' } });

      await waitFor(() => {
        expect(mockSocialTradingService.getTopTraders).toHaveBeenCalledWith({
          sortBy: 'followers',
          limit: 20
        });
      });

      fireEvent.change(sortSelect, { target: { value: 'winRate' } });

      await waitFor(() => {
        expect(mockSocialTradingService.getTopTraders).toHaveBeenCalledWith({
          sortBy: 'winRate',
          limit: 20
        });
      });
    });

    it('should apply performance filters', async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      // Open filters panel
      const filtersButton = screen.getByText('Filters');
      fireEvent.click(filtersButton);

      // Set minimum ROI filter
      const minRoiInput = screen.getByLabelText('Minimum ROI (%)');
      fireEvent.change(minRoiInput, { target: { value: '20' } });

      // Set minimum win rate filter
      const minWinRateInput = screen.getByLabelText('Minimum Win Rate (%)');
      fireEvent.change(minWinRateInput, { target: { value: '60' } });

      // Apply filters
      const applyButton = screen.getByText('Apply Filters');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSocialTradingService.getTopTraders).toHaveBeenCalledWith({
          sortBy: 'performance',
          limit: 20,
          filters: {
            minRoi: 0.2,
            minWinRate: 0.6
          }
        });
      });
    });

    it('should reset all filters when reset button is clicked', async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      // Open filters and set some values
      const filtersButton = screen.getByText('Filters');
      fireEvent.click(filtersButton);

      const minRoiInput = screen.getByLabelText('Minimum ROI (%)');
      fireEvent.change(minRoiInput, { target: { value: '20' } });

      // Reset filters
      const resetButton = screen.getByText('Reset Filters');
      fireEvent.click(resetButton);

      expect(minRoiInput).toHaveValue('');

      // Apply should call with no filters
      const applyButton = screen.getByText('Apply Filters');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockSocialTradingService.getTopTraders).toHaveBeenCalledWith({
          sortBy: 'performance',
          limit: 20
        });
      });
    });
  });

  describe('Trader Cards Display', () => {
    beforeEach(async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);
      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });
    });

    it('should display trader information correctly', () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');

      expect(within(proTraderCard).getByText('ProTrader')).toBeInTheDocument();
      expect(within(proTraderCard).getByText('Pro Trader')).toBeInTheDocument();
      expect(within(proTraderCard).getByText('Professional trader with 10+ years experience')).toBeInTheDocument();
      expect(within(proTraderCard).getByText('1,250')).toBeInTheDocument(); // followers
      expect(within(proTraderCard).getByText('35.00%')).toBeInTheDocument(); // ROI
      expect(within(proTraderCard).getByText('72.00%')).toBeInTheDocument(); // win rate
    });

    it('should show verified badge for verified traders', () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      expect(within(proTraderCard).getByTestId('verified-badge')).toBeInTheDocument();

      const riskMasterCard = screen.getByTestId('trader-card-trader-2');
      expect(within(riskMasterCard).queryByTestId('verified-badge')).not.toBeInTheDocument();
    });

    it('should display performance metrics with correct formatting', () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');

      expect(within(proTraderCard).getByText('450')).toBeInTheDocument(); // total trades
      expect(within(proTraderCard).getByText('2.5 days')).toBeInTheDocument(); // avg hold time
      expect(within(proTraderCard).getByText('-15.00%')).toBeInTheDocument(); // max drawdown
      expect(within(proTraderCard).getByText('1.8')).toBeInTheDocument(); // sharpe ratio
    });

    it('should show ranking information', () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');

      expect(within(proTraderCard).getByText('#12')).toBeInTheDocument(); // overall rank
      expect(within(proTraderCard).getByText('Growth')).toBeInTheDocument(); // category
      expect(within(proTraderCard).getByText('Top 5%')).toBeInTheDocument(); // percentile
    });

    it('should display recent performance chart placeholder', () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      expect(within(proTraderCard).getByTestId('performance-chart')).toBeInTheDocument();
    });
  });

  describe('Following/Unfollowing Traders', () => {
    beforeEach(async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);
      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });
    });

    it('should follow a trader when follow button is clicked', async () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      const followButton = within(proTraderCard).getByText('Follow');

      fireEvent.click(followButton);

      await waitFor(() => {
        expect(mockSocialTradingService.followTrader).toHaveBeenCalledWith('trader-1', undefined);
      });

      // Button should change to "Following"
      expect(within(proTraderCard).getByText('Following')).toBeInTheDocument();
    });

    it('should unfollow a trader when following button is clicked', async () => {
      // Mock that trader is already being followed
      vi.spyOn(mockSocialTradingService, 'getFollowedTraders').mockResolvedValue([
        {
          traderId: 'trader-1',
          trader: mockTraders[0],
          settings: {
            allocation: 0.1,
            maxRiskPerTrade: 0.02
          },
          followedDate: new Date(),
          performance: {
            totalReturn: 0.15,
            winRate: 0.7,
            tradesCount: 10,
            fees: 25.5
          },
          status: 'active'
        }
      ]);

      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      const followingButton = within(proTraderCard).getByText('Following');

      fireEvent.click(followingButton);

      await waitFor(() => {
        expect(mockSocialTradingService.unfollowTrader).toHaveBeenCalledWith('trader-1');
      });

      // Button should change back to "Follow"
      expect(within(proTraderCard).getByText('Follow')).toBeInTheDocument();
    });

    it('should open copy settings modal when follow with settings button is clicked', async () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      const settingsButton = within(proTraderCard).getByText('Follow with Settings');

      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByTestId('copy-settings-modal')).toBeInTheDocument();
      });

      expect(screen.getByText('Copy Trading Settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Allocation (%)')).toBeInTheDocument();
      expect(screen.getByLabelText('Max Risk per Trade (%)')).toBeInTheDocument();
    });

    it('should follow trader with custom settings from modal', async () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      const settingsButton = within(proTraderCard).getByText('Follow with Settings');

      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByTestId('copy-settings-modal')).toBeInTheDocument();
      });

      // Set custom settings
      const allocationInput = screen.getByLabelText('Allocation (%)');
      fireEvent.change(allocationInput, { target: { value: '15' } });

      const maxRiskInput = screen.getByLabelText('Max Risk per Trade (%)');
      fireEvent.change(maxRiskInput, { target: { value: '3' } });

      const stopLossInput = screen.getByLabelText('Stop Loss (%)');
      fireEvent.change(stopLossInput, { target: { value: '8' } });

      const followButton = screen.getByTestId('follow-with-settings-button');
      fireEvent.click(followButton);

      await waitFor(() => {
        expect(mockSocialTradingService.followTrader).toHaveBeenCalledWith('trader-1', {
          allocation: 0.15,
          maxRiskPerTrade: 0.03,
          stopLoss: 0.08
        });
      });

      // Modal should close
      expect(screen.queryByTestId('copy-settings-modal')).not.toBeInTheDocument();
    });

    it('should validate copy settings before following', async () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      const settingsButton = within(proTraderCard).getByText('Follow with Settings');

      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByTestId('copy-settings-modal')).toBeInTheDocument();
      });

      // Set invalid settings (allocation > 100%)
      const allocationInput = screen.getByLabelText('Allocation (%)');
      fireEvent.change(allocationInput, { target: { value: '150' } });

      const followButton = screen.getByTestId('follow-with-settings-button');
      fireEvent.click(followButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Allocation must be between 1% and 50%')).toBeInTheDocument();
      });

      // Should not call followTrader
      expect(mockSocialTradingService.followTrader).not.toHaveBeenCalled();
    });
  });

  describe('Trader Details Modal', () => {
    beforeEach(async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);
      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });
    });

    it('should open trader details modal when trader card is clicked', async () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      fireEvent.click(proTraderCard);

      await waitFor(() => {
        expect(screen.getByTestId('trader-details-modal')).toBeInTheDocument();
      });

      expect(mockSocialTradingService.getTraderDetails).toHaveBeenCalledWith('trader-1');
    });

    it('should display detailed trader information in modal', async () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      fireEvent.click(proTraderCard);

      await waitFor(() => {
        expect(screen.getByTestId('trader-details-modal')).toBeInTheDocument();
      });

      expect(screen.getByText('Professional trader with 10+ years experience')).toBeInTheDocument();
      expect(screen.getByText('January 15, 2023')).toBeInTheDocument(); // join date
      expect(screen.getByText('$2,500,000')).toBeInTheDocument(); // total volume
      expect(screen.getByText('6.5/10')).toBeInTheDocument(); // risk score
    });

    it('should show performance history chart in modal', async () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      fireEvent.click(proTraderCard);

      await waitFor(() => {
        expect(screen.getByTestId('trader-details-modal')).toBeInTheDocument();
      });

      expect(screen.getByTestId('performance-history-chart')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', async () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      fireEvent.click(proTraderCard);

      await waitFor(() => {
        expect(screen.getByTestId('trader-details-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId('close-modal-button');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('trader-details-modal')).not.toBeInTheDocument();
      });
    });

    it('should close modal when clicking outside modal content', async () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      fireEvent.click(proTraderCard);

      await waitFor(() => {
        expect(screen.getByTestId('trader-details-modal')).toBeInTheDocument();
      });

      const modalOverlay = screen.getByTestId('modal-overlay');
      fireEvent.click(modalOverlay);

      await waitFor(() => {
        expect(screen.queryByTestId('trader-details-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should load more traders when load more button is clicked', async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByText('Load More');
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        expect(mockSocialTradingService.getTopTraders).toHaveBeenCalledWith({
          sortBy: 'performance',
          limit: 20,
          offset: 20
        });
      });
    });

    it('should hide load more button when all traders are loaded', async () => {
      // Mock service to return less than limit
      vi.spyOn(mockSocialTradingService, 'getTopTraders').mockResolvedValue([mockTraders[0]]);

      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      expect(screen.queryByText('Load More')).not.toBeInTheDocument();
    });

    it('should show loading state for load more button', async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByText('Load More');
      fireEvent.click(loadMoreButton);

      expect(screen.getByText('Loading More...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle trader loading errors gracefully', async () => {
      vi.spyOn(mockSocialTradingService, 'getTopTraders').mockRejectedValue(new Error('Network error'));

      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load traders')).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockSocialTradingService.getTopTraders).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle follow trader errors', async () => {
      vi.spyOn(mockSocialTradingService, 'followTrader').mockResolvedValue({
        success: false,
        followerId: '',
        settings: {} as any,
        message: 'Insufficient funds'
      });

      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      const followButton = within(proTraderCard).getByText('Follow');

      fireEvent.click(followButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to follow trader: Insufficient funds')).toBeInTheDocument();
      });
    });

    it('should handle search errors', async () => {
      vi.spyOn(mockSocialTradingService, 'searchTraders').mockRejectedValue(new Error('Search failed'));

      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      const searchInput = screen.getByPlaceholderText('Search traders...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await waitFor(() => {
        expect(screen.getByText('Search failed. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should show mobile layout on small screens', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      expect(screen.getByTestId('mobile-traders-layout')).toBeInTheDocument();
    });

    it('should show desktop layout on large screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      expect(screen.getByTestId('desktop-traders-layout')).toBeInTheDocument();
    });

    it('should adjust grid layout based on screen size', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      const tradersGrid = screen.getByTestId('traders-grid');
      expect(tradersGrid).toHaveClass('desktop-grid');
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);
      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels', () => {
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Traders to follow');
      expect(screen.getByRole('search')).toHaveAttribute('aria-label', 'Search traders');
      expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const firstTraderCard = screen.getByTestId('trader-card-trader-1');

      firstTraderCard.focus();
      expect(firstTraderCard).toHaveFocus();

      fireEvent.keyDown(firstTraderCard, { key: 'Enter' });

      expect(screen.getByTestId('trader-details-modal')).toBeInTheDocument();
    });

    it('should have descriptive button labels', () => {
      expect(screen.getByLabelText('Follow ProTrader')).toBeInTheDocument();
      expect(screen.getByLabelText('Follow RiskMaster')).toBeInTheDocument();
    });

    it('should announce status changes to screen readers', async () => {
      const proTraderCard = screen.getByTestId('trader-card-trader-1');
      const followButton = within(proTraderCard).getByText('Follow');

      fireEvent.click(followButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Following ProTrader');
      });
    });
  });

  describe('Performance', () => {
    it('should debounce search input to prevent excessive API calls', async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      const searchInput = screen.getByPlaceholderText('Search traders...');

      // Rapid typing should only trigger one search
      fireEvent.change(searchInput, { target: { value: 'a' } });
      fireEvent.change(searchInput, { target: { value: 'ab' } });
      fireEvent.change(searchInput, { target: { value: 'abc' } });

      await waitFor(() => {
        expect(mockSocialTradingService.searchTraders).toHaveBeenCalledTimes(1);
      });
    });

    it('should virtualize trader list for large datasets', async () => {
      // Generate large dataset
      const manyTraders = Array.from({ length: 100 }, (_, i) => ({
        ...mockTraders[0],
        id: `trader-${i}`,
        username: `Trader${i}`
      }));

      vi.spyOn(mockSocialTradingService, 'getTopTraders').mockResolvedValue(manyTraders);

      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-traders-list')).toBeInTheDocument();
      });

      // Should only render visible items
      const visibleCards = screen.getAllByTestId(/^trader-card-/);
      expect(visibleCards.length).toBeLessThan(100);
    });

    it('should cache trader data to avoid repeated requests', async () => {
      render(<TradersToFollow socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      // Switch to different sort and back
      const sortSelect = screen.getByRole('combobox', { name: /sort by/i });
      fireEvent.change(sortSelect, { target: { value: 'followers' } });

      await waitFor(() => {
        expect(mockSocialTradingService.getTopTraders).toHaveBeenCalledWith({
          sortBy: 'followers',
          limit: 20
        });
      });

      fireEvent.change(sortSelect, { target: { value: 'performance' } });

      // Should use cached data, not make new request
      expect(mockSocialTradingService.getTopTraders).toHaveBeenCalledTimes(2);
    });
  });
});