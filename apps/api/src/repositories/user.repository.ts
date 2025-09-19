import { prisma } from '@golden-palace/database';
import type { User, UserStats, Prisma } from '@prisma/client';

export type UserWithStats = User & {
  userStats: UserStats | null;
};

export interface CreateUserData {
  email: string;
  username: string;
  passwordHash: string;
  bio?: string;
  specialties?: string[];
  tradingStyle?: string;
  experienceYears?: number;
  favoriteMarkets?: string[];
}

export class UserRepository {
  async create(userData: CreateUserData): Promise<UserWithStats> {
    const user = await prisma.user.create({
      data: {
        ...userData,
        userStats: {
          create: {
            totalPnl: 0,
            winRate: 0,
            totalTrades: 0,
            bestStreak: 0,
            currentStreak: 0,
            averageHoldTime: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            profitFactor: 0
          }
        }
      },
      include: {
        userStats: true
      }
    });

    return user;
  }

  async findByEmail(email: string): Promise<UserWithStats | null> {
    return await prisma.user.findUnique({
      where: { email },
      include: { userStats: true }
    });
  }

  async findByUsername(username: string): Promise<UserWithStats | null> {
    return await prisma.user.findUnique({
      where: { username },
      include: { userStats: true }
    });
  }

  async findById(id: string): Promise<UserWithStats | null> {
    return await prisma.user.findUnique({
      where: { id },
      include: { userStats: true }
    });
  }

  async findByIds(ids: string[]): Promise<User[]> {
    return await prisma.user.findMany({
      where: {
        id: { in: ids }
      }
    });
  }

  async updateLastSeen(id: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { lastSeen: new Date() }
    });
  }

  async update(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<UserWithStats> {
    return await prisma.user.update({
      where: { id },
      data,
      include: { userStats: true }
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id }
    });
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    return !!user;
  }

  async usernameExists(username: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });
    return !!user;
  }
}