import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradingDashboard } from '../TradingDashboard';
import { TradingDataService } from '../../../services/tradingData.service';
import { useAuthStore } from '../../../stores/authStore';
import type { Portfolio, Position, MarketData } from '../../../services/tradingData.service';

// Mock dependencies
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const mockUser = {
  id: 'user-1',
  username: 'trader1',
  email: 'trader@example.com',
  role: 'USER' as const,
  isVerified: true,
  createdAt: '2023-01-01T00:00:00Z',
};

const mockPortfolio: Portfolio = {
  id: 'portfolio-1',
  userId: 'user-1',
  totalValue: 100000,
  availableCash: 50000,
  totalPnL: 5000,
  totalPnLPercent: 5.26,
  positions: [],
  lastUpdated: new Date().toISOString(),
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
    quantity: 50,
    averagePrice: 2750.00,
    currentPrice: 2800.50,
    marketValue: 140025,
    pnl: 2525,
    pnlPercent: 1.84,
    side: 'LONG',
  },
];

describe('TradingDashboard', () => {
  let tradingService: TradingDataService;

  beforeEach(() => {
    vi.clearAllMocks();

    tradingService = new TradingDataService('http://test', 'ws://test');

    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      verifyEmail: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      updateProfile: vi.fn(),
      refreshToken: vi.fn(),
      clearError: vi.fn(),
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the main dashboard layout', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('main', { name: 'Trading Dashboard' })).toBeInTheDocument();
      });

      expect(screen.getByRole('region', { name: 'Portfolio Overview' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Market Data' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Trading Panel' })).toBeInTheDocument();
    });

    it('should display portfolio summary', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Total Value')).toBeInTheDocument();
        expect(screen.getByText('$100,000.00')).toBeInTheDocument();
        expect(screen.getByText('Available Cash')).toBeInTheDocument();
        expect(screen.getByText('$50,000.00')).toBeInTheDocument();
      });
    });

    it('should display profit/loss indicators', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Total P&L')).toBeInTheDocument();
        expect(screen.getByText('+$5,000.00')).toBeInTheDocument();
        expect(screen.getByText('+5.26%')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<TradingDashboard tradingService={tradingService} />);

      expect(screen.getByLabelText('Loading portfolio data')).toBeInTheDocument();
    });

    it('should handle errors gracefully', async () => {
      const errorService = new TradingDataService('http://test', 'ws://test');
      errorService.simulateApiError();

      render(<TradingDashboard tradingService={errorService} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load portfolio')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      });
    });
  });

  describe('positions display', () => {
    it('should display all positions in a table', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('table', { name: 'Positions' })).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('GOOGL')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
      });
    });

    it('should show position details with colors', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        const aaplRow = screen.getByRole('row', { name: /AAPL/ });
        expect(within(aaplRow).getByText('+$475.00')).toHaveClass('profit');
        expect(within(aaplRow).getByText('+3.26%')).toHaveClass('profit');
      });
    });

    it('should allow sorting positions', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        const symbolHeader = screen.getByRole('columnheader', { name: 'Symbol' });
        fireEvent.click(symbolHeader);

        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('AAPL');
      });
    });

    it('should allow filtering positions', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        const filterInput = screen.getByPlaceholderText('Filter positions...');
        fireEvent.change(filterInput, { target: { value: 'AAPL' } });

        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.queryByText('GOOGL')).not.toBeInTheDocument();
      });
    });

    it('should provide position actions', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        const aaplRow = screen.getByRole('row', { name: /AAPL/ });
        const actionsButton = within(aaplRow).getByRole('button', { name: 'Actions' });
        fireEvent.click(actionsButton);

        expect(screen.getByRole('menuitem', { name: 'Close Position' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Add to Position' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Reduce Position' })).toBeInTheDocument();
      });
    });
  });

  describe('market data', () => {
    it('should display watchlist', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Watchlist' })).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('GOOGL')).toBeInTheDocument();
        expect(screen.getByText('MSFT')).toBeInTheDocument();
      });
    });

    it('should update prices in real-time', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        const priceElement = screen.getByTestId('AAPL-price');
        const initialPrice = priceElement.textContent;

        // Wait for price update
        setTimeout(() => {
          expect(priceElement.textContent).not.toBe(initialPrice);
        }, 2000);
      });
    });

    it('should allow adding symbols to watchlist', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        const addButton = screen.getByRole('button', { name: 'Add to Watchlist' });
        await user.click(addButton);

        const input = screen.getByPlaceholderText('Enter symbol');
        await user.type(input, 'TSLA');

        const confirmButton = screen.getByRole('button', { name: 'Add' });
        await user.click(confirmButton);

        expect(screen.getByText('TSLA')).toBeInTheDocument();
      });
    });

    it('should display market indicators', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByText('S&P 500')).toBeInTheDocument();
        expect(screen.getByText('NASDAQ')).toBeInTheDocument();
        expect(screen.getByText('DOW')).toBeInTheDocument();
        expect(screen.getByText('VIX')).toBeInTheDocument();
      });
    });
  });

  describe('order entry', () => {
    it('should render order entry form', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('form', { name: 'Order Entry' })).toBeInTheDocument();
        expect(screen.getByLabelText('Symbol')).toBeInTheDocument();
        expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
        expect(screen.getByLabelText('Order Type')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Buy' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sell' })).toBeInTheDocument();
      });
    });

    it('should place market order', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        const symbolInput = screen.getByLabelText('Symbol');
        const quantityInput = screen.getByLabelText('Quantity');
        const buyButton = screen.getByRole('button', { name: 'Buy' });

        await user.type(symbolInput, 'AAPL');
        await user.type(quantityInput, '10');
        await user.click(buyButton);

        expect(screen.getByText('Order placed successfully')).toBeInTheDocument();
      });
    });

    it('should place limit order with price', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        const orderTypeSelect = screen.getByLabelText('Order Type');
        await user.selectOptions(orderTypeSelect, 'LIMIT');

        const priceInput = screen.getByLabelText('Limit Price');
        expect(priceInput).toBeInTheDocument();

        await user.type(priceInput, '150.00');

        const symbolInput = screen.getByLabelText('Symbol');
        const quantityInput = screen.getByLabelText('Quantity');
        await user.type(symbolInput, 'AAPL');
        await user.type(quantityInput, '10');

        const buyButton = screen.getByRole('button', { name: 'Buy' });
        await user.click(buyButton);

        expect(screen.getByText('Limit order placed')).toBeInTheDocument();
      });
    });

    it('should validate order before submission', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        const buyButton = screen.getByRole('button', { name: 'Buy' });
        await user.click(buyButton);

        expect(screen.getByText('Symbol is required')).toBeInTheDocument();
        expect(screen.getByText('Quantity must be greater than 0')).toBeInTheDocument();
      });
    });

    it('should show order preview before submission', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        const symbolInput = screen.getByLabelText('Symbol');
        const quantityInput = screen.getByLabelText('Quantity');

        await user.type(symbolInput, 'AAPL');
        await user.type(quantityInput, '10');

        const previewButton = screen.getByRole('button', { name: 'Preview Order' });
        await user.click(previewButton);

        expect(screen.getByRole('dialog', { name: 'Order Preview' })).toBeInTheDocument();
        expect(screen.getByText('Estimated Cost: $1,502.50')).toBeInTheDocument();
      });
    });

    it('should support stop-loss orders', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        const orderTypeSelect = screen.getByLabelText('Order Type');
        await user.selectOptions(orderTypeSelect, 'STOP_LOSS');

        const stopPriceInput = screen.getByLabelText('Stop Price');
        expect(stopPriceInput).toBeInTheDocument();

        await user.type(stopPriceInput, '145.00');
      });
    });
  });

  describe('open orders', () => {
    it('should display open orders list', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Open Orders' })).toBeInTheDocument();
        expect(screen.getByText('AAPL - Buy 10 @ $149.00')).toBeInTheDocument();
      });
    });

    it('should allow canceling orders', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        const cancelButton = screen.getByRole('button', { name: 'Cancel Order' });
        await user.click(cancelButton);

        const confirmDialog = screen.getByRole('dialog', { name: 'Confirm Cancel' });
        expect(confirmDialog).toBeInTheDocument();

        const confirmButton = within(confirmDialog).getByRole('button', { name: 'Confirm' });
        await user.click(confirmButton);

        expect(screen.getByText('Order cancelled')).toBeInTheDocument();
      });
    });

    it('should allow modifying orders', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        const modifyButton = screen.getByRole('button', { name: 'Modify Order' });
        await user.click(modifyButton);

        const dialog = screen.getByRole('dialog', { name: 'Modify Order' });
        const priceInput = within(dialog).getByLabelText('New Price');

        await user.clear(priceInput);
        await user.type(priceInput, '148.50');

        const saveButton = within(dialog).getByRole('button', { name: 'Save Changes' });
        await user.click(saveButton);

        expect(screen.getByText('Order modified')).toBeInTheDocument();
      });
    });

    it('should show order status updates', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByText('PENDING')).toBeInTheDocument();

        // Simulate order fill
        setTimeout(() => {
          expect(screen.getByText('FILLED')).toBeInTheDocument();
        }, 2000);
      });
    });
  });

  describe('charts', () => {
    it('should display price chart for selected symbol', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Price Chart' })).toBeInTheDocument();
        expect(screen.getByTestId('price-chart-AAPL')).toBeInTheDocument();
      });
    });

    it('should allow changing chart timeframe', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        const timeframeButtons = screen.getByRole('group', { name: 'Timeframe' });
        const dayButton = within(timeframeButtons).getByRole('button', { name: '1D' });
        const weekButton = within(timeframeButtons).getByRole('button', { name: '1W' });

        await user.click(weekButton);
        expect(weekButton).toHaveClass('active');
        expect(dayButton).not.toHaveClass('active');
      });
    });

    it('should display technical indicators', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        const indicatorsButton = screen.getByRole('button', { name: 'Indicators' });
        await user.click(indicatorsButton);

        const menu = screen.getByRole('menu');
        expect(within(menu).getByRole('checkbox', { name: 'SMA' })).toBeInTheDocument();
        expect(within(menu).getByRole('checkbox', { name: 'EMA' })).toBeInTheDocument();
        expect(within(menu).getByRole('checkbox', { name: 'RSI' })).toBeInTheDocument();
        expect(within(menu).getByRole('checkbox', { name: 'MACD' })).toBeInTheDocument();
      });
    });

    it('should support drawing tools', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        const drawingToolsButton = screen.getByRole('button', { name: 'Drawing Tools' });
        await user.click(drawingToolsButton);

        expect(screen.getByRole('button', { name: 'Trend Line' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Horizontal Line' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Fibonacci' })).toBeInTheDocument();
      });
    });
  });

  describe('performance metrics', () => {
    it('should display daily P&L', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Today\'s P&L')).toBeInTheDocument();
        expect(screen.getByText('+$1,250.00')).toBeInTheDocument();
        expect(screen.getByText('+1.26%')).toBeInTheDocument();
      });
    });

    it('should display win rate', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Win Rate')).toBeInTheDocument();
        expect(screen.getByText('65%')).toBeInTheDocument();
      });
    });

    it('should display Sharpe ratio', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Sharpe Ratio')).toBeInTheDocument();
        expect(screen.getByText('1.75')).toBeInTheDocument();
      });
    });

    it('should show performance chart', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Performance Chart' })).toBeInTheDocument();
        expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
      });
    });
  });

  describe('risk management', () => {
    it('should display risk metrics', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        expect(screen.getByText('Value at Risk (1D)')).toBeInTheDocument();
        expect(screen.getByText('-$2,500.00')).toBeInTheDocument();
      });
    });

    it('should show position sizing calculator', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        const calcButton = screen.getByRole('button', { name: 'Position Size Calculator' });
        await user.click(calcButton);

        const dialog = screen.getByRole('dialog', { name: 'Position Size Calculator' });
        expect(within(dialog).getByLabelText('Account Risk %')).toBeInTheDocument();
        expect(within(dialog).getByLabelText('Stop Loss %')).toBeInTheDocument();
      });
    });

    it('should validate risk limits', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        const symbolInput = screen.getByLabelText('Symbol');
        const quantityInput = screen.getByLabelText('Quantity');

        await user.type(symbolInput, 'AAPL');
        await user.type(quantityInput, '1000'); // Large quantity

        const buyButton = screen.getByRole('button', { name: 'Buy' });
        await user.click(buyButton);

        expect(screen.getByText('Risk limit exceeded')).toBeInTheDocument();
      });
    });
  });

  describe('keyboard shortcuts', () => {
    it('should support buy order shortcut (B)', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        await user.keyboard('b');

        const orderForm = screen.getByRole('form', { name: 'Order Entry' });
        expect(orderForm).toHaveClass('buy-mode');
      });
    });

    it('should support sell order shortcut (S)', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        await user.keyboard('s');

        const orderForm = screen.getByRole('form', { name: 'Order Entry' });
        expect(orderForm).toHaveClass('sell-mode');
      });
    });

    it('should support cancel all orders shortcut (Escape)', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        await user.keyboard('{Escape}');

        expect(screen.getByText('All orders cancelled')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TradingDashboard tradingService={tradingService} />);

      expect(screen.getByRole('main', { name: 'Trading Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Portfolio Overview' })).toBeInTheDocument();
      expect(screen.getByRole('table', { name: 'Positions' })).toBeInTheDocument();
      expect(screen.getByRole('form', { name: 'Order Entry' })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(async () => {
        await user.tab();
        expect(screen.getByLabelText('Symbol')).toHaveFocus();

        await user.tab();
        expect(screen.getByLabelText('Quantity')).toHaveFocus();
      });
    });

    it('should announce important updates to screen readers', async () => {
      render(<TradingDashboard tradingService={tradingService} />);

      await waitFor(() => {
        const liveRegion = screen.getByRole('status', { live: 'polite' });
        expect(liveRegion).toBeInTheDocument();
      });
    });
  });
});