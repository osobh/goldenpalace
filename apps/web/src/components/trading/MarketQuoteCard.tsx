import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { useTradingStore } from '../../stores/tradingStore';
import type { MarketQuote } from '../../services/trading.service';

interface MarketQuoteCardProps {
  symbol: string;
  quote?: MarketQuote;
}

export function MarketQuoteCard({ symbol, quote }: MarketQuoteCardProps) {
  const { removeFromWatchlist } = useTradingStore();

  if (!quote) {
    return (
      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
        <span className="font-medium text-foreground">{symbol}</span>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Loading...</span>
          <button
            onClick={() => removeFromWatchlist(symbol)}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  const isPositive = quote.change >= 0;

  return (
    <div className="flex justify-between items-center p-2 hover:bg-muted/50 rounded transition-colors">
      <div className="flex items-center space-x-2">
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600" />
        )}
        <span className="font-medium text-foreground">{symbol}</span>
      </div>
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <p className="font-medium text-foreground">
            ${quote.price.toFixed(2)}
          </p>
          <p className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
          </p>
        </div>
        <button
          onClick={() => removeFromWatchlist(symbol)}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}