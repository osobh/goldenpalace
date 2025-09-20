import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderEntryForm } from '../OrderEntryForm';

describe('OrderEntryForm', () => {
  const mockOnPlaceOrder = vi.fn();
  const mockPortfolio = {
    totalValue: 100000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnPlaceOrder.mockResolvedValue({
      id: 'order-123',
      symbol: 'AAPL',
      side: 'BUY',
      quantity: 100,
      type: 'MARKET',
      status: 'PENDING',
      filledQuantity: 0,
      createdAt: new Date().toISOString(),
    });
  });

  it('should render order entry form with all required fields', () => {
    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={mockPortfolio}
      />
    );

    expect(screen.getByRole('region', { name: 'Order Entry' })).toBeInTheDocument();
    expect(screen.getByLabelText('Symbol')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    expect(screen.getByLabelText('Order Type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sell' })).toBeInTheDocument();
  });

  it('should validate required fields before placing order', async () => {
    const user = userEvent.setup();
    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={mockPortfolio}
      />
    );

    const buyButton = screen.getByRole('button', { name: 'Buy' });
    await user.click(buyButton);

    expect(screen.getByText('Symbol is required')).toBeInTheDocument();
    expect(screen.getByText('Quantity must be greater than 0')).toBeInTheDocument();
    expect(mockOnPlaceOrder).not.toHaveBeenCalled();
  });

  it('should validate limit price when order type is LIMIT', async () => {
    const user = userEvent.setup();
    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={mockPortfolio}
      />
    );

    // Set order type to LIMIT
    const orderTypeSelect = screen.getByLabelText('Order Type');
    await user.selectOptions(orderTypeSelect, 'LIMIT');

    // Fill symbol and quantity
    await user.type(screen.getByLabelText('Symbol'), 'AAPL');
    await user.type(screen.getByLabelText('Quantity'), '100');

    // Try to submit without limit price
    const buyButton = screen.getByRole('button', { name: 'Buy' });
    await user.click(buyButton);

    expect(screen.getByText('Limit price is required')).toBeInTheDocument();
    expect(mockOnPlaceOrder).not.toHaveBeenCalled();
  });

  it('should validate stop price when order type is STOP_LOSS', async () => {
    const user = userEvent.setup();
    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={mockPortfolio}
      />
    );

    // Set order type to STOP_LOSS
    const orderTypeSelect = screen.getByLabelText('Order Type');
    await user.selectOptions(orderTypeSelect, 'STOP_LOSS');

    // Fill symbol and quantity
    await user.type(screen.getByLabelText('Symbol'), 'AAPL');
    await user.type(screen.getByLabelText('Quantity'), '100');

    // Try to submit without stop price
    const buyButton = screen.getByRole('button', { name: 'Buy' });
    await user.click(buyButton);

    expect(screen.getByText('Stop price is required')).toBeInTheDocument();
    expect(mockOnPlaceOrder).not.toHaveBeenCalled();
  });

  it('should enforce risk limits based on portfolio value', async () => {
    const user = userEvent.setup();
    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={mockPortfolio}
      />
    );

    // Fill form with large quantity that exceeds risk limit
    await user.type(screen.getByLabelText('Symbol'), 'AAPL');
    await user.type(screen.getByLabelText('Quantity'), '1000'); // 1000 * 150 = 150k > 10% of 100k

    const buyButton = screen.getByRole('button', { name: 'Buy' });
    await user.click(buyButton);

    expect(screen.getByText('Risk limit exceeded')).toBeInTheDocument();
    expect(mockOnPlaceOrder).not.toHaveBeenCalled();
  });

  it('should successfully place a market order', async () => {
    const user = userEvent.setup();
    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={mockPortfolio}
      />
    );

    // Fill valid form data
    await user.type(screen.getByLabelText('Symbol'), 'AAPL');
    await user.type(screen.getByLabelText('Quantity'), '100');

    const buyButton = screen.getByRole('button', { name: 'Buy' });
    await user.click(buyButton);

    await waitFor(() => {
      expect(mockOnPlaceOrder).toHaveBeenCalledWith({
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        type: 'MARKET',
        price: undefined,
        stopPrice: undefined,
      });
    });

    expect(screen.getByText('Order placed successfully')).toBeInTheDocument();
  });

  it('should successfully place a limit order', async () => {
    const user = userEvent.setup();
    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={mockPortfolio}
      />
    );

    // Set order type to LIMIT
    const orderTypeSelect = screen.getByLabelText('Order Type');
    await user.selectOptions(orderTypeSelect, 'LIMIT');

    // Fill valid form data
    await user.type(screen.getByLabelText('Symbol'), 'AAPL');
    await user.type(screen.getByLabelText('Quantity'), '100');
    await user.type(screen.getByLabelText('Limit Price'), '149.50');

    const buyButton = screen.getByRole('button', { name: 'Buy' });
    await user.click(buyButton);

    await waitFor(() => {
      expect(mockOnPlaceOrder).toHaveBeenCalledWith({
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        type: 'LIMIT',
        price: 149.50,
        stopPrice: undefined,
      });
    });

    expect(screen.getByText('Limit order placed')).toBeInTheDocument();
  });

  it('should switch between buy and sell modes', async () => {
    const user = userEvent.setup();
    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={mockPortfolio}
      />
    );

    const sellButton = screen.getByRole('button', { name: 'Sell' });
    await user.click(sellButton);

    // Verify form has sell mode class
    const form = screen.getByRole('form');
    await waitFor(() => {
      expect(form).toHaveClass('sell-mode');
    });

    const buyButton = screen.getByRole('button', { name: 'Buy' });
    await user.click(buyButton);

    await waitFor(() => {
      expect(form).toHaveClass('buy-mode');
    });
  });

  it('should clear form after successful order placement', async () => {
    const user = userEvent.setup();
    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={mockPortfolio}
      />
    );

    const symbolInput = screen.getByLabelText('Symbol');
    const quantityInput = screen.getByLabelText('Quantity');

    // Fill form
    await user.type(symbolInput, 'AAPL');
    await user.type(quantityInput, '100');

    const buyButton = screen.getByRole('button', { name: 'Buy' });
    await user.click(buyButton);

    // Wait for form to clear
    await waitFor(() => {
      expect(symbolInput).toHaveValue('');
      expect(quantityInput).toHaveValue(null); // Number inputs have null when empty
    });
  });

  it('should handle order placement errors', async () => {
    const user = userEvent.setup();
    mockOnPlaceOrder.mockRejectedValue(new Error('Order failed'));

    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={mockPortfolio}
      />
    );

    // Fill valid form data
    await user.type(screen.getByLabelText('Symbol'), 'AAPL');
    await user.type(screen.getByLabelText('Quantity'), '100');

    const buyButton = screen.getByRole('button', { name: 'Buy' });
    await user.click(buyButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to place order')).toBeInTheDocument();
    });
  });

  it('should show appropriate message for different order types', async () => {
    const user = userEvent.setup();
    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={mockPortfolio}
      />
    );

    // Test STOP_LOSS order
    const orderTypeSelect = screen.getByLabelText('Order Type');
    await user.selectOptions(orderTypeSelect, 'STOP_LOSS');

    await user.type(screen.getByLabelText('Symbol'), 'AAPL');
    await user.type(screen.getByLabelText('Quantity'), '100');
    await user.type(screen.getByLabelText('Stop Price'), '140.00');

    const buyButton = screen.getByRole('button', { name: 'Buy' });
    await user.click(buyButton);

    await waitFor(() => {
      expect(screen.getByText('Stop loss order placed')).toBeInTheDocument();
    });
  });

  it('should display conditional price fields based on order type', async () => {
    const user = userEvent.setup();
    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={mockPortfolio}
      />
    );

    const orderTypeSelect = screen.getByLabelText('Order Type');

    // Test LIMIT order shows limit price field
    await user.selectOptions(orderTypeSelect, 'LIMIT');
    expect(screen.getByLabelText('Limit Price')).toBeInTheDocument();

    // Test STOP_LOSS order shows stop price field
    await user.selectOptions(orderTypeSelect, 'STOP_LOSS');
    expect(screen.getByLabelText('Stop Price')).toBeInTheDocument();

    // Test STOP_LIMIT order shows both fields
    await user.selectOptions(orderTypeSelect, 'STOP_LIMIT');
    expect(screen.getByLabelText('Limit Price')).toBeInTheDocument();
    expect(screen.getByLabelText('Stop Price')).toBeInTheDocument();

    // Test MARKET order hides conditional fields
    await user.selectOptions(orderTypeSelect, 'MARKET');
    expect(screen.queryByLabelText('Limit Price')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Stop Price')).not.toBeInTheDocument();
  });

  it('should handle null portfolio gracefully', async () => {
    const user = userEvent.setup();
    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={null}
      />
    );

    // Should still allow order placement without risk limit check
    await user.type(screen.getByLabelText('Symbol'), 'AAPL');
    await user.type(screen.getByLabelText('Quantity'), '100');

    const buyButton = screen.getByRole('button', { name: 'Buy' });
    await user.click(buyButton);

    await waitFor(() => {
      expect(mockOnPlaceOrder).toHaveBeenCalled();
    });
  });

  it('should have proper accessibility attributes', () => {
    render(
      <OrderEntryForm
        onPlaceOrder={mockOnPlaceOrder}
        portfolio={mockPortfolio}
      />
    );

    expect(screen.getByRole('region', { name: 'Order Entry' })).toBeInTheDocument();
    expect(screen.getByRole('form')).toBeInTheDocument();
    expect(screen.getByLabelText('Symbol')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    expect(screen.getByLabelText('Order Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Buy')).toBeInTheDocument();
    expect(screen.getByLabelText('Sell')).toBeInTheDocument();
    expect(screen.getByLabelText('Preview Order')).toBeInTheDocument();
  });
});