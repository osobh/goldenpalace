import { useEffect, useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Activity, DollarSign, Target, Shield, Eye, Search, Filter } from 'lucide-react';
import { useTradingStore } from '../stores/tradingStore';
import { usePortfolioStore } from '../stores/portfolioStore';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { NewTradeModal } from '../components/trading/NewTradeModal';
import { TradeIdeaCard } from '../components/trading/TradeIdeaCard';
import { PositionCard } from '../components/trading/PositionCard';
import { MarketQuoteCard } from '../components/trading/MarketQuoteCard';

export function TradingPage() {
  const { user } = useAuthStore();
  const {
    tradeIdeas,
    paperPositions,
    userPositions,
    userStats,
    trendingSymbols,
    watchlist,
    marketQuotes,
    activeTab,
    selectedGroupId,
    isLoading,
    error,
    fetchTradeIdeas,
    fetchPaperPositions,
    fetchUserPositions,
    fetchUserStats,
    fetchTrendingSymbols,
    fetchMarketQuotes,
    setActiveTab,
    setSelectedGroup,
    addToWatchlist,
  } = useTradingStore();

  const { portfolios, fetchPortfolios, selectedPortfolioAssets } = usePortfolioStore();
  const { groups, fetchGroups } = useChatStore();

  const [showNewTradeModal, setShowNewTradeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'long' | 'short'>('all');

  useEffect(() => {
    // Fetch initial data
    const loadData = async () => {
      await Promise.all([
        fetchPortfolios(),
        fetchGroups(),
        fetchUserStats(),
      ]);

      // If user is in groups, fetch group data
      if (groups.length > 0 && !selectedGroupId) {
        setSelectedGroup(groups[0].id);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    // Fetch data when selected group changes
    if (selectedGroupId) {
      fetchTradeIdeas({ groupId: selectedGroupId });
      fetchPaperPositions({ groupId: selectedGroupId, status: 'OPEN' });
      fetchTrendingSymbols(selectedGroupId);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    // Fetch user's positions
    if (user) {
      fetchUserPositions(user.id);
    }
  }, [user]);

  useEffect(() => {
    // Fetch market quotes for watchlist
    if (watchlist.length > 0) {
      fetchMarketQuotes(watchlist);
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        fetchMarketQuotes(watchlist);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [watchlist]);

  const filteredTradeIdeas = tradeIdeas.filter(idea => {
    if (searchQuery && !idea.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterType !== 'all' && idea.direction !== filterType.toUpperCase()) {
      return false;
    }
    return true;
  });

  const openPositions = paperPositions.filter(pos => pos.status === 'OPEN');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Trading</h1>
        <button
          onClick={() => setShowNewTradeModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Trade
        </button>
      </div>

      {/* Stats Overview */}
      {userStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {userStats.winRate.toFixed(1)}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${userStats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(userStats.totalPnl).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold text-foreground">
                  {userStats.totalTrades}
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profit Factor</p>
                <p className="text-2xl font-bold text-foreground">
                  {userStats.profitFactor.toFixed(2)}
                </p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Trading Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Group Selector */}
          {groups.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">Active Group</h3>
                <select
                  value={selectedGroupId || ''}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="px-3 py-1 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              {/* Tabs */}
              <div className="flex space-x-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('ideas')}
                  className={`flex-1 px-3 py-2 rounded-md transition-colors ${
                    activeTab === 'ideas'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Trade Ideas
                </button>
                <button
                  onClick={() => setActiveTab('positions')}
                  className={`flex-1 px-3 py-2 rounded-md transition-colors ${
                    activeTab === 'positions'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Positions
                </button>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className={`flex-1 px-3 py-2 rounded-md transition-colors ${
                    activeTab === 'portfolio'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Portfolio
                </button>
              </div>
            </div>
          )}

          {/* Search and Filter Bar */}
          {activeTab === 'ideas' && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search symbols..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All</option>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">
                {activeTab === 'ideas' ? 'Trade Ideas' : activeTab === 'positions' ? 'Open Positions' : 'Portfolio Assets'}
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-500">{error}</p>
                </div>
              ) : activeTab === 'ideas' ? (
                filteredTradeIdeas.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">No trade ideas found</p>
                    <p className="text-sm text-muted-foreground">
                      Be the first to share a trade idea with your group
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTradeIdeas.map(idea => (
                      <TradeIdeaCard key={idea.id} tradeIdea={idea} />
                    ))}
                  </div>
                )
              ) : activeTab === 'positions' ? (
                openPositions.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">No open positions</p>
                    <p className="text-sm text-muted-foreground">
                      Start paper trading to track your performance
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {openPositions.map(position => (
                      <PositionCard key={position.id} position={position} />
                    ))}
                  </div>
                )
              ) : (
                portfolios.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">No portfolios found</p>
                    <p className="text-sm text-muted-foreground">
                      Create a portfolio to manage real investments
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {portfolios.map(portfolio => (
                      <div key={portfolio.id} className="p-4 border border-border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-foreground">{portfolio.name}</h4>
                            <p className="text-sm text-muted-foreground">{portfolio.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">
                              ${portfolio.currentValue.toFixed(2)}
                            </p>
                            <p className={`text-sm font-medium ${
                              portfolio.totalReturnPct >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {portfolio.totalReturnPct >= 0 ? '+' : ''}{portfolio.totalReturnPct.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Market Data */}
        <div className="space-y-6">
          {/* Market Watch */}
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">Market Watch</h3>
            </div>
            <div className="p-4 space-y-3">
              {watchlist.length === 0 ? (
                <div className="text-center py-4">
                  <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Add symbols to your watchlist
                  </p>
                </div>
              ) : (
                watchlist.map(symbol => (
                  <MarketQuoteCard
                    key={symbol}
                    symbol={symbol}
                    quote={marketQuotes[symbol]}
                  />
                ))
              )}
            </div>
          </div>

          {/* Trending Symbols */}
          {trendingSymbols.length > 0 && (
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border">
                <h3 className="text-lg font-medium text-foreground">Trending</h3>
              </div>
              <div className="p-4 space-y-2">
                {trendingSymbols.slice(0, 5).map(trend => (
                  <div key={trend.symbol} className="flex justify-between items-center">
                    <button
                      onClick={() => addToWatchlist(trend.symbol)}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {trend.symbol}
                    </button>
                    <div className="text-sm text-muted-foreground">
                      {trend.count} ideas
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Your Positions Summary */}
          {userPositions.length > 0 && (
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border">
                <h3 className="text-lg font-medium text-foreground">Your Positions</h3>
              </div>
              <div className="p-4 space-y-3">
                {userPositions.slice(0, 3).map(position => (
                  <div key={position.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-foreground">{position.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {position.quantity} @ ${position.entryPrice}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        (position.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${Math.abs(position.pnl || 0).toFixed(2)}
                      </p>
                      <p className={`text-xs ${
                        (position.pnlPercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(position.pnlPercent || 0) >= 0 ? '+' : ''}{(position.pnlPercent || 0).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Trade Modal */}
      <NewTradeModal
        isOpen={showNewTradeModal}
        onClose={() => setShowNewTradeModal(false)}
      />
    </div>
  );
}