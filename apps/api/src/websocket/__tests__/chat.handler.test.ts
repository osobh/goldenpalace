import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { Client as SocketIOClient, io as ioc } from 'socket.io-client';
import { ChatHandler } from '../chat.handler';
import { MessageService } from '../../services/message.service';
import { GroupService } from '../../services/group.service';
import { AuthService } from '../../services/auth.service';
import { prisma } from '@golden-palace/database';
import type { Socket } from 'socket.io';

describe('ChatHandler', () => {
  let server: any;
  let ioServer: SocketIOServer;
  let chatHandler: ChatHandler;
  let messageService: MessageService;
  let groupService: GroupService;
  let authService: AuthService;
  let clientSocket: SocketIOClient;
  let testUser: any;
  let testGroup: any;
  let authToken: string;

  beforeEach(async () => {
    // Clean database
    await prisma.messageReaction.deleteMany();
    await prisma.readReceipt.deleteMany();
    await prisma.message.deleteMany();
    await prisma.groupMembership.deleteMany();
    await prisma.group.deleteMany();
    await prisma.userStats.deleteMany();
    await prisma.user.deleteMany();

    // Create HTTP server and Socket.IO server
    server = createServer();
    ioServer = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Initialize services
    messageService = new MessageService(
      {} as any, // MessageRepository mock
      {} as any, // GroupRepository mock
      {} as any  // UserRepository mock
    );
    groupService = new GroupService({} as any, {} as any);
    authService = new AuthService({} as any, {} as any, {} as any);

    // Initialize chat handler
    chatHandler = new ChatHandler(ioServer, messageService, groupService, authService);

    // Create test user and group
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
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
      }
    });

    testGroup = await prisma.group.create({
      data: {
        name: 'Test Group',
        ownerId: testUser.id,
        groupType: 'PRIVATE'
      }
    });

    await prisma.groupMembership.create({
      data: {
        groupId: testGroup.id,
        userId: testUser.id,
        role: 'OWNER'
      }
    });

    // Generate auth token
    authToken = 'mock-jwt-token';

    // Mock auth service verification
    vi.spyOn(authService, 'verifyToken').mockResolvedValue({
      success: true,
      data: {
        userId: testUser.id,
        email: testUser.email,
        username: testUser.username
      }
    });

    // Start server
    await new Promise<void>((resolve) => {
      server.listen(3001, resolve);
    });
  });

  afterEach(async () => {
    // Clean up
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }

    ioServer.close();
    server.close();

    // Clean database
    await prisma.messageReaction.deleteMany();
    await prisma.readReceipt.deleteMany();
    await prisma.message.deleteMany();
    await prisma.groupMembership.deleteMany();
    await prisma.group.deleteMany();
    await prisma.userStats.deleteMany();
    await prisma.user.deleteMany();

    vi.restoreAllMocks();
  });

  describe('connection authentication', () => {
    it('should authenticate user with valid token', (done) => {
      clientSocket = ioc('http://localhost:3001', {
        auth: {
          token: authToken
        }
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });
    });

    it('should reject connection with invalid token', (done) => {
      vi.spyOn(authService, 'verifyToken').mockResolvedValue({
        success: false,
        error: 'Invalid token'
      });

      clientSocket = ioc('http://localhost:3001', {
        auth: {
          token: 'invalid-token'
        }
      });

      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication failed');
        done();
      });

      clientSocket.on('connect', () => {
        done(new Error('Should not have connected with invalid token'));
      });
    });

    it('should reject connection without token', (done) => {
      clientSocket = ioc('http://localhost:3001');

      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication failed');
        done();
      });

      clientSocket.on('connect', () => {
        done(new Error('Should not have connected without token'));
      });
    });
  });

  describe('joining groups', () => {
    beforeEach((done) => {
      clientSocket = ioc('http://localhost:3001', {
        auth: { token: authToken }
      });
      clientSocket.on('connect', () => done());
    });

    it('should join group successfully', (done) => {
      // Mock group membership check
      vi.spyOn(groupService, 'getMembership').mockResolvedValue({
        success: true,
        data: {
          userId: testUser.id,
          groupId: testGroup.id,
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: new Date()
        }
      });

      clientSocket.emit('join-group', testGroup.id);

      clientSocket.on('group-joined', (data) => {
        expect(data.groupId).toBe(testGroup.id);
        expect(data.success).toBe(true);
        done();
      });
    });

    it('should reject joining group if not a member', (done) => {
      vi.spyOn(groupService, 'getMembership').mockResolvedValue({
        success: false,
        error: 'Not a member of this group'
      });

      clientSocket.emit('join-group', testGroup.id);

      clientSocket.on('group-join-error', (error) => {
        expect(error.message).toContain('not a member');
        done();
      });
    });

    it('should leave group successfully', (done) => {
      // First join the group
      vi.spyOn(groupService, 'getMembership').mockResolvedValue({
        success: true,
        data: {
          userId: testUser.id,
          groupId: testGroup.id,
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: new Date()
        }
      });

      clientSocket.emit('join-group', testGroup.id);

      clientSocket.on('group-joined', () => {
        clientSocket.emit('leave-group', testGroup.id);

        clientSocket.on('group-left', (data) => {
          expect(data.groupId).toBe(testGroup.id);
          expect(data.success).toBe(true);
          done();
        });
      });
    });
  });

  describe('sending messages', () => {
    beforeEach((done) => {
      clientSocket = ioc('http://localhost:3001', {
        auth: { token: authToken }
      });

      clientSocket.on('connect', () => {
        // Join group first
        vi.spyOn(groupService, 'getMembership').mockResolvedValue({
          success: true,
          data: {
            userId: testUser.id,
            groupId: testGroup.id,
            role: 'OWNER',
            status: 'ACTIVE',
            joinedAt: new Date()
          }
        });

        clientSocket.emit('join-group', testGroup.id);
        clientSocket.on('group-joined', () => done());
      });
    });

    it('should send text message successfully', (done) => {
      const messageData = {
        groupId: testGroup.id,
        content: 'Hello, this is a test message!',
        messageType: 'TEXT'
      };

      const mockMessage = {
        id: 'message-1',
        ...messageData,
        userId: testUser.id,
        createdAt: new Date(),
        user: { id: testUser.id, username: testUser.username }
      };

      vi.spyOn(messageService, 'createMessage').mockResolvedValue({
        success: true,
        data: mockMessage
      });

      clientSocket.emit('send-message', messageData);

      clientSocket.on('message-sent', (response) => {
        expect(response.success).toBe(true);
        expect(response.data.content).toBe(messageData.content);
        done();
      });
    });

    it('should broadcast message to group members', (done) => {
      // Create second client for the same user
      const secondSocket = ioc('http://localhost:3001', {
        auth: { token: authToken }
      });

      secondSocket.on('connect', () => {
        secondSocket.emit('join-group', testGroup.id);

        secondSocket.on('group-joined', () => {
          const messageData = {
            groupId: testGroup.id,
            content: 'Broadcast test message',
            messageType: 'TEXT'
          };

          const mockMessage = {
            id: 'message-2',
            ...messageData,
            userId: testUser.id,
            createdAt: new Date(),
            user: { id: testUser.id, username: testUser.username }
          };

          vi.spyOn(messageService, 'createMessage').mockResolvedValue({
            success: true,
            data: mockMessage
          });

          // Listen for broadcast on second socket
          secondSocket.on('new-message', (message) => {
            expect(message.content).toBe(messageData.content);
            secondSocket.disconnect();
            done();
          });

          // Send message from first socket
          clientSocket.emit('send-message', messageData);
        });
      });
    });

    it('should handle message sending errors', (done) => {
      const messageData = {
        groupId: testGroup.id,
        content: 'a'.repeat(10001), // Too long
        messageType: 'TEXT'
      };

      vi.spyOn(messageService, 'createMessage').mockResolvedValue({
        success: false,
        error: 'Message content is too long'
      });

      clientSocket.emit('send-message', messageData);

      clientSocket.on('message-error', (error) => {
        expect(error.message).toContain('too long');
        done();
      });
    });

    it('should validate message data', (done) => {
      const invalidMessageData = {
        groupId: testGroup.id,
        // Missing content
        messageType: 'TEXT'
      };

      clientSocket.emit('send-message', invalidMessageData);

      clientSocket.on('message-error', (error) => {
        expect(error.message).toContain('Invalid message data');
        done();
      });
    });
  });

  describe('message reactions', () => {
    let testMessage: any;

    beforeEach((done) => {
      clientSocket = ioc('http://localhost:3001', {
        auth: { token: authToken }
      });

      clientSocket.on('connect', () => {
        // Join group and create test message
        vi.spyOn(groupService, 'getMembership').mockResolvedValue({
          success: true,
          data: {
            userId: testUser.id,
            groupId: testGroup.id,
            role: 'OWNER',
            status: 'ACTIVE',
            joinedAt: new Date()
          }
        });

        clientSocket.emit('join-group', testGroup.id);

        clientSocket.on('group-joined', async () => {
          testMessage = await prisma.message.create({
            data: {
              groupId: testGroup.id,
              userId: testUser.id,
              content: 'Test message for reactions',
              messageType: 'TEXT'
            }
          });
          done();
        });
      });
    });

    it('should add reaction successfully', (done) => {
      const reactionData = {
        messageId: testMessage.id,
        emoji: '👍'
      };

      const mockReaction = {
        id: 'reaction-1',
        messageId: testMessage.id,
        userId: testUser.id,
        emoji: '👍',
        createdAt: new Date()
      };

      vi.spyOn(messageService, 'addReaction').mockResolvedValue({
        success: true,
        data: mockReaction
      });

      clientSocket.emit('add-reaction', reactionData);

      clientSocket.on('reaction-added', (response) => {
        expect(response.success).toBe(true);
        expect(response.data.emoji).toBe('👍');
        done();
      });
    });

    it('should broadcast reaction to group members', (done) => {
      const secondSocket = ioc('http://localhost:3001', {
        auth: { token: authToken }
      });

      secondSocket.on('connect', () => {
        secondSocket.emit('join-group', testGroup.id);

        secondSocket.on('group-joined', () => {
          const reactionData = {
            messageId: testMessage.id,
            emoji: '❤️'
          };

          const mockReaction = {
            id: 'reaction-2',
            messageId: testMessage.id,
            userId: testUser.id,
            emoji: '❤️',
            createdAt: new Date()
          };

          vi.spyOn(messageService, 'addReaction').mockResolvedValue({
            success: true,
            data: mockReaction
          });

          secondSocket.on('reaction-update', (data) => {
            expect(data.messageId).toBe(testMessage.id);
            expect(data.emoji).toBe('❤️');
            secondSocket.disconnect();
            done();
          });

          clientSocket.emit('add-reaction', reactionData);
        });
      });
    });

    it('should remove reaction successfully', (done) => {
      const reactionData = {
        messageId: testMessage.id,
        emoji: '👍'
      };

      vi.spyOn(messageService, 'removeReaction').mockResolvedValue({
        success: true
      });

      clientSocket.emit('remove-reaction', reactionData);

      clientSocket.on('reaction-removed', (response) => {
        expect(response.success).toBe(true);
        done();
      });
    });
  });

  describe('typing indicators', () => {
    beforeEach((done) => {
      clientSocket = ioc('http://localhost:3001', {
        auth: { token: authToken }
      });

      clientSocket.on('connect', () => {
        vi.spyOn(groupService, 'getMembership').mockResolvedValue({
          success: true,
          data: {
            userId: testUser.id,
            groupId: testGroup.id,
            role: 'OWNER',
            status: 'ACTIVE',
            joinedAt: new Date()
          }
        });

        clientSocket.emit('join-group', testGroup.id);
        clientSocket.on('group-joined', () => done());
      });
    });

    it('should broadcast typing start to group members', (done) => {
      const secondSocket = ioc('http://localhost:3001', {
        auth: { token: authToken }
      });

      secondSocket.on('connect', () => {
        secondSocket.emit('join-group', testGroup.id);

        secondSocket.on('group-joined', () => {
          secondSocket.on('user-typing', (data) => {
            expect(data.userId).toBe(testUser.id);
            expect(data.groupId).toBe(testGroup.id);
            expect(data.isTyping).toBe(true);
            secondSocket.disconnect();
            done();
          });

          clientSocket.emit('typing-start', { groupId: testGroup.id });
        });
      });
    });

    it('should broadcast typing stop to group members', (done) => {
      const secondSocket = ioc('http://localhost:3001', {
        auth: { token: authToken }
      });

      secondSocket.on('connect', () => {
        secondSocket.emit('join-group', testGroup.id);

        secondSocket.on('group-joined', () => {
          secondSocket.on('user-typing', (data) => {
            expect(data.userId).toBe(testUser.id);
            expect(data.groupId).toBe(testGroup.id);
            expect(data.isTyping).toBe(false);
            secondSocket.disconnect();
            done();
          });

          clientSocket.emit('typing-stop', { groupId: testGroup.id });
        });
      });
    });

    it('should auto-stop typing after timeout', (done) => {
      const secondSocket = ioc('http://localhost:3001', {
        auth: { token: authToken }
      });

      secondSocket.on('connect', () => {
        secondSocket.emit('join-group', testGroup.id);

        secondSocket.on('group-joined', () => {
          let typingEvents = 0;

          secondSocket.on('user-typing', (data) => {
            typingEvents++;

            if (typingEvents === 1) {
              expect(data.isTyping).toBe(true);
            } else if (typingEvents === 2) {
              expect(data.isTyping).toBe(false); // Auto-stopped
              secondSocket.disconnect();
              done();
            }
          });

          clientSocket.emit('typing-start', { groupId: testGroup.id });
          // Don't send typing-stop, should auto-stop after timeout
        });
      });
    });
  });

  describe('read receipts', () => {
    let testMessage: any;

    beforeEach((done) => {
      clientSocket = ioc('http://localhost:3001', {
        auth: { token: authToken }
      });

      clientSocket.on('connect', () => {
        vi.spyOn(groupService, 'getMembership').mockResolvedValue({
          success: true,
          data: {
            userId: testUser.id,
            groupId: testGroup.id,
            role: 'OWNER',
            status: 'ACTIVE',
            joinedAt: new Date()
          }
        });

        clientSocket.emit('join-group', testGroup.id);

        clientSocket.on('group-joined', async () => {
          testMessage = await prisma.message.create({
            data: {
              groupId: testGroup.id,
              userId: testUser.id,
              content: 'Test message for read receipts',
              messageType: 'TEXT'
            }
          });
          done();
        });
      });
    });

    it('should mark message as read successfully', (done) => {
      vi.spyOn(messageService, 'markAsRead').mockResolvedValue({
        success: true
      });

      clientSocket.emit('mark-as-read', { messageId: testMessage.id });

      clientSocket.on('message-read', (response) => {
        expect(response.success).toBe(true);
        done();
      });
    });

    it('should broadcast read receipt to group members', (done) => {
      const secondSocket = ioc('http://localhost:3001', {
        auth: { token: authToken }
      });

      secondSocket.on('connect', () => {
        secondSocket.emit('join-group', testGroup.id);

        secondSocket.on('group-joined', () => {
          vi.spyOn(messageService, 'markAsRead').mockResolvedValue({
            success: true
          });

          secondSocket.on('read-receipt-update', (data) => {
            expect(data.messageId).toBe(testMessage.id);
            expect(data.userId).toBe(testUser.id);
            secondSocket.disconnect();
            done();
          });

          clientSocket.emit('mark-as-read', { messageId: testMessage.id });
        });
      });
    });
  });

  describe('error handling', () => {
    beforeEach((done) => {
      clientSocket = ioc('http://localhost:3001', {
        auth: { token: authToken }
      });
      clientSocket.on('connect', () => done());
    });

    it('should handle service errors gracefully', (done) => {
      vi.spyOn(groupService, 'getMembership').mockRejectedValue(
        new Error('Database connection failed')
      );

      clientSocket.emit('join-group', testGroup.id);

      clientSocket.on('group-join-error', (error) => {
        expect(error.message).toContain('Internal server error');
        done();
      });
    });

    it('should handle invalid event data', (done) => {
      clientSocket.emit('send-message', { invalid: 'data' });

      clientSocket.on('message-error', (error) => {
        expect(error.message).toContain('Invalid message data');
        done();
      });
    });

    it('should handle disconnection gracefully', (done) => {
      vi.spyOn(groupService, 'getMembership').mockResolvedValue({
        success: true,
        data: {
          userId: testUser.id,
          groupId: testGroup.id,
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: new Date()
        }
      });

      clientSocket.emit('join-group', testGroup.id);

      clientSocket.on('group-joined', () => {
        clientSocket.disconnect();

        // Should not throw errors when disconnected
        setTimeout(() => {
          expect(clientSocket.connected).toBe(false);
          done();
        }, 100);
      });
    });
  });

  describe('rate limiting', () => {
    beforeEach((done) => {
      clientSocket = ioc('http://localhost:3001', {
        auth: { token: authToken }
      });

      clientSocket.on('connect', () => {
        vi.spyOn(groupService, 'getMembership').mockResolvedValue({
          success: true,
          data: {
            userId: testUser.id,
            groupId: testGroup.id,
            role: 'OWNER',
            status: 'ACTIVE',
            joinedAt: new Date()
          }
        });

        clientSocket.emit('join-group', testGroup.id);
        clientSocket.on('group-joined', () => done());
      });
    });

    it('should enforce message rate limits', (done) => {
      vi.spyOn(messageService, 'createMessage').mockResolvedValue({
        success: true,
        data: {
          id: 'msg-1',
          content: 'Test',
          groupId: testGroup.id,
          userId: testUser.id,
          messageType: 'TEXT',
          createdAt: new Date()
        }
      });

      let messageCount = 0;
      const maxMessages = 10;

      const sendMessage = () => {
        messageCount++;
        clientSocket.emit('send-message', {
          groupId: testGroup.id,
          content: `Message ${messageCount}`,
          messageType: 'TEXT'
        });
      };

      clientSocket.on('message-sent', () => {
        if (messageCount < maxMessages) {
          sendMessage();
        }
      });

      clientSocket.on('rate-limit-exceeded', (error) => {
        expect(error.message).toContain('rate limit');
        expect(messageCount).toBeGreaterThan(5); // Should have sent some messages first
        done();
      });

      // Start sending messages rapidly
      sendMessage();
    });
  });
});