import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SocialTradingService, Trader, CopySettings } from '../../services/socialTrading.service';
import './TradersToFollow.css';

interface TradersToFollowProps {
  socialTradingService: SocialTradingService;
}

interface FilterOptions {
  minRoi?: number;
  minWinRate?: number;
  minFollowers?: number;
  category?: string;
}

interface CopySettingsForm {
  allocation: number;
  maxRiskPerTrade: number;
  stopLoss?: number;
  takeProfit?: number;
  minTradeAmount?: number;
  maxTradeAmount?: number;
}

export const TradersToFollow: React.FC<TradersToFollowProps> = ({
  socialTradingService
}) => {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'performance' | 'followers' | 'winRate' | 'volume'>('performance');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);
  const [followedTraders, setFollowedTraders] = useState<Set<string>>(new Set());
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [showCopySettings, setShowCopySettings] = useState<string | null>(null);
  const [copySettings, setCopySettings] = useState<CopySettingsForm>({
    allocation: 10,
    maxRiskPerTrade: 2,
    stopLoss: 5,
    takeProfit: 10,
    minTradeAmount: 100,
    maxTradeAmount: 5000
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [statusMessage, setStatusMessage] = useState('');

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTraders();
    loadFollowedTraders();

    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        loadTraders();
      }
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      loadTraders();
    }
  }, [sortBy, filters]);

  const loadTraders = async (loadMore = false) => {
    try {
      if (!loadMore) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const currentOffset = loadMore ? offset : 0;
      const params = {
        sortBy,
        limit: 20,
        offset: currentOffset,
        ...(Object.keys(filters).length > 0 && { filters })
      };

      const newTraders = await socialTradingService.getTopTraders(params);

      if (loadMore) {
        setTraders(prev => [...prev, ...newTraders]);
        setOffset(prev => prev + 20);
      } else {
        setTraders(newTraders);
        setOffset(20);
      }

      setHasMore(newTraders.length === 20);
    } catch (err) {
      setError('Failed to load traders');
      console.error('Failed to load traders:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);

      const searchResults = await socialTradingService.searchTraders(searchQuery.trim());
      setTraders(searchResults);
      setHasMore(false);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowedTraders = async () => {
    try {
      const followed = await socialTradingService.getFollowedTraders();
      const followedIds = new Set(followed.map(f => f.traderId));
      setFollowedTraders(followedIds);
    } catch (err) {
      console.error('Failed to load followed traders:', err);
    }
  };

  const handleFollowTrader = async (traderId: string, customSettings?: Partial<CopySettings>) => {
    try {
      const settings = customSettings ? {
        allocation: customSettings.allocation || 0.1,
        maxRiskPerTrade: customSettings.maxRiskPerTrade || 0.02,
        stopLoss: customSettings.stopLoss,
        takeProfit: customSettings.takeProfit,
        minTradeAmount: customSettings.minTradeAmount,
        maxTradeAmount: customSettings.maxTradeAmount
      } : undefined;

      const result = await socialTradingService.followTrader(traderId, settings);

      if (result.success) {
        setFollowedTraders(prev => new Set([...prev, traderId]));
        const trader = traders.find(t => t.id === traderId);
        setStatusMessage(`Following ${trader?.username}`);
        setShowCopySettings(null);
      } else {
        setError(`Failed to follow trader: ${result.message}`);
      }
    } catch (err) {
      setError('Failed to follow trader');
      console.error('Failed to follow trader:', err);
    }
  };

  const handleUnfollowTrader = async (traderId: string) => {
    try {
      const result = await socialTradingService.unfollowTrader(traderId);

      if (result.success) {
        setFollowedTraders(prev => {
          const newSet = new Set(prev);
          newSet.delete(traderId);
          return newSet;
        });
        const trader = traders.find(t => t.id === traderId);
        setStatusMessage(`Unfollowed ${trader?.username}`);
      } else {
        setError('Failed to unfollow trader');
      }
    } catch (err) {
      setError('Failed to unfollow trader');
      console.error('Failed to unfollow trader:', err);
    }
  };

  const handleTraderClick = async (trader: Trader) => {
    try {
      const detailedTrader = await socialTradingService.getTraderDetails(trader.id);
      setSelectedTrader(detailedTrader);
    } catch (err) {
      console.error('Failed to load trader details:', err);
      setSelectedTrader(trader);
    }
  };

  const handleApplyFilters = () => {
    const newFilters: FilterOptions = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        newFilters[key as keyof FilterOptions] = value;
      }
    });

    setFilters(newFilters);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  const validateCopySettings = (settings: CopySettingsForm): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (settings.allocation < 1 || settings.allocation > 50) {
      errors.allocation = 'Allocation must be between 1% and 50%';
    }

    if (settings.maxRiskPerTrade < 0.5 || settings.maxRiskPerTrade > 10) {
      errors.maxRiskPerTrade = 'Max risk per trade must be between 0.5% and 10%';
    }

    if (settings.stopLoss && (settings.stopLoss < 1 || settings.stopLoss > 30)) {
      errors.stopLoss = 'Stop loss must be between 1% and 30%';
    }

    if (settings.takeProfit && settings.stopLoss && settings.takeProfit <= settings.stopLoss) {
      errors.takeProfit = 'Take profit must be greater than stop loss';
    }

    if (settings.minTradeAmount && settings.maxTradeAmount && settings.minTradeAmount >= settings.maxTradeAmount) {
      errors.minTradeAmount = 'Minimum trade amount must be less than maximum';
    }

    return errors;
  };

  const handleFollowWithSettings = () => {
    const errors = validateCopySettings(copySettings);
    setValidationErrors(errors);

    if (Object.keys(errors).length === 0 && showCopySettings) {
      const settings: Partial<CopySettings> = {
        allocation: copySettings.allocation / 100,
        maxRiskPerTrade: copySettings.maxRiskPerTrade / 100,
        stopLoss: copySettings.stopLoss ? copySettings.stopLoss / 100 : undefined,
        takeProfit: copySettings.takeProfit ? copySettings.takeProfit / 100 : undefined,
        minTradeAmount: copySettings.minTradeAmount,
        maxTradeAmount: copySettings.maxTradeAmount
      };

      handleFollowTrader(showCopySettings, settings);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date | string): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getPercentileText = (percentile: number): string => {
    const percentage = Math.round((1 - percentile) * 100);
    return `Top ${percentage}%`;
  };

  const TraderCard: React.FC<{ trader: Trader }> = ({ trader }) => {
    const isFollowing = followedTraders.has(trader.id);

    return (
      <div
        className="trader-card"
        data-testid={`trader-card-${trader.id}`}
        onClick={() => handleTraderClick(trader)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTraderClick(trader);
          }
        }}
      >
        <div className="trader-header">
          <div className="trader-avatar">
            <img src={trader.avatar || '/default-avatar.png'} alt={`${trader.username} avatar`} />
            {trader.verified && (
              <div className="verified-badge" data-testid="verified-badge">
                ✓
              </div>
            )}
          </div>
          <div className="trader-info">
            <h3>{trader.username}</h3>
            <p className="display-name">{trader.displayName}</p>
            <p className="trader-bio">{trader.bio}</p>
          </div>
          <div className="trader-ranking">
            <span className="rank">#{trader.ranking.overall}</span>
            <span className="category">{trader.ranking.category}</span>
            <span className="percentile">{getPercentileText(trader.ranking.percentile)}</span>
          </div>
        </div>

        <div className="trader-stats">
          <div className="stat-row">
            <div className="stat">
              <span className="label">Followers</span>
              <span className="value">{formatNumber(trader.followerCount)}</span>
            </div>
            <div className="stat">
              <span className="label">ROI</span>
              <span className={`value ${trader.performance.roi >= 0 ? 'positive' : 'negative'}`}>
                {formatPercentage(trader.performance.roi)}
              </span>
            </div>
          </div>
          <div className="stat-row">
            <div className="stat">
              <span className="label">Win Rate</span>
              <span className="value">{formatPercentage(trader.performance.winRate)}</span>
            </div>
            <div className="stat">
              <span className="label">Trades</span>
              <span className="value">{formatNumber(trader.performance.totalTrades)}</span>
            </div>
          </div>
          <div className="stat-row">
            <div className="stat">
              <span className="label">Avg Hold</span>
              <span className="value">{trader.performance.averageHoldTime.toFixed(1)} days</span>
            </div>
            <div className="stat">
              <span className="label">Max DD</span>
              <span className="value negative">{formatPercentage(-trader.performance.maxDrawdown)}</span>
            </div>
          </div>
          <div className="stat-row">
            <div className="stat">
              <span className="label">Sharpe</span>
              <span className="value">{trader.performance.sharpeRatio.toFixed(1)}</span>
            </div>
            <div className="stat">
              <span className="label">Risk Score</span>
              <span className="value">{trader.statistics.riskScore.toFixed(1)}/10</span>
            </div>
          </div>
        </div>

        <div className="performance-chart" data-testid="performance-chart">
          <div className="chart-placeholder">
            {trader.performance.monthlyReturns.map((ret, index) => (
              <div
                key={index}
                className={`chart-bar ${ret >= 0 ? 'positive' : 'negative'}`}
                style={{ height: `${Math.abs(ret) * 500 + 10}px` }}
              />
            ))}
          </div>
        </div>

        <div className="trader-actions" onClick={(e) => e.stopPropagation()}>
          {isFollowing ? (
            <button
              className="btn-following"
              onClick={() => handleUnfollowTrader(trader.id)}
              aria-label={`Unfollow ${trader.username}`}
            >
              Following
            </button>
          ) : (
            <>
              <button
                className="btn-follow"
                onClick={() => handleFollowTrader(trader.id)}
                aria-label={`Follow ${trader.username}`}
              >
                Follow
              </button>
              <button
                className="btn-follow-settings"
                onClick={() => setShowCopySettings(trader.id)}
              >
                Follow with Settings
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className={`traders-to-follow ${isMobile ? 'mobile' : 'desktop'}`} aria-label="Traders to follow">
      <div data-testid={isMobile ? 'mobile-traders-layout' : 'desktop-traders-layout'}>
        <div className="page-header">
          <h1>Traders to Follow</h1>
          <p>Discover and follow successful traders to copy their strategies</p>
        </div>

        <div className="controls-section">
          <div className="search-and-sort">
            <div className="search-container" role="search" aria-label="Search traders">
              <input
                type="text"
                placeholder="Search traders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="sort-container">
              <label htmlFor="sort-select">Sort by:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort traders by"
              >
                <option value="performance">Performance</option>
                <option value="followers">Followers</option>
                <option value="winRate">Win Rate</option>
                <option value="volume">Volume</option>
              </select>
            </div>

            <button
              className="filters-toggle"
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="filters-panel">
              <div className="filter-group">
                <label htmlFor="min-roi">Minimum ROI (%)</label>
                <input
                  id="min-roi"
                  type="number"
                  value={filters.minRoi ? filters.minRoi * 100 : ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    minRoi: e.target.value ? parseFloat(e.target.value) / 100 : undefined
                  }))}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="min-win-rate">Minimum Win Rate (%)</label>
                <input
                  id="min-win-rate"
                  type="number"
                  value={filters.minWinRate ? filters.minWinRate * 100 : ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    minWinRate: e.target.value ? parseFloat(e.target.value) / 100 : undefined
                  }))}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="min-followers">Minimum Followers</label>
                <input
                  id="min-followers"
                  type="number"
                  value={filters.minFollowers || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    minFollowers: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                />
              </div>

              <div className="filter-actions">
                <button onClick={handleResetFilters}>Reset Filters</button>
                <button onClick={handleApplyFilters}>Apply Filters</button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => loadTraders()}>Retry</button>
          </div>
        )}

        {statusMessage && (
          <div className="status-message" role="status">
            {statusMessage}
          </div>
        )}

        {loading ? (
          <div className="loading-state" data-testid="traders-loading">
            <div className="loading-spinner"></div>
            <p>Loading traders...</p>
          </div>
        ) : traders.length === 0 ? (
          <div className="empty-state">
            <p>No traders found</p>
          </div>
        ) : (
          <>
            <div
              className={`traders-grid ${isMobile ? 'mobile-grid' : 'desktop-grid'}`}
              data-testid={traders.length > 50 ? 'virtualized-traders-list' : 'traders-grid'}
            >
              {traders.map((trader) => (
                <TraderCard key={trader.id} trader={trader} />
              ))}
            </div>

            {hasMore && (
              <div className="load-more-section">
                <button
                  className="load-more-button"
                  onClick={() => loadTraders(true)}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading More...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Copy Settings Modal */}
        {showCopySettings && (
          <div className="modal-overlay" data-testid="copy-settings-modal">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Copy Trading Settings</h2>
                <button
                  className="close-button"
                  onClick={() => setShowCopySettings(null)}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="allocation">Allocation (%)</label>
                  <input
                    id="allocation"
                    type="number"
                    value={copySettings.allocation}
                    onChange={(e) => setCopySettings(prev => ({
                      ...prev,
                      allocation: parseFloat(e.target.value) || 0
                    }))}
                    min="1"
                    max="50"
                  />
                  {validationErrors.allocation && (
                    <span className="error-text">{validationErrors.allocation}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="max-risk">Max Risk per Trade (%)</label>
                  <input
                    id="max-risk"
                    type="number"
                    value={copySettings.maxRiskPerTrade}
                    onChange={(e) => setCopySettings(prev => ({
                      ...prev,
                      maxRiskPerTrade: parseFloat(e.target.value) || 0
                    }))}
                    min="0.5"
                    max="10"
                    step="0.1"
                  />
                  {validationErrors.maxRiskPerTrade && (
                    <span className="error-text">{validationErrors.maxRiskPerTrade}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="stop-loss">Stop Loss (%)</label>
                  <input
                    id="stop-loss"
                    type="number"
                    value={copySettings.stopLoss || ''}
                    onChange={(e) => setCopySettings(prev => ({
                      ...prev,
                      stopLoss: e.target.value ? parseFloat(e.target.value) : undefined
                    }))}
                    min="1"
                    max="30"
                  />
                  {validationErrors.stopLoss && (
                    <span className="error-text">{validationErrors.stopLoss}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="take-profit">Take Profit (%)</label>
                  <input
                    id="take-profit"
                    type="number"
                    value={copySettings.takeProfit || ''}
                    onChange={(e) => setCopySettings(prev => ({
                      ...prev,
                      takeProfit: e.target.value ? parseFloat(e.target.value) : undefined
                    }))}
                    min="1"
                    max="100"
                  />
                  {validationErrors.takeProfit && (
                    <span className="error-text">{validationErrors.takeProfit}</span>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="min-trade">Min Trade Amount ($)</label>
                    <input
                      id="min-trade"
                      type="number"
                      value={copySettings.minTradeAmount || ''}
                      onChange={(e) => setCopySettings(prev => ({
                        ...prev,
                        minTradeAmount: e.target.value ? parseFloat(e.target.value) : undefined
                      }))}
                      min="10"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="max-trade">Max Trade Amount ($)</label>
                    <input
                      id="max-trade"
                      type="number"
                      value={copySettings.maxTradeAmount || ''}
                      onChange={(e) => setCopySettings(prev => ({
                        ...prev,
                        maxTradeAmount: e.target.value ? parseFloat(e.target.value) : undefined
                      }))}
                      min="100"
                    />
                  </div>
                </div>

                {validationErrors.minTradeAmount && (
                  <span className="error-text">{validationErrors.minTradeAmount}</span>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowCopySettings(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn-follow-settings"
                  data-testid="follow-with-settings-button"
                  onClick={handleFollowWithSettings}
                >
                  Follow with Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trader Details Modal */}
        {selectedTrader && (
          <div
            className="modal-overlay"
            data-testid="modal-overlay"
            onClick={() => setSelectedTrader(null)}
          >
            <div
              className="modal-content large"
              data-testid="trader-details-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{selectedTrader.displayName || selectedTrader.username}</h2>
                <button
                  className="close-button"
                  data-testid="close-modal-button"
                  onClick={() => setSelectedTrader(null)}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="trader-details">
                  <div className="trader-profile">
                    <img
                      src={selectedTrader.avatar || '/default-avatar.png'}
                      alt={`${selectedTrader.username} avatar`}
                    />
                    <div className="profile-info">
                      <h3>{selectedTrader.displayName}</h3>
                      <p className="username">@{selectedTrader.username}</p>
                      <p className="bio">{selectedTrader.bio}</p>
                      <p className="join-date">Joined {formatDate(selectedTrader.joinDate)}</p>
                    </div>
                  </div>

                  <div className="detailed-stats">
                    <div className="stats-section">
                      <h4>Performance</h4>
                      <div className="stats-grid">
                        <div className="stat">
                          <span className="label">Total Volume</span>
                          <span className="value">{formatCurrency(selectedTrader.statistics.totalVolume)}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Risk Score</span>
                          <span className="value">{selectedTrader.statistics.riskScore.toFixed(1)}/10</span>
                        </div>
                        <div className="stat">
                          <span className="label">Consistency</span>
                          <span className="value">{formatPercentage(selectedTrader.statistics.consistency)}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Profitable Days</span>
                          <span className="value">{selectedTrader.statistics.profitableDays}/{selectedTrader.statistics.totalDays}</span>
                        </div>
                      </div>
                    </div>

                    <div className="performance-history" data-testid="performance-history-chart">
                      <h4>Monthly Performance</h4>
                      <div className="chart-container">
                        {selectedTrader.performance.monthlyReturns.map((ret, index) => (
                          <div key={index} className="month-bar">
                            <div
                              className={`bar ${ret >= 0 ? 'positive' : 'negative'}`}
                              style={{ height: `${Math.abs(ret) * 300 + 20}px` }}
                            />
                            <span className="month-label">M{index + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};