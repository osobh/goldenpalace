import { useState, useEffect, useCallback, useRef } from 'react';
import { TradingDataService } from '../../services/tradingData.service';
import { useAuthStore } from '../../stores/authStore';
import { OrderBook } from './OrderBook';
import type {
  Portfolio,
  Position,
  MarketData,
  Order,
  OrderBook as OrderBookType,
  RiskMetrics,
  PerformanceMetrics,
} from '../../services/tradingData.service';
import './TradingDashboard.css';

interface TradingDashboardProps {
  tradingService: TradingDataService;
}

interface WatchlistItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

interface MarketIndicator {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LIMIT';
type OrderSide = 'BUY' | 'SELL';
type ChartTimeframe = '1D' | '1W' | '1M' | '3M' | '1Y';

export function TradingDashboard({ tradingService }: TradingDashboardProps) {
  const { user } = useAuthStore();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [marketIndicators, setMarketIndicators] = useState<MarketIndicator[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [orderBookData, setOrderBookData] = useState<OrderBookType | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Order form state
  const [orderSymbol, setOrderSymbol] = useState('');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [orderSide, setOrderSide] = useState<OrderSide>('BUY');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [orderValidationErrors, setOrderValidationErrors] = useState<Record<string, string>>({});
  const [orderMessage, setOrderMessage] = useState('');

  // UI state
  const [positionFilter, setPositionFilter] = useState('');
  const [positionSortBy, setPositionSortBy] = useState('symbol');
  const [showOrderPreview, setShowOrderPreview] = useState(false);
  const [showAddToWatchlist, setShowAddToWatchlist] = useState(false);
  const [showPositionSizeCalculator, setShowPositionSizeCalculator] = useState(false);
  const [showModifyOrderDialog, setShowModifyOrderDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('1D');
  const [showIndicators, setShowIndicators] = useState(false);
  const [showDrawingTools, setShowDrawingTools] = useState(false);

  // Real-time updates
  const priceUpdateInterval = useRef<NodeJS.Timeout>();
  const portfolioUpdateInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const init = async () => {
      await loadInitialData();
      setupRealTimeUpdates();
      setupKeyboardShortcuts();
    };
    init();

    return () => {
      if (priceUpdateInterval.current) clearInterval(priceUpdateInterval.current);
      if (portfolioUpdateInterval.current) clearInterval(portfolioUpdateInterval.current);
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await tradingService.authenticate('auth-token');
      await tradingService.connect();

      const [
        portfolioData,
        positionsData,
        ordersData,
        riskData,
        performanceData,
        orderBook,
      ] = await Promise.all([
        tradingService.getPortfolio(),
        tradingService.getPositions(),
        tradingService.getOpenOrders(),
        tradingService.getRiskMetrics(),
        tradingService.getPerformanceMetrics({ startDate: '2023-01-01', endDate: '2023-12-31' }),
        tradingService.getOrderBook(selectedSymbol),
      ]);

      setPortfolio(portfolioData);
      setPositions(positionsData);
      setOpenOrders(ordersData);
      setRiskMetrics(riskData);
      setPerformanceMetrics(performanceData);
      setOrderBookData(orderBook);

      // Initialize watchlist
      setWatchlist([
        { symbol: 'AAPL', price: 150.25, change: 2.50, changePercent: 1.69 },
        { symbol: 'GOOGL', price: 2800.50, change: 45.25, changePercent: 1.64 },
        { symbol: 'MSFT', price: 380.75, change: -5.50, changePercent: -1.42 },
      ]);

      // Initialize market indicators
      setMarketIndicators([
        { name: 'S&P 500', value: 4783.45, change: 32.25, changePercent: 0.68 },
        { name: 'NASDAQ', value: 14963.25, change: 125.50, changePercent: 0.85 },
        { name: 'DOW', value: 37545.33, change: 250.25, changePercent: 0.67 },
        { name: 'VIX', value: 13.25, change: -0.75, changePercent: -5.36 },
      ]);

      setIsLoading(false);
    } catch (err) {
      setError('Failed to load portfolio');
      setIsLoading(false);
    }
  };

  const setupRealTimeUpdates = () => {
    // Price updates
    tradingService.subscribeToPriceUpdates(selectedSymbol, (priceData) => {
      setWatchlist(prev => prev.map(item =>
        item.symbol === priceData.symbol
          ? { ...item, price: priceData.price }
          : item
      ));
    });

    // Portfolio updates
    tradingService.subscribeToPortfolioUpdates((update) => {
      setPortfolio(update.portfolio);
    });

    // Order updates
    tradingService.subscribeToOrderUpdates((update) => {
      setOpenOrders(prev => prev.map(order =>
        order.id === update.orderId
          ? { ...order, status: update.status }
          : order
      ));

      if (update.status === 'FILLED') {
        setOrderMessage(`Order ${update.orderId} filled`);
      }
    });

    // Simulate real-time updates
    priceUpdateInterval.current = setInterval(() => {
      setWatchlist(prev => prev.map(item => ({
        ...item,
        price: item.price + (Math.random() - 0.5) * 0.5,
        change: item.change + (Math.random() - 0.5) * 0.1,
      })));
    }, 2000);
  };

  const setupKeyboardShortcuts = () => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
  };

  const handleKeyboardShortcuts = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'b':
        setOrderSide('BUY');
        document.querySelector<HTMLElement>('.order-entry-form')?.classList.add('buy-mode');
        document.querySelector<HTMLElement>('.order-entry-form')?.classList.remove('sell-mode');
        break;
      case 's':
        setOrderSide('SELL');
        document.querySelector<HTMLElement>('.order-entry-form')?.classList.add('sell-mode');
        document.querySelector<HTMLElement>('.order-entry-form')?.classList.remove('buy-mode');
        break;
      case 'escape':
        handleCancelAllOrders();
        break;
    }
  };

  const validateOrder = (): boolean => {
    const errors: Record<string, string> = {};

    if (!orderSymbol.trim()) {
      errors.symbol = 'Symbol is required';
    }

    if (!orderQuantity || parseInt(orderQuantity) <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }

    if (orderType === 'LIMIT' && !limitPrice) {
      errors.limitPrice = 'Limit price is required';
    }

    if ((orderType === 'STOP_LOSS' || orderType === 'STOP_LIMIT') && !stopPrice) {
      errors.stopPrice = 'Stop price is required';
    }

    // Check risk limits
    const orderValue = parseInt(orderQuantity || '0') * 150; // Approximate value
    if (portfolio && orderValue > portfolio.totalValue * 0.1) {
      errors.risk = 'Risk limit exceeded';
    }

    setOrderValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!validateOrder()) {
      return;
    }

    try {
      const order = await tradingService.placeOrder({
        symbol: orderSymbol,
        side: orderSide,
        quantity: parseInt(orderQuantity),
        type: orderType,
        price: limitPrice ? parseFloat(limitPrice) : undefined,
        stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
      });

      if (orderType === 'MARKET') {
        setOrderMessage('Order placed successfully');
      } else if (orderType === 'LIMIT') {
        setOrderMessage('Limit order placed');
      }

      // Reset form
      setOrderSymbol('');
      setOrderQuantity('');
      setLimitPrice('');
      setStopPrice('');
      setOrderValidationErrors({});

      // Refresh orders
      const updatedOrders = await tradingService.getOpenOrders();
      setOpenOrders(updatedOrders);
    } catch (err) {
      setOrderMessage('Failed to place order');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (window.confirm('Cancel this order?')) {
      const success = await tradingService.cancelOrder(orderId);
      if (success) {
        setOrderMessage('Order cancelled');
        const updatedOrders = await tradingService.getOpenOrders();
        setOpenOrders(updatedOrders);
      }
    }
  };

  const handleModifyOrder = async () => {
    if (!selectedOrder) return;

    const modified = await tradingService.modifyOrder(selectedOrder.id, {
      quantity: parseInt(orderQuantity),
      price: limitPrice ? parseFloat(limitPrice) : undefined,
    });

    setOrderMessage('Order modified');
    setShowModifyOrderDialog(false);
    setSelectedOrder(null);

    const updatedOrders = await tradingService.getOpenOrders();
    setOpenOrders(updatedOrders);
  };

  const handleCancelAllOrders = async () => {
    for (const order of openOrders) {
      await tradingService.cancelOrder(order.id);
    }
    setOrderMessage('All orders cancelled');
    setOpenOrders([]);
  };

  const handleAddToWatchlist = async (symbol: string) => {
    const marketData = await tradingService.getMarketData(symbol);
    setWatchlist(prev => [...prev, {
      symbol,
      price: marketData.price,
      change: marketData.change,
      changePercent: marketData.changePercent,
    }]);
    setShowAddToWatchlist(false);
  };

  const handleRetry = () => {
    setError(null);
    loadInitialData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getSortedPositions = () => {
    let filtered = positions;

    if (positionFilter) {
      filtered = positions.filter(p =>
        p.symbol.toLowerCase().includes(positionFilter.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      switch (positionSortBy) {
        case 'symbol':
          return a.symbol.localeCompare(b.symbol);
        case 'pnl':
          return b.pnl - a.pnl;
        case 'value':
          return b.marketValue - a.marketValue;
        default:
          return 0;
      }
    });
  };

  if (isLoading) {
    return (
      <div className="trading-dashboard-loading">
        <div className="loading-spinner" aria-label="Loading portfolio data" />
        <p>Loading portfolio data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trading-dashboard-error">
        <p>{error}</p>
        <button onClick={handleRetry} aria-label="Retry">
          Retry
        </button>
      </div>
    );
  }

  return (
    <main className="trading-dashboard" role="main" aria-label="Trading Dashboard">
      <div className="dashboard-header">
        <h1>Trading Dashboard</h1>
        <div className="header-actions">
          <button
            onClick={() => setShowPositionSizeCalculator(true)}
            aria-label="Position Size Calculator"
          >
            Position Size Calculator
          </button>
        </div>
      </div>

      <div className="dashboard-layout">
        {/* Portfolio Overview */}
        <section className="portfolio-overview" role="region" aria-label="Portfolio Overview">
          <h2>Portfolio Summary</h2>
          <div className="portfolio-metrics">
            <div className="metric">
              <span className="metric-label">Total Value</span>
              <span className="metric-value">{formatCurrency(portfolio?.totalValue || 0)}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Available Cash</span>
              <span className="metric-value">{formatCurrency(portfolio?.availableCash || 0)}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Total P&L</span>
              <span className={`metric-value ${portfolio?.totalPnL >= 0 ? 'profit' : 'loss'}`}>
                {portfolio?.totalPnL >= 0 ? '+' : ''}{formatCurrency(portfolio?.totalPnL || 0)}
              </span>
              <span className={`metric-percent ${portfolio?.totalPnLPercent >= 0 ? 'profit' : 'loss'}`}>
                {formatPercent(portfolio?.totalPnLPercent || 0)}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Today's P&L</span>
              <span className="metric-value profit">+{formatCurrency(1250)}</span>
              <span className="metric-percent profit">+1.26%</span>
            </div>
          </div>
        </section>

        {/* Positions Table */}
        <section className="positions-section" role="region" aria-label="Positions">
          <div className="section-header">
            <h2>Positions</h2>
            <input
              type="text"
              placeholder="Filter positions..."
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="filter-input"
            />
          </div>
          <table role="table" aria-label="Positions">
            <thead>
              <tr>
                <th
                  role="columnheader"
                  onClick={() => setPositionSortBy('symbol')}
                  className="sortable"
                >
                  Symbol
                </th>
                <th>Quantity</th>
                <th>Avg Price</th>
                <th>Current Price</th>
                <th>Market Value</th>
                <th>P&L</th>
                <th>P&L %</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getSortedPositions().map(position => (
                <tr key={position.id} role="row" aria-label={position.symbol}>
                  <td>{position.symbol}</td>
                  <td>{formatNumber(position.quantity)}</td>
                  <td>{formatCurrency(position.averagePrice)}</td>
                  <td>{formatCurrency(position.currentPrice)}</td>
                  <td>{formatCurrency(position.marketValue)}</td>
                  <td className={position.pnl >= 0 ? 'profit' : 'loss'}>
                    {position.pnl >= 0 ? '+' : ''}{formatCurrency(position.pnl)}
                  </td>
                  <td className={position.pnlPercent >= 0 ? 'profit' : 'loss'}>
                    {formatPercent(position.pnlPercent)}
                  </td>
                  <td>
                    <button
                      className="action-button"
                      aria-label="Actions"
                      onClick={(e) => {
                        const menu = e.currentTarget.nextElementSibling;
                        if (menu) {
                          menu.classList.toggle('visible');
                        }
                      }}
                    >
                      ⋮
                    </button>
                    <div className="actions-menu">
                      <button role="menuitem">Close Position</button>
                      <button role="menuitem">Add to Position</button>
                      <button role="menuitem">Reduce Position</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Market Data */}
        <section className="market-data" role="region" aria-label="Market Data">
          <div className="watchlist" role="region" aria-label="Watchlist">
            <div className="section-header">
              <h3>Watchlist</h3>
              <button
                onClick={() => setShowAddToWatchlist(true)}
                aria-label="Add to Watchlist"
              >
                +
              </button>
            </div>
            <div className="watchlist-items">
              {watchlist.map(item => (
                <div
                  key={item.symbol}
                  className="watchlist-item"
                  onClick={() => setSelectedSymbol(item.symbol)}
                >
                  <span className="symbol">{item.symbol}</span>
                  <span className="price" data-testid={`${item.symbol}-price`}>
                    {formatCurrency(item.price)}
                  </span>
                  <span className={`change ${item.change >= 0 ? 'profit' : 'loss'}`}>
                    {formatPercent(item.changePercent)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="market-indicators">
            {marketIndicators.map(indicator => (
              <div key={indicator.name} className="indicator">
                <span className="indicator-name">{indicator.name}</span>
                <span className="indicator-value">{formatNumber(indicator.value)}</span>
                <span className={`indicator-change ${indicator.change >= 0 ? 'profit' : 'loss'}`}>
                  {formatPercent(indicator.changePercent)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Order Entry */}
        <section className="trading-panel" role="region" aria-label="Trading Panel">
          <form
            className={`order-entry-form ${orderSide.toLowerCase()}-mode`}
            onSubmit={handlePlaceOrder}
            aria-label="Order Entry"
            role="form"
          >
            <h3>Order Entry</h3>

            <div className="form-group">
              <label htmlFor="order-symbol">Symbol</label>
              <input
                id="order-symbol"
                type="text"
                value={orderSymbol}
                onChange={(e) => setOrderSymbol(e.target.value)}
                aria-label="Symbol"
              />
              {orderValidationErrors.symbol && (
                <span className="error">{orderValidationErrors.symbol}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="order-quantity">Quantity</label>
              <input
                id="order-quantity"
                type="number"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
                aria-label="Quantity"
              />
              {orderValidationErrors.quantity && (
                <span className="error">{orderValidationErrors.quantity}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="order-type">Order Type</label>
              <select
                id="order-type"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as OrderType)}
                aria-label="Order Type"
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="STOP_LOSS">Stop Loss</option>
                <option value="STOP_LIMIT">Stop Limit</option>
              </select>
            </div>

            {orderType === 'LIMIT' && (
              <div className="form-group">
                <label htmlFor="limit-price">Limit Price</label>
                <input
                  id="limit-price"
                  type="number"
                  step="0.01"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  aria-label="Limit Price"
                />
              </div>
            )}

            {(orderType === 'STOP_LOSS' || orderType === 'STOP_LIMIT') && (
              <div className="form-group">
                <label htmlFor="stop-price">Stop Price</label>
                <input
                  id="stop-price"
                  type="number"
                  step="0.01"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  aria-label="Stop Price"
                />
              </div>
            )}

            <div className="order-actions">
              <button
                type="submit"
                className={`order-button ${orderSide.toLowerCase()}`}
                onClick={() => setOrderSide('BUY')}
              >
                Buy
              </button>
              <button
                type="submit"
                className={`order-button ${orderSide.toLowerCase()}`}
                onClick={() => setOrderSide('SELL')}
              >
                Sell
              </button>
              <button
                type="button"
                onClick={() => setShowOrderPreview(true)}
                aria-label="Preview Order"
              >
                Preview Order
              </button>
            </div>

            {orderValidationErrors.risk && (
              <div className="risk-warning">{orderValidationErrors.risk}</div>
            )}

            {orderMessage && (
              <div className="order-message">{orderMessage}</div>
            )}
          </form>

          {/* Open Orders */}
          <div className="open-orders" role="region" aria-label="Open Orders">
            <h3>Open Orders</h3>
            <div className="orders-list">
              {openOrders.map(order => (
                <div key={order.id} className="order-item">
                  <div className="order-details">
                    <span>{order.symbol} - {order.side} {order.quantity} @ {formatCurrency(order.price || 0)}</span>
                    <span className="order-status">{order.status}</span>
                  </div>
                  <div className="order-actions">
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      aria-label="Cancel Order"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowModifyOrderDialog(true);
                      }}
                      aria-label="Modify Order"
                    >
                      Modify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Price Chart */}
        <section className="chart-section" role="region" aria-label="Price Chart">
          <div className="chart-header">
            <h3>{selectedSymbol} Chart</h3>
            <div className="timeframe-selector" role="group" aria-label="Timeframe">
              {(['1D', '1W', '1M', '3M', '1Y'] as ChartTimeframe[]).map(tf => (
                <button
                  key={tf}
                  className={chartTimeframe === tf ? 'active' : ''}
                  onClick={() => setChartTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
            <button onClick={() => setShowIndicators(true)} aria-label="Indicators">
              Indicators
            </button>
            <button onClick={() => setShowDrawingTools(true)} aria-label="Drawing Tools">
              Drawing Tools
            </button>
          </div>
          <div className="price-chart" data-testid={`price-chart-${selectedSymbol}`}>
            {/* Chart implementation would go here */}
            <div style={{ height: '400px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Price Chart Placeholder
            </div>
          </div>
        </section>

        {/* Performance Metrics */}
        <section className="performance-section">
          <h3>Performance Metrics</h3>
          <div className="performance-metrics">
            <div className="metric">
              <span>Win Rate</span>
              <span>{(performanceMetrics?.winRate || 0.65) * 100}%</span>
            </div>
            <div className="metric">
              <span>Sharpe Ratio</span>
              <span>{performanceMetrics?.sharpeRatio || 1.75}</span>
            </div>
            <div className="metric">
              <span>Max Drawdown</span>
              <span>{formatPercent((performanceMetrics?.maxDrawdown || -0.18) * 100)}</span>
            </div>
          </div>
          <div className="performance-chart" role="region" aria-label="Performance Chart">
            <div data-testid="performance-chart" style={{ height: '200px', background: '#f5f5f5' }}>
              Performance Chart Placeholder
            </div>
          </div>
        </section>

        {/* Risk Metrics */}
        <section className="risk-section">
          <h3>Risk Management</h3>
          <div className="risk-metrics">
            <div className="metric">
              <span>Value at Risk (1D)</span>
              <span>{formatCurrency(riskMetrics?.valueAtRisk.oneDay || -2500)}</span>
            </div>
            <div className="metric">
              <span>Beta</span>
              <span>{riskMetrics?.beta || 1.15}</span>
            </div>
            <div className="metric">
              <span>Volatility</span>
              <span>{formatPercent((riskMetrics?.volatility || 0.22) * 100)}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Dialogs */}
      {showOrderPreview && (
        <div className="dialog" role="dialog" aria-label="Order Preview">
          <div className="dialog-content">
            <h3>Order Preview</h3>
            <p>Symbol: {orderSymbol}</p>
            <p>Quantity: {orderQuantity}</p>
            <p>Type: {orderType}</p>
            <p>Estimated Cost: {formatCurrency(parseInt(orderQuantity || '0') * 150.25)}</p>
            <button onClick={() => setShowOrderPreview(false)}>Close</button>
          </div>
        </div>
      )}

      {showModifyOrderDialog && selectedOrder && (
        <div className="dialog" role="dialog" aria-label="Modify Order">
          <div className="dialog-content">
            <h3>Modify Order</h3>
            <input
              type="number"
              value={orderQuantity}
              onChange={(e) => setOrderQuantity(e.target.value)}
              aria-label="New Quantity"
            />
            <input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              aria-label="New Price"
              placeholder="New Price"
            />
            <button onClick={handleModifyOrder}>Save Changes</button>
            <button onClick={() => setShowModifyOrderDialog(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showAddToWatchlist && (
        <div className="dialog">
          <div className="dialog-content">
            <h3>Add to Watchlist</h3>
            <input
              type="text"
              placeholder="Enter symbol"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddToWatchlist(e.currentTarget.value);
                }
              }}
            />
            <button onClick={() => setShowAddToWatchlist(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showPositionSizeCalculator && (
        <div className="dialog" role="dialog" aria-label="Position Size Calculator">
          <div className="dialog-content">
            <h3>Position Size Calculator</h3>
            <label>Account Risk %</label>
            <input type="number" step="0.1" placeholder="1.0" />
            <label>Stop Loss %</label>
            <input type="number" step="0.1" placeholder="2.0" />
            <button onClick={() => setShowPositionSizeCalculator(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Indicators Menu */}
      {showIndicators && (
        <div className="menu" role="menu">
          <label><input type="checkbox" role="checkbox" /> SMA</label>
          <label><input type="checkbox" role="checkbox" /> EMA</label>
          <label><input type="checkbox" role="checkbox" /> RSI</label>
          <label><input type="checkbox" role="checkbox" /> MACD</label>
          <button onClick={() => setShowIndicators(false)}>Close</button>
        </div>
      )}

      {/* Drawing Tools Menu */}
      {showDrawingTools && (
        <div className="menu">
          <button>Trend Line</button>
          <button>Horizontal Line</button>
          <button>Fibonacci</button>
          <button onClick={() => setShowDrawingTools(false)}>Close</button>
        </div>
      )}

      {/* Screen Reader Announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {orderMessage}
      </div>
    </main>
  );
}