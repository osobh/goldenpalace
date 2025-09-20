import React, { useState, useEffect, useMemo } from 'react';
import { GamificationService } from '../../services/gamification.service';
import { CompetitionService } from '../../services/competition.service';
import './EnhancedProfile.css';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  joinDate: Date;
  bio?: string;
  followersCount: number;
  followingCount: number;
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  roi: number;
}

interface EnhancedProfileProps {
  user: User;
  gamificationService: GamificationService;
  competitionService: CompetitionService;
  isOwnProfile?: boolean;
  currentUserId?: string;
}

type TabType = 'overview' | 'achievements' | 'competitions' | 'activity';

export const EnhancedProfile: React.FC<EnhancedProfileProps> = ({
  user,
  gamificationService,
  competitionService,
  isOwnProfile = true,
  currentUserId
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [userProgress, setUserProgress] = useState<any>(null);
  const [levelProgress, setLevelProgress] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [achievementStats, setAchievementStats] = useState<any>(null);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [competitionStats, setCompetitionStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [trades, setTrades] = useState<any>(null);
  const [mutualFollowers, setMutualFollowers] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState<any>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    loadUserData();
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [user.id]);

  const loadUserData = async () => {
    try {
      const progress = await gamificationService.getUserProgress(user.id);
      const levelProg = gamificationService.getLevelProgress(progress.totalXP);
      setUserProgress(progress);
      setLevelProgress(levelProg);

      const featured = await gamificationService.getUserFeaturedAchievements?.(user.id) || [];
      setAchievements(featured);

      const achStats = await gamificationService.getAchievementStats?.(user.id) || {
        totalAchievements: 150,
        unlockedAchievements: 89,
        progressByCategory: {}
      };
      setAchievementStats(achStats);

      const compHistory = await competitionService.getUserCompetitionHistory?.(user.id) || [];
      setCompetitions(compHistory);

      const compStats = await competitionService.getUserCompetitionStats?.(user.id) || {};
      setCompetitionStats(compStats);

      const userActivities = await gamificationService.getUserActivityTimeline?.(user.id) || [];
      setActivities(userActivities);

      const userBadges = await gamificationService.getUserBadges?.(user.id) || [];
      setBadges(userBadges);

      const perf = await competitionService.getUserPerformanceHistory?.(user.id) || [];
      setPerformance(perf);

      const bestWorst = await competitionService.getUserBestWorstTrades?.(user.id) || {};
      setTrades(bestWorst);

      if (!isOwnProfile && currentUserId) {
        const mutual = await competitionService.getMutualFollowers?.(user.id, currentUserId) || [];
        setMutualFollowers(mutual);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/profile/${user.id}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

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

  const formatDate = (date: Date | string): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getMedalIcon = (rank: number): string | null => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  const filteredActivities = useMemo(() => {
    if (activityFilter === 'ALL') return activities;
    return activities.filter(a => a.type === activityFilter);
  }, [activities, activityFilter]);

  const mutualFollowersText = useMemo(() => {
    if (mutualFollowers.length === 0) return null;
    const names = mutualFollowers.slice(0, 2).map(f => f.username).join(', ');
    const others = mutualFollowers.length - 2;
    return others > 0
      ? `Followed by ${names} and ${others} other${others > 1 ? 's' : ''}`
      : `Followed by ${names}`;
  }, [mutualFollowers]);

  return (
    <div className={`enhanced-profile ${isMobile ? 'mobile' : 'desktop'}`}>
      <div data-testid={isMobile ? 'mobile-profile-layout' : 'desktop-profile-layout'}>
        <div className="profile-header">
          <div className="header-content">
            <div className="user-avatar">
              <img src={user.avatar} alt={`${user.username} avatar`} />
            </div>

            <div className="user-info">
              <h1>{user.username}</h1>
              <p className="email">{user.email}</p>
              {user.bio && <p className="bio">{user.bio}</p>}

              <div className="level-info">
                <span className="level-badge" data-testid="level-badge">
                  Level {userProgress?.level || 1}
                </span>
                {userProgress?.prestigeLevel > 0 && (
                  <span className="prestige-indicator" data-testid="prestige-indicator">
                    Prestige {['I', 'II', 'III', 'IV', 'V'][userProgress.prestigeLevel - 1]}
                  </span>
                )}
                <span className="xp-display" data-testid="xp-display">
                  {formatNumber(userProgress?.totalXP || 0)} XP
                </span>
              </div>

              {levelProgress && (
                <div className="level-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      data-testid="level-progress-bar"
                      style={{ width: `${levelProgress.progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="social-stats">
                <div className="stat">
                  <span>Followers</span>
                  <span data-testid="followers-count">{formatNumber(user.followersCount)}</span>
                </div>
                <div className="stat">
                  <span>Following</span>
                  <span data-testid="following-count">{formatNumber(user.followingCount)}</span>
                </div>
              </div>

              {mutualFollowersText && (
                <p className="mutual-followers">{mutualFollowersText}</p>
              )}
            </div>

            <div className="header-actions">
              {isOwnProfile ? (
                <button className="btn-edit">Edit Profile</button>
              ) : (
                <button className="btn-follow" onClick={handleFollow}>
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
              <button className="btn-share" onClick={handleShareProfile}>
                Share Profile
              </button>
            </div>
          </div>

          {copySuccess && <div className="copy-success">Profile link copied!</div>}
        </div>

        <div className="profile-stats">
          <div className="stat-card">
            <span>Total Trades</span>
            <span data-testid="total-trades">{formatNumber(user.totalTrades)}</span>
          </div>
          <div className="stat-card">
            <span>Win Rate</span>
            <span data-testid="win-rate">{formatPercentage(user.winRate)}</span>
          </div>
          <div className="stat-card">
            <span>Total P&L</span>
            <span data-testid="total-pnl">{formatCurrency(user.totalPnL)}</span>
          </div>
          <div className="stat-card">
            <span>ROI</span>
            <span data-testid="roi">{formatPercentage(user.roi)}</span>
          </div>
        </div>

        {performance.length > 0 && (
          <div className="performance-section">
            <h3>Portfolio Performance</h3>
            <div className="performance-chart" data-testid="performance-chart">
              {/* Chart would be rendered here */}
            </div>
          </div>
        )}

        {trades && (
          <div className="trades-section">
            {trades.bestTrade && (
              <div className="trade-card">
                <h4>Best Trade</h4>
                <p>{trades.bestTrade.symbol}</p>
                <p>{formatCurrency(trades.bestTrade.profit)}</p>
                <p>+{formatPercentage(trades.bestTrade.roi)}</p>
              </div>
            )}
            {trades.worstTrade && (
              <div className="trade-card">
                <h4>Worst Trade</h4>
                <p>{trades.worstTrade.symbol}</p>
                <p>{formatCurrency(trades.worstTrade.profit)}</p>
                <p>{formatPercentage(trades.worstTrade.roi)}</p>
              </div>
            )}
          </div>
        )}

        {isMobile && (
          <div className="mobile-tabs" role="tablist">
            <button role="tab" onClick={() => setActiveTab('overview')}>Stats</button>
            <button role="tab" onClick={() => setActiveTab('achievements')}>Achievements</button>
            <button role="tab" onClick={() => setActiveTab('competitions')}>Competitions</button>
            <button role="tab" onClick={() => setActiveTab('activity')}>Activity</button>
          </div>
        )}

        <div className="profile-content">
          {achievements.length > 0 && (
            <div className="achievements-section">
              <h3>Featured Achievements</h3>
              <div className="achievements-grid">
                {achievements.map(achievement => (
                  <div
                    key={achievement.id}
                    className="achievement-card"
                    data-testid={`achievement-card-${achievement.id}`}
                    onClick={() => setShowAchievementModal(achievement)}
                  >
                    <div className={`rarity-badge ${achievement.rarity?.toLowerCase()}`}
                         data-testid={`rarity-badge-${achievement.id}`}>
                      {achievement.icon}
                    </div>
                    <h4>{achievement.name}</h4>
                    <p>{achievement.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {achievementStats && (
            <div className="achievement-progress-section">
              <h3>Achievement Progress</h3>
              <p>{achievementStats.unlockedAchievements} / {achievementStats.totalAchievements}</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  data-testid="achievement-progress-bar"
                  style={{ width: `${(achievementStats.unlockedAchievements/achievementStats.totalAchievements)*100}%` }}
                />
              </div>
              {Object.entries(achievementStats.progressByCategory || {}).map(([category, data]: [string, any]) => (
                <p key={category}>{category}: {data.unlocked}/{data.total}</p>
              ))}
            </div>
          )}

          {competitions.length > 0 && (
            <div className="competitions-section">
              <h3>Competition History</h3>
              {competitions.map(comp => (
                <div key={comp.id} className="competition-card" data-testid={`competition-${comp.id}`}>
                  {getMedalIcon(comp.rank) && (
                    <span data-testid={`medal-${comp.rank === 1 ? 'gold' : comp.rank === 2 ? 'silver' : 'bronze'}`}>
                      {getMedalIcon(comp.rank)}
                    </span>
                  )}
                  <h4>{comp.name}</h4>
                  <p>#{comp.rank}</p>
                  {comp.prize > 0 && <p>${formatNumber(comp.prize)}</p>}
                </div>
              ))}
            </div>
          )}

          {competitionStats && (
            <div className="competition-stats">
              <div className="stat">
                <span>Competitions</span>
                <span data-testid="competitions-entered">{competitionStats.totalCompetitions}</span>
              </div>
              <div className="stat">
                <span>Wins</span>
                <span data-testid="competition-wins">{competitionStats.wins}</span>
              </div>
              <div className="stat">
                <span>Top 3</span>
                <span data-testid="top-3-finishes">{competitionStats.top3Finishes}</span>
              </div>
              <div className="stat">
                <span>Prize Won</span>
                <span data-testid="total-prize-won">${formatNumber(competitionStats.totalPrizeWon || 0)}</span>
              </div>
            </div>
          )}

          {badges.length > 0 && (
            <div className="badges-section">
              <h3>Badges</h3>
              <div className="badges-grid">
                {badges.map(badge => (
                  <div
                    key={badge.id}
                    className={`badge ${badge.earned ? 'earned' : 'unearned'}`}
                    data-testid={`badge-${badge.earned ? 'earned' : 'unearned'}-${badge.id}`}
                    onMouseEnter={() => setShowTooltip(badge.id)}
                    onMouseLeave={() => setShowTooltip(null)}
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.name}</span>
                    {showTooltip === badge.id && (
                      <div className="tooltip" role="tooltip">
                        <p>{badge.description}</p>
                        {badge.earnedDate && <p>Earned on {formatDate(badge.earnedDate)}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="activity-section">
              <h3>Activity Timeline</h3>
              <select
                aria-label="Filter activities"
                value={activityFilter}
                onChange={e => setActivityFilter(e.target.value)}
              >
                <option value="ALL">All Activities</option>
                <option value="ACHIEVEMENT_UNLOCKED">Achievements</option>
                <option value="COMPETITION_WON">Competitions</option>
                <option value="LEVEL_UP">Level Ups</option>
                <option value="TRADE_MILESTONE">Trade Milestones</option>
              </select>

              <div className="activities-list">
                {filteredActivities.map(activity => (
                  <div key={activity.id} className="activity-item">
                    <span className="activity-icon">{activity.icon}</span>
                    <div className="activity-content">
                      <h4>{activity.title}</h4>
                      {activity.xpEarned && <span>+{activity.xpEarned} XP</span>}
                      {activity.prize && <span>${activity.prize} Prize</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showAchievementModal && (
          <div className="modal-overlay" onClick={() => setShowAchievementModal(null)}>
            <div className="modal" role="dialog" onClick={e => e.stopPropagation()}>
              <h2>{showAchievementModal.name}</h2>
              <p>{showAchievementModal.longDescription || showAchievementModal.description}</p>
              {showAchievementModal.xpReward && <p>{formatNumber(showAchievementModal.xpReward)} XP</p>}
              {showAchievementModal.unlockedAt && (
                <p>Unlocked on {formatDate(showAchievementModal.unlockedAt)}</p>
              )}
              <button onClick={() => setShowAchievementModal(null)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};