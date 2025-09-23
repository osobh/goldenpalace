import { useEffect, useState } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { useRiskAnalyticsStore } from '../stores/riskAnalyticsStore';
import { AlertTriangle, TrendingDown, TrendingUp, BarChart3, Zap, Shield } from 'lucide-react';

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0.00%';
  return `${(value * 100).toFixed(2)}%`;
}

function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '0.00';
  return value.toFixed(decimals);
}

function getRiskColor(level?: string): string {
  switch (level?.toLowerCase()) {
    case 'low': return 'text-green-600';
    case 'medium': return 'text-yellow-600';
    case 'high': return 'text-orange-600';
    case 'extreme': return 'text-red-600';
    default: return 'text-gray-600';
  }
}

export function RiskAnalyticsPage() {
  const {
    portfolios,
    selectedPortfolio,
    selectPortfolio,
    fetchPortfolios,
    isLoading: portfolioLoading
  } = usePortfolioStore();

  const {
    currentMetrics,
    positionRisks,
    stressTestResults,
    monteCarloResults,
    liquidityRisk,
    riskBreaches,
    selectedPortfolioId,
    selectedTimeHorizon,
    isLoading: riskLoading,
    error,
    runFullRiskAnalysis,
    runDefaultStressTests,
    runMonteCarloSimulation,
    checkRiskBreaches,
    setSelectedPortfolio,
    setSelectedTimeHorizon,
    clearError
  } = useRiskAnalyticsStore();

  const [analysisType, setAnalysisType] = useState<'basic' | 'stress' | 'monte-carlo'>('basic');

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  useEffect(() => {
    if (selectedPortfolio && selectedPortfolio.id !== selectedPortfolioId) {
      setSelectedPortfolio(selectedPortfolio.id);
    }
  }, [selectedPortfolio, selectedPortfolioId, setSelectedPortfolio]);

  const handlePortfolioChange = async (portfolioId: string) => {
    await selectPortfolio(portfolioId);
    setSelectedPortfolio(portfolioId);
  };

  const handleRunAnalysis = async () => {
    if (!selectedPortfolioId) return;

    try {
      clearError();

      switch (analysisType) {
        case 'basic':
          await runFullRiskAnalysis(selectedPortfolioId, selectedTimeHorizon);
          break;
        case 'stress':
          await runDefaultStressTests(selectedPortfolioId);
          break;
        case 'monte-carlo':
          await runMonteCarloSimulation(selectedPortfolioId, 1000, selectedTimeHorizon);
          break;
      }

      await checkRiskBreaches(selectedPortfolioId);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const isLoading = portfolioLoading || riskLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Risk Analytics</h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedPortfolioId || ''}
            onChange={(e) => handlePortfolioChange(e.target.value)}
            className="w-48 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Select Portfolio
            </option>
            {portfolios.map((portfolio) => (
              <option key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </option>
            ))}
          </select>

          <select
            value={selectedTimeHorizon}
            onChange={(e) => setSelectedTimeHorizon(e.target.value)}
            className="w-32 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="1D">1 Day</option>
            <option value="1W">1 Week</option>
            <option value="1M">1 Month</option>
            <option value="3M">3 Months</option>
            <option value="6M">6 Months</option>
            <option value="1Y">1 Year</option>
          </select>

          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value as any)}
            className="w-40 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="basic">Basic Analysis</option>
            <option value="stress">Stress Test</option>
            <option value="monte-carlo">Monte Carlo</option>
          </select>

          <button
            onClick={handleRunAnalysis}
            disabled={!selectedPortfolioId || isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Run Analysis
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {!selectedPortfolioId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-medium text-blue-900">Select a Portfolio</h3>
          </div>
          <p className="text-blue-700">Choose a portfolio from the dropdown above to view risk analytics.</p>
        </div>
      )}

      {selectedPortfolioId && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-2">Value at Risk</h3>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(currentMetrics?.valueAtRisk)}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentMetrics?.confidenceLevel ? `${(currentMetrics.confidenceLevel * 100).toFixed(0)}% confidence` : '95% confidence'}
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-2">Sharpe Ratio</h3>
              <p className="text-2xl font-bold text-blue-600">
                {formatNumber(currentMetrics?.sharpeRatio)}
              </p>
              <p className="text-sm text-muted-foreground">Risk-adjusted return</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-2">Max Drawdown</h3>
              <p className="text-2xl font-bold text-red-600">
                {formatPercentage(currentMetrics?.maxDrawdown)}
              </p>
              <p className="text-sm text-muted-foreground">Worst decline</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-2">Volatility</h3>
              <p className="text-2xl font-bold text-purple-600">
                {formatPercentage(currentMetrics?.volatility)}
              </p>
              <p className="text-sm text-muted-foreground">Annualized</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Portfolio Risk Breakdown
              </h3>
              {positionRisks && positionRisks.length > 0 ? (
                <div className="space-y-3">
                  {positionRisks.slice(0, 5).map((position, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{position.symbol}</span>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${getRiskColor(position.riskLevel)}`}>
                          {position.riskLevel}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          VaR: {formatCurrency(position.valueAtRisk)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {positionRisks.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{positionRisks.length - 5} more positions
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Run analysis to see position risks.</p>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Stress Test Results
              </h3>
              {stressTestResults && stressTestResults.length > 0 ? (
                <div className="space-y-3">
                  {stressTestResults.slice(0, 4).map((test, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{test.scenarioName}</span>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${test.portfolioLoss < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(test.portfolioLoss)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(test.percentageChange)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Run stress tests to see how your portfolio performs under different market conditions.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Monte Carlo Simulation
              </h3>
              {monteCarloResults ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Return</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatPercentage(monteCarloResults.expectedReturn)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Worst Case (5%)</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatPercentage(monteCarloResults.worstCase)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Best Case (95%)</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatPercentage(monteCarloResults.bestCase)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Simulations</p>
                      <p className="text-lg font-bold text-blue-600">
                        {monteCarloResults.numberOfSimulations?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Generate probabilistic forecasts for your portfolio performance.</p>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Risk Alerts
              </h3>
              {riskBreaches ? (
                <div className="space-y-3">
                  {riskBreaches.allWithinLimits ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm">All risk metrics within limits</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {riskBreaches.breaches.map((breach, index) => (
                        <div key={index} className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm">{breach.message || 'Risk limit breach detected'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No active risk alerts.</p>
              )}
            </div>
          </div>

          {liquidityRisk && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Liquidity Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Liquidity Score</p>
                  <p className={`text-2xl font-bold ${getRiskColor(liquidityRisk.riskLevel)}`}>
                    {formatNumber(liquidityRisk.liquidityScore)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Days to Liquidate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {liquidityRisk.daysToLiquidate || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Liquidity Cost</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatPercentage(liquidityRisk.liquidityCost)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}