import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../auth.service';
import { UserRepository } from '../../repositories/user.repository';
import { HashService } from '../hash.service';
import { TokenService } from '../token.service';
import { prisma } from '@golden-palace/database';
import type { RegisterInput, LoginInput } from '@golden-palace/shared';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: UserRepository;
  let hashService: HashService;
  let tokenService: TokenService;

  beforeEach(async () => {
    // Clean database before each test
    await prisma.user.deleteMany();

    userRepository = new UserRepository();
    hashService = new HashService();
    tokenService = new TokenService();
    authService = new AuthService(userRepository, hashService, tokenService);
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.user.deleteMany();
  });

  describe('register', () => {
    it('should register a new user with hashed password', async () => {
      const registerData: RegisterInput = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        bio: 'Test trader',
        specialties: ['day_trading', 'options'],
        tradingStyle: 'aggressive',
        experienceYears: 5,
        favoriteMarkets: ['stocks', 'crypto']
      };

      const result = await authService.register(registerData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.user.email).toBe(registerData.email);
      expect(result.data!.user.username).toBe(registerData.username);
      expect(result.data!.user.emailVerified).toBe(false);
      expect(result.data!.tokens.accessToken).toBeDefined();
      expect(result.data!.tokens.refreshToken).toBeDefined();

      // Verify password is hashed
      const dbUser = await prisma.user.findUnique({
        where: { email: registerData.email }
      });
      expect(dbUser).toBeDefined();
      expect(dbUser!.passwordHash).not.toBe(registerData.password);
      expect(dbUser!.passwordHash).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt pattern
    });

    it('should fail with invalid email format', async () => {
      const registerData: RegisterInput = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'SecurePass123!'
      };

      const result = await authService.register(registerData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email address');
    });

    it('should fail with weak password', async () => {
      const registerData: RegisterInput = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak'
      };

      const result = await authService.register(registerData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least 8 characters');
    });

    it('should fail with duplicate email', async () => {
      const registerData: RegisterInput = {
        email: 'test@example.com',
        username: 'testuser1',
        password: 'SecurePass123!'
      };

      // First registration
      await authService.register(registerData);

      // Attempt duplicate registration
      const duplicateData: RegisterInput = {
        email: 'test@example.com',
        username: 'testuser2',
        password: 'SecurePass123!'
      };

      const result = await authService.register(duplicateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email already exists');
    });

    it('should fail with duplicate username', async () => {
      const registerData: RegisterInput = {
        email: 'test1@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      };

      // First registration
      await authService.register(registerData);

      // Attempt duplicate registration
      const duplicateData: RegisterInput = {
        email: 'test2@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      };

      const result = await authService.register(duplicateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Username already exists');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user before login tests
      const registerData: RegisterInput = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      };
      await authService.register(registerData);
    });

    it('should login with valid credentials', async () => {
      const loginData: LoginInput = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const result = await authService.login(loginData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.user.email).toBe(loginData.email);
      expect(result.data!.tokens.accessToken).toBeDefined();
      expect(result.data!.tokens.refreshToken).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const loginData: LoginInput = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123!'
      };

      const result = await authService.login(loginData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const loginData: LoginInput = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const result = await authService.login(loginData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });

    it('should update lastSeen timestamp on successful login', async () => {
      const loginData: LoginInput = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const beforeLogin = new Date();
      await authService.login(loginData);

      const dbUser = await prisma.user.findUnique({
        where: { email: loginData.email }
      });

      expect(dbUser!.lastSeen).toBeDefined();
      expect(dbUser!.lastSeen!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });

  describe('refreshToken', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create user and get refresh token
      const registerData: RegisterInput = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      };
      const registerResult = await authService.register(registerData);
      refreshToken = registerResult.data!.tokens.refreshToken;
    });

    it('should generate new tokens with valid refresh token', async () => {
      const result = await authService.refreshToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.accessToken).toBeDefined();
      expect(result.data!.refreshToken).toBeDefined();
      expect(result.data!.refreshToken).not.toBe(refreshToken); // New refresh token
    });

    it('should fail with invalid refresh token', async () => {
      const result = await authService.refreshToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token');
    });

    it('should fail with expired refresh token', async () => {
      // Create an expired token
      const expiredToken = tokenService.generateRefreshToken('user-id', -1); // Expired 1 second ago

      const result = await authService.refreshToken(expiredToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token expired');
    });
  });

  describe('verifyToken', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create user and get access token
      const registerData: RegisterInput = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      };
      const registerResult = await authService.register(registerData);
      accessToken = registerResult.data!.tokens.accessToken;
      userId = registerResult.data!.user.id;
    });

    it('should verify valid access token', async () => {
      const result = await authService.verifyToken(accessToken);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.userId).toBe(userId);
      expect(result.data!.email).toBe('test@example.com');
    });

    it('should fail with invalid token format', async () => {
      const result = await authService.verifyToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token');
    });

    it('should fail with expired token', async () => {
      // Create an expired token
      const expiredToken = tokenService.generateAccessToken(userId, 'test@example.com', 'testuser', -1);

      const result = await authService.verifyToken(expiredToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token expired');
    });
  });
});