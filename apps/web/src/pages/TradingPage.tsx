import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@golden-palace/ui';

export function TradingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trading</h1>
        <Button>
          New Trade
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Overview</CardTitle>
              <CardDescription>Manage your investment portfolios</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No portfolios created yet. Create your first portfolio to start trading.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>Your active trades</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No open positions.</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Market Watch</CardTitle>
              <CardDescription>Real-time market data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">AAPL</span>
                  <span className="text-sm text-green-600 font-medium">$180.45 (+1.2%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">GOOGL</span>
                  <span className="text-sm text-red-600 font-medium">$140.23 (-0.8%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">MSFT</span>
                  <span className="text-sm text-green-600 font-medium">$380.12 (+0.5%)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trade Ideas</CardTitle>
              <CardDescription>Community trading insights</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">No trade ideas shared yet.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}