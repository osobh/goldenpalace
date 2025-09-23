import { apiClient } from './api';
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

export interface RiskAnalyticsApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class RiskAnalyticsService {
  private baseUrl = '/risk-analytics';

  // Calculate risk metrics for a portfolio
  async calculateRiskMetrics(input: CalculateRiskInput): Promise<RiskMetrics> {
    const response = await apiClient.post<RiskAnalyticsApiResponse<RiskMetrics>>(
      `${this.baseUrl}/calculate`,
      input
    );

    // Handle authentication errors specifically
    if (!response.success && response.error === 'Authentication required') {
      throw new Error('Authentication required. Please log in to access risk analytics.');
    }

    // Check if response.data exists (might be HTML error page for actual 404)
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Unable to access risk analytics. The API may be unavailable.');
    }

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to calculate risk metrics');
    }

    return response.data.data;
  }

  // Get historical risk metrics for a portfolio
  async getHistoricalMetrics(
    portfolioId: string,
    options?: {
      limit?: number;
      timeHorizon?: string;
    }
  ): Promise<RiskMetrics[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.timeHorizon) params.append('timeHorizon', options.timeHorizon);

    const response = await apiClient.get<RiskAnalyticsApiResponse<RiskMetrics[]>>(
      `${this.baseUrl}/portfolio/${portfolioId}/history?${params.toString()}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get historical metrics');
    }

    return response.data.data;
  }

  // Get latest risk metrics for a portfolio
  async getLatestMetrics(portfolioId: string): Promise<RiskMetrics> {
    const response = await apiClient.get<RiskAnalyticsApiResponse<RiskMetrics>>(
      `${this.baseUrl}/portfolio/${portfolioId}/latest`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get latest metrics');
    }

    return response.data.data;
  }

  // Calculate position risks for a portfolio
  async getPositionRisks(portfolioId: string): Promise<PositionRisk[]> {
    const response = await apiClient.get<RiskAnalyticsApiResponse<PositionRisk[]>>(
      `${this.baseUrl}/portfolio/${portfolioId}/positions`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get position risks');
    }

    return response.data.data;
  }

  // Run stress tests
  async runStressTests(input: StressTestInput): Promise<StressTestResult[]> {
    const response = await apiClient.post<RiskAnalyticsApiResponse<StressTestResult[]>>(
      `${this.baseUrl}/stress-test`,
      input
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to run stress tests');
    }

    return response.data.data;
  }

  // Set risk limits for a portfolio
  async setRiskLimits(input: RiskLimitsInput): Promise<any> {
    const response = await apiClient.post<RiskAnalyticsApiResponse<any>>(
      `${this.baseUrl}/limits`,
      input
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to set risk limits');
    }

    return response.data.data;
  }

  // Check risk limit breaches
  async checkRiskBreaches(portfolioId: string): Promise<{
    breaches: any[];
    allWithinLimits: boolean;
  }> {
    const response = await apiClient.get<RiskAnalyticsApiResponse<{
      breaches: any[];
      allWithinLimits: boolean;
    }>>(`${this.baseUrl}/portfolio/${portfolioId}/breaches`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to check risk breaches');
    }

    return response.data.data;
  }

  // Run Monte Carlo simulation
  async runMonteCarloSimulation(
    portfolioId: string,
    numberOfSimulations: number = 1000,
    timeHorizon: string = '1M'
  ): Promise<MonteCarloSimulation> {
    const response = await apiClient.post<RiskAnalyticsApiResponse<MonteCarloSimulation>>(
      `${this.baseUrl}/monte-carlo`,
      {
        portfolioId,
        numberOfSimulations,
        timeHorizon
      }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to run Monte Carlo simulation');
    }

    return response.data.data;
  }

  // Calculate liquidity risk
  async getLiquidityRisk(portfolioId: string): Promise<LiquidityRisk> {
    const response = await apiClient.get<RiskAnalyticsApiResponse<LiquidityRisk>>(
      `${this.baseUrl}/portfolio/${portfolioId}/liquidity`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get liquidity risk');
    }

    return response.data.data;
  }

  // Generate risk report
  async generateRiskReport(input: RiskReportInput): Promise<any> {
    const response = await apiClient.post<RiskAnalyticsApiResponse<any>>(
      `${this.baseUrl}/report`,
      input
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to generate risk report');
    }

    return response.data.data;
  }

  // Get risk metrics summary/aggregates
  async getRiskSummary(
    portfolioId: string,
    period: number = 30
  ): Promise<{
    avgVaR: number;
    avgVolatility: number;
    avgSharpe: number;
    avgDrawdown: number;
  }> {
    const response = await apiClient.get<RiskAnalyticsApiResponse<{
      avgVaR: number;
      avgVolatility: number;
      avgSharpe: number;
      avgDrawdown: number;
    }>>(`${this.baseUrl}/portfolio/${portfolioId}/summary?period=${period}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get risk summary');
    }

    return response.data.data;
  }

  // Convenience method to run comprehensive risk analysis
  async runFullRiskAnalysis(portfolioId: string, timeHorizon: string = '1M'): Promise<{
    metrics: RiskMetrics;
    positions: PositionRisk[];
    liquidity: LiquidityRisk;
    summary: {
      avgVaR: number;
      avgVolatility: number;
      avgSharpe: number;
      avgDrawdown: number;
    };
  }> {
    try {
      // Calculate fresh risk metrics
      const metrics = await this.calculateRiskMetrics({
        portfolioId,
        timeHorizon,
        confidenceLevel: 0.95,
        includeCorrelations: true
      });

      // Get additional analyses in parallel
      const [positions, liquidity, summary] = await Promise.all([
        this.getPositionRisks(portfolioId),
        this.getLiquidityRisk(portfolioId),
        this.getRiskSummary(portfolioId, 30)
      ]);

      return {
        metrics,
        positions,
        liquidity,
        summary
      };
    } catch (error) {
      console.error('Failed to run full risk analysis:', error);
      throw error;
    }
  }

  // Predefined stress test scenarios
  getDefaultStressScenarios() {
    return [
      {
        name: 'Market Crash (-20%)',
        marketChange: -20,
        volatilityMultiplier: 2.0,
        correlationShock: 0.3,
        duration: '1D' as const
      },
      {
        name: 'Market Correction (-10%)',
        marketChange: -10,
        volatilityMultiplier: 1.5,
        correlationShock: 0.2,
        duration: '1W' as const
      },
      {
        name: 'High Volatility Period',
        marketChange: 0,
        volatilityMultiplier: 3.0,
        correlationShock: 0.5,
        duration: '1M' as const
      },
      {
        name: 'Bear Market (-30%)',
        marketChange: -30,
        volatilityMultiplier: 2.5,
        correlationShock: 0.4,
        duration: '3M' as const
      },
      {
        name: 'Flash Crash (-15%)',
        marketChange: -15,
        volatilityMultiplier: 4.0,
        correlationShock: 0.6,
        duration: '1D' as const
      }
    ];
  }

  // Run default stress tests
  async runDefaultStressTests(portfolioId: string): Promise<StressTestResult[]> {
    const scenarios = this.getDefaultStressScenarios();

    return this.runStressTests({
      portfolioId,
      scenarios
    });
  }
}

export const riskAnalyticsService = new RiskAnalyticsService();