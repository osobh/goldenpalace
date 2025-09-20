import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SocialTradingService } from '../../services/socialTrading.service';
import './PortfolioAnalytics.css';

interface PortfolioAnalyticsProps {
  socialTradingService: SocialTradingService;
}

interface PortfolioData {
  totalValue: number;
  totalInvested: number;
  totalPnL: number;
  pnlPercentage: number;
  availableBalance: number;
  activePositions: number;
  followingCount: number;
  totalCopiedTrades: number;
  successRate: number;
  averageHoldTime: number;
  bestPerformingAsset: {
    symbol: string;
    pnl: number;
    percentage: number;
  };
  worstPerformingAsset: {
    symbol: string;
    pnl: number;
    percentage: number;
  };
  riskScore: string;
  diversificationScore: number;
  assets: Array<{
    symbol: string;
    value: number;
    percentage: number;
    pnl: number;
  }>;
}

interface PerformanceData {
  labels: string[];
  values: number[];
  pnl: number[];
  percentageChange: number;
  trades: number;
  winRate: number;
}

interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: Date;
  pnl: number;
  pnlPercentage: number;
  status: 'open' | 'closed';
  copiedFrom: string | null;
}

type TimePeriod = '1D' | '1W' | '1M' | '3M' | '1Y';
type ChartType = 'line' | 'candlestick' | 'area';
type AssetFilter = 'all' | 'crypto' | 'stocks' | 'forex' | 'commodities';

const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({ socialTradingService }) => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [tradeNotification, setTradeNotification] = useState<string | null>(null);
  const [tradesLimit, setTradesLimit] = useState(50);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const assetChartRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [portfolio, performance, trades] = await Promise.all([
        socialTradingService.getPortfolioOverview(),
        socialTradingService.getPerformanceData(selectedPeriod),
        socialTradingService.getRecentTrades(tradesLimit)
      ]);

      setPortfolioData(portfolio);
      setPerformanceData(performance);
      setRecentTrades(trades);
    } catch (err) {
      setError('Failed to load portfolio data');
      console.error('Error loading portfolio data:', err);
    } finally {
      setLoading(false);
    }
  }, [socialTradingService, selectedPeriod, tradesLimit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = socialTradingService.subscribeToLiveUpdates((update) => {
      if (update.type === 'portfolio_update') {
        setPortfolioData(prev => prev ? {
          ...prev,
          totalValue: update.data.totalValue,
          totalPnL: update.data.totalPnL,
          pnlPercentage: update.data.pnlPercentage
        } : null);
      } else if (update.type === 'new_trade') {
        const notification = `New trade executed: ${update.data.type === 'buy' ? 'Buy' : 'Sell'} ${update.data.amount} ${update.data.symbol} @ ${formatCurrency(update.data.price)}`;
        setTradeNotification(notification);
        setTimeout(() => setTradeNotification(null), 5000);
        loadData();
      }
    });

    return unsubscribe;
  }, [socialTradingService, loadData]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePeriodChange = async (period: TimePeriod) => {
    setSelectedPeriod(period);
    try {
      const performance = await socialTradingService.getPerformanceData(period);
      setPerformanceData(performance);
    } catch (err) {
      console.error('Error loading performance data:', err);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      setExportError(null);
      await socialTradingService.exportPortfolioData(format);
      setExportSuccess(true);
      setShowExportMenu(false);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      setExportError('Failed to export data');
      console.error('Export error:', err);
    }
  };

  const handleLoadMoreTrades = async () => {
    setTradesLimit(100);
  };

  const filteredAssets = useMemo(() => {
    if (!portfolioData) return [];

    if (assetFilter === 'all') return portfolioData.assets;

    return portfolioData.assets.filter(asset => {
      const symbol = asset.symbol.toUpperCase();
      switch (assetFilter) {
        case 'crypto':
          return symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('USD');
        case 'stocks':
          return !symbol.includes('/') && !symbol.includes('GOLD');
        case 'forex':
          return symbol.includes('/') && !symbol.includes('BTC') && !symbol.includes('ETH');
        case 'commodities':
          return symbol.includes('GOLD') || symbol.includes('SILVER') || symbol.includes('OIL');
        default:
          return true;
      }
    });
  }, [portfolioData, assetFilter]);

  const renderChart = () => {
    if (!performanceData) return null;

    const maxValue = Math.max(...performanceData.values);
    const minValue = Math.min(...performanceData.values);
    const range = maxValue - minValue;
    const width = isMobile ? 350 : 600;
    const height = 300;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = performanceData.values.map((value, index) => ({
      x: (index / (performanceData.values.length - 1)) * chartWidth + padding,
      y: height - padding - ((value - minValue) / range) * chartHeight
    }));

    const pathData = points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `${path} L ${point.x} ${point.y}`;
    }, '');

    const areaPath = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

    if (chartType === 'candlestick') {
      return (
        <div data-testid="candlestick-chart" className="chart-container">
          <svg width={width} height={height}>
            {performanceData.values.map((value, index) => {
              const x = (index / (performanceData.values.length - 1)) * chartWidth + padding;
              const open = index > 0 ? performanceData.values[index - 1] : value;
              const high = Math.max(open, value);
              const low = Math.min(open, value);
              const color = value >= open ? '#10b981' : '#ef4444';

              return (
                <g key={index}>
                  <line
                    x1={x}
                    y1={height - padding - ((high - minValue) / range) * chartHeight}
                    x2={x}
                    y2={height - padding - ((low - minValue) / range) * chartHeight}
                    stroke={color}
                    strokeWidth="1"
                  />
                  <rect
                    x={x - 4}
                    y={height - padding - ((Math.max(open, value) - minValue) / range) * chartHeight}
                    width={8}
                    height={Math.abs(((value - open) / range) * chartHeight)}
                    fill={color}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      );
    }

    return (
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#667eea" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#667eea" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {chartType === 'area' && (
          <path d={areaPath} fill="url(#chartGradient)" />
        )}

        <path
          d={pathData}
          fill="none"
          stroke="#667eea"
          strokeWidth="2"
        />

        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="#667eea"
          />
        ))}

        {performanceData.labels.map((label, index) => (
          index % Math.ceil(performanceData.labels.length / 6) === 0 && (
            <text
              key={index}
              x={(index / (performanceData.labels.length - 1)) * chartWidth + padding}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#6b7280"
            >
              {label}
            </text>
          )
        ))}
      </svg>
    );
  };

  const renderAssetAllocationChart = () => {
    if (!filteredAssets.length) return null;

    const width = isMobile ? 200 : 300;
    const height = 200;
    const radius = Math.min(width, height) / 2 - 10;
    const centerX = width / 2;
    const centerY = height / 2;

    const colors = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    let currentAngle = -Math.PI / 2;

    return (
      <svg width={width} height={height}>
        {filteredAssets.map((asset, index) => {
          const angle = (asset.percentage / 100) * Math.PI * 2;
          const largeArcFlag = angle > Math.PI ? 1 : 0;
          const startX = centerX + Math.cos(currentAngle) * radius;
          const startY = centerY + Math.sin(currentAngle) * radius;
          const endX = centerX + Math.cos(currentAngle + angle) * radius;
          const endY = centerY + Math.sin(currentAngle + angle) * radius;

          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${startX} ${startY}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            'Z'
          ].join(' ');

          currentAngle += angle;

          return (
            <path
              key={index}
              d={pathData}
              fill={colors[index % colors.length]}
              stroke="white"
              strokeWidth="2"
            />
          );
        })}
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="portfolio-analytics" data-testid="portfolio-analytics">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Loading portfolio data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portfolio-analytics" data-testid="portfolio-analytics">
        <div className="error-state">
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  if (!portfolioData || !performanceData) return null;

  return (
    <div
      className="portfolio-analytics"
      data-testid={isMobile ? 'mobile-layout' : 'desktop-layout'}
    >
      <div className="portfolio-header">
        <h2>Portfolio Analytics</h2>
        <div className="header-actions">
          <button onClick={loadData} className="refresh-button" aria-label="Refresh">
            🔄 Refresh
          </button>
          <div className="export-dropdown">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="export-button"
            >
              📊 Export Data
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={() => handleExport('csv')}>Export as CSV</button>
                <button onClick={() => handleExport('pdf')}>Export as PDF</button>
                <button onClick={() => handleExport('excel')}>Export as Excel</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="portfolio-overview"
        role="region"
        aria-label="Portfolio Analytics"
        data-testid="portfolio-analytics"
      >
        <div className="overview-grid">
          <div className="stat-card primary">
            <h3>Total Portfolio Value</h3>
            <p className="stat-value">{formatCurrency(portfolioData.totalValue)}</p>
          </div>

          <div className="stat-card">
            <h3>Total P&L</h3>
            <p className={`stat-value ${portfolioData.totalPnL >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(portfolioData.totalPnL)}
            </p>
            <span className={`percentage ${portfolioData.pnlPercentage >= 0 ? 'positive' : 'negative'}`}>
              {formatPercentage(portfolioData.pnlPercentage)}
            </span>
          </div>

          <div className="stat-card">
            <h3>Available Balance</h3>
            <p className="stat-value">{formatCurrency(portfolioData.availableBalance)}</p>
          </div>

          <div className="stat-card">
            <h3>Active Positions</h3>
            <p className="stat-value">{portfolioData.activePositions}</p>
          </div>

          <div className="stat-card">
            <h3>Success Rate</h3>
            <p className="stat-value">{Math.round(portfolioData.successRate * 100)}%</p>
          </div>

          <div className="stat-card">
            <h3>Risk Score</h3>
            <p className={`stat-value risk-${portfolioData.riskScore.toLowerCase()}`}>
              {portfolioData.riskScore}
            </p>
          </div>

          <div className="stat-card">
            <h3>Following</h3>
            <p className="stat-value">{portfolioData.followingCount}</p>
          </div>

          <div className="stat-card">
            <h3>Copied Trades</h3>
            <p className="stat-value">{portfolioData.totalCopiedTrades}</p>
          </div>

          <div className="stat-card">
            <h3>Avg Hold Time</h3>
            <p className="stat-value">{portfolioData.averageHoldTime} days</p>
          </div>

          <div className="stat-card">
            <h3>Diversification Score</h3>
            <p className="stat-value">{Math.round(portfolioData.diversificationScore * 100)}%</p>
          </div>
        </div>
      </div>

      <div
        className="performance-section"
        role="region"
        aria-label="Performance Chart"
      >
        <div className="section-header">
          <h3>Performance</h3>
          <div className="chart-controls">
            <div className="period-selector">
              {(['1D', '1W', '1M', '3M', '1Y'] as TimePeriod[]).map(period => (
                <button
                  key={period}
                  onClick={() => handlePeriodChange(period)}
                  className={`period-button ${selectedPeriod === period ? 'active' : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') {
                      const periods: TimePeriod[] = ['1D', '1W', '1M', '3M', '1Y'];
                      const currentIndex = periods.indexOf(selectedPeriod);
                      if (currentIndex < periods.length - 1) {
                        handlePeriodChange(periods[currentIndex + 1]);
                        (e.target as HTMLElement).nextElementSibling?.focus();
                      }
                    }
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
            <div className="chart-type-dropdown">
              <button
                onClick={() => setShowChartTypeMenu(!showChartTypeMenu)}
                className="chart-type-button"
              >
                📈 Chart Type
              </button>
              {showChartTypeMenu && (
                <div className="chart-type-menu">
                  <button onClick={() => { setChartType('line'); setShowChartTypeMenu(false); }}>Line</button>
                  <button onClick={() => { setChartType('candlestick'); setShowChartTypeMenu(false); }}>Candlestick</button>
                  <button onClick={() => { setChartType('area'); setShowChartTypeMenu(false); }}>Area</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="chart-content">
          <div className="chart-summary">
            <p className={`change ${performanceData.percentageChange >= 0 ? 'positive' : 'negative'}`}>
              {formatPercentage(performanceData.percentageChange)}
            </p>
            <p className="trades-count">{performanceData.trades} trades</p>
            <p className="win-rate">Win rate: {Math.round(performanceData.winRate * 100)}%</p>
          </div>

          <div ref={chartRef} className="performance-chart" data-testid="performance-chart">
            {renderChart()}
          </div>

          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-dot portfolio" />
              Portfolio Value
            </span>
            <span className="legend-item">
              <span className="legend-dot pnl" />
              Profit/Loss
            </span>
          </div>
        </div>
      </div>

      <div className="asset-allocation-section">
        <div className="section-header">
          <h3>Asset Allocation</h3>
          <select
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value as AssetFilter)}
            className="asset-filter"
            aria-label="Filter by asset type"
          >
            <option value="all">All Assets</option>
            <option value="crypto">Crypto</option>
            <option value="stocks">Stocks</option>
            <option value="forex">Forex</option>
            <option value="commodities">Commodities</option>
          </select>
        </div>

        <div className="allocation-content">
          <div ref={assetChartRef} className="allocation-chart" data-testid="asset-allocation-chart">
            {renderAssetAllocationChart()}
          </div>

          <div className="asset-list">
            {filteredAssets.map(asset => (
              <div key={asset.symbol} className="asset-item">
                <span className="asset-symbol">{asset.symbol}</span>
                <span className="asset-percentage">{asset.percentage}%</span>
                <span className={`asset-pnl ${asset.pnl >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(asset.pnl)}
                </span>
              </div>
            ))}
          </div>

          <div className="performance-highlights">
            <div className="highlight-card best">
              <h4>Best Performing</h4>
              <p className="asset-name">{portfolioData.bestPerformingAsset.symbol}</p>
              <p className="performance-value positive">
                {formatPercentage(portfolioData.bestPerformingAsset.percentage)}
              </p>
            </div>
            <div className="highlight-card worst">
              <h4>Worst Performing</h4>
              <p className="asset-name">{portfolioData.worstPerformingAsset.symbol}</p>
              <p className="performance-value negative">
                {formatPercentage(portfolioData.worstPerformingAsset.percentage)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="recent-trades-section">
        <h3>Recent Trades</h3>
        <table
          className="trades-table"
          data-testid="recent-trades-table"
          role="table"
          aria-label="Recent Trades"
        >
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Price</th>
              <th>P&L</th>
              <th>Status</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {recentTrades.map(trade => (
              <tr key={trade.id}>
                <td>{trade.symbol}</td>
                <td className={`trade-type ${trade.type}`}>
                  {trade.type === 'buy' ? 'Buy' : 'Sell'}
                </td>
                <td>{trade.amount}</td>
                <td>{formatCurrency(trade.price)}</td>
                <td className={trade.pnl >= 0 ? 'positive' : 'negative'}>
                  {formatCurrency(trade.pnl)} ({formatPercentage(trade.pnlPercentage)})
                </td>
                <td className={`status ${trade.status}`}>
                  {trade.status === 'open' ? 'Open' : 'Closed'}
                </td>
                <td>
                  {trade.copiedFrom ? `Copied from ${trade.copiedFrom}` : 'Manual'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tradesLimit === 50 && (
          <button
            onClick={handleLoadMoreTrades}
            className="load-more-button"
          >
            Load More Trades
          </button>
        )}
      </div>

      {exportSuccess && (
        <div className="notification success">Data exported successfully</div>
      )}

      {exportError && (
        <div className="notification error">{exportError}</div>
      )}

      {tradeNotification && (
        <div className="notification info">{tradeNotification}</div>
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {loading ? 'Loading portfolio...' : 'Portfolio loaded'}
      </div>
    </div>
  );
};

export default PortfolioAnalytics;