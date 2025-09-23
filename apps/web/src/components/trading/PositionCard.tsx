import { X, TrendingUp, TrendingDown, DollarSign, Clock, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { useTradingStore } from '../../stores/tradingStore';
import type { PaperPosition } from '../../services/trading.service';

interface PositionCardProps {
  position: PaperPosition;
}

export function PositionCard({ position }: PositionCardProps) {
  const { closePaperPosition, updatePaperPosition } = useTradingStore();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [stopLoss, setStopLoss] = useState(position.stopLoss || 0);
  const [takeProfit, setTakeProfit] = useState(position.takeProfit || 0);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just opened';
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleClosePosition = async () => {
    const closePrice = prompt('Enter close price:', String(position.currentPrice || position.entryPrice));
    if (closePrice) {
      await closePaperPosition(position.id, {
        closePrice: parseFloat(closePrice),
        closeReason: 'Manual close',
      });
    }
  };

  const handleUpdatePosition = async () => {
    await updatePaperPosition(position.id, {
      stopLoss: stopLoss || undefined,
      takeProfit: takeProfit || undefined,
    });
    setIsEditing(false);
  };

  const isLong = position.quantity > 0;
  const currentPrice = position.currentPrice || position.entryPrice;
  const pnl = position.pnl || 0;
  const pnlPercent = position.pnlPercent || 0;

  return (
    <div className="p-4 border border-border rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
            isLong
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {isLong ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{isLong ? 'LONG' : 'SHORT'}</span>
          </div>
          <div>
            <span className="text-lg font-bold text-foreground">{position.symbol}</span>
            {position.assetType && (
              <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {position.assetType}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-lg font-bold ${
            pnl >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            {showActions && (
              <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowActions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  Edit SL/TP
                </button>
                <button
                  onClick={() => {
                    handleClosePosition();
                    setShowActions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors text-red-600"
                >
                  Close Position
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Stop Loss</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Take Profit</label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                step="0.01"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdatePosition}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-2 text-sm mb-3">
            <div>
              <p className="text-muted-foreground">Qty</p>
              <p className="font-medium text-foreground">{Math.abs(position.quantity)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Entry</p>
              <p className="font-medium text-foreground">${position.entryPrice}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Current</p>
              <p className="font-medium text-foreground">${currentPrice}</p>
            </div>
            {position.stopLoss && (
              <div>
                <p className="text-muted-foreground">SL</p>
                <p className="font-medium text-red-600">${position.stopLoss}</p>
              </div>
            )}
            {position.takeProfit && (
              <div>
                <p className="text-muted-foreground">TP</p>
                <p className="font-medium text-green-600">${position.takeProfit}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(position.openedAt)}
              </div>
              <div className={`font-medium ${
                pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
              </div>
            </div>
            {position.tradeIdea && (
              <div className="flex items-center text-sm">
                <span className="text-muted-foreground mr-1">Idea by</span>
                <span className="font-medium text-foreground">
                  {position.tradeIdea.user.username}
                </span>
              </div>
            )}
          </div>

          {/* Risk Indicator */}
          {position.stopLoss && currentPrice && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Risk Level</span>
                <span>{Math.abs(((currentPrice - position.stopLoss) / position.entryPrice) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    Math.abs(currentPrice - position.stopLoss) < Math.abs(position.entryPrice - position.stopLoss) * 0.5
                      ? 'bg-red-600'
                      : Math.abs(currentPrice - position.stopLoss) < Math.abs(position.entryPrice - position.stopLoss) * 0.75
                      ? 'bg-yellow-600'
                      : 'bg-green-600'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.abs(((currentPrice - position.stopLoss) / (position.entryPrice - position.stopLoss)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}