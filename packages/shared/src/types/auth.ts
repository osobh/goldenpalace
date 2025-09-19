import { z } from 'zod';

// Authentication Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  phone: z.string().optional(),
  bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
  specialties: z.array(z.string()).optional(),
  tradingStyle: z.string().optional(),
  experienceYears: z.number().min(0).max(50).optional(),
  favoriteMarkets: z.array(z.string()).optional(),
});

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  phone: z.string().optional(),
  bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
  specialties: z.array(z.string()).optional(),
  tradingStyle: z.string().optional(),
  experienceYears: z.number().min(0).max(50).optional(),
  favoriteMarkets: z.array(z.string()).optional(),
  avatarUrl: z.string().url().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
});

// Type inference from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// JWT Token types
export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    avatarUrl?: string;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
  };
  tokens: AuthTokens;
}

// Authentication errors
export enum AuthError {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS',
  TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED',
  INVALID_TWO_FACTOR_CODE = 'INVALID_TWO_FACTOR_CODE',
}

// Trading specialties constants
export const TRADING_SPECIALTIES = [
  'day_trading',
  'swing_trading',
  'scalping',
  'options',
  'futures',
  'forex',
  'crypto',
  'technical_analysis',
  'fundamental_analysis',
  'algorithmic_trading',
] as const;

export type TradingSpecialty = (typeof TRADING_SPECIALTIES)[number];

// Trading styles constants
export const TRADING_STYLES = [
  'conservative',
  'moderate',
  'aggressive',
  'growth',
  'value',
  'momentum',
  'contrarian',
] as const;

export type TradingStyle = (typeof TRADING_STYLES)[number];

// Market types constants
export const MARKET_TYPES = [
  'stocks',
  'forex',
  'crypto',
  'options',
  'futures',
  'indices',
  'commodities',
  'bonds',
] as const;

export type MarketType = (typeof MARKET_TYPES)[number];
