import { z } from 'zod';

export const ASSET_TYPES = ['STOCK', 'CRYPTO', 'FOREX', 'COMMODITY', 'INDEX', 'BOND'] as const;
export const PORTFOLIO_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export const TRANSACTION_TYPES = ['BUY', 'SELL', 'DIVIDEND', 'FEE', 'DEPOSIT', 'WITHDRAW'] as const;
export const ALLOCATION_STRATEGIES = ['EQUAL_WEIGHT', 'MARKET_CAP', 'RISK_PARITY', 'CUSTOM'] as const;

export type AssetType = typeof ASSET_TYPES[number];
export type PortfolioStatus = typeof PORTFOLIO_STATUSES[number];
export type TransactionType = typeof TRANSACTION_TYPES[number];
export type AllocationStrategy = typeof ALLOCATION_STRATEGIES[number];

export const createPortfolioSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  initialBalance: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  isPublic: z.boolean().default(false),
  strategy: z.enum(ALLOCATION_STRATEGIES).optional(),
  targetAllocations: z.record(z.string(), z.number()).optional(),
});

export const addAssetSchema = z.object({
  portfolioId: z.string().cuid(),
  symbol: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  type: z.enum(ASSET_TYPES),
  quantity: z.number().positive(),
  averagePrice: z.number().positive(),
  currentPrice: z.number().positive().optional(),
  currency: z.string().length(3).default('USD'),
});

export const recordTransactionSchema = z.object({
  portfolioId: z.string().cuid(),
  assetId: z.string().cuid().optional(),
  type: z.enum(TRANSACTION_TYPES),
  symbol: z.string().min(1).max(10).optional(),
  quantity: z.number().positive().optional(),
  price: z.number().positive(),
  fee: z.number().nonnegative().default(0),
  currency: z.string().length(3).default('USD'),
  executedAt: z.string().datetime().transform(str => new Date(str)),
  notes: z.string().max(500).optional(),
});

export const updatePortfolioSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  status: z.enum(PORTFOLIO_STATUSES).optional(),
  strategy: z.enum(ALLOCATION_STRATEGIES).optional(),
  targetAllocations: z.record(z.string(), z.number()).optional(),
});

export const rebalancePortfolioSchema = z.object({
  portfolioId: z.string().cuid(),
  strategy: z.enum(ALLOCATION_STRATEGIES),
  targetAllocations: z.record(z.string(), z.number()).optional(),
  maxTradeSize: z.number().positive().optional(),
  minTradeSize: z.number().positive().optional(),
});

export const portfolioQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(PORTFOLIO_STATUSES).optional(),
  isPublic: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'totalValue', 'performance']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  initialBalance: number;
  currentBalance: number;
  totalValue: number;
  currency: string;
  isPublic: boolean;
  status: PortfolioStatus;
  strategy?: AllocationStrategy;
  targetAllocations?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  costBasis: number;
  unrealizedPnl: number;
  realizedPnl: number;
  percentageGain: number;
  allocation: number;
  currency: string;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  portfolioId: string;
  assetId?: string;
  type: TransactionType;
  symbol?: string;
  quantity?: number;
  price: number;
  totalAmount: number;
  fee: number;
  currency: string;
  executedAt: Date;
  notes?: string;
  createdAt: Date;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercentage: number;
  dayChange: number;
  dayChangePercentage: number;
  weekChange: number;
  weekChangePercentage: number;
  monthChange: number;
  monthChangePercentage: number;
  yearChange: number;
  yearChangePercentage: number;
  allTimeHigh: number;
  allTimeLow: number;
  sharpeRatio: number;
  volatility: number;
  beta: number;
  alpha: number;
  maxDrawdown: number;
  winRate: number;
}

export interface AssetAllocation {
  symbol: string;
  name: string;
  value: number;
  percentage: number;
  targetPercentage?: number;
  deviation?: number;
}

export interface RebalanceRecommendation {
  assetId: string;
  symbol: string;
  currentAllocation: number;
  targetAllocation: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  quantity: number;
  estimatedPrice: number;
  estimatedCost: number;
}

export interface PortfolioSnapshot {
  portfolioId: string;
  date: Date;
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  assets: Array<{
    symbol: string;
    quantity: number;
    price: number;
    value: number;
  }>;
}

export interface PortfolioWithDetails extends Portfolio {
  assets: Asset[];
  metrics: PortfolioMetrics;
  allocation: AssetAllocation[];
  recentTransactions: Transaction[];
}

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type AddAssetInput = z.infer<typeof addAssetSchema>;
export type RecordTransactionInput = z.infer<typeof recordTransactionSchema>;
export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
export type RebalancePortfolioInput = z.infer<typeof rebalancePortfolioSchema>;
export type PortfolioQuery = z.infer<typeof portfolioQuerySchema>;