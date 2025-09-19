import { Router } from 'express';
import { z } from 'zod';
import { GroupService } from '../services/group.service';
import { MessageService } from '../services/message.service';
import { GroupRepository } from '../repositories/group.repository';
import { MessageRepository } from '../repositories/message.repository';
import { UserRepository } from '../repositories/user.repository';
import { TokenService } from '../services/token.service';
import { AuthMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  createGroupSchema,
  sendMessageSchema,
  reactToMessageSchema,
  type CreateGroupInput,
  type CreateMessageInput
} from '@golden-palace/shared';

const router = Router();

// Initialize repositories and services
const userRepository = new UserRepository();
const groupRepository = new GroupRepository();
const messageRepository = new MessageRepository();
const tokenService = new TokenService();
const authMiddleware = new AuthMiddleware(tokenService, userRepository);
const groupService = new GroupService(groupRepository, userRepository);
const messageService = new MessageService(messageRepository, groupRepository, userRepository);

// Validation schemas
const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  maxMembers: z.number().int().min(2).max(1000).optional(),
  groupType: z.enum(['PUBLIC', 'PRIVATE', 'INVITE_ONLY']).optional()
});

const getGroupsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  groupType: z.enum(['PUBLIC', 'PRIVATE', 'INVITE_ONLY']).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'memberCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

const getMessagesSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  before: z.string().optional(),
  after: z.string().optional()
});

// Group routes

// POST /api/chat/groups - Create a new group
router.post('/groups',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const groupData: CreateGroupInput = req.body;

      // Basic validation
      if (!groupData.name || !groupData.groupType) {
        return res.status(400).json({
          success: false,
          error: 'Name and group type are required'
        });
      }

      const result = await groupService.createGroup(userId, groupData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// GET /api/chat/groups - Get user's groups
router.get('/groups',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Parse query parameters properly
      const query = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        search: req.query.search as string,
        groupType: req.query.groupType as any,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      };

      const result = await groupService.getGroups(userId, query);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// GET /api/chat/groups/:groupId - Get specific group
router.get('/groups/:groupId',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;

      // Check if user is a member
      const membership = await groupService.getMembership(userId, groupId);
      if (!membership.success) {
        return res.status(404).json({
          success: false,
          error: 'Group not found or access denied'
        });
      }

      // Get group details (we'll use the repository directly for this specific case)
      const group = await groupRepository.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found'
        });
      }

      res.json({
        success: true,
        data: group
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// PUT /api/chat/groups/:groupId - Update group
router.put('/groups/:groupId',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const updateData = req.body;

      const result = await groupService.updateGroup(userId, groupId, updateData);

      if (!result.success) {
        const statusCode = result.error?.includes('not authorized') ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// DELETE /api/chat/groups/:groupId - Delete group
router.delete('/groups/:groupId',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;

      const result = await groupService.deleteGroup(userId, groupId);

      if (!result.success) {
        const statusCode = result.error?.includes('not authorized') ? 403 : 404;
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Group deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Group membership routes

// POST /api/chat/groups/:groupId/members - Add member to group
router.post('/groups/:groupId/members',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const { userId: memberId, role = 'MEMBER' } = req.body;

      if (!memberId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = await groupService.addMember(userId, groupId, memberId, role);

      if (!result.success) {
        const statusCode = result.error?.includes('not authorized') ? 403 :
                          result.error?.includes('already a member') ? 409 : 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// GET /api/chat/groups/:groupId/members - Get group members
router.get('/groups/:groupId/members',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const { role } = req.query as { role?: string };

      const result = await groupService.getMembers(userId, groupId, role as any);

      if (!result.success) {
        const statusCode = result.error?.includes('not a member') ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// POST /api/chat/groups/join/:inviteCode - Join group by invite code
router.post('/groups/join/:inviteCode',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { inviteCode } = req.params;

      const result = await groupService.joinByInviteCode(userId, inviteCode);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Message routes

// POST /api/chat/groups/:groupId/messages - Send message to group
router.post('/groups/:groupId/messages',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const messageData: CreateMessageInput = {
        ...req.body,
        groupId
      };

      const result = await messageService.createMessage(userId, messageData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// GET /api/chat/groups/:groupId/messages - Get messages from group
router.get('/groups/:groupId/messages',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;

      // Parse query parameters properly
      const query = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        before: req.query.before as string,
        after: req.query.after as string
      };

      const result = await messageService.getMessages(userId, groupId, query);

      if (!result.success) {
        const statusCode = result.error?.includes('not a member') ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// PUT /api/chat/messages/:messageId - Update message
router.put('/messages/:messageId',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { messageId } = req.params;
      const { content, attachments } = req.body;

      const result = await messageService.updateMessage(userId, messageId, {
        content,
        attachments
      });

      if (!result.success) {
        const statusCode = result.error?.includes('not authorized') ? 403 :
                          result.error?.includes('not found') ? 404 : 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// DELETE /api/chat/messages/:messageId - Delete message
router.delete('/messages/:messageId',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { messageId } = req.params;

      const result = await messageService.deleteMessage(userId, messageId);

      if (!result.success) {
        const statusCode = result.error?.includes('not authorized') ? 403 :
                          result.error?.includes('not found') ? 404 : 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Reaction routes

// POST /api/chat/messages/:messageId/reactions - Add reaction
router.post('/messages/:messageId/reactions',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { messageId } = req.params;
      const { emoji } = req.body;

      const result = await messageService.addReaction(userId, messageId, emoji);

      if (!result.success) {
        const statusCode = result.error?.includes('not a member') ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// DELETE /api/chat/messages/:messageId/reactions - Remove reaction
router.delete('/messages/:messageId/reactions',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { messageId } = req.params;
      const { emoji } = req.query as { emoji: string };

      if (!emoji) {
        return res.status(400).json({
          success: false,
          error: 'Emoji parameter is required'
        });
      }

      const result = await messageService.removeReaction(userId, messageId, emoji);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Reaction removed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Read receipt routes

// POST /api/chat/messages/:messageId/read - Mark message as read
router.post('/messages/:messageId/read',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { messageId } = req.params;

      const result = await messageService.markAsRead(userId, messageId);

      if (!result.success) {
        const statusCode = result.error?.includes('not a member') ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Message marked as read'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Utility routes

// GET /api/chat/groups/:groupId/unread-count - Get unread message count
router.get('/groups/:groupId/unread-count',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;

      const result = await messageService.getUnreadCount(userId, groupId);

      if (!result.success) {
        const statusCode = result.error?.includes('not a member') ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: { unreadCount: result.data }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// GET /api/chat/groups/:groupId/search - Search messages in group
router.get('/groups/:groupId/search',
  authMiddleware.authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const { q } = req.query as { q: string };

      if (!q || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      const result = await messageService.searchMessages(userId, groupId, q);

      if (!result.success) {
        const statusCode = result.error?.includes('not a member') ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

export { router as chatRoutes };