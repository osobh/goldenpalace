import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioCard } from '../PortfolioCard';
import type { Portfolio } from '../../../services/portfolio.service';

const mockPortfolio: Portfolio = {
  id: 'portfolio-1',
  name: 'Tech Growth Portfolio',
  description: 'High-growth technology stocks for long-term investment',
  initialBalance: 50000,
  currentBalance: 48500,
  totalValue: 62500,
  currency: 'USD',
  isPublic: false,
  status: 'ACTIVE',
  createdAt: '2023-01-15T10:30:00Z',
  assets: [
    {
      id: 'asset-1',
      symbol: 'AAPL',
      name: 'Apple Inc',
      type: 'STOCK',
      quantity: 100,
      averagePrice: 150,
      currentPrice: 180,
      totalValue: 18000,
      costBasis: 15000,
      unrealizedPnl: 3000,
      realizedPnl: 0,
      percentageGain: 20,
      allocation: 28.8,
      currency: 'USD',
    },
    {
      id: 'asset-2',
      symbol: 'GOOGL',
      name: 'Alphabet Inc',
      type: 'STOCK',
      quantity: 25,
      averagePrice: 2000,
      currentPrice: 2200,
      totalValue: 55000,
      costBasis: 50000,
      unrealizedPnl: 5000,
      realizedPnl: 0,
      percentageGain: 10,
      allocation: 88,
      currency: 'USD',
    },
  ],
  totalReturn: 12500,
  totalReturnPercentage: 25,
  dayChange: 750,
  dayChangePercentage: 1.2,
  riskMetrics: {
    sharpeRatio: 1.45,
    volatility: 16.2,
    beta: 1.05,
    maxDrawdown: 8.5,
  },
};

describe('PortfolioCard', () => {
  it('should render portfolio basic information', () => {
    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={mockPortfolio} onClick={mockOnClick} />);

    expect(screen.getByText('Tech Growth Portfolio')).toBeInTheDocument();
    expect(screen.getByText('High-growth technology stocks for long-term investment')).toBeInTheDocument();
    expect(screen.getByText('$62,500.00')).toBeInTheDocument();
    expect(screen.getByText((content, element) =>
      element?.tagName === 'SPAN' && element?.textContent === '+$12,500.00 (+25.00%)'
    )).toBeInTheDocument();
  });

  it('should display positive returns with green styling', () => {
    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={mockPortfolio} onClick={mockOnClick} />);

    const returnElement = screen.getByText((content, element) =>
      element?.tagName === 'SPAN' && element?.textContent === '+$12,500.00 (+25.00%)'
    );
    expect(returnElement).toHaveClass('text-green-600');
  });

  it('should display negative returns with red styling', () => {
    const negativePortfolio = {
      ...mockPortfolio,
      totalReturn: -2500,
      totalReturnPercentage: -5,
      dayChange: -150,
      dayChangePercentage: -0.24,
    };

    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={negativePortfolio} onClick={mockOnClick} />);

    const returnElement = screen.getByText((content, element) =>
      element?.tagName === 'SPAN' && element?.textContent === '-$2,500.00 (-5.00%)'
    );
    expect(returnElement).toHaveClass('text-red-600');
  });

  it('should display day change information', () => {
    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={mockPortfolio} onClick={mockOnClick} />);

    expect(screen.getByText('+$750.00')).toBeInTheDocument();
    expect(screen.getByText('(+1.20%)')).toBeInTheDocument();
  });

  it('should show portfolio status badge', () => {
    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={mockPortfolio} onClick={mockOnClick} />);

    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('should display privacy indicator for private portfolios', () => {
    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={mockPortfolio} onClick={mockOnClick} />);

    expect(screen.getByLabelText('Private portfolio')).toBeInTheDocument();
  });

  it('should display public indicator for public portfolios', () => {
    const publicPortfolio = { ...mockPortfolio, isPublic: true };
    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={publicPortfolio} onClick={mockOnClick} />);

    expect(screen.getByLabelText('Public portfolio')).toBeInTheDocument();
  });

  it('should show asset count', () => {
    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={mockPortfolio} onClick={mockOnClick} />);

    expect(screen.getByText('2 assets')).toBeInTheDocument();
  });

  it('should format creation date correctly', () => {
    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={mockPortfolio} onClick={mockOnClick} />);

    expect(screen.getByText('Created Jan 15, 2023')).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', () => {
    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={mockPortfolio} onClick={mockOnClick} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledWith(mockPortfolio.id);
  });

  it('should show risk metrics when available', () => {
    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={mockPortfolio} onClick={mockOnClick} />);

    expect(screen.getByText('Sharpe: 1.45')).toBeInTheDocument();
    expect(screen.getByText('Volatility: 16.2%')).toBeInTheDocument();
  });

  it('should handle portfolio without risk metrics', () => {
    const portfolioWithoutRisk = {
      ...mockPortfolio,
      riskMetrics: undefined,
    };

    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={portfolioWithoutRisk} onClick={mockOnClick} />);

    expect(screen.queryByText('Sharpe:')).not.toBeInTheDocument();
    expect(screen.queryByText('Volatility:')).not.toBeInTheDocument();
  });

  it('should handle portfolio without description', () => {
    const portfolioWithoutDescription = {
      ...mockPortfolio,
      description: undefined,
    };

    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={portfolioWithoutDescription} onClick={mockOnClick} />);

    expect(screen.getByText('Tech Growth Portfolio')).toBeInTheDocument();
    expect(screen.queryByText('High-growth technology stocks for long-term investment')).not.toBeInTheDocument();
  });

  it('should show loading state when portfolio is being updated', () => {
    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={mockPortfolio} onClick={mockOnClick} isLoading={true} />);

    expect(screen.getByLabelText('Loading portfolio data')).toBeInTheDocument();
  });

  it('should be accessible with proper ARIA labels', () => {
    const mockOnClick = vi.fn();

    render(<PortfolioCard portfolio={mockPortfolio} onClick={mockOnClick} />);

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-label', 'View portfolio: Tech Growth Portfolio');
  });
});