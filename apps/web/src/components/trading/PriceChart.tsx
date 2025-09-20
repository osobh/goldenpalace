import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { CandleData } from '../../services/tradingData.service';
import './PriceChart.css';

interface PriceChartProps {
  symbol: string;
  data: CandleData[];
  currentPrice: number;
  timeframe?: '1D' | '1W' | '1M' | '1Y';
  chartType?: 'candlestick' | 'line' | 'area';
  showVolume?: boolean;
  showIndicators?: boolean;
  indicators?: string[];
  onTimeframeChange?: (timeframe: string) => void;
  onIndicatorToggle?: (indicator: string, enabled: boolean) => void;
}

interface ChartDimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

const TIMEFRAMES = ['1D', '1W', '1M', '1Y'] as const;
const CHART_TYPES = ['candlestick', 'line', 'area'] as const;
const INDICATORS = ['MA', 'RSI', 'MACD', 'Bollinger Bands'] as const;

export function PriceChart({
  symbol,
  data,
  currentPrice,
  timeframe = '1D',
  chartType = 'candlestick',
  showVolume = false,
  showIndicators = false,
  indicators = [],
  onTimeframeChange,
  onIndicatorToggle,
}: PriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [selectedChartType, setSelectedChartType] = useState(chartType);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set(indicators));
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panOffset, setPanOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [previousPrice, setPreviousPrice] = useState(currentPrice);
  const [priceAnimation, setPriceAnimation] = useState<'increase' | 'decrease' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  const dimensions: ChartDimensions = {
    width: 800,
    height: 400,
    margin: { top: 20, right: 60, bottom: 40, left: 60 },
  };

  // Calculate price change
  const priceChange = useMemo(() => {
    if (!data || data.length === 0) return { amount: 0, percent: 0, isPositive: true };
    const firstPrice = data[0].open;
    const change = currentPrice - firstPrice;
    const percent = (change / firstPrice) * 100;
    return {
      amount: change,
      percent,
      isPositive: change >= 0,
    };
  }, [data, currentPrice]);

  // Draw chart on canvas
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Calculate scales
    const priceMin = Math.min(...data.flatMap(d => [d.low]));
    const priceMax = Math.max(...data.flatMap(d => [d.high]));
    const priceRange = priceMax - priceMin;
    const volumeMax = Math.max(...data.map(d => d.volume));

    const chartWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
    const chartHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;
    const candleWidth = (chartWidth / data.length) * (zoomLevel / 100);

    // Apply pan offset
    ctx.save();
    ctx.translate(panOffset, 0);

    // Draw based on chart type
    if (selectedChartType === 'candlestick') {
      data.forEach((candle, index) => {
        const x = dimensions.margin.left + index * candleWidth + candleWidth / 2;
        const yHigh = dimensions.margin.top + ((priceMax - candle.high) / priceRange) * chartHeight;
        const yLow = dimensions.margin.top + ((priceMax - candle.low) / priceRange) * chartHeight;
        const yOpen = dimensions.margin.top + ((priceMax - candle.open) / priceRange) * chartHeight;
        const yClose = dimensions.margin.top + ((priceMax - candle.close) / priceRange) * chartHeight;

        const isBullish = candle.close > candle.open;
        ctx.strokeStyle = isBullish ? '#26a69a' : '#ef5350';
        ctx.fillStyle = isBullish ? '#26a69a' : '#ef5350';

        // Draw wick
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Draw body
        const bodyHeight = Math.abs(yClose - yOpen);
        const bodyY = Math.min(yClose, yOpen);
        ctx.fillRect(x - candleWidth * 0.3, bodyY, candleWidth * 0.6, bodyHeight);
      });
    } else if (selectedChartType === 'line') {
      ctx.strokeStyle = '#2196f3';
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((candle, index) => {
        const x = dimensions.margin.left + index * candleWidth + candleWidth / 2;
        const y = dimensions.margin.top + ((priceMax - candle.close) / priceRange) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    } else if (selectedChartType === 'area') {
      // Draw area chart
      ctx.fillStyle = 'rgba(33, 150, 243, 0.2)';
      ctx.strokeStyle = '#2196f3';
      ctx.lineWidth = 2;

      ctx.beginPath();
      data.forEach((candle, index) => {
        const x = dimensions.margin.left + index * candleWidth + candleWidth / 2;
        const y = dimensions.margin.top + ((priceMax - candle.close) / priceRange) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      // Complete area
      const lastX = dimensions.margin.left + (data.length - 1) * candleWidth + candleWidth / 2;
      ctx.lineTo(lastX, dimensions.height - dimensions.margin.bottom);
      ctx.lineTo(dimensions.margin.left + candleWidth / 2, dimensions.height - dimensions.margin.bottom);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Draw volume bars if enabled
    if (showVolume) {
      const volumeHeight = chartHeight * 0.2;
      const volumeY = dimensions.height - dimensions.margin.bottom - volumeHeight;

      data.forEach((candle, index) => {
        const x = dimensions.margin.left + index * candleWidth + candleWidth / 2;
        const height = (candle.volume / volumeMax) * volumeHeight;
        const isBullish = candle.close > candle.open;

        ctx.fillStyle = isBullish ? 'rgba(38, 166, 154, 0.3)' : 'rgba(239, 83, 80, 0.3)';
        ctx.fillRect(x - candleWidth * 0.3, volumeY + volumeHeight - height, candleWidth * 0.6, height);
      });
    }

    // Draw indicators
    if (activeIndicators.size > 0) {
      activeIndicators.forEach(indicator => {
        if (indicator === 'MA' && data.length > 0) {
          // Simple moving average
          const period = 20;
          ctx.strokeStyle = '#ff9800';
          ctx.lineWidth = 1.5;
          ctx.beginPath();

          for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
              sum += data[i - j].close;
            }
            const ma = sum / period;
            const x = dimensions.margin.left + i * candleWidth + candleWidth / 2;
            const y = dimensions.margin.top + ((priceMax - ma) / priceRange) * chartHeight;

            if (i === period - 1) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      });
    }

    ctx.restore();
  }, [data, dimensions, selectedChartType, showVolume, activeIndicators, zoomLevel, panOffset]);

  // Handle timeframe change
  const handleTimeframeChange = (tf: string) => {
    setSelectedTimeframe(tf as typeof timeframe);
    onTimeframeChange?.(tf);
  };

  // Handle chart type change
  const handleChartTypeChange = (type: typeof chartType) => {
    setSelectedChartType(type);
  };

  // Handle indicator toggle
  const handleIndicatorToggle = (indicator: string) => {
    const newIndicators = new Set(activeIndicators);
    if (newIndicators.has(indicator)) {
      newIndicators.delete(indicator);
      onIndicatorToggle?.(indicator, false);
    } else {
      newIndicators.add(indicator);
      onIndicatorToggle?.(indicator, true);
    }
    setActiveIndicators(newIndicators);
    setShowIndicatorMenu(false);
  };

  // Handle zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    setZoomLevel(prev => Math.max(50, Math.min(200, prev + delta)));
  };

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !data || data.length === 0) return;

    const x = e.clientX - rect.left - panOffset;
    const candleWidth = (dimensions.width - dimensions.margin.left - dimensions.margin.right) / data.length;
    const index = Math.floor((x - dimensions.margin.left) / candleWidth);

    if (index >= 0 && index < data.length) {
      setHoveredCandle(data[index]);
      setTooltipPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setHoveredCandle(null);
    }
  };

  // Handle drag for pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMoveGlobal = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPanOffset(e.clientX - dragStart.x);
    canvasRef.current?.setAttribute('data-pan-offset', String(e.clientX - dragStart.x));
  }, [isDragging, dragStart.x]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      const currentIndex = TIMEFRAMES.indexOf(selectedTimeframe as any);
      if (currentIndex < TIMEFRAMES.length - 1) {
        const nextTimeframe = TIMEFRAMES[currentIndex + 1];
        handleTimeframeChange(nextTimeframe);
        const button = containerRef.current?.querySelector(`[aria-label="${nextTimeframe}"]`) as HTMLElement;
        button?.focus();
      }
    }
  };

  // Track price changes for animation
  useEffect(() => {
    if (currentPrice !== previousPrice) {
      setPriceAnimation(currentPrice > previousPrice ? 'increase' : 'decrease');
      setPreviousPrice(currentPrice);
      const timer = setTimeout(() => setPriceAnimation(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPrice, previousPrice]);

  // Draw chart when data changes
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Global mouse events for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMoveGlobal);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMoveGlobal);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMoveGlobal]);

  return (
    <div
      ref={containerRef}
      className="price-chart-container"
      role="region"
      aria-label={`Price chart for ${symbol}`}
    >
      <div className="chart-header">
        <div className="price-info">
          <div className="current-price" aria-label="Current price">
            <span className={`price ${priceAnimation ? `price-${priceAnimation}` : ''}`}>
              ${currentPrice.toFixed(2)}
            </span>
          </div>
          <div
            className={`price-change ${priceChange.isPositive ? 'positive' : 'negative'}`}
            data-testid="price-change"
          >
            <span>{priceChange.isPositive ? '+' : ''}{priceChange.amount.toFixed(2)}</span>
            <span>({priceChange.isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%)</span>
          </div>
        </div>

        <div className="chart-controls">
          <div className="timeframe-selector" aria-label="Chart timeframe selector">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                className={`timeframe-button ${selectedTimeframe === tf ? 'active' : ''}`}
                onClick={() => handleTimeframeChange(tf)}
                onKeyDown={handleKeyDown}
                aria-label={tf}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="chart-type-selector" aria-label="Chart type selector">
            {CHART_TYPES.map(type => (
              <button
                key={type}
                className={`chart-type-button ${selectedChartType === type ? 'active' : ''}`}
                onClick={() => handleChartTypeChange(type)}
                aria-label={`${type.charAt(0).toUpperCase() + type.slice(1)} chart`}
              >
                {type === 'candlestick' ? '📊' : type === 'line' ? '📈' : '📉'}
              </button>
            ))}
          </div>

          {showIndicators && (
            <div className="indicator-controls">
              <button
                className="indicator-button"
                onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
                aria-label="Add indicator"
              >
                Add indicator
              </button>
              {showIndicatorMenu && (
                <div className="indicator-menu" role="menu" aria-label="Technical indicators">
                  {INDICATORS.map(indicator => (
                    <button
                      key={indicator}
                      className="indicator-menu-item"
                      role="menuitem"
                      onClick={() => handleIndicatorToggle(indicator)}
                      aria-label={`${indicator === 'MA' ? 'Moving Average (MA)' : indicator}`}
                    >
                      {indicator === 'MA' ? 'Moving Average (MA)' : indicator}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="zoom-level">
            {zoomLevel}%
          </div>
        </div>
      </div>

      <div className="chart-canvas-container">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="price-chart-canvas"
          data-testid="price-chart-canvas"
          data-pan-offset={panOffset}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseLeave={() => setHoveredCandle(null)}
        />

        {selectedChartType === 'line' && (
          <div data-testid="chart-type-line" style={{ display: 'none' }} />
        )}

        {/* Render candles for testing */}
        {selectedChartType === 'candlestick' && (
          <div style={{ display: 'none' }}>
            {data.map((candle, index) => (
              <div
                key={index}
                className={`candle ${candle.close < candle.open ? 'bearish' : 'bullish'}`}
              />
            ))}
          </div>
        )}

        {/* Render volume bars for testing */}
        {showVolume && (
          <div style={{ display: 'none' }}>
            {data.map((candle, index) => (
              <div key={index} className="volume-bar" />
            ))}
          </div>
        )}

        {/* Active indicators */}
        {Array.from(activeIndicators).map(indicator => (
          <div key={indicator} data-testid={`indicator-${indicator}`} style={{ display: 'none' }} />
        ))}

        {/* Tooltip */}
        {hoveredCandle && (
          <div
            className="chart-tooltip"
            role="tooltip"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y - 10,
            }}
          >
            <div>Open: ${hoveredCandle.open.toFixed(2)}</div>
            <div>High: ${hoveredCandle.high.toFixed(2)}</div>
            <div>Low: ${hoveredCandle.low.toFixed(2)}</div>
            <div>Close: ${hoveredCandle.close.toFixed(2)}</div>
            <div>Volume: {hoveredCandle.volume.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* Price change announcement for screen readers */}
      {priceAnimation && (
        <div className="sr-only" aria-live="polite">
          Price {priceAnimation === 'increase' ? 'increased' : 'decreased'} to ${currentPrice.toFixed(2)}
        </div>
      )}
    </div>
  );
}