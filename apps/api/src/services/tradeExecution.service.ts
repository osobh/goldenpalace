import type {
  PaperPositionWithDetails,
  TradeIdeaWithDetails,
  AlertWithDetails,
  MarketQuote,
  ServiceResult
} from '@golden-palace/shared/types';
import { PaperPositionRepository } from '../repositories/paperPosition.repository';
import { TradeIdeaRepository } from '../repositories/tradeIdea.repository';
import { AlertRepository } from '../repositories/alert.repository';

export interface MarketUpdateResult {
  positionsUpdated: number;
  positionsClosed: number;
  alertsTriggered: number;
  tradesExecuted: number;
}

export interface ExecutionSummary {
  totalExecutions: number;
  stopLossExecutions: number;
  takeProfitExecutions: number;
  totalPnlFromExecutions: number;
  avgExecutionTime: number;
  successRate: number;
  lastExecutionTime: Date | null;
}

export class TradeExecutionService {
  constructor(
    private paperPositionRepository: PaperPositionRepository,
    private tradeIdeaRepository: TradeIdeaRepository,
    private alertRepository: AlertRepository
  ) {}

  async processMarketUpdate(marketQuotes: MarketQuote[]): Promise<ServiceResult<MarketUpdateResult>> {
    try {
      if (marketQuotes.length === 0) {
        return { success: false, error: 'No market quotes provided' };
      }

      let positionsUpdated = 0;
      let positionsClosed = 0;
      let alertsTriggered = 0;
      let tradesExecuted = 0;

      // Extract symbols from market quotes
      const symbols = marketQuotes.map(quote => quote.symbol);
      const priceMap = new Map(marketQuotes.map(quote => [quote.symbol, quote.price]));

      // Get all open positions for these symbols
      const openPositions = await this.paperPositionRepository.getOpenPositions(undefined, symbols);

      // Update current prices for all positions
      const priceUpdates: Record<string, number> = {};
      for (const quote of marketQuotes) {
        priceUpdates[quote.symbol] = quote.price;
      }

      // Update positions by user to avoid conflicts
      const positionsByUser = new Map<string, PaperPositionWithDetails[]>();
      for (const position of openPositions) {
        if (!positionsByUser.has(position.userId)) {
          positionsByUser.set(position.userId, []);
        }
        positionsByUser.get(position.userId)!.push(position);
      }

      for (const [userId, positions] of positionsByUser) {
        const userPriceUpdates = Object.fromEntries(
          Object.entries(priceUpdates).filter(([symbol]) =>
            positions.some(p => p.symbol === symbol)
          )
        );

        if (Object.keys(userPriceUpdates).length > 0) {
          const updated = await this.paperPositionRepository.updateCurrentPrice(userId, userPriceUpdates);
          positionsUpdated += updated;
        }
      }

      // Process stop loss and take profit executions
      for (const position of openPositions) {
        const currentPrice = priceMap.get(position.symbol);
        if (!currentPrice) continue;

        // Check stop loss
        if (position.stopLoss && this.shouldExecuteStopLoss(position, currentPrice)) {
          const result = await this.executeStopLoss(position, currentPrice);
          if (result.success) {
            positionsClosed++;
          }
        }

        // Check take profit
        if (position.takeProfit && this.shouldExecuteTakeProfit(position, currentPrice)) {
          const result = await this.executeTakeProfit(position, currentPrice);
          if (result.success) {
            positionsClosed++;
          }
        }
      }

      // Process price alerts
      for (const quote of marketQuotes) {
        const alertResult = await this.checkPriceAlerts(quote);
        if (alertResult.success) {
          alertsTriggered += alertResult.data!;
        }
      }

      // Process trade idea auto-execution
      const tradeResult = await this.autoExecuteTradeIdeas(marketQuotes);
      if (tradeResult.success) {
        tradesExecuted += tradeResult.data!;
      }

      return {
        success: true,
        data: {
          positionsUpdated,
          positionsClosed,
          alertsTriggered,
          tradesExecuted,
        },
      };
    } catch (error) {
      return { success: false, error: 'Failed to process market update' };
    }
  }

  async executeStopLoss(
    position: PaperPositionWithDetails,
    currentPrice: number
  ): Promise<ServiceResult<PaperPositionWithDetails>> {
    try {
      if (!position.stopLoss) {
        return { success: false, error: 'No stop loss set for this position' };
      }

      if (!this.shouldExecuteStopLoss(position, currentPrice)) {
        return { success: false, error: 'Stop loss conditions not met' };
      }

      const closedPosition = await this.paperPositionRepository.close(
        position.id,
        position.stopLoss,
        'Stop loss triggered'
      );

      return { success: true, data: closedPosition };
    } catch (error) {
      return { success: false, error: 'Failed to execute stop loss' };
    }
  }

  async executeTakeProfit(
    position: PaperPositionWithDetails,
    currentPrice: number
  ): Promise<ServiceResult<PaperPositionWithDetails>> {
    try {
      if (!position.takeProfit) {
        return { success: false, error: 'No take profit set for this position' };
      }

      if (!this.shouldExecuteTakeProfit(position, currentPrice)) {
        return { success: false, error: 'Take profit conditions not met' };
      }

      const closedPosition = await this.paperPositionRepository.close(
        position.id,
        position.takeProfit,
        'Take profit triggered'
      );

      return { success: true, data: closedPosition };
    } catch (error) {
      return { success: false, error: 'Failed to execute take profit' };
    }
  }

  async checkPriceAlerts(marketQuote: MarketQuote): Promise<ServiceResult<number>> {
    try {
      const alerts = await this.alertRepository.findBySymbol(marketQuote.symbol, 'ACTIVE');
      let triggeredCount = 0;

      for (const alert of alerts) {
        if (this.shouldTriggerAlert(alert, marketQuote)) {
          const success = await this.alertRepository.trigger(alert.id);
          if (success) {
            triggeredCount++;
          }
        }
      }

      return { success: true, data: triggeredCount };
    } catch (error) {
      return { success: false, error: 'Failed to check price alerts' };
    }
  }

  async autoExecuteTradeIdeas(marketQuotes: MarketQuote[]): Promise<ServiceResult<number>> {
    try {
      const symbols = marketQuotes.map(quote => quote.symbol);
      const activeIdeas = await this.tradeIdeaRepository.findActiveIdeas(symbols);
      let executedCount = 0;

      for (const idea of activeIdeas) {
        const quote = marketQuotes.find(q => q.symbol === idea.symbol);
        if (!quote) continue;

        const execution = this.shouldExecuteTradeIdea(idea, quote.price);
        if (execution.shouldExecute) {
          const pnl = this.calculateTradeIdeaPnL(idea, execution.executionPrice!);

          await this.tradeIdeaRepository.update(idea.id, {
            status: 'CLOSED',
            closedPrice: execution.executionPrice,
            closedAt: new Date(),
            pnl,
          });

          executedCount++;
        }
      }

      return { success: true, data: executedCount };
    } catch (error) {
      return { success: false, error: 'Failed to auto-execute trade ideas' };
    }
  }

  async getExecutionSummary(userId: string, days?: number): Promise<ServiceResult<ExecutionSummary>> {
    try {
      // This would typically be implemented with a dedicated execution log table
      // For now, return a basic summary
      const summary: ExecutionSummary = {
        totalExecutions: 0,
        stopLossExecutions: 0,
        takeProfitExecutions: 0,
        totalPnlFromExecutions: 0,
        avgExecutionTime: 0,
        successRate: 0,
        lastExecutionTime: null,
      };

      return { success: true, data: summary };
    } catch (error) {
      return { success: false, error: 'Failed to get execution summary' };
    }
  }

  private shouldExecuteStopLoss(position: PaperPositionWithDetails, currentPrice: number): boolean {
    if (!position.stopLoss) return false;

    // For long positions, stop loss triggers when price falls below stop loss
    // For short positions, stop loss triggers when price rises above stop loss
    // Since we don't have direction in position, we assume based on entry vs stop loss
    if (position.stopLoss < position.entryPrice) {
      // Long position - stop loss below entry
      return currentPrice <= position.stopLoss;
    } else {
      // Short position - stop loss above entry
      return currentPrice >= position.stopLoss;
    }
  }

  private shouldExecuteTakeProfit(position: PaperPositionWithDetails, currentPrice: number): boolean {
    if (!position.takeProfit) return false;

    // For long positions, take profit triggers when price rises above take profit
    // For short positions, take profit triggers when price falls below take profit
    if (position.takeProfit > position.entryPrice) {
      // Long position - take profit above entry
      return currentPrice >= position.takeProfit;
    } else {
      // Short position - take profit below entry
      return currentPrice <= position.takeProfit;
    }
  }

  private shouldTriggerAlert(alert: AlertWithDetails, marketQuote: MarketQuote): boolean {
    const { condition, targetPrice } = alert;
    const { price, previousClose } = marketQuote;

    switch (condition) {
      case 'ABOVE':
        return price > targetPrice;
      case 'BELOW':
        return price < targetPrice;
      case 'CROSSES_ABOVE':
        return price > targetPrice && previousClose <= targetPrice;
      case 'CROSSES_BELOW':
        return price < targetPrice && previousClose >= targetPrice;
      default:
        return false;
    }
  }

  private shouldExecuteTradeIdea(
    idea: TradeIdeaWithDetails,
    currentPrice: number
  ): { shouldExecute: boolean; executionPrice?: number } {
    // Check stop loss first
    if (idea.stopLoss) {
      if (idea.direction === 'LONG' && currentPrice <= idea.stopLoss) {
        return { shouldExecute: true, executionPrice: idea.stopLoss };
      }
      if (idea.direction === 'SHORT' && currentPrice >= idea.stopLoss) {
        return { shouldExecute: true, executionPrice: idea.stopLoss };
      }
    }

    // Check take profit levels
    const takeProfits = [idea.takeProfit1, idea.takeProfit2, idea.takeProfit3]
      .filter(tp => tp !== null)
      .sort((a, b) => {
        if (idea.direction === 'LONG') {
          return a! - b!; // Ascending for long
        } else {
          return b! - a!; // Descending for short
        }
      });

    for (const takeProfit of takeProfits) {
      if (takeProfit === null) continue;

      if (idea.direction === 'LONG' && currentPrice >= takeProfit) {
        return { shouldExecute: true, executionPrice: takeProfit };
      }
      if (idea.direction === 'SHORT' && currentPrice <= takeProfit) {
        return { shouldExecute: true, executionPrice: takeProfit };
      }
    }

    return { shouldExecute: false };
  }

  private calculateTradeIdeaPnL(idea: TradeIdeaWithDetails, executionPrice: number): number {
    if (idea.direction === 'LONG') {
      return executionPrice - idea.entryPrice;
    } else {
      return idea.entryPrice - executionPrice;
    }
  }
}