import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CompetitionService, Competition, CompetitionParticipant } from '../../services/competition.service';
import './CompetitionDashboard.css';

interface CompetitionDashboardProps {
  service: CompetitionService;
  userId: string;
  isAdmin?: boolean;
  onNavigate?: (path: string) => void;
}

interface CompetitionWithCountdown extends Competition {
  timeRemaining?: string;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  pnl?: number;
  roi?: number;
  rank: number;
  previousRank?: number;
}

interface CompetitionStats {
  totalCompetitions: number;
  wins: number;
  top3Finishes: number;
  totalEarnings: number;
  avgPosition: number;
  winRate: number;
  currentStreak: number;
}

export const CompetitionDashboard: React.FC<CompetitionDashboardProps> = ({
  service,
  userId,
  isAdmin = false,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'my' | 'stats'>('active');
  const [competitions, setCompetitions] = useState<CompetitionWithCountdown[]>([]);
  const [myCompetitions, setMyCompetitions] = useState<CompetitionParticipant[]>([]);
  const [leaderboards, setLeaderboards] = useState<Map<string, LeaderboardEntry[]>>(new Map());
  const [stats, setStats] = useState<CompetitionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'DAILY_PNL',
    entryFee: 0,
    prizePool: 0,
    maxParticipants: 100,
    isPrivate: false,
    description: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCompetitions();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'my') {
      loadMyCompetitions();
    } else if (activeTab === 'stats') {
      loadStatistics();
    }
  }, [activeTab]);

  useEffect(() => {
    competitions.forEach(comp => {
      loadLeaderboard(comp.id);
      subscribeToLeaderboard(comp.id);
    });
  }, [competitions]);

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      const data = await service.getActiveCompetitions();
      setCompetitions(data.map(comp => ({
        ...comp,
        timeRemaining: calculateTimeRemaining(comp.endDate)
      })));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load competitions');
    } finally {
      setLoading(false);
    }
  };

  const loadMyCompetitions = async () => {
    try {
      const data = await service.getUserCompetitions(userId);
      setMyCompetitions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your competitions');
    }
  };

  const loadStatistics = async () => {
    try {
      const data = await service.getUserStatistics(userId);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    }
  };

  const loadLeaderboard = async (competitionId: string) => {
    try {
      const data = await service.getLeaderboard(competitionId, 5, 0);
      setLeaderboards(prev => new Map(prev).set(competitionId, data));
    } catch (err) {
      console.error(`Failed to load leaderboard for ${competitionId}`, err);
    }
  };

  const subscribeToLeaderboard = (competitionId: string) => {
    return service.subscribeToLeaderboard(competitionId, (updatedLeaderboard) => {
      setLeaderboards(prev => new Map(prev).set(competitionId, updatedLeaderboard));
    });
  };

  const calculateTimeRemaining = (endDate: Date): string => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const updateCountdowns = () => {
    setCompetitions(prev => prev.map(comp => ({
      ...comp,
      timeRemaining: calculateTimeRemaining(comp.endDate)
    })));
  };

  const handleJoinCompetition = async (competitionId: string, entryFee: number) => {
    try {
      const result = await service.joinCompetition(competitionId, userId, `portfolio_${userId}`);
      setSuccessMessage(result.message || 'Successfully joined competition');
      loadCompetitions();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join competition');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleViewDetails = async (competitionId: string) => {
    try {
      const comp = await service.getCompetitionById(competitionId);
      setSelectedCompetition(comp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load competition details');
    }
  };

  const handleCreateCompetition = async () => {
    const errors: Record<string, string> = {};

    if (!createForm.name) errors.name = 'Competition name is required';
    if (createForm.entryFee < 0) errors.entryFee = 'Entry fee must be positive';
    if (createForm.prizePool <= 0) errors.prizePool = 'Prize pool must be positive';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const result = await service.createCompetition({
        ...createForm,
        creatorId: userId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      setSuccessMessage('Competition created successfully!');
      if (result.inviteCode) {
        setSuccessMessage(`Competition created successfully! Invite Code: ${result.inviteCode}`);
      }
      setShowCreateModal(false);
      loadCompetitions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create competition');
    }
  };

  const filteredCompetitions = useMemo(() => {
    if (filterType === 'ALL') return competitions;
    return competitions.filter(comp => comp.type === filterType);
  }, [competitions, filterType]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getTrophyIcon = (rank: number): string | null => {
    switch (rank) {
      case 1: return 'trophy-gold';
      case 2: return 'trophy-silver';
      case 3: return 'trophy-bronze';
      default: return null;
    }
  };

  return (
    <div className="competition-dashboard">
      <div className="dashboard-header">
        <h1>Competitions</h1>
        {isAdmin && (
          <button
            className="btn-create"
            onClick={() => setShowCreateModal(true)}
          >
            Create Competition
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="tabs" role="tablist" aria-label="Competition sections">
        <button
          role="tab"
          aria-selected={activeTab === 'active'}
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Competitions
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'my'}
          className={`tab ${activeTab === 'my' ? 'active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          My Competitions
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'stats'}
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
      </div>

      {activeTab === 'active' && (
        <div className="active-competitions">
          <div className="filter-section">
            <label htmlFor="filter-type">Filter by type</label>
            <select
              id="filter-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="DAILY_PNL">Daily P&L</option>
              <option value="WEEKLY_ROI">Weekly ROI</option>
              <option value="MONTHLY_VOLUME">Monthly Volume</option>
            </select>
          </div>

          <div className="competitions-grid">
            {filteredCompetitions.map(comp => (
              <div key={comp.id} className="competition-card">
                <h3>{comp.name}</h3>
                <div className="comp-details">
                  <p>Type: {String(comp.type).replace(/_/g, ' ')}</p>
                  <p>Participants: {comp.participants || comp.currentParticipants || 0} / {comp.maxParticipants}</p>
                  <p>Prize Pool: {formatCurrency(comp.prizePool)}</p>
                  <p>Time remaining: {comp.timeRemaining}</p>
                </div>

                <div className="comp-actions">
                  {(comp.participants || comp.currentParticipants || 0) < comp.maxParticipants ? (
                    <button
                      className="btn-join"
                      onClick={() => handleJoinCompetition(comp.id, comp.entryFee)}
                    >
                      Join ({formatCurrency(comp.entryFee)})
                    </button>
                  ) : (
                    <button className="btn-full" disabled>Full</button>
                  )}
                  <button
                    className="btn-details"
                    onClick={() => handleViewDetails(comp.id)}
                  >
                    View Details
                  </button>
                </div>

                <div className="leaderboard-preview" data-testid="leaderboard-preview">
                  <h4>Top 5</h4>
                  {leaderboards.get(comp.id)?.map(entry => (
                    <div
                      key={entry.userId}
                      className={`leaderboard-row ${entry.userId === userId ? 'highlight' : ''}`}
                      data-testid={`leaderboard-row-${entry.userId}`}
                    >
                      <span className="rank">#{entry.rank}</span>
                      {getTrophyIcon(entry.rank) && (
                        <span data-testid={getTrophyIcon(entry.rank)!} className="trophy-icon">🏆</span>
                      )}
                      <span className="username">{entry.userId === userId ? 'You' : entry.username}</span>
                      <span className="score">{entry.score}</span>
                      {entry.previousRank && entry.previousRank !== entry.rank && (
                        <span
                          className="position-change"
                          data-testid={entry.previousRank > entry.rank ? 'position-change-up' : 'position-change-down'}
                        >
                          {entry.previousRank > entry.rank ? '+' : ''}{entry.previousRank - entry.rank}
                        </span>
                      )}
                    </div>
                  ))}
                  <button
                    className="btn-view-full"
                    onClick={() => onNavigate?.(`/competitions/${comp.id}/leaderboard`)}
                  >
                    View Full Leaderboard
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'my' && (
        <div className="my-competitions">
          {myCompetitions.map(participation => (
            <div key={participation.competitionId} className="my-comp-card">
              <h3>{participation.competitionName}</h3>
              <div className="my-comp-stats">
                <div className="stat">
                  <span>Rank</span>
                  <span className="value">#{participation.rank || participation.currentRank || 0}</span>
                  {getTrophyIcon(participation.rank || participation.currentRank || 0) && (
                    <span data-testid={getTrophyIcon(participation.rank || participation.currentRank || 0)!} className="trophy-icon">🏆</span>
                  )}
                </div>
                <div className="stat">
                  <span>P&L</span>
                  <span className="value">{(participation.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(participation.pnl || 0)}</span>
                </div>
                <div className="stat">
                  <span>ROI</span>
                  <span className="value">{formatPercentage(participation.roi || 0)}</span>
                </div>
                <div className="stat">
                  <span>Score</span>
                  <span className="value">{participation.score}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'stats' && stats && (
        <div className="competition-stats">
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Total Competitions</h4>
              <p className="stat-value">{stats.totalCompetitions}</p>
            </div>
            <div className="stat-card">
              <h4>Wins</h4>
              <p className="stat-value">{stats.wins}</p>
            </div>
            <div className="stat-card">
              <h4>Top 3 Finishes</h4>
              <p className="stat-value">{stats.top3Finishes}</p>
            </div>
            <div className="stat-card">
              <h4>Total Earnings</h4>
              <p className="stat-value">{formatCurrency(stats.totalEarnings)}</p>
            </div>
            <div className="stat-card">
              <h4>Win Rate</h4>
              <p className="stat-value">{formatPercentage(stats.winRate)}</p>
            </div>
            <div className="stat-card">
              <h4>Current Streak</h4>
              <p className="stat-value">{stats.currentStreak}</p>
            </div>
          </div>
          <div className="chart-container" data-testid="competition-history-chart">
            <h3>Competition Performance</h3>
          </div>
        </div>
      )}

      {selectedCompetition && (
        <div className="modal-overlay" onClick={() => setSelectedCompetition(null)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>{selectedCompetition.name}</h2>
            <p>{selectedCompetition.description}</p>

            <div className="modal-section">
              <h3>Prize Distribution</h3>
              {selectedCompetition.prizes?.map((prize, idx) => (
                <p key={idx}>
                  {typeof prize.position === 'number' ? `${prize.position}${prize.position === 1 ? 'st' : prize.position === 2 ? 'nd' : prize.position === 3 ? 'rd' : 'th'}` : prize.position} Place: {formatCurrency(prize.amount)}
                </p>
              ))}
            </div>

            <div className="modal-section">
              <h3>Competition Rules</h3>
              {selectedCompetition.rules && (
                <>
                  {selectedCompetition.rules.minTrades && (
                    <p>Minimum trades: {selectedCompetition.rules.minTrades}</p>
                  )}
                  {selectedCompetition.rules.maxLeverage && (
                    <p>Maximum leverage: {selectedCompetition.rules.maxLeverage}x</p>
                  )}
                  {selectedCompetition.rules.minBalance && (
                    <p>Minimum balance: {formatCurrency(selectedCompetition.rules.minBalance)}</p>
                  )}
                  {selectedCompetition.rules.allowShort !== undefined && (
                    <p>Short selling: {selectedCompetition.rules.allowShort ? 'Allowed' : 'Not allowed'}</p>
                  )}
                </>
              )}
            </div>

            <button className="btn-close" onClick={() => setSelectedCompetition(null)}>Close</button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
            <h2>Create Competition</h2>

            <div className="form-group">
              <label htmlFor="comp-name">Competition Name</label>
              <input
                id="comp-name"
                type="text"
                value={createForm.name}
                onChange={e => setCreateForm({...createForm, name: e.target.value})}
              />
              {formErrors.name && <span className="error">{formErrors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="comp-type">Competition Type</label>
              <select
                id="comp-type"
                value={createForm.type}
                onChange={e => setCreateForm({...createForm, type: e.target.value})}
              >
                <option value="DAILY_PNL">Daily P&L</option>
                <option value="WEEKLY_ROI">Weekly ROI</option>
                <option value="MONTHLY_VOLUME">Monthly Volume</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="entry-fee">Entry Fee</label>
              <input
                id="entry-fee"
                type="number"
                value={createForm.entryFee}
                onChange={e => setCreateForm({...createForm, entryFee: Number(e.target.value)})}
              />
              {formErrors.entryFee && <span className="error">{formErrors.entryFee}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="prize-pool">Prize Pool</label>
              <input
                id="prize-pool"
                type="number"
                value={createForm.prizePool}
                onChange={e => setCreateForm({...createForm, prizePool: Number(e.target.value)})}
              />
              {formErrors.prizePool && <span className="error">{formErrors.prizePool}</span>}
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={createForm.isPrivate}
                  onChange={e => setCreateForm({...createForm, isPrivate: e.target.checked})}
                />
                Private Competition
              </label>
            </div>

            <div className="modal-actions">
              <button onClick={handleCreateCompetition}>Create</button>
              <button onClick={() => setShowCreateModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};