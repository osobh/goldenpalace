import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PriceChart } from '../PriceChart';
import type { MarketData, CandleData } from '../../../services/tradingData.service';

describe('PriceChart', () => {
  const mockOnTimeframeChange = vi.fn();
  const mockOnIndicatorToggle = vi.fn();

  const mockMarketData: MarketData = {
    symbol: 'AAPL',
    price: 150.25,
    bid: 150.20,
    ask: 150.30,
    volume: 1000000,
    timestamp: new Date().toISOString(),
  };

  const mockCandleData: CandleData[] = [
    {
      timestamp: new Date(2024, 0, 1, 9, 30).toISOString(),
      open: 145.00,
      high: 150.00,
      low: 144.50,
      close: 149.00,
      volume: 100000,
    },
    {
      timestamp: new Date(2024, 0, 1, 9, 45).toISOString(),
      open: 149.00,
      high: 151.00,
      low: 148.50,
      close: 150.25,
      volume: 120000,
    },
    {
      timestamp: new Date(2024, 0, 1, 10, 0).toISOString(),
      open: 150.25,
      high: 152.00,
      low: 150.00,
      close: 151.50,
      volume: 110000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the chart container', () => {
      render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
        />
      );

      expect(screen.getByRole('region', { name: 'Price chart for AAPL' })).toBeInTheDocument();
      expect(screen.getByTestId('price-chart-canvas')).toBeInTheDocument();
    });

    it('should display current price', () => {
      render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
        />
      );

      expect(screen.getByText('$150.25')).toBeInTheDocument();
      expect(screen.getByLabelText('Current price')).toBeInTheDocument();
    });

    it('should show price change indicator', () => {
      render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
        />
      );

      const changeElement = screen.getByTestId('price-change');
      expect(changeElement).toBeInTheDocument();
      // Price went from 145 (first open) to 150.25 (current)
      expect(changeElement).toHaveClass('positive');
    });
  });

  describe('timeframe selection', () => {
    it('should render timeframe buttons', () => {
      render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
        />
      );

      expect(screen.getByRole('button', { name: '1D' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1W' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1M' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1Y' })).toBeInTheDocument();
    });

    it('should highlight active timeframe', () => {
      render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
          timeframe="1D"
        />
      );

      const dayButton = screen.getByRole('button', { name: '1D' });
      expect(dayButton).toHaveClass('active');
    });

    it('should call onTimeframeChange when clicking timeframe', () => {
      render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
          onTimeframeChange={mockOnTimeframeChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '1W' }));
      expect(mockOnTimeframeChange).toHaveBeenCalledWith('1W');
    });
  });

  describe('chart types', () => {
    it('should render chart type selector', () => {
      render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
        />
      );

      expect(screen.getByRole('button', { name: 'Candlestick chart' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Line chart' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Area chart' })).toBeInTheDocument();
    });

    it('should switch between chart types', () => {
      render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
        />
      );

      const lineButton = screen.getByRole('button', { name: 'Line chart' });
      fireEvent.click(lineButton);

      expect(lineButton).toHaveClass('active');
      expect(screen.getByTestId('chart-type-line')).toBeInTheDocument();
    });
  });

  describe('candlestick rendering', () => {
    it('should render candlesticks correctly', () => {
      const { container } = render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
          chartType="candlestick"
        />
      );

      const candles = container.querySelectorAll('.candle');
      expect(candles).toHaveLength(mockCandleData.length);

      // Check first candle (bullish - close > open: 149 > 145)
      const firstCandle = candles[0];
      expect(firstCandle).toHaveClass('bullish');
    });

    it('should show volume bars', () => {
      const { container } = render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
          showVolume
        />
      );

      const volumeBars = container.querySelectorAll('.volume-bar');
      expect(volumeBars).toHaveLength(mockCandleData.length);
    });
  });

  describe('interactions', () => {
    it('should show tooltip on hover', async () => {
      const { container } = render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
        />
      );

      const chartCanvas = screen.getByTestId('price-chart-canvas');
      fireEvent.mouseMove(chartCanvas, { clientX: 100, clientY: 100 });

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(/Open:/);
      expect(tooltip).toHaveTextContent(/High:/);
      expect(tooltip).toHaveTextContent(/Low:/);
      expect(tooltip).toHaveTextContent(/Close:/);
    });

    it('should support zoom with mouse wheel', () => {
      const { container } = render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
        />
      );

      const chartCanvas = screen.getByTestId('price-chart-canvas');

      // Zoom in
      fireEvent.wheel(chartCanvas, { deltaY: -100 });
      expect(container.querySelector('.zoom-level')).toHaveTextContent('110%');

      // Zoom out
      fireEvent.wheel(chartCanvas, { deltaY: 100 });
      expect(container.querySelector('.zoom-level')).toHaveTextContent('100%');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
        />
      );

      expect(screen.getByRole('region', { name: 'Price chart for AAPL' })).toBeInTheDocument();
      expect(screen.getByLabelText('Chart timeframe selector')).toBeInTheDocument();
      expect(screen.getByLabelText('Chart type selector')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <PriceChart
          symbol="AAPL"
          data={mockCandleData}
          currentPrice={mockMarketData.price}
        />
      );

      const timeframeButton = screen.getByRole('button', { name: '1D' });
      timeframeButton.focus();

      fireEvent.keyDown(timeframeButton, { key: 'ArrowRight' });
      expect(screen.getByRole('button', { name: '1W' })).toHaveFocus();
    });
  });
});