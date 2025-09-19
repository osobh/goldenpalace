import { z } from 'zod';

export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'] as const;
export const RISK_METRICS = ['VAR', 'CVAR', 'SHARPE', 'SORTINO', 'BETA', 'ALPHA', 'DRAWDOWN'] as const;
export const TIME_HORIZONS = ['1D', '1W', '1M', '3M', '6M', '1Y'] as const;
export const CONFIDENCE_LEVELS = [0.90, 0.95, 0.99] as const;

export type RiskLevel = typeof RISK_LEVELS[number];
export type RiskMetric = typeof RISK_METRICS[number];
export type TimeHorizon = typeof TIME_HORIZONS[number];
export type ConfidenceLevel = typeof CONFIDENCE_LEVELS[number];

export const calculateRiskSchema = z.object({
  portfolioId: z.string().cuid(),
  timeHorizon: z.enum(TIME_HORIZONS).default('1M'),
  confidenceLevel: z.number().min(0.9).max(0.99).default(0.95),
  includeCorrelations: z.boolean().default(true),
  stressTestScenarios: z.array(z.string()).optional(),
});

export const riskLimitsSchema = z.object({
  portfolioId: z.string().cuid(),
  maxDrawdown: z.number().positive().max(100),
  maxVaR: z.number().positive(),
  maxLeverage: z.number().positive().default(1),
  maxConcentration: z.number().positive().max(100),
  maxVolatility: z.number().positive(),
  minSharpeRatio: z.number(),
});

export const stressTestSchema = z.object({
  portfolioId: z.string().cuid(),
  scenarios: z.array(z.object({
    name: z.string(),
    marketChange: z.number().min(-100).max(100),
    volatilityMultiplier: z.number().positive(),
    correlationShock: z.number().min(-1).max(1),
    duration: z.enum(TIME_HORIZONS),
  })),
});

export const riskReportSchema = z.object({
  portfolioId: z.string().cuid(),
  reportType: z.enum(['SUMMARY', 'DETAILED', 'REGULATORY']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  includeCharts: z.boolean().default(true),
  format: z.enum(['JSON', 'PDF', 'CSV']).default('JSON'),
});

export interface RiskMetrics {
  portfolioId: string;
  calculatedAt: Date;
  timeHorizon: TimeHorizon;
  confidenceLevel: ConfidenceLevel;

  valueAtRisk: number;
  conditionalVaR: number;
  expectedShortfall: number;

  volatility: number;
  annualizedVolatility: number;
  downsidevVolatility: number;

  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  informationRatio: number;

  beta: number;
  alpha: number;
  treynorRatio: number;
  jensenAlpha: number;

  maxDrawdown: number;
  maxDrawdownDuration: number;
  currentDrawdown: number;
  recoveryTime: number;

  correlation: Record<string, number>;
  covariance: Record<string, number>;
  trackingError: number;

  riskLevel: RiskLevel;
  riskScore: number;
}

export interface PositionRisk {
  assetId: string;
  symbol: string;
  exposure: number;
  percentageOfPortfolio: number;

  individualVaR: number;
  marginalVaR: number;
  componentVaR: number;
  incrementalVaR: number;

  beta: number;
  correlation: number;
  volatility: number;

  concentrationRisk: number;
  liquidityRisk: number;
  creditRisk: number;
}

export interface RiskLimits {
  id: string;
  portfolioId: string;
  maxDrawdown: number;
  maxVaR: number;
  maxLeverage: number;
  maxConcentration: number;
  maxVolatility: number;
  minSharpeRatio: number;

  breaches: RiskLimitBreach[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RiskLimitBreach {
  limitType: string;
  currentValue: number;
  limitValue: number;
  breachAmount: number;
  breachPercentage: number;
  breachedAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface StressTestResult {
  scenarioName: string;
  portfolioValue: number;
  portfolioLoss: number;
  lossPercentage: number;

  assetImpacts: Array<{
    symbol: string;
    currentValue: number;
    stressedValue: number;
    loss: number;
    lossPercentage: number;
  }>;

  metricsUnderStress: {
    var: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };

  probability: number;
  severity: RiskLevel;
}

export interface CorrelationMatrix {
  assets: string[];
  matrix: number[][];
  significantCorrelations: Array<{
    asset1: string;
    asset2: string;
    correlation: number;
    pValue: number;
  }>;
  clusterAnalysis: Array<{
    clusterId: string;
    assets: string[];
    averageCorrelation: number;
  }>;
}

export interface RiskReport {
  id: string;
  portfolioId: string;
  reportType: 'SUMMARY' | 'DETAILED' | 'REGULATORY';
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };

  executive Summary: {
    overallRiskLevel: RiskLevel;
    riskScore: number;
    keyRisks: string[];
    recommendations: string[];
  };

  metrics: RiskMetrics;
  positionRisks: PositionRisk[];
  stressTests: StressTestResult[];
  correlations: CorrelationMatrix;

  historicalAnalysis: {
    worstDay: { date: Date; loss: number };
    bestDay: { date: Date; gain: number };
    volatilityTrend: Array<{ date: Date; volatility: number }>;
    varBacktest: {
      violations: number;
      expectedViolations: number;
      kupiecTest: { statistic: number; pValue: number; passed: boolean };
    };
  };

  riskAttribution: {
    byAsset: Record<string, number>;
    byAssetClass: Record<string, number>;
    bySector: Record<string, number>;
    byRegion: Record<string, number>;
  };

  charts?: {
    varChart: string;
    drawdownChart: string;
    correlationHeatmap: string;
    riskContribution: string;
  };
}

export interface RiskAlert {
  id: string;
  portfolioId: string;
  alertType: 'LIMIT_BREACH' | 'HIGH_VOLATILITY' | 'CONCENTRATION' | 'DRAWDOWN' | 'CORRELATION_SPIKE';
  severity: RiskLevel;
  message: string;
  details: any;
  triggered: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface MonteCarloSimulation {
  portfolioId: string;
  numberOfSimulations: number;
  timeHorizon: TimeHorizon;

  results: {
    expectedReturn: number;
    expectedVolatility: number;

    percentiles: Record<number, number>;
    probabilityOfLoss: number;
    probabilityOfTarget: number;

    bestCase: { value: number; probability: number };
    worstCase: { value: number; probability: number };
    mostLikely: { value: number; probability: number };

    paths: Array<{
      simulationId: number;
      finalValue: number;
      maxValue: number;
      minValue: number;
      path: number[];
    }>;
  };
}

export interface LiquidityRisk {
  portfolioId: string;

  overall: {
    liquidityScore: number;
    daysToLiquidate: number;
    immediatelyLiquid: number;
    liquidWithin1Day: number;
    liquidWithin1Week: number;
    illiquid: number;
  };

  byAsset: Array<{
    symbol: string;
    value: number;
    averageDailyVolume: number;
    daysToLiquidate: number;
    marketImpact: number;
    liquidityScore: number;
  }>;

  stressedLiquidity: {
    marketStress: number;
    volumeReduction: number;
    spreadWidening: number;
    estimatedCost: number;
  };
}

export type CalculateRiskInput = z.infer<typeof calculateRiskSchema>;
export type RiskLimitsInput = z.infer<typeof riskLimitsSchema>;
export type StressTestInput = z.infer<typeof stressTestSchema>;
export type RiskReportInput = z.infer<typeof riskReportSchema>;