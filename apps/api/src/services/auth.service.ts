import { UserRepository, type UserWithStats } from '../repositories/user.repository';
import { HashService } from './hash.service';
import { TokenService } from './token.service';
import type { RegisterInput, LoginInput, AuthResponse, TokenPair } from '@golden-palace/shared';

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashService: HashService,
    private readonly tokenService: TokenService
  ) {}

  async register(input: RegisterInput): Promise<ServiceResult<AuthResponse>> {
    try {
      // Validate input
      const validation = this.validateRegisterInput(input);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check for existing email
      if (await this.userRepository.emailExists(input.email)) {
        return { success: false, error: 'Email already exists' };
      }

      // Check for existing username
      if (await this.userRepository.usernameExists(input.username)) {
        return { success: false, error: 'Username already exists' };
      }

      // Hash password
      const passwordHash = await this.hashService.hash(input.password);

      // Create user
      const user = await this.userRepository.create({
        email: input.email,
        username: input.username,
        passwordHash,
        bio: input.bio,
        specialties: input.specialties,
        tradingStyle: input.tradingStyle,
        experienceYears: input.experienceYears,
        favoriteMarkets: input.favoriteMarkets
      });

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Return response without sensitive data
      const userResponse = this.sanitizeUser(user);

      return {
        success: true,
        data: {
          user: userResponse,
          tokens
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async login(input: LoginInput): Promise<ServiceResult<AuthResponse>> {
    try {
      // Validate input
      const validation = this.validateLoginInput(input);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Find user by email
      const user = await this.userRepository.findByEmail(input.email);
      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Verify password
      const isValidPassword = await this.hashService.verify(input.password, user.passwordHash);
      if (!isValidPassword) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Update last seen
      await this.userRepository.updateLastSeen(user.id);

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Return response without sensitive data
      const userResponse = this.sanitizeUser(user);

      return {
        success: true,
        data: {
          user: userResponse,
          tokens
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<ServiceResult<TokenPair>> {
    try {
      // Verify refresh token
      const tokenResult = this.tokenService.verifyRefreshToken(refreshToken);
      if (!tokenResult.success || !tokenResult.data) {
        return { success: false, error: tokenResult.error };
      }

      // Find user
      const user = await this.userRepository.findById(tokenResult.data.userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      return {
        success: true,
        data: tokens
      };
    } catch (error) {
      return {
        success: false,
        error: `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async verifyToken(accessToken: string): Promise<ServiceResult<{ userId: string; email: string; username: string }>> {
    try {
      const tokenResult = this.tokenService.verifyAccessToken(accessToken);
      if (!tokenResult.success || !tokenResult.data) {
        return { success: false, error: tokenResult.error };
      }

      return {
        success: true,
        data: {
          userId: tokenResult.data.userId,
          email: tokenResult.data.email,
          username: tokenResult.data.username
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private validateRegisterInput(input: RegisterInput): { valid: boolean; error?: string } {
    if (!this.isValidEmail(input.email)) {
      return { valid: false, error: 'Invalid email address' };
    }

    if (!input.username || input.username.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters long' };
    }

    if (!this.isValidPassword(input.password)) {
      return { valid: false, error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character' };
    }

    return { valid: true };
  }

  private validateLoginInput(input: LoginInput): { valid: boolean; error?: string } {
    if (!this.isValidEmail(input.email)) {
      return { valid: false, error: 'Invalid email address' };
    }

    if (!input.password || input.password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters long' };
    }

    return { valid: true };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPassword(password: string): boolean {
    if (password.length < 8) return false;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  }

  private generateTokens(user: UserWithStats): TokenPair {
    const accessToken = this.tokenService.generateAccessToken(
      user.id,
      user.email,
      user.username
    );
    const refreshToken = this.tokenService.generateRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: UserWithStats) {
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}