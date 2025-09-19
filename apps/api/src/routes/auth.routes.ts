import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { HashService } from '../services/hash.service';
import { TokenService } from '../services/token.service';
import { AuthMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware';
import type { RegisterInput, LoginInput } from '@golden-palace/shared';

const router = Router();

// Initialize services
const userRepository = new UserRepository();
const hashService = new HashService();
const tokenService = new TokenService();
const authService = new AuthService(userRepository, hashService, tokenService);
const authMiddleware = new AuthMiddleware(tokenService, userRepository);

// Validation helpers
const validateRegisterInput = (body: any): { valid: boolean; error?: string; data?: RegisterInput } => {
  if (!body.email || !body.username || !body.password) {
    return { valid: false, error: 'Email, username, and password are required' };
  }

  if (typeof body.email !== 'string' || typeof body.username !== 'string' || typeof body.password !== 'string') {
    return { valid: false, error: 'Email, username, and password must be strings' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (body.username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long' };
  }

  if (body.password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  return {
    valid: true,
    data: {
      email: body.email,
      username: body.username,
      password: body.password,
      bio: body.bio,
      specialties: body.specialties,
      tradingStyle: body.tradingStyle,
      experienceYears: body.experienceYears,
      favoriteMarkets: body.favoriteMarkets
    }
  };
};

const validateLoginInput = (body: any): { valid: boolean; error?: string; data?: LoginInput } => {
  if (!body.email || !body.password) {
    return { valid: false, error: 'Email and password are required' };
  }

  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    return { valid: false, error: 'Email and password must be strings' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return {
    valid: true,
    data: {
      email: body.email,
      password: body.password
    }
  };
};

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validation = validateRegisterInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const result = await authService.register(validation.data!);

    if (!result.success) {
      const statusCode = result.error?.includes('already exists') ? 409 : 400;
      return res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

    return res.status(201).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validation = validateLoginInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const result = await authService.login(validation.data!);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const result = await authService.refreshToken(refreshToken);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware.authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just return success since JWTs are stateless
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware.authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const user = await userRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Remove sensitive data
    const { passwordHash, ...userResponse } = user;

    return res.status(200).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as authRoutes };