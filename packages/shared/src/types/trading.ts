import { z } from 'zod';

// Asset Types
export const ASSET_TYPES = ['STOCK', 'FOREX', 'CRYPTO', 'OPTION', 'FUTURE', 'INDEX'] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

// Trade Direction
export const TRADE_DIRECTIONS = ['LONG', 'SHORT'] as const;
export type TradeDirection = (typeof TRADE_DIRECTIONS)[number];

// Trade Status
export const TRADE_STATUSES = ['ACTIVE', 'CLOSED', 'CANCELLED'] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];

// Position Status
export const POSITION_STATUSES = ['OPEN', 'CLOSED', 'STOPPED'] as const;
export type PositionStatus = (typeof POSITION_STATUSES)[number];

// Trade Idea Creation Schema
export const createTradeIdeaSchema = z.object({
  groupId: z.string().cuid('Invalid group ID'),
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(20, 'Symbol must not exceed 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Symbol must contain only uppercase letters and numbers'),
  assetType: z.enum(ASSET_TYPES).optional(),
  direction: z.enum(TRADE_DIRECTIONS),
  entryPrice: z.number().positive('Entry price must be positive'),
  stopLoss: z.number().positive('Stop loss must be positive').optional(),
  takeProfit1: z.number().positive('Take profit 1 must be positive').optional(),
  takeProfit2: z.number().positive('Take profit 2 must be positive').optional(),
  takeProfit3: z.number().positive('Take profit 3 must be positive').optional(),
  timeframe: z.string().max(20).optional(),
  confidence: z.number().int().min(1).max(5).optional(),
  rationale: z.string().max(2000, 'Rationale must not exceed 2000 characters').optional(),
  chartUrl: z.string().url('Invalid chart URL').optional(),
  tags: z.array(z.string()).optional(),
});

// Trade Idea Update Schema
export const updateTradeIdeaSchema = z.object({
  stopLoss: z.number().positive('Stop loss must be positive').optional(),
  takeProfit1: z.number().positive('Take profit 1 must be positive').optional(),
  takeProfit2: z.number().positive('Take profit 2 must be positive').optional(),
  takeProfit3: z.number().positive('Take profit 3 must be positive').optional(),
  timeframe: z.string().max(20).optional(),
  confidence: z.number().int().min(1).max(5).optional(),
  rationale: z.string().max(2000, 'Rationale must not exceed 2000 characters').optional(),
  chartUrl: z.string().url('Invalid chart URL').optional(),
  tags: z.array(z.string()).optional(),
});

// Trade Ideas Query Schema
export const getTradeIdeasQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  symbol: z.string().optional(),
  status: z.enum(TRADE_STATUSES).optional(),
  direction: z.enum(TRADE_DIRECTIONS).optional(),
  assetType: z.enum(ASSET_TYPES).optional(),
  userId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'symbol', 'pnl', 'confidence']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Paper Position Creation Schema
export const createPaperPositionSchema = z.object({
  tradeIdeaId: z.string().cuid('Invalid trade idea ID').optional(),
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(20, 'Symbol must not exceed 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Symbol must contain only uppercase letters and numbers'),
  assetType: z.enum(ASSET_TYPES),
  quantity: z.number().positive('Quantity must be positive'),
  entryPrice: z.number().positive('Entry price must be positive'),
  stopLoss: z.number().positive('Stop loss must be positive').optional(),
  takeProfit: z.number().positive('Take profit must be positive').optional(),
});

// Position Update Schema
export const updatePositionSchema = z.object({
  currentPrice: z.number().positive('Current price must be positive').optional(),
  stopLoss: z.number().positive('Stop loss must be positive').optional(),
  takeProfit: z.number().positive('Take profit must be positive').optional(),
  status: z.enum(POSITION_STATUSES).optional(),
  closedPrice: z.number().positive('Closed price must be positive').optional(),
  closeReason: z.string().max(50).optional(),
});

// Alert Creation Schema
export const createAlertSchema = z.object({
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(20, 'Symbol must not exceed 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Symbol must contain only uppercase letters and numbers'),
  condition: z.enum(['ABOVE', 'BELOW', 'CROSSES_ABOVE', 'CROSSES_BELOW']),
  targetPrice: z.number().positive('Target price must be positive'),
  message: z.string().max(200, 'Message must not exceed 200 characters').optional(),
});

// Type inference from schemas
export type CreateTradeIdeaInput = z.infer<typeof createTradeIdeaSchema>;
export type UpdateTradeIdeaInput = z.infer<typeof updateTradeIdeaSchema>;
export type GetTradeIdeasQuery = z.infer<typeof getTradeIdeasQuerySchema>;
export type CreatePaperPositionInput = z.infer<typeof createPaperPositionSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;

// Enhanced types with relations
export interface TradeIdeaWithDetails {
  id: string;
  groupId: string;
  userId: string;
  symbol: string;
  assetType: AssetType | null;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;
  timeframe: string | null;
  confidence: number | null;
  rationale: string | null;
  chartUrl: string | null;
  tags: string[];
  status: TradeStatus;
  closedPrice: number | null;
  closedAt: Date | null;
  pnl: number | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  group: {
    id: string;
    name: string;
  };
  paperPositions: PaperPositionWithDetails[];
}

export interface PaperPositionWithDetails {
  id: string;
  userId: string;
  groupId: string;
  tradeIdeaId: string | null;
  symbol: string;
  assetType: AssetType;
  quantity: number;
  entryPrice: number;
  currentPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  status: PositionStatus;
  openedAt: Date;
  closedAt: Date | null;
  closedPrice: number | null;
  closeReason: string | null;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  group: {
    id: string;
    name: string;
  };
  tradeIdea?: {
    id: string;
    symbol: string;
    direction: TradeDirection;
  } | null;
}

// Performance stats interface
export interface TradeIdeaPerformanceStats {
  totalIdeas: number;
  activeIdeas: number;
  closedIdeas: number;
  winningIdeas: number;
  losingIdeas: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
}

// Trending symbols interface
export interface TrendingSymbol {
  symbol: string;
  count: number;
  avgPnl: number;
}

// Search query interface
export interface TradeIdeaSearchQuery {
  groupId: string;
  symbol?: string;
  query?: string;
  page?: number;
  limit?: number;
}

// Alert types
export interface AlertWithDetails {
  id: string;
  userId: string;
  symbol: string;
  condition: 'ABOVE' | 'BELOW' | 'CROSSES_ABOVE' | 'CROSSES_BELOW';
  targetPrice: number;
  message: string | null;
  status: 'ACTIVE' | 'TRIGGERED' | 'CANCELLED';
  triggeredAt: Date | null;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

// Market Data Types
export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: Date;
}

export interface MarketData {
  symbol: string;
  prices: Array<{
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

// Trading Metrics
export interface TradingMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
}

// Portfolio Summary
export interface PortfolioSummary {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  dayPnl: number;
  dayPnlPercent: number;
  openPositions: number;
  closedPositions: number;
  activeAlerts: number;
  buyingPower: number;
}

// Time frames for charts
export const TIMEFRAMES = [
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '6h',
  '12h',
  '1d',
  '3d',
  '1w',
  '1M',
] as const;

export type Timeframe = (typeof TIMEFRAMES)[number];

// Popular trading symbols
export const POPULAR_SYMBOLS = {
  stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'],
  forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'],
  crypto: ['BTCUSD', 'ETHUSD', 'ADAUSD', 'SOLUSD', 'DOTUSD', 'LINKUSD', 'AVAXUSD'],
  indices: ['SPX', 'NDX', 'DJI', 'RUT', 'VIX'],
} as const;

// Risk Management Constants
export const RISK_LEVELS = {
  CONSERVATIVE: { maxRiskPerTrade: 0.01, maxDrawdown: 0.05 }, // 1% per trade, 5% max drawdown
  MODERATE: { maxRiskPerTrade: 0.02, maxDrawdown: 0.1 }, // 2% per trade, 10% max drawdown
  AGGRESSIVE: { maxRiskPerTrade: 0.05, maxDrawdown: 0.2 }, // 5% per trade, 20% max drawdown
} as const;

export type RiskLevel = keyof typeof RISK_LEVELS;
