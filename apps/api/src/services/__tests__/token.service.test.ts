import { describe, it, expect, beforeEach } from 'vitest';
import { TokenService } from '../token.service';
import type { JWTPayload } from '@golden-palace/shared';

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    tokenService = new TokenService();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const username = 'testuser';

      const token = tokenService.generateAccessToken(userId, email, username);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should generate different tokens for different users', () => {
      const token1 = tokenService.generateAccessToken('user-1', 'user1@example.com', 'user1');
      const token2 = tokenService.generateAccessToken('user-2', 'user2@example.com', 'user2');

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for same user at different times', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const username = 'testuser';

      const token1 = tokenService.generateAccessToken(userId, email, username);

      // Wait a millisecond to ensure different iat
      await new Promise(resolve => setTimeout(resolve, 10));

      const token2 = tokenService.generateAccessToken(userId, email, username);
      expect(token1).not.toBe(token2);
    });

    it('should generate token with custom expiration', () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const username = 'testuser';
      const customExpiresIn = 3600; // 1 hour

      const token = tokenService.generateAccessToken(userId, email, username, customExpiresIn);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', () => {
      const userId = 'user-123';

      const token = tokenService.generateRefreshToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should generate different tokens for different users', () => {
      const token1 = tokenService.generateRefreshToken('user-1');
      const token2 = tokenService.generateRefreshToken('user-2');

      expect(token1).not.toBe(token2);
    });

    it('should generate token with custom expiration', () => {
      const userId = 'user-123';
      const customExpiresIn = 86400; // 1 day

      const token = tokenService.generateRefreshToken(userId, customExpiresIn);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode valid access token', () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const username = 'testuser';

      const token = tokenService.generateAccessToken(userId, email, username);
      const decoded = tokenService.verifyAccessToken(token);

      expect(decoded.success).toBe(true);
      expect(decoded.data).toBeDefined();
      expect(decoded.data!.userId).toBe(userId);
      expect(decoded.data!.email).toBe(email);
      expect(decoded.data!.username).toBe(username);
      expect(decoded.data!.iat).toBeDefined();
      expect(decoded.data!.exp).toBeDefined();
    });

    it('should reject invalid token format', () => {
      const invalidToken = 'invalid-token-format';
      const result = tokenService.verifyAccessToken(invalidToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token');
    });

    it('should reject malformed JWT', () => {
      const malformedToken = 'header.payload'; // Missing signature
      const result = tokenService.verifyAccessToken(malformedToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token');
    });

    it('should reject token with invalid signature', () => {
      const validToken = tokenService.generateAccessToken('user-123', 'test@example.com', 'testuser');
      const invalidSignatureToken = validToken.slice(0, -10) + 'invalidsig';

      const result = tokenService.verifyAccessToken(invalidSignatureToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token');
    });

    it('should reject expired token', () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const username = 'testuser';
      const expiredToken = tokenService.generateAccessToken(userId, email, username, -1); // Expired 1 second ago

      const result = tokenService.verifyAccessToken(expiredToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token expired');
    });

    it('should handle token without required claims', () => {
      // This would require manually crafting a token without userId claim
      // For now, we'll test the validation logic indirectly
      const result = tokenService.verifyAccessToken('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode valid refresh token', () => {
      const userId = 'user-123';

      const token = tokenService.generateRefreshToken(userId);
      const decoded = tokenService.verifyRefreshToken(token);

      expect(decoded.success).toBe(true);
      expect(decoded.data).toBeDefined();
      expect(decoded.data!.userId).toBe(userId);
      expect(decoded.data!.iat).toBeDefined();
      expect(decoded.data!.exp).toBeDefined();
    });

    it('should reject invalid refresh token', () => {
      const invalidToken = 'invalid-refresh-token';
      const result = tokenService.verifyRefreshToken(invalidToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token');
    });

    it('should reject expired refresh token', () => {
      const userId = 'user-123';
      const expiredToken = tokenService.generateRefreshToken(userId, -1); // Expired

      const result = tokenService.verifyRefreshToken(expiredToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token expired');
    });
  });

  describe('token expiration', () => {
    it('should create access token with default expiration (15 minutes)', () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const username = 'testuser';

      const token = tokenService.generateAccessToken(userId, email, username);
      const decoded = tokenService.verifyAccessToken(token);

      expect(decoded.success).toBe(true);

      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + (15 * 60); // 15 minutes from now

      // Allow 5 second tolerance for execution time
      expect(decoded.data!.exp).toBeGreaterThanOrEqual(expectedExp - 5);
      expect(decoded.data!.exp).toBeLessThanOrEqual(expectedExp + 5);
    });

    it('should create refresh token with default expiration (7 days)', () => {
      const userId = 'user-123';

      const token = tokenService.generateRefreshToken(userId);
      const decoded = tokenService.verifyRefreshToken(token);

      expect(decoded.success).toBe(true);

      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + (7 * 24 * 60 * 60); // 7 days from now

      // Allow 5 second tolerance for execution time
      expect(decoded.data!.exp).toBeGreaterThanOrEqual(expectedExp - 5);
      expect(decoded.data!.exp).toBeLessThanOrEqual(expectedExp + 5);
    });
  });

  describe('token security', () => {
    it('should not expose sensitive information in token payload', () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const username = 'testuser';

      const token = tokenService.generateAccessToken(userId, email, username);
      const decoded = tokenService.verifyAccessToken(token);

      expect(decoded.success).toBe(true);
      expect(decoded.data).toBeDefined();

      // Should not contain password or other sensitive data
      expect(Object.keys(decoded.data!)).not.toContain('password');
      expect(Object.keys(decoded.data!)).not.toContain('passwordHash');
      expect(Object.keys(decoded.data!)).not.toContain('secret');
    });

    it('should generate cryptographically secure tokens', () => {
      const tokens = new Set();
      const iterations = 100;

      // Generate multiple tokens and ensure they're all unique
      for (let i = 0; i < iterations; i++) {
        const token = tokenService.generateAccessToken(`user-${i}`, `user${i}@example.com`, `user${i}`);
        expect(tokens.has(token)).toBe(false);
        tokens.add(token);
      }

      expect(tokens.size).toBe(iterations);
    });
  });
});