export interface MarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orderCount: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
}

export interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: string;
}

export interface CandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
  pnlPercent: number;
  side: 'LONG' | 'SHORT';
}

export interface Portfolio {
  id: string;
  userId: string;
  totalValue: number;
  availableCash: number;
  totalPnL: number;
  totalPnLPercent: number;
  positions: Position[];
  lastUpdated: string;
  dayChange?: number;
  dayChangePercent?: number;
  cashBalance?: number;
  buyingPower?: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LIMIT';
  price?: number;
  stopPrice?: number;
  status: 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'QUEUED';
  filledQuantity: number;
  filledPrice?: number;
  createdAt: string;
  executedAt?: string;
}

export interface TradingStrategy {
  id: string;
  name: string;
  type: 'TECHNICAL' | 'FUNDAMENTAL' | 'QUANTITATIVE';
  parameters: Record<string, any>;
  rules?: {
    entry: string;
    exit: string;
    stopLoss?: number;
    takeProfit?: number;
  };
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  performance?: Record<string, any>;
  createdAt: string;
}

export interface RiskMetrics {
  valueAtRisk: {
    oneDay: number;
    oneWeek: number;
    oneMonth: number;
  };
  beta: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  volatility: number;
  correlationToMarket: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  averageTrade: number;
  bestTrade: number;
  worstTrade: number;
  totalTrades: number;
  numberOfTrades?: number;
}

export interface Alert {
  id: string;
  symbol?: string;
  type?: 'PRICE' | 'VOLUME';
  condition?: 'ABOVE' | 'BELOW';
  price?: number;
  volumeThreshold?: number;
  active: boolean;
  triggered?: boolean;
  message?: string;
}

export interface ConnectionStatus {
  api: 'connected' | 'disconnected';
  websocket: 'connected' | 'disconnected' | 'connecting';
  authenticated: boolean;
}