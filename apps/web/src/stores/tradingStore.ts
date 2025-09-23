import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  tradingService,
  type TradeIdea,
  type PaperPosition,
  type MarketQuote,
  type CreateTradeIdeaRequest,
  type UpdateTradeIdeaRequest,
  type CreatePaperPositionRequest,
  type UpdatePositionRequest,
  type ClosePositionRequest,
  type CloseTradeIdeaRequest,
  type GetTradeIdeasQuery,
  type GetPaperPositionsQuery,
  type TradePerformanceStats,
  type TrendingSymbol,
  type PaginatedResult,
} from '../services/trading.service';
import type { ApiResponse } from '../services/api';

interface TradingState {
  // Data
  tradeIdeas: TradeIdea[];
  paperPositions: PaperPosition[];
  userTradeIdeas: TradeIdea[];
  userPositions: PaperPosition[];
  selectedTradeIdea: TradeIdea | null;
  selectedPosition: PaperPosition | null;
  marketQuotes: Record<string, MarketQuote>;
  userStats: TradePerformanceStats | null;
  groupStats: Record<string, TradePerformanceStats>;
  trendingSymbols: TrendingSymbol[];
  watchlist: string[];

  // Pagination
  tradeIdeasPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  positionsPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;

  // UI State
  isLoading: boolean;
  error: string | null;
  activeTab: 'ideas' | 'positions' | 'portfolio';
  selectedGroupId: string | null;

  // Actions - Trade Ideas
  fetchTradeIdeas: (query?: GetTradeIdeasQuery) => Promise<void>;
  fetchUserTradeIdeas: (userId: string) => Promise<void>;
  createTradeIdea: (data: CreateTradeIdeaRequest) => Promise<ApiResponse<TradeIdea>>;
  updateTradeIdea: (id: string, data: UpdateTradeIdeaRequest) => Promise<ApiResponse<TradeIdea>>;
  closeTradeIdea: (id: string, data: CloseTradeIdeaRequest) => Promise<ApiResponse<TradeIdea>>;
  deleteTradeIdea: (id: string) => Promise<ApiResponse<{ message: string }>>;
  selectTradeIdea: (id: string) => Promise<void>;

  // Actions - Paper Positions
  fetchPaperPositions: (query?: GetPaperPositionsQuery) => Promise<void>;
  fetchUserPositions: (userId: string) => Promise<void>;
  createPaperPosition: (data: CreatePaperPositionRequest) => Promise<ApiResponse<PaperPosition>>;
  updatePaperPosition: (id: string, data: UpdatePositionRequest) => Promise<ApiResponse<PaperPosition>>;
  closePaperPosition: (id: string, data: ClosePositionRequest) => Promise<ApiResponse<PaperPosition>>;
  deletePaperPosition: (id: string) => Promise<ApiResponse<{ message: string }>>;
  selectPosition: (id: string) => Promise<void>;

  // Actions - Trade Execution
  executeTradeFromIdea: (tradeIdeaId: string, quantity: number) => Promise<ApiResponse<PaperPosition>>;
  copyTrade: (positionId: string, quantity?: number) => Promise<ApiResponse<PaperPosition>>;

  // Actions - Statistics
  fetchUserStats: (userId?: string) => Promise<void>;
  fetchGroupStats: (groupId: string) => Promise<void>;
  fetchTrendingSymbols: (groupId?: string) => Promise<void>;

  // Actions - Market Data
  fetchMarketQuotes: (symbols: string[]) => Promise<void>;
  updateMarketPrices: (quotes: MarketQuote[]) => Promise<void>;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;

  // Actions - Search
  searchTradeIdeas: (query: string, filters?: any) => Promise<void>;
  searchSymbols: (query: string) => Promise<ApiResponse<any[]>>;

  // Utility Actions
  clearError: () => void;
  clearSelection: () => void;
  setActiveTab: (tab: 'ideas' | 'positions' | 'portfolio') => void;
  setSelectedGroup: (groupId: string | null) => void;
  refreshTradingData: () => Promise<void>;
}

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
      // Initial state
      tradeIdeas: [],
      paperPositions: [],
      userTradeIdeas: [],
      userPositions: [],
      selectedTradeIdea: null,
      selectedPosition: null,
      marketQuotes: {},
      userStats: null,
      groupStats: {},
      trendingSymbols: [],
      watchlist: [],
      tradeIdeasPagination: null,
      positionsPagination: null,
      isLoading: false,
      error: null,
      activeTab: 'ideas',
      selectedGroupId: null,

      // Trade Ideas Actions
      fetchTradeIdeas: async (query?: GetTradeIdeasQuery) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.getTradeIdeas(query);

          if (response.success && response.data) {
            set({
              tradeIdeas: response.data.data,
              tradeIdeasPagination: response.data.pagination,
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to fetch trade ideas',
            });
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch trade ideas',
          });
        }
      },

      fetchUserTradeIdeas: async (userId: string) => {
        try {
          const response = await tradingService.getTradeIdeas({ userId });
          if (response.success && response.data) {
            set({ userTradeIdeas: response.data.data });
          }
        } catch (error) {
          console.error('Failed to fetch user trade ideas:', error);
        }
      },

      createTradeIdea: async (data: CreateTradeIdeaRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.createTradeIdea(data);

          if (response.success && response.data) {
            const currentIdeas = get().tradeIdeas;
            set({
              tradeIdeas: [response.data, ...currentIdeas],
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to create trade idea',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create trade idea';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      updateTradeIdea: async (id: string, data: UpdateTradeIdeaRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.updateTradeIdea(id, data);

          if (response.success && response.data) {
            const currentIdeas = get().tradeIdeas;
            const updatedIdeas = currentIdeas.map(idea =>
              idea.id === id ? response.data! : idea
            );
            set({
              tradeIdeas: updatedIdeas,
              selectedTradeIdea: response.data,
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to update trade idea',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update trade idea';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      closeTradeIdea: async (id: string, data: CloseTradeIdeaRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.closeTradeIdea(id, data);

          if (response.success && response.data) {
            const currentIdeas = get().tradeIdeas;
            const updatedIdeas = currentIdeas.map(idea =>
              idea.id === id ? response.data! : idea
            );
            set({
              tradeIdeas: updatedIdeas,
              selectedTradeIdea: response.data,
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to close trade idea',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to close trade idea';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      deleteTradeIdea: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.deleteTradeIdea(id);

          if (response.success) {
            const currentIdeas = get().tradeIdeas;
            const filteredIdeas = currentIdeas.filter(idea => idea.id !== id);
            set({
              tradeIdeas: filteredIdeas,
              selectedTradeIdea: null,
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to delete trade idea',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete trade idea';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      selectTradeIdea: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.getTradeIdea(id);

          if (response.success && response.data) {
            set({
              selectedTradeIdea: response.data,
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to fetch trade idea',
            });
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch trade idea',
          });
        }
      },

      // Paper Positions Actions
      fetchPaperPositions: async (query?: GetPaperPositionsQuery) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.getPaperPositions(query);

          if (response.success && response.data) {
            set({
              paperPositions: response.data.data,
              positionsPagination: response.data.pagination,
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to fetch positions',
            });
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch positions',
          });
        }
      },

      fetchUserPositions: async (userId: string) => {
        try {
          const response = await tradingService.getPaperPositions({ userId, status: 'OPEN' });
          if (response.success && response.data) {
            set({ userPositions: response.data.data });
          }
        } catch (error) {
          console.error('Failed to fetch user positions:', error);
        }
      },

      createPaperPosition: async (data: CreatePaperPositionRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.createPaperPosition(data);

          if (response.success && response.data) {
            const currentPositions = get().paperPositions;
            set({
              paperPositions: [response.data, ...currentPositions],
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to create position',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create position';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      updatePaperPosition: async (id: string, data: UpdatePositionRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.updatePaperPosition(id, data);

          if (response.success && response.data) {
            const currentPositions = get().paperPositions;
            const updatedPositions = currentPositions.map(position =>
              position.id === id ? response.data! : position
            );
            set({
              paperPositions: updatedPositions,
              selectedPosition: response.data,
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to update position',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update position';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      closePaperPosition: async (id: string, data: ClosePositionRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.closePaperPosition(id, data);

          if (response.success && response.data) {
            const currentPositions = get().paperPositions;
            const updatedPositions = currentPositions.map(position =>
              position.id === id ? response.data! : position
            );
            set({
              paperPositions: updatedPositions,
              selectedPosition: response.data,
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to close position',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to close position';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      deletePaperPosition: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.deletePaperPosition(id);

          if (response.success) {
            const currentPositions = get().paperPositions;
            const filteredPositions = currentPositions.filter(position => position.id !== id);
            set({
              paperPositions: filteredPositions,
              selectedPosition: null,
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to delete position',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete position';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      selectPosition: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.getPaperPosition(id);

          if (response.success && response.data) {
            set({
              selectedPosition: response.data,
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to fetch position',
            });
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch position',
          });
        }
      },

      // Trade Execution
      executeTradeFromIdea: async (tradeIdeaId: string, quantity: number) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.executeTradeFromIdea(tradeIdeaId, quantity);

          if (response.success && response.data) {
            const currentPositions = get().paperPositions;
            set({
              paperPositions: [response.data, ...currentPositions],
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to execute trade',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to execute trade';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      copyTrade: async (positionId: string, quantity?: number) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.copyTrade(positionId, quantity);

          if (response.success && response.data) {
            const currentPositions = get().paperPositions;
            set({
              paperPositions: [response.data, ...currentPositions],
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to copy trade',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to copy trade';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Statistics
      fetchUserStats: async (userId?: string) => {
        try {
          const response = await tradingService.getUserStats(userId);
          if (response.success && response.data) {
            set({ userStats: response.data });
          }
        } catch (error) {
          console.error('Failed to fetch user stats:', error);
        }
      },

      fetchGroupStats: async (groupId: string) => {
        try {
          const response = await tradingService.getGroupStats(groupId);
          if (response.success && response.data) {
            set(state => ({
              groupStats: {
                ...state.groupStats,
                [groupId]: response.data!,
              },
            }));
          }
        } catch (error) {
          console.error('Failed to fetch group stats:', error);
        }
      },

      fetchTrendingSymbols: async (groupId?: string) => {
        try {
          const response = await tradingService.getTrendingSymbols(groupId);
          if (response.success && response.data) {
            set({ trendingSymbols: response.data });
          }
        } catch (error) {
          console.error('Failed to fetch trending symbols:', error);
        }
      },

      // Market Data
      fetchMarketQuotes: async (symbols: string[]) => {
        try {
          const response = await tradingService.getMarketQuotes(symbols);
          if (response.success && response.data) {
            const quotes: Record<string, MarketQuote> = {};
            response.data.forEach(quote => {
              quotes[quote.symbol] = quote;
            });
            set(state => ({
              marketQuotes: {
                ...state.marketQuotes,
                ...quotes,
              },
            }));
          }
        } catch (error) {
          console.error('Failed to fetch market quotes:', error);
        }
      },

      updateMarketPrices: async (quotes: MarketQuote[]) => {
        try {
          const response = await tradingService.updateMarketPrices(quotes);
          if (response.success) {
            const quotesMap: Record<string, MarketQuote> = {};
            quotes.forEach(quote => {
              quotesMap[quote.symbol] = quote;
            });
            set(state => ({
              marketQuotes: {
                ...state.marketQuotes,
                ...quotesMap,
              },
            }));
          }
        } catch (error) {
          console.error('Failed to update market prices:', error);
        }
      },

      addToWatchlist: (symbol: string) => {
        set(state => ({
          watchlist: state.watchlist.includes(symbol)
            ? state.watchlist
            : [...state.watchlist, symbol],
        }));
      },

      removeFromWatchlist: (symbol: string) => {
        set(state => ({
          watchlist: state.watchlist.filter(s => s !== symbol),
        }));
      },

      // Search
      searchTradeIdeas: async (query: string, filters?: any) => {
        set({ isLoading: true, error: null });

        try {
          const response = await tradingService.searchTradeIdeas(query, filters);
          if (response.success && response.data) {
            set({
              tradeIdeas: response.data,
              isLoading: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Search failed',
            });
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Search failed',
          });
        }
      },

      searchSymbols: async (query: string) => {
        return tradingService.searchSymbols(query);
      },

      // Utility Actions
      clearError: () => {
        set({ error: null });
      },

      clearSelection: () => {
        set({
          selectedTradeIdea: null,
          selectedPosition: null,
        });
      },

      setActiveTab: (tab: 'ideas' | 'positions' | 'portfolio') => {
        set({ activeTab: tab });
      },

      setSelectedGroup: (groupId: string | null) => {
        set({ selectedGroupId: groupId });
      },

      refreshTradingData: async () => {
        const state = get();
        const promises: Promise<void>[] = [];

        if (state.selectedGroupId) {
          promises.push(
            state.fetchTradeIdeas({ groupId: state.selectedGroupId }),
            state.fetchPaperPositions({ groupId: state.selectedGroupId }),
            state.fetchGroupStats(state.selectedGroupId),
            state.fetchTrendingSymbols(state.selectedGroupId)
          );
        }

        if (state.watchlist.length > 0) {
          promises.push(state.fetchMarketQuotes(state.watchlist));
        }

        await Promise.all(promises);
      },
    }),
    {
      name: 'trading-storage',
      partialize: (state) => ({
        watchlist: state.watchlist,
        activeTab: state.activeTab,
        selectedGroupId: state.selectedGroupId,
      }),
    }
  )
);