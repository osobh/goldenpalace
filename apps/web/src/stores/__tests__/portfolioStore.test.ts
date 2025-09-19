import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePortfolioStore } from '../portfolioStore';
import { portfolioService } from '../../services/portfolio.service';

// Mock the portfolio service
vi.mock('../../services/portfolio.service', () => ({
  portfolioService: {
    getPortfolios: vi.fn(),
    getPortfolio: vi.fn(),
    createPortfolio: vi.fn(),
    updatePortfolio: vi.fn(),
    deletePortfolio: vi.fn(),
    getPortfolioAssets: vi.fn(),
    addAssetToPortfolio: vi.fn(),
    getPortfolioPerformance: vi.fn(),
    getPortfolioRiskMetrics: vi.fn(),
  },
}));

describe('PortfolioStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    usePortfolioStore.setState({
      portfolios: [],
      selectedPortfolio: null,
      selectedPortfolioAssets: [],
      isLoading: false,
      error: null,
      performance: null,
      riskMetrics: null,
    });
    vi.clearAllMocks();
  });

  describe('fetchPortfolios', () => {
    it('should load portfolios successfully', async () => {
      const mockPortfolios = [
        {
          id: '1',
          name: 'Tech Portfolio',
          description: 'Technology stocks',
          initialBalance: 10000,
          currentBalance: 12500,
          totalValue: 15000,
          currency: 'USD',
          isPublic: false,
          status: 'ACTIVE' as const,
          createdAt: '2023-01-01T00:00:00Z',
          assets: [],
          totalReturn: 2500,
          totalReturnPercentage: 25,
          dayChange: 150,
          dayChangePercentage: 1.2,
        },
      ];

      vi.mocked(portfolioService.getPortfolios).mockResolvedValue({
        success: true,
        data: mockPortfolios,
      });

      const store = usePortfolioStore.getState();

      expect(store.isLoading).toBe(false);

      await store.fetchPortfolios();

      const updatedStore = usePortfolioStore.getState();
      expect(updatedStore.portfolios).toEqual(mockPortfolios);
      expect(updatedStore.isLoading).toBe(false);
      expect(updatedStore.error).toBe(null);
    });

    it('should handle fetch portfolios error', async () => {
      vi.mocked(portfolioService.getPortfolios).mockResolvedValue({
        success: false,
        error: 'Failed to fetch portfolios',
      });

      const store = usePortfolioStore.getState();
      await store.fetchPortfolios();

      const updatedStore = usePortfolioStore.getState();
      expect(updatedStore.portfolios).toEqual([]);
      expect(updatedStore.error).toBe('Failed to fetch portfolios');
      expect(updatedStore.isLoading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      vi.mocked(portfolioService.getPortfolios).mockReturnValue(promise);

      const store = usePortfolioStore.getState();
      const fetchPromise = store.fetchPortfolios();

      // Check loading state is set
      const loadingStore = usePortfolioStore.getState();
      expect(loadingStore.isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!({ success: true, data: [] });
      await fetchPromise;

      // Check loading state is cleared
      const finalStore = usePortfolioStore.getState();
      expect(finalStore.isLoading).toBe(false);
    });
  });

  describe('selectPortfolio', () => {
    it('should select and fetch portfolio details', async () => {
      const portfolioId = 'portfolio-1';
      const mockPortfolio = {
        id: portfolioId,
        name: 'Selected Portfolio',
        description: 'A test portfolio',
        initialBalance: 20000,
        currentBalance: 22000,
        totalValue: 25000,
        currency: 'USD',
        isPublic: true,
        status: 'ACTIVE' as const,
        createdAt: '2023-01-01T00:00:00Z',
        assets: [
          {
            id: 'asset-1',
            symbol: 'AAPL',
            name: 'Apple Inc',
            type: 'STOCK' as const,
            quantity: 50,
            averagePrice: 150,
            currentPrice: 180,
            totalValue: 9000,
            costBasis: 7500,
            unrealizedPnl: 1500,
            realizedPnl: 0,
            percentageGain: 20,
            allocation: 36,
            currency: 'USD',
          },
        ],
        totalReturn: 3000,
        totalReturnPercentage: 15,
        dayChange: 200,
        dayChangePercentage: 0.8,
      };

      vi.mocked(portfolioService.getPortfolio).mockResolvedValue({
        success: true,
        data: mockPortfolio,
      });

      const store = usePortfolioStore.getState();
      await store.selectPortfolio(portfolioId);

      const updatedStore = usePortfolioStore.getState();
      expect(updatedStore.selectedPortfolio).toEqual(mockPortfolio);
      expect(updatedStore.selectedPortfolioAssets).toEqual(mockPortfolio.assets);
      expect(portfolioService.getPortfolio).toHaveBeenCalledWith(portfolioId);
    });

    it('should handle portfolio selection error', async () => {
      const portfolioId = 'non-existent';

      vi.mocked(portfolioService.getPortfolio).mockResolvedValue({
        success: false,
        error: 'Portfolio not found',
      });

      const store = usePortfolioStore.getState();
      await store.selectPortfolio(portfolioId);

      const updatedStore = usePortfolioStore.getState();
      expect(updatedStore.selectedPortfolio).toBe(null);
      expect(updatedStore.error).toBe('Portfolio not found');
    });
  });

  describe('createPortfolio', () => {
    it('should create new portfolio and add to list', async () => {
      const portfolioData = {
        name: 'New Portfolio',
        description: 'A new test portfolio',
        initialBalance: 50000,
        currency: 'USD',
        isPublic: false,
      };

      const mockCreatedPortfolio = {
        id: 'new-portfolio-id',
        ...portfolioData,
        currentBalance: 50000,
        totalValue: 50000,
        status: 'ACTIVE' as const,
        createdAt: '2023-12-01T00:00:00Z',
        assets: [],
        totalReturn: 0,
        totalReturnPercentage: 0,
        dayChange: 0,
        dayChangePercentage: 0,
      };

      vi.mocked(portfolioService.createPortfolio).mockResolvedValue({
        success: true,
        data: mockCreatedPortfolio,
      });

      const store = usePortfolioStore.getState();
      const result = await store.createPortfolio(portfolioData);

      expect(result.success).toBe(true);
      const updatedStore = usePortfolioStore.getState();
      expect(updatedStore.portfolios).toContain(mockCreatedPortfolio);
      expect(portfolioService.createPortfolio).toHaveBeenCalledWith(portfolioData);
    });

    it('should handle create portfolio validation error', async () => {
      const invalidData = {
        name: '',
        initialBalance: -1000,
        currency: 'USD',
        isPublic: false,
      };

      vi.mocked(portfolioService.createPortfolio).mockResolvedValue({
        success: false,
        error: 'Validation failed: name is required',
      });

      const store = usePortfolioStore.getState();
      const result = await store.createPortfolio(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed: name is required');
      const updatedStore = usePortfolioStore.getState();
      expect(updatedStore.portfolios).toEqual([]);
    });
  });

  describe('updatePortfolio', () => {
    it('should update existing portfolio in list', async () => {
      const portfolioId = 'portfolio-1';
      const existingPortfolio = {
        id: portfolioId,
        name: 'Old Name',
        description: 'Old description',
        initialBalance: 10000,
        currentBalance: 12000,
        totalValue: 14000,
        currency: 'USD',
        isPublic: false,
        status: 'ACTIVE' as const,
        createdAt: '2023-01-01T00:00:00Z',
        assets: [],
        totalReturn: 2000,
        totalReturnPercentage: 20,
        dayChange: 100,
        dayChangePercentage: 0.83,
      };

      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        isPublic: true,
      };

      const mockUpdatedPortfolio = {
        ...existingPortfolio,
        ...updateData,
      };

      // Set initial state
      usePortfolioStore.setState({
        portfolios: [existingPortfolio],
        selectedPortfolio: existingPortfolio,
      });

      vi.mocked(portfolioService.updatePortfolio).mockResolvedValue({
        success: true,
        data: mockUpdatedPortfolio,
      });

      const store = usePortfolioStore.getState();
      const result = await store.updatePortfolio(portfolioId, updateData);

      expect(result.success).toBe(true);
      const updatedStore = usePortfolioStore.getState();
      expect(updatedStore.portfolios[0]).toEqual(mockUpdatedPortfolio);
      expect(updatedStore.selectedPortfolio).toEqual(mockUpdatedPortfolio);
    });
  });

  describe('deletePortfolio', () => {
    it('should remove portfolio from list', async () => {
      const portfolioToDelete = {
        id: 'portfolio-to-delete',
        name: 'Portfolio to Delete',
        description: 'Will be deleted',
        initialBalance: 5000,
        currentBalance: 5500,
        totalValue: 6000,
        currency: 'USD',
        isPublic: false,
        status: 'ACTIVE' as const,
        createdAt: '2023-01-01T00:00:00Z',
        assets: [],
        totalReturn: 500,
        totalReturnPercentage: 10,
        dayChange: 50,
        dayChangePercentage: 0.91,
      };

      const otherPortfolio = {
        id: 'other-portfolio',
        name: 'Other Portfolio',
        description: 'Should remain',
        initialBalance: 15000,
        currentBalance: 16000,
        totalValue: 17000,
        currency: 'USD',
        isPublic: true,
        status: 'ACTIVE' as const,
        createdAt: '2023-01-01T00:00:00Z',
        assets: [],
        totalReturn: 1000,
        totalReturnPercentage: 6.67,
        dayChange: 100,
        dayChangePercentage: 0.62,
      };

      // Set initial state
      usePortfolioStore.setState({
        portfolios: [portfolioToDelete, otherPortfolio],
        selectedPortfolio: portfolioToDelete,
      });

      vi.mocked(portfolioService.deletePortfolio).mockResolvedValue({
        success: true,
        data: { message: 'Portfolio deleted successfully' },
      });

      const store = usePortfolioStore.getState();
      const result = await store.deletePortfolio(portfolioToDelete.id);

      expect(result.success).toBe(true);
      const updatedStore = usePortfolioStore.getState();
      expect(updatedStore.portfolios).toEqual([otherPortfolio]);
      expect(updatedStore.selectedPortfolio).toBe(null);
    });
  });

  describe('addAssetToPortfolio', () => {
    it('should add asset to portfolio and update assets list', async () => {
      const portfolioId = 'portfolio-1';
      const assetData = {
        symbol: 'TSLA',
        quantity: 25,
        purchasePrice: 800,
      };

      const mockAddedAsset = {
        id: 'new-asset-id',
        symbol: 'TSLA',
        name: 'Tesla Inc',
        type: 'STOCK' as const,
        quantity: 25,
        averagePrice: 800,
        currentPrice: 850,
        totalValue: 21250,
        costBasis: 20000,
        unrealizedPnl: 1250,
        realizedPnl: 0,
        percentageGain: 6.25,
        allocation: 35,
        currency: 'USD',
      };

      vi.mocked(portfolioService.addAssetToPortfolio).mockResolvedValue({
        success: true,
        data: mockAddedAsset,
      });

      const store = usePortfolioStore.getState();
      const result = await store.addAssetToPortfolio(portfolioId, assetData);

      expect(result.success).toBe(true);
      expect(portfolioService.addAssetToPortfolio).toHaveBeenCalledWith(portfolioId, assetData);
    });
  });

  describe('fetchPortfolioPerformance', () => {
    it('should load portfolio performance data', async () => {
      const portfolioId = 'portfolio-1';
      const timeRange = '3M';

      const mockPerformance = {
        totalReturn: 8000,
        totalReturnPercentage: 40,
        annualizedReturn: 35.5,
        volatility: 18.2,
        sharpeRatio: 1.95,
        maxDrawdown: 12.5,
        winRate: 72,
        bestTrade: 2500,
        worstTrade: -800,
        averageHoldingPeriod: 60,
        historicalData: [
          { date: '2023-01-01', value: 20000 },
          { date: '2023-02-01', value: 22000 },
          { date: '2023-03-01', value: 28000 },
        ],
      };

      vi.mocked(portfolioService.getPortfolioPerformance).mockResolvedValue({
        success: true,
        data: mockPerformance,
      });

      const store = usePortfolioStore.getState();
      await store.fetchPortfolioPerformance(portfolioId, timeRange);

      const updatedStore = usePortfolioStore.getState();
      expect(updatedStore.performance).toEqual(mockPerformance);
      expect(portfolioService.getPortfolioPerformance).toHaveBeenCalledWith(portfolioId, timeRange);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      usePortfolioStore.setState({ error: 'Some error' });

      const store = usePortfolioStore.getState();
      store.clearError();

      const updatedStore = usePortfolioStore.getState();
      expect(updatedStore.error).toBe(null);
    });
  });

  describe('clearSelection', () => {
    it('should clear selected portfolio and related data', () => {
      const mockPortfolio = {
        id: 'portfolio-1',
        name: 'Test Portfolio',
        description: 'Test',
        initialBalance: 10000,
        currentBalance: 12000,
        totalValue: 14000,
        currency: 'USD',
        isPublic: false,
        status: 'ACTIVE' as const,
        createdAt: '2023-01-01T00:00:00Z',
        assets: [],
        totalReturn: 2000,
        totalReturnPercentage: 20,
        dayChange: 100,
        dayChangePercentage: 0.83,
      };

      usePortfolioStore.setState({
        selectedPortfolio: mockPortfolio,
        selectedPortfolioAssets: [/* some assets */],
        performance: {/* some performance data */} as any,
        riskMetrics: {/* some risk data */} as any,
      });

      const store = usePortfolioStore.getState();
      store.clearSelection();

      const updatedStore = usePortfolioStore.getState();
      expect(updatedStore.selectedPortfolio).toBe(null);
      expect(updatedStore.selectedPortfolioAssets).toEqual([]);
      expect(updatedStore.performance).toBe(null);
      expect(updatedStore.riskMetrics).toBe(null);
    });
  });
});