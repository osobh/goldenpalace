import React, { useState, useEffect, useMemo } from 'react';
import { GamificationService } from '../../services/gamification.service';
import './GamificationPanel.css';

interface GamificationPanelProps {
  service: GamificationService;
  userId: string;
  showNotifications?: boolean;
}

interface UserProgress {
  userId: string;
  level: number;
  totalXP: number;
  currentLevelXP: number;
  prestigeLevel: number;
  levelUpEvents: any[];
  lastActivity: Date;
}

interface Challenge {
  id: string;
  type?: string;
  name: string;
  description: string;
  progress: number;
  maxProgress: number;
  xpReward: number;
  completed: boolean;
  claimed?: boolean;
  expiresAt?: Date;
  bonusReward?: any;
}

interface Achievement {
  id: string;
  name: string;
  description?: string;
  category: string;
  rarity: string;
  xpReward?: number;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

interface Quest {
  id: string;
  name: string;
  description?: string;
  duration: string;
  stages: any[];
  currentStage: number;
  stagesCompleted: number;
  xpReward: number;
  bonusRewards?: any[];
  completed: boolean;
  expiresAt?: Date;
}

export const GamificationPanel: React.FC<GamificationPanelProps> = ({
  service,
  userId,
  showNotifications = false
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'challenges' | 'achievements' | 'quests' | 'leaderboard' | 'stats'>('overview');
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [levelProgress, setLevelProgress] = useState<any>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [nearbyCompetitors, setNearbyCompetitors] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [xpSources, setXpSources] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [achievementFilter, setAchievementFilter] = useState('ALL');

  useEffect(() => {
    loadUserProgress();
    if (showNotifications) {
      checkNotifications();
    }
  }, [userId]);

  useEffect(() => {
    switch (activeTab) {
      case 'challenges':
        loadChallenges();
        break;
      case 'achievements':
        loadAchievements();
        break;
      case 'quests':
        loadQuests();
        break;
      case 'leaderboard':
        loadLeaderboard();
        break;
      case 'stats':
        loadStatistics();
        break;
    }
  }, [activeTab]);

  const loadUserProgress = async () => {
    try {
      setLoading(true);
      const progress = await service.getUserProgress(userId);
      const levelProg = service.getLevelProgress(progress.totalXP);
      setUserProgress(progress);
      setLevelProgress(levelProg);

      if (progress.levelUpEvents.length > 0) {
        const lastEvent = progress.levelUpEvents[progress.levelUpEvents.length - 1];
        if (Date.now() - new Date(lastEvent.timestamp).getTime() < 5000) {
          setShowLevelUpAnimation(true);
          setTimeout(() => setShowLevelUpAnimation(false), 3000);
        }
      }
    } catch (error) {
      console.error('Failed to load user progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChallenges = async () => {
    try {
      const data = await service.getDailyChallenges(userId);
      setChallenges(data);
    } catch (error) {
      console.error('Failed to load challenges:', error);
    }
  };

  const loadAchievements = async () => {
    try {
      const data = await service.getAchievementProgress(userId);
      setAchievements(data);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  };

  const loadQuests = async () => {
    try {
      const data = await service.getWeeklyQuests(userId);
      setQuests(data);
    } catch (error) {
      console.error('Failed to load quests:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const global = await service.getGlobalLeaderboard?.();
      const nearby = await service.getNearbyCompetitors?.(userId);
      setLeaderboard(global || []);
      setNearbyCompetitors(nearby || []);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await service.getUserStatistics?.(userId);
      const sources = await service.getXPSourceStats(userId);
      setStatistics(stats);
      setXpSources(sources);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const checkNotifications = async () => {
    try {
      const recentXP = await service.getRecentXPGains?.(userId);
      const levelUpCheck = await service.checkForLevelUp?.(userId);

      const newNotifications = [];
      if (recentXP && recentXP.length > 0) {
        newNotifications.push(...recentXP.map((xp: any) => ({
          type: 'xp',
          ...xp
        })));
      }

      if (levelUpCheck?.leveledUp) {
        newNotifications.push({
          type: 'levelup',
          ...levelUpCheck
        });
      }

      setNotifications(newNotifications);
    } catch (error) {
      console.error('Failed to check notifications:', error);
    }
  };

  const handleClaimChallenge = async (challengeId: string) => {
    try {
      const result = await service.completeChallenge(userId, challengeId);
      if (result.bonusReward) {
        setNotifications(prev => [...prev, {
          type: 'reward',
          xpAwarded: result.xpAwarded,
          bonusReward: result.bonusReward
        }]);
      }
      loadChallenges();
      loadUserProgress();
    } catch (error) {
      console.error('Failed to claim challenge:', error);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatTimeRemaining = (expiresAt: Date): string => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  const filteredAchievements = useMemo(() => {
    if (achievementFilter === 'ALL') return achievements;
    return achievements.filter(a => a.category === achievementFilter);
  }, [achievements, achievementFilter]);

  const userRank = useMemo(() => {
    const entry = leaderboard.find(e => e.userId === userId);
    return entry?.rank || 0;
  }, [leaderboard, userId]);

  const xpToNextRank = useMemo(() => {
    if (userRank === 0 || userRank === 1) return 0;
    const currentEntry = leaderboard.find(e => e.userId === userId);
    const aboveEntry = leaderboard.find(e => e.rank === userRank - 1);
    if (!currentEntry || !aboveEntry) return 0;
    return aboveEntry.score - currentEntry.score;
  }, [leaderboard, userId, userRank]);

  if (loading) {
    return <div className="gamification-loading">Loading gamification data...</div>;
  }

  return (
    <div className="gamification-panel">
      {showLevelUpAnimation && (
        <div className="level-up-animation" data-testid="level-up-animation">
          <div className="level-up-content">
            <h2>Level Up!</h2>
            <p>You reached Level {userProgress?.level}!</p>
          </div>
        </div>
      )}

      {notifications.map((notif, idx) => {
        if (notif.type === 'xp') {
          return (
            <div key={idx} className="xp-notification" data-testid="xp-notification">
              <span className="xp-amount">+{notif.xpAwarded} XP</span>
              <span className="xp-action">{notif.action?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
            </div>
          );
        }
        if (notif.type === 'levelup') {
          return (
            <div key={idx} className="level-up-notification" data-testid="level-up-notification">
              <h3>Level Up!</h3>
              <p>You reached Level {notif.newLevel}!</p>
              {notif.rewards?.map((reward: any, ridx: number) => (
                <p key={ridx}>{reward.type}: {reward.value}</p>
              ))}
            </div>
          );
        }
        if (notif.type === 'reward') {
          return (
            <div key={idx} className="reward-notification">
              <span>+{notif.xpAwarded} XP</span>
              {notif.bonusReward && (
                <span>{notif.bonusReward.type} Earned: {notif.bonusReward.value}</span>
              )}
            </div>
          );
        }
        return null;
      })}

      <div className="panel-header">
        <div className="user-info">
          <div className="level-display">
            <span className="level-text">Level {userProgress?.level}</span>
            {userProgress?.prestigeLevel && userProgress.prestigeLevel > 0 && (
              <span className="prestige-badge" data-testid="prestige-badge">
                Prestige {userProgress.prestigeLevel}
              </span>
            )}
          </div>
          <div className="xp-display">
            <span>{formatNumber(userProgress?.totalXP || 0)} XP</span>
          </div>
        </div>

        {levelProgress && (
          <div className="xp-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                data-testid="xp-progress-bar"
                style={{ width: `${levelProgress.progressPercentage}%` }}
              />
            </div>
            <span className="progress-text">
              {formatNumber(levelProgress.currentXP)} / {formatNumber(levelProgress.currentXP + levelProgress.xpToNextLevel)} XP
            </span>
          </div>
        )}
      </div>

      <div className="panel-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'challenges'}
          className={activeTab === 'challenges' ? 'active' : ''}
          onClick={() => setActiveTab('challenges')}
        >
          Challenges
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'achievements'}
          className={activeTab === 'achievements' ? 'active' : ''}
          onClick={() => setActiveTab('achievements')}
        >
          Achievements
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'quests'}
          className={activeTab === 'quests' ? 'active' : ''}
          onClick={() => setActiveTab('quests')}
        >
          Quests
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'leaderboard'}
          className={activeTab === 'leaderboard' ? 'active' : ''}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'stats'}
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'overview' && (
          <div className="overview-content">
            <h3>Welcome back, Trader!</h3>
            <p>Continue your journey to become a master trader.</p>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="challenges-content">
            {challenges.map(challenge => (
              <div
                key={challenge.id}
                className={`challenge-card ${challenge.completed ? 'completed' : ''}`}
                data-testid={`challenge-${challenge.id}`}
              >
                <div className="challenge-header">
                  <h4>{challenge.name}</h4>
                  <span className="xp-reward">{challenge.xpReward} XP</span>
                </div>
                <p className="challenge-description">{challenge.description}</p>
                <div className="challenge-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${(challenge.progress / challenge.maxProgress) * 100}%` }}
                    />
                  </div>
                  <span className="progress-text">
                    {challenge.type === 'PROFIT_TARGET' && challenge.maxProgress > 100
                      ? `$${challenge.progress} / $${challenge.maxProgress}`
                      : `${challenge.progress} / ${challenge.maxProgress}`}
                  </span>
                </div>
                {challenge.expiresAt && (
                  <span className="time-remaining">{formatTimeRemaining(challenge.expiresAt)}</span>
                )}
                {challenge.completed && (
                  <>
                    <span className="completed-badge">✓ Completed</span>
                    {!challenge.claimed && (
                      <button onClick={() => handleClaimChallenge(challenge.id)}>
                        Claim Reward
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="achievements-content">
            <select
              role="combobox"
              aria-label="Filter by category"
              value={achievementFilter}
              onChange={e => setAchievementFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="TRADING">Trading</option>
              <option value="PROFIT">Profit</option>
              <option value="SOCIAL">Social</option>
              <option value="COMPETITION">Competition</option>
              <option value="LEARNING">Learning</option>
            </select>

            <div className="achievements-grid">
              {filteredAchievements.map(achievement => (
                <div
                  key={achievement.id}
                  className={`achievement-card ${achievement.unlocked ? 'unlocked' : ''}`}
                  data-testid={`achievement-${achievement.id}`}
                >
                  <div className={`rarity-badge rarity-${achievement.rarity.toLowerCase()}`} data-testid={`rarity-${achievement.rarity}`}>
                    {achievement.rarity}
                  </div>
                  <h4>{achievement.name}</h4>
                  <p>{achievement.description}</p>
                  {!achievement.unlocked && achievement.progress !== undefined && achievement.maxProgress && (
                    <div className="achievement-progress">
                      {achievement.maxProgress > 100 ? (
                        <span>{Math.round((achievement.progress / achievement.maxProgress) * 100)}%</span>
                      ) : (
                        <span>{achievement.progress} / {achievement.maxProgress}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'quests' && (
          <div className="quests-content">
            {quests.map(quest => (
              <div key={quest.id} className="quest-card">
                <h4>{quest.name}</h4>
                <p>{quest.description}</p>
                <div className="quest-stages">
                  <span>Stage {quest.currentStage + 1} of {quest.stages.length}</span>
                  <div className="stages-display">
                    {quest.stages.map((stage, idx) => (
                      <div
                        key={idx}
                        className={`stage-indicator ${
                          stage.completed ? 'completed' :
                          idx === quest.currentStage ? 'in-progress' : 'locked'
                        }`}
                        data-testid={`quest-stage-${idx}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="quest-rewards">
                  <span>{formatNumber(quest.xpReward)} XP</span>
                  {quest.bonusRewards?.map((reward, idx) => (
                    <span key={idx}>{reward.type}: {reward.value}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="leaderboard-content">
            {userRank > 0 && (
              <div className="user-rank-display">
                <h3>Your Rank: #{userRank}</h3>
                <span>{formatNumber(leaderboard.find(e => e.userId === userId)?.score || 0)} XP</span>
              </div>
            )}

            {nearbyCompetitors.length > 0 && (
              <div className="nearby-competitors">
                <h4>Nearby Competitors</h4>
                {nearbyCompetitors.map(entry => (
                  <div
                    key={entry.userId}
                    className={`competitor-row ${entry.userId === userId ? 'highlight' : ''}`}
                    data-testid={`leaderboard-${entry.userId}`}
                  >
                    <span>#{entry.rank}</span>
                    <span>{entry.userId === userId ? 'You' : entry.username}</span>
                    <span>{formatNumber(entry.score)} XP</span>
                  </div>
                ))}
                {xpToNextRank > 0 && (
                  <p>+{formatNumber(xpToNextRank)} XP to rank up</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && statistics && (
          <div className="stats-content">
            <div className="stats-grid">
              <div className="stat-item">
                <span>Total XP Earned</span>
                <span>{formatNumber(statistics.totalXPEarned || 0)}</span>
              </div>
              <div className="stat-item">
                <span>Daily Average</span>
                <span>{formatNumber(statistics.dailyAverage || 0)} XP</span>
              </div>
              <div className="stat-item">
                <span>Current Streak</span>
                <span>{statistics.currentStreak || 0} days</span>
              </div>
            </div>

            {xpSources && (
              <div className="xp-sources" data-testid="xp-sources-chart">
                <h4>XP Sources</h4>
                {Object.entries(xpSources).map(([source, amount]) => (
                  <p key={source}>
                    {source.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}: {formatNumber(amount as number)} XP
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};