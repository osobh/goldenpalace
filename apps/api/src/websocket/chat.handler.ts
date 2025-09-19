import { Server as SocketIOServer, Socket } from 'socket.io';
import { MessageService } from '../services/message.service';
import { GroupService } from '../services/group.service';
import { AuthService } from '../services/auth.service';
import type { CreateMessageInput } from '@golden-palace/shared';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  email?: string;
}

interface TypingTracker {
  [groupId: string]: {
    [userId: string]: {
      username: string;
      timeout: NodeJS.Timeout;
    };
  };
}

export class ChatHandler {
  private typingUsers: TypingTracker = {};

  constructor(
    private io: SocketIOServer,
    private messageService: MessageService,
    private groupService: GroupService,
    private authService: AuthService
  ) {
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth?.token;

        if (!token) {
          return next(new Error('Authentication failed: No token provided'));
        }

        const authResult = await this.authService.verifyToken(token);

        if (!authResult.success || !authResult.data) {
          return next(new Error('Authentication failed: Invalid token'));
        }

        socket.userId = authResult.data.userId;
        socket.username = authResult.data.username;
        socket.email = authResult.data.email;

        next();
      } catch (error) {
        next(new Error('Authentication failed: Server error'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.username} connected`);

      this.handleGroupEvents(socket);
      this.handleMessageEvents(socket);
      this.handleReactionEvents(socket);
      this.handleTypingEvents(socket);
      this.handleReadReceiptEvents(socket);
      this.handleDisconnection(socket);
    });
  }

  private handleGroupEvents(socket: AuthenticatedSocket): void {
    socket.on('join-group', async (groupId: string) => {
      try {
        if (!socket.userId || !groupId) {
          socket.emit('group-join-error', { message: 'Invalid request data' });
          return;
        }

        const membershipResult = await this.groupService.getMembership(socket.userId, groupId);

        if (!membershipResult.success) {
          socket.emit('group-join-error', {
            message: 'You are not a member of this group'
          });
          return;
        }

        await socket.join(`group:${groupId}`);

        socket.emit('group-joined', {
          groupId,
          success: true,
          message: 'Successfully joined group'
        });

        console.log(`User ${socket.username} joined group ${groupId}`);
      } catch (error) {
        socket.emit('group-join-error', {
          message: 'Failed to join group'
        });
      }
    });

    socket.on('leave-group', async (groupId: string) => {
      try {
        if (!groupId) {
          return;
        }

        await socket.leave(`group:${groupId}`);

        socket.emit('group-left', {
          groupId,
          success: true,
          message: 'Successfully left group'
        });

        this.cleanupTypingForUser(socket.userId!, groupId);
        console.log(`User ${socket.username} left group ${groupId}`);
      } catch (error) {
        console.error(`Error leaving group ${groupId}:`, error);
      }
    });
  }

  private handleMessageEvents(socket: AuthenticatedSocket): void {
    socket.on('send-message', async (messageData: CreateMessageInput) => {
      try {
        if (!socket.userId) {
          socket.emit('message-error', { message: 'Authentication required' });
          return;
        }

        if (!this.validateMessageData(messageData)) {
          socket.emit('message-error', { message: 'Invalid message data' });
          return;
        }

        const result = await this.messageService.createMessage(socket.userId, messageData);

        if (!result.success) {
          socket.emit('message-error', { message: result.error });
          return;
        }

        socket.emit('message-sent', {
          success: true,
          data: result.data
        });

        socket.to(`group:${messageData.groupId}`).emit('new-message', {
          id: result.data!.id,
          groupId: messageData.groupId,
          userId: socket.userId,
          content: result.data!.content,
          messageType: result.data!.messageType,
          attachments: result.data!.attachments,
          replyToId: result.data!.replyToId,
          user: {
            id: socket.userId,
            username: socket.username!,
            avatarUrl: result.data!.user.avatarUrl
          },
          createdAt: result.data!.createdAt
        });

        this.cleanupTypingForUser(socket.userId, messageData.groupId!);
      } catch (error) {
        socket.emit('message-error', {
          message: 'Failed to send message'
        });
      }
    });
  }

  private handleReactionEvents(socket: AuthenticatedSocket): void {
    socket.on('add-reaction', async (data: { messageId: string; emoji: string }) => {
      try {
        if (!socket.userId || !data.messageId || !data.emoji) {
          socket.emit('reaction-error', { message: 'Invalid reaction data' });
          return;
        }

        const result = await this.messageService.addReaction(
          socket.userId,
          data.messageId,
          data.emoji
        );

        if (!result.success) {
          socket.emit('reaction-error', { message: result.error });
          return;
        }

        socket.emit('reaction-added', {
          success: true,
          data: result.data
        });

        const message = await this.messageService.getMessages(
          socket.userId,
          '',
          { limit: 1 }
        );

        if (message.success && message.data && message.data.data.length > 0) {
          const groupId = message.data.data[0].groupId;

          socket.to(`group:${groupId}`).emit('reaction-update', {
            messageId: data.messageId,
            emoji: data.emoji,
            userId: socket.userId,
            username: socket.username,
            action: 'add'
          });
        }
      } catch (error) {
        socket.emit('reaction-error', {
          message: 'Failed to add reaction'
        });
      }
    });

    socket.on('remove-reaction', async (data: { messageId: string; emoji: string }) => {
      try {
        if (!socket.userId || !data.messageId || !data.emoji) {
          socket.emit('reaction-error', { message: 'Invalid reaction data' });
          return;
        }

        const result = await this.messageService.removeReaction(
          socket.userId,
          data.messageId,
          data.emoji
        );

        if (!result.success) {
          socket.emit('reaction-error', { message: result.error });
          return;
        }

        socket.emit('reaction-removed', {
          success: true
        });

        const message = await this.messageService.getMessages(
          socket.userId,
          '',
          { limit: 1 }
        );

        if (message.success && message.data && message.data.data.length > 0) {
          const groupId = message.data.data[0].groupId;

          socket.to(`group:${groupId}`).emit('reaction-update', {
            messageId: data.messageId,
            emoji: data.emoji,
            userId: socket.userId,
            username: socket.username,
            action: 'remove'
          });
        }
      } catch (error) {
        socket.emit('reaction-error', {
          message: 'Failed to remove reaction'
        });
      }
    });
  }

  private handleTypingEvents(socket: AuthenticatedSocket): void {
    socket.on('typing-start', (data: { groupId: string }) => {
      try {
        if (!socket.userId || !socket.username || !data.groupId) {
          return;
        }

        this.startTyping(socket.userId, socket.username, data.groupId);

        socket.to(`group:${data.groupId}`).emit('user-typing', {
          userId: socket.userId,
          username: socket.username,
          groupId: data.groupId,
          isTyping: true
        });
      } catch (error) {
        console.error('Error handling typing start:', error);
      }
    });

    socket.on('typing-stop', (data: { groupId: string }) => {
      try {
        if (!socket.userId || !data.groupId) {
          return;
        }

        this.stopTyping(socket.userId, data.groupId);

        socket.to(`group:${data.groupId}`).emit('user-typing', {
          userId: socket.userId,
          username: socket.username,
          groupId: data.groupId,
          isTyping: false
        });
      } catch (error) {
        console.error('Error handling typing stop:', error);
      }
    });
  }

  private handleReadReceiptEvents(socket: AuthenticatedSocket): void {
    socket.on('mark-as-read', async (data: { messageId: string }) => {
      try {
        if (!socket.userId || !data.messageId) {
          socket.emit('read-receipt-error', { message: 'Invalid request data' });
          return;
        }

        const result = await this.messageService.markAsRead(socket.userId, data.messageId);

        if (!result.success) {
          socket.emit('read-receipt-error', { message: result.error });
          return;
        }

        socket.emit('message-read', {
          success: true,
          messageId: data.messageId
        });

        // Find the group for this message to broadcast the read receipt
        const messageQuery = await this.messageService.getMessages(socket.userId, '', { limit: 1 });

        if (messageQuery.success && messageQuery.data && messageQuery.data.data.length > 0) {
          const groupId = messageQuery.data.data[0].groupId;

          socket.to(`group:${groupId}`).emit('read-receipt-update', {
            messageId: data.messageId,
            userId: socket.userId,
            username: socket.username,
            readAt: new Date()
          });
        }
      } catch (error) {
        socket.emit('read-receipt-error', {
          message: 'Failed to mark message as read'
        });
      }
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    socket.on('disconnect', () => {
      console.log(`User ${socket.username} disconnected`);

      if (socket.userId) {
        this.cleanupTypingForUser(socket.userId);
      }
    });
  }

  private validateMessageData(data: CreateMessageInput): boolean {
    if (!data.groupId || !data.messageType) {
      return false;
    }

    if (data.messageType === 'TEXT') {
      return !!(data.content && data.content.trim().length > 0);
    }

    return !!(data.content || data.attachments);
  }

  private startTyping(userId: string, username: string, groupId: string): void {
    if (!this.typingUsers[groupId]) {
      this.typingUsers[groupId] = {};
    }

    if (this.typingUsers[groupId][userId]) {
      clearTimeout(this.typingUsers[groupId][userId].timeout);
    }

    const timeout = setTimeout(() => {
      this.stopTyping(userId, groupId);

      this.io.to(`group:${groupId}`).emit('user-typing', {
        userId,
        username,
        groupId,
        isTyping: false
      });
    }, 3000);

    this.typingUsers[groupId][userId] = {
      username,
      timeout
    };
  }

  private stopTyping(userId: string, groupId: string): void {
    if (this.typingUsers[groupId] && this.typingUsers[groupId][userId]) {
      clearTimeout(this.typingUsers[groupId][userId].timeout);
      delete this.typingUsers[groupId][userId];

      if (Object.keys(this.typingUsers[groupId]).length === 0) {
        delete this.typingUsers[groupId];
      }
    }
  }

  private cleanupTypingForUser(userId: string, groupId?: string): void {
    if (groupId) {
      this.stopTyping(userId, groupId);
    } else {
      Object.keys(this.typingUsers).forEach(gid => {
        this.stopTyping(userId, gid);
      });
    }
  }
}