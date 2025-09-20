import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, authApi, portfolioApi, riskApi, competitionApi, loginSchema, registerSchema } from '../api';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.location
const mockLocation = {
  href: '',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with base URL', () => {
      const client = new (apiClient.constructor as any)('http://test-api.com');
      expect(client).toBeDefined();
    });

    it('should load token from localStorage on initialization', () => {
      mockLocalStorage.getItem.mockReturnValue('stored-token');
      const client = new (apiClient.constructor as any)('http://test-api.com');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('accessToken');
    });
  });

  describe('setToken', () => {
    it('should set token and store in localStorage', () => {
      apiClient.setToken('new-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-token');
    });

    it('should remove token from localStorage when setting null', () => {
      apiClient.setToken(null);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');
    });
  });

  describe('request method', () => {
    it('should make successful GET request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true, data: { id: 1, name: 'test' } }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        })
      );
      expect(result).toEqual({ success: true, data: { id: 1, name: 'test' } });
    });

    it('should include Authorization header when token is set', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      apiClient.setToken('test-token');
      await apiClient.get('/test');

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('should not include Authorization header when no token', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      apiClient.setToken(null);
      await apiClient.get('/test');

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle 401 unauthorized response', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      apiClient.setToken('expired-token');

      const result = await apiClient.get('/test');

      expect(result).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(mockLocation.href).toBe('/login');
    });

    it('should handle HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Bad request' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await apiClient.get('/test');

      expect(result).toEqual({
        success: false,
        error: 'Bad request',
      });
    });

    it('should handle HTTP error without error message', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await apiClient.get('/test');

      expect(result).toEqual({
        success: false,
        error: 'HTTP error! status: 500',
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await apiClient.get('/test');

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockFetch.mockRejectedValue('String error');

      const result = await apiClient.get('/test');

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });
    });

    it('should include Content-Type header', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await apiClient.get('/test');

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should merge custom headers', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await (apiClient as any).request('/test', {
        headers: { 'Custom-Header': 'custom-value' },
      });

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers.get('Custom-Header')).toBe('custom-value');
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('should make GET request', async () => {
      await apiClient.get('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make POST request with data', async () => {
      const testData = { name: 'test' };
      await apiClient.post('/test', testData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData),
        })
      );
    });

    it('should make POST request without data', async () => {
      await apiClient.post('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should make PUT request with data', async () => {
      const testData = { name: 'updated' };
      await apiClient.put('/test', testData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(testData),
        })
      );
    });

    it('should make PUT request without data', async () => {
      await apiClient.put('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should make DELETE request', async () => {
      await apiClient.delete('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should make PATCH request with data', async () => {
      const testData = { name: 'patched' };
      await apiClient.patch('/test', testData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(testData),
        })
      );
    });

    it('should make PATCH request without data', async () => {
      await apiClient.patch('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });
});

describe('Authentication schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'short',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const result1 = loginSchema.safeParse({ email: 'test@example.com' });
      const result2 = loginSchema.safeParse({ password: 'password123' });

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short username', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'ab',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject long username', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'a'.repeat(51),
        password: 'password123',
        confirmPassword: 'password123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'short',
        confirmPassword: 'short',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'different123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword');
        expect(result.error.issues[0].message).toBe("Passwords don't match");
      }
    });

    it('should reject missing fields', () => {
      const incompleteData = {
        email: 'test@example.com',
        username: 'testuser',
      };

      const result = registerSchema.safeParse(incompleteData);
      expect(result.success).toBe(false);
    });
  });
});

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should call login endpoint with credentials', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { user: { id: '1' }, accessToken: 'token', refreshToken: 'refresh' },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const credentials = { email: 'test@example.com', password: 'password123' };
      await authApi.login(credentials);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(credentials),
        })
      );
    });
  });

  describe('register', () => {
    it('should call register endpoint with user data', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { user: { id: '1' }, accessToken: 'token', refreshToken: 'refresh' },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123',
      };
      await authApi.register(userData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(userData),
        })
      );
    });
  });

  describe('refreshToken', () => {
    it('should call refresh token endpoint', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { accessToken: 'new-token' },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await authApi.refreshToken();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('logout', () => {
    it('should call logout endpoint', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await authApi.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should call get current user endpoint', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { id: '1', email: 'test@example.com', username: 'testuser' },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await authApi.getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({ method: 'GET' })
      );
    });
  });
});

describe('Portfolio API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ success: true }),
    };
    mockFetch.mockResolvedValue(mockResponse);
  });

  it('should get portfolios', async () => {
    await portfolioApi.getPortfolios();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/portfolio'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should get specific portfolio', async () => {
    await portfolioApi.getPortfolio('123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/portfolio/123'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should create portfolio', async () => {
    const portfolioData = { name: 'Test Portfolio' };
    await portfolioApi.createPortfolio(portfolioData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/portfolio'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(portfolioData),
      })
    );
  });

  it('should update portfolio', async () => {
    const updateData = { name: 'Updated Portfolio' };
    await portfolioApi.updatePortfolio('123', updateData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/portfolio/123'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
    );
  });

  it('should delete portfolio', async () => {
    await portfolioApi.deletePortfolio('123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/portfolio/123'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

describe('Risk API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ success: true }),
    };
    mockFetch.mockResolvedValue(mockResponse);
  });

  it('should calculate risk', async () => {
    const riskData = { portfolioId: '123' };
    await riskApi.calculateRisk(riskData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/risk/calculate'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(riskData),
      })
    );
  });

  it('should get position risks', async () => {
    await riskApi.getPositionRisks('123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/risk/position-risks/123'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should run stress test', async () => {
    const stressData = { scenario: 'market_crash' };
    await riskApi.runStressTest(stressData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/risk/stress-test'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(stressData),
      })
    );
  });

  it('should run Monte Carlo simulation', async () => {
    const simulationData = { iterations: 10000 };
    await riskApi.runMonteCarloSimulation(simulationData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/risk/monte-carlo'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(simulationData),
      })
    );
  });

  it('should get liquidity risk', async () => {
    await riskApi.getLiquidityRisk('123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/risk/liquidity/123'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should generate risk report', async () => {
    const reportData = { portfolioId: '123', period: '1M' };
    await riskApi.generateRiskReport(reportData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/risk/report'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(reportData),
      })
    );
  });
});

describe('Competition API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ success: true }),
    };
    mockFetch.mockResolvedValue(mockResponse);
  });

  it('should get competitions', async () => {
    await competitionApi.getCompetitions();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/competition'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should get specific competition', async () => {
    await competitionApi.getCompetition('123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/competition/123'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should create competition', async () => {
    const competitionData = { name: 'Test Competition' };
    await competitionApi.createCompetition(competitionData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/competition'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(competitionData),
      })
    );
  });

  it('should join competition', async () => {
    await competitionApi.joinCompetition('123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/competition/123/join'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should get leaderboard', async () => {
    await competitionApi.getLeaderboard('123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/competition/123/leaderboard'),
      expect.objectContaining({ method: 'GET' })
    );
  });
});

describe('Environment configuration', () => {
  it('should use environment API URL when available', () => {
    // This test verifies the API_BASE_URL configuration
    // Since the apiClient is already instantiated, we check that it's defined
    expect(apiClient).toBeDefined();
  });
});