import { useEffect, useState } from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { PortfolioCard } from './PortfolioCard';
import type { Portfolio } from '../../services/portfolio.service';

interface PortfolioListProps {
  loadingPortfolioId?: string;
  onCreateNew?: () => void;
}

type SortOption = 'name' | 'value' | 'return' | 'date';
type FilterOption = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'CLOSED';

export function PortfolioList({ loadingPortfolioId, onCreateNew }: PortfolioListProps) {
  const {
    portfolios,
    isLoading,
    error,
    fetchPortfolios,
    selectPortfolio,
    clearError,
  } = usePortfolioStore();

  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('ALL');

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const handlePortfolioClick = (portfolioId: string) => {
    selectPortfolio(portfolioId);
  };

  const handleRetry = () => {
    clearError();
    fetchPortfolios();
  };

  const handleRefresh = () => {
    fetchPortfolios();
  };

  const sortPortfolios = (portfolios: Portfolio[]): Portfolio[] => {
    return [...portfolios].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'value':
          return b.totalValue - a.totalValue;
        case 'return':
          return b.totalReturnPercentage - a.totalReturnPercentage;
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
  };

  const filterPortfolios = (portfolios: Portfolio[]): Portfolio[] => {
    if (filterBy === 'ALL') return portfolios;
    return portfolios.filter(portfolio => portfolio.status === filterBy);
  };

  const filteredAndSortedPortfolios = sortPortfolios(filterPortfolios(portfolios));

  const calculateTotalStats = () => {
    const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
    const totalReturn = portfolios.reduce((sum, p) => sum + p.totalReturn, 0);
    const totalInitial = portfolios.reduce((sum, p) => sum + p.initialBalance, 0);
    const totalReturnPercentage = totalInitial > 0 ? (totalReturn / totalInitial) * 100 : 0;

    return {
      count: portfolios.length,
      totalValue,
      totalReturn,
      totalReturnPercentage,
    };
  };

  const stats = calculateTotalStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
            aria-label="Loading portfolios"
          />
          <p className="text-muted-foreground">Loading portfolios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-medium text-foreground mb-2">Error loading portfolios</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium text-foreground mb-2">No portfolios found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first portfolio to get started with tracking your investments.
          </p>
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Portfolio
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div region-aria-label="Portfolio list" className="space-y-6">
      {/* Portfolio Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm text-muted-foreground">Portfolios</h3>
          <p className="text-2xl font-bold text-foreground">{stats.count} Portfolio{stats.count !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm text-muted-foreground">Total Value</h3>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalValue)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm text-muted-foreground">Total Return</h3>
          <p className={`text-2xl font-bold ${stats.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.totalReturn >= 0 ? '+' : ''}{formatCurrency(stats.totalReturn)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm text-muted-foreground">Overall Return</h3>
          <p className={`text-2xl font-bold ${stats.totalReturnPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentage(stats.totalReturnPercentage)}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <label htmlFor="sort-select" className="block text-sm font-medium text-foreground mb-1">
              Sort by
            </label>
            <select
              id="sort-select"
              aria-label="Sort portfolios by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="name">Name</option>
              <option value="value">Total Value</option>
              <option value="return">Return</option>
              <option value="date">Date Created</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-select" className="block text-sm font-medium text-foreground mb-1">
              Filter
            </label>
            <select
              id="filter-select"
              aria-label="Filter by status"
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            aria-label="Refresh portfolios"
            className="p-2 border border-input bg-background hover:bg-accent rounded-md transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {onCreateNew && (
            <button
              onClick={onCreateNew}
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Portfolio
            </button>
          )}
        </div>
      </div>

      {/* Portfolio List */}
      <div role="region" aria-label="Portfolio list">
        {filteredAndSortedPortfolios.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No portfolios match the current filter.</p>
          </div>
        ) : (
          <ul role="list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedPortfolios.map((portfolio) => (
              <li key={portfolio.id} role="listitem">
                <PortfolioCard
                  portfolio={portfolio}
                  onClick={handlePortfolioClick}
                  isLoading={loadingPortfolioId === portfolio.id}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}