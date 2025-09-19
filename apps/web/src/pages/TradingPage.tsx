export function TradingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Trading</h1>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          New Trade
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Portfolio Overview</h3>
            <p className="text-muted-foreground">No portfolios created yet. Create your first portfolio to start trading.</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Open Positions</h3>
            <p className="text-muted-foreground">No open positions.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Market Watch</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">AAPL</span>
                <span className="text-sm text-green-600">$180.45 (+1.2%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">GOOGL</span>
                <span className="text-sm text-red-600">$140.23 (-0.8%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">MSFT</span>
                <span className="text-sm text-green-600">$380.12 (+0.5%)</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Trade Ideas</h3>
            <p className="text-muted-foreground text-sm">No trade ideas shared yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}