import { z } from 'zod';

// Competition Types
export const COMPETITION_TYPES = [
  'WEEKLY_PNL',
  'MONTHLY_ROI',
  'BEST_TRADE',
  'CONSISTENCY',
  'CUSTOM',
] as const;

export type CompetitionType = (typeof COMPETITION_TYPES)[number];

// Competition Status
export const COMPETITION_STATUSES = ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;

export type CompetitionStatus = (typeof COMPETITION_STATUSES)[number];

// Create Competition Schema
export const createCompetitionSchema = z
  .object({
    groupId: z.string().cuid('Invalid group ID'),
    name: z
      .string()
      .min(1, 'Competition name is required')
      .max(100, 'Competition name must not exceed 100 characters'),
    description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
    type: z.enum(COMPETITION_TYPES),
    startDate: z.date().min(new Date(), 'Start date must be in the future'),
    endDate: z.date(),
    entryFee: z.number().min(0, 'Entry fee must be non-negative').optional(),
    prizePool: z.number().min(0, 'Prize pool must be non-negative').optional(),
    prizeDistribution: z.record(z.string(), z.number()).optional(),
    rules: z
      .object({
        minTrades: z.number().int().min(1).default(5),
        maxPositionSize: z.number().positive().optional(),
        allowedAssets: z.array(z.string()).optional(),
        tradingHours: z
          .object({
            start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          })
          .optional(),
      })
      .optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

// Join Competition Schema
export const joinCompetitionSchema = z.object({
  competitionId: z.string().cuid('Invalid competition ID'),
  startingBalance: z.number().positive('Starting balance must be positive').default(10000),
});

// Competition Entry Update Schema
export const updateCompetitionEntrySchema = z.object({
  currentBalance: z.number().positive('Current balance must be positive'),
  totalTrades: z.number().int().min(0),
  winningTrades: z.number().int().min(0),
  roi: z.number(),
});

// Type inference
export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;
export type JoinCompetitionInput = z.infer<typeof joinCompetitionSchema>;
export type UpdateCompetitionEntryInput = z.infer<typeof updateCompetitionEntrySchema>;

// Competition Rules Interface
export interface CompetitionRules {
  minTrades: number;
  maxPositionSize?: number;
  allowedAssets?: string[];
  tradingHours?: {
    start: string;
    end: string;
  };
  riskLimits?: {
    maxDailyLoss: number;
    maxDrawdown: number;
  };
  restrictions?: {
    noHedging: boolean;
    noScalping: boolean;
    minHoldTime: number; // in minutes
  };
}

// Leaderboard Entry
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  currentBalance: number;
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  roi: number;
  pnl: number;
  bestTrade: number;
  worstTrade: number;
  sharpeRatio: number;
  maxDrawdown: number;
  consistency: number;
  prizeAmount?: number;
}

// Competition Performance Metrics
export interface CompetitionMetrics {
  totalParticipants: number;
  averageROI: number;
  highestROI: number;
  lowestROI: number;
  totalTrades: number;
  averageTrades: number;
  prizePoolDistributed: number;
  winnerROI: number;
  participationRate: number;
}

// Prize Distribution Types
export interface PrizeDistribution {
  position: number;
  percentage: number;
  amount?: number;
  description?: string;
}

// Default prize distributions
export const DEFAULT_PRIZE_DISTRIBUTIONS = {
  THREE_WINNER: {
    '1': 0.6, // 60% for 1st place
    '2': 0.25, // 25% for 2nd place
    '3': 0.15, // 15% for 3rd place
  },
  FIVE_WINNER: {
    '1': 0.5, // 50% for 1st place
    '2': 0.25, // 25% for 2nd place
    '3': 0.15, // 15% for 3rd place
    '4': 0.06, // 6% for 4th place
    '5': 0.04, // 4% for 5th place
  },
  TOP_10_PERCENT: {
    // Dynamic distribution based on participant count
    formula: 'top_10_percent',
  },
} as const;

// Competition Notifications
export interface CompetitionNotification {
  type: 'started' | 'ended' | 'prize_awarded' | 'ranking_changed' | 'new_leader';
  competitionId: string;
  competitionName: string;
  message: string;
  data?: Record<string, any>;
  timestamp: Date;
}
