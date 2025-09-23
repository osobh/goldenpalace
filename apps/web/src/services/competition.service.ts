import { competitionApi, type ApiResponse } from './api';

// Competition Types & Enums (matching database schema)
export enum CompetitionType {
  WEEKLY_PNL = 'WEEKLY_PNL',
  MONTHLY_ROI = 'MONTHLY_ROI',
  BEST_TRADE = 'BEST_TRADE',
  CONSISTENCY = 'CONSISTENCY',
  CUSTOM = 'CUSTOM'
}

export enum CompetitionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum ScoringMetric {
  TOTAL_RETURN = 'TOTAL_RETURN',
  PERCENTAGE_RETURN = 'PERCENTAGE_RETURN',
  SHARPE_RATIO = 'SHARPE_RATIO',
  WIN_RATE = 'WIN_RATE',
  BEST_SINGLE_TRADE = 'BEST_SINGLE_TRADE',
  RISK_ADJUSTED_RETURN = 'RISK_ADJUSTED_RETURN'
}

export interface Competition {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  type: CompetitionType;
  status: CompetitionStatus;
  startDate: string;
  endDate: string;
  entryFee?: number;
  prizePool?: number;
  prizeDistribution?: Record<string, any>;
  minParticipants?: number;
  maxParticipants?: number;
  currentParticipants?: number;
  scoringMetric: ScoringMetric;
  rules?: CompetitionRules;
  isPrivate: boolean;
  inviteCode?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionRules {
  allowedAssets?: string[];
  minTrades?: number;
  maxTrades?: number;
  maxPositionSize?: number;
  maxLeverage?: number;
  stopLossRequired?: boolean;
  minHoldingPeriod?: number;
  maxDrawdown?: number;
  startingBalance: number;
}

export interface CompetitionEntry {
  id: string;
  competitionId: string;
  userId: string;
  portfolioId?: string;
  joinedAt: string;
  startingBalance: number;
  currentBalance?: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  score: number;
  rank?: number;
  pnl?: number;
  roi?: number;
  bestTrade?: number;
  worstTrade?: number;
  lastTradeAt?: string;
  isDisqualified: boolean;
  disqualificationReason?: string;
  user?: {
    id: string;
    username: string;
    email?: string;
    avatarUrl?: string;
  };
}

export interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  scoreChange24h?: number;
  totalReturn: number;
  returnPercentage: number;
  winRate: number;
  totalTrades: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  lastUpdateTime: string;
}

export interface CompetitionPrize {
  rank: number;
  prizeAmount: number;
  prizeType: 'CASH' | 'CREDITS' | 'BADGE' | 'TROPHY';
  description: string;
}

export interface CreateCompetitionRequest {
  groupId: string;
  name: string;
  description?: string;
  type: CompetitionType;
  startDate: string;
  endDate: string;
  entryFee?: number;
  prizePool?: number;
  prizeDistribution?: Record<string, any>;
  minParticipants?: number;
  maxParticipants?: number;
  scoringMetric: ScoringMetric;
  rules: CompetitionRules;
  isPrivate: boolean;
}

export interface JoinCompetitionRequest {
  portfolioId?: string;
}

export interface CompetitionStatistics {
  totalCompetitions: number;
  wins: number;
  top3Finishes: number;
  totalEarnings: number;
  avgPosition: number;
  winRate: number;
  currentStreak: number;
}

class CompetitionService {
  // Fetch competitions with optional filters
  async getCompetitions(params?: {
    groupId?: string;
    status?: string;
    type?: string;
  }): Promise<Competition[]> {
    const response = await competitionApi.getCompetitions(params);
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }

  // Get active competitions (now includes both ACTIVE and PENDING)
  async getActiveCompetitions(groupId?: string): Promise<Competition[]> {
    return this.getCompetitions({ groupId });
  }

  // Get upcoming competitions
  async getUpcomingCompetitions(groupId?: string): Promise<Competition[]> {
    return this.getCompetitions({ groupId, status: CompetitionStatus.PENDING });
  }

  // Get single competition details
  async getCompetition(competitionId: string): Promise<Competition | null> {
    const response = await competitionApi.getCompetition(competitionId);
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  }

  // Create a new competition
  async createCompetition(data: CreateCompetitionRequest): Promise<Competition> {
    const response = await competitionApi.createCompetition(data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to create competition');
  }

  // Join a competition
  async joinCompetition(
    competitionId: string,
    portfolioId?: string
  ): Promise<CompetitionEntry> {
    const response = await competitionApi.joinCompetition(competitionId, { portfolioId });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to join competition');
  }

  // Leave a competition
  async leaveCompetition(competitionId: string): Promise<boolean> {
    const response = await competitionApi.leaveCompetition(competitionId);
    return response.success;
  }

  // Get competition leaderboard
  async getLeaderboard(
    competitionId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<LeaderboardEntry[]> {
    const response = await competitionApi.getLeaderboard(competitionId, { limit, offset });
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }

  // Get global leaderboard
  async getGlobalLeaderboard(
    metric: ScoringMetric = ScoringMetric.TOTAL_RETURN,
    period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time'
  ): Promise<LeaderboardEntry[]> {
    const response = await competitionApi.getGlobalLeaderboard({ metric, period });
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }

  // Get user's rank in competition
  async getUserRank(competitionId: string, userId: string): Promise<number | null> {
    const response = await competitionApi.getUserRank(competitionId, userId);
    if (response.success && response.data) {
      return response.data.rank;
    }
    return null;
  }

  // Get user's competitions
  async getUserCompetitions(userId: string): Promise<CompetitionEntry[]> {
    const response = await competitionApi.getMyCompetitions(userId);
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }

  // Get user statistics
  async getUserStatistics(userId: string): Promise<CompetitionStatistics> {
    const response = await competitionApi.getUserStats(userId);
    if (response.success && response.data) {
      return response.data;
    }
    return {
      totalCompetitions: 0,
      wins: 0,
      top3Finishes: 0,
      totalEarnings: 0,
      avgPosition: 0,
      winRate: 0,
      currentStreak: 0
    };
  }

  // Get competition statistics
  async getCompetitionStats(competitionId: string): Promise<any> {
    const response = await competitionApi.getCompetitionStats(competitionId);
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  }

  // Get competition entries
  async getCompetitionEntries(competitionId: string): Promise<CompetitionEntry[]> {
    const response = await competitionApi.getCompetitionEntries(competitionId);
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }

  // Calculate prize distribution based on pool
  calculatePrizeDistribution(
    prizePool: number,
    participantCount: number
  ): CompetitionPrize[] {
    const prizes: CompetitionPrize[] = [];

    if (participantCount >= 10) {
      // Top 3 get prizes
      prizes.push({
        rank: 1,
        prizeAmount: prizePool * 0.5,
        prizeType: 'CASH',
        description: '1st Place Prize'
      });
      prizes.push({
        rank: 2,
        prizeAmount: prizePool * 0.3,
        prizeType: 'CASH',
        description: '2nd Place Prize'
      });
      prizes.push({
        rank: 3,
        prizeAmount: prizePool * 0.2,
        prizeType: 'CASH',
        description: '3rd Place Prize'
      });
    } else if (participantCount >= 5) {
      // Winner takes 70%, runner-up 30%
      prizes.push({
        rank: 1,
        prizeAmount: prizePool * 0.7,
        prizeType: 'CASH',
        description: '1st Place Prize'
      });
      prizes.push({
        rank: 2,
        prizeAmount: prizePool * 0.3,
        prizeType: 'CASH',
        description: '2nd Place Prize'
      });
    } else {
      // Winner takes all
      prizes.push({
        rank: 1,
        prizeAmount: prizePool,
        prizeType: 'CASH',
        description: 'Winner Prize'
      });
    }

    return prizes;
  }

  // Subscribe to leaderboard updates (polling)
  subscribeToLeaderboard(
    competitionId: string,
    callback: (leaderboard: LeaderboardEntry[]) => void
  ): () => void {
    const intervalId = setInterval(async () => {
      const leaderboard = await this.getLeaderboard(competitionId, 10, 0);
      callback(leaderboard);
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(intervalId);
  }
}

export const competitionService = new CompetitionService();