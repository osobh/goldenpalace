/**
 * Calculate profit/loss for a trade
 */
export function calculatePnL(
  entryPrice: number,
  currentPrice: number,
  quantity: number,
  direction: 'LONG' | 'SHORT'
): number {
  if (direction === 'LONG') {
    return (currentPrice - entryPrice) * quantity;
  } else {
    return (entryPrice - currentPrice) * quantity;
  }
}

/**
 * Calculate percentage return
 */
export function calculatePercentageReturn(
  entryPrice: number,
  currentPrice: number,
  direction: 'LONG' | 'SHORT'
): number {
  if (direction === 'LONG') {
    return ((currentPrice - entryPrice) / entryPrice) * 100;
  } else {
    return ((entryPrice - currentPrice) / entryPrice) * 100;
  }
}

/**
 * Calculate position size based on risk
 */
export function calculatePositionSize(
  accountBalance: number,
  riskPercentage: number,
  entryPrice: number,
  stopLoss: number
): number {
  const riskAmount = accountBalance * (riskPercentage / 100);
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  return Math.floor(riskAmount / riskPerShare);
}

/**
 * Calculate stop loss level
 */
export function calculateStopLoss(
  entryPrice: number,
  riskPercentage: number,
  direction: 'LONG' | 'SHORT'
): number {
  const riskMultiplier = riskPercentage / 100;

  if (direction === 'LONG') {
    return entryPrice * (1 - riskMultiplier);
  } else {
    return entryPrice * (1 + riskMultiplier);
  }
}

/**
 * Calculate take profit levels
 */
export function calculateTakeProfit(
  entryPrice: number,
  rewardRatio: number,
  stopLoss: number,
  direction: 'LONG' | 'SHORT'
): number {
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  const rewardPerShare = riskPerShare * rewardRatio;

  if (direction === 'LONG') {
    return entryPrice + rewardPerShare;
  } else {
    return entryPrice - rewardPerShare;
  }
}

/**
 * Calculate Sharpe ratio
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.02 // 2% annual risk-free rate
): number {
  if (returns.length === 0) return 0;

  const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance =
    returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
  const standardDeviation = Math.sqrt(variance);

  if (standardDeviation === 0) return 0;

  return (meanReturn - riskFreeRate) / standardDeviation;
}

/**
 * Calculate maximum drawdown
 */
export function calculateMaxDrawdown(balanceHistory: number[]): number {
  if (balanceHistory.length === 0) return 0;

  let maxDrawdown = 0;
  let peak = balanceHistory[0]!; // We know this exists due to length check

  for (const balance of balanceHistory) {
    if (balance > peak) {
      peak = balance;
    }

    const drawdown = (peak - balance) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown * 100; // Return as percentage
}

/**
 * Validate trading symbol
 */
export function isValidTradingSymbol(symbol: string): boolean {
  // Basic validation for stock symbols (1-10 uppercase letters/numbers)
  return /^[A-Z0-9]{1,10}$/.test(symbol);
}

/**
 * Calculate portfolio risk metrics
 */
export function calculatePortfolioRisk(
  positions: Array<{
    symbol: string;
    value: number;
    volatility: number;
  }>
): {
  totalValue: number;
  weightedVolatility: number;
  concentration: number;
} {
  const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);

  if (totalValue === 0) {
    return { totalValue: 0, weightedVolatility: 0, concentration: 0 };
  }

  const weightedVolatility = positions.reduce((sum, pos) => {
    const weight = pos.value / totalValue;
    return sum + weight * pos.volatility;
  }, 0);

  // Concentration risk: largest position as percentage of total
  const largestPosition = Math.max(...positions.map((pos) => pos.value));
  const concentration = (largestPosition / totalValue) * 100;

  return {
    totalValue,
    weightedVolatility,
    concentration,
  };
}
