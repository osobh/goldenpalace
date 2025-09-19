export function RiskAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Risk Analytics</h1>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          Run Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-2">Value at Risk</h3>
          <p className="text-2xl font-bold text-orange-600">$0.00</p>
          <p className="text-sm text-muted-foreground">95% confidence</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-2">Sharpe Ratio</h3>
          <p className="text-2xl font-bold text-blue-600">0.00</p>
          <p className="text-sm text-muted-foreground">Risk-adjusted return</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-2">Max Drawdown</h3>
          <p className="text-2xl font-bold text-red-600">0.00%</p>
          <p className="text-sm text-muted-foreground">Worst decline</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-2">Volatility</h3>
          <p className="text-2xl font-bold text-purple-600">0.00%</p>
          <p className="text-sm text-muted-foreground">Annualized</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Portfolio Risk Breakdown</h3>
          <p className="text-muted-foreground">Create a portfolio to see risk analysis.</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Stress Test Results</h3>
          <p className="text-muted-foreground">Run stress tests to see how your portfolio performs under different market conditions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Monte Carlo Simulation</h3>
          <p className="text-muted-foreground">Generate probabilistic forecasts for your portfolio performance.</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Risk Alerts</h3>
          <p className="text-muted-foreground">No active risk alerts.</p>
        </div>
      </div>
    </div>
  );
}