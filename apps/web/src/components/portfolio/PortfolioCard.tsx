import { Lock, Globe, TrendingUp, TrendingDown } from 'lucide-react';
import type { Portfolio } from '../../services/portfolio.service';

interface PortfolioCardProps {
  portfolio: Portfolio;
  onClick: (portfolioId: string) => void;
  isLoading?: boolean;
}

export function PortfolioCard({ portfolio, onClick, isLoading = false }: PortfolioCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: portfolio.currency || 'USD',
    }).format(amount);
  };

  const formatPercentage = (percentage: number | undefined) => {
    if (percentage === undefined || percentage === null) return '0.00%';
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getReturnColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-yellow-100 text-yellow-800';
      case 'CLOSED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <button
      onClick={() => onClick(portfolio.id)}
      aria-label={`View portfolio: ${portfolio.name}`}
      className={`w-full text-left p-6 bg-card border border-border rounded-lg hover:bg-accent transition-colors ${
        isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      disabled={isLoading}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div
            className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"
            aria-label="Loading portfolio data"
          />
        </div>
      )}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {portfolio.name}
            </h3>
            {portfolio.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {portfolio.description}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {portfolio.isPublic ? (
              <Globe
                className="h-4 w-4 text-blue-600"
                aria-label="Public portfolio"
              />
            ) : (
              <Lock
                className="h-4 w-4 text-gray-400"
                aria-label="Private portfolio"
              />
            )}
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(
                portfolio.status
              )}`}
            >
              {portfolio.status}
            </span>
          </div>
        </div>

        {/* Portfolio Value */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Value</span>
            <span className="text-xl font-bold text-foreground">
              {formatCurrency(portfolio.totalValue)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Return</span>
            <div className="flex items-center space-x-1">
              {portfolio.totalReturn >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${getReturnColor(portfolio.totalReturn)}`}>
                {portfolio.totalReturn >= 0 ? '+' : ''}
                {formatCurrency(portfolio.totalReturn)} ({formatPercentage(portfolio.totalReturnPercentage)})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Today</span>
            <div className="text-right">
              <div className={`text-sm font-medium ${getReturnColor(portfolio.dayChange)}`}>
                {portfolio.dayChange >= 0 ? '+' : ''}
                {formatCurrency(portfolio.dayChange)}
              </div>
              <div className={`text-xs ${getReturnColor(portfolio.dayChange)}`}>
                ({formatPercentage(portfolio.dayChangePercentage)})
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <span className="text-xs text-muted-foreground">Assets</span>
            <p className="text-sm font-medium text-foreground">
              {(portfolio.assets || []).length} asset{(portfolio.assets || []).length !== 1 ? 's' : ''}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Created</span>
            <p className="text-sm font-medium text-foreground">
              Created {formatDate(portfolio.createdAt)}
            </p>
          </div>
        </div>

        {/* Risk Metrics */}
        {portfolio.riskMetrics && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <span className="text-xs text-muted-foreground">Sharpe Ratio</span>
              <p className="text-sm font-medium text-foreground">
                Sharpe: {portfolio.riskMetrics.sharpeRatio}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Volatility</span>
              <p className="text-sm font-medium text-foreground">
                Volatility: {portfolio.riskMetrics.volatility}%
              </p>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}