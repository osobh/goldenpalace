import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortfolioList } from '../PortfolioList';
import { usePortfolioStore } from '../../../stores/portfolioStore';
import type { Portfolio } from '../../../services/portfolio.service';

// Mock the portfolio store
vi.mock('../../../stores/portfolioStore', () => ({
  usePortfolioStore: vi.fn(),
}));

const mockPortfolios: Portfolio[] = [
  {
    id: 'portfolio-1',
    name: 'Tech Portfolio',
    description: 'Technology stocks portfolio',
    initialBalance: 50000,
    currentBalance: 48000,
    totalValue: 65000,
    currency: 'USD',
    isPublic: false,
    status: 'ACTIVE',
    createdAt: '2023-01-01T00:00:00Z',
    assets: [],
    totalReturn: 15000,
    totalReturnPercentage: 30,
    dayChange: 500,
    dayChangePercentage: 0.77,
  },
  {
    id: 'portfolio-2',
    name: 'Conservative Portfolio',
    description: 'Low-risk bond portfolio',
    initialBalance: 25000,
    currentBalance: 24500,
    totalValue: 26500,
    currency: 'USD',
    isPublic: true,
    status: 'ACTIVE',
    createdAt: '2023-02-15T00:00:00Z',
    assets: [],
    totalReturn: 1500,
    totalReturnPercentage: 6,
    dayChange: -50,
    dayChangePercentage: -0.19,
  },
];

describe('PortfolioList', () => {
  const mockFetchPortfolios = vi.fn();
  const mockSelectPortfolio = vi.fn();
  const mockClearError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(usePortfolioStore).mockReturnValue({
      portfolios: mockPortfolios,
      isLoading: false,
      error: null,
      fetchPortfolios: mockFetchPortfolios,
      selectPortfolio: mockSelectPortfolio,
      clearError: mockClearError,
      selectedPortfolio: null,
      selectedPortfolioAssets: [],
      performance: null,
      riskMetrics: null,
      createPortfolio: vi.fn(),
      updatePortfolio: vi.fn(),
      deletePortfolio: vi.fn(),
      addAssetToPortfolio: vi.fn(),
      removeAssetFromPortfolio: vi.fn(),
      fetchPortfolioAssets: vi.fn(),
      fetchPortfolioPerformance: vi.fn(),
      fetchPortfolioRiskMetrics: vi.fn(),
      rebalancePortfolio: vi.fn(),
      clonePortfolio: vi.fn(),
      sharePortfolio: vi.fn(),
      clearSelection: vi.fn(),
      refreshPortfolioData: vi.fn(),
    });
  });

  it('should render list of portfolios', () => {
    render(<PortfolioList />);

    expect(screen.getByText('Tech Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Conservative Portfolio')).toBeInTheDocument();
  });

  it('should fetch portfolios on component mount', () => {
    render(<PortfolioList />);

    expect(mockFetchPortfolios).toHaveBeenCalledOnce();
  });

  it('should display loading state while fetching portfolios', () => {
    vi.mocked(usePortfolioStore).mockReturnValue({
      portfolios: [],
      isLoading: true,
      error: null,
      fetchPortfolios: mockFetchPortfolios,
      selectPortfolio: mockSelectPortfolio,
      clearError: mockClearError,
      selectedPortfolio: null,
      selectedPortfolioAssets: [],
      performance: null,
      riskMetrics: null,
      createPortfolio: vi.fn(),
      updatePortfolio: vi.fn(),
      deletePortfolio: vi.fn(),
      addAssetToPortfolio: vi.fn(),
      removeAssetFromPortfolio: vi.fn(),
      fetchPortfolioAssets: vi.fn(),
      fetchPortfolioPerformance: vi.fn(),
      fetchPortfolioRiskMetrics: vi.fn(),
      rebalancePortfolio: vi.fn(),
      clonePortfolio: vi.fn(),
      sharePortfolio: vi.fn(),
      clearSelection: vi.fn(),
      refreshPortfolioData: vi.fn(),
    });

    render(<PortfolioList />);

    expect(screen.getByText('Loading portfolios...')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading portfolios')).toBeInTheDocument();
  });

  it('should display error message when fetch fails', () => {
    const errorMessage = 'Failed to load portfolios';

    vi.mocked(usePortfolioStore).mockReturnValue({
      portfolios: [],
      isLoading: false,
      error: errorMessage,
      fetchPortfolios: mockFetchPortfolios,
      selectPortfolio: mockSelectPortfolio,
      clearError: mockClearError,
      selectedPortfolio: null,
      selectedPortfolioAssets: [],
      performance: null,
      riskMetrics: null,
      createPortfolio: vi.fn(),
      updatePortfolio: vi.fn(),
      deletePortfolio: vi.fn(),
      addAssetToPortfolio: vi.fn(),
      removeAssetFromPortfolio: vi.fn(),
      fetchPortfolioAssets: vi.fn(),
      fetchPortfolioPerformance: vi.fn(),
      fetchPortfolioRiskMetrics: vi.fn(),
      rebalancePortfolio: vi.fn(),
      clonePortfolio: vi.fn(),
      sharePortfolio: vi.fn(),
      clearSelection: vi.fn(),
      refreshPortfolioData: vi.fn(),
    });

    render(<PortfolioList />);

    expect(screen.getByText('Error loading portfolios')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should allow retrying after error', async () => {
    const errorMessage = 'Network error';

    vi.mocked(usePortfolioStore).mockReturnValue({
      portfolios: [],
      isLoading: false,
      error: errorMessage,
      fetchPortfolios: mockFetchPortfolios,
      selectPortfolio: mockSelectPortfolio,
      clearError: mockClearError,
      selectedPortfolio: null,
      selectedPortfolioAssets: [],
      performance: null,
      riskMetrics: null,
      createPortfolio: vi.fn(),
      updatePortfolio: vi.fn(),
      deletePortfolio: vi.fn(),
      addAssetToPortfolio: vi.fn(),
      removeAssetFromPortfolio: vi.fn(),
      fetchPortfolioAssets: vi.fn(),
      fetchPortfolioPerformance: vi.fn(),
      fetchPortfolioRiskMetrics: vi.fn(),
      rebalancePortfolio: vi.fn(),
      clonePortfolio: vi.fn(),
      sharePortfolio: vi.fn(),
      clearSelection: vi.fn(),
      refreshPortfolioData: vi.fn(),
    });

    render(<PortfolioList />);

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockClearError).toHaveBeenCalledOnce();
      expect(mockFetchPortfolios).toHaveBeenCalledTimes(2); // Once on mount, once on retry
    });
  });

  it('should display empty state when no portfolios exist', () => {
    vi.mocked(usePortfolioStore).mockReturnValue({
      portfolios: [],
      isLoading: false,
      error: null,
      fetchPortfolios: mockFetchPortfolios,
      selectPortfolio: mockSelectPortfolio,
      clearError: mockClearError,
      selectedPortfolio: null,
      selectedPortfolioAssets: [],
      performance: null,
      riskMetrics: null,
      createPortfolio: vi.fn(),
      updatePortfolio: vi.fn(),
      deletePortfolio: vi.fn(),
      addAssetToPortfolio: vi.fn(),
      removeAssetFromPortfolio: vi.fn(),
      fetchPortfolioAssets: vi.fn(),
      fetchPortfolioPerformance: vi.fn(),
      fetchPortfolioRiskMetrics: vi.fn(),
      rebalancePortfolio: vi.fn(),
      clonePortfolio: vi.fn(),
      sharePortfolio: vi.fn(),
      clearSelection: vi.fn(),
      refreshPortfolioData: vi.fn(),
    });

    render(<PortfolioList />);

    expect(screen.getByText('No portfolios found')).toBeInTheDocument();
    expect(screen.getByText('Create your first portfolio to get started with tracking your investments.')).toBeInTheDocument();
  });

  it('should handle portfolio selection', async () => {
    render(<PortfolioList />);

    const firstPortfolioCard = screen.getByRole('button', { name: /Tech Portfolio/ });
    fireEvent.click(firstPortfolioCard);

    await waitFor(() => {
      expect(mockSelectPortfolio).toHaveBeenCalledWith('portfolio-1');
    });
  });

  it('should display portfolio statistics summary', () => {
    render(<PortfolioList />);

    expect(screen.getByText('2 Portfolios')).toBeInTheDocument();
    expect(screen.getByText('$91,500.00')).toBeInTheDocument(); // Total value of both portfolios
    expect(screen.getByText('+$16,500.00')).toBeInTheDocument(); // Total return
    expect(screen.getByText('+22.00%')).toBeInTheDocument(); // Overall return percentage
  });

  it('should show refresh button', () => {
    render(<PortfolioList />);

    expect(screen.getByLabelText('Refresh portfolios')).toBeInTheDocument();
  });

  it('should refresh portfolios when refresh button is clicked', async () => {
    render(<PortfolioList />);

    const refreshButton = screen.getByLabelText('Refresh portfolios');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockFetchPortfolios).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
    });
  });

  it('should sort portfolios by different criteria', async () => {
    render(<PortfolioList />);

    // Test sort by value (default should be by name)
    const sortSelect = screen.getByLabelText('Sort portfolios by');
    fireEvent.change(sortSelect, { target: { value: 'value' } });

    await waitFor(() => {
      const portfolioCards = screen.getAllByRole('button', { name: /Portfolio/ });
      // Conservative Portfolio should come first (higher value)
      expect(portfolioCards[0]).toHaveTextContent('Tech Portfolio'); // $65,000
      expect(portfolioCards[1]).toHaveTextContent('Conservative Portfolio'); // $26,500
    });
  });

  it('should filter portfolios by status', async () => {
    const portfoliosWithInactive = [
      ...mockPortfolios,
      {
        id: 'portfolio-3',
        name: 'Inactive Portfolio',
        description: 'Closed portfolio',
        initialBalance: 10000,
        currentBalance: 9500,
        totalValue: 9500,
        currency: 'USD',
        isPublic: false,
        status: 'INACTIVE' as const,
        createdAt: '2023-03-01T00:00:00Z',
        assets: [],
        totalReturn: -500,
        totalReturnPercentage: -5,
        dayChange: 0,
        dayChangePercentage: 0,
      },
    ];

    vi.mocked(usePortfolioStore).mockReturnValue({
      portfolios: portfoliosWithInactive,
      isLoading: false,
      error: null,
      fetchPortfolios: mockFetchPortfolios,
      selectPortfolio: mockSelectPortfolio,
      clearError: mockClearError,
      selectedPortfolio: null,
      selectedPortfolioAssets: [],
      performance: null,
      riskMetrics: null,
      createPortfolio: vi.fn(),
      updatePortfolio: vi.fn(),
      deletePortfolio: vi.fn(),
      addAssetToPortfolio: vi.fn(),
      removeAssetFromPortfolio: vi.fn(),
      fetchPortfolioAssets: vi.fn(),
      fetchPortfolioPerformance: vi.fn(),
      fetchPortfolioRiskMetrics: vi.fn(),
      rebalancePortfolio: vi.fn(),
      clonePortfolio: vi.fn(),
      sharePortfolio: vi.fn(),
      clearSelection: vi.fn(),
      refreshPortfolioData: vi.fn(),
    });

    render(<PortfolioList />);

    // Initially should show all portfolios
    expect(screen.getByText('Tech Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Conservative Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Inactive Portfolio')).toBeInTheDocument();

    // Filter to show only active portfolios
    const filterSelect = screen.getByLabelText('Filter by status');
    fireEvent.change(filterSelect, { target: { value: 'ACTIVE' } });

    await waitFor(() => {
      expect(screen.getByText('Tech Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Conservative Portfolio')).toBeInTheDocument();
      expect(screen.queryByText('Inactive Portfolio')).not.toBeInTheDocument();
    });
  });

  it('should display loading state for individual portfolio cards when updating', () => {
    render(<PortfolioList loadingPortfolioId="portfolio-1" />);

    // The first portfolio card should show loading state - find the specific portfolio card
    const portfolioCard = screen.getByRole('button', { name: /Tech Portfolio/ });
    expect(portfolioCard).toHaveClass('opacity-50');
  });

  it('should be accessible with proper ARIA labels', () => {
    render(<PortfolioList />);

    expect(screen.getByRole('region', { name: 'Portfolio list' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});