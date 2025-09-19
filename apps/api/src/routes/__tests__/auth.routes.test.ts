import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '@golden-palace/database';
import type { RegisterInput, LoginInput } from '@golden-palace/shared';

describe('Auth Routes Integration Tests', () => {
  beforeAll(async () => {
    // Ensure test database is connected
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.user.deleteMany();
    await prisma.userStats.deleteMany();
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.user.deleteMany();
    await prisma.userStats.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerData: RegisterInput = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        bio: 'Experienced day trader',
        specialties: ['day_trading', 'technical_analysis'],
        tradingStyle: 'aggressive',
        experienceYears: 3,
        favoriteMarkets: ['stocks', 'forex']
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(registerData.email);
      expect(response.body.data.user.username).toBe(registerData.username);
      expect(response.body.data.user.emailVerified).toBe(false);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();

      // Verify user was created in database
      const dbUser = await prisma.user.findUnique({
        where: { email: registerData.email },
        include: { userStats: true }
      });

      expect(dbUser).toBeDefined();
      expect(dbUser!.bio).toBe(registerData.bio);
      expect(dbUser!.specialties).toEqual(registerData.specialties);
      expect(dbUser!.tradingStyle).toBe(registerData.tradingStyle);
      expect(dbUser!.experienceYears).toBe(registerData.experienceYears);
      expect(dbUser!.favoriteMarkets).toEqual(registerData.favoriteMarkets);
      expect(dbUser!.userStats).toBeDefined(); // Stats should be auto-created
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        // missing username and password
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject weak passwords', async () => {
      const registerData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak' // Too weak
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Password must be at least 8 characters');
    });

    it('should prevent duplicate email registration', async () => {
      const registerData: RegisterInput = {
        email: 'test@example.com',
        username: 'testuser1',
        password: 'SecurePass123!'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);

      // Attempt duplicate email
      const duplicateData = {
        ...registerData,
        username: 'testuser2'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email already exists');
    });

    it('should prevent duplicate username registration', async () => {
      const registerData: RegisterInput = {
        email: 'test1@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);

      // Attempt duplicate username
      const duplicateData = {
        ...registerData,
        email: 'test2@example.com'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Username already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const registerData: RegisterInput = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      };

      await request(app)
        .post('/api/auth/register')
        .send(registerData);
    });

    it('should login with valid credentials', async () => {
      const loginData: LoginInput = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();

      // Verify lastSeen was updated
      const dbUser = await prisma.user.findUnique({
        where: { email: loginData.email }
      });
      expect(dbUser!.lastSeen).toBeDefined();
    });

    it('should fail with invalid credentials', async () => {
      const loginData: LoginInput = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should fail with non-existent email', async () => {
      const loginData: LoginInput = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should validate input format', async () => {
      const invalidData = {
        email: 'invalid-email-format',
        password: 'short'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create user and get refresh token
      const registerData: RegisterInput = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registerData);

      refreshToken = registerResponse.body.data.tokens.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.refreshToken).not.toBe(refreshToken); // Should be new
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should fail with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create user and get access token
      const registerData: RegisterInput = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registerData);

      accessToken = registerResponse.body.data.tokens.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should fail without authorization header', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create user and get access token
      const registerData: RegisterInput = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        bio: 'Test trader',
        specialties: ['day_trading'],
        tradingStyle: 'moderate'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registerData);

      accessToken = registerResponse.body.data.tokens.accessToken;
      userId = registerResponse.body.data.user.id;
    });

    it('should get current user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.username).toBe('testuser');
      expect(response.body.data.bio).toBe('Test trader');
      expect(response.body.data.specialties).toEqual(['day_trading']);
      expect(response.body.data.tradingStyle).toBe('moderate');

      // Should not include sensitive data
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should fail without authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });
  });
});