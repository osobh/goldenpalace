import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';
import { UserRepository } from '../repositories/user.repository';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export class AuthMiddleware {
  constructor(
    private readonly tokenService: TokenService,
    private readonly userRepository: UserRepository
  ) {}

  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      const tokenResult = this.tokenService.verifyAccessToken(token);
      if (!tokenResult.success || !tokenResult.data) {
        return res.status(401).json({
          success: false,
          error: tokenResult.error || 'Invalid token'
        });
      }

      // Verify user still exists
      const user = await this.userRepository.findById(tokenResult.data.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      // Add user data to request
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username
      };

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Authentication error'
      });
    }
  };

  optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // Continue without authentication
      }

      const token = authHeader.substring(7);
      const tokenResult = this.tokenService.verifyAccessToken(token);

      if (tokenResult.success && tokenResult.data) {
        const user = await this.userRepository.findById(tokenResult.data.userId);
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            username: user.username
          };
        }
      }

      next();
    } catch (error) {
      // Ignore auth errors in optional auth
      next();
    }
  };
}