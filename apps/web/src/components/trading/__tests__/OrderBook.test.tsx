import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderBook } from '../OrderBook';
import { TradingDataService } from '../../../services/tradingData.service';
import type { OrderBook as OrderBookType, OrderBookLevel } from '../../../services/tradingData.service';

const mockOrderBookData: OrderBookType = {
  symbol: 'AAPL',
  bids: [
    { price: 149.99, quantity: 1000, orderCount: 10 },
    { price: 149.98, quantity: 1500, orderCount: 15 },
    { price: 149.97, quantity: 2000, orderCount: 20 },
    { price: 149.96, quantity: 2500, orderCount: 25 },
    { price: 149.95, quantity: 3000, orderCount: 30 },
  ],
  asks: [
    { price: 150.01, quantity: 1000, orderCount: 10 },
    { price: 150.02, quantity: 1500, orderCount: 15 },
    { price: 150.03, quantity: 2000, orderCount: 20 },
    { price: 150.04, quantity: 2500, orderCount: 25 },
    { price: 150.05, quantity: 3000, orderCount: 30 },
  ],
  timestamp: new Date().toISOString(),
};

describe('OrderBook', () => {
  let tradingService: TradingDataService;

  beforeEach(() => {
    vi.clearAllMocks();
    tradingService = new TradingDataService('http://test', 'ws://test');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render order book with bids and asks', () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} />);

      expect(screen.getByRole('region', { name: 'Order Book' })).toBeInTheDocument();
      expect(screen.getByText('Bids')).toBeInTheDocument();
      expect(screen.getByText('Asks')).toBeInTheDocument();
    });

    it('should display symbol name', () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} />);

      expect(screen.getByText('AAPL Order Book')).toBeInTheDocument();
    });

    it('should display bid levels with correct formatting', async () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(() => {
        expect(screen.getByText('$149.99')).toBeInTheDocument();
        expect(screen.getByText('1,000')).toBeInTheDocument();
        expect(screen.getByText('10 orders')).toBeInTheDocument();
      });
    });

    it('should display ask levels with correct formatting', async () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(() => {
        expect(screen.getByText('$150.01')).toBeInTheDocument();
        expect(screen.getByText('1,000')).toBeInTheDocument();
        expect(screen.getByText('10 orders')).toBeInTheDocument();
      });
    });

    it('should show spread information', async () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(() => {
        expect(screen.getByText('Spread')).toBeInTheDocument();
        expect(screen.getByText('$0.02')).toBeInTheDocument();
        expect(screen.getByText('0.01%')).toBeInTheDocument();
      });
    });

    it('should display loading state', () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} isLoading={true} />);

      expect(screen.getByLabelText('Loading order book')).toBeInTheDocument();
    });

    it('should handle empty order book', () => {
      const emptyBook: OrderBookType = {
        symbol: 'AAPL',
        bids: [],
        asks: [],
        timestamp: new Date().toISOString(),
      };

      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={emptyBook} />);

      expect(screen.getByText('No order book data available')).toBeInTheDocument();
    });
  });

  describe('depth visualization', () => {
    it('should display depth bars for bids', async () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(() => {
        const bidBars = screen.getAllByTestId(/bid-depth-bar/);
        expect(bidBars).toHaveLength(5);
        expect(bidBars[0]).toHaveStyle({ width: expect.stringContaining('%') });
      });
    });

    it('should display depth bars for asks', async () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(() => {
        const askBars = screen.getAllByTestId(/ask-depth-bar/);
        expect(askBars).toHaveLength(5);
        expect(askBars[0]).toHaveStyle({ width: expect.stringContaining('%') });
      });
    });

    it('should scale depth bars proportionally', async () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(() => {
        const bidBars = screen.getAllByTestId(/bid-depth-bar/);
        const firstBarWidth = parseFloat(bidBars[0].style.width);
        const lastBarWidth = parseFloat(bidBars[4].style.width);

        expect(lastBarWidth).toBeGreaterThan(firstBarWidth);
      });
    });

    it('should use different colors for bids and asks', async () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(() => {
        const bidBars = screen.getAllByTestId(/bid-depth-bar/);
        const askBars = screen.getAllByTestId(/ask-depth-bar/);

        expect(bidBars[0]).toHaveClass('bid-depth');
        expect(askBars[0]).toHaveClass('ask-depth');
      });
    });
  });

  describe('interactions', () => {
    it('should allow clicking on bid price to set order price', async () => {
      const onPriceClick = vi.fn();
      const user = userEvent.setup();

      render(
        <OrderBook
          symbol="AAPL"
          tradingService={tradingService}
          orderBookData={mockOrderBookData}
          onPriceClick={onPriceClick}
        />
      );

      await waitFor(async () => {
        const bidPrice = screen.getByText('$149.99');
        await user.click(bidPrice);

        expect(onPriceClick).toHaveBeenCalledWith(149.99, 'BUY');
      });
    });

    it('should allow clicking on ask price to set order price', async () => {
      const onPriceClick = vi.fn();
      const user = userEvent.setup();

      render(
        <OrderBook
          symbol="AAPL"
          tradingService={tradingService}
          orderBookData={mockOrderBookData}
          onPriceClick={onPriceClick}
        />
      );

      await waitFor(async () => {
        const askPrice = screen.getByText('$150.01');
        await user.click(askPrice);

        expect(onPriceClick).toHaveBeenCalledWith(150.01, 'SELL');
      });
    });

    it('should highlight hovered row', async () => {
      const user = userEvent.setup();

      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(async () => {
        const bidRow = screen.getByTestId('bid-row-0');
        await user.hover(bidRow);

        expect(bidRow).toHaveClass('hovered');
      });
    });

    it('should allow toggling between different depth levels', async () => {
      const user = userEvent.setup();

      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(async () => {
        const depthSelector = screen.getByRole('combobox', { name: 'Depth Level' });
        await user.selectOptions(depthSelector, '10');

        const bidRows = screen.getAllByTestId(/bid-row/);
        expect(bidRows).toHaveLength(10);
      });
    });
  });

  describe('real-time updates', () => {
    it('should update order book in real-time', async () => {
      const { rerender } = render(
        <OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />
      );

      const updatedBook: OrderBookType = {
        ...mockOrderBookData,
        bids: [{ price: 150.00, quantity: 5000, orderCount: 50 }, ...mockOrderBookData.bids],
      };

      rerender(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={updatedBook} />);

      await waitFor(() => {
        expect(screen.getByText('$150.00')).toBeInTheDocument();
        expect(screen.getByText('5,000')).toBeInTheDocument();
      });
    });

    it('should highlight price changes', async () => {
      const { rerender } = render(
        <OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />
      );

      const updatedBook: OrderBookType = {
        ...mockOrderBookData,
        bids: [{ price: 150.00, quantity: 5000, orderCount: 50 }, ...mockOrderBookData.bids],
      };

      rerender(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={updatedBook} />);

      await waitFor(() => {
        const newPriceElement = screen.getByText('$150.00');
        expect(newPriceElement.parentElement).toHaveClass('price-change');
      });
    });

    it('should show update timestamp', async () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
        expect(screen.getByTestId('update-timestamp')).toBeInTheDocument();
      });
    });
  });

  describe('aggregation', () => {
    it('should allow price aggregation', async () => {
      const user = userEvent.setup();

      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(async () => {
        const aggregationSelector = screen.getByRole('combobox', { name: 'Price Aggregation' });
        await user.selectOptions(aggregationSelector, '0.10');

        // Prices should be aggregated to 0.10 intervals
        expect(screen.queryByText('$149.99')).not.toBeInTheDocument();
        expect(screen.getByText('$149.90')).toBeInTheDocument();
      });
    });

    it('should sum quantities when aggregating', async () => {
      const user = userEvent.setup();

      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(async () => {
        const aggregationSelector = screen.getByRole('combobox', { name: 'Price Aggregation' });
        await user.selectOptions(aggregationSelector, '0.10');

        // Quantities should be summed for aggregated levels
        const aggregatedQuantity = screen.getByTestId('bid-quantity-149.90');
        expect(parseInt(aggregatedQuantity.textContent!.replace(',', ''))).toBeGreaterThan(1000);
      });
    });
  });

  describe('statistics', () => {
    it('should display total bid volume', async () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(() => {
        expect(screen.getByText('Total Bid Volume')).toBeInTheDocument();
        expect(screen.getByTestId('total-bid-volume')).toHaveTextContent('10,000');
      });
    });

    it('should display total ask volume', async () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(() => {
        expect(screen.getByText('Total Ask Volume')).toBeInTheDocument();
        expect(screen.getByTestId('total-ask-volume')).toHaveTextContent('10,000');
      });
    });

    it('should show bid/ask imbalance', async () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(() => {
        expect(screen.getByText('Imbalance')).toBeInTheDocument();
        expect(screen.getByTestId('order-imbalance')).toBeInTheDocument();
      });
    });

    it('should display mid price', async () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(() => {
        expect(screen.getByText('Mid Price')).toBeInTheDocument();
        expect(screen.getByTestId('mid-price')).toHaveTextContent('$150.00');
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      expect(screen.getByRole('region', { name: 'Order Book' })).toBeInTheDocument();
      expect(screen.getByRole('table', { name: 'Bid Orders' })).toBeInTheDocument();
      expect(screen.getByRole('table', { name: 'Ask Orders' })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const onPriceClick = vi.fn();

      render(
        <OrderBook
          symbol="AAPL"
          tradingService={tradingService}
          orderBookData={mockOrderBookData}
          onPriceClick={onPriceClick}
        />
      );

      await waitFor(async () => {
        const bidPrice = screen.getByText('$149.99');
        bidPrice.focus();
        await user.keyboard('{Enter}');

        expect(onPriceClick).toHaveBeenCalledWith(149.99, 'BUY');
      });
    });

    it('should announce updates to screen readers', async () => {
      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(() => {
        const liveRegion = screen.getByRole('status', { live: 'polite' });
        expect(liveRegion).toBeInTheDocument();
      });
    });
  });

  describe('export functionality', () => {
    it('should allow exporting order book data', async () => {
      const user = userEvent.setup();
      const onExport = vi.fn();

      render(
        <OrderBook
          symbol="AAPL"
          tradingService={tradingService}
          orderBookData={mockOrderBookData}
          onExport={onExport}
        />
      );

      await waitFor(async () => {
        const exportButton = screen.getByRole('button', { name: 'Export' });
        await user.click(exportButton);

        expect(onExport).toHaveBeenCalledWith(mockOrderBookData);
      });
    });

    it('should support CSV export format', async () => {
      const user = userEvent.setup();

      render(<OrderBook symbol="AAPL" tradingService={tradingService} orderBookData={mockOrderBookData} />);

      await waitFor(async () => {
        const exportButton = screen.getByRole('button', { name: 'Export' });
        await user.click(exportButton);

        const csvOption = screen.getByRole('menuitem', { name: 'Export as CSV' });
        await user.click(csvOption);

        // CSV download should be triggered
        expect(screen.getByText('Exported to CSV')).toBeInTheDocument();
      });
    });
  });
});