import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import CopyTradingDashboard from '../CopyTradingDashboard';
import { SocialTradingService } from '../../../services/socialTrading.service';
import { WebSocketService } from '../../../services/websocket.service';

// Mock followed traders data for testing
const mockFollowedTraders = [
  {
    traderId: 'trader-1',
    trader: {
      id: 'trader-1',
      username: 'ProTrader',
      displayName: 'Pro Trader',
      avatar: 'https://example.com/avatar1.jpg',
      verified: true,
      followerCount: 1250,
      followingCount: 120,
      joinDate: new Date('2023-01-15'),
      bio: 'Professional trader with 10+ years experience',
      performance: {
        roi: 0.35,
        winRate: 0.72,
        totalTrades: 450,
        averageHoldTime: 2.5,
        maxDrawdown: 0.15,
        sharpeRatio: 1.8,
        monthlyReturns: [0.05, 0.03, -0.01, 0.08, 0.04, 0.02]
      },
      statistics: {
        totalVolume: 2500000,
        profitableDays: 180,
        totalDays: 250,
        averageTradeSize: 5000,
        riskScore: 6.5,
        consistency: 0.85
      },
      recentTrades: [],
      ranking: {
        overall: 12,
        category: 'Growth',
        percentile: 0.95
      }
    },
    settings: {
      allocation: 0.15,
      maxRiskPerTrade: 0.03,
      stopLoss: 0.08,
      takeProfit: 0.12,
      minTradeAmount: 100,
      maxTradeAmount: 5000
    },
    followedDate: new Date('2024-01-15'),
    performance: {
      totalReturn: 0.18,
      winRate: 0.68,
      tradesCount: 25,
      fees: 125.50
    },
    status: 'active'
  },
  {
    traderId: 'trader-2',
    trader: {
      id: 'trader-2',
      username: 'RiskMaster',
      displayName: 'Risk Master',
      avatar: 'https://example.com/avatar2.jpg',
      verified: false,
      followerCount: 890,
      followingCount: 200,
      joinDate: new Date('2023-03-20'),
      bio: 'Conservative trader focused on capital preservation',
      performance: {
        roi: 0.18,
        winRate: 0.65,
        totalTrades: 320,
        averageHoldTime: 5.2,
        maxDrawdown: 0.08,
        sharpeRatio: 2.2,
        monthlyReturns: [0.02, 0.015, 0.01, 0.025, 0.018, 0.012]
      },
      statistics: {
        totalVolume: 1200000,
        profitableDays: 160,
        totalDays: 245,
        averageTradeSize: 3750,
        riskScore: 3.2,
        consistency: 0.92
      },
      recentTrades: [],
      ranking: {
        overall: 45,
        category: 'Conservative',
        percentile: 0.82
      }
    },
    settings: {
      allocation: 0.08,
      maxRiskPerTrade: 0.015,
      stopLoss: 0.05,
      takeProfit: 0.08,
      minTradeAmount: 50,
      maxTradeAmount: 2000
    },
    followedDate: new Date('2024-02-10'),
    performance: {
      totalReturn: 0.12,
      winRate: 0.64,
      tradesCount: 18,
      fees: 89.25
    },
    status: 'paused'
  }
];

const mockPerformance = {
  totalReturn: 0.24,
  totalTrades: 43,
  winRate: 0.67,
  bestTrade: {
    id: 'trade-1',
    traderId: 'trader-1',
    symbol: 'AAPL',
    side: 'buy' as const,
    quantity: 15,
    price: 150.00,
    timestamp: new Date(),
    status: 'closed' as const,
    pnl: 450.75,
    fees: 12.50
  },
  worstTrade: {
    id: 'trade-2',
    traderId: 'trader-2',
    symbol: 'TSLA',
    side: 'sell' as const,
    quantity: 8,
    price: 200.00,
    timestamp: new Date(),
    status: 'closed' as const,
    pnl: -180.25,
    fees: 8.75
  },
  traderPerformance: [
    { traderId: 'trader-1', traderName: 'ProTrader', return: 0.18, trades: 25, winRate: 0.68 },
    { traderId: 'trader-2', traderName: 'RiskMaster', return: 0.12, trades: 18, winRate: 0.64 }
  ]
};

const mockRecentTrades = [
  {
    id: 'trade-1',
    traderId: 'trader-1',
    symbol: 'AAPL',
    side: 'buy' as const,
    quantity: 15,
    price: 150.00,
    timestamp: new Date('2024-12-10T10:30:00Z'),
    status: 'closed' as const,
    pnl: 450.75,
    fees: 12.50,
    copyTradeId: 'trader-1'
  },
  {
    id: 'trade-2',
    traderId: 'trader-2',
    symbol: 'MSFT',
    side: 'sell' as const,
    quantity: 10,
    price: 380.00,
    timestamp: new Date('2024-12-10T11:15:00Z'),
    status: 'open' as const,
    pnl: 0,
    fees: 0,
    copyTradeId: 'trader-2'
  }
];

describe('CopyTradingDashboard', () => {
  let mockSocialTradingService: SocialTradingService;
  let mockWebSocketService: WebSocketService;

  beforeEach(() => {
    mockWebSocketService = new WebSocketService('ws://localhost:3001');
    mockSocialTradingService = new SocialTradingService(mockWebSocketService);

    // Mock service methods
    vi.spyOn(mockSocialTradingService, 'getFollowedTraders').mockResolvedValue([
      {
        id: 'trader-1',
        username: 'ProTrader',
        displayName: 'Pro Trader',
        avatar: 'https://example.com/avatar1.jpg',
        stats: {
          totalReturn: 35.2,
          winRate: 72,
          followers: 1250,
          totalTrades: 450
        },
        copySettings: {
          allocation: 15,
          riskLevel: 'medium' as const,
          maxPositionSize: 5,
          stopLoss: 8,
          takeProfit: 12
        },
        isActive: true,
        isPaused: false,
        performance: {
          daily: 0.8,
          weekly: 2.3,
          monthly: 5.2,
          yearly: 35.2
        }
      },
      {
        id: 'trader-2',
        username: 'TechTrader',
        displayName: 'Tech Trader',
        avatar: 'https://example.com/avatar2.jpg',
        stats: {
          totalReturn: 28.7,
          winRate: 68,
          followers: 890,
          totalTrades: 320
        },
        copySettings: {
          allocation: 10,
          riskLevel: 'low' as const,
          maxPositionSize: 3,
          stopLoss: 5,
          takeProfit: 8
        },
        isActive: true,
        isPaused: true,
        performance: {
          daily: -0.2,
          weekly: 1.1,
          monthly: 3.8,
          yearly: 28.7
        }
      }
    ]);
    vi.spyOn(mockSocialTradingService, 'getCopyTradingPerformance').mockResolvedValue(mockPerformance);
    vi.spyOn(mockSocialTradingService, 'getPortfolioOverview').mockResolvedValue({
      totalValue: 125000,
      totalPnL: 8500,
      totalPnLPercentage: 7.3,
      dailyPnL: 320,
      dailyPnLPercentage: 0.26,
      activePositions: 12,
      followedTraders: 2,
      allocatedCapital: 100000,
      availableCapital: 25000
    });
    vi.spyOn(mockSocialTradingService, 'getRecentTrades').mockResolvedValue([
      {
        id: 'trade-1',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 15,
        price: 150.00,
        timestamp: new Date('2024-12-10T10:30:00Z').toISOString(),
        trader: {
          id: 'trader-1',
          username: 'ProTrader',
          avatar: 'https://example.com/avatar1.jpg'
        },
        status: 'executed',
        pnl: 450.75
      },
      {
        id: 'trade-2',
        symbol: 'MSFT',
        side: 'sell',
        quantity: 10,
        price: 380.00,
        timestamp: new Date('2024-12-10T11:15:00Z').toISOString(),
        trader: {
          id: 'trader-2',
          username: 'TechTrader',
          avatar: 'https://example.com/avatar2.jpg'
        },
        status: 'executed',
        pnl: -125.30
      }
    ]);
    vi.spyOn(mockSocialTradingService, 'getPerformanceData').mockResolvedValue({
      labels: ['Day 1', 'Day 2', 'Day 3'],
      datasets: [
        {
          label: 'Portfolio',
          data: [5, 6, 7],
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)'
        }
      ]
    });
    vi.spyOn(mockSocialTradingService, 'subscribeToLiveUpdates').mockReturnValue(() => {});
    vi.spyOn(mockSocialTradingService, 'getTraderCopyPerformance').mockResolvedValue({
      traderId: 'trader-1',
      totalReturn: 0.18,
      tradesCount: 25,
      winRate: 0.68,
      trades: mockRecentTrades
    });
    vi.spyOn(mockSocialTradingService, 'unfollowTrader').mockResolvedValue({
      success: true,
      message: 'Successfully unfollowed trader'
    });
    vi.spyOn(mockSocialTradingService, 'updateCopySettings').mockResolvedValue({
      success: true,
      settings: {
        allocation: 0.2,
        maxRiskPerTrade: 0.04
      },
      message: 'Settings updated successfully'
    });
    vi.spyOn(mockSocialTradingService, 'pauseTrader').mockResolvedValue(undefined);
    vi.spyOn(mockSocialTradingService, 'resumeTrader').mockResolvedValue(undefined);
    vi.spyOn(mockSocialTradingService, 'exportPortfolioData').mockResolvedValue(undefined);
    vi.spyOn(mockSocialTradingService, 'generateCopyTradingReport').mockResolvedValue({
      summary: {
        totalReturn: 0.24,
        totalTrades: 43,
        winRate: 0.67,
        totalFees: 214.75
      },
      traderBreakdown: [
        { traderId: 'trader-1', traderName: 'ProTrader', trades: 25, return: 0.18, fees: 125.50 },
        { traderId: 'trader-2', traderName: 'RiskMaster', trades: 18, return: 0.12, fees: 89.25 }
      ],
      monthlyPerformance: [
        { month: '2024-01', return: 0.05, trades: 15 },
        { month: '2024-02', return: 0.08, trades: 18 },
        { month: '2024-03', return: 0.02, trades: 10 }
      ],
      trades: mockRecentTrades
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockSocialTradingService.cleanup();
    mockWebSocketService.disconnect();
  });

  describe('Initial Rendering', () => {
    it('should render the copy trading dashboard', async () => {
      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Copy Trading Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Followed Traders', level: 2 })).toBeInTheDocument();
    });

    it('should load and display portfolio overview on mount', async () => {
      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('24.00%')).toBeInTheDocument(); // Total return
        expect(screen.getByText('43')).toBeInTheDocument(); // Total trades
        expect(screen.getByText('67.00%')).toBeInTheDocument(); // Win rate
      });

      expect(mockSocialTradingService.getCopyTradingPerformance).toHaveBeenCalled();
    });

    it('should show loading state while fetching data', () => {
      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });

    it('should handle empty followed traders list', async () => {
      vi.spyOn(mockSocialTradingService, 'getFollowedTraders').mockResolvedValue([]);

      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('You are not following any traders yet')).toBeInTheDocument();
        expect(screen.getByText('Discover Traders')).toBeInTheDocument();
      });
    });
  });

  describe('Portfolio Overview', () => {
    beforeEach(async () => {
      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);
      await waitFor(() => {
        expect(screen.getByText('24.00%')).toBeInTheDocument();
      });
    });

    it('should display performance metrics correctly', () => {
      expect(screen.getByTestId('total-return')).toHaveTextContent('24.00%');
      expect(screen.getByTestId('total-trades')).toHaveTextContent('43');
      expect(screen.getByTestId('win-rate')).toHaveTextContent('67.00%');
    });

    it('should show best and worst trades', () => {
      expect(screen.getByText('Best Trade')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('+$450.75')).toBeInTheDocument();

      expect(screen.getByText('Worst Trade')).toBeInTheDocument();
      expect(screen.getByText('TSLA')).toBeInTheDocument();
      expect(screen.getByText('-$180.25')).toBeInTheDocument();
    });

    it('should display performance chart', () => {
      expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
    });

    it('should show trader breakdown', () => {
      expect(screen.getByText('ProTrader')).toBeInTheDocument();
      expect(screen.getByText('18.00%')).toBeInTheDocument(); // ProTrader return
      expect(screen.getByText('25 trades')).toBeInTheDocument();

      expect(screen.getByText('RiskMaster')).toBeInTheDocument();
      expect(screen.getByText('12.00%')).toBeInTheDocument(); // RiskMaster return
      expect(screen.getByText('18 trades')).toBeInTheDocument();
    });
  });

  describe('Followed Traders Management', () => {
    beforeEach(async () => {
      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);
      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });
    });

    it('should display followed traders with their information', () => {
      const proTraderCard = screen.getByTestId('followed-trader-trader-1');

      expect(within(proTraderCard).getByText('ProTrader')).toBeInTheDocument();
      expect(within(proTraderCard).getByText('Pro Trader')).toBeInTheDocument();
      expect(within(proTraderCard).getByText('15% allocation')).toBeInTheDocument();
      expect(within(proTraderCard).getByText('18.00%')).toBeInTheDocument(); // return
      expect(within(proTraderCard).getByText('25 trades')).toBeInTheDocument();
    });

    it('should show trader status indicators', () => {
      const proTraderCard = screen.getByTestId('followed-trader-trader-1');
      expect(within(proTraderCard).getByTestId('status-active')).toBeInTheDocument();

      const riskMasterCard = screen.getByTestId('followed-trader-trader-2');
      expect(within(riskMasterCard).getByTestId('status-paused')).toBeInTheDocument();
    });

    it('should display copy settings for each trader', () => {
      const proTraderCard = screen.getByTestId('followed-trader-trader-1');

      expect(within(proTraderCard).getByText('15% allocation')).toBeInTheDocument();
      expect(within(proTraderCard).getByText('3% max risk')).toBeInTheDocument();
      expect(within(proTraderCard).getByText('8% stop loss')).toBeInTheDocument();
      expect(within(proTraderCard).getByText('12% take profit')).toBeInTheDocument();
    });

    it('should show performance for each followed trader', () => {
      const proTraderCard = screen.getByTestId('followed-trader-trader-1');

      expect(within(proTraderCard).getByText('18.00%')).toBeInTheDocument(); // return
      expect(within(proTraderCard).getByText('68.00%')).toBeInTheDocument(); // win rate
      expect(within(proTraderCard).getByText('25 trades')).toBeInTheDocument();
      expect(within(proTraderCard).getByText('$125.50')).toBeInTheDocument(); // fees
    });

    it('should unfollow trader when unfollow button is clicked', async () => {
      const proTraderCard = screen.getByTestId('followed-trader-trader-1');
      const unfollowButton = within(proTraderCard).getByText('Unfollow');

      fireEvent.click(unfollowButton);

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('Confirm Unfollow')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to unfollow ProTrader?')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Yes, Unfollow');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockSocialTradingService.unfollowTrader).toHaveBeenCalledWith('trader-1');
      });
    });

    it('should pause/resume trader copying', async () => {
      const proTraderCard = screen.getByTestId('followed-trader-trader-1');
      const pauseButton = within(proTraderCard).getByText('Pause');

      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(within(proTraderCard).getByText('Resume')).toBeInTheDocument();
      });

      const resumeButton = within(proTraderCard).getByText('Resume');
      fireEvent.click(resumeButton);

      await waitFor(() => {
        expect(within(proTraderCard).getByText('Pause')).toBeInTheDocument();
      });
    });

    it('should open settings modal when edit settings button is clicked', async () => {
      const proTraderCard = screen.getByTestId('followed-trader-trader-1');
      const settingsButton = within(proTraderCard).getByText('Edit Settings');

      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByTestId('edit-settings-modal')).toBeInTheDocument();
        expect(screen.getByText('Edit Copy Settings - ProTrader')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Allocation (%)')).toHaveValue('15');
      expect(screen.getByLabelText('Max Risk per Trade (%)')).toHaveValue('3');
      expect(screen.getByLabelText('Stop Loss (%)')).toHaveValue('8');
      expect(screen.getByLabelText('Take Profit (%)')).toHaveValue('12');
    });

    it('should update copy settings from modal', async () => {
      const proTraderCard = screen.getByTestId('followed-trader-trader-1');
      const settingsButton = within(proTraderCard).getByText('Edit Settings');

      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByTestId('edit-settings-modal')).toBeInTheDocument();
      });

      // Update settings
      const allocationInput = screen.getByLabelText('Allocation (%)');
      fireEvent.change(allocationInput, { target: { value: '20' } });

      const maxRiskInput = screen.getByLabelText('Max Risk per Trade (%)');
      fireEvent.change(maxRiskInput, { target: { value: '4' } });

      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSocialTradingService.updateCopySettings).toHaveBeenCalledWith('trader-1', {
          allocation: 0.2,
          maxRiskPerTrade: 0.04,
          stopLoss: 0.08,
          takeProfit: 0.12,
          minTradeAmount: 100,
          maxTradeAmount: 5000
        });
      });

      // Modal should close
      expect(screen.queryByTestId('edit-settings-modal')).not.toBeInTheDocument();
    });
  });

  describe('Recent Trades', () => {
    beforeEach(async () => {
      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);
      await waitFor(() => {
        expect(screen.getByText('Recent Trades')).toBeInTheDocument();
      });
    });

    it('should display recent trades table', () => {
      expect(screen.getByText('Recent Trades')).toBeInTheDocument();
      expect(screen.getByText('Symbol')).toBeInTheDocument();
      expect(screen.getByText('Side')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('P&L')).toBeInTheDocument();
    });

    it('should show trade information correctly', () => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('BUY')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('$150.00')).toBeInTheDocument();
      expect(screen.getByText('+$450.75')).toBeInTheDocument();

      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('SELL')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('$380.00')).toBeInTheDocument();
    });

    it('should filter trades by status', async () => {
      const statusFilter = screen.getByLabelText('Filter by status');
      fireEvent.change(statusFilter, { target: { value: 'open' } });

      await waitFor(() => {
        expect(screen.getByText('MSFT')).toBeInTheDocument();
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
      });
    });

    it('should filter trades by trader', async () => {
      const traderFilter = screen.getByLabelText('Filter by trader');
      fireEvent.change(traderFilter, { target: { value: 'trader-1' } });

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.queryByText('MSFT')).not.toBeInTheDocument();
      });
    });

    it('should sort trades by different columns', async () => {
      const timestampHeader = screen.getByText('Timestamp');
      fireEvent.click(timestampHeader);

      // Should sort by timestamp
      await waitFor(() => {
        const rows = screen.getAllByTestId(/^trade-row-/);
        expect(rows[0]).toHaveTextContent('MSFT'); // More recent trade first
      });
    });
  });

  describe('Performance Analytics', () => {
    beforeEach(async () => {
      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);
      await waitFor(() => {
        expect(screen.getByText('Performance Analytics')).toBeInTheDocument();
      });
    });

    it('should display performance charts', () => {
      expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
      expect(screen.getByTestId('trader-breakdown-chart')).toBeInTheDocument();
    });

    it('should show time period selector', () => {
      expect(screen.getByLabelText('Time period')).toBeInTheDocument();
      expect(screen.getByText('7D')).toBeInTheDocument();
      expect(screen.getByText('30D')).toBeInTheDocument();
      expect(screen.getByText('90D')).toBeInTheDocument();
      expect(screen.getByText('1Y')).toBeInTheDocument();
    });

    it('should update charts when time period changes', async () => {
      const period30D = screen.getByText('30D');
      fireEvent.click(period30D);

      await waitFor(() => {
        expect(mockSocialTradingService.getCopyTradingPerformance).toHaveBeenCalledTimes(2);
      });
    });

    it('should display risk metrics', () => {
      expect(screen.getByText('Risk Metrics')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Allocation')).toBeInTheDocument();
      expect(screen.getByText('23%')).toBeInTheDocument(); // Total allocation (15% + 8%)
      expect(screen.getByText('Diversification Score')).toBeInTheDocument();
    });
  });

  describe('Reports and Export', () => {
    beforeEach(async () => {
      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);
      await waitFor(() => {
        expect(screen.getByText('Reports')).toBeInTheDocument();
      });
    });

    it('should generate performance report', async () => {
      const generateReportButton = screen.getByText('Generate Report');
      fireEvent.click(generateReportButton);

      await waitFor(() => {
        expect(mockSocialTradingService.generateCopyTradingReport).toHaveBeenCalled();
        expect(screen.getByTestId('performance-report')).toBeInTheDocument();
      });
    });

    it('should display report summary', async () => {
      const generateReportButton = screen.getByText('Generate Report');
      fireEvent.click(generateReportButton);

      await waitFor(() => {
        expect(screen.getByText('Report Summary')).toBeInTheDocument();
        expect(screen.getByText('Total Return: 24.00%')).toBeInTheDocument();
        expect(screen.getByText('Total Trades: 43')).toBeInTheDocument();
        expect(screen.getByText('Total Fees: $214.75')).toBeInTheDocument();
      });
    });

    it('should export data in different formats', async () => {
      const exportButton = screen.getByText('Export Data');
      fireEvent.click(exportButton);

      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();

      const csvButton = screen.getByText('CSV');
      fireEvent.click(csvButton);

      // Should trigger download
      await waitFor(() => {
        expect(screen.getByText('Downloading CSV...')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to real-time updates on mount', async () => {
      const subscribeSpy = vi.spyOn(mockSocialTradingService, 'subscribeToTrader');

      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(subscribeSpy).toHaveBeenCalledWith('trader-1', expect.any(Function));
        expect(subscribeSpy).toHaveBeenCalledWith('trader-2', expect.any(Function));
      });
    });

    it('should update performance when real-time data arrives', async () => {
      const mockCallback = vi.fn();
      vi.spyOn(mockSocialTradingService, 'subscribeToTrader').mockImplementation((traderId, callback) => {
        mockCallback.mockImplementation(callback);
      });

      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('24.00%')).toBeInTheDocument();
      });

      // Simulate real-time update
      mockCallback({
        type: 'performance_update',
        traderId: 'trader-1',
        performance: {
          totalReturn: 0.20,
          trades: 26,
          winRate: 0.69
        }
      });

      await waitFor(() => {
        expect(mockSocialTradingService.getCopyTradingPerformance).toHaveBeenCalledTimes(2);
      });
    });

    it('should show live trade notifications', async () => {
      const mockCallback = vi.fn();
      vi.spyOn(mockSocialTradingService, 'subscribeToTrader').mockImplementation((traderId, callback) => {
        mockCallback.mockImplementation(callback);
      });

      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      // Simulate new trade notification
      mockCallback({
        type: 'trade_opened',
        traderId: 'trader-1',
        trade: {
          symbol: 'GOOGL',
          side: 'buy',
          quantity: 5,
          price: 2800.00
        }
      });

      await waitFor(() => {
        expect(screen.getByText('New trade copied from ProTrader')).toBeInTheDocument();
        expect(screen.getByText('GOOGL BUY 5 @ $2800.00')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle dashboard loading errors gracefully', async () => {
      vi.spyOn(mockSocialTradingService, 'getFollowedTraders').mockRejectedValue(new Error('Network error'));

      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should handle unfollow errors', async () => {
      vi.spyOn(mockSocialTradingService, 'unfollowTrader').mockResolvedValue({
        success: false,
        message: 'Cannot unfollow trader with open positions'
      });

      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      const proTraderCard = screen.getByTestId('followed-trader-trader-1');
      const unfollowButton = within(proTraderCard).getByText('Unfollow');

      fireEvent.click(unfollowButton);

      await waitFor(() => {
        expect(screen.getByText('Confirm Unfollow')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Yes, Unfollow');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Cannot unfollow trader with open positions')).toBeInTheDocument();
      });
    });

    it('should handle settings update errors', async () => {
      vi.spyOn(mockSocialTradingService, 'updateCopySettings').mockResolvedValue({
        success: false,
        settings: {} as any,
        message: 'Invalid allocation percentage'
      });

      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      const proTraderCard = screen.getByTestId('followed-trader-trader-1');
      const settingsButton = within(proTraderCard).getByText('Edit Settings');

      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByTestId('edit-settings-modal')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid allocation percentage')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should show mobile layout on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      expect(screen.getByTestId('mobile-dashboard-layout')).toBeInTheDocument();
    });

    it('should show desktop layout on large screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      expect(screen.getByTestId('desktop-dashboard-layout')).toBeInTheDocument();
    });

    it('should adjust chart layout for mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      const chartsContainer = screen.getByTestId('charts-container');
      expect(chartsContainer).toHaveClass('mobile-charts');
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);
      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels', () => {
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Copy trading dashboard');
      expect(screen.getByLabelText('Time period')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const firstTraderCard = screen.getByTestId('followed-trader-trader-1');

      firstTraderCard.focus();
      expect(firstTraderCard).toHaveFocus();

      fireEvent.keyDown(firstTraderCard, { key: 'Enter' });
      expect(screen.getByTestId('edit-settings-modal')).toBeInTheDocument();
    });

    it('should announce updates to screen readers', async () => {
      const proTraderCard = screen.getByTestId('followed-trader-trader-1');
      const pauseButton = within(proTraderCard).getByText('Pause');

      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('ProTrader copying paused');
      });
    });

    it('should have proper table headers for screen readers', () => {
      const table = screen.getByRole('table', { name: /recent trades/i });
      expect(table).toBeInTheDocument();

      const headers = within(table).getAllByRole('columnheader');
      expect(headers).toHaveLength(7); // Symbol, Side, Quantity, Price, P&L, Fees, Timestamp
    });
  });

  describe('Performance Optimization', () => {
    it('should memoize trader cards to prevent unnecessary re-renders', async () => {
      const { rerender } = render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      await waitFor(() => {
        expect(screen.getByText('ProTrader')).toBeInTheDocument();
      });

      // Re-render with same props
      rerender(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      // Should not call API again
      expect(mockSocialTradingService.getFollowedTraders).toHaveBeenCalledTimes(1);
    });

    it('should throttle real-time updates to prevent excessive re-renders', async () => {
      const mockCallback = vi.fn();
      vi.spyOn(mockSocialTradingService, 'subscribeToTrader').mockImplementation((traderId, callback) => {
        mockCallback.mockImplementation(callback);
      });

      render(<CopyTradingDashboard socialTradingService={mockSocialTradingService} />);

      // Send multiple rapid updates
      for (let i = 0; i < 10; i++) {
        mockCallback({
          type: 'performance_update',
          traderId: 'trader-1',
          performance: { totalReturn: 0.20 + (i * 0.01) }
        });
      }

      // Should throttle updates
      await waitFor(() => {
        expect(mockSocialTradingService.getCopyTradingPerformance).toHaveBeenCalledTimes(2); // Initial + throttled update
      });
    });
  });
});