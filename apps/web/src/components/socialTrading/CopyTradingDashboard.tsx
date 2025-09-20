import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SocialTradingService } from '../../services/socialTrading.service';
import './CopyTradingDashboard.css';

interface CopyTradingDashboardProps {
  socialTradingService: SocialTradingService;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: string;
  trader: {
    id: string;
    username: string;
    avatar: string;
  };
  status: 'executed' | 'pending' | 'failed';
  pnl?: number;
}

export interface FollowedTrader {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  stats: {
    totalReturn: number;
    winRate: number;
    followers: number;
    totalTrades: number;
  };
  copySettings: {
    allocation: number;
    riskLevel: 'low' | 'medium' | 'high';
    maxPositionSize: number;
    stopLoss: number;
    takeProfit: number;
  };
  isActive: boolean;
  isPaused: boolean;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
}

export interface PortfolioOverview {
  totalValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
  dailyPnL: number;
  dailyPnLPercentage: number;
  activePositions: number;
  followedTraders: number;
  allocatedCapital: number;
  availableCapital: number;
}

export interface PerformanceData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }>;
}

const CopyTradingDashboard: React.FC<CopyTradingDashboardProps> = ({ socialTradingService }) => {
  const [portfolioOverview, setPortfolioOverview] = useState<PortfolioOverview | null>(null);
  const [followedTraders, setFollowedTraders] = useState<FollowedTrader[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [copyTradingPerformance, setCopyTradingPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1M');
  const [tradeFilter, setTradeFilter] = useState<'all' | 'buy' | 'sell' | 'executed' | 'pending' | 'failed'>('all');
  const [tradeSortBy, setTradeSortBy] = useState<'timestamp' | 'symbol' | 'pnl'>('timestamp');
  const [tradeSortOrder, setTradeSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<FollowedTrader | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'excel'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'trade' | 'alert' | 'performance';
    message: string;
    timestamp: string;
    read: boolean;
  }>>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [overview, traders, trades, performance, copyPerformance] = await Promise.all([
        socialTradingService.getPortfolioOverview(),
        socialTradingService.getFollowedTraders(),
        socialTradingService.getRecentTrades(50),
        socialTradingService.getPerformanceData(selectedTimePeriod),
        socialTradingService.getCopyTradingPerformance()
      ]);

      setPortfolioOverview(overview);
      setFollowedTraders(traders);
      setRecentTrades(trades);
      setPerformanceData(performance);
      setCopyTradingPerformance(copyPerformance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedTimePeriod]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const unsubscribe = socialTradingService.subscribeToLiveUpdates((update) => {
      if (update.type === 'trade') {
        setRecentTrades(prev => [update.data, ...prev.slice(0, 49)]);
        setNotifications(prev => [{
          id: Date.now().toString(),
          type: 'trade',
          message: `New trade: ${update.data.side.toUpperCase()} ${update.data.quantity} ${update.data.symbol}`,
          timestamp: new Date().toISOString(),
          read: false
        }, ...prev]);
      } else if (update.type === 'portfolio') {
        setPortfolioOverview(update.data);
      } else if (update.type === 'trader_update') {
        setFollowedTraders(prev => prev.map(trader =>
          trader.id === update.data.id ? { ...trader, ...update.data } : trader
        ));
      }
    });

    return unsubscribe;
  }, [socialTradingService]);

  const handleUnfollowTrader = async (traderId: string) => {
    try {
      await socialTradingService.unfollowTrader(traderId);
      setFollowedTraders(prev => prev.filter(trader => trader.id !== traderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unfollow trader');
    }
  };

  const handlePauseTrader = async (traderId: string) => {
    try {
      await socialTradingService.pauseTrader(traderId);
      setFollowedTraders(prev => prev.map(trader =>
        trader.id === traderId ? { ...trader, isPaused: true } : trader
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause trader');
    }
  };

  const handleResumeTrader = async (traderId: string) => {
    try {
      await socialTradingService.resumeTrader(traderId);
      setFollowedTraders(prev => prev.map(trader =>
        trader.id === traderId ? { ...trader, isPaused: false } : trader
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume trader');
    }
  };

  const handleEditSettings = (trader: FollowedTrader) => {
    setSelectedTrader(trader);
    setShowEditModal(true);
  };

  const handleSaveSettings = async (settings: FollowedTrader['copySettings']) => {
    if (!selectedTrader) return;

    try {
      await socialTradingService.updateCopySettings(selectedTrader.id, settings);
      setFollowedTraders(prev => prev.map(trader =>
        trader.id === selectedTrader.id ? { ...trader, copySettings: settings } : trader
      ));
      setShowEditModal(false);
      setSelectedTrader(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      await socialTradingService.exportPortfolioData(exportFormat);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredTrades = useMemo(() => {
    let filtered = recentTrades;

    if (tradeFilter !== 'all') {
      if (['buy', 'sell'].includes(tradeFilter)) {
        filtered = filtered.filter(trade => trade.side === tradeFilter);
      } else {
        filtered = filtered.filter(trade => trade.status === tradeFilter);
      }
    }

    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (tradeSortBy) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'pnl':
          aValue = a.pnl || 0;
          bValue = b.pnl || 0;
          break;
        default:
          return 0;
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return tradeSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [recentTrades, tradeFilter, tradeSortBy, tradeSortOrder]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="copy-trading-dashboard" role="main" aria-label="Copy Trading Dashboard">
        <div className="loading-state" role="status" aria-live="polite" data-testid="dashboard-loading">
          <div className="loading-spinner" aria-hidden="true"></div>
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="copy-trading-dashboard" role="main" aria-label="Copy Trading Dashboard">
        <div className="error-state" role="alert">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={loadDashboardData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="copy-trading-dashboard" role="main" aria-label="Copy Trading Dashboard">
      <div className="dashboard-header">
        <h1>Copy Trading Dashboard</h1>
        <div className="dashboard-actions">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
            aria-label="Export format"
          >
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
          </select>
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="export-button"
            aria-label={`Export portfolio data as ${exportFormat.toUpperCase()}`}
          >
            {isExporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
          </button>
        </div>
      </div>

      {portfolioOverview && copyTradingPerformance && (
        <section className="portfolio-overview" aria-labelledby="portfolio-heading">
          <h2 id="portfolio-heading">Portfolio Overview</h2>
          <div className="overview-cards">
            <div className="overview-card">
              <h3>Total Value</h3>
              <p className="value-primary">{formatCurrency(portfolioOverview.totalValue)}</p>
            </div>
            <div className="overview-card">
              <h3>Total Return</h3>
              <p className={`value-primary ${copyTradingPerformance.totalReturn >= 0 ? 'positive' : 'negative'}`}>
                {(copyTradingPerformance.totalReturn * 100).toFixed(2)}%
              </p>
            </div>
            <div className="overview-card">
              <h3>Total Trades</h3>
              <p className="value-primary">{copyTradingPerformance.totalTrades}</p>
            </div>
            <div className="overview-card">
              <h3>Win Rate</h3>
              <p className="value-primary">{(copyTradingPerformance.winRate * 100).toFixed(2)}%</p>
            </div>
            <div className="overview-card">
              <h3>Active Positions</h3>
              <p className="value-primary">{portfolioOverview.activePositions}</p>
            </div>
            <div className="overview-card">
              <h3>Followed Traders</h3>
              <p className="value-primary">{portfolioOverview.followedTraders}</p>
            </div>
          </div>
        </section>
      )}

      <section className="followed-traders" aria-labelledby="traders-heading">
        <h2 id="traders-heading">Followed Traders</h2>
        {followedTraders.length === 0 ? (
          <div className="empty-state" role="status">
            <p>No traders followed yet</p>
          </div>
        ) : (
          <div className="traders-grid">
            {followedTraders.map(trader => (
              <div key={trader.id} className="trader-card">
                <div className="trader-header">
                  <img src={trader.avatar} alt={`${trader.displayName} avatar`} className="trader-avatar" />
                  <div className="trader-info">
                    <h3>{trader.displayName}</h3>
                    <p>@{trader.username}</p>
                    <span className={`status-badge ${trader.isPaused ? 'paused' : 'active'}`}>
                      {trader.isPaused ? 'Paused' : 'Active'}
                    </span>
                  </div>
                </div>

                <div className="trader-stats">
                  <div className="stat">
                    <span className="stat-label">Return</span>
                    <span className={`stat-value ${trader.stats.totalReturn >= 0 ? 'positive' : 'negative'}`}>
                      {formatPercentage(trader.stats.totalReturn)}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Win Rate</span>
                    <span className="stat-value">{trader.stats.winRate}%</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Allocation</span>
                    <span className="stat-value">{trader.copySettings.allocation}%</span>
                  </div>
                </div>

                <div className="trader-actions">
                  <button
                    onClick={() => handleEditSettings(trader)}
                    className="edit-button"
                    aria-label={`Edit settings for ${trader.displayName}`}
                  >
                    Edit Settings
                  </button>
                  {trader.isPaused ? (
                    <button
                      onClick={() => handleResumeTrader(trader.id)}
                      className="resume-button"
                      aria-label={`Resume copying ${trader.displayName}`}
                    >
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePauseTrader(trader.id)}
                      className="pause-button"
                      aria-label={`Pause copying ${trader.displayName}`}
                    >
                      Pause
                    </button>
                  )}
                  <button
                    onClick={() => handleUnfollowTrader(trader.id)}
                    className="unfollow-button"
                    aria-label={`Unfollow ${trader.displayName}`}
                  >
                    Unfollow
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="recent-trades" aria-labelledby="trades-heading">
        <div className="section-header">
          <h2 id="trades-heading">Recent Trades</h2>
          <div className="trade-filters">
            <select
              value={tradeFilter}
              onChange={(e) => setTradeFilter(e.target.value as typeof tradeFilter)}
              aria-label="Filter trades"
            >
              <option value="all">All Trades</option>
              <option value="buy">Buy Orders</option>
              <option value="sell">Sell Orders</option>
              <option value="executed">Executed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={tradeSortBy}
              onChange={(e) => setTradeSortBy(e.target.value as typeof tradeSortBy)}
              aria-label="Sort trades by"
            >
              <option value="timestamp">Date</option>
              <option value="symbol">Symbol</option>
              <option value="pnl">P&L</option>
            </select>
            <button
              onClick={() => setTradeSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="sort-order-button"
              aria-label={`Sort ${tradeSortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {tradeSortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {filteredTrades.length === 0 ? (
          <div className="empty-state" role="status">
            <p>No trades found</p>
          </div>
        ) : (
          <div className="trades-table-container">
            <table className="trades-table" role="table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Symbol</th>
                  <th scope="col">Side</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Price</th>
                  <th scope="col">Trader</th>
                  <th scope="col">Status</th>
                  <th scope="col">P&L</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map(trade => (
                  <tr key={trade.id}>
                    <td>{new Date(trade.timestamp).toLocaleDateString()}</td>
                    <td className="symbol-cell">{trade.symbol}</td>
                    <td className={`side-cell ${trade.side}`}>{trade.side.toUpperCase()}</td>
                    <td>{trade.quantity}</td>
                    <td>{formatCurrency(trade.price)}</td>
                    <td>
                      <div className="trader-info-cell">
                        <img src={trade.trader.avatar} alt="" className="trader-avatar-small" />
                        <span>{trade.trader.username}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${trade.status}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className={trade.pnl && trade.pnl !== 0 ? (trade.pnl > 0 ? 'positive' : 'negative') : ''}>
                      {trade.pnl !== undefined ? formatCurrency(trade.pnl) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="performance-analytics" aria-labelledby="performance-heading">
        <div className="section-header">
          <h2 id="performance-heading">Performance Analytics</h2>
          <div className="time-period-selector">
            {(['1D', '1W', '1M', '3M', '1Y'] as const).map(period => (
              <button
                key={period}
                onClick={() => setSelectedTimePeriod(period)}
                className={`time-period-button ${selectedTimePeriod === period ? 'active' : ''}`}
                aria-label={`Select ${period} time period`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {performanceData && (
          <div className="performance-chart-container">
            <div className="chart-placeholder" role="img" aria-label="Performance chart">
              <p>Performance Chart ({selectedTimePeriod})</p>
              <div className="chart-data">
                {performanceData.datasets.map(dataset => (
                  <div key={dataset.label} className="dataset-info">
                    <span className="dataset-label">{dataset.label}</span>
                    <span className="dataset-value">
                      {dataset.data[dataset.data.length - 1]?.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {showEditModal && selectedTrader && (
        <div className="modal-overlay" role="dialog" aria-labelledby="edit-modal-title" aria-modal="true">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="edit-modal-title">Edit Copy Settings - {selectedTrader.displayName}</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedTrader(null);
                }}
                className="modal-close"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <EditSettingsForm
              trader={selectedTrader}
              onSave={handleSaveSettings}
              onCancel={() => {
                setShowEditModal(false);
                setSelectedTrader(null);
              }}
            />
          </div>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="notifications-panel" role="complementary" aria-label="Live notifications">
          <h3>Live Updates</h3>
          <div className="notifications-list">
            {notifications.slice(0, 5).map(notification => (
              <div key={notification.id} className={`notification ${notification.type}`}>
                <span className="notification-message">{notification.message}</span>
                <span className="notification-time">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface EditSettingsFormProps {
  trader: FollowedTrader;
  onSave: (settings: FollowedTrader['copySettings']) => void;
  onCancel: () => void;
}

const EditSettingsForm: React.FC<EditSettingsFormProps> = ({ trader, onSave, onCancel }) => {
  const [settings, setSettings] = useState(trader.copySettings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  return (
    <form onSubmit={handleSubmit} className="edit-settings-form">
      <div className="form-group">
        <label htmlFor="allocation">Allocation (%)</label>
        <input
          id="allocation"
          type="number"
          min="1"
          max="100"
          value={settings.allocation}
          onChange={(e) => setSettings(prev => ({ ...prev, allocation: Number(e.target.value) }))}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="risk-level">Risk Level</label>
        <select
          id="risk-level"
          value={settings.riskLevel}
          onChange={(e) => setSettings(prev => ({ ...prev, riskLevel: e.target.value as 'low' | 'medium' | 'high' }))}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="max-position">Max Position Size (%)</label>
        <input
          id="max-position"
          type="number"
          min="1"
          max="50"
          value={settings.maxPositionSize}
          onChange={(e) => setSettings(prev => ({ ...prev, maxPositionSize: Number(e.target.value) }))}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="stop-loss">Stop Loss (%)</label>
        <input
          id="stop-loss"
          type="number"
          min="1"
          max="50"
          value={settings.stopLoss}
          onChange={(e) => setSettings(prev => ({ ...prev, stopLoss: Number(e.target.value) }))}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="take-profit">Take Profit (%)</label>
        <input
          id="take-profit"
          type="number"
          min="1"
          max="100"
          value={settings.takeProfit}
          onChange={(e) => setSettings(prev => ({ ...prev, takeProfit: Number(e.target.value) }))}
          required
        />
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="cancel-button">
          Cancel
        </button>
        <button type="submit" className="save-button">
          Save Settings
        </button>
      </div>
    </form>
  );
};

export default CopyTradingDashboard;