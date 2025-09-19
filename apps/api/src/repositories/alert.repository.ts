import { PrismaClient } from '@golden-palace/database';
import type { AlertWithDetails } from '@golden-palace/shared/types';
import type { AlertCondition, AlertStatus } from '@golden-palace/database';

export interface CreateAlertData {
  userId: string;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number;
  message?: string;
}

export interface UpdateAlertData {
  condition?: AlertCondition;
  targetPrice?: number;
  message?: string;
  status?: AlertStatus;
}

export class AlertRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateAlertData): Promise<AlertWithDetails> {
    const alert = await this.prisma.alert.create({
      data: {
        userId: data.userId,
        symbol: data.symbol.toUpperCase(),
        condition: data.condition,
        targetPrice: data.targetPrice,
        message: data.message || null,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this.mapToAlertWithDetails(alert);
  }

  async findById(id: string): Promise<AlertWithDetails | null> {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return alert ? this.mapToAlertWithDetails(alert) : null;
  }

  async findByUserId(userId: string, status?: AlertStatus): Promise<AlertWithDetails[]> {
    const where: any = {
      userId,
      ...(status && { status }),
    };

    const alerts = await this.prisma.alert.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return alerts.map(this.mapToAlertWithDetails);
  }

  async findBySymbol(symbol: string, status?: AlertStatus): Promise<AlertWithDetails[]> {
    const where: any = {
      symbol: symbol.toUpperCase(),
      ...(status && { status }),
    };

    const alerts = await this.prisma.alert.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return alerts.map(this.mapToAlertWithDetails);
  }

  async findActiveAlerts(symbols?: string[]): Promise<AlertWithDetails[]> {
    const where: any = {
      status: 'ACTIVE',
      ...(symbols && symbols.length > 0 && {
        symbol: {
          in: symbols.map(s => s.toUpperCase()),
        },
      }),
    };

    const alerts = await this.prisma.alert.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return alerts.map(this.mapToAlertWithDetails);
  }

  async update(id: string, data: UpdateAlertData): Promise<AlertWithDetails> {
    const alert = await this.prisma.alert.update({
      where: { id },
      data: {
        ...(data.condition !== undefined && { condition: data.condition }),
        ...(data.targetPrice !== undefined && { targetPrice: data.targetPrice }),
        ...(data.message !== undefined && { message: data.message }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this.mapToAlertWithDetails(alert);
  }

  async trigger(id: string): Promise<boolean> {
    try {
      await this.prisma.alert.update({
        where: { id },
        data: {
          status: 'TRIGGERED',
          triggeredAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.alert.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async cancel(id: string): Promise<boolean> {
    try {
      await this.prisma.alert.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getUserActiveAlertsCount(userId: string): Promise<number> {
    return this.prisma.alert.count({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });
  }

  async getTriggeredAlerts(userId: string, days?: number): Promise<AlertWithDetails[]> {
    const where: any = {
      userId,
      status: 'TRIGGERED',
      ...(days && {
        triggeredAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      }),
    };

    const alerts = await this.prisma.alert.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        triggeredAt: 'desc',
      },
    });

    return alerts.map(this.mapToAlertWithDetails);
  }

  async cleanupOldAlerts(days: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.prisma.alert.deleteMany({
      where: {
        status: 'TRIGGERED',
        triggeredAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  private mapToAlertWithDetails(alert: any): AlertWithDetails {
    return {
      id: alert.id,
      userId: alert.userId,
      symbol: alert.symbol,
      condition: alert.condition,
      targetPrice: Number(alert.targetPrice),
      message: alert.message,
      status: alert.status,
      triggeredAt: alert.triggeredAt,
      createdAt: alert.createdAt,
      user: alert.user,
    };
  }
}