import { useEffect, useState } from 'react';
import { Plus, Trophy, TrendingUp, Users, Calendar, Filter, Search } from 'lucide-react';
import { useCompetitionStore } from '../stores/competitionStore';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { CreateCompetitionModal } from '../components/competitions/CreateCompetitionModal';
import { CompetitionCard } from '../components/competitions/CompetitionCard';
import { LeaderboardTable } from '../components/competitions/LeaderboardTable';
import { CompetitionType, CompetitionStatus, ScoringMetric } from '../services/competition.service';

export function CompetitionsPage() {
  const { user } = useAuthStore();
  const { groups, fetchGroups } = useChatStore();
  const {
    competitions,
    activeCompetitions,
    upcomingCompetitions,
    myCompetitions,
    globalLeaderboard,
    userStats,
    selectedGroupId,
    isLoading,
    error,
    fetchCompetitions,
    fetchActiveCompetitions,
    fetchUpcomingCompetitions,
    fetchMyCompetitions,
    fetchGlobalLeaderboard,
    fetchUserStats,
    joinCompetition,
    setSelectedGroup
  } = useCompetitionStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'my' | 'completed'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<CompetitionType | 'all'>('all');

  useEffect(() => {
    // Fetch initial data
    const loadData = async () => {
      if (!user) return;

      await fetchGroups();
      await fetchUserStats(user.id);
      await fetchMyCompetitions(user.id);
      await fetchGlobalLeaderboard(ScoringMetric.TOTAL_RETURN, 'monthly');

      // Set default group if available
      if (groups.length > 0 && !selectedGroupId) {
        setSelectedGroup(groups[0].id);
      }
    };

    loadData();
  }, [user]);

  useEffect(() => {
    // Fetch competitions when group changes
    if (selectedGroupId) {
      fetchActiveCompetitions(selectedGroupId);
      fetchUpcomingCompetitions(selectedGroupId);
    }
  }, [selectedGroupId]);

  const handleJoinCompetition = async (competitionId: string) => {
    if (!user) {
      alert('Please login to join competitions');
      return;
    }

    try {
      await joinCompetition(competitionId);
      alert('Successfully joined competition!');
      // Refresh data
      await fetchMyCompetitions(user.id);
      await fetchActiveCompetitions(selectedGroupId || undefined);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to join competition');
    }
  };

  const getFilteredCompetitions = () => {
    let comps = activeTab === 'active' ? activeCompetitions :
                activeTab === 'upcoming' ? upcomingCompetitions :
                activeTab === 'my' ? myCompetitions.map(e => ({
                  ...competitions.find(c => c.id === e.competitionId),
                  isJoined: true
                })).filter(Boolean) :
                competitions.filter(c => c.status === CompetitionStatus.COMPLETED);

    if (searchQuery) {
      comps = comps.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      comps = comps.filter(c => c.type === filterType);
    }

    return comps;
  };

  const myJoinedCompetitionIds = new Set(myCompetitions.map(c => c.competitionId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Competitions</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Competition
        </button>
      </div>

      {/* Stats Overview */}
      {userStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Competitions</p>
                <p className="text-2xl font-bold text-foreground">{userStats.totalCompetitions}</p>
              </div>
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Wins</p>
                <p className="text-2xl font-bold text-foreground">{userStats.wins}</p>
              </div>
              <span className="text-3xl">🥇</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {(userStats.winRate * 100).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">
                  ${userStats.totalEarnings.toFixed(2)}
                </p>
              </div>
              <span className="text-3xl">💰</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Competitions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Group Selector */}
          {groups.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">Group Competitions</h3>
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
                  onClick={() => setActiveTab('active')}
                  className={`flex-1 px-3 py-2 rounded-md transition-colors ${
                    activeTab === 'active'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`flex-1 px-3 py-2 rounded-md transition-colors ${
                    activeTab === 'upcoming'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setActiveTab('my')}
                  className={`flex-1 px-3 py-2 rounded-md transition-colors ${
                    activeTab === 'my'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  My Competitions
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`flex-1 px-3 py-2 rounded-md transition-colors ${
                    activeTab === 'completed'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search competitions..."
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
                <option value="all">All Types</option>
                <option value={CompetitionType.WEEKLY_PNL}>Weekly P&L</option>
                <option value={CompetitionType.MONTHLY_ROI}>Monthly ROI</option>
                <option value={CompetitionType.BEST_TRADE}>Best Trade</option>
                <option value={CompetitionType.CONSISTENCY}>Consistency</option>
                <option value={CompetitionType.CUSTOM}>Custom</option>
              </select>
            </div>
          </div>

          {/* Competitions List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500">{error}</p>
              </div>
            ) : getFilteredCompetitions().length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No competitions found</p>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'my'
                    ? "You haven't joined any competitions yet"
                    : "Create a new competition or check back later"}
                </p>
              </div>
            ) : (
              getFilteredCompetitions().map(competition => (
                <CompetitionCard
                  key={competition.id}
                  competition={competition}
                  isJoined={myJoinedCompetitionIds.has(competition.id)}
                  onJoin={() => handleJoinCompetition(competition.id)}
                  onView={() => {
                    // Navigate to competition details
                    // navigate(`/competitions/${competition.id}`);
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column - Leaderboard & Info */}
        <div className="space-y-6">
          {/* Global Leaderboard */}
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">Global Leaderboard</h3>
              <p className="text-sm text-muted-foreground mt-1">Top traders this month</p>
            </div>
            <div className="p-4">
              <LeaderboardTable
                entries={globalLeaderboard.slice(0, 5)}
                currentUserId={user?.id}
                showFullDetails={false}
              />
            </div>
          </div>

          {/* Competition Types Info */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Competition Types</h3>
            <div className="space-y-2">
              <div className="p-3 bg-secondary rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📈</span>
                  <div>
                    <div className="font-medium text-sm">Weekly P&L</div>
                    <div className="text-xs text-muted-foreground">Highest profit in a week</div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📊</span>
                  <div>
                    <div className="font-medium text-sm">Monthly ROI</div>
                    <div className="text-xs text-muted-foreground">Best return on investment</div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🎯</span>
                  <div>
                    <div className="font-medium text-sm">Best Trade</div>
                    <div className="text-xs text-muted-foreground">Single best performing trade</div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🛡️</span>
                  <div>
                    <div className="font-medium text-sm">Consistency</div>
                    <div className="text-xs text-muted-foreground">Most stable returns</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {myCompetitions.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Your Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Competitions</span>
                  <span className="font-medium text-foreground">
                    {myCompetitions.filter(c => !c.isDisqualified).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Rank</span>
                  <span className="font-medium text-foreground">
                    {userStats?.avgPosition.toFixed(1) || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Streak</span>
                  <span className="font-medium text-foreground">
                    {userStats?.currentStreak || 0} wins
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Competition Modal */}
      <CreateCompetitionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}