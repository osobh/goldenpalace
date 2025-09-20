export interface XPAction {
  type: string;
  baseXP: number;
  maxMultiplier?: number;
}

export interface XPAward {
  userId: string;
  action: string;
  xpAwarded: number;
  bonusXP: number;
  streakMultiplier: number;
  prestigeMultiplier: number;
  eventMultiplier: number;
  boosterMultiplier: number;
  totalMultiplier: number;
  timestamp: Date;
}

export interface LevelProgress {
  currentLevel: number;
  nextLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  progressPercentage: number;
  totalXP: number;
}

export interface UserProgress {
  userId: string;
  level: number;
  totalXP: number;
  currentLevelXP: number;
  prestigeLevel: number;
  levelUpEvents: LevelUpEvent[];
  lastActivity: Date;
}

export interface LevelUpEvent {
  level: number;
  newLevel: number;
  timestamp: Date;
  xpEarned: number;
}

export interface LevelReward {
  level: number;
  type: string;
  value: any;
  unlocked: boolean;
  claimed: boolean;
}

export interface PrestigeResult {
  success: boolean;
  newPrestigeLevel: number;
  rewards: any[];
  timestamp: Date;
}

export interface Challenge {
  id: string;
  type: string;
  name: string;
  description: string;
  requirement: any;
  progress: number;
  maxProgress: number;
  xpReward: number;
  bonusReward?: any;
  completed: boolean;
  expiresAt: Date;
}

export interface Quest {
  id: string;
  type: string;
  name: string;
  description: string;
  duration: string;
  stages: QuestStage[];
  currentStage: number;
  stagesCompleted: number;
  xpReward: number;
  completed: boolean;
  xpAwarded?: number;
  expiresAt: Date;
}

export interface QuestStage {
  requirement: any;
  progress: number;
  maxProgress: number;
  completed: boolean;
}

export interface SeasonalEvent {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  xpMultiplier: number;
  specialChallenges?: boolean;
  active: boolean;
}

export interface Booster {
  type: string;
  multiplier: number;
  duration?: number;
  expiresAt?: Date;
}

export interface UserStats {
  userId: string;
  dailyChallengeStreak: number;
  allChallengesCompleted: boolean;
  questsCompleted: number;
  totalXPEarned: number;
  favoriteAction: string;
  lastLogin: Date;
}

export interface CompetitionPrize {
  rank: number;
  prizeAmount: number;
  prizeType: string;
  description: string;
}

export const XP_ACTIONS: Record<string, XPAction> = {
  TRADE_EXECUTED: { type: 'TRADE_EXECUTED', baseXP: 50 },
  PROFITABLE_TRADE: { type: 'PROFITABLE_TRADE', baseXP: 100, maxMultiplier: 3 },
  ACHIEVEMENT_UNLOCKED: { type: 'ACHIEVEMENT_UNLOCKED', baseXP: 200 },
  COMPETITION_JOINED: { type: 'COMPETITION_JOINED', baseXP: 100 },
  LEADERBOARD_TOP10: { type: 'LEADERBOARD_TOP10', baseXP: 200 },
  DAILY_LOGIN: { type: 'DAILY_LOGIN', baseXP: 25 },
  CHALLENGE_COMPLETED: { type: 'CHALLENGE_COMPLETED', baseXP: 150 },
  QUEST_COMPLETED: { type: 'QUEST_COMPLETED', baseXP: 500 },
  LEVEL_UP: { type: 'LEVEL_UP', baseXP: 100 },
  PRESTIGE: { type: 'PRESTIGE', baseXP: 5000 }
};

export const ACHIEVEMENT_RARITY_XP: Record<string, number> = {
  COMMON: 100,
  UNCOMMON: 200,
  RARE: 300,
  EPIC: 500,
  LEGENDARY: 1000,
  MYTHIC: 2000
};