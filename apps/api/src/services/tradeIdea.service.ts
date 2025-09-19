import type {
  CreateTradeIdeaInput,
  UpdateTradeIdeaInput,
  GetTradeIdeasQuery,
  TradeIdeaWithDetails,
  PaginatedResult,
  ServiceResult,
  TradeIdeaPerformanceStats,
  TrendingSymbol,
  TradeIdeaSearchQuery
} from '@golden-palace/shared/types';
import type { TradeDirection } from '@golden-palace/database';
import { TradeIdeaRepository } from '../repositories/tradeIdea.repository';
import { GroupRepository } from '../repositories/group.repository';

export class TradeIdeaService {
  constructor(
    private tradeIdeaRepository: TradeIdeaRepository,
    private groupRepository: GroupRepository
  ) {}

  async createTradeIdea(
    userId: string,
    input: CreateTradeIdeaInput
  ): Promise<ServiceResult<TradeIdeaWithDetails>> {
    try {
      // Validate user is a member of the group
      const isMember = await this.groupRepository.isMember(input.groupId, userId);
      if (!isMember) {
        return { success: false, error: 'You are not a member of this group' };
      }

      // Validate input
      const validation = this.validateTradeIdeaInput(input);
      if (!validation.success) {
        return validation;
      }

      // Create the trade idea
      const tradeIdea = await this.tradeIdeaRepository.create({
        userId,
        ...input,
      });

      return { success: true, data: tradeIdea };
    } catch (error) {
      return { success: false, error: 'Failed to create trade idea' };
    }
  }

  async getTradeIdea(userId: string, id: string): Promise<ServiceResult<TradeIdeaWithDetails>> {
    try {
      const tradeIdea = await this.tradeIdeaRepository.findById(id);
      if (!tradeIdea) {
        return { success: false, error: 'Trade idea not found' };
      }

      // Check if user has access to the group
      const isMember = await this.groupRepository.isMember(tradeIdea.groupId, userId);
      if (!isMember) {
        return { success: false, error: 'Access denied' };
      }

      return { success: true, data: tradeIdea };
    } catch (error) {
      return { success: false, error: 'Failed to get trade idea' };
    }
  }

  async getTradeIdeas(
    userId: string,
    groupId: string,
    query: GetTradeIdeasQuery
  ): Promise<ServiceResult<PaginatedResult<TradeIdeaWithDetails>>> {
    try {
      // Check if user has access to the group
      const isMember = await this.groupRepository.isMember(groupId, userId);
      if (!isMember) {
        return { success: false, error: 'Access denied to this group' };
      }

      const result = await this.tradeIdeaRepository.findByGroupId(groupId, query);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: 'Failed to get trade ideas' };
    }
  }

  async updateTradeIdea(
    userId: string,
    id: string,
    input: UpdateTradeIdeaInput
  ): Promise<ServiceResult<TradeIdeaWithDetails>> {
    try {
      const tradeIdea = await this.tradeIdeaRepository.findById(id);
      if (!tradeIdea) {
        return { success: false, error: 'Trade idea not found' };
      }

      // Check if user is the owner
      if (tradeIdea.userId !== userId) {
        return { success: false, error: 'Only the trade idea owner can update it' };
      }

      // Check if trade idea is still active
      if (tradeIdea.status !== 'ACTIVE') {
        return { success: false, error: 'Cannot update closed trade ideas' };
      }

      // Validate input
      const validation = this.validateUpdateTradeIdeaInput(input, tradeIdea);
      if (!validation.success) {
        return validation;
      }

      const updatedTradeIdea = await this.tradeIdeaRepository.update(id, input);
      return { success: true, data: updatedTradeIdea };
    } catch (error) {
      return { success: false, error: 'Failed to update trade idea' };
    }
  }

  async closeTradeIdea(
    userId: string,
    id: string,
    closedPrice: number
  ): Promise<ServiceResult<TradeIdeaWithDetails>> {
    try {
      if (closedPrice <= 0) {
        return { success: false, error: 'Closed price must be positive' };
      }

      const tradeIdea = await this.tradeIdeaRepository.findById(id);
      if (!tradeIdea) {
        return { success: false, error: 'Trade idea not found' };
      }

      // Check if user is the owner
      if (tradeIdea.userId !== userId) {
        return { success: false, error: 'Only the trade idea owner can close it' };
      }

      // Check if trade idea is still active
      if (tradeIdea.status !== 'ACTIVE') {
        return { success: false, error: 'Trade idea is already closed' };
      }

      // Calculate PnL
      const pnl = this.calculatePnL(tradeIdea.direction, tradeIdea.entryPrice, closedPrice);

      const closedTradeIdea = await this.tradeIdeaRepository.update(id, {
        status: 'CLOSED',
        closedPrice,
        closedAt: new Date(),
        pnl,
      });

      return { success: true, data: closedTradeIdea };
    } catch (error) {
      return { success: false, error: 'Failed to close trade idea' };
    }
  }

  async deleteTradeIdea(userId: string, id: string): Promise<ServiceResult<boolean>> {
    try {
      const tradeIdea = await this.tradeIdeaRepository.findById(id);
      if (!tradeIdea) {
        return { success: false, error: 'Trade idea not found' };
      }

      // Check if user is the owner
      if (tradeIdea.userId !== userId) {
        return { success: false, error: 'Only the trade idea owner can delete it' };
      }

      const deleted = await this.tradeIdeaRepository.delete(id);
      return { success: true, data: deleted };
    } catch (error) {
      return { success: false, error: 'Failed to delete trade idea' };
    }
  }

  async searchTradeIdeas(
    userId: string,
    query: TradeIdeaSearchQuery
  ): Promise<ServiceResult<PaginatedResult<TradeIdeaWithDetails>>> {
    try {
      // Check if user has access to the group
      const isMember = await this.groupRepository.isMember(query.groupId, userId);
      if (!isMember) {
        return { success: false, error: 'Access denied to this group' };
      }

      const result = await this.tradeIdeaRepository.search(query);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: 'Failed to search trade ideas' };
    }
  }

  async getPerformanceStats(
    userId: string,
    groupId?: string
  ): Promise<ServiceResult<TradeIdeaPerformanceStats>> {
    try {
      const stats = await this.tradeIdeaRepository.getPerformanceStats(userId, groupId);
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: 'Failed to get performance stats' };
    }
  }

  async getTrendingSymbols(
    userId: string,
    groupId: string,
    days: number = 7
  ): Promise<ServiceResult<TrendingSymbol[]>> {
    try {
      // Check if user has access to the group
      const isMember = await this.groupRepository.isMember(groupId, userId);
      if (!isMember) {
        return { success: false, error: 'Access denied to this group' };
      }

      const trending = await this.tradeIdeaRepository.getTrendingSymbols(groupId, days);
      return { success: true, data: trending };
    } catch (error) {
      return { success: false, error: 'Failed to get trending symbols' };
    }
  }

  private validateTradeIdeaInput(input: CreateTradeIdeaInput): ServiceResult<void> {
    if (input.entryPrice <= 0) {
      return { success: false, error: 'Entry price must be positive' };
    }

    if (input.confidence !== undefined && (input.confidence < 1 || input.confidence > 5)) {
      return { success: false, error: 'Confidence must be between 1 and 5' };
    }

    // Validate stop loss and take profit levels
    if (input.direction === 'LONG') {
      if (input.stopLoss !== undefined && input.stopLoss >= input.entryPrice) {
        return { success: false, error: 'Stop loss must be below entry price for long positions' };
      }

      if (input.takeProfit1 !== undefined && input.takeProfit1 <= input.entryPrice) {
        return { success: false, error: 'Take profit must be above entry price for long positions' };
      }

      // Validate take profit levels are in ascending order
      if (input.takeProfit1 && input.takeProfit2 && input.takeProfit2 <= input.takeProfit1) {
        return { success: false, error: 'Take profit levels must be in ascending order for long positions' };
      }

      if (input.takeProfit2 && input.takeProfit3 && input.takeProfit3 <= input.takeProfit2) {
        return { success: false, error: 'Take profit levels must be in ascending order for long positions' };
      }
    } else if (input.direction === 'SHORT') {
      if (input.stopLoss !== undefined && input.stopLoss <= input.entryPrice) {
        return { success: false, error: 'Stop loss must be above entry price for short positions' };
      }

      if (input.takeProfit1 !== undefined && input.takeProfit1 >= input.entryPrice) {
        return { success: false, error: 'Take profit must be below entry price for short positions' };
      }

      // Validate take profit levels are in descending order for short
      if (input.takeProfit1 && input.takeProfit2 && input.takeProfit2 >= input.takeProfit1) {
        return { success: false, error: 'Take profit levels must be in descending order for short positions' };
      }

      if (input.takeProfit2 && input.takeProfit3 && input.takeProfit3 >= input.takeProfit2) {
        return { success: false, error: 'Take profit levels must be in descending order for short positions' };
      }
    }

    return { success: true };
  }

  private validateUpdateTradeIdeaInput(
    input: UpdateTradeIdeaInput,
    existingTradeIdea: TradeIdeaWithDetails
  ): ServiceResult<void> {
    if (input.confidence !== undefined && (input.confidence < 1 || input.confidence > 5)) {
      return { success: false, error: 'Confidence must be between 1 and 5' };
    }

    // Validate stop loss and take profit levels if provided
    const entryPrice = existingTradeIdea.entryPrice;
    const direction = existingTradeIdea.direction;

    if (direction === 'LONG') {
      if (input.stopLoss !== undefined && input.stopLoss >= entryPrice) {
        return { success: false, error: 'Stop loss must be below entry price for long positions' };
      }

      if (input.takeProfit1 !== undefined && input.takeProfit1 <= entryPrice) {
        return { success: false, error: 'Take profit must be above entry price for long positions' };
      }
    } else if (direction === 'SHORT') {
      if (input.stopLoss !== undefined && input.stopLoss <= entryPrice) {
        return { success: false, error: 'Stop loss must be above entry price for short positions' };
      }

      if (input.takeProfit1 !== undefined && input.takeProfit1 >= entryPrice) {
        return { success: false, error: 'Take profit must be below entry price for short positions' };
      }
    }

    return { success: true };
  }

  private calculatePnL(direction: TradeDirection, entryPrice: number, exitPrice: number): number {
    if (direction === 'LONG') {
      return exitPrice - entryPrice;
    } else {
      return entryPrice - exitPrice;
    }
  }
}