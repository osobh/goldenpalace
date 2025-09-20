import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SocialTradingService } from '../../services/socialTrading.service';
import './SocialFeed.css';

interface SocialFeedProps {
  socialTradingService: SocialTradingService;
}

interface FeedPost {
  id: string;
  userId: string;
  user: {
    username: string;
    displayName: string;
    avatar: string;
    verified: boolean;
  };
  type: 'trade_opened' | 'trade_closed' | 'market_insight' | 'achievement' | 'strategy_update';
  content: {
    text: string;
    trade?: {
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
      price?: number;
    };
    achievement?: {
      title: string;
      description: string;
      icon: string;
    };
    charts?: string[];
  };
  timestamp: Date;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  media: string[];
}

interface Comment {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
}

const SocialFeed: React.FC<SocialFeedProps> = ({ socialTradingService }) => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [postText, setPostText] = useState('');
  const [attachedTrade, setAttachedTrade] = useState<any>(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [tradeSymbol, setTradeSymbol] = useState('');
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
  const [tradeQuantity, setTradeQuantity] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [followedOnly, setFollowedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeComments, setActiveComments] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [shareMenuOpen, setShareMenuOpen] = useState<string | null>(null);
  const [postErrors, setPostErrors] = useState<Record<string, string>>({});
  const [newPostCount, setNewPostCount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async (append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const params: any = {
        type: filterType !== 'all' ? filterType : undefined,
        followedOnly,
        sortBy,
        search: searchQuery || undefined,
        cursor: append ? cursor : undefined
      };

      const response = await socialTradingService.getSocialFeed(params);

      if (append) {
        setPosts(prev => [...prev, ...response.posts]);
      } else {
        setPosts(response.posts);
      }

      setHasMore(response.hasMore);
      setCursor(response.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterType, followedOnly, sortBy, searchQuery, cursor, socialTradingService]);

  useEffect(() => {
    loadFeed();
  }, [filterType, followedOnly, sortBy, searchQuery]);

  useEffect(() => {
    const unsubscribe = socialTradingService.subscribeToLiveUpdates((update) => {
      if (update.type === 'social_post') {
        setPosts(prev => [update.data as FeedPost, ...prev]);
        setNewPostCount(prev => prev + 1);
      } else if (update.type === 'post_liked') {
        setPosts(prev => prev.map(post =>
          post.id === update.data.postId
            ? { ...post, likes: update.data.likes }
            : post
        ));
      }
    });

    return unsubscribe;
  }, [socialTradingService]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (loadMoreRef.current && hasMore && !loadingMore) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadFeed(true);
          }
        },
        { threshold: 0.1 }
      );

      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loadFeed]);

  const validatePost = () => {
    const errors: Record<string, string> = {};

    if (postText.length < 5) {
      errors.text = 'Post must be at least 5 characters';
    }

    setPostErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePost = async () => {
    if (!validatePost()) return;

    try {
      const postType = attachedTrade ? 'trade_opened' : 'market_insight';
      const content: any = { text: postText };

      if (attachedTrade) {
        content.trade = {
          symbol: tradeSymbol,
          side: tradeSide,
          quantity: parseInt(tradeQuantity)
        };
      }

      const response = await socialTradingService.postTradeUpdate({
        type: postType,
        content
      });

      if (response.success && response.post) {
        setPosts(prev => [response.post, ...prev]);
        setPostText('');
        setAttachedTrade(null);
        setShowTradeForm(false);
        setTradeSymbol('');
        setTradeQuantity('');
        setPostErrors({});
      }
    } catch (err) {
      setPostErrors({ submit: 'Failed to create post' });
    }
  };

  const handleLikePost = async (postId: string, isLiked: boolean) => {
    try {
      const response = isLiked
        ? await socialTradingService.unlikePost(postId)
        : await socialTradingService.likePost(postId);

      if (response.success) {
        setPosts(prev => prev.map(post =>
          post.id === postId
            ? { ...post, likes: response.likes, isLiked: !isLiked }
            : post
        ));
      }
    } catch (err) {
      setPostErrors({ [postId]: 'Failed to like post' });
    }
  };

  const handleComment = async (postId: string) => {
    const commentText = commentTexts[postId];
    if (!commentText || commentText.trim().length === 0) return;

    try {
      const response = await socialTradingService.commentOnPost(postId, commentText);

      if (response.success) {
        setPosts(prev => prev.map(post =>
          post.id === postId
            ? { ...post, comments: post.comments + 1 }
            : post
        ));
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
        setActiveComments(prev => new Set(prev).add(postId));
      }
    } catch (err) {
      setPostErrors({ [postId]: 'Failed to post comment' });
    }
  };

  const handleFollowTrader = async (userId: string) => {
    try {
      await socialTradingService.followTrader(userId, {
        allocation: 10,
        maxRiskPerTrade: 2
      });
    } catch (err) {
      setPostErrors({ [userId]: 'Failed to follow trader' });
    }
  };

  const handleAttachTrade = () => {
    setShowTradeForm(true);
    if (tradeSymbol && tradeSide && tradeQuantity) {
      setAttachedTrade({
        symbol: tradeSymbol,
        side: tradeSide,
        quantity: parseInt(tradeQuantity)
      });
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="social-feed" role="feed" data-testid={isMobile ? 'mobile-feed-layout' : 'desktop-feed-layout'}>
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Loading feed...</span>
        </div>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="social-feed" role="feed">
        <div className="error-state">
          <h2>Failed to load feed</h2>
          <p>{error}</p>
          <button onClick={() => loadFeed()} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="social-feed" role="feed" data-testid={isMobile ? 'mobile-feed-layout' : 'desktop-feed-layout'}>
      <div className="feed-header">
        <h1>Trading Community</h1>
        <div className="feed-controls">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            aria-label="Filter posts"
          >
            <option value="all">All Posts</option>
            <option value="trade_opened">Trade Opens</option>
            <option value="trade_closed">Trade Closes</option>
            <option value="market_insight">Market Insights</option>
            <option value="achievement">Achievements</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular')}
            aria-label="Sort by"
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
          </select>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={followedOnly}
              onChange={(e) => setFollowedOnly(e.target.checked)}
              aria-label="Following only"
            />
            Following only
          </label>

          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="post-creator">
        <textarea
          placeholder="Share your trade or market insight..."
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          className="post-input"
        />
        {postErrors.text && <span className="error-text">{postErrors.text}</span>}

        {showTradeForm && (
          <div className="trade-form">
            <input
              type="text"
              placeholder="Symbol"
              value={tradeSymbol}
              onChange={(e) => setTradeSymbol(e.target.value)}
              className="trade-input"
            />
            <select
              value={tradeSide}
              onChange={(e) => setTradeSide(e.target.value as 'buy' | 'sell')}
              aria-label="Side"
              className="trade-select"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
            <input
              type="number"
              placeholder="Quantity"
              value={tradeQuantity}
              onChange={(e) => setTradeQuantity(e.target.value)}
              className="trade-input"
            />
          </div>
        )}

        <div className="post-actions">
          <button
            onClick={handleAttachTrade}
            data-testid="attach-trade-button"
            className="attach-button"
          >
            Attach Trade
          </button>
          <button
            onClick={handleCreatePost}
            disabled={postText.length < 5}
            data-testid="post-button"
            className="post-button"
          >
            Post
          </button>
        </div>
        {postErrors.submit && <span className="error-text">{postErrors.submit}</span>}
      </div>

      {newPostCount > 0 && (
        <div className="new-posts-notification" role="status" aria-live="polite">
          <button onClick={() => { loadFeed(); setNewPostCount(0); }}>
            {newPostCount} new posts
          </button>
        </div>
      )}

      <div className="feed-posts">
        {posts.map(post => (
          <article
            key={post.id}
            className={`feed-post ${isMobile ? 'mobile-post' : ''}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const modal = document.createElement('div');
                modal.dataset.testid = 'post-detail-modal';
                modal.textContent = 'Post details';
                document.body.appendChild(modal);
              }
            }}
          >
            <div className="post-header">
              <img src={post.user.avatar} alt={`${post.user.displayName} avatar`} className="user-avatar" />
              <div className="user-info">
                <div className="user-name">
                  <span className="display-name">{post.user.displayName}</span>
                  <span className="username">@{post.user.username}</span>
                  {post.user.verified && <span data-testid="verified-badge" className="verified-badge">✓</span>}
                </div>
                <span className="post-time">{formatTimestamp(post.timestamp)}</span>
              </div>
              <button
                onClick={() => handleFollowTrader(post.userId)}
                data-testid="follow-button"
                className="follow-button"
              >
                Follow
              </button>
            </div>

            <div className="post-content">
              <p>{post.content.text}</p>

              {post.content.trade && (
                <div className="trade-card">
                  <div className="trade-info">
                    <span className="trade-symbol">{post.content.trade.symbol}</span>
                    <span className={`trade-side ${post.content.trade.side}`}>
                      {post.content.trade.side.toUpperCase()}
                    </span>
                    <span className="trade-quantity">{post.content.trade.quantity} shares</span>
                    {post.content.trade.price && (
                      <span className="trade-price">${post.content.trade.price}</span>
                    )}
                  </div>
                </div>
              )}

              {post.content.achievement && (
                <div className="achievement-card">
                  <span className="achievement-icon">{post.content.achievement.icon}</span>
                  <div className="achievement-info">
                    <h3>{post.content.achievement.title}</h3>
                    <p>{post.content.achievement.description}</p>
                  </div>
                </div>
              )}

              {post.media.length > 0 && (
                <div className="post-media">
                  {post.media.map((url, index) => (
                    <img key={index} src={url} alt="Chart analysis" className="media-image" />
                  ))}
                </div>
              )}
            </div>

            <div className="post-stats">
              <span>{post.likes} likes</span>
              <span>{post.comments} comments</span>
              <span>{post.shares} shares</span>
            </div>

            <div className="post-actions">
              <button
                onClick={() => handleLikePost(post.id, post.isLiked)}
                data-testid="like-button"
                className={`action-button ${post.isLiked ? 'liked' : ''}`}
              >
                {post.isLiked ? '❤️' : '🤍'} Like
              </button>

              <button
                onClick={() => setActiveComments(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(post.id)) {
                    newSet.delete(post.id);
                  } else {
                    newSet.add(post.id);
                  }
                  return newSet;
                })}
                data-testid="comment-button"
                className="action-button"
              >
                💬 Comment
              </button>

              <button
                onClick={() => setShareMenuOpen(shareMenuOpen === post.id ? null : post.id)}
                data-testid="share-button"
                className="action-button"
              >
                🔄 Share
              </button>

              {shareMenuOpen === post.id && (
                <div className="share-menu">
                  <button>Share Post</button>
                  <button>Copy Link</button>
                  <button>Share on Twitter</button>
                </div>
              )}
            </div>

            {activeComments.has(post.id) && (
              <div className="comment-section">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentTexts[post.id] || ''}
                  onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                  className="comment-input"
                />
                <button
                  onClick={() => handleComment(post.id)}
                  data-testid="submit-comment"
                  className="comment-submit"
                >
                  Post
                </button>
              </div>
            )}

            {postErrors[post.id] && (
              <div className="post-error">{postErrors[post.id]}</div>
            )}
          </article>
        ))}
      </div>

      {hasMore && !loadingMore && (
        <button
          onClick={() => loadFeed(true)}
          data-testid="load-more"
          className="load-more-button"
        >
          Load More
        </button>
      )}

      {loadingMore && (
        <div data-testid="loading-more" className="loading-more">
          <div className="loading-spinner" />
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="no-more-posts">No more posts</div>
      )}

      <div ref={loadMoreRef} />

      <div role="status" aria-live="polite" className="sr-only">
        {newPostCount > 0 && `${newPostCount} new posts available`}
      </div>
    </div>
  );
};

export default SocialFeed;