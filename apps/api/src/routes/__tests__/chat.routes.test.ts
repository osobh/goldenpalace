import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '@golden-palace/database';
import type { CreateGroupInput, CreateMessageInput } from '@golden-palace/shared';

describe('Chat Routes Integration Tests', () => {
  let accessToken: string;
  let testUser: any;
  let otherUser: any;
  let testGroup: any;

  beforeAll(async () => {
    // Ensure test database is connected
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.messageReaction.deleteMany();
    await prisma.readReceipt.deleteMany();
    await prisma.message.deleteMany();
    await prisma.groupMembership.deleteMany();
    await prisma.group.deleteMany();
    await prisma.userStats.deleteMany();
    await prisma.user.deleteMany();

    // Create test user and authenticate
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      });

    testUser = registerResponse.body.data.user;
    accessToken = registerResponse.body.data.tokens.accessToken;

    // Create second user
    const otherUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'other@example.com',
        username: 'otheruser',
        password: 'SecurePass123!'
      });

    otherUser = otherUserResponse.body.data.user;
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.messageReaction.deleteMany();
    await prisma.readReceipt.deleteMany();
    await prisma.message.deleteMany();
    await prisma.groupMembership.deleteMany();
    await prisma.group.deleteMany();
    await prisma.userStats.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/chat/groups', () => {
    it('should create a group successfully', async () => {
      const groupData: CreateGroupInput = {
        name: 'Trading Strategies',
        description: 'Discussion about trading strategies',
        groupType: 'PRIVATE',
        maxMembers: 50
      };

      const response = await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(groupData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(groupData.name);
      expect(response.body.data.description).toBe(groupData.description);
      expect(response.body.data.groupType).toBe('PRIVATE');
      expect(response.body.data.ownerId).toBe(testUser.id);
      expect(response.body.data.maxMembers).toBe(50);
    });

    it('should create public group with invite code', async () => {
      const groupData: CreateGroupInput = {
        name: 'Public Trading Room',
        groupType: 'PUBLIC'
      };

      const response = await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(groupData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.groupType).toBe('PUBLIC');
      expect(response.body.data.inviteCode).toBeDefined();
      expect(response.body.data.inviteCode).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('should validate group creation data', async () => {
      const invalidData = {
        name: '', // Empty name
        groupType: 'INVALID_TYPE'
      };

      const response = await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should require authentication', async () => {
      const groupData: CreateGroupInput = {
        name: 'Unauthorized Group',
        groupType: 'PRIVATE'
      };

      const response = await request(app)
        .post('/api/chat/groups')
        .send(groupData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('GET /api/chat/groups', () => {
    beforeEach(async () => {
      // Create test groups
      await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Group 1',
          groupType: 'PRIVATE'
        });

      await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Group 2',
          groupType: 'PUBLIC'
        });
    });

    it('should retrieve user groups with pagination', async () => {
      const response = await request(app)
        .get('/api/chat/groups?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.pagination.total).toBe(2);
      expect(response.body.data.pagination.hasMore).toBe(true);
    });

    it('should filter groups by type', async () => {
      const response = await request(app)
        .get('/api/chat/groups?groupType=PRIVATE')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.every((group: any) => group.groupType === 'PRIVATE')).toBe(true);
    });

    it('should search groups by name', async () => {
      const response = await request(app)
        .get('/api/chat/groups?search=Group 1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].name).toBe('Group 1');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/chat/groups')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('PUT /api/chat/groups/:groupId', () => {
    beforeEach(async () => {
      const groupResponse = await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Original Group',
          description: 'Original description',
          groupType: 'PRIVATE'
        });

      testGroup = groupResponse.body.data;
    });

    it('should update group successfully', async () => {
      const updateData = {
        name: 'Updated Group Name',
        description: 'Updated description',
        maxMembers: 75
      };

      const response = await request(app)
        .put(`/api/chat/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.maxMembers).toBe(75);
    });

    it('should only allow owner to update group', async () => {
      const otherUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'SecurePass123!'
        });

      const otherUserToken = otherUserLogin.body.data.tokens.accessToken;

      const response = await request(app)
        .put(`/api/chat/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ name: 'Unauthorized Update' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not authorized');
    });

    it('should validate update data', async () => {
      const invalidData = {
        maxMembers: 1001 // Exceeds limit
      };

      const response = await request(app)
        .put(`/api/chat/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/chat/groups/:groupId', () => {
    beforeEach(async () => {
      const groupResponse = await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Group to Delete',
          groupType: 'PRIVATE'
        });

      testGroup = groupResponse.body.data;
    });

    it('should delete group successfully', async () => {
      const response = await request(app)
        .delete(`/api/chat/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify group is deleted
      const getResponse = await request(app)
        .get(`/api/chat/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should only allow owner to delete group', async () => {
      const otherUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'SecurePass123!'
        });

      const otherUserToken = otherUserLogin.body.data.tokens.accessToken;

      const response = await request(app)
        .delete(`/api/chat/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not authorized');
    });
  });

  describe('POST /api/chat/groups/:groupId/members', () => {
    beforeEach(async () => {
      const groupResponse = await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Member Test Group',
          groupType: 'PRIVATE'
        });

      testGroup = groupResponse.body.data;
    });

    it('should add member to group successfully', async () => {
      const memberData = {
        userId: otherUser.id,
        role: 'MEMBER'
      };

      const response = await request(app)
        .post(`/api/chat/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(memberData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(otherUser.id);
      expect(response.body.data.role).toBe('MEMBER');
    });

    it('should validate member data', async () => {
      const invalidData = {
        userId: 'non-existent-user-id',
        role: 'INVALID_ROLE'
      };

      const response = await request(app)
        .post(`/api/chat/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should prevent duplicate memberships', async () => {
      await request(app)
        .post(`/api/chat/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: otherUser.id });

      const response = await request(app)
        .post(`/api/chat/groups/${testGroup.id}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: otherUser.id })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already a member');
    });
  });

  describe('POST /api/chat/groups/join/:inviteCode', () => {
    let publicGroup: any;

    beforeEach(async () => {
      const groupResponse = await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Public Join Group',
          groupType: 'PUBLIC'
        });

      publicGroup = groupResponse.body.data;
    });

    it('should join group with valid invite code', async () => {
      const otherUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'SecurePass123!'
        });

      const otherUserToken = otherUserLogin.body.data.tokens.accessToken;

      const response = await request(app)
        .post(`/api/chat/groups/join/${publicGroup.inviteCode}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(otherUser.id);
      expect(response.body.data.groupId).toBe(publicGroup.id);
    });

    it('should fail with invalid invite code', async () => {
      const otherUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'SecurePass123!'
        });

      const otherUserToken = otherUserLogin.body.data.tokens.accessToken;

      const response = await request(app)
        .post('/api/chat/groups/join/INVALID0')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid invite code');
    });
  });

  describe('POST /api/chat/groups/:groupId/messages', () => {
    beforeEach(async () => {
      const groupResponse = await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Message Test Group',
          groupType: 'PRIVATE'
        });

      testGroup = groupResponse.body.data;
    });

    it('should send message successfully', async () => {
      const messageData: CreateMessageInput = {
        content: 'Hello, this is a test message!',
        messageType: 'TEXT'
      };

      const response = await request(app)
        .post(`/api/chat/groups/${testGroup.id}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(messageData.content);
      expect(response.body.data.messageType).toBe('TEXT');
      expect(response.body.data.userId).toBe(testUser.id);
      expect(response.body.data.groupId).toBe(testGroup.id);
    });

    it('should send image message with attachments', async () => {
      const messageData: CreateMessageInput = {
        content: 'Check out this chart!',
        messageType: 'IMAGE',
        attachments: {
          images: [
            {
              url: 'https://example.com/chart.png',
              width: 800,
              height: 600,
              size: 245760
            }
          ]
        }
      };

      const response = await request(app)
        .post(`/api/chat/groups/${testGroup.id}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messageType).toBe('IMAGE');
      expect(response.body.data.attachments).toEqual(messageData.attachments);
    });

    it('should validate message data', async () => {
      const invalidData = {
        content: 'a'.repeat(10001), // Too long
        messageType: 'TEXT'
      };

      const response = await request(app)
        .post(`/api/chat/groups/${testGroup.id}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('too long');
    });

    it('should fail if user is not group member', async () => {
      const otherUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'SecurePass123!'
        });

      const otherUserToken = otherUserLogin.body.data.tokens.accessToken;

      const messageData: CreateMessageInput = {
        content: 'Unauthorized message',
        messageType: 'TEXT'
      };

      const response = await request(app)
        .post(`/api/chat/groups/${testGroup.id}/messages`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(messageData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not a member');
    });
  });

  describe('GET /api/chat/groups/:groupId/messages', () => {
    let testMessage: any;

    beforeEach(async () => {
      const groupResponse = await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Message Test Group',
          groupType: 'PRIVATE'
        });

      testGroup = groupResponse.body.data;

      // Create test messages
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post(`/api/chat/groups/${testGroup.id}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            content: `Test message ${i}`,
            messageType: 'TEXT'
          });
      }
    });

    it('should retrieve messages with pagination', async () => {
      const response = await request(app)
        .get(`/api/chat/groups/${testGroup.id}/messages?page=1&limit=3`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(3);
      expect(response.body.data.pagination.total).toBe(5);
      expect(response.body.data.pagination.hasMore).toBe(true);
    });

    it('should return messages in chronological order (newest first)', async () => {
      const response = await request(app)
        .get(`/api/chat/groups/${testGroup.id}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data[0].content).toBe('Test message 5');
      expect(response.body.data.data[4].content).toBe('Test message 1');
    });

    it('should fail if user is not group member', async () => {
      const otherUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'SecurePass123!'
        });

      const otherUserToken = otherUserLogin.body.data.tokens.accessToken;

      const response = await request(app)
        .get(`/api/chat/groups/${testGroup.id}/messages`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not a member');
    });
  });

  describe('POST /api/chat/messages/:messageId/reactions', () => {
    let testMessage: any;

    beforeEach(async () => {
      const groupResponse = await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Reaction Test Group',
          groupType: 'PRIVATE'
        });

      testGroup = groupResponse.body.data;

      const messageResponse = await request(app)
        .post(`/api/chat/groups/${testGroup.id}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Message for reactions',
          messageType: 'TEXT'
        });

      testMessage = messageResponse.body.data;
    });

    it('should add reaction successfully', async () => {
      const response = await request(app)
        .post(`/api/chat/messages/${testMessage.id}/reactions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ emoji: '👍' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.emoji).toBe('👍');
      expect(response.body.data.userId).toBe(testUser.id);
    });

    it('should validate emoji format', async () => {
      const response = await request(app)
        .post(`/api/chat/messages/${testMessage.id}/reactions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ emoji: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid emoji');
    });

    it('should prevent duplicate reactions', async () => {
      await request(app)
        .post(`/api/chat/messages/${testMessage.id}/reactions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ emoji: '👍' });

      const response = await request(app)
        .post(`/api/chat/messages/${testMessage.id}/reactions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ emoji: '👍' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already reacted');
    });
  });

  describe('GET /api/chat/groups/:groupId/unread-count', () => {
    beforeEach(async () => {
      const groupResponse = await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Unread Test Group',
          groupType: 'PRIVATE'
        });

      testGroup = groupResponse.body.data;

      // Create multiple messages
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post(`/api/chat/groups/${testGroup.id}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            content: `Unread message ${i}`,
            messageType: 'TEXT'
          });
      }
    });

    it('should return correct unread count', async () => {
      const response = await request(app)
        .get(`/api/chat/groups/${testGroup.id}/unread-count`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(3); // All messages are unread
    });

    it('should fail if user is not group member', async () => {
      const otherUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'SecurePass123!'
        });

      const otherUserToken = otherUserLogin.body.data.tokens.accessToken;

      const response = await request(app)
        .get(`/api/chat/groups/${testGroup.id}/unread-count`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not a member');
    });
  });

  describe('GET /api/chat/groups/:groupId/search', () => {
    beforeEach(async () => {
      const groupResponse = await request(app)
        .post('/api/chat/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Search Test Group',
          groupType: 'PRIVATE'
        });

      testGroup = groupResponse.body.data;

      // Create test messages
      await request(app)
        .post(`/api/chat/groups/${testGroup.id}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Trading strategy discussion',
          messageType: 'TEXT'
        });

      await request(app)
        .post(`/api/chat/groups/${testGroup.id}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Market analysis for AAPL',
          messageType: 'TEXT'
        });
    });

    it('should search messages by content', async () => {
      const response = await request(app)
        .get(`/api/chat/groups/${testGroup.id}/search?q=trading`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].content).toContain('Trading');
    });

    it('should perform case-insensitive search', async () => {
      const response = await request(app)
        .get(`/api/chat/groups/${testGroup.id}/search?q=MARKET`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].content).toContain('Market');
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get(`/api/chat/groups/${testGroup.id}/search`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Search query is required');
    });
  });
});