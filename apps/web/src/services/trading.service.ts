import { apiClient, type ApiResponse } from './api';

// ================================
// TYPE DEFINITIONS
// ================================

export type AssetType = 'STOCK' | 'CRYPTO' | 'FOREX' | 'COMMODITY' | 'INDEX' | 'OPTION' | 'FUTURES';
export type TradeDirection = 'LONG' | 'SHORT';
export type TradeStatus = 'ACTIVE' | 'CLOSED' | 'CANCELLED' | 'EXPIRED';
export type PositionStatus = 'OPEN' | 'CLOSED' | 'STOPPED_OUT' | 'TAKE_PROFIT';

export interface TradeIdea {
  id: string;
  groupId: string;
  userId: string;
  symbol: string;
  assetType?: AssetType;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  timeframe?: string;
  confidence?: number; // 1-5 rating
  rationale?: string;
  chartUrl?: string;
  tags: string[];
  status: TradeStatus;
  closedPrice?: number;
  closedAt?: string;
  pnl?: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  group: {
    id: string;
    name: string;
  };
  _count?: {
    paperPositions: number;
  };
}

export interface PaperPosition {
  id: string;
  userId: string;
  groupId: string;
  tradeIdeaId?: string;
  symbol: string;
  assetType: AssetType;
  quantity: number;
  entryPrice: number;
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl?: number;
  pnlPercent?: number;
  status: PositionStatus;
  openedAt: string;
  closedAt?: string;
  closedPrice?: number;
  closeReason?: string;
  tradeIdea?: TradeIdea;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  group: {
    id: string;
    name: string;
  };
}

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
  timestamp: string;
}

export interface CreateTradeIdeaRequest {
  groupId: string;
  symbol: string;
  assetType?: AssetType;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  timeframe?: string;
  confidence?: number;
  rationale?: string;
  chartUrl?: string;
  tags?: string[];
}

export interface UpdateTradeIdeaRequest {
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  rationale?: string;
  chartUrl?: string;
  tags?: string[];
}

export interface CreatePaperPositionRequest {
  groupId: string;
  tradeIdeaId?: string;
  symbol: string;
  assetType?: AssetType;
  quantity: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface UpdatePositionRequest {
  stopLoss?: number;
  takeProfit?: number;
}

export interface ClosePositionRequest {
  closePrice: number;
  closeReason?: string;
}

export interface CloseTradeIdeaRequest {
  closedPrice: number;
}

export interface GetTradeIdeasQuery {
  groupId?: string;
  userId?: string;
  symbol?: string;
  status?: TradeStatus;
  direction?: TradeDirection;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'pnl' | 'confidence';
  sortOrder?: 'asc' | 'desc';
}

export interface GetPaperPositionsQuery {
  groupId?: string;
  userId?: string;
  symbol?: string;
  status?: PositionStatus;
  page?: number;
  limit?: number;
}

export interface TradePerformanceStats {
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
  sharpeRatio?: number;
}

export interface TrendingSymbol {
  symbol: string;
  count: number;
  avgConfidence?: number;
  totalVolume?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ================================
// TRADING SERVICE CLASS
// ================================

export class TradingService {
  // ==================
  // TRADE IDEAS
  // ==================

  async createTradeIdea(data: CreateTradeIdeaRequest): Promise<ApiResponse<TradeIdea>> {
    return apiClient.post<TradeIdea>('/trading/ideas', data);
  }

  async getTradeIdeas(query?: GetTradeIdeasQuery): Promise<ApiResponse<PaginatedResult<TradeIdea>>> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return apiClient.get<PaginatedResult<TradeIdea>>(`/trading/ideas${queryString ? `?${queryString}` : ''}`);
  }

  async getTradeIdea(id: string): Promise<ApiResponse<TradeIdea>> {
    return apiClient.get<TradeIdea>(`/trading/ideas/${id}`);
  }

  async updateTradeIdea(id: string, data: UpdateTradeIdeaRequest): Promise<ApiResponse<TradeIdea>> {
    return apiClient.put<TradeIdea>(`/trading/ideas/${id}`, data);
  }

  async closeTradeIdea(id: string, data: CloseTradeIdeaRequest): Promise<ApiResponse<TradeIdea>> {
    return apiClient.post<TradeIdea>(`/trading/ideas/${id}/close`, data);
  }

  async deleteTradeIdea(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/trading/ideas/${id}`);
  }

  // ==================
  // PAPER POSITIONS
  // ==================

  async createPaperPosition(data: CreatePaperPositionRequest): Promise<ApiResponse<PaperPosition>> {
    return apiClient.post<PaperPosition>('/trading/positions/paper', data);
  }

  async getPaperPositions(query?: GetPaperPositionsQuery): Promise<ApiResponse<PaginatedResult<PaperPosition>>> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return apiClient.get<PaginatedResult<PaperPosition>>(`/trading/positions/paper${queryString ? `?${queryString}` : ''}`);
  }

  async getPaperPosition(id: string): Promise<ApiResponse<PaperPosition>> {
    return apiClient.get<PaperPosition>(`/trading/positions/paper/${id}`);
  }

  async updatePaperPosition(id: string, data: UpdatePositionRequest): Promise<ApiResponse<PaperPosition>> {
    return apiClient.put<PaperPosition>(`/trading/positions/paper/${id}`, data);
  }

  async closePaperPosition(id: string, data: ClosePositionRequest): Promise<ApiResponse<PaperPosition>> {
    return apiClient.post<PaperPosition>(`/trading/positions/paper/${id}/close`, data);
  }

  async deletePaperPosition(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/trading/positions/paper/${id}`);
  }

  // ==================
  // STATISTICS
  // ==================

  async getUserStats(userId?: string): Promise<ApiResponse<TradePerformanceStats>> {
    const url = userId ? `/trading/stats/user/${userId}` : '/trading/stats/user';
    return apiClient.get<TradePerformanceStats>(url);
  }

  async getGroupStats(groupId: string): Promise<ApiResponse<TradePerformanceStats>> {
    return apiClient.get<TradePerformanceStats>(`/trading/stats/group/${groupId}`);
  }

  async getTrendingSymbols(groupId?: string): Promise<ApiResponse<TrendingSymbol[]>> {
    const url = groupId ? `/trading/trending?groupId=${groupId}` : '/trading/trending';
    return apiClient.get<TrendingSymbol[]>(url);
  }

  // ==================
  // MARKET DATA
  // ==================

  async updateMarketPrices(quotes: MarketQuote[]): Promise<ApiResponse<{ updated: number }>> {
    return apiClient.post<{ updated: number }>('/trading/market/update', { quotes });
  }

  async getMarketQuote(symbol: string): Promise<ApiResponse<MarketQuote>> {
    return apiClient.get<MarketQuote>(`/trading/market/quote/${symbol}`);
  }

  async getMarketQuotes(symbols: string[]): Promise<ApiResponse<MarketQuote[]>> {
    const params = new URLSearchParams();
    symbols.forEach(symbol => params.append('symbols', symbol));
    return apiClient.get<MarketQuote[]>(`/trading/market/quotes?${params.toString()}`);
  }

  // ==================
  // TRADE EXECUTION
  // ==================

  async executeTradeFromIdea(tradeIdeaId: string, quantity: number): Promise<ApiResponse<PaperPosition>> {
    return apiClient.post<PaperPosition>('/trading/execute/from-idea', {
      tradeIdeaId,
      quantity,
    });
  }

  async copyTrade(positionId: string, quantity?: number): Promise<ApiResponse<PaperPosition>> {
    return apiClient.post<PaperPosition>('/trading/execute/copy', {
      positionId,
      quantity,
    });
  }

  // ==================
  // SEARCH
  // ==================

  async searchTradeIdeas(query: string, filters?: {
    groupId?: string;
    symbol?: string;
    minConfidence?: number;
  }): Promise<ApiResponse<TradeIdea[]>> {
    const params = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return apiClient.get<TradeIdea[]>(`/trading/ideas/search?${params.toString()}`);
  }

  async searchSymbols(query: string): Promise<ApiResponse<Array<{
    symbol: string;
    name: string;
    type: AssetType;
    exchange?: string;
  }>>> {
    return apiClient.get<Array<{
      symbol: string;
      name: string;
      type: AssetType;
      exchange?: string;
    }>>(`/trading/symbols/search?q=${encodeURIComponent(query)}`);
  }
}

export const tradingService = new TradingService();