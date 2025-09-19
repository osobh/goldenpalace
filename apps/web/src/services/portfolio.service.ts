import { apiClient, type ApiResponse } from './api';

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  initialBalance: number;
  currentBalance: number;
  totalValue: number;
  currency: string;
  isPublic: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  createdAt: string;
  assets: Asset[];
  totalReturn: number;
  totalReturnPercentage: number;
  dayChange: number;
  dayChangePercentage: number;
  riskMetrics?: {
    sharpeRatio: number;
    volatility: number;
    beta: number;
    maxDrawdown: number;
  };
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'STOCK' | 'BOND' | 'ETF' | 'CRYPTO' | 'OPTION' | 'FUTURE';
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
}

export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  initialBalance: number;
  currency: string;
  isPublic: boolean;
}

export interface UpdatePortfolioRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface AddAssetRequest {
  symbol: string;
  quantity: number;
  purchasePrice: number;
}

export interface PortfolioPerformance {
  totalReturn: number;
  totalReturnPercentage: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  bestTrade: number;
  worstTrade: number;
  averageHoldingPeriod: number;
  historicalData: Array<{
    date: string;
    value: number;
  }>;
}

export class PortfolioService {
  async getPortfolios(): Promise<ApiResponse<Portfolio[]>> {
    return apiClient.get<Portfolio[]>('/portfolio');
  }

  async getPortfolio(id: string): Promise<ApiResponse<Portfolio>> {
    return apiClient.get<Portfolio>(`/portfolio/${id}`);
  }

  async createPortfolio(data: CreatePortfolioRequest): Promise<ApiResponse<Portfolio>> {
    return apiClient.post<Portfolio>('/portfolio', data);
  }

  async updatePortfolio(id: string, data: UpdatePortfolioRequest): Promise<ApiResponse<Portfolio>> {
    return apiClient.put<Portfolio>(`/portfolio/${id}`, data);
  }

  async deletePortfolio(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/portfolio/${id}`);
  }

  async getPortfolioAssets(portfolioId: string): Promise<ApiResponse<Asset[]>> {
    return apiClient.get<Asset[]>(`/portfolio/${portfolioId}/assets`);
  }

  async addAssetToPortfolio(portfolioId: string, data: AddAssetRequest): Promise<ApiResponse<Asset>> {
    return apiClient.post<Asset>(`/portfolio/${portfolioId}/assets`, data);
  }

  async updateAsset(portfolioId: string, assetId: string, data: Partial<AddAssetRequest>): Promise<ApiResponse<Asset>> {
    return apiClient.put<Asset>(`/portfolio/${portfolioId}/assets/${assetId}`, data);
  }

  async removeAssetFromPortfolio(portfolioId: string, assetId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/portfolio/${portfolioId}/assets/${assetId}`);
  }

  async getPortfolioPerformance(portfolioId: string, timeRange: string = '1M'): Promise<ApiResponse<PortfolioPerformance>> {
    return apiClient.get<PortfolioPerformance>(`/portfolio/${portfolioId}/performance?timeRange=${timeRange}`);
  }

  async getPortfolioTransactions(portfolioId: string, limit: number = 50): Promise<ApiResponse<Transaction[]>> {
    return apiClient.get<Transaction[]>(`/portfolio/${portfolioId}/transactions?limit=${limit}`);
  }

  async rebalancePortfolio(portfolioId: string, targetAllocations: Record<string, number>): Promise<ApiResponse<Portfolio>> {
    return apiClient.post<Portfolio>(`/portfolio/${portfolioId}/rebalance`, { targetAllocations });
  }

  async clonePortfolio(portfolioId: string, newName: string): Promise<ApiResponse<Portfolio>> {
    return apiClient.post<Portfolio>(`/portfolio/${portfolioId}/clone`, { name: newName });
  }

  async sharePortfolio(portfolioId: string, isPublic: boolean): Promise<ApiResponse<{ shareUrl?: string }>> {
    return apiClient.patch<{ shareUrl?: string }>(`/portfolio/${portfolioId}/share`, { isPublic });
  }

  async getPortfolioRiskMetrics(portfolioId: string): Promise<ApiResponse<RiskMetrics>> {
    return apiClient.get<RiskMetrics>(`/portfolio/${portfolioId}/risk`);
  }

  async exportPortfolioData(portfolioId: string, format: 'CSV' | 'JSON' | 'PDF'): Promise<ApiResponse<{ downloadUrl: string }>> {
    return apiClient.post<{ downloadUrl: string }>(`/portfolio/${portfolioId}/export`, { format });
  }
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL';
  symbol?: string;
  quantity?: number;
  price?: number;
  amount: number;
  fees: number;
  description: string;
  executedAt: string;
  createdAt: string;
}

export interface RiskMetrics {
  valueAtRisk: number;
  conditionalVaR: number;
  sharpeRatio: number;
  sortinoRatio: number;
  volatility: number;
  beta: number;
  alpha: number;
  maxDrawdown: number;
  calmarRatio: number;
  informationRatio: number;
  trackingError: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  diversificationScore: number;
  concentrationRisk: number;
  liquidityScore: number;
  stressTestResults: {
    marketCrash: number;
    interestRateRise: number;
    inflationShock: number;
    currencyDevaluation: number;
  };
}

// Create singleton instance
export const portfolioService = new PortfolioService();