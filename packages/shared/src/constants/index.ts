// Application constants
export const APP_NAME = 'Golden Palace';
export const APP_DESCRIPTION = 'P2P Financial Collaboration Platform';
export const APP_VERSION = '0.1.0';

// Environment
export const NODE_ENV =
  (typeof process !== 'undefined' ? process.env['NODE_ENV'] : 'development') || 'development';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// File upload limits
export const FILE_LIMITS = {
  IMAGE: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  DOCUMENT: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['application/pdf', 'text/plain', 'application/msword'],
  },
  CHART: {
    MAX_SIZE: 2 * 1024 * 1024, // 2MB
    ALLOWED_TYPES: ['image/png', 'image/jpeg', 'image/svg+xml'],
  },
} as const;

// WebSocket events
export const WS_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_GROUP: 'group:join',
  LEAVE_GROUP: 'group:leave',
  SEND_MESSAGE: 'message:send',
  NEW_MESSAGE: 'message:new',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
} as const;

// Default values
export const DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGINATION_LIMIT: 1000,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  TYPING_TIMEOUT: 3000, // 3 seconds
  RECONNECT_DELAY: 1000, // 1 second
  MAX_RECONNECT_ATTEMPTS: 5,
} as const;
