import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LeaderboardEntry } from '../../services/competition.service';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  showFullDetails?: boolean;
}

export function LeaderboardTable({ entries, currentUserId, showFullDetails = false }: LeaderboardTableProps) {
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-xl">🥇</span>;
      case 2:
        return <span className="text-xl">🥈</span>;
      case 3:
        return <span className="text-xl">🥉</span>;
      default:
        return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankChange = (current: number, previous?: number) => {
    if (!previous) return null;
    const change = previous - current;
    if (change > 0) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="h-3 w-3" />
          <span className="text-xs ml-1">+{change}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-600">
          <TrendingDown className="h-3 w-3" />
          <span className="text-xs ml-1">{change}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center text-muted-foreground">
        <Minus className="h-3 w-3" />
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-border">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">Rank</th>
            <th className="pb-3 font-medium">Player</th>
            <th className="pb-3 font-medium text-right">Score</th>
            <th className="pb-3 font-medium text-right">Return</th>
            {showFullDetails && (
              <>
                <th className="pb-3 font-medium text-right">Win Rate</th>
                <th className="pb-3 font-medium text-right">Trades</th>
                <th className="pb-3 font-medium text-right">Sharpe</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;
            return (
              <tr
                key={entry.userId}
                className={`text-sm ${
                  isCurrentUser ? 'bg-primary/5' : 'hover:bg-muted/50'
                } transition-colors`}
              >
                <td className="py-3">
                  <div className="flex items-center space-x-2">
                    {getRankBadge(entry.rank)}
                    {getRankChange(entry.rank, entry.previousRank)}
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center space-x-2">
                    {entry.avatar ? (
                      <img
                        src={entry.avatar}
                        alt={entry.username}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium text-muted-foreground">
                          {entry.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className={`font-medium ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                      {entry.username}
                      {isCurrentUser && ' (You)'}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-right">
                  <div>
                    <p className="font-medium text-foreground">
                      {entry.score >= 0 ? '+' : ''}{entry.score.toFixed(2)}
                    </p>
                    {entry.scoreChange24h !== undefined && (
                      <p className={`text-xs ${
                        entry.scoreChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {entry.scoreChange24h >= 0 ? '+' : ''}{entry.scoreChange24h.toFixed(2)}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 text-right">
                  <p className={`font-medium ${
                    entry.returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {entry.returnPercentage >= 0 ? '+' : ''}{entry.returnPercentage.toFixed(2)}%
                  </p>
                </td>
                {showFullDetails && (
                  <>
                    <td className="py-3 text-right">
                      <p className="font-medium text-foreground">{entry.winRate.toFixed(1)}%</p>
                    </td>
                    <td className="py-3 text-right">
                      <p className="font-medium text-foreground">{entry.totalTrades}</p>
                    </td>
                    <td className="py-3 text-right">
                      <p className="font-medium text-foreground">
                        {entry.sharpeRatio?.toFixed(2) || '-'}
                      </p>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {entries.length === 0 && (
        <div className="py-8 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No participants yet</p>
          <p className="text-sm text-muted-foreground mt-1">Be the first to join!</p>
        </div>
      )}
    </div>
  );
}