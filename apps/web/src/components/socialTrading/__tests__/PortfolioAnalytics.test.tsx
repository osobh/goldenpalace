import React, { act } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import PortfolioAnalytics from '../PortfolioAnalytics';
import { SocialTradingService } from '../../../services/socialTrading.service';

// Create mock data for testing
const mockPortfolioData = {
  totalValue: 125000,
  totalInvested: 100000,
  totalPnL: 25000,
  pnlPercentage: 25,
  availableBalance: 35000,
  activePositions: 12,
  followingCount: 5,
  totalCopiedTrades: 234,
  successRate: 0.72,
  averageHoldTime: 3.5,
  bestPerformingAsset: {
    symbol: 'BTC/USD',
    pnl: 12500,
    percentage: 45.2
  },
  worstPerformingAsset: {
    symbol: 'EUR/USD',
    pnl: -850,
    percentage: -3.4
  },
  riskScore: 'Medium',
  diversificationScore: 0.78,
  assets: [
    { symbol: 'BTC/USD', value: 45000, percentage: 36, pnl: 12500 },
    { symbol: 'ETH/USD', value: 28000, percentage: 22.4, pnl: 5200 },
    { symbol: 'AAPL', value: 22000, percentage: 17.6, pnl: 3800 },
    { symbol: 'GOLD', value: 18000, percentage: 14.4, pnl: 2100 },
    { symbol: 'EUR/USD', value: 12000, percentage: 9.6, pnl: -850 }
  ]
};

const mockPerformanceData = {
  '1D': {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    values: [100000, 100500, 101200, 102000, 101500, 102300, 102500],
    pnl: [0, 500, 1200, 2000, 1500, 2300, 2500],
    percentageChange: 2.5,
    trades: 15,
    winRate: 0.73
  },
  '1W': {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [100000, 102000, 105000, 107500, 110000, 112000, 115000],
    pnl: [0, 2000, 5000, 7500, 10000, 12000, 15000],
    percentageChange: 15,
    trades: 45,
    winRate: 0.71
  },
  '1M': {
    labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
    values: Array.from({ length: 30 }, (_, i) => 100000 + (i * 833)),
    pnl: Array.from({ length: 30 }, (_, i) => i * 833),
    percentageChange: 25,
    trades: 234,
    winRate: 0.72
  },
  '3M': {
    labels: ['Month 1', 'Month 2', 'Month 3'],
    values: [100000, 115000, 125000],
    pnl: [0, 15000, 25000],
    percentageChange: 25,
    trades: 680,
    winRate: 0.70
  },
  '1Y': {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    values: [100000, 105000, 108000, 112000, 115000, 118000, 122000, 125000, 128000, 130000, 132000, 135000],
    pnl: [0, 5000, 8000, 12000, 15000, 18000, 22000, 25000, 28000, 30000, 32000, 35000],
    percentageChange: 35,
    trades: 2450,
    winRate: 0.69
  }
};

const mockRecentTrades = [
  {
    id: 'trade-1',
    symbol: 'BTC/USD',
    type: 'buy',
    amount: 0.5,
    price: 65000,
    timestamp: new Date('2024-12-20T10:30:00'),
    pnl: 2500,
    pnlPercentage: 7.7,
    status: 'closed',
    copiedFrom: 'ProTrader'
  },
  {
    id: 'trade-2',
    symbol: 'ETH/USD',
    type: 'sell',
    amount: 10,
    price: 3500,
    timestamp: new Date('2024-12-20T09:15:00'),
    pnl: 1200,
    pnlPercentage: 3.4,
    status: 'closed',
    copiedFrom: 'CryptoMaster'
  },
  {
    id: 'trade-3',
    symbol: 'AAPL',
    type: 'buy',
    amount: 100,
    price: 195.50,
    timestamp: new Date('2024-12-20T08:00:00'),
    pnl: -150,
    pnlPercentage: -0.8,
    status: 'open',
    copiedFrom: null
  }
];

describe('PortfolioAnalytics', () => {
  let mockSocialTradingService: any;

  beforeEach(() => {
    mockSocialTradingService = {
      getPortfolioOverview: vi.fn().mockResolvedValue(mockPortfolioData),
      getPerformanceData: vi.fn().mockImplementation((period) =>
        Promise.resolve(mockPerformanceData[period])
      ),
      getRecentTrades: vi.fn().mockResolvedValue(mockRecentTrades),
      exportPortfolioData: vi.fn().mockResolvedValue(undefined),
      subscribeToLiveUpdates: vi.fn().mockReturnValue(() => {})
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Portfolio Overview', () => {
    it('should render portfolio analytics component', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByTestId('portfolio-analytics')).toBeInTheDocument();
      });
    });

    it('should display total portfolio value', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
        expect(screen.getByText('Total Portfolio Value')).toBeInTheDocument();
      });
    });

    it('should show PnL information', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('$25,000')).toBeInTheDocument();
        expect(screen.getByText('+25.0%')).toBeInTheDocument();
      });
    });

    it('should display available balance', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('$35,000')).toBeInTheDocument();
        expect(screen.getByText('Available Balance')).toBeInTheDocument();
      });
    });

    it('should show active positions count', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('Active Positions')).toBeInTheDocument();
      });
    });

    it('should display success rate', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('72%')).toBeInTheDocument();
        expect(screen.getByText('Success Rate')).toBeInTheDocument();
      });
    });

    it('should show risk score', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Medium')).toBeInTheDocument();
        expect(screen.getByText('Risk Score')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Chart', () => {
    it('should display performance chart', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
      });
    });

    it('should have time period selectors', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '1D' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1W' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1M' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '3M' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1Y' })).toBeInTheDocument();
      });
    });

    it('should update chart when period is changed', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      const weekButton = await screen.findByRole('button', { name: '1W' });
      fireEvent.click(weekButton);

      await waitFor(() => {
        expect(mockSocialTradingService.getPerformanceData).toHaveBeenCalledWith('1W');
        expect(screen.getByText('+15.0%')).toBeInTheDocument();
      });
    });

    it('should show chart data points', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const chart = screen.getByTestId('performance-chart');
        expect(chart.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should display chart legend', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Portfolio Value')).toBeInTheDocument();
        expect(screen.getByText('Profit/Loss')).toBeInTheDocument();
      });
    });
  });

  describe('Asset Allocation', () => {
    it('should show asset allocation pie chart', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByTestId('asset-allocation-chart')).toBeInTheDocument();
      });
    });

    it('should display asset breakdown', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('BTC/USD')).toBeInTheDocument();
        expect(screen.getByText('36.0%')).toBeInTheDocument();
        expect(screen.getByText('ETH/USD')).toBeInTheDocument();
        expect(screen.getByText('22.4%')).toBeInTheDocument();
      });
    });

    it('should show best performing asset', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Best Performing')).toBeInTheDocument();
        expect(screen.getByText('BTC/USD')).toBeInTheDocument();
        expect(screen.getByText('+45.2%')).toBeInTheDocument();
      });
    });

    it('should show worst performing asset', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Worst Performing')).toBeInTheDocument();
        expect(screen.getByText('EUR/USD')).toBeInTheDocument();
        expect(screen.getByText('-3.4%')).toBeInTheDocument();
      });
    });

    it('should display diversification score', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('78%')).toBeInTheDocument();
        expect(screen.getByText('Diversification Score')).toBeInTheDocument();
      });
    });
  });

  describe('Recent Trades', () => {
    it('should display recent trades table', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByTestId('recent-trades-table')).toBeInTheDocument();
      });
    });

    it('should show trade details', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('BTC/USD')).toBeInTheDocument();
        expect(screen.getByText('Buy')).toBeInTheDocument();
        expect(screen.getByText('$2,500')).toBeInTheDocument();
        expect(screen.getByText('+7.7%')).toBeInTheDocument();
      });
    });

    it('should indicate copied trades', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Copied from ProTrader')).toBeInTheDocument();
        expect(screen.getByText('Copied from CryptoMaster')).toBeInTheDocument();
      });
    });

    it('should show trade status', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getAllByText('Closed')).toHaveLength(2);
        expect(screen.getByText('Open')).toBeInTheDocument();
      });
    });

    it('should allow loading more trades', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      const loadMoreButton = await screen.findByRole('button', { name: 'Load More Trades' });
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        expect(mockSocialTradingService.getRecentTrades).toHaveBeenCalledWith(100);
      });
    });
  });

  describe('Export Functionality', () => {
    it('should have export dropdown', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export Data/i })).toBeInTheDocument();
      });
    });

    it('should export as CSV', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      const exportButton = await screen.findByRole('button', { name: /Export Data/i });
      fireEvent.click(exportButton);

      const csvOption = await screen.findByText('Export as CSV');
      fireEvent.click(csvOption);

      expect(mockSocialTradingService.exportPortfolioData).toHaveBeenCalledWith('csv');
    });

    it('should export as PDF', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      const exportButton = await screen.findByRole('button', { name: /Export Data/i });
      fireEvent.click(exportButton);

      const pdfOption = await screen.findByText('Export as PDF');
      fireEvent.click(pdfOption);

      expect(mockSocialTradingService.exportPortfolioData).toHaveBeenCalledWith('pdf');
    });

    it('should export as Excel', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      const exportButton = await screen.findByRole('button', { name: /Export Data/i });
      fireEvent.click(exportButton);

      const excelOption = await screen.findByText('Export as Excel');
      fireEvent.click(excelOption);

      expect(mockSocialTradingService.exportPortfolioData).toHaveBeenCalledWith('excel');
    });

    it('should show export success message', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      const exportButton = await screen.findByRole('button', { name: /Export Data/i });
      fireEvent.click(exportButton);

      const csvOption = await screen.findByText('Export as CSV');
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(screen.getByText('Data exported successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update portfolio value in real-time', async () => {
      const mockCallback = vi.fn();
      vi.spyOn(mockSocialTradingService, 'subscribeToLiveUpdates').mockImplementation((callback) => {
        mockCallback.mockImplementation(callback);
        return () => {};
      });

      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
      });

      // Simulate portfolio update
      await act(async () => {
        mockCallback({
          type: 'portfolio_update',
          data: {
            totalValue: 127500,
            totalPnL: 27500,
            pnlPercentage: 27.5
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByText('$127,500')).toBeInTheDocument();
        expect(screen.getByText('$27,500')).toBeInTheDocument();
        expect(screen.getByText('+27.5%')).toBeInTheDocument();
      });
    });

    it('should show new trade notifications', async () => {
      const mockCallback = vi.fn();
      vi.spyOn(mockSocialTradingService, 'subscribeToLiveUpdates').mockImplementation((callback) => {
        mockCallback.mockImplementation(callback);
        return () => {};
      });

      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      // Simulate new trade
      await act(async () => {
        mockCallback({
          type: 'new_trade',
          data: {
            symbol: 'TSLA',
            type: 'buy',
            amount: 50,
            price: 250
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByText('New trade executed: Buy 50 TSLA @ $250')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Controls', () => {
    it('should filter by asset type', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      const filterSelect = await screen.findByLabelText('Filter by asset type');
      fireEvent.change(filterSelect, { target: { value: 'crypto' } });

      await waitFor(() => {
        expect(screen.getByText('BTC/USD')).toBeInTheDocument();
        expect(screen.getByText('ETH/USD')).toBeInTheDocument();
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
      });
    });

    it('should refresh data on demand', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      const refreshButton = await screen.findByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockSocialTradingService.getPortfolioOverview).toHaveBeenCalledTimes(2);
      });
    });

    it('should toggle between chart types', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      const chartTypeButton = await screen.findByRole('button', { name: /Chart Type/i });
      fireEvent.click(chartTypeButton);

      const candlestickOption = await screen.findByText('Candlestick');
      fireEvent.click(candlestickOption);

      await waitFor(() => {
        expect(screen.getByTestId('candlestick-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Summary', () => {
    it('should show average hold time', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('3.5 days')).toBeInTheDocument();
        expect(screen.getByText('Avg Hold Time')).toBeInTheDocument();
      });
    });

    it('should display total copied trades', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('234')).toBeInTheDocument();
        expect(screen.getByText('Copied Trades')).toBeInTheDocument();
      });
    });

    it('should show following count', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('Following')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle loading errors gracefully', async () => {
      mockSocialTradingService.getPortfolioOverview.mockRejectedValue(new Error('Failed to load'));

      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load portfolio data')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      });
    });

    it('should handle export errors', async () => {
      mockSocialTradingService.exportPortfolioData.mockRejectedValue(new Error('Export failed'));

      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      const exportButton = await screen.findByRole('button', { name: /Export Data/i });
      fireEvent.click(exportButton);

      const csvOption = await screen.findByText('Export as CSV');
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(screen.getByText('Failed to export data')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Portfolio Analytics' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Performance Chart' })).toBeInTheDocument();
        expect(screen.getByRole('table', { name: 'Recent Trades' })).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      const firstButton = await screen.findByRole('button', { name: '1D' });
      firstButton.focus();

      fireEvent.keyDown(firstButton, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '1W' })).toHaveFocus();
      });
    });

    it('should announce updates to screen readers', async () => {
      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/Portfolio loaded/i);
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile devices', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });
    });

    it('should stack charts vertically on small screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        const charts = screen.getAllByTestId(/chart/);
        expect(charts[0].parentElement).toHaveStyle({ display: 'block' });
      });
    });

    it('should use grid layout on desktop', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1440
      });

      render(<PortfolioAnalytics socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByTestId('desktop-layout')).toBeInTheDocument();
      });
    });
  });
});