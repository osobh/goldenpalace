import { useEffect, useMemo, useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Shield, Activity } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { usePortfolioStore } from '../stores/portfolioStore';
import { PortfolioList } from '../components/portfolio/PortfolioList';
import { CreatePortfolioModal } from '../components/portfolio/wizard/CreatePortfolioModal';

export function DashboardPage() {
  const { user, isInitialized, isAuthenticated } = useAuthStore();
  const { portfolios, isLoading, fetchPortfolios } = usePortfolioStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  console.log('[Dashboard Mount]', {
    user,
    isInitialized,
    isAuthenticated,
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken')
  });

  useEffect(() => {
    console.log('[Dashboard useEffect]', {
      isInitialized,
      isAuthenticated,
      user,
      willFetchPortfolios: isInitialized
    });

    // Wait for auth to be initialized before fetching portfolios
    if (isInitialized) {
      console.log('[Dashboard] Calling fetchPortfolios...');
      fetchPortfolios();
    }
  }, [isInitialized, fetchPortfolios]);

  const dashboardStats = useMemo(() => {
    if (portfolios.length === 0) {
      return {
        totalValue: 0,
        totalReturn: 0,
        totalReturnPercentage: 0,
        dayChange: 0,
        dayChangePercentage: 0,
        activePositions: 0,
        averageRiskLevel: 'LOW' as const,
      };
    }

    const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
    const totalReturn = portfolios.reduce((sum, p) => sum + p.totalReturn, 0);
    const totalInitial = portfolios.reduce((sum, p) => sum + p.initialBalance, 0);
    const dayChange = portfolios.reduce((sum, p) => sum + p.dayChange, 0);
    const dayChangePercentage = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;
    const totalReturnPercentage = totalInitial > 0 ? (totalReturn / totalInitial) * 100 : 0;
    const activePositions = portfolios.reduce((sum, p) => sum + (p.assets?.length || 0), 0);

    // Calculate average risk level
    const riskLevels = portfolios.filter(p => p.riskMetrics).map(p => p.riskMetrics!.volatility);
    const avgVolatility = riskLevels.length > 0 ? riskLevels.reduce((a, b) => a + b, 0) / riskLevels.length : 0;
    let averageRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'LOW';

    if (avgVolatility > 30) averageRiskLevel = 'EXTREME';
    else if (avgVolatility > 20) averageRiskLevel = 'HIGH';
    else if (avgVolatility > 10) averageRiskLevel = 'MEDIUM';
    else averageRiskLevel = 'LOW';

    return {
      totalValue,
      totalReturn,
      totalReturnPercentage,
      dayChange,
      dayChangePercentage,
      activePositions,
      averageRiskLevel,
    };
  }, [portfolios]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const getReturnColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'EXTREME': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.username}! Here's your portfolio overview.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Portfolio
        </button>
      </div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Portfolio Value</h3>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(dashboardStats.totalValue)}
              </p>
              <p className={`text-sm ${getReturnColor(dashboardStats.dayChange)}`}>
                {formatPercentage(dashboardStats.dayChangePercentage)} today
              </p>
            </div>
            <div className={`p-3 rounded-full ${dashboardStats.dayChange >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {dashboardStats.dayChange >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Total P&L</h3>
              <p className={`text-2xl font-bold ${getReturnColor(dashboardStats.totalReturn)}`}>
                {formatCurrency(dashboardStats.totalReturn)}
              </p>
              <p className={`text-sm ${getReturnColor(dashboardStats.totalReturn)}`}>
                {formatPercentage(dashboardStats.totalReturnPercentage)} all time
              </p>
            </div>
            <div className={`p-3 rounded-full ${dashboardStats.totalReturn >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {dashboardStats.totalReturn >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Active Positions</h3>
              <p className="text-2xl font-bold text-foreground">{dashboardStats.activePositions}</p>
              <p className="text-sm text-muted-foreground">
                {dashboardStats.activePositions === 0 ? 'No open positions' : 'Across all portfolios'}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Risk Level</h3>
              <p className={`text-2xl font-bold ${getRiskColor(dashboardStats.averageRiskLevel)}`}>
                {dashboardStats.averageRiskLevel}
              </p>
              <p className="text-sm text-muted-foreground">
                {dashboardStats.averageRiskLevel === 'LOW' ? 'Conservative profile' :
                 dashboardStats.averageRiskLevel === 'MEDIUM' ? 'Balanced profile' :
                 dashboardStats.averageRiskLevel === 'HIGH' ? 'Aggressive profile' : 'Very risky profile'}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {portfolios.length === 0 && !isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full text-left p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                <div className="font-medium text-foreground">Create Portfolio</div>
                <div className="text-sm text-muted-foreground">Start tracking your investments</div>
              </button>
              <button className="w-full text-left p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                <div className="font-medium text-foreground">Join Competition</div>
                <div className="text-sm text-muted-foreground">Compete with other traders</div>
              </button>
              <button className="w-full text-left p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                <div className="font-medium text-foreground">Analyze Risk</div>
                <div className="text-sm text-muted-foreground">Get portfolio risk insights</div>
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Getting Started</h3>
            <p className="text-muted-foreground mb-4">
              Welcome to Golden Palace - your social trading and risk analytics platform.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                Create your first portfolio to track investments
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                Add assets and monitor performance
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                Get detailed risk analytics and insights
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                Join trading competitions with other users
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Your Portfolios</h2>
            <span className="text-sm text-muted-foreground">
              {portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''}
            </span>
          </div>
          <PortfolioList />
        </div>
      )}

      {/* Create Portfolio Modal */}
      {showCreateModal && (
        <CreatePortfolioModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchPortfolios(); // Refresh portfolios after creation
          }}
        />
      )}
    </div>
  );
}