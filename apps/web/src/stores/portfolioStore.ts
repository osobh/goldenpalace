import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  portfolioService,
  type Portfolio,
  type Asset,
  type CreatePortfolioRequest,
  type UpdatePortfolioRequest,
  type AddAssetRequest,
  type PortfolioPerformance,
  type RiskMetrics,
} from '../services/portfolio.service';
import type { ApiResponse } from '../services/api';

interface PortfolioState {
  // Data
  portfolios: Portfolio[];
  selectedPortfolio: Portfolio | null;
  selectedPortfolioAssets: Asset[];
  performance: PortfolioPerformance | null;
  riskMetrics: RiskMetrics | null;

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPortfolios: () => Promise<void>;
  selectPortfolio: (id: string) => Promise<void>;
  createPortfolio: (data: CreatePortfolioRequest) => Promise<ApiResponse<Portfolio>>;
  updatePortfolio: (id: string, data: UpdatePortfolioRequest) => Promise<ApiResponse<Portfolio>>;
  deletePortfolio: (id: string) => Promise<ApiResponse<{ message: string }>>;
  addAssetToPortfolio: (portfolioId: string, data: AddAssetRequest) => Promise<ApiResponse<Asset>>;
  removeAssetFromPortfolio: (portfolioId: string, assetId: string) => Promise<ApiResponse<{ message: string }>>;
  fetchPortfolioAssets: (portfolioId: string) => Promise<void>;
  fetchPortfolioPerformance: (portfolioId: string, timeRange?: string) => Promise<void>;
  fetchPortfolioRiskMetrics: (portfolioId: string) => Promise<void>;
  rebalancePortfolio: (portfolioId: string, targetAllocations: Record<string, number>) => Promise<ApiResponse<Portfolio>>;
  clonePortfolio: (portfolioId: string, newName: string) => Promise<ApiResponse<Portfolio>>;
  sharePortfolio: (portfolioId: string, isPublic: boolean) => Promise<ApiResponse<{ shareUrl?: string }>>;

  // Utility actions
  clearError: () => void;
  clearSelection: () => void;
  refreshPortfolioData: (portfolioId: string) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      // Initial state
      portfolios: [],
      selectedPortfolio: null,
      selectedPortfolioAssets: [],
      performance: null,
      riskMetrics: null,
      isLoading: false,
      error: null,

      // Fetch all portfolios
      fetchPortfolios: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await portfolioService.getPortfolios();

          if (response.success && response.data) {
            set({
              portfolios: response.data,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              portfolios: [],
              isLoading: false,
              error: response.error || 'Failed to fetch portfolios',
            });
          }
        } catch (error) {
          set({
            portfolios: [],
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch portfolios',
          });
        }
      },

      // Select and fetch detailed portfolio data
      selectPortfolio: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await portfolioService.getPortfolio(id);

          if (response.success && response.data) {
            set({
              selectedPortfolio: response.data,
              selectedPortfolioAssets: response.data.assets || [],
              isLoading: false,
              error: null,
            });
          } else {
            set({
              selectedPortfolio: null,
              selectedPortfolioAssets: [],
              isLoading: false,
              error: response.error || 'Failed to fetch portfolio',
            });
          }
        } catch (error) {
          set({
            selectedPortfolio: null,
            selectedPortfolioAssets: [],
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch portfolio',
          });
        }
      },

      // Create new portfolio
      createPortfolio: async (data: CreatePortfolioRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await portfolioService.createPortfolio(data);

          if (response.success && response.data) {
            const currentPortfolios = get().portfolios;
            set({
              portfolios: [...currentPortfolios, response.data],
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to create portfolio',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create portfolio';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      // Update existing portfolio
      updatePortfolio: async (id: string, data: UpdatePortfolioRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await portfolioService.updatePortfolio(id, data);

          if (response.success && response.data) {
            const currentPortfolios = get().portfolios;
            const updatedPortfolios = currentPortfolios.map(portfolio =>
              portfolio.id === id ? response.data! : portfolio
            );

            const currentSelected = get().selectedPortfolio;
            const updatedSelected = currentSelected?.id === id ? response.data : currentSelected;

            set({
              portfolios: updatedPortfolios,
              selectedPortfolio: updatedSelected,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to update portfolio',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update portfolio';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      // Delete portfolio
      deletePortfolio: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await portfolioService.deletePortfolio(id);

          if (response.success) {
            const currentPortfolios = get().portfolios;
            const updatedPortfolios = currentPortfolios.filter(portfolio => portfolio.id !== id);

            const currentSelected = get().selectedPortfolio;
            const updatedSelected = currentSelected?.id === id ? null : currentSelected;

            set({
              portfolios: updatedPortfolios,
              selectedPortfolio: updatedSelected,
              selectedPortfolioAssets: updatedSelected ? get().selectedPortfolioAssets : [],
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to delete portfolio',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete portfolio';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      // Add asset to portfolio
      addAssetToPortfolio: async (portfolioId: string, data: AddAssetRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await portfolioService.addAssetToPortfolio(portfolioId, data);

          if (response.success && response.data) {
            // Refresh portfolio data to get updated totals
            await get().refreshPortfolioData(portfolioId);
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to add asset',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add asset';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      // Remove asset from portfolio
      removeAssetFromPortfolio: async (portfolioId: string, assetId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await portfolioService.removeAssetFromPortfolio(portfolioId, assetId);

          if (response.success) {
            // Refresh portfolio data to get updated totals
            await get().refreshPortfolioData(portfolioId);
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to remove asset',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to remove asset';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      // Fetch portfolio assets
      fetchPortfolioAssets: async (portfolioId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await portfolioService.getPortfolioAssets(portfolioId);

          if (response.success && response.data) {
            set({
              selectedPortfolioAssets: response.data,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              selectedPortfolioAssets: [],
              isLoading: false,
              error: response.error || 'Failed to fetch assets',
            });
          }
        } catch (error) {
          set({
            selectedPortfolioAssets: [],
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch assets',
          });
        }
      },

      // Fetch portfolio performance
      fetchPortfolioPerformance: async (portfolioId: string, timeRange: string = '1M') => {
        set({ isLoading: true, error: null });

        try {
          const response = await portfolioService.getPortfolioPerformance(portfolioId, timeRange);

          if (response.success && response.data) {
            set({
              performance: response.data,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              performance: null,
              isLoading: false,
              error: response.error || 'Failed to fetch performance data',
            });
          }
        } catch (error) {
          set({
            performance: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch performance data',
          });
        }
      },

      // Fetch portfolio risk metrics
      fetchPortfolioRiskMetrics: async (portfolioId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await portfolioService.getPortfolioRiskMetrics(portfolioId);

          if (response.success && response.data) {
            set({
              riskMetrics: response.data,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              riskMetrics: null,
              isLoading: false,
              error: response.error || 'Failed to fetch risk metrics',
            });
          }
        } catch (error) {
          set({
            riskMetrics: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch risk metrics',
          });
        }
      },

      // Rebalance portfolio
      rebalancePortfolio: async (portfolioId: string, targetAllocations: Record<string, number>) => {
        set({ isLoading: true, error: null });

        try {
          const response = await portfolioService.rebalancePortfolio(portfolioId, targetAllocations);

          if (response.success && response.data) {
            // Refresh portfolio data
            await get().refreshPortfolioData(portfolioId);
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to rebalance portfolio',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to rebalance portfolio';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      // Clone portfolio
      clonePortfolio: async (portfolioId: string, newName: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await portfolioService.clonePortfolio(portfolioId, newName);

          if (response.success && response.data) {
            const currentPortfolios = get().portfolios;
            set({
              portfolios: [...currentPortfolios, response.data],
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to clone portfolio',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to clone portfolio';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      // Share portfolio
      sharePortfolio: async (portfolioId: string, isPublic: boolean) => {
        set({ isLoading: true, error: null });

        try {
          const response = await portfolioService.sharePortfolio(portfolioId, isPublic);

          if (response.success) {
            // Update portfolio in the list
            const currentPortfolios = get().portfolios;
            const updatedPortfolios = currentPortfolios.map(portfolio =>
              portfolio.id === portfolioId ? { ...portfolio, isPublic } : portfolio
            );

            const currentSelected = get().selectedPortfolio;
            const updatedSelected = currentSelected?.id === portfolioId
              ? { ...currentSelected, isPublic }
              : currentSelected;

            set({
              portfolios: updatedPortfolios,
              selectedPortfolio: updatedSelected,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to update portfolio sharing',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update portfolio sharing';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      // Utility actions
      clearError: () => {
        set({ error: null });
      },

      clearSelection: () => {
        set({
          selectedPortfolio: null,
          selectedPortfolioAssets: [],
          performance: null,
          riskMetrics: null,
        });
      },

      // Refresh complete portfolio data
      refreshPortfolioData: async (portfolioId: string) => {
        await get().selectPortfolio(portfolioId);
        await get().fetchPortfolios(); // Refresh the list as well
      },
    }),
    {
      name: 'portfolio-storage',
      partialize: (state) => ({
        // Only persist portfolios list, not selected data
        portfolios: state.portfolios,
      }),
    }
  )
);