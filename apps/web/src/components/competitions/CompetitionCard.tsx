import { Trophy, Users, Calendar, DollarSign, TrendingUp, Lock, Globe } from 'lucide-react';
import { format } from 'date-fns';
import type { Competition } from '../../services/competition.service';

interface CompetitionCardProps {
  competition: Competition;
  onJoin?: () => void;
  onView?: () => void;
  isJoined?: boolean;
}

export function CompetitionCard({ competition, onJoin, onView, isJoined }: CompetitionCardProps) {
  const getDaysRemaining = () => {
    const now = new Date();
    const end = new Date(competition.endDate);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getStatusBadge = () => {
    switch (competition.status) {
      case 'ACTIVE':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
            Active
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
            Starting Soon
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeIcon = () => {
    switch (competition.type) {
      case 'WEEKLY_PNL':
        return '📈';
      case 'MONTHLY_ROI':
        return '📊';
      case 'BEST_TRADE':
        return '🎯';
      case 'CONSISTENCY':
        return '🛡️';
      default:
        return '🏆';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getTypeIcon()}</span>
          <div>
            <h3 className="font-semibold text-foreground text-lg">{competition.name}</h3>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusBadge()}
              {competition.isPrivate ? (
                <Lock className="h-3 w-3 text-muted-foreground" />
              ) : (
                <Globe className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
        {isJoined && (
          <div className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
            Joined
          </div>
        )}
      </div>

      {competition.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {competition.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {competition.currentParticipants || 0}/{competition.maxParticipants} players
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {getDaysRemaining()} days left
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {competition.entryFee ? `$${competition.entryFee} entry` : 'Free'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            ${competition.prizePool?.toLocaleString() || '0'} prize
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-border flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {format(new Date(competition.startDate), 'MMM d')} - {format(new Date(competition.endDate), 'MMM d, yyyy')}
        </div>
        <div className="flex space-x-2">
          {onView && (
            <button
              onClick={onView}
              className="px-3 py-1 text-sm text-foreground hover:text-primary transition-colors"
            >
              View Details
            </button>
          )}
          {onJoin && competition.status === 'PENDING' && !isJoined && (
            <button
              onClick={onJoin}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Join
            </button>
          )}
        </div>
      </div>
    </div>
  );
}