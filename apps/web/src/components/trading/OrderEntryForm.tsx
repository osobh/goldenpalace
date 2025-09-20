import { useState } from 'react';
import type { Order } from '../../services/tradingData.service';

type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LIMIT';
type OrderSide = 'BUY' | 'SELL';

interface OrderEntryFormProps {
  onPlaceOrder: (order: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    type: OrderType;
    price?: number;
    stopPrice?: number;
  }) => Promise<Order>;
  portfolio: { totalValue: number } | null;
}

export function OrderEntryForm({ onPlaceOrder, portfolio }: OrderEntryFormProps) {
  const [orderSymbol, setOrderSymbol] = useState('');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [orderSide, setOrderSide] = useState<OrderSide>('BUY');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [orderValidationErrors, setOrderValidationErrors] = useState<Record<string, string>>({});
  const [orderMessage, setOrderMessage] = useState('');

  const validateOrder = (): boolean => {
    const errors: Record<string, string> = {};

    if (!orderSymbol.trim()) {
      errors.symbol = 'Symbol is required';
    }

    if (!orderQuantity || parseInt(orderQuantity) <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }

    if (orderType === 'LIMIT' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      errors.limitPrice = 'Limit price is required';
    }

    if (orderType === 'STOP_LIMIT' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      errors.limitPrice = 'Limit price is required';
    }

    if ((orderType === 'STOP_LOSS' || orderType === 'STOP_LIMIT') && (!stopPrice || parseFloat(stopPrice) <= 0)) {
      errors.stopPrice = 'Stop price is required';
    }

    // Check risk limits - only if we have valid quantity
    const quantity = parseInt(orderQuantity || '0');
    if (quantity > 0) {
      const orderValue = quantity * 50; // Approximate value - using $50 per share for conservative estimate
      if (portfolio && orderValue > portfolio.totalValue * 0.1) {
        errors.risk = 'Risk limit exceeded';
      }
    }

    setOrderValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!validateOrder()) {
      return;
    }

    try {
      await onPlaceOrder({
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
      } else if (orderType === 'STOP_LOSS') {
        setOrderMessage('Stop loss order placed');
      } else {
        setOrderMessage('Stop limit order placed');
      }

      // Update form state to trigger buy/sell mode classes
      const form = document.querySelector<HTMLElement>('.order-entry-form');
      if (form) {
        form.classList.add(`${orderSide.toLowerCase()}-mode`);
        form.classList.remove(orderSide === 'BUY' ? 'sell-mode' : 'buy-mode');
      }

      // Reset form
      setOrderSymbol('');
      setOrderQuantity('');
      setLimitPrice('');
      setStopPrice('');
      setOrderValidationErrors({});

      // Clear message after 3 seconds
      setTimeout(() => setOrderMessage(''), 3000);
    } catch (error) {
      setOrderMessage('Failed to place order');
    }
  };

  return (
    <div role="region" aria-label="Order Entry">
      <form
        className={`order-entry-form ${orderSide.toLowerCase()}-mode`}
        onSubmit={handleSubmit}
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

        {(orderType === 'LIMIT' || orderType === 'STOP_LIMIT') && (
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
            {orderValidationErrors.limitPrice && (
              <span className="error">{orderValidationErrors.limitPrice}</span>
            )}
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
            {orderValidationErrors.stopPrice && (
              <span className="error">{orderValidationErrors.stopPrice}</span>
            )}
          </div>
        )}

        <div className="order-actions">
          <button
            type="submit"
            className={`order-button ${orderSide.toLowerCase()}`}
            onClick={(e) => {
              e.preventDefault();
              setOrderSide('BUY');
              const form = document.querySelector<HTMLElement>('.order-entry-form');
              if (form) {
                form.classList.add('buy-mode');
                form.classList.remove('sell-mode');
              }
              handleSubmit();
            }}
            aria-label="Buy"
          >
            Buy
          </button>
          <button
            type="submit"
            className={`order-button ${orderSide.toLowerCase()}`}
            onClick={(e) => {
              e.preventDefault();
              setOrderSide('SELL');
              const form = document.querySelector<HTMLElement>('.order-entry-form');
              if (form) {
                form.classList.add('sell-mode');
                form.classList.remove('buy-mode');
              }
              handleSubmit();
            }}
            aria-label="Sell"
          >
            Sell
          </button>
          <button
            type="button"
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
    </div>
  );
}