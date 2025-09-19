import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { CompetitionService } from '../services/competition.service';
import { CompetitionEntryService } from '../services/competitionEntry.service';
import { CompetitionRepository } from '../repositories/competition.repository';
import { CompetitionEntryRepository } from '../repositories/competitionEntry.repository';
import { TradeRepository } from '../repositories/trade.repository';
import {
  createCompetitionSchema,
  updateCompetitionSchema,
  queryCompetitionsSchema
} from '@golden-palace/shared';

const router = Router();
const validationMiddleware = new ValidationMiddleware();

const competitionRepository = new CompetitionRepository();
const entryRepository = new CompetitionEntryRepository();
const tradeRepository = new TradeRepository();

const competitionService = new CompetitionService(
  competitionRepository,
  entryRepository
);

const entryService = new CompetitionEntryService(
  entryRepository,
  tradeRepository
);

router.use(authenticateToken);

router.post(
  '/',
  validationMiddleware.validate(createCompetitionSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const result = await competitionService.createCompetition(userId, req.body);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create competition'
      });
    }
  }
);

router.get(
  '/:id',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const result = await competitionService.getCompetition(id, userId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get competition'
      });
    }
  }
);

router.put(
  '/:id',
  validationMiddleware.validate(updateCompetitionSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const result = await competitionService.updateCompetition(id, userId, req.body);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update competition'
      });
    }
  }
);

router.post(
  '/:id/join',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const result = await competitionService.joinCompetition(id, userId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to join competition'
      });
    }
  }
);

router.get(
  '/:id/leaderboard',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const result = await competitionService.getLeaderboard(id, userId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get leaderboard'
      });
    }
  }
);

router.post(
  '/:id/update-scores',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const result = await competitionService.updateScores(id);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update scores'
      });
    }
  }
);

router.post(
  '/:id/end',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const result = await competitionService.endCompetition(id, userId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to end competition'
      });
    }
  }
);

router.get(
  '/:id/stats',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const result = await competitionService.getCompetitionStats(id, userId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get competition stats'
      });
    }
  }
);

router.get(
  '/group/:groupId',
  validationMiddleware.validate(queryCompetitionsSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { groupId } = req.params;
      const { page = 1, limit = 10, status, type } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const result = await competitionService.getGroupCompetitions(
        groupId,
        Number(page),
        Number(limit),
        {
          status: status as string,
          type: type as string
        }
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get group competitions'
      });
    }
  }
);

router.get(
  '/active',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const competitions = await competitionService.getActiveCompetitions();

      res.json({
        success: true,
        data: competitions
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get active competitions'
      });
    }
  }
);

router.get(
  '/upcoming',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { limit = 10 } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const competitions = await competitionService.getUpcomingCompetitions(Number(limit));

      res.json({
        success: true,
        data: competitions
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get upcoming competitions'
      });
    }
  }
);

router.get(
  '/search',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { q, groupId } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      const competitions = await competitionService.searchCompetitions(
        q as string,
        groupId as string
      );

      res.json({
        success: true,
        data: competitions
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to search competitions'
      });
    }
  }
);

router.get(
  '/entries/user/:userId',
  async (req: Request, res: Response) => {
    try {
      const currentUserId = (req as any).user?.id;
      const { userId } = req.params;

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const entries = await entryService.getEntriesByUser(userId);

      res.json({
        success: true,
        data: entries
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user entries'
      });
    }
  }
);

router.get(
  '/entries/:entryId/performance',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { entryId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const performance = await entryService.getEntryPerformance(entryId);

      res.json({
        success: true,
        data: performance
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get entry performance'
      });
    }
  }
);

router.post(
  '/entries/compare',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { entry1Id, entry2Id } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      if (!entry1Id || !entry2Id) {
        return res.status(400).json({
          success: false,
          error: 'Both entry IDs are required'
        });
      }

      const comparison = await entryService.compareEntries(entry1Id, entry2Id);

      res.json({
        success: true,
        data: comparison
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to compare entries'
      });
    }
  }
);

export const competitionRoutes = router;