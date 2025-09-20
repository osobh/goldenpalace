import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioSection } from '../PortfolioSection';
import type { Portfolio, Position, PerformanceMetrics } from '../../../services/tradingData.service';

describe('PortfolioSection', () => {
  const mockPortfolio: Portfolio = {
    id: 'portfolio-1',
    userId: 'user-1',
    totalValue: 100000,
    availableCash: 50000,
    totalPnL: 5000,
    totalPnLPercent: 5.26,
    positions: [],
    lastUpdated: '2024-01-01T00:00:00Z',
    dayChange: 1250,
    dayChangePercent: 1.26,
    cashBalance: 50000,
    buyingPower: 100000,
  };

  const mockPositions: Position[] = [
    {
      id: 'pos-1',
      symbol: 'AAPL',
      quantity: 100,
      averagePrice: 145.50,
      currentPrice: 150.25,
      marketValue: 15025,
      pnl: 475,
      pnlPercent: 3.26,
      side: 'LONG',
    },
    {
      id: 'pos-2',
      symbol: 'GOOGL',
      quantity: 10,
      averagePrice: 2750.00,
      currentPrice: 2800.50,
      marketValue: 28005,
      pnl: 505,
      pnlPercent: 1.84,
      side: 'LONG',
    },
  ];

  const mockPerformanceMetrics: PerformanceMetrics = {
    totalReturn: 0.15,
    winRate: 0.65,
    sharpeRatio: 1.75,
    maxDrawdown: -0.085,
    averageWin: 500,
    averageLoss: -200,
    profitFactor: 2.5,
    numberOfTrades: 100,
  };

  it('should render portfolio overview section', () => {
    render(
      <PortfolioSection
        portfolio={mockPortfolio}
        positions={mockPositions}
        performanceMetrics={mockPerformanceMetrics}
      />
    );

    expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();

    // Check for portfolio values in the portfolio section specifically
    const portfolioSection = screen.getByRole('region', { name: 'Portfolio Overview' });
    expect(portfolioSection).toHaveTextContent('$100,000.00');
    expect(portfolioSection).toHaveTextContent('$50,000.00');
  });

  it('should render positions table', () => {
    render(
      <PortfolioSection
        portfolio={mockPortfolio}
        positions={mockPositions}
        performanceMetrics={mockPerformanceMetrics}
      />
    );

    expect(screen.getByRole('table', { name: 'Positions' })).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('GOOGL')).toBeInTheDocument();
    expect(screen.getByText('$15,025.00')).toBeInTheDocument();
    expect(screen.getByText('$28,005.00')).toBeInTheDocument();
  });

  it('should format currency values correctly', () => {
    render(
      <PortfolioSection
        portfolio={mockPortfolio}
        positions={mockPositions}
        performanceMetrics={mockPerformanceMetrics}
      />
    );

    expect(screen.getByText('+$475.00')).toBeInTheDocument();
    expect(screen.getByText('+$505.00')).toBeInTheDocument();
  });

  it('should format percentage values correctly', () => {
    render(
      <PortfolioSection
        portfolio={mockPortfolio}
        positions={mockPositions}
        performanceMetrics={mockPerformanceMetrics}
      />
    );

    expect(screen.getByText('+3.26%')).toBeInTheDocument();
    expect(screen.getByText('+1.84%')).toBeInTheDocument();
  });

  it('should handle null portfolio gracefully', () => {
    render(
      <PortfolioSection
        portfolio={null}
        positions={[]}
        performanceMetrics={null}
      />
    );

    expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();

    // Check specifically in portfolio section
    const portfolioSection = screen.getByRole('region', { name: 'Portfolio Overview' });
    expect(portfolioSection).toHaveTextContent('$0.00');
  });

  it('should filter positions based on search input', () => {
    render(
      <PortfolioSection
        portfolio={mockPortfolio}
        positions={mockPositions}
        performanceMetrics={mockPerformanceMetrics}
      />
    );

    const filterInput = screen.getByPlaceholderText('Filter positions...');
    fireEvent.change(filterInput, { target: { value: 'AAPL' } });

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.queryByText('GOOGL')).not.toBeInTheDocument();
  });

  it('should sort positions by symbol when column header clicked', () => {
    render(
      <PortfolioSection
        portfolio={mockPortfolio}
        positions={mockPositions}
        performanceMetrics={mockPerformanceMetrics}
      />
    );

    const symbolHeader = screen.getByRole('columnheader', { name: /Symbol/i });
    fireEvent.click(symbolHeader);

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('AAPL');
    expect(rows[2]).toHaveTextContent('GOOGL');
  });

  it('should display performance metrics', () => {
    render(
      <PortfolioSection
        portfolio={mockPortfolio}
        positions={mockPositions}
        performanceMetrics={mockPerformanceMetrics}
      />
    );

    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument(); // Win Rate
    expect(screen.getByText('1.75')).toBeInTheDocument(); // Sharpe Ratio
    expect(screen.getByText('-8.50%')).toBeInTheDocument(); // Max Drawdown
    expect(screen.getByText('+15.00%')).toBeInTheDocument(); // Total Return
  });

  it('should apply profit/loss CSS classes', () => {
    render(
      <PortfolioSection
        portfolio={mockPortfolio}
        positions={mockPositions}
        performanceMetrics={mockPerformanceMetrics}
      />
    );

    // Check specific P&L cells in the positions table
    const positionsTable = screen.getByRole('table', { name: 'Positions' });
    const applePnlCell = positionsTable.querySelector('[class*="profit"]');
    expect(applePnlCell).toBeInTheDocument();
  });

  it('should handle position actions menu', () => {
    render(
      <PortfolioSection
        portfolio={mockPortfolio}
        positions={mockPositions}
        performanceMetrics={mockPerformanceMetrics}
      />
    );

    const actionButtons = screen.getAllByLabelText('Actions');
    expect(actionButtons).toHaveLength(2);

    fireEvent.click(actionButtons[0]);

    // Check within the positions table for the menu items
    const positionsTable = screen.getByRole('table', { name: 'Positions' });
    expect(positionsTable).toHaveTextContent('Close Position');
    expect(positionsTable).toHaveTextContent('Add to Position');
    expect(positionsTable).toHaveTextContent('Reduce Position');
  });

  it('should have proper accessibility attributes', () => {
    render(
      <PortfolioSection
        portfolio={mockPortfolio}
        positions={mockPositions}
        performanceMetrics={mockPerformanceMetrics}
      />
    );

    expect(screen.getByRole('region', { name: 'Portfolio Overview' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Positions' })).toBeInTheDocument();
    expect(screen.getByLabelText('Filter positions')).toBeInTheDocument();
  });

  it('should handle empty positions array', () => {
    render(
      <PortfolioSection
        portfolio={mockPortfolio}
        positions={[]}
        performanceMetrics={mockPerformanceMetrics}
      />
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
  });
});