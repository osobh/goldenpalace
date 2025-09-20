export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  points: number;
  requirements: AchievementRequirement;
  unlockedBy: string[];
  totalUnlocks: number;
  createdAt: string;
}

export enum AchievementCategory {
  TRADING = 'TRADING',
  PROFIT = 'PROFIT',
  STREAK = 'STREAK',
  RISK = 'RISK',
  SOCIAL = 'SOCIAL',
  COMPETITION = 'COMPETITION',
  LEARNING = 'LEARNING',
  SPECIAL = 'SPECIAL',
}

export enum AchievementRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
  MYTHIC = 'MYTHIC',
}

export interface AchievementRequirement {
  type: RequirementType;
  value: number;
  comparison: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
  period?: 'daily' | 'weekly' | 'monthly' | 'all-time';
  asset?: string;
  strategy?: string;
}

export enum RequirementType {
  TOTAL_TRADES = 'TOTAL_TRADES',
  WINNING_TRADES = 'WINNING_TRADES',
  PROFIT_AMOUNT = 'PROFIT_AMOUNT',
  PROFIT_PERCENTAGE = 'PROFIT_PERCENTAGE',
  WIN_STREAK = 'WIN_STREAK',
  DAILY_STREAK = 'DAILY_STREAK',
  COMPETITIONS_WON = 'COMPETITIONS_WON',
  COMPETITIONS_JOINED = 'COMPETITIONS_JOINED',
  FOLLOWERS = 'FOLLOWERS',
  TRADES_COPIED = 'TRADES_COPIED',
  RISK_RATIO = 'RISK_RATIO',
  PORTFOLIO_VALUE = 'PORTFOLIO_VALUE',
  SINGLE_TRADE_PROFIT = 'SINGLE_TRADE_PROFIT',
  DIVERSITY_SCORE = 'DIVERSITY_SCORE',
  STUDY_TIME = 'STUDY_TIME',
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: string;
  progress: number;
  isCompleted: boolean;
  notified: boolean;
}

export interface AchievementProgress {
  achievement: Achievement;
  currentProgress: number;
  targetValue: number;
  percentageComplete: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export class AchievementService {
  private achievements: Map<string, Achievement> = new Map();
  private userAchievements: Map<string, UserAchievement[]> = new Map();
  private achievementDefinitions: Achievement[] = [];

  constructor() {
    this.initializeAchievements();
  }

  private initializeAchievements(): void {
    this.achievementDefinitions = [
      // Trading Milestones (15 achievements)
      {
        id: 'first-trade',
        name: 'First Steps',
        description: 'Complete your first trade',
        category: AchievementCategory.TRADING,
        rarity: AchievementRarity.COMMON,
        icon: '🎯',
        points: 10,
        requirements: { type: RequirementType.TOTAL_TRADES, value: 1, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'trader-10',
        name: 'Active Trader',
        description: 'Complete 10 trades',
        category: AchievementCategory.TRADING,
        rarity: AchievementRarity.COMMON,
        icon: '📊',
        points: 25,
        requirements: { type: RequirementType.TOTAL_TRADES, value: 10, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'trader-100',
        name: 'Experienced Trader',
        description: 'Complete 100 trades',
        category: AchievementCategory.TRADING,
        rarity: AchievementRarity.UNCOMMON,
        icon: '💼',
        points: 50,
        requirements: { type: RequirementType.TOTAL_TRADES, value: 100, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'trader-1000',
        name: 'Master Trader',
        description: 'Complete 1,000 trades',
        category: AchievementCategory.TRADING,
        rarity: AchievementRarity.RARE,
        icon: '🏆',
        points: 100,
        requirements: { type: RequirementType.TOTAL_TRADES, value: 1000, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'trader-10000',
        name: 'Trading Legend',
        description: 'Complete 10,000 trades',
        category: AchievementCategory.TRADING,
        rarity: AchievementRarity.EPIC,
        icon: '👑',
        points: 500,
        requirements: { type: RequirementType.TOTAL_TRADES, value: 10000, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },

      // Profit Achievements (15 achievements)
      {
        id: 'profit-100',
        name: 'First Profit',
        description: 'Earn $100 in profit',
        category: AchievementCategory.PROFIT,
        rarity: AchievementRarity.COMMON,
        icon: '💵',
        points: 15,
        requirements: { type: RequirementType.PROFIT_AMOUNT, value: 100, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'profit-1k',
        name: 'Profitable Trader',
        description: 'Earn $1,000 in profit',
        category: AchievementCategory.PROFIT,
        rarity: AchievementRarity.COMMON,
        icon: '💰',
        points: 30,
        requirements: { type: RequirementType.PROFIT_AMOUNT, value: 1000, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'profit-10k',
        name: 'Money Maker',
        description: 'Earn $10,000 in profit',
        category: AchievementCategory.PROFIT,
        rarity: AchievementRarity.UNCOMMON,
        icon: '💸',
        points: 75,
        requirements: { type: RequirementType.PROFIT_AMOUNT, value: 10000, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'profit-100k',
        name: 'High Roller',
        description: 'Earn $100,000 in profit',
        category: AchievementCategory.PROFIT,
        rarity: AchievementRarity.RARE,
        icon: '🏦',
        points: 200,
        requirements: { type: RequirementType.PROFIT_AMOUNT, value: 100000, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'profit-1m',
        name: 'Millionaire',
        description: 'Earn $1,000,000 in profit',
        category: AchievementCategory.PROFIT,
        rarity: AchievementRarity.LEGENDARY,
        icon: '💎',
        points: 1000,
        requirements: { type: RequirementType.PROFIT_AMOUNT, value: 1000000, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'single-trade-1k',
        name: 'Big Win',
        description: 'Earn $1,000 from a single trade',
        category: AchievementCategory.PROFIT,
        rarity: AchievementRarity.UNCOMMON,
        icon: '🎰',
        points: 50,
        requirements: { type: RequirementType.SINGLE_TRADE_PROFIT, value: 1000, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'single-trade-10k',
        name: 'Jackpot',
        description: 'Earn $10,000 from a single trade',
        category: AchievementCategory.PROFIT,
        rarity: AchievementRarity.RARE,
        icon: '🎲',
        points: 150,
        requirements: { type: RequirementType.SINGLE_TRADE_PROFIT, value: 10000, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },

      // Streak Achievements (10 achievements)
      {
        id: 'win-streak-3',
        name: 'Hat Trick',
        description: 'Win 3 trades in a row',
        category: AchievementCategory.STREAK,
        rarity: AchievementRarity.COMMON,
        icon: '🔥',
        points: 20,
        requirements: { type: RequirementType.WIN_STREAK, value: 3, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'win-streak-5',
        name: 'On Fire',
        description: 'Win 5 trades in a row',
        category: AchievementCategory.STREAK,
        rarity: AchievementRarity.UNCOMMON,
        icon: '🔥🔥',
        points: 40,
        requirements: { type: RequirementType.WIN_STREAK, value: 5, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'win-streak-10',
        name: 'Unstoppable',
        description: 'Win 10 trades in a row',
        category: AchievementCategory.STREAK,
        rarity: AchievementRarity.RARE,
        icon: '🔥🔥🔥',
        points: 100,
        requirements: { type: RequirementType.WIN_STREAK, value: 10, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'daily-streak-7',
        name: 'Week Warrior',
        description: 'Trade for 7 consecutive days',
        category: AchievementCategory.STREAK,
        rarity: AchievementRarity.COMMON,
        icon: '📅',
        points: 25,
        requirements: { type: RequirementType.DAILY_STREAK, value: 7, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'daily-streak-30',
        name: 'Monthly Grind',
        description: 'Trade for 30 consecutive days',
        category: AchievementCategory.STREAK,
        rarity: AchievementRarity.UNCOMMON,
        icon: '📆',
        points: 75,
        requirements: { type: RequirementType.DAILY_STREAK, value: 30, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'daily-streak-100',
        name: 'Century',
        description: 'Trade for 100 consecutive days',
        category: AchievementCategory.STREAK,
        rarity: AchievementRarity.EPIC,
        icon: '💯',
        points: 300,
        requirements: { type: RequirementType.DAILY_STREAK, value: 100, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },

      // Competition Achievements (10 achievements)
      {
        id: 'competition-join',
        name: 'Competitor',
        description: 'Join your first competition',
        category: AchievementCategory.COMPETITION,
        rarity: AchievementRarity.COMMON,
        icon: '🏁',
        points: 15,
        requirements: { type: RequirementType.COMPETITIONS_JOINED, value: 1, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'competition-top10',
        name: 'Top 10 Finish',
        description: 'Finish in the top 10 of a competition',
        category: AchievementCategory.COMPETITION,
        rarity: AchievementRarity.UNCOMMON,
        icon: '🏅',
        points: 50,
        requirements: { type: RequirementType.COMPETITIONS_WON, value: 0.1, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'competition-podium',
        name: 'Podium Finish',
        description: 'Finish in the top 3 of a competition',
        category: AchievementCategory.COMPETITION,
        rarity: AchievementRarity.RARE,
        icon: '🥉',
        points: 100,
        requirements: { type: RequirementType.COMPETITIONS_WON, value: 0.3, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'competition-win',
        name: 'Champion',
        description: 'Win a competition',
        category: AchievementCategory.COMPETITION,
        rarity: AchievementRarity.EPIC,
        icon: '🥇',
        points: 250,
        requirements: { type: RequirementType.COMPETITIONS_WON, value: 1, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'competition-5wins',
        name: 'Serial Winner',
        description: 'Win 5 competitions',
        category: AchievementCategory.COMPETITION,
        rarity: AchievementRarity.LEGENDARY,
        icon: '🏆🏆',
        points: 500,
        requirements: { type: RequirementType.COMPETITIONS_WON, value: 5, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },

      // Risk Management Achievements (8 achievements)
      {
        id: 'risk-conservative',
        name: 'Conservative Trader',
        description: 'Maintain risk ratio below 2% for 30 days',
        category: AchievementCategory.RISK,
        rarity: AchievementRarity.UNCOMMON,
        icon: '🛡️',
        points: 40,
        requirements: { type: RequirementType.RISK_RATIO, value: 2, comparison: 'lte', period: 'monthly' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'diversified',
        name: 'Diversified Portfolio',
        description: 'Trade 10 different assets',
        category: AchievementCategory.RISK,
        rarity: AchievementRarity.UNCOMMON,
        icon: '🎭',
        points: 35,
        requirements: { type: RequirementType.DIVERSITY_SCORE, value: 10, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },

      // Social Achievements (7 achievements)
      {
        id: 'social-follower-10',
        name: 'Popular',
        description: 'Gain 10 followers',
        category: AchievementCategory.SOCIAL,
        rarity: AchievementRarity.COMMON,
        icon: '👥',
        points: 25,
        requirements: { type: RequirementType.FOLLOWERS, value: 10, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'social-follower-100',
        name: 'Influencer',
        description: 'Gain 100 followers',
        category: AchievementCategory.SOCIAL,
        rarity: AchievementRarity.RARE,
        icon: '⭐',
        points: 100,
        requirements: { type: RequirementType.FOLLOWERS, value: 100, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'copy-trader',
        name: 'Copy Cat',
        description: 'Have your trades copied 10 times',
        category: AchievementCategory.SOCIAL,
        rarity: AchievementRarity.UNCOMMON,
        icon: '📋',
        points: 50,
        requirements: { type: RequirementType.TRADES_COPIED, value: 10, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },

      // Special Achievements (5 achievements)
      {
        id: 'special-perfect-month',
        name: 'Perfect Month',
        description: 'No losing trades for an entire month',
        category: AchievementCategory.SPECIAL,
        rarity: AchievementRarity.MYTHIC,
        icon: '🌟',
        points: 1000,
        requirements: { type: RequirementType.WIN_STREAK, value: 30, comparison: 'gte', period: 'monthly' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'special-comeback',
        name: 'Comeback Kid',
        description: 'Recover from a 50% drawdown to new highs',
        category: AchievementCategory.SPECIAL,
        rarity: AchievementRarity.EPIC,
        icon: '💪',
        points: 250,
        requirements: { type: RequirementType.PORTFOLIO_VALUE, value: 1.5, comparison: 'gte' },
        unlockedBy: [],
        totalUnlocks: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    this.achievementDefinitions.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return this.userAchievements.get(userId) || [];
  }

  async getAchievementProgress(userId: string): Promise<AchievementProgress[]> {
    const userAchievements = await this.getUserAchievements(userId);
    const progress: AchievementProgress[] = [];

    this.achievements.forEach(achievement => {
      const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);

      progress.push({
        achievement,
        currentProgress: userAchievement?.progress || 0,
        targetValue: achievement.requirements.value,
        percentageComplete: userAchievement ? (userAchievement.progress / achievement.requirements.value) * 100 : 0,
        isUnlocked: userAchievement?.isCompleted || false,
        unlockedAt: userAchievement?.unlockedAt,
      });
    });

    return progress.sort((a, b) => {
      if (a.isUnlocked !== b.isUnlocked) {
        return a.isUnlocked ? 1 : -1;
      }
      return b.percentageComplete - a.percentageComplete;
    });
  }

  async checkAchievements(userId: string, stats: UserStats): Promise<Achievement[]> {
    const userAchievements = await this.getUserAchievements(userId);
    const newlyUnlocked: Achievement[] = [];

    this.achievements.forEach(achievement => {
      const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);

      if (!userAchievement?.isCompleted) {
        const isUnlocked = this.checkRequirement(achievement.requirements, stats);

        if (isUnlocked) {
          const newUserAchievement: UserAchievement = {
            userId,
            achievementId: achievement.id,
            unlockedAt: new Date().toISOString(),
            progress: achievement.requirements.value,
            isCompleted: true,
            notified: false,
          };

          if (userAchievement) {
            Object.assign(userAchievement, newUserAchievement);
          } else {
            const userAchievementsList = this.userAchievements.get(userId) || [];
            userAchievementsList.push(newUserAchievement);
            this.userAchievements.set(userId, userAchievementsList);
          }

          achievement.unlockedBy.push(userId);
          achievement.totalUnlocks++;
          newlyUnlocked.push(achievement);
        }
      }
    });

    return newlyUnlocked;
  }

  private checkRequirement(requirement: AchievementRequirement, stats: UserStats): boolean {
    let value = 0;

    switch (requirement.type) {
      case RequirementType.TOTAL_TRADES:
        value = stats.totalTrades;
        break;
      case RequirementType.WINNING_TRADES:
        value = stats.winningTrades;
        break;
      case RequirementType.PROFIT_AMOUNT:
        value = stats.totalProfit;
        break;
      case RequirementType.WIN_STREAK:
        value = stats.currentWinStreak;
        break;
      case RequirementType.DAILY_STREAK:
        value = stats.dailyStreak;
        break;
      case RequirementType.COMPETITIONS_WON:
        value = stats.competitionsWon;
        break;
      case RequirementType.COMPETITIONS_JOINED:
        value = stats.competitionsJoined;
        break;
      case RequirementType.FOLLOWERS:
        value = stats.followers;
        break;
      case RequirementType.PORTFOLIO_VALUE:
        value = stats.portfolioValue;
        break;
      case RequirementType.SINGLE_TRADE_PROFIT:
        value = stats.bestTradeProfit;
        break;
      default:
        return false;
    }

    switch (requirement.comparison) {
      case 'gte':
        return value >= requirement.value;
      case 'lte':
        return value <= requirement.value;
      case 'gt':
        return value > requirement.value;
      case 'lt':
        return value < requirement.value;
      case 'eq':
        return value === requirement.value;
      default:
        return false;
    }
  }

  async getAchievementsByCategory(category: AchievementCategory): Promise<Achievement[]> {
    return Array.from(this.achievements.values()).filter(a => a.category === category);
  }

  async getAchievementsByRarity(rarity: AchievementRarity): Promise<Achievement[]> {
    return Array.from(this.achievements.values()).filter(a => a.rarity === rarity);
  }

  async getAchievementStats(): Promise<AchievementStats> {
    const totalAchievements = this.achievements.size;
    const totalPoints = Array.from(this.achievements.values()).reduce((sum, a) => sum + a.points, 0);

    const rarityDistribution = new Map<AchievementRarity, number>();
    const categoryDistribution = new Map<AchievementCategory, number>();

    this.achievements.forEach(achievement => {
      rarityDistribution.set(
        achievement.rarity,
        (rarityDistribution.get(achievement.rarity) || 0) + 1
      );
      categoryDistribution.set(
        achievement.category,
        (categoryDistribution.get(achievement.category) || 0) + 1
      );
    });

    return {
      totalAchievements,
      totalPoints,
      rarityDistribution: Object.fromEntries(rarityDistribution),
      categoryDistribution: Object.fromEntries(categoryDistribution),
      mostUnlockedAchievements: Array.from(this.achievements.values())
        .sort((a, b) => b.totalUnlocks - a.totalUnlocks)
        .slice(0, 5),
      rarestAchievements: Array.from(this.achievements.values())
        .sort((a, b) => a.totalUnlocks - b.totalUnlocks)
        .slice(0, 5),
    };
  }
}

export interface UserStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  portfolioValue: number;
  currentWinStreak: number;
  dailyStreak: number;
  competitionsJoined: number;
  competitionsWon: number;
  followers: number;
  tradesCopied: number;
  bestTradeProfit: number;
  worstTradeLoss: number;
}

export interface AchievementStats {
  totalAchievements: number;
  totalPoints: number;
  rarityDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  mostUnlockedAchievements: Achievement[];
  rarestAchievements: Achievement[];
}

export const achievementService = new AchievementService();