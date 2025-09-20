import React, { act } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import TraderRating from '../TraderRating';
import { SocialTradingService } from '../../../services/socialTrading.service';
import { WebSocketService } from '../../../services/websocket.service';

// Mock trader data for testing
const mockTrader = {
  id: 'trader-1',
  username: 'ProTrader',
  displayName: 'Professional Trader',
  avatar: 'https://example.com/avatar1.jpg',
  verified: true,
  followerCount: 1250,
  performance: {
    roi: 0.35,
    winRate: 0.72,
    totalTrades: 450,
    averageHoldTime: 2.5,
    maxDrawdown: 0.15,
    sharpeRatio: 1.8
  },
  statistics: {
    totalVolume: 2500000,
    profitableDays: 180,
    totalDays: 250,
    averageTradeSize: 5000,
    riskScore: 6.5,
    consistency: 0.85
  }
};

// Mock ratings data
const mockRatings = {
  averageRating: 4.5,
  totalRatings: 234,
  distribution: {
    5: 156,
    4: 48,
    3: 18,
    2: 8,
    1: 4
  },
  reviews: [
    {
      id: 'review-1',
      userId: 'user-1',
      username: 'HappyTrader',
      displayName: 'Happy Trader',
      avatar: 'https://example.com/avatar2.jpg',
      rating: 5,
      title: 'Excellent trader to follow',
      comment: 'Very consistent returns and great risk management. Highly recommended!',
      helpful: 45,
      timestamp: new Date('2024-12-01'),
      verified: true
    },
    {
      id: 'review-2',
      userId: 'user-2',
      username: 'CautiousInvestor',
      displayName: 'Cautious Investor',
      avatar: 'https://example.com/avatar3.jpg',
      rating: 4,
      title: 'Good but occasionally risky',
      comment: 'Generally good performance but some trades are too risky for my preference.',
      helpful: 23,
      timestamp: new Date('2024-11-28'),
      verified: false
    },
    {
      id: 'review-3',
      userId: 'user-3',
      username: 'TechAnalyst',
      displayName: 'Tech Analyst',
      avatar: 'https://example.com/avatar4.jpg',
      rating: 5,
      title: 'Professional and transparent',
      comment: 'Always explains their strategy clearly. Great communication with followers.',
      helpful: 67,
      timestamp: new Date('2024-11-25'),
      verified: true
    }
  ],
  userHasRated: false
};

describe('TraderRating', () => {
  let mockSocialTradingService: SocialTradingService;
  let mockWebSocketService: WebSocketService;

  beforeEach(() => {
    mockWebSocketService = new WebSocketService('ws://localhost:3001');
    mockSocialTradingService = new SocialTradingService(mockWebSocketService);

    // Mock service methods
    vi.spyOn(mockSocialTradingService, 'getTraderDetails').mockResolvedValue(mockTrader);
    vi.spyOn(mockSocialTradingService, 'getTraderRatings').mockResolvedValue(mockRatings);
    vi.spyOn(mockSocialTradingService, 'rateTrader').mockResolvedValue({
      success: true,
      rating: {
        id: 'review-new',
        rating: 5,
        title: 'Great trader',
        comment: 'Excellent performance'
      }
    });
    vi.spyOn(mockSocialTradingService, 'subscribeToLiveUpdates').mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockSocialTradingService.cleanup();
    mockWebSocketService.disconnect();
  });

  describe('Rating Display', () => {
    it('should render trader rating component', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const ratingElement = screen.getByRole('region', { name: 'Trader ratings and reviews' });
        expect(ratingElement).toBeInTheDocument();
      });
    });

    it('should display average rating', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('4.5')).toBeInTheDocument();
        expect(screen.getByText('234 ratings')).toBeInTheDocument();
      });
    });

    it('should show rating distribution', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByTestId('rating-label-5')).toHaveTextContent('5 stars');
        expect(screen.getByText('156')).toBeInTheDocument();
        expect(screen.getByTestId('rating-label-4')).toHaveTextContent('4 stars');
        expect(screen.getByText('48')).toBeInTheDocument();
      });
    });

    it('should display star rating visualization', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const averageRatingSection = screen.getByLabelText('Average rating: 4.5 out of 5');
        const starsWithin = within(averageRatingSection);

        // 4.5 rating means 4 full stars and 1 half star
        expect(starsWithin.getAllByTestId('star-filled')).toHaveLength(4);
        expect(starsWithin.getByTestId('star-half')).toBeInTheDocument();
      });
    });

    it('should show rating bars for distribution', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const bars = screen.getAllByTestId(/rating-bar-/);
        expect(bars).toHaveLength(5);
        // 5-star bar should be the longest (156/234 = 66.7%)
        expect(bars[0]).toHaveStyle({ width: '66.7%' });
      });
    });
  });

  describe('Reviews Display', () => {
    it('should display reviews list', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Excellent trader to follow')).toBeInTheDocument();
        expect(screen.getByText('Good but occasionally risky')).toBeInTheDocument();
        expect(screen.getByText('Professional and transparent')).toBeInTheDocument();
      });
    });

    it('should show reviewer information', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Happy Trader')).toBeInTheDocument();
        expect(screen.getByText('Cautious Investor')).toBeInTheDocument();
        expect(screen.getByText('Tech Analyst')).toBeInTheDocument();
      });
    });

    it('should display review timestamps', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText(/Dec 1, 2024/)).toBeInTheDocument();
        expect(screen.getByText(/Nov 28, 2024/)).toBeInTheDocument();
      });
    });

    it('should show helpful counts', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('👍 45 found this helpful')).toBeInTheDocument();
        expect(screen.getByText('👍 23 found this helpful')).toBeInTheDocument();
        expect(screen.getByText('👍 67 found this helpful')).toBeInTheDocument();
      });
    });

    it('should show verified purchase badges', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const verifiedBadges = screen.getAllByTestId('verified-purchase');
        expect(verifiedBadges).toHaveLength(2); // Two verified reviews
      });
    });
  });

  describe('Rating Submission', () => {
    it('should show rating form when user has not rated', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByTestId('rate-trader-button')).toBeInTheDocument();
      });
    });

    it('should open rating modal on button click', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      const rateButton = await screen.findByTestId('rate-trader-button');
      fireEvent.click(rateButton);

      expect(screen.getByTestId('rating-modal')).toBeInTheDocument();
      // Modal shows "Rate {trader.displayName}" which is "Rate Professional Trader"
      const rateTexts = screen.getAllByText('Rate Professional Trader');
      expect(rateTexts).toHaveLength(2); // Button and modal heading
    });

    it('should allow star selection', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      const rateButton = await screen.findByTestId('rate-trader-button');
      fireEvent.click(rateButton);

      const stars = screen.getAllByTestId(/rating-star-/);
      fireEvent.click(stars[4]); // Click 5th star

      expect(stars[4]).toHaveClass('selected');
    });

    it('should validate rating form', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      const rateButton = await screen.findByTestId('rate-trader-button');
      fireEvent.click(rateButton);

      const submitButton = screen.getByTestId('submit-rating');
      fireEvent.click(submitButton);

      expect(screen.getByText('Please select a rating')).toBeInTheDocument();
    });

    it('should submit rating successfully', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      const rateButton = await screen.findByTestId('rate-trader-button');
      fireEvent.click(rateButton);

      const stars = screen.getAllByTestId(/rating-star-/);
      fireEvent.click(stars[4]); // 5 stars

      const titleInput = screen.getByPlaceholderText('Review title');
      const commentInput = screen.getByPlaceholderText('Share your experience...');

      fireEvent.change(titleInput, { target: { value: 'Great trader' } });
      fireEvent.change(commentInput, { target: { value: 'Excellent performance and strategy' } });

      const submitButton = screen.getByTestId('submit-rating');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSocialTradingService.rateTrader).toHaveBeenCalledWith('trader-1', {
          rating: 5,
          title: 'Great trader',
          comment: 'Excellent performance and strategy'
        });
      });
    });

    it('should show success message after rating', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      const rateButton = await screen.findByTestId('rate-trader-button');
      fireEvent.click(rateButton);

      const stars = screen.getAllByTestId(/rating-star-/);
      fireEvent.click(stars[4]);

      const submitButton = screen.getByTestId('submit-rating');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Thank you for your rating!')).toBeInTheDocument();
      });
    });

    it('should prevent duplicate ratings', async () => {
      vi.spyOn(mockSocialTradingService, 'getTraderRatings').mockResolvedValue({
        ...mockRatings,
        userHasRated: true
      });

      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('You have already rated this trader')).toBeInTheDocument();
        expect(screen.queryByTestId('rate-trader-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Review Interactions', () => {
    it('should mark review as helpful', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const helpfulButtons = screen.getAllByTestId('helpful-button');
        fireEvent.click(helpfulButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('👍 46 found this helpful')).toBeInTheDocument();
      });
    });

    it('should report inappropriate review', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const reportButtons = screen.getAllByTestId('report-review');
        fireEvent.click(reportButtons[0]);
      });

      expect(screen.getByTestId('report-modal')).toBeInTheDocument();
    });

    it('should expand long reviews', async () => {
      const longReview = {
        ...mockRatings.reviews[0],
        comment: 'A'.repeat(500) // Long comment
      };

      vi.spyOn(mockSocialTradingService, 'getTraderRatings').mockResolvedValue({
        ...mockRatings,
        reviews: [longReview, ...mockRatings.reviews.slice(1)]
      });

      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Read more')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Read more'));
      expect(screen.getByText('Read less')).toBeInTheDocument();
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter reviews by rating', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const filterSelect = screen.getByLabelText('Filter by rating');
        fireEvent.change(filterSelect, { target: { value: '5' } });
      });

      await waitFor(() => {
        // Only 5-star reviews should be visible
        expect(screen.getByText('Excellent trader to follow')).toBeInTheDocument();
        expect(screen.getByText('Professional and transparent')).toBeInTheDocument();
        expect(screen.queryByText('Good but occasionally risky')).not.toBeInTheDocument();
      });
    });

    it('should sort reviews', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const sortSelect = screen.getByLabelText('Sort reviews');
        fireEvent.change(sortSelect, { target: { value: 'helpful' } });
      });

      const reviews = screen.getAllByTestId(/review-item-/);
      // Tech Analyst review (67 helpful) should be first
      expect(within(reviews[0]).getByText('Tech Analyst')).toBeInTheDocument();
    });

    it('should search within reviews', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search reviews...');
        fireEvent.change(searchInput, { target: { value: 'occasionally' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Good but occasionally risky')).toBeInTheDocument();
        expect(screen.queryByText('Excellent trader to follow')).not.toBeInTheDocument();
        expect(screen.queryByText('Professional and transparent')).not.toBeInTheDocument();
      });
    });

    it('should show only verified reviews', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const verifiedCheckbox = screen.getByLabelText('Verified only');
        fireEvent.click(verifiedCheckbox);
      });

      await waitFor(() => {
        expect(screen.getByText('Excellent trader to follow')).toBeInTheDocument();
        expect(screen.getByText('Professional and transparent')).toBeInTheDocument();
        expect(screen.queryByText('Good but occasionally risky')).not.toBeInTheDocument();
      });
    });
  });

  describe('Statistics Display', () => {
    it('should show performance statistics', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('35% ROI')).toBeInTheDocument();
        expect(screen.getByText('72% Win Rate')).toBeInTheDocument();
        expect(screen.getByText('450 Total Trades')).toBeInTheDocument();
      });
    });

    it('should display risk metrics', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Risk Score: 6.5')).toBeInTheDocument();
        expect(screen.getByText('Max Drawdown: 15%')).toBeInTheDocument();
        expect(screen.getByText('Sharpe Ratio: 1.8')).toBeInTheDocument();
      });
    });

    it('should show consistency score', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('85% Consistency')).toBeInTheDocument();
        expect(screen.getByTestId('consistency-bar')).toHaveStyle({ width: '85%' });
      });
    });

    it('should display follower count', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('1,250 Followers')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update ratings in real-time', async () => {
      const mockCallback = vi.fn();
      vi.spyOn(mockSocialTradingService, 'subscribeToLiveUpdates').mockImplementation((callback) => {
        mockCallback.mockImplementation(callback);
        return () => {};
      });

      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('234 ratings')).toBeInTheDocument();
      });

      // Simulate rating update
      await act(async () => {
        mockCallback({
          type: 'rating_update',
          data: {
            traderId: 'trader-1',
            averageRating: 4.6,
            totalRatings: 235
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByText('4.6')).toBeInTheDocument();
        expect(screen.getByText('235 ratings')).toBeInTheDocument();
      });
    });

    it('should show new review notification', async () => {
      const mockCallback = vi.fn();
      vi.spyOn(mockSocialTradingService, 'subscribeToLiveUpdates').mockImplementation((callback) => {
        mockCallback.mockImplementation(callback);
        return () => {};
      });

      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const ratingElement = screen.getByRole('region', { name: 'Trader ratings and reviews' });
        expect(ratingElement).toBeInTheDocument();
      });

      // Simulate new review
      await act(async () => {
        mockCallback({
          type: 'new_review',
          data: {
            traderId: 'trader-1',
            review: {
              id: 'review-new',
              username: 'NewReviewer',
              rating: 5,
              comment: 'Fantastic!'
            }
          }
        });
      });

      await waitFor(() => {
        const alerts = screen.getAllByText('New review available');
        expect(alerts).toHaveLength(2); // One visual, one for screen reader
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle rating submission errors', async () => {
      vi.spyOn(mockSocialTradingService, 'rateTrader').mockRejectedValue(new Error('Submission failed'));

      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      const rateButton = await screen.findByTestId('rate-trader-button');
      fireEvent.click(rateButton);

      const stars = screen.getAllByTestId(/rating-star-/);
      fireEvent.click(stars[4]);

      const submitButton = screen.getByTestId('submit-rating');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to submit rating')).toBeInTheDocument();
      });
    });

    it('should handle loading errors gracefully', async () => {
      vi.spyOn(mockSocialTradingService, 'getTraderRatings').mockRejectedValue(new Error('Network error'));

      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load ratings')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Trader ratings and reviews' })).toBeInTheDocument();
        expect(screen.getByLabelText('Average rating: 4.5 out of 5')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      const rateButton = await screen.findByTestId('rate-trader-button');
      rateButton.focus();
      expect(rateButton).toHaveFocus();

      fireEvent.keyDown(rateButton, { key: 'Enter' });
      expect(screen.getByTestId('rating-modal')).toBeInTheDocument();
    });

    it('should announce rating updates to screen readers', async () => {
      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      // Check immediately during loading state
      expect(screen.getByTestId('mobile-rating-layout')).toBeInTheDocument();

      // Also check after loading
      await waitFor(() => {
        expect(screen.getByTestId('mobile-rating-layout')).toBeInTheDocument();
      });
    });

    it('should show desktop layout on large screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1440,
      });

      render(<TraderRating traderId="trader-1" socialTradingService={mockSocialTradingService} />);

      // Check immediately during loading state
      expect(screen.getByTestId('desktop-rating-layout')).toBeInTheDocument();

      // Also check after loading
      await waitFor(() => {
        expect(screen.getByTestId('desktop-rating-layout')).toBeInTheDocument();
      });
    });
  });
});