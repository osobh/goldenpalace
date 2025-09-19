import type {
  CreatePaperPositionInput,
  UpdatePositionInput,
  PaperPositionWithDetails,
  PortfolioSummary,
  TradingMetrics,
  PaginatedResult,
  ServiceResult
} from '@golden-palace/shared/types';
import { PaperPositionRepository, type GetPositionsQuery } from '../repositories/paperPosition.repository';
import { TradeIdeaRepository } from '../repositories/tradeIdea.repository';
import { GroupRepository } from '../repositories/group.repository';

export class PortfolioService {
  constructor(
    private paperPositionRepository: PaperPositionRepository,
    private tradeIdeaRepository: TradeIdeaRepository,
    private groupRepository: GroupRepository
  ) {}

  async createPaperPosition(
    userId: string,
    groupId: string,
    input: CreatePaperPositionInput
  ): Promise<ServiceResult<PaperPositionWithDetails>> {
    try {
      // Validate user is a member of the group
      const isMember = await this.groupRepository.isMember(groupId, userId);
      if (!isMember) {
        return { success: false, error: 'You are not a member of this group' };
      }

      // Validate input
      const validation = this.validateCreatePositionInput(input);
      if (!validation.success) {
        return validation;
      }

      // If trade idea is specified, validate it exists and belongs to the same group
      if (input.tradeIdeaId) {
        const tradeIdea = await this.tradeIdeaRepository.findById(input.tradeIdeaId);
        if (!tradeIdea) {
          return { success: false, error: 'Trade idea not found' };
        }
        if (tradeIdea.groupId !== groupId) {
          return { success: false, error: 'Trade idea belongs to a different group' };
        }
      }

      // Create the position
      const position = await this.paperPositionRepository.create({
        userId,
        groupId,
        tradeIdeaId: input.tradeIdeaId,
        symbol: input.symbol,
        assetType: input.assetType,
        quantity: input.quantity,
        entryPrice: input.entryPrice,
        currentPrice: input.entryPrice, // Start with entry price
        stopLoss: input.stopLoss,
        takeProfit: input.takeProfit,
      });

      return { success: true, data: position };
    } catch (error) {
      return { success: false, error: 'Failed to create paper position' };
    }
  }

  async getPosition(userId: string, id: string): Promise<ServiceResult<PaperPositionWithDetails>> {
    try {
      const position = await this.paperPositionRepository.findById(id);
      if (!position) {
        return { success: false, error: 'Position not found' };
      }

      // Check if user has access (owner or group member)
      const isMember = await this.groupRepository.isMember(position.groupId, userId);
      if (!isMember) {
        return { success: false, error: 'Access denied' };
      }

      return { success: true, data: position };
    } catch (error) {
      return { success: false, error: 'Failed to get position' };
    }
  }

  async getUserPositions(
    userId: string,
    query: GetPositionsQuery
  ): Promise<ServiceResult<PaginatedResult<PaperPositionWithDetails>>> {
    try {
      const result = await this.paperPositionRepository.findByUserId(userId, query);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: 'Failed to get user positions' };
    }
  }

  async getGroupPositions(
    userId: string,
    groupId: string,
    query: GetPositionsQuery
  ): Promise<ServiceResult<PaginatedResult<PaperPositionWithDetails>>> {
    try {
      // Check if user has access to the group
      const isMember = await this.groupRepository.isMember(groupId, userId);
      if (!isMember) {
        return { success: false, error: 'Access denied to this group' };
      }

      const result = await this.paperPositionRepository.findByGroupId(groupId, query);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: 'Failed to get group positions' };
    }
  }

  async updatePosition(
    userId: string,
    id: string,
    input: UpdatePositionInput
  ): Promise<ServiceResult<PaperPositionWithDetails>> {
    try {
      const position = await this.paperPositionRepository.findById(id);
      if (!position) {
        return { success: false, error: 'Position not found' };
      }

      // Check if user is the owner
      if (position.userId !== userId) {
        return { success: false, error: 'Only the position owner can update it' };
      }

      // Check if position is still open
      if (position.status !== 'OPEN') {
        return { success: false, error: 'Cannot update closed positions' };
      }

      // Validate input
      const validation = this.validateUpdatePositionInput(input);
      if (!validation.success) {
        return validation;
      }

      const updatedPosition = await this.paperPositionRepository.update(id, input);
      return { success: true, data: updatedPosition };
    } catch (error) {
      return { success: false, error: 'Failed to update position' };
    }
  }

  async closePosition(
    userId: string,
    id: string,
    closePrice: number,
    closeReason?: string
  ): Promise<ServiceResult<PaperPositionWithDetails>> {
    try {
      if (closePrice <= 0) {
        return { success: false, error: 'Close price must be positive' };
      }

      const position = await this.paperPositionRepository.findById(id);
      if (!position) {
        return { success: false, error: 'Position not found' };
      }

      // Check if user is the owner
      if (position.userId !== userId) {
        return { success: false, error: 'Only the position owner can close it' };
      }

      // Check if position is still open
      if (position.status !== 'OPEN') {
        return { success: false, error: 'Position is already closed' };
      }

      const closedPosition = await this.paperPositionRepository.close(id, closePrice, closeReason);
      return { success: true, data: closedPosition };
    } catch (error) {
      return { success: false, error: 'Failed to close position' };
    }
  }

  async deletePosition(userId: string, id: string): Promise<ServiceResult<boolean>> {
    try {
      const position = await this.paperPositionRepository.findById(id);
      if (!position) {
        return { success: false, error: 'Position not found' };
      }

      // Check if user is the owner
      if (position.userId !== userId) {
        return { success: false, error: 'Only the position owner can delete it' };
      }

      const deleted = await this.paperPositionRepository.delete(id);
      return { success: true, data: deleted };
    } catch (error) {
      return { success: false, error: 'Failed to delete position' };
    }
  }

  async getPortfolioSummary(
    userId: string,
    groupId?: string
  ): Promise<ServiceResult<PortfolioSummary>> {
    try {
      const summary = await this.paperPositionRepository.getPortfolioSummary(userId, groupId);
      return { success: true, data: summary };
    } catch (error) {
      return { success: false, error: 'Failed to get portfolio summary' };
    }
  }

  async updateCurrentPrices(
    userId: string,
    priceUpdates: Record<string, number>
  ): Promise<ServiceResult<number>> {
    try {
      if (Object.keys(priceUpdates).length === 0) {
        return { success: false, error: 'No price updates provided' };
      }

      // Validate all prices are positive
      for (const [symbol, price] of Object.entries(priceUpdates)) {
        if (price <= 0) {
          return { success: false, error: `Invalid price for ${symbol}: must be positive` };
        }
      }

      const updatedCount = await this.paperPositionRepository.updateCurrentPrice(userId, priceUpdates);
      return { success: true, data: updatedCount };
    } catch (error) {
      return { success: false, error: 'Failed to update current prices' };
    }
  }

  async getTradingMetrics(
    userId: string,
    groupId?: string,
    days?: number
  ): Promise<ServiceResult<TradingMetrics>> {
    try {
      const metrics = await this.paperPositionRepository.getTradingMetrics(userId, groupId, days);
      return { success: true, data: metrics };
    } catch (error) {
      return { success: false, error: 'Failed to get trading metrics' };
    }
  }

  async getTopPerformers(
    userId: string,
    groupId: string,
    limit: number = 10
  ): Promise<ServiceResult<any[]>> {
    try {
      // Check if user has access to the group
      const isMember = await this.groupRepository.isMember(groupId, userId);
      if (!isMember) {
        return { success: false, error: 'Access denied to this group' };
      }

      const topPerformers = await this.paperPositionRepository.getTopPerformers(groupId, limit);
      return { success: true, data: topPerformers };
    } catch (error) {
      return { success: false, error: 'Failed to get top performers' };
    }
  }

  private validateCreatePositionInput(input: CreatePaperPositionInput): ServiceResult<void> {
    if (input.quantity <= 0) {
      return { success: false, error: 'Quantity must be positive' };
    }

    if (input.entryPrice <= 0) {
      return { success: false, error: 'Entry price must be positive' };
    }

    if (input.stopLoss !== undefined && input.stopLoss <= 0) {
      return { success: false, error: 'Stop loss must be positive if provided' };
    }

    if (input.takeProfit !== undefined && input.takeProfit <= 0) {
      return { success: false, error: 'Take profit must be positive if provided' };
    }

    return { success: true };
  }

  private validateUpdatePositionInput(input: UpdatePositionInput): ServiceResult<void> {
    if (input.currentPrice !== undefined && input.currentPrice <= 0) {
      return { success: false, error: 'Current price must be positive if provided' };
    }

    if (input.stopLoss !== undefined && input.stopLoss <= 0) {
      return { success: false, error: 'Stop loss must be positive if provided' };
    }

    if (input.takeProfit !== undefined && input.takeProfit <= 0) {
      return { success: false, error: 'Take profit must be positive if provided' };
    }

    if (input.closedPrice !== undefined && input.closedPrice <= 0) {
      return { success: false, error: 'Closed price must be positive if provided' };
    }

    return { success: true };
  }
}