import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CompetitionService } from '../../services/competition.service';
import './Leaderboard.css';

interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  userId: string;
  username: string;
  score: number;
  pnl?: number;
  roi?: number;
  totalTrades?: number;
  winRate?: number;
}

interface LeaderboardProps {
  service: CompetitionService;
  competitionId: string;
  currentUserId?: string;
  pageSize?: number;
  showStats?: boolean;
  showExport?: boolean;
  realTimeUpdates?: boolean;
}

type SortField = 'rank' | 'username' | 'score' | 'pnl' | 'roi' | 'winRate' | 'totalTrades';
type SortDirection = 'asc' | 'desc';

export const Leaderboard: React.FC<LeaderboardProps> = ({
  service,
  competitionId,
  currentUserId,
  pageSize = 10,
  showStats = false,
  showExport = false,
  realTimeUpdates = false
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadLeaderboard();

    if (realTimeUpdates) {
      unsubscribeRef.current = service.subscribeToLeaderboard(competitionId, handleLeaderboardUpdate);
    }

    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [competitionId, currentPage]);

  useEffect(() => {
    filterAndSortEntries();
  }, [entries, searchTerm, sortField, sortDirection]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * pageSize;
      const data = await service.getLeaderboard(competitionId, pageSize, offset);
      setEntries(data);
      setTotalEntries(100); // In real app, this would come from API
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaderboardUpdate = (updatedData: LeaderboardEntry[]) => {
    setEntries(updatedData);
    setShowUpdateIndicator(true);
    setTimeout(() => setShowUpdateIndicator(false), 1000);
  };

  const filterAndSortEntries = () => {
    let filtered = [...entries];

    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      const aValue = a[sortField] ?? 0;
      const bValue = b[sortField] ?? 0;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const diff = Number(aValue) - Number(bValue);
      return sortDirection === 'asc' ? diff : -diff;
    });

    setFilteredEntries(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const totalPages = Math.ceil(totalEntries / pageSize);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (amount: number): string => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getMedalIcon = (rank: number): string | null => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  const getPositionChange = (entry: LeaderboardEntry): React.ReactNode => {
    if (!entry.previousRank || entry.previousRank === entry.rank) return null;

    const diff = entry.previousRank - entry.rank;
    const isUp = diff > 0;

    return (
      <span
        className={`position-change ${isUp ? 'position-up' : 'position-down'}`}
        data-testid={`position-change-${entry.userId}`}
      >
        {isUp ? '▲' : '▼'} {Math.abs(diff)}
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = ['Rank', 'Username', 'Score', 'P&L', 'ROI', 'Win Rate', 'Trades'];
    const rows = filteredEntries.map(entry => [
      entry.rank,
      entry.username,
      entry.score,
      entry.pnl ?? '',
      entry.roi ? formatPercentage(entry.roi) : '',
      entry.winRate ? formatPercentage(entry.winRate) : '',
      entry.totalTrades ?? ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    downloadFile(csvContent, 'leaderboard.csv', 'text/csv');
  };

  const exportToJSON = () => {
    const jsonContent = JSON.stringify(filteredEntries, null, 2);
    downloadFile(jsonContent, 'leaderboard.json', 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statistics = useMemo(() => {
    if (!showStats || entries.length === 0) return null;

    const scores = entries.map(e => e.score);
    const winRates = entries.map(e => e.winRate).filter(Boolean) as number[];

    return {
      totalParticipants: totalEntries,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      topScore: Math.max(...scores),
      avgWinRate: winRates.length > 0
        ? winRates.reduce((a, b) => a + b, 0) / winRates.length
        : 0
    };
  }, [entries, totalEntries, showStats]);

  const renderDesktopTable = () => (
    <table role="table" aria-label="Competition leaderboard" className="leaderboard-table">
      <thead>
        <tr>
          <th
            role="columnheader"
            onClick={() => handleSort('rank')}
            className="sortable"
          >
            Rank
            {sortField === 'rank' && (
              <span data-testid={`sort-${sortDirection}`} className="sort-icon">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </th>
          <th role="columnheader">Trader</th>
          <th
            role="columnheader"
            onClick={() => handleSort('score')}
            className="sortable"
          >
            Score
            {sortField === 'score' && (
              <span data-testid={`sort-${sortDirection}`} className="sort-icon">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </th>
          <th
            role="columnheader"
            onClick={() => handleSort('pnl')}
            className="sortable"
          >
            P&L
            {sortField === 'pnl' && (
              <span data-testid={`sort-${sortDirection}`} className="sort-icon">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </th>
          <th
            role="columnheader"
            onClick={() => handleSort('roi')}
            className="sortable"
          >
            ROI
            {sortField === 'roi' && (
              <span data-testid={`sort-${sortDirection}`} className="sort-icon">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </th>
          <th
            role="columnheader"
            onClick={() => handleSort('winRate')}
            className="sortable"
          >
            Win Rate
            {sortField === 'winRate' && (
              <span data-testid={`sort-${sortDirection}`} className="sort-icon">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </th>
          <th role="columnheader">Trades</th>
          <th role="columnheader">Change</th>
        </tr>
      </thead>
      <tbody>
        {filteredEntries.map(entry => (
          <tr
            key={entry.userId}
            role="row"
            data-testid={`leaderboard-row-${entry.userId}`}
            className={entry.userId === currentUserId ? 'current-user' : ''}
          >
            <td>
              {entry.rank}
              {getMedalIcon(entry.rank) && (
                <span
                  className="medal"
                  data-testid={`medal-${entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : 'bronze'}`}
                >
                  {getMedalIcon(entry.rank)}
                </span>
              )}
            </td>
            <td>{entry.userId === currentUserId ? 'You' : entry.username}</td>
            <td>{formatNumber(entry.score)}</td>
            <td>{entry.pnl !== undefined ? formatCurrency(entry.pnl) : '-'}</td>
            <td>{entry.roi !== undefined ? formatPercentage(entry.roi) : '-'}</td>
            <td>{entry.winRate !== undefined ? formatPercentage(entry.winRate) : '-'}</td>
            <td>{entry.totalTrades || '-'}</td>
            <td>{getPositionChange(entry)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderMobileCards = () => (
    <div className="mobile-leaderboard" data-testid="mobile-leaderboard">
      {filteredEntries.map(entry => (
        <div
          key={entry.userId}
          className={`leaderboard-card ${entry.userId === currentUserId ? 'current-user' : ''}`}
          data-testid={`leaderboard-card-${entry.userId}`}
        >
          <div className="card-header">
            <div className="rank-badge">
              #{entry.rank}
              {getMedalIcon(entry.rank) && (
                <span data-testid={`medal-${entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : 'bronze'}`}>
                  {getMedalIcon(entry.rank)}
                </span>
              )}
            </div>
            <div className="username">
              {entry.userId === currentUserId ? 'You' : entry.username}
            </div>
            {getPositionChange(entry)}
          </div>
          <div className="card-stats">
            <div className="stat">
              <span className="label">Score</span>
              <span className="value">{formatNumber(entry.score)}</span>
            </div>
            {entry.pnl !== undefined && (
              <div className="stat">
                <span className="label">P&L</span>
                <span className="value">{formatCurrency(entry.pnl)}</span>
              </div>
            )}
            {entry.winRate !== undefined && (
              <div className="stat">
                <span className="label">Win Rate</span>
                <span className="value">{formatPercentage(entry.winRate)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return <div className="leaderboard-loading">Loading leaderboard...</div>;
  }

  return (
    <div className="leaderboard-container">
      {showUpdateIndicator && (
        <div className="update-indicator" data-testid="update-indicator">
          Leaderboard updated
        </div>
      )}

      <div className="leaderboard-header">
        <h2>Leaderboard</h2>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Search by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {showExport && (
            <div className="export-buttons">
              <button onClick={exportToCSV}>Export CSV</button>
              <button onClick={exportToJSON}>Export JSON</button>
            </div>
          )}
        </div>
      </div>

      {showStats && statistics && (
        <div className="leaderboard-stats">
          <div className="stat-item">
            <span>Total Participants</span>
            <span data-testid="total-participants">{statistics.totalParticipants}</span>
          </div>
          <div className="stat-item">
            <span>Average Score</span>
            <span data-testid="avg-score">{formatNumber(Math.round(statistics.avgScore))}</span>
          </div>
          <div className="stat-item">
            <span>Top Score</span>
            <span data-testid="top-score">{formatNumber(statistics.topScore)}</span>
          </div>
          <div className="stat-item">
            <span>Average Win Rate</span>
            <span data-testid="avg-win-rate">{formatPercentage(statistics.avgWinRate)}</span>
          </div>
        </div>
      )}

      {filteredEntries.length === 0 ? (
        <div className="no-results">
          {searchTerm ? 'No traders found matching your search' : 'No entries in leaderboard'}
        </div>
      ) : (
        <>
          {isMobile ? renderMobileCards() : (
            <div data-testid="desktop-leaderboard">
              {renderDesktopTable()}
            </div>
          )}
        </>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {showUpdateIndicator && 'Leaderboard has been updated'}
      </div>
    </div>
  );
};