// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

// Filter Types
export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  userId?: string;
  groupId?: string;
}

// WebSocket Message Types
export interface WSMessage<T = any> {
  type: string;
  data: T;
  timestamp: string;
  id?: string;
}

export interface WSResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY_EMAIL: '/auth/verify-email',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
  },

  // Users
  USERS: {
    ME: '/users/me',
    UPDATE_PROFILE: '/users/me',
    UPLOAD_AVATAR: '/users/me/avatar',
    GET_USER: (id: string) => `/users/${id}`,
    GET_STATS: (id: string) => `/users/${id}/stats`,
  },

  // Groups
  GROUPS: {
    LIST: '/groups',
    CREATE: '/groups',
    GET: (id: string) => `/groups/${id}`,
    UPDATE: (id: string) => `/groups/${id}`,
    DELETE: (id: string) => `/groups/${id}`,
    JOIN: (id: string) => `/groups/${id}/join`,
    LEAVE: (id: string) => `/groups/${id}/leave`,
    MEMBERS: (id: string) => `/groups/${id}/members`,
    INVITE: (id: string) => `/groups/${id}/invite`,
  },

  // Messages
  MESSAGES: {
    LIST: (groupId: string) => `/groups/${groupId}/messages`,
    SEND: (groupId: string) => `/groups/${groupId}/messages`,
    GET: (groupId: string, messageId: string) => `/groups/${groupId}/messages/${messageId}`,
    UPDATE: (groupId: string, messageId: string) => `/groups/${groupId}/messages/${messageId}`,
    DELETE: (groupId: string, messageId: string) => `/groups/${groupId}/messages/${messageId}`,
    REACT: (groupId: string, messageId: string) => `/groups/${groupId}/messages/${messageId}/react`,
    MARK_READ: (groupId: string, messageId: string) =>
      `/groups/${groupId}/messages/${messageId}/read`,
  },

  // Trading
  TRADING: {
    TRADE_IDEAS: '/trading/ideas',
    CREATE_TRADE_IDEA: '/trading/ideas',
    GET_TRADE_IDEA: (id: string) => `/trading/ideas/${id}`,
    UPDATE_TRADE_IDEA: (id: string) => `/trading/ideas/${id}`,
    CLOSE_TRADE_IDEA: (id: string) => `/trading/ideas/${id}/close`,

    PAPER_POSITIONS: '/trading/positions',
    CREATE_POSITION: '/trading/positions',
    GET_POSITION: (id: string) => `/trading/positions/${id}`,
    UPDATE_POSITION: (id: string) => `/trading/positions/${id}`,
    CLOSE_POSITION: (id: string) => `/trading/positions/${id}/close`,

    PORTFOLIO: '/trading/portfolio',
    PERFORMANCE: '/trading/performance',
    ALERTS: '/trading/alerts',
    CREATE_ALERT: '/trading/alerts',
    DELETE_ALERT: (id: string) => `/trading/alerts/${id}`,
  },

  // Market Data
  MARKET: {
    QUOTE: (symbol: string) => `/market/quote/${symbol}`,
    QUOTES: '/market/quotes',
    SEARCH: '/market/search',
    HISTORY: (symbol: string) => `/market/history/${symbol}`,
    NEWS: '/market/news',
  },

  // Competitions
  COMPETITIONS: {
    LIST: '/competitions',
    CREATE: '/competitions',
    GET: (id: string) => `/competitions/${id}`,
    UPDATE: (id: string) => `/competitions/${id}`,
    DELETE: (id: string) => `/competitions/${id}`,
    JOIN: (id: string) => `/competitions/${id}/join`,
    LEAVE: (id: string) => `/competitions/${id}/leave`,
    LEADERBOARD: (id: string) => `/competitions/${id}/leaderboard`,
    ENTRIES: (id: string) => `/competitions/${id}/entries`,
  },

  // Files
  FILES: {
    UPLOAD: '/files/upload',
    GET: (id: string) => `/files/${id}`,
    DELETE: (id: string) => `/files/${id}`,
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Content Types
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
} as const;

// API Rate Limits
export const RATE_LIMITS = {
  AUTH: {
    window: '15m',
    max: 5,
  },
  API: {
    window: '1m',
    max: 100,
  },
  UPLOAD: {
    window: '1h',
    max: 50,
  },
  WEBSOCKET: {
    window: '1m',
    max: 200,
  },
} as const;
