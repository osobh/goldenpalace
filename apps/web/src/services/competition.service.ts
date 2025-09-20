import { Portfolio } from './types';

export interface Competition {
  id: string;
  name: string;
  description?: string;
  type: CompetitionType | string;
  status: CompetitionStatus | string;
  startDate: Date | string;
  endDate: Date | string;
  entryFee: number;
  prizePool: number;
  minParticipants?: number;
  maxParticipants: number;
  currentParticipants?: number;
  participants?: number;
  scoringMetric?: ScoringMetric;
  rules?: CompetitionRules | any;
  prizes?: any[];
  createdBy?: string;
  creatorId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  inviteCode?: string;
}

export enum CompetitionType {
  DAILY_PNL = 'DAILY_PNL',
  WEEKLY_PNL = 'WEEKLY_PNL',
  MONTHLY_ROI = 'MONTHLY_ROI',
  BEST_TRADE = 'BEST_TRADE',
  RISK_ADJUSTED = 'RISK_ADJUSTED',
  SECTOR_SPECIFIC = 'SECTOR_SPECIFIC',
  STRATEGY_BASED = 'STRATEGY_BASED',
}

export enum CompetitionStatus {
  UPCOMING = 'UPCOMING',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ScoringMetric {
  TOTAL_RETURN = 'TOTAL_RETURN',
  PERCENTAGE_RETURN = 'PERCENTAGE_RETURN',
  SHARPE_RATIO = 'SHARPE_RATIO',
  WIN_RATE = 'WIN_RATE',
  BEST_SINGLE_TRADE = 'BEST_SINGLE_TRADE',
  RISK_ADJUSTED_RETURN = 'RISK_ADJUSTED_RETURN',
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

export interface CompetitionParticipant {
  userId: string;
  username?: string;
  competitionId: string;
  competitionName?: string;
  portfolioId: string;
  joinedAt: Date | string;
  startingBalance?: number;
  currentBalance?: number;
  totalTrades?: number;
  winningTrades?: number;
  losingTrades?: number;
  currentRank?: number;
  rank?: number;
  score: number;
  pnl?: number;
  roi?: number;
  earnings?: number;
  bestTrade?: number;
  worstTrade?: number;
  lastTradeAt?: string;
  isDisqualified?: boolean;
  disqualificationReason?: string;
}

export interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  scoreChange24h: number;
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

export class CompetitionService {
  private competitions: Map<string, Competition> = new Map();
  private participants: Map<string, CompetitionParticipant[]> = new Map();
  private leaderboards: Map<string, LeaderboardEntry[]> = new Map();
  private userCompetitions: Map<string, string[]> = new Map();

  constructor() {
    this.initializeMockCompetitions();
  }

  private initializeMockCompetitions(): void {
    const mockCompetitions: Competition[] = [
      {
        id: 'comp-1',
        name: 'Weekly Trading Championship',
        description: 'Compete for the highest P&L over one week',
        type: CompetitionType.WEEKLY_PNL,
        status: CompetitionStatus.ACTIVE,
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        entryFee: 0,
        prizePool: 10000,
        minParticipants: 10,
        maxParticipants: 100,
        currentParticipants: 45,
        participants: 45,
        scoringMetric: ScoringMetric.TOTAL_RETURN,
        rules: {
          startingBalance: 100000,
          maxDrawdown: 20,
          minTrades: 5,
        },
        createdBy: 'system',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'comp-2',
        name: 'Risk Masters Challenge',
        description: 'Best risk-adjusted returns win',
        type: CompetitionType.RISK_ADJUSTED,
        status: CompetitionStatus.REGISTRATION_OPEN,
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(),
        entryFee: 50,
        prizePool: 25000,
        minParticipants: 20,
        maxParticipants: 200,
        currentParticipants: 15,
        participants: 15,
        scoringMetric: ScoringMetric.SHARPE_RATIO,
        rules: {
          startingBalance: 50000,
          maxDrawdown: 15,
          minTrades: 10,
          stopLossRequired: true,
        },
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'comp-3',
        name: 'Day Trader Sprint',
        description: 'Daily P&L competition - highest daily return wins',
        type: CompetitionType.DAILY_PNL,
        status: CompetitionStatus.ACTIVE,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        entryFee: 0,
        prizePool: 1000,
        minParticipants: 5,
        maxParticipants: 50,
        currentParticipants: 23,
        participants: 23,
        scoringMetric: ScoringMetric.PERCENTAGE_RETURN,
        rules: {
          startingBalance: 10000,
          maxTrades: 50,
          maxPositionSize: 5000,
        },
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    mockCompetitions.forEach(comp => {
      this.competitions.set(comp.id, comp);
      this.generateMockLeaderboard(comp.id, comp.currentParticipants || comp.participants || 0);
    });
  }

  private generateMockLeaderboard(competitionId: string, participantCount: number): void {
    const leaderboard: LeaderboardEntry[] = [];
    const participants: CompetitionParticipant[] = [];

    for (let i = 0; i < participantCount; i++) {
      const userId = `user-${i + 1}`;
      const username = `Trader${i + 1}`;
      const totalReturn = Math.random() * 10000 - 2000;
      const returnPercentage = (totalReturn / 100000) * 100;
      const totalTrades = Math.floor(Math.random() * 100) + 10;
      const winningTrades = Math.floor(totalTrades * (0.4 + Math.random() * 0.3));
      const winRate = (winningTrades / totalTrades) * 100;

      const participant: CompetitionParticipant = {
        userId,
        username,
        competitionId,
        portfolioId: `portfolio-${userId}`,
        joinedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        startingBalance: 100000,
        currentBalance: 100000 + totalReturn,
        totalTrades,
        winningTrades,
        losingTrades: totalTrades - winningTrades,
        currentRank: i + 1,
        score: totalReturn,
        bestTrade: Math.random() * 5000,
        worstTrade: -Math.random() * 2000,
        lastTradeAt: new Date(Date.now() - Math.random() * 60 * 60 * 1000).toISOString(),
        isDisqualified: false,
      };

      const entry: LeaderboardEntry = {
        rank: i + 1,
        previousRank: i + 1 + Math.floor(Math.random() * 5) - 2,
        userId,
        username,
        score: totalReturn,
        scoreChange24h: Math.random() * 1000 - 500,
        totalReturn,
        returnPercentage,
        winRate,
        totalTrades,
        sharpeRatio: 0.5 + Math.random() * 2,
        maxDrawdown: Math.random() * 20,
        lastUpdateTime: new Date().toISOString(),
      };

      participants.push(participant);
      leaderboard.push(entry);
    }

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
      if (participants[index]) {
        participants[index].currentRank = index + 1;
      }
    });

    this.participants.set(competitionId, participants);
    this.leaderboards.set(competitionId, leaderboard);
  }

  async getActiveCompetitions(): Promise<Competition[]> {
    return Array.from(this.competitions.values()).filter(
      comp => comp.status === CompetitionStatus.ACTIVE
    );
  }

  async getUpcomingCompetitions(): Promise<Competition[]> {
    return Array.from(this.competitions.values()).filter(
      comp => comp.status === CompetitionStatus.UPCOMING ||
             comp.status === CompetitionStatus.REGISTRATION_OPEN
    );
  }

  async getCompetition(competitionId: string): Promise<Competition | null> {
    return this.competitions.get(competitionId) || null;
  }

  async getLeaderboard(
    competitionId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<LeaderboardEntry[]> {
    const leaderboard = this.leaderboards.get(competitionId) || [];
    return leaderboard.slice(offset, offset + limit);
  }

  async getUserRank(competitionId: string, userId: string): Promise<number | null> {
    const leaderboard = this.leaderboards.get(competitionId) || [];
    const entry = leaderboard.find(e => e.userId === userId);
    return entry ? entry.rank : null;
  }

  async joinCompetition(
    competitionId: string,
    userId: string,
    portfolioId: string
  ): Promise<any> {
    const competition = this.competitions.get(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status !== CompetitionStatus.REGISTRATION_OPEN &&
        competition.status !== CompetitionStatus.ACTIVE) {
      throw new Error('Competition is not open for registration');
    }

    if (competition.currentParticipants >= competition.maxParticipants) {
      throw new Error('Competition is full');
    }

    const existingParticipants = this.participants.get(competitionId) || [];
    const alreadyJoined = existingParticipants.find(p => p.userId === userId);
    if (alreadyJoined) {
      throw new Error('Already joined this competition');
    }

    const participant: CompetitionParticipant = {
      userId,
      username: `User${userId}`,
      competitionId,
      portfolioId,
      joinedAt: new Date().toISOString(),
      startingBalance: competition.rules.startingBalance,
      currentBalance: competition.rules.startingBalance,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      currentRank: existingParticipants.length + 1,
      score: 0,
      bestTrade: 0,
      worstTrade: 0,
      isDisqualified: false,
    };

    existingParticipants.push(participant);
    this.participants.set(competitionId, existingParticipants);

    competition.currentParticipants++;
    this.competitions.set(competitionId, competition);

    const userComps = this.userCompetitions.get(userId) || [];
    userComps.push(competitionId);
    this.userCompetitions.set(userId, userComps);

    return {
      success: true,
      participantId: participant.userId,
      message: 'Successfully joined competition',
      ...participant
    };
  }

  async leaveCompetition(competitionId: string, userId: string): Promise<boolean> {
    const participants = this.participants.get(competitionId) || [];
    const index = participants.findIndex(p => p.userId === userId);

    if (index === -1) {
      return false;
    }

    participants.splice(index, 1);
    this.participants.set(competitionId, participants);

    const competition = this.competitions.get(competitionId);
    if (competition) {
      competition.currentParticipants--;
      this.competitions.set(competitionId, competition);
    }

    const userComps = this.userCompetitions.get(userId) || [];
    const compIndex = userComps.indexOf(competitionId);
    if (compIndex > -1) {
      userComps.splice(compIndex, 1);
      this.userCompetitions.set(userId, userComps);
    }

    return true;
  }

  async getUserCompetitions(userId: string): Promise<CompetitionParticipant[]> {
    const competitionIds = this.userCompetitions.get(userId) || [];
    const userParticipations: CompetitionParticipant[] = [];

    competitionIds.forEach(compId => {
      const competition = this.competitions.get(compId);
      const participants = this.participants.get(compId) || [];
      const participant = participants.find(p => p.userId === userId);

      if (competition && participant) {
        userParticipations.push({
          ...participant,
          competitionName: competition.name,
          rank: participant.currentRank || participant.rank || 0,
          pnl: participant.score || 0,
          roi: participant.score ? participant.score / (participant.startingBalance || 100000) : 0
        });
      }
    });

    return userParticipations;
  }

  async updateParticipantScore(
    competitionId: string,
    userId: string,
    portfolio: Portfolio
  ): Promise<void> {
    const participants = this.participants.get(competitionId) || [];
    const participant = participants.find(p => p.userId === userId);

    if (!participant) {
      return;
    }

    const competition = this.competitions.get(competitionId);
    if (!competition) {
      return;
    }

    // Calculate score based on competition scoring metric
    let score = 0;
    switch (competition.scoringMetric) {
      case ScoringMetric.TOTAL_RETURN:
        score = portfolio.totalValue - participant.startingBalance;
        break;
      case ScoringMetric.PERCENTAGE_RETURN:
        score = ((portfolio.totalValue - participant.startingBalance) / participant.startingBalance) * 100;
        break;
      case ScoringMetric.SHARPE_RATIO:
        // Simplified Sharpe ratio calculation
        const returns = (portfolio.totalValue - participant.startingBalance) / participant.startingBalance;
        const volatility = 0.15; // Simplified volatility
        score = returns / volatility;
        break;
      case ScoringMetric.WIN_RATE:
        score = participant.totalTrades > 0
          ? (participant.winningTrades / participant.totalTrades) * 100
          : 0;
        break;
      default:
        score = portfolio.totalValue - participant.startingBalance;
    }

    participant.score = score;
    participant.currentBalance = portfolio.totalValue;
    participant.lastTradeAt = new Date().toISOString();

    // Update leaderboard
    this.updateLeaderboard(competitionId);
  }

  private updateLeaderboard(competitionId: string): void {
    const participants = this.participants.get(competitionId) || [];
    const leaderboard: LeaderboardEntry[] = participants.map(p => ({
      rank: 0,
      userId: p.userId,
      username: p.username,
      score: p.score,
      scoreChange24h: 0,
      totalReturn: p.currentBalance - p.startingBalance,
      returnPercentage: ((p.currentBalance - p.startingBalance) / p.startingBalance) * 100,
      winRate: p.totalTrades > 0 ? (p.winningTrades / p.totalTrades) * 100 : 0,
      totalTrades: p.totalTrades,
      lastUpdateTime: new Date().toISOString(),
    }));

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
      const participant = participants.find(p => p.userId === entry.userId);
      if (participant) {
        participant.currentRank = index + 1;
      }
    });

    this.leaderboards.set(competitionId, leaderboard);
  }

  async createCompetition(competition: Omit<Competition, 'id' | 'createdAt' | 'updatedAt'>): Promise<Competition> {
    const newCompetition: Competition = {
      ...competition,
      id: `comp-${Date.now()}`,
      participants: competition.currentParticipants || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if ((competition as any).isPrivate) {
      newCompetition.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    this.competitions.set(newCompetition.id, newCompetition);
    this.participants.set(newCompetition.id, []);
    this.leaderboards.set(newCompetition.id, []);

    return newCompetition;
  }

  async getCompetitionPrizes(competitionId: string): Promise<CompetitionPrize[]> {
    const competition = this.competitions.get(competitionId);
    if (!competition) {
      return [];
    }

    const prizes: CompetitionPrize[] = [
      {
        rank: 1,
        prizeAmount: competition.prizePool * 0.5,
        prizeType: 'CASH',
        description: '1st Place Prize',
      },
      {
        rank: 2,
        prizeAmount: competition.prizePool * 0.3,
        prizeType: 'CASH',
        description: '2nd Place Prize',
      },
      {
        rank: 3,
        prizeAmount: competition.prizePool * 0.2,
        prizeType: 'CASH',
        description: '3rd Place Prize',
      },
      {
        rank: 4,
        prizeAmount: 0,
        prizeType: 'TROPHY',
        description: 'Top 5 Trophy',
      },
      {
        rank: 5,
        prizeAmount: 0,
        prizeType: 'TROPHY',
        description: 'Top 5 Trophy',
      },
    ];

    return prizes;
  }

  async getGlobalLeaderboard(
    metric: ScoringMetric = ScoringMetric.TOTAL_RETURN,
    period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time'
  ): Promise<LeaderboardEntry[]> {
    // Aggregate scores across all competitions
    const globalLeaderboard = new Map<string, LeaderboardEntry>();

    this.leaderboards.forEach(leaderboard => {
      leaderboard.forEach(entry => {
        const existing = globalLeaderboard.get(entry.userId);
        if (!existing || entry.score > existing.score) {
          globalLeaderboard.set(entry.userId, entry);
        }
      });
    });

    const entries = Array.from(globalLeaderboard.values());
    entries.sort((a, b) => b.score - a.score);
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries.slice(0, 100);
  }

  async getUserStatistics(userId: string): Promise<any> {
    const userCompetitions = await this.getUserCompetitions(userId);
    const participations: CompetitionParticipant[] = [];

    userCompetitions.forEach(comp => {
      const participants = this.participants.get(comp.id) || [];
      const participant = participants.find(p => p.userId === userId);
      if (participant) {
        participations.push(participant);
      }
    });

    const wins = participations.filter(p => p.currentRank === 1).length;
    const top3Finishes = participations.filter(p => p.currentRank <= 3).length;
    const totalEarnings = participations.reduce((sum, p) => {
      const comp = this.competitions.get(p.competitionId);
      if (comp && p.currentRank <= 3) {
        const prizePercentage = p.currentRank === 1 ? 0.5 : p.currentRank === 2 ? 0.3 : 0.2;
        return sum + (comp.prizePool * prizePercentage);
      }
      return sum;
    }, 0);

    return {
      totalCompetitions: participations.length,
      wins,
      top3Finishes,
      totalEarnings,
      avgPosition: participations.length > 0
        ? participations.reduce((sum, p) => sum + p.currentRank, 0) / participations.length
        : 0,
      winRate: participations.length > 0 ? wins / participations.length : 0,
      currentStreak: 0
    };
  }

  async getUserCompetitionHistory(userId: string): Promise<any[]> {
    const userCompetitions = await this.getUserCompetitions(userId);
    const history: any[] = [];

    userCompetitions.forEach(comp => {
      const participants = this.participants.get(comp.id) || [];
      const participant = participants.find(p => p.userId === userId);
      if (participant) {
        history.push({
          date: comp.endDate,
          position: participant.currentRank,
          earnings: participant.currentRank <= 3 ?
            comp.prizePool * (participant.currentRank === 1 ? 0.5 : participant.currentRank === 2 ? 0.3 : 0.2) : 0
        });
      }
    });

    return history;
  }

  subscribeToLeaderboard(competitionId: string, callback: (leaderboard: LeaderboardEntry[]) => void): () => void {
    const intervalId = setInterval(async () => {
      const leaderboard = await this.getLeaderboard(competitionId, 5, 0);
      callback(leaderboard);
    }, 5000);

    return () => clearInterval(intervalId);
  }

  async getCompetitionById(competitionId: string): Promise<Competition> {
    const competition = this.competitions.get(competitionId);
    if (!competition) {
      throw new Error(`Competition not found: ${competitionId}`);
    }
    return competition;
  }

  async getUserPerformanceHistory(userId: string): Promise<any[]> {
    return [
      { date: '2024-01-01', value: 100000 },
      { date: '2024-01-15', value: 105000 },
      { date: '2024-02-01', value: 115000 },
      { date: '2024-02-15', value: 125000 }
    ];
  }

  async getUserBestWorstTrades(userId: string): Promise<any> {
    return {
      bestTrade: { symbol: 'AAPL', profit: 5000, roi: 0.25, date: '2024-02-01' },
      worstTrade: { symbol: 'TSLA', profit: -2000, roi: -0.10, date: '2024-01-15' }
    };
  }

  async getUserCompetitionStats(userId: string): Promise<any> {
    const competitions = await this.getUserCompetitions(userId);
    const wins = competitions.filter(c => c.rank === 1).length;
    const top3 = competitions.filter(c => c.rank && c.rank <= 3).length;
    return {
      totalCompetitions: competitions.length,
      wins,
      top3Finishes: top3,
      totalPrizeWon: 25000,
      averageRank: 15.5,
      bestRank: 1,
      competitionWinRate: competitions.length > 0 ? wins / competitions.length : 0
    };
  }

  async getMutualFollowers(userId: string, currentUserId: string): Promise<any[]> {
    return [
      { id: 'user1', username: 'Trader1', avatar: '/avatar1.jpg' },
      { id: 'user2', username: 'Trader2', avatar: '/avatar2.jpg' },
      { id: 'user3', username: 'Trader3', avatar: '/avatar3.jpg' }
    ];
  }
}

export const competitionService = new CompetitionService();