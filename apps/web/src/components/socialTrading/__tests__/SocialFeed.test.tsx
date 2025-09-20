import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import SocialFeed from '../SocialFeed';
import { SocialTradingService } from '../../../services/socialTrading.service';
import { WebSocketService } from '../../../services/websocket.service';

// Mock feed posts for testing
const mockFeedPosts = [
  {
    id: 'post-1',
    userId: 'user-1',
    user: {
      username: 'ProTrader',
      displayName: 'Professional Trader',
      avatar: 'https://example.com/avatar1.jpg',
      verified: true
    },
    type: 'trade_opened',
    content: {
      text: 'Just opened a long position on AAPL with a 2:1 risk-reward ratio',
      trade: {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        price: 150.25
      }
    },
    timestamp: new Date('2024-12-10T10:30:00Z'),
    likes: 45,
    comments: 12,
    shares: 5,
    isLiked: false,
    media: []
  },
  {
    id: 'post-2',
    userId: 'user-2',
    user: {
      username: 'TechAnalyst',
      displayName: 'Tech Market Analyst',
      avatar: 'https://example.com/avatar2.jpg',
      verified: true
    },
    type: 'market_insight',
    content: {
      text: 'NVDA showing strong bullish momentum. Key resistance at $500',
      charts: ['https://example.com/chart1.png']
    },
    timestamp: new Date('2024-12-10T09:15:00Z'),
    likes: 128,
    comments: 34,
    shares: 18,
    isLiked: true,
    media: ['https://example.com/chart1.png']
  },
  {
    id: 'post-3',
    userId: 'user-3',
    user: {
      username: 'CryptoTrader',
      displayName: 'Crypto Specialist',
      avatar: 'https://example.com/avatar3.jpg',
      verified: false
    },
    type: 'achievement',
    content: {
      text: 'Hit a new milestone! 🎯 500 consecutive profitable trades',
      achievement: {
        title: '500 Win Streak',
        description: '500 consecutive profitable trades',
        icon: '🏆'
      }
    },
    timestamp: new Date('2024-12-10T08:00:00Z'),
    likes: 234,
    comments: 56,
    shares: 12,
    isLiked: false,
    media: []
  }
];

describe('SocialFeed', () => {
  let mockSocialTradingService: SocialTradingService;
  let mockWebSocketService: WebSocketService;

  beforeEach(() => {
    mockWebSocketService = new WebSocketService('ws://localhost:3001');
    mockSocialTradingService = new SocialTradingService(mockWebSocketService);

    // Mock service methods
    vi.spyOn(mockSocialTradingService, 'getSocialFeed').mockResolvedValue({
      posts: mockFeedPosts,
      hasMore: true,
      nextCursor: 'cursor-123'
    });
    vi.spyOn(mockSocialTradingService, 'postTradeUpdate').mockResolvedValue({
      success: true,
      post: mockFeedPosts[0]
    });
    vi.spyOn(mockSocialTradingService, 'likePost').mockResolvedValue({
      success: true,
      likes: 46
    });
    vi.spyOn(mockSocialTradingService, 'unlikePost').mockResolvedValue({
      success: true,
      likes: 44
    });
    vi.spyOn(mockSocialTradingService, 'commentOnPost').mockResolvedValue({
      success: true,
      comment: {
        id: 'comment-1',
        userId: 'user-4',
        username: 'Commenter',
        text: 'Great analysis!',
        timestamp: new Date()
      }
    });
    vi.spyOn(mockSocialTradingService, 'subscribeToLiveUpdates').mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockSocialTradingService.cleanup();
    mockWebSocketService.disconnect();
  });

  describe('Feed Display', () => {
    it('should render the social feed', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Trading Community')).toBeInTheDocument();
      });

      expect(screen.getByRole('feed')).toBeInTheDocument();
    });

    it('should display feed posts', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
        expect(screen.getByText('TechAnalyst')).toBeInTheDocument();
        expect(screen.getByText('CryptoTrader')).toBeInTheDocument();
      });
    });

    it('should show post content correctly', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText(/Just opened a long position on AAPL/)).toBeInTheDocument();
        expect(screen.getByText(/NVDA showing strong bullish momentum/)).toBeInTheDocument();
        expect(screen.getByText(/Hit a new milestone/)).toBeInTheDocument();
      });
    });

    it('should display post metadata', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('45 likes')).toBeInTheDocument();
        expect(screen.getByText('12 comments')).toBeInTheDocument();
        expect(screen.getByText('5 shares')).toBeInTheDocument();
      });
    });

    it('should show verified badges', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const verifiedBadges = screen.getAllByTestId('verified-badge');
        expect(verifiedBadges).toHaveLength(2);
      });
    });

    it('should display trade information in trade posts', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('BUY')).toBeInTheDocument();
        expect(screen.getByText('100 shares')).toBeInTheDocument();
        expect(screen.getByText('$150.25')).toBeInTheDocument();
      });
    });

    it('should show achievement cards', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('500 Win Streak')).toBeInTheDocument();
        expect(screen.getByText('500 consecutive profitable trades')).toBeInTheDocument();
        expect(screen.getByText('🏆')).toBeInTheDocument();
      });
    });

    it('should display media attachments', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const chartImage = screen.getByAltText('Chart analysis');
        expect(chartImage).toHaveAttribute('src', 'https://example.com/chart1.png');
      });
    });
  });

  describe('Post Creation', () => {
    it('should show post creation form', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Share your trade or market insight...')).toBeInTheDocument();
      });

      expect(screen.getByTestId('post-button')).toBeInTheDocument();
    });

    it('should create a new post', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      const postInput = await screen.findByPlaceholderText('Share your trade or market insight...');
      const postButton = screen.getByTestId('post-button');

      fireEvent.change(postInput, { target: { value: 'Testing new trade strategy' } });
      fireEvent.click(postButton);

      await waitFor(() => {
        expect(mockSocialTradingService.postTradeUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'market_insight',
            content: expect.objectContaining({
              text: 'Testing new trade strategy'
            })
          })
        );
      });
    });

    it('should attach trade data to posts', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      const attachTradeButton = await screen.findByTestId('attach-trade-button');
      fireEvent.click(attachTradeButton);

      const symbolInput = screen.getByPlaceholderText('Symbol');
      const sideSelect = screen.getByLabelText('Side');
      const quantityInput = screen.getByPlaceholderText('Quantity');

      fireEvent.change(symbolInput, { target: { value: 'TSLA' } });
      fireEvent.change(sideSelect, { target: { value: 'buy' } });
      fireEvent.change(quantityInput, { target: { value: '50' } });

      const postButton = screen.getByTestId('post-button');
      fireEvent.click(postButton);

      await waitFor(() => {
        expect(mockSocialTradingService.postTradeUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'trade_opened',
            content: expect.objectContaining({
              trade: expect.objectContaining({
                symbol: 'TSLA',
                side: 'buy',
                quantity: 50
              })
            })
          })
        );
      });
    });

    it('should validate post content', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      const postButton = await screen.findByTestId('post-button');
      expect(postButton).toBeDisabled();

      const postInput = screen.getByPlaceholderText('Share your trade or market insight...');
      fireEvent.change(postInput, { target: { value: 'A' } });

      expect(screen.getByText('Post must be at least 5 characters')).toBeInTheDocument();
      expect(postButton).toBeDisabled();
    });
  });

  describe('Post Interactions', () => {
    it('should like a post', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      const likeButtons = screen.getAllByTestId('like-button');
      fireEvent.click(likeButtons[0]);

      await waitFor(() => {
        expect(mockSocialTradingService.likePost).toHaveBeenCalledWith('post-1');
        expect(screen.getByText('46 likes')).toBeInTheDocument();
      });
    });

    it('should unlike a post', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('TechAnalyst')).toBeInTheDocument();
      });

      const likeButtons = screen.getAllByTestId('like-button');
      fireEvent.click(likeButtons[1]);

      await waitFor(() => {
        expect(mockSocialTradingService.unlikePost).toHaveBeenCalledWith('post-2');
        expect(screen.getByText('127 likes')).toBeInTheDocument();
      });
    });

    it('should open comment section', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      const commentButtons = screen.getAllByTestId('comment-button');
      fireEvent.click(commentButtons[0]);

      expect(screen.getByPlaceholderText('Write a comment...')).toBeInTheDocument();
    });

    it('should post a comment', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      const commentButtons = screen.getAllByTestId('comment-button');
      fireEvent.click(commentButtons[0]);

      const commentInput = screen.getByPlaceholderText('Write a comment...');
      const submitButton = screen.getByTestId('submit-comment');

      fireEvent.change(commentInput, { target: { value: 'Great trade setup!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSocialTradingService.commentOnPost).toHaveBeenCalledWith('post-1', 'Great trade setup!');
      });
    });

    it('should share a post', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      const shareButtons = screen.getAllByTestId('share-button');
      fireEvent.click(shareButtons[0]);

      expect(screen.getByText('Share Post')).toBeInTheDocument();
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
      expect(screen.getByText('Share on Twitter')).toBeInTheDocument();
    });

    it('should follow a trader from post', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      const followButtons = screen.getAllByTestId('follow-button');
      fireEvent.click(followButtons[0]);

      await waitFor(() => {
        expect(mockSocialTradingService.followTrader).toHaveBeenCalledWith('user-1', expect.any(Object));
      });
    });
  });

  describe('Feed Filtering', () => {
    it('should filter posts by type', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Trading Community')).toBeInTheDocument();
      });

      const filterSelect = screen.getByLabelText('Filter posts');
      fireEvent.change(filterSelect, { target: { value: 'trade_opened' } });

      await waitFor(() => {
        expect(mockSocialTradingService.getSocialFeed).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'trade_opened'
          })
        );
      });
    });

    it('should filter by followed traders only', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Trading Community')).toBeInTheDocument();
      });

      const followedOnlyCheckbox = screen.getByLabelText('Following only');
      fireEvent.click(followedOnlyCheckbox);

      await waitFor(() => {
        expect(mockSocialTradingService.getSocialFeed).toHaveBeenCalledWith(
          expect.objectContaining({
            followedOnly: true
          })
        );
      });
    });

    it('should sort posts', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Trading Community')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText('Sort by');
      fireEvent.change(sortSelect, { target: { value: 'popular' } });

      await waitFor(() => {
        expect(mockSocialTradingService.getSocialFeed).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'popular'
          })
        );
      });
    });

    it('should search posts', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Trading Community')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search posts...');
      fireEvent.change(searchInput, { target: { value: 'AAPL' } });

      await waitFor(() => {
        expect(mockSocialTradingService.getSocialFeed).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'AAPL'
          })
        );
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should receive real-time post updates', async () => {
      const mockCallback = vi.fn();
      vi.spyOn(mockSocialTradingService, 'subscribeToLiveUpdates').mockImplementation((callback) => {
        mockCallback.mockImplementation(callback);
        return () => {};
      });

      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Trading Community')).toBeInTheDocument();
      });

      // Simulate new post
      mockCallback({
        type: 'social_post',
        data: {
          id: 'post-new',
          user: { username: 'NewTrader', displayName: 'New Trader', avatar: 'avatar.jpg' },
          content: { text: 'New real-time post' },
          timestamp: new Date()
        }
      });

      await waitFor(() => {
        expect(screen.getByText('New real-time post')).toBeInTheDocument();
      });
    });

    it('should update like counts in real-time', async () => {
      const mockCallback = vi.fn();
      vi.spyOn(mockSocialTradingService, 'subscribeToLiveUpdates').mockImplementation((callback) => {
        mockCallback.mockImplementation(callback);
        return () => {};
      });

      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('45 likes')).toBeInTheDocument();
      });

      // Simulate like update
      mockCallback({
        type: 'post_liked',
        data: {
          postId: 'post-1',
          likes: 50
        }
      });

      await waitFor(() => {
        expect(screen.getByText('50 likes')).toBeInTheDocument();
      });
    });

    it('should show new post notification', async () => {
      const mockCallback = vi.fn();
      vi.spyOn(mockSocialTradingService, 'subscribeToLiveUpdates').mockImplementation((callback) => {
        mockCallback.mockImplementation(callback);
        return () => {};
      });

      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Trading Community')).toBeInTheDocument();
      });

      // Simulate multiple new posts
      for (let i = 0; i < 3; i++) {
        mockCallback({
          type: 'social_post',
          data: {
            id: `post-new-${i}`,
            user: { username: `User${i}` },
            content: { text: `Post ${i}` }
          }
        });
      }

      await waitFor(() => {
        expect(screen.getByText('3 new posts')).toBeInTheDocument();
      });
    });
  });

  describe('Infinite Scroll', () => {
    it('should load more posts on scroll', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Trading Community')).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByTestId('load-more');
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        expect(mockSocialTradingService.getSocialFeed).toHaveBeenCalledWith(
          expect.objectContaining({
            cursor: 'cursor-123'
          })
        );
      });
    });

    it('should show loading state when fetching more', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Trading Community')).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByTestId('load-more');
      fireEvent.click(loadMoreButton);

      expect(screen.getByTestId('loading-more')).toBeInTheDocument();
    });

    it('should handle no more posts', async () => {
      vi.spyOn(mockSocialTradingService, 'getSocialFeed').mockResolvedValue({
        posts: mockFeedPosts,
        hasMore: false,
        nextCursor: null
      });

      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('No more posts')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle feed loading errors', async () => {
      vi.spyOn(mockSocialTradingService, 'getSocialFeed').mockRejectedValue(new Error('Network error'));

      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load feed')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should handle post creation errors', async () => {
      vi.spyOn(mockSocialTradingService, 'postTradeUpdate').mockRejectedValue(new Error('Post failed'));

      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      const postInput = await screen.findByPlaceholderText('Share your trade or market insight...');
      const postButton = screen.getByTestId('post-button');

      fireEvent.change(postInput, { target: { value: 'Test post' } });
      fireEvent.click(postButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create post')).toBeInTheDocument();
      });
    });

    it('should handle like errors gracefully', async () => {
      vi.spyOn(mockSocialTradingService, 'likePost').mockRejectedValue(new Error('Like failed'));

      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      const likeButtons = screen.getAllByTestId('like-button');
      fireEvent.click(likeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Failed to like post')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('feed')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Filter posts')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
      expect(screen.getByLabelText('Following only')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      const firstPost = screen.getAllByRole('article')[0];
      firstPost.focus();
      expect(firstPost).toHaveFocus();

      fireEvent.keyDown(firstPost, { key: 'Enter' });
      expect(screen.getByTestId('post-detail-modal')).toBeInTheDocument();
    });

    it('should announce updates to screen readers', async () => {
      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Responsive Design', () => {
    it('should show mobile layout on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<SocialFeed socialTradingService={mockSocialTradingService} />);
      expect(screen.getByTestId('mobile-feed-layout')).toBeInTheDocument();
    });

    it('should show desktop layout on large screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1440,
      });

      render(<SocialFeed socialTradingService={mockSocialTradingService} />);
      expect(screen.getByTestId('desktop-feed-layout')).toBeInTheDocument();
    });

    it('should adjust post layout for mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<SocialFeed socialTradingService={mockSocialTradingService} />);

      const posts = screen.getAllByRole('article');
      expect(posts[0]).toHaveClass('mobile-post');
    });
  });
});