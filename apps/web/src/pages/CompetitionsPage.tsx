export function CompetitionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Competitions</h1>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          Create Competition
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Active Competitions</h3>
            <div className="space-y-4">
              <p className="text-muted-foreground">No active competitions available.</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">My Competitions</h3>
            <div className="space-y-4">
              <p className="text-muted-foreground">You haven't joined any competitions yet.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Leaderboard</h3>
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">Join a competition to see rankings.</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Competition Types</h3>
            <div className="space-y-2">
              <div className="p-3 bg-secondary rounded-lg">
                <div className="font-medium text-sm">Weekly P&L</div>
                <div className="text-xs text-muted-foreground">Highest profit in a week</div>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <div className="font-medium text-sm">Monthly ROI</div>
                <div className="text-xs text-muted-foreground">Best return on investment</div>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <div className="font-medium text-sm">Best Trade</div>
                <div className="text-xs text-muted-foreground">Single best performing trade</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}