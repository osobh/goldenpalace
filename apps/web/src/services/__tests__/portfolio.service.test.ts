import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortfolioService } from '../portfolio.service';
import { apiClient } from '../api';

// Mock the API client
vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('PortfolioService', () => {
  let portfolioService: PortfolioService;

  beforeEach(() => {
    portfolioService = new PortfolioService();
    vi.clearAllMocks();
  });

  describe('getPortfolios', () => {
    it('should fetch all portfolios for current user', async () => {
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
          status: 'ACTIVE',
          createdAt: '2023-01-01T00:00:00Z',
          assets: [],
          totalReturn: 2500,
          totalReturnPercentage: 25,
          dayChange: 150,
          dayChangePercentage: 1.2,
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: mockPortfolios,
      });

      const result = await portfolioService.getPortfolios();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPortfolios);
      expect(apiClient.get).toHaveBeenCalledWith('/portfolio');
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        success: false,
        error: 'Failed to fetch portfolios',
      });

      const result = await portfolioService.getPortfolios();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch portfolios');
    });
  });

  describe('getPortfolio', () => {
    it('should fetch single portfolio with detailed information', async () => {
      const portfolioId = 'portfolio-1';
      const mockPortfolio = {
        id: portfolioId,
        name: 'Growth Portfolio',
        description: 'High growth potential stocks',
        initialBalance: 50000,
        currentBalance: 45000,
        totalValue: 65000,
        currency: 'USD',
        isPublic: true,
        status: 'ACTIVE',
        createdAt: '2023-01-01T00:00:00Z',
        assets: [
          {
            id: 'asset-1',
            symbol: 'AAPL',
            name: 'Apple Inc',
            type: 'STOCK',
            quantity: 50,
            averagePrice: 150,
            currentPrice: 180,
            totalValue: 9000,
            costBasis: 7500,
            unrealizedPnl: 1500,
            realizedPnl: 0,
            percentageGain: 20,
            allocation: 13.8,
            currency: 'USD',
          },
        ],
        totalReturn: 15000,
        totalReturnPercentage: 30,
        dayChange: -500,
        dayChangePercentage: -0.76,
        riskMetrics: {
          sharpeRatio: 1.25,
          volatility: 18.5,
          beta: 1.1,
          maxDrawdown: 12.3,
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: mockPortfolio,
      });

      const result = await portfolioService.getPortfolio(portfolioId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPortfolio);
      expect(apiClient.get).toHaveBeenCalledWith(`/portfolio/${portfolioId}`);
    });

    it('should return error for non-existent portfolio', async () => {
      const portfolioId = 'non-existent';

      vi.mocked(apiClient.get).mockResolvedValue({
        success: false,
        error: 'Portfolio not found',
      });

      const result = await portfolioService.getPortfolio(portfolioId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Portfolio not found');
    });
  });

  describe('createPortfolio', () => {
    it('should create new portfolio with valid data', async () => {
      const portfolioData = {
        name: 'New Portfolio',
        description: 'A test portfolio',
        initialBalance: 25000,
        currency: 'USD',
        isPublic: false,
      };

      const mockCreatedPortfolio = {
        id: 'new-portfolio-id',
        ...portfolioData,
        currentBalance: 25000,
        totalValue: 25000,
        status: 'ACTIVE',
        createdAt: '2023-12-01T00:00:00Z',
        assets: [],
        totalReturn: 0,
        totalReturnPercentage: 0,
        dayChange: 0,
        dayChangePercentage: 0,
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        success: true,
        data: mockCreatedPortfolio,
      });

      const result = await portfolioService.createPortfolio(portfolioData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedPortfolio);
      expect(apiClient.post).toHaveBeenCalledWith('/portfolio', portfolioData);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        initialBalance: -1000, // Invalid: negative balance
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        success: false,
        error: 'Validation failed: name is required, initialBalance must be positive',
      });

      const result = await portfolioService.createPortfolio(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('updatePortfolio', () => {
    it('should update portfolio with new data', async () => {
      const portfolioId = 'portfolio-1';
      const updateData = {
        name: 'Updated Portfolio Name',
        description: 'Updated description',
        isPublic: true,
      };

      const mockUpdatedPortfolio = {
        id: portfolioId,
        ...updateData,
        initialBalance: 10000,
        currentBalance: 12000,
        totalValue: 14000,
        currency: 'USD',
        status: 'ACTIVE',
        createdAt: '2023-01-01T00:00:00Z',
        assets: [],
        totalReturn: 2000,
        totalReturnPercentage: 20,
        dayChange: 100,
        dayChangePercentage: 0.83,
      };

      vi.mocked(apiClient.put).mockResolvedValue({
        success: true,
        data: mockUpdatedPortfolio,
      });

      const result = await portfolioService.updatePortfolio(portfolioId, updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedPortfolio);
      expect(apiClient.put).toHaveBeenCalledWith(`/portfolio/${portfolioId}`, updateData);
    });
  });

  describe('deletePortfolio', () => {
    it('should delete portfolio successfully', async () => {
      const portfolioId = 'portfolio-to-delete';

      vi.mocked(apiClient.delete).mockResolvedValue({
        success: true,
        data: { message: 'Portfolio deleted successfully' },
      });

      const result = await portfolioService.deletePortfolio(portfolioId);

      expect(result.success).toBe(true);
      expect(apiClient.delete).toHaveBeenCalledWith(`/portfolio/${portfolioId}`);
    });

    it('should handle deletion of non-existent portfolio', async () => {
      const portfolioId = 'non-existent';

      vi.mocked(apiClient.delete).mockResolvedValue({
        success: false,
        error: 'Portfolio not found',
      });

      const result = await portfolioService.deletePortfolio(portfolioId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Portfolio not found');
    });
  });

  describe('getPortfolioAssets', () => {
    it('should fetch assets for specific portfolio', async () => {
      const portfolioId = 'portfolio-1';
      const mockAssets = [
        {
          id: 'asset-1',
          symbol: 'AAPL',
          name: 'Apple Inc',
          type: 'STOCK',
          quantity: 100,
          averagePrice: 150,
          currentPrice: 180,
          totalValue: 18000,
          costBasis: 15000,
          unrealizedPnl: 3000,
          realizedPnl: 0,
          percentageGain: 20,
          allocation: 45,
          currency: 'USD',
        },
        {
          id: 'asset-2',
          symbol: 'GOOGL',
          name: 'Alphabet Inc',
          type: 'STOCK',
          quantity: 25,
          averagePrice: 2000,
          currentPrice: 2200,
          totalValue: 55000,
          costBasis: 50000,
          unrealizedPnl: 5000,
          realizedPnl: 0,
          percentageGain: 10,
          allocation: 55,
          currency: 'USD',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: mockAssets,
      });

      const result = await portfolioService.getPortfolioAssets(portfolioId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAssets);
      expect(apiClient.get).toHaveBeenCalledWith(`/portfolio/${portfolioId}/assets`);
    });
  });

  describe('addAssetToPortfolio', () => {
    it('should add new asset to portfolio', async () => {
      const portfolioId = 'portfolio-1';
      const assetData = {
        symbol: 'MSFT',
        quantity: 50,
        purchasePrice: 300,
      };

      const mockAddedAsset = {
        id: 'new-asset-id',
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        type: 'STOCK',
        quantity: 50,
        averagePrice: 300,
        currentPrice: 320,
        totalValue: 16000,
        costBasis: 15000,
        unrealizedPnl: 1000,
        realizedPnl: 0,
        percentageGain: 6.67,
        allocation: 25,
        currency: 'USD',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        success: true,
        data: mockAddedAsset,
      });

      const result = await portfolioService.addAssetToPortfolio(portfolioId, assetData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAddedAsset);
      expect(apiClient.post).toHaveBeenCalledWith(`/portfolio/${portfolioId}/assets`, assetData);
    });
  });

  describe('getPortfolioPerformance', () => {
    it('should fetch performance metrics for portfolio', async () => {
      const portfolioId = 'portfolio-1';
      const timeRange = '1M';

      const mockPerformance = {
        totalReturn: 5000,
        totalReturnPercentage: 25,
        annualizedReturn: 28.5,
        volatility: 16.2,
        sharpeRatio: 1.75,
        maxDrawdown: 8.5,
        winRate: 65,
        bestTrade: 1500,
        worstTrade: -500,
        averageHoldingPeriod: 45,
        historicalData: [
          { date: '2023-01-01', value: 20000 },
          { date: '2023-01-02', value: 20150 },
          { date: '2023-01-03', value: 19950 },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: mockPerformance,
      });

      const result = await portfolioService.getPortfolioPerformance(portfolioId, timeRange);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPerformance);
      expect(apiClient.get).toHaveBeenCalledWith(`/portfolio/${portfolioId}/performance?timeRange=${timeRange}`);
    });
  });
});