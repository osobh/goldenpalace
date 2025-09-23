import { TrendingUp, TrendingDown, Clock, Star, Copy, MoreVertical } from 'lucide-react';
import { useTradingStore } from '../../stores/tradingStore';
import type { TradeIdea } from '../../services/trading.service';

interface TradeIdeaCardProps {
  tradeIdea: TradeIdea;
}

export function TradeIdeaCard({ tradeIdea }: TradeIdeaCardProps) {
  const { executeTradeFromIdea } = useTradingStore();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const calculateRiskReward = () => {
    if (!tradeIdea.stopLoss || !tradeIdea.takeProfit1) return null;
    const risk = Math.abs(tradeIdea.entryPrice - tradeIdea.stopLoss);
    const reward = Math.abs(tradeIdea.takeProfit1 - tradeIdea.entryPrice);
    return (reward / risk).toFixed(2);
  };

  const handleCopyTrade = async () => {
    const quantity = prompt('Enter quantity:', '100');
    if (quantity) {
      await executeTradeFromIdea(tradeIdea.id, parseFloat(quantity));
    }
  };

  return (
    <div className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {tradeIdea.user.avatarUrl ? (
            <img
              src={tradeIdea.user.avatarUrl}
              alt={tradeIdea.user.username}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">
                {tradeIdea.user.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-foreground">{tradeIdea.user.username}</p>
            <p className="text-xs text-muted-foreground flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(tradeIdea.createdAt)}
              {tradeIdea.timeframe && (
                <span className="ml-2 px-2 py-0.5 bg-muted rounded text-xs">
                  {tradeIdea.timeframe}
                </span>
              )}
            </p>
          </div>
        </div>
        <button className="p-1 hover:bg-muted rounded transition-colors">
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
              tradeIdea.direction === 'LONG'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {tradeIdea.direction === 'LONG' ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{tradeIdea.direction}</span>
            </div>
            <span className="text-lg font-bold text-foreground">{tradeIdea.symbol}</span>
            {tradeIdea.assetType && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {tradeIdea.assetType}
              </span>
            )}
          </div>
          {tradeIdea.confidence && (
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < tradeIdea.confidence
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Entry</p>
            <p className="font-medium text-foreground">${tradeIdea.entryPrice}</p>
          </div>
          {tradeIdea.stopLoss && (
            <div>
              <p className="text-muted-foreground">Stop Loss</p>
              <p className="font-medium text-red-600">${tradeIdea.stopLoss}</p>
            </div>
          )}
          {tradeIdea.takeProfit1 && (
            <div>
              <p className="text-muted-foreground">TP1</p>
              <p className="font-medium text-green-600">${tradeIdea.takeProfit1}</p>
            </div>
          )}
          {calculateRiskReward() && (
            <div>
              <p className="text-muted-foreground">R:R</p>
              <p className="font-medium text-foreground">1:{calculateRiskReward()}</p>
            </div>
          )}
        </div>

        {tradeIdea.takeProfit2 && (
          <div className="flex space-x-4 text-sm">
            <div>
              <span className="text-muted-foreground">TP2:</span>
              <span className="ml-2 font-medium text-green-600">${tradeIdea.takeProfit2}</span>
            </div>
            {tradeIdea.takeProfit3 && (
              <div>
                <span className="text-muted-foreground">TP3:</span>
                <span className="ml-2 font-medium text-green-600">${tradeIdea.takeProfit3}</span>
              </div>
            )}
          </div>
        )}

        {tradeIdea.rationale && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {tradeIdea.rationale}
          </p>
        )}

        {tradeIdea.tags && tradeIdea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tradeIdea.tags.map(tag => (
              <span key={tag} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {tradeIdea.status === 'CLOSED' && tradeIdea.pnl !== null && (
          <div className="pt-2 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Result</span>
              <span className={`font-medium ${
                tradeIdea.pnl >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {tradeIdea.pnl >= 0 ? '+' : ''}${tradeIdea.pnl.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {tradeIdea.status === 'ACTIVE' && (
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <div className="flex items-center space-x-2 text-sm">
              {tradeIdea._count?.paperPositions && tradeIdea._count.paperPositions > 0 && (
                <span className="text-muted-foreground">
                  {tradeIdea._count.paperPositions} following
                </span>
              )}
            </div>
            <button
              onClick={handleCopyTrade}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}