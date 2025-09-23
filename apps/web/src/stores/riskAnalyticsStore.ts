import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { riskAnalyticsService } from '../services/riskAnalytics.service';
import type {
  RiskMetrics,
  PositionRisk,
  StressTestResult,
  MonteCarloSimulation,
  LiquidityRisk,
  CalculateRiskInput,
  StressTestInput,
  RiskLimitsInput,
  RiskReportInput
} from '@golden-palace/shared';

interface RiskAnalyticsState {
  // State
  currentMetrics: RiskMetrics | null;
  historicalMetrics: RiskMetrics[];
  positionRisks: PositionRisk[];
  stressTestResults: StressTestResult[];
  monteCarloResults: MonteCarloSimulation | null;
  liquidityRisk: LiquidityRisk | null;
  riskSummary: {
    avgVaR: number;
    avgVolatility: number;
    avgSharpe: number;
    avgDrawdown: number;
  } | null;
  riskBreaches: {
    breaches: any[];
    allWithinLimits: boolean;
  } | null;
  fullAnalysis: {
    metrics: RiskMetrics;
    positions: PositionRisk[];
    liquidity: LiquidityRisk;
    summary: {
      avgVaR: number;
      avgVolatility: number;
      avgSharpe: number;
      avgDrawdown: number;
    };
  } | null;
  selectedPortfolioId: string | null;
  selectedTimeHorizon: string;
  isLoading: boolean;
  error: string | null;

  // Actions - Risk Metrics
  calculateRiskMetrics: (input: CalculateRiskInput) => Promise<void>;
  getHistoricalMetrics: (portfolioId: string, options?: { limit?: number; timeHorizon?: string }) => Promise<void>;
  getLatestMetrics: (portfolioId: string) => Promise<void>;
  getRiskSummary: (portfolioId: string, period?: number) => Promise<void>;

  // Actions - Position Analysis
  getPositionRisks: (portfolioId: string) => Promise<void>;
  getLiquidityRisk: (portfolioId: string) => Promise<void>;

  // Actions - Stress Testing & Simulation
  runStressTests: (input: StressTestInput) => Promise<void>;
  runDefaultStressTests: (portfolioId: string) => Promise<void>;
  runMonteCarloSimulation: (portfolioId: string, numberOfSimulations?: number, timeHorizon?: string) => Promise<void>;

  // Actions - Risk Management
  setRiskLimits: (input: RiskLimitsInput) => Promise<void>;
  checkRiskBreaches: (portfolioId: string) => Promise<void>;
  generateRiskReport: (input: RiskReportInput) => Promise<void>;

  // Actions - Comprehensive Analysis
  runFullRiskAnalysis: (portfolioId: string, timeHorizon?: string) => Promise<void>;

  // Actions - UI State
  setSelectedPortfolio: (portfolioId: string | null) => void;
  setSelectedTimeHorizon: (timeHorizon: string) => void;
  clearError: () => void;
  clearResults: () => void;
}

export const useRiskAnalyticsStore = create<RiskAnalyticsState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentMetrics: null,
      historicalMetrics: [],
      positionRisks: [],
      stressTestResults: [],
      monteCarloResults: null,
      liquidityRisk: null,
      riskSummary: null,
      riskBreaches: null,
      fullAnalysis: null,
      selectedPortfolioId: null,
      selectedTimeHorizon: '1M',
      isLoading: false,
      error: null,

      // Calculate risk metrics for a portfolio
      calculateRiskMetrics: async (input: CalculateRiskInput) => {
        set({ isLoading: true, error: null });
        try {
          const metrics = await riskAnalyticsService.calculateRiskMetrics(input);
          set({
            currentMetrics: metrics,
            selectedPortfolioId: input.portfolioId,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to calculate risk metrics',
            isLoading: false
          });
          throw error;
        }
      },

      // Get historical risk metrics
      getHistoricalMetrics: async (portfolioId: string, options?: { limit?: number; timeHorizon?: string }) => {
        set({ isLoading: true, error: null });
        try {
          const historicalMetrics = await riskAnalyticsService.getHistoricalMetrics(portfolioId, options);
          set({
            historicalMetrics,
            selectedPortfolioId: portfolioId,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to get historical metrics',
            isLoading: false
          });
          throw error;
        }
      },

      // Get latest risk metrics
      getLatestMetrics: async (portfolioId: string) => {
        set({ isLoading: true, error: null });
        try {
          const metrics = await riskAnalyticsService.getLatestMetrics(portfolioId);
          set({
            currentMetrics: metrics,
            selectedPortfolioId: portfolioId,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to get latest metrics',
            isLoading: false
          });
          throw error;
        }
      },

      // Get risk summary
      getRiskSummary: async (portfolioId: string, period: number = 30) => {
        try {
          const summary = await riskAnalyticsService.getRiskSummary(portfolioId, period);
          set({
            riskSummary: summary,
            selectedPortfolioId: portfolioId
          });
        } catch (error) {
          console.error('Failed to get risk summary:', error);
        }
      },

      // Get position risks
      getPositionRisks: async (portfolioId: string) => {
        set({ isLoading: true, error: null });
        try {
          const positionRisks = await riskAnalyticsService.getPositionRisks(portfolioId);
          set({
            positionRisks,
            selectedPortfolioId: portfolioId,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to get position risks',
            isLoading: false
          });
          throw error;
        }
      },

      // Get liquidity risk
      getLiquidityRisk: async (portfolioId: string) => {
        try {
          const liquidityRisk = await riskAnalyticsService.getLiquidityRisk(portfolioId);
          set({
            liquidityRisk,
            selectedPortfolioId: portfolioId
          });
        } catch (error) {
          console.error('Failed to get liquidity risk:', error);
        }
      },

      // Run stress tests
      runStressTests: async (input: StressTestInput) => {
        set({ isLoading: true, error: null });
        try {
          const results = await riskAnalyticsService.runStressTests(input);
          set({
            stressTestResults: results,
            selectedPortfolioId: input.portfolioId,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to run stress tests',
            isLoading: false
          });
          throw error;
        }
      },

      // Run default stress tests
      runDefaultStressTests: async (portfolioId: string) => {
        const scenarios = riskAnalyticsService.getDefaultStressScenarios();
        await get().runStressTests({
          portfolioId,
          scenarios
        });
      },

      // Run Monte Carlo simulation
      runMonteCarloSimulation: async (portfolioId: string, numberOfSimulations: number = 1000, timeHorizon: string = '1M') => {
        set({ isLoading: true, error: null });
        try {
          const results = await riskAnalyticsService.runMonteCarloSimulation(portfolioId, numberOfSimulations, timeHorizon);
          set({
            monteCarloResults: results,
            selectedPortfolioId: portfolioId,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to run Monte Carlo simulation',
            isLoading: false
          });
          throw error;
        }
      },

      // Set risk limits
      setRiskLimits: async (input: RiskLimitsInput) => {
        set({ isLoading: true, error: null });
        try {
          await riskAnalyticsService.setRiskLimits(input);
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to set risk limits',
            isLoading: false
          });
          throw error;
        }
      },

      // Check risk breaches
      checkRiskBreaches: async (portfolioId: string) => {
        try {
          const breaches = await riskAnalyticsService.checkRiskBreaches(portfolioId);
          set({
            riskBreaches: breaches,
            selectedPortfolioId: portfolioId
          });
        } catch (error) {
          console.error('Failed to check risk breaches:', error);
        }
      },

      // Generate risk report
      generateRiskReport: async (input: RiskReportInput) => {
        set({ isLoading: true, error: null });
        try {
          await riskAnalyticsService.generateRiskReport(input);
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to generate risk report',
            isLoading: false
          });
          throw error;
        }
      },

      // Run comprehensive risk analysis
      runFullRiskAnalysis: async (portfolioId: string, timeHorizon: string = '1M') => {
        set({ isLoading: true, error: null });
        try {
          const fullAnalysis = await riskAnalyticsService.runFullRiskAnalysis(portfolioId, timeHorizon);
          set({
            fullAnalysis,
            currentMetrics: fullAnalysis.metrics,
            positionRisks: fullAnalysis.positions,
            liquidityRisk: fullAnalysis.liquidity,
            riskSummary: fullAnalysis.summary,
            selectedPortfolioId: portfolioId,
            selectedTimeHorizon: timeHorizon,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to run full risk analysis',
            isLoading: false
          });
          throw error;
        }
      },

      // UI State Management
      setSelectedPortfolio: (portfolioId: string | null) => {
        set({ selectedPortfolioId: portfolioId });
      },

      setSelectedTimeHorizon: (timeHorizon: string) => {
        set({ selectedTimeHorizon: timeHorizon });
      },

      clearError: () => {
        set({ error: null });
      },

      clearResults: () => {
        set({
          currentMetrics: null,
          historicalMetrics: [],
          positionRisks: [],
          stressTestResults: [],
          monteCarloResults: null,
          liquidityRisk: null,
          riskSummary: null,
          riskBreaches: null,
          fullAnalysis: null,
          error: null
        });
      }
    }),
    {
      name: 'risk-analytics-store',
      partialize: (state) => ({
        selectedPortfolioId: state.selectedPortfolioId,
        selectedTimeHorizon: state.selectedTimeHorizon
      })
    }
  )
);