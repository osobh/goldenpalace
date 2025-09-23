import jwt from 'jsonwebtoken';
import type { JWTPayload } from '@golden-palace/shared';

interface TokenVerificationResult {
  success: boolean;
  data?: JWTPayload;
  error?: string;
}

export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry = 24 * 60 * 60; // 24 hours for development (was 15 minutes)
  private readonly refreshTokenExpiry = 7 * 24 * 60 * 60; // 7 days

  constructor() {
    this.accessTokenSecret = process.env['JWT_ACCESS_SECRET'] || 'dev-access-secret-key';
    this.refreshTokenSecret = process.env['JWT_REFRESH_SECRET'] || 'dev-refresh-secret-key';
  }

  generateAccessToken(
    userId: string,
    email: string,
    username: string,
    expiresIn?: number
  ): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId,
      email,
      username,
      type: 'access',
      jti: Math.random().toString(36).substring(2, 15) // Random token ID for uniqueness
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: expiresIn || this.accessTokenExpiry
    });
  }

  generateRefreshToken(userId: string, expiresIn?: number): string {
    const payload = {
      userId,
      type: 'refresh',
      jti: Math.random().toString(36).substring(2, 15) // Random token ID for uniqueness
    };

    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: expiresIn || this.refreshTokenExpiry
    });
  }

  verifyAccessToken(token: string): TokenVerificationResult {
    try {
      if (!token || typeof token !== 'string') {
        return { success: false, error: 'Invalid token format' };
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        return { success: false, error: 'Invalid token format' };
      }

      const decoded = jwt.verify(token, this.accessTokenSecret) as any;

      if (!decoded.userId || !decoded.email || !decoded.username) {
        return { success: false, error: 'Invalid token claims' };
      }

      return {
        success: true,
        data: decoded as JWTPayload
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { success: false, error: 'Token expired' };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { success: false, error: 'Invalid token' };
      }
      return { success: false, error: 'Token verification failed' };
    }
  }

  verifyRefreshToken(token: string): TokenVerificationResult {
    try {
      if (!token || typeof token !== 'string') {
        return { success: false, error: 'Invalid token format' };
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        return { success: false, error: 'Invalid token format' };
      }

      const decoded = jwt.verify(token, this.refreshTokenSecret) as any;

      if (!decoded.userId) {
        return { success: false, error: 'Invalid token claims' };
      }

      return {
        success: true,
        data: decoded as JWTPayload
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { success: false, error: 'Token expired' };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { success: false, error: 'Invalid token' };
      }
      return { success: false, error: 'Token verification failed' };
    }
  }
}