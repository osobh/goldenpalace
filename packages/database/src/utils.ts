import type { PaginationOptions, PaginatedResult } from './types';

/**
 * Generate pagination metadata for database queries
 */
export function createPaginationMeta(
  options: PaginationOptions,
  totalCount: number
): PaginatedResult<never>['pagination'] {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const total = totalCount;
  const hasMore = page * limit < total;

  return {
    page,
    limit,
    total,
    hasMore,
  };
}

/**
 * Calculate offset for database pagination
 */
export function calculateOffset(page: number = 1, limit: number = 20): number {
  return (page - 1) * limit;
}

/**
 * Generate unique invite code for groups
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Calculate trading statistics
 */
export function calculateTradingStats(trades: Array<{ pnl: number }>) {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      bestTrade: 0,
      worstTrade: 0,
      profitFactor: 0,
    };
  }

  const winners = trades.filter((t) => t.pnl > 0);
  const losers = trades.filter((t) => t.pnl < 0);

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winnersPnl = winners.reduce((sum, t) => sum + t.pnl, 0);
  const losersPnl = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0));

  return {
    totalTrades: trades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    winRate: (winners.length / trades.length) * 100,
    totalPnl,
    avgWin: winners.length > 0 ? winnersPnl / winners.length : 0,
    avgLoss: losers.length > 0 ? losersPnl / losers.length : 0,
    bestTrade: Math.max(...trades.map((t) => t.pnl)),
    worstTrade: Math.min(...trades.map((t) => t.pnl)),
    profitFactor: losersPnl > 0 ? winnersPnl / losersPnl : 0,
  };
}

/**
 * Format currency values
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/**
 * Validate trading symbol format
 */
export function isValidSymbol(symbol: string): boolean {
  // Basic symbol validation (can be enhanced based on requirements)
  return /^[A-Z]{1,10}$/.test(symbol);
}

/**
 * Generate CUID-like ID (for testing purposes)
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
