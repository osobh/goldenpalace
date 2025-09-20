import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SocialTradingService } from '../../services/socialTrading.service';
import './TraderRating.css';

interface TraderRatingProps {
  traderId: string;
  socialTradingService: SocialTradingService;
}

interface Trader {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  verified: boolean;
  followerCount: number;
  performance: {
    roi: number;
    winRate: number;
    totalTrades: number;
    averageHoldTime: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
  statistics: {
    totalVolume: number;
    profitableDays: number;
    totalDays: number;
    averageTradeSize: number;
    riskScore: number;
    consistency: number;
  };
}

interface Review {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  rating: number;
  title: string;
  comment: string;
  helpful: number;
  timestamp: Date;
  verified: boolean;
}

interface RatingsData {
  averageRating: number;
  totalRatings: number;
  distribution: Record<number, number>;
  reviews: Review[];
  userHasRated: boolean;
}

const TraderRating: React.FC<TraderRatingProps> = ({ traderId, socialTradingService }) => {
  const [trader, setTrader] = useState<Trader | null>(null);
  const [ratings, setRatings] = useState<RatingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set());
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [newReviewAlert, setNewReviewAlert] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [traderData, ratingsData] = await Promise.all([
        socialTradingService.getTraderDetails(traderId),
        socialTradingService.getTraderRatings(traderId)
      ]);

      setTrader(traderData);
      setRatings(ratingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ratings');
    } finally {
      setLoading(false);
    }
  }, [traderId, socialTradingService]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = socialTradingService.subscribeToLiveUpdates((update) => {
      if (update.type === 'rating_update' && update.data.traderId === traderId) {
        setRatings(prev => prev ? {
          ...prev,
          averageRating: update.data.averageRating,
          totalRatings: update.data.totalRatings
        } : null);
      } else if (update.type === 'new_review' && update.data.traderId === traderId) {
        setNewReviewAlert(true);
        setTimeout(() => setNewReviewAlert(false), 5000);
      }
    });

    return unsubscribe;
  }, [traderId, socialTradingService]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredReviews = useMemo(() => {
    if (!ratings) return [];

    let filtered = [...ratings.reviews];

    if (filterRating !== null) {
      filtered = filtered.filter(review => review.rating === filterRating);
    }

    if (verifiedOnly) {
      filtered = filtered.filter(review => review.verified);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(review =>
        review.title.toLowerCase().includes(query) ||
        review.comment.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'helpful':
          return b.helpful - a.helpful;
        case 'rating':
          return b.rating - a.rating;
        case 'recent':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });

    return filtered;
  }, [ratings, filterRating, verifiedOnly, searchQuery, sortBy]);

  const handleSubmitRating = async () => {
    if (selectedRating === 0) {
      setSubmitError('Please select a rating');
      return;
    }

    try {
      setSubmitError(null);
      const response = await socialTradingService.rateTrader(traderId, {
        rating: selectedRating,
        title: reviewTitle,
        comment: reviewComment
      });

      if (response.success) {
        setSubmitSuccess(true);
        setShowRatingModal(false);
        setTimeout(() => setSubmitSuccess(false), 5000);
        loadData();
      }
    } catch (err) {
      setSubmitError('Failed to submit rating');
    }
  };

  const handleMarkHelpful = (reviewId: string) => {
    setHelpfulReviews(prev => new Set(prev).add(reviewId));
    setRatings(prev => prev ? {
      ...prev,
      reviews: prev.reviews.map(review =>
        review.id === reviewId
          ? { ...review, helpful: review.helpful + 1 }
          : review
      )
    } : null);
  };

  const renderStars = (rating: number, size = 'medium') => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className={`star-rating ${size}`}>
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} data-testid="star-filled" className="star filled">★</span>
        ))}
        {hasHalfStar && (
          <span data-testid="star-half" className="star half">★</span>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} data-testid="star-empty" className="star empty">☆</span>
        ))}
      </div>
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div
        className="trader-rating"
        data-testid={isMobile ? 'mobile-rating-layout' : 'desktop-rating-layout'}
      >
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Loading ratings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trader-rating" data-testid="trader-rating">
        <div className="error-state">
          <h2>Failed to load ratings</h2>
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  if (!trader || !ratings) return null;

  return (
    <div
      className="trader-rating"
      data-testid={isMobile ? 'mobile-rating-layout' : 'desktop-rating-layout'}
      role="region"
      aria-label="Trader ratings and reviews"
    >
      <div className="rating-overview">
        <div className="rating-summary">
          <div className="average-rating" aria-label={`Average rating: ${ratings.averageRating} out of 5`}>
            <span className="rating-number">{ratings.averageRating}</span>
            {renderStars(ratings.averageRating, 'large')}
            <span className="total-ratings">{ratings.totalRatings} ratings</span>
          </div>

          <div className="rating-distribution">
            {[5, 4, 3, 2, 1].map(star => {
              const count = ratings.distribution[star] || 0;
              const percentage = ratings.totalRatings > 0 ? (count / ratings.totalRatings) * 100 : 0;
              const roundedPercentage = Math.round(percentage * 10) / 10; // Round to 1 decimal place

              return (
                <div key={star} className="rating-bar-row">
                  <span className="star-label" data-testid={`rating-label-${star}`}>{star} stars</span>
                  <div className="rating-bar-container">
                    <div
                      className="rating-bar-fill"
                      data-testid={`rating-bar-${star}`}
                      style={{ width: `${roundedPercentage}%` }}
                    />
                  </div>
                  <span className="rating-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="trader-stats">
          <h3>Performance Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">ROI</span>
              <span className="stat-value">{(trader.performance.roi * 100).toFixed(0)}% ROI</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Win Rate</span>
              <span className="stat-value">{(trader.performance.winRate * 100).toFixed(0)}% Win Rate</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Trades</span>
              <span className="stat-value">{trader.performance.totalTrades} Total Trades</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Risk Score</span>
              <span className="stat-value">Risk Score: {trader.statistics.riskScore}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Max Drawdown</span>
              <span className="stat-value">Max Drawdown: {(trader.performance.maxDrawdown * 100).toFixed(0)}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Sharpe Ratio</span>
              <span className="stat-value">Sharpe Ratio: {trader.performance.sharpeRatio}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Followers</span>
              <span className="stat-value">{trader.followerCount.toLocaleString()} Followers</span>
            </div>
            <div className="stat-item full-width">
              <span className="stat-label">Consistency</span>
              <div className="consistency-bar">
                <div
                  className="consistency-fill"
                  data-testid="consistency-bar"
                  style={{ width: `${trader.statistics.consistency * 100}%` }}
                />
              </div>
              <span className="stat-value">{(trader.statistics.consistency * 100).toFixed(0)}% Consistency</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rating-actions">
        {!ratings.userHasRated ? (
          <button
            onClick={() => setShowRatingModal(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowRatingModal(true);
              }
            }}
            data-testid="rate-trader-button"
            className="rate-button"
          >
            Rate {trader.displayName}
          </button>
        ) : (
          <div className="already-rated">You have already rated this trader</div>
        )}

        {submitSuccess && (
          <div className="success-message">Thank you for your rating!</div>
        )}
      </div>

      <div className="reviews-section">
        <div className="reviews-header">
          <h3>Reviews</h3>
          <div className="reviews-controls">
            <select
              value={filterRating || ''}
              onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
              aria-label="Filter by rating"
            >
              <option value="">All ratings</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort reviews"
            >
              <option value="recent">Most Recent</option>
              <option value="helpful">Most Helpful</option>
              <option value="rating">Highest Rating</option>
            </select>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                aria-label="Verified only"
              />
              Verified only
            </label>

            <input
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="reviews-list">
          {filteredReviews.map(review => {
            const isExpanded = expandedReviews.has(review.id);
            const isLongReview = review.comment.length > 200;

            return (
              <div key={review.id} className="review-item" data-testid={`review-item-${review.id}`}>
                <div className="review-header">
                  <img src={review.avatar} alt={`${review.displayName} avatar`} className="reviewer-avatar" />
                  <div className="reviewer-info">
                    <span className="reviewer-name">{review.displayName}</span>
                    <span className="review-date">{formatDate(review.timestamp)}</span>
                    {review.verified && (
                      <span data-testid="verified-purchase" className="verified-badge">Verified Follower</span>
                    )}
                  </div>
                  {renderStars(review.rating, 'small')}
                </div>

                <div className="review-content">
                  <h4>{review.title}</h4>
                  <p className={isExpanded ? '' : 'truncated'}>
                    {isLongReview && !isExpanded
                      ? review.comment.substring(0, 200) + '...'
                      : review.comment}
                  </p>
                  {isLongReview && (
                    <button
                      onClick={() => setExpandedReviews(prev => {
                        const newSet = new Set(prev);
                        if (isExpanded) {
                          newSet.delete(review.id);
                        } else {
                          newSet.add(review.id);
                        }
                        return newSet;
                      })}
                      className="expand-button"
                    >
                      {isExpanded ? 'Read less' : 'Read more'}
                    </button>
                  )}
                </div>

                <div className="review-actions">
                  <button
                    onClick={() => handleMarkHelpful(review.id)}
                    disabled={helpfulReviews.has(review.id)}
                    data-testid="helpful-button"
                    className="helpful-button"
                  >
                    👍 {review.helpful} found this helpful
                  </button>
                  <button
                    onClick={() => setShowReportModal(review.id)}
                    data-testid="report-review"
                    className="report-button"
                  >
                    Report
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showRatingModal && (
        <div className="modal-overlay" data-testid="rating-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Rate {trader.displayName}</h3>
              <button onClick={() => setShowRatingModal(false)} className="modal-close">×</button>
            </div>

            <div className="rating-form">
              <div className="star-selector">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setSelectedRating(star)}
                    data-testid={`rating-star-${star}`}
                    className={`star-button ${selectedRating >= star ? 'selected' : ''}`}
                  >
                    ★
                  </button>
                ))}
              </div>

              {submitError && <div className="error-text">{submitError}</div>}

              <input
                type="text"
                placeholder="Review title"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="review-title-input"
              />

              <textarea
                placeholder="Share your experience..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="review-comment-input"
              />

              <div className="modal-actions">
                <button onClick={() => setShowRatingModal(false)} className="cancel-button">
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRating}
                  data-testid="submit-rating"
                  className="submit-button"
                >
                  Submit Rating
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="modal-overlay" data-testid="report-modal">
          <div className="modal-content">
            <h3>Report Review</h3>
            <p>Why are you reporting this review?</p>
            <button onClick={() => setShowReportModal(null)} className="cancel-button">Cancel</button>
          </div>
        </div>
      )}

      {newReviewAlert && (
        <div className="new-review-alert">New review available</div>
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {newReviewAlert && 'New review available'}
      </div>
    </div>
  );
};

export default TraderRating;