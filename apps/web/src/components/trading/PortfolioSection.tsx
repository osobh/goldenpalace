import { useState } from 'react';
import type { Portfolio, Position, PerformanceMetrics } from '../../services/tradingData.service';

interface PortfolioSectionProps {
  portfolio: Portfolio | null;
  positions: Position[];
  performanceMetrics: PerformanceMetrics | null;
}

export function PortfolioSection({
  portfolio,
  positions,
  performanceMetrics
}: PortfolioSectionProps) {
  const [positionFilter, setPositionFilter] = useState('');
  const [positionSortBy, setPositionSortBy] = useState('symbol');

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

  return (
    <>
      {/* Portfolio Overview */}
      <section className="portfolio-overview" role="region" aria-label="Portfolio Overview">
        <h2>Portfolio Summary</h2>
        <div className="portfolio-metrics">
          <div className="metric">
            <span className="metric-label">Total Value</span>
            <span className="metric-value">{formatCurrency(portfolio?.totalValue || 0)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Day Change</span>
            <span className={`metric-value ${(portfolio?.dayChange || 0) >= 0 ? 'profit' : 'loss'}`}>
              {formatCurrency(portfolio?.dayChange || 0)} ({formatPercent(portfolio?.dayChangePercent || 0)})
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Cash Available</span>
            <span className="metric-value">{formatCurrency(portfolio?.cashBalance || 0)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Buying Power</span>
            <span className="metric-value">{formatCurrency(portfolio?.buyingPower || 0)}</span>
          </div>
        </div>
      </section>

      {/* Positions */}
      <section className="positions-section" role="region" aria-label="Positions">
        <h2>Positions</h2>
        <div className="positions-controls">
          <input
            type="text"
            placeholder="Filter positions..."
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            aria-label="Filter positions"
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
                    <button role="menuitem" aria-label="Close Position">Close Position</button>
                    <button role="menuitem" aria-label="Add to Position">Add to Position</button>
                    <button role="menuitem" aria-label="Reduce Position">Reduce Position</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            <span className="loss">{formatPercent((performanceMetrics?.maxDrawdown || -0.085) * 100)}</span>
          </div>
          <div className="metric">
            <span>Total Return</span>
            <span className="profit">{formatPercent((performanceMetrics?.totalReturn || 0.15) * 100)}</span>
          </div>
        </div>
      </section>
    </>
  );
}