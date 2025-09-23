import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import winston from 'winston';
import rateLimit from 'express-rate-limit';

// Import routes
import { authRoutes } from './routes/auth.routes';
import { chatRoutes } from './routes/chat.routes';
import { tradingRoutes } from './routes/trading.routes';
import { competitionRoutes } from './routes/competition.routes';
import { portfolioRoutes } from './routes/portfolio.routes';
import { riskAnalyticsRoutes } from './routes/riskAnalytics.routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Only apply rate limiting in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api', limiter);
}

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/risk-analytics', riskAnalyticsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mock trade endpoint - remove when real trading routes are implemented
// app.get('/api/trades', (_req, res) => {
//   const mockTrades = [...];
//   res.json(mockTrades);
// });

app.get('/api/users/leaderboard', (_req, res) => {
  const mockLeaderboard = [
    {
      id: '1',
      username: 'TopTrader',
      firstName: 'John',
      lastName: 'Doe',
      avatar: null,
      winRate: 75.5,
      totalPnl: 125000,
      followersCount: 1250,
      tradesCount: 450
    },
    {
      id: '2',
      username: 'ProInvestor',
      firstName: 'Jane',
      lastName: 'Smith',
      avatar: null,
      winRate: 68.3,
      totalPnl: 98500,
      followersCount: 890,
      tradesCount: 320
    }
  ];
  res.json(mockLeaderboard);
});

app.get('/api/posts', (_req, res) => {
  const mockPosts = [
    {
      id: '1',
      userId: 'user1',
      content: 'Just closed a profitable BTC trade! Market looking bullish.',
      type: 'trade',
      likes: 45,
      shares: 12,
      createdAt: new Date().toISOString(),
      user: {
        username: 'TopTrader',
        avatar: null
      }
    },
    {
      id: '2',
      userId: 'user2',
      content: 'ETH showing strong support at $2800. Watch for breakout.',
      type: 'analysis',
      likes: 32,
      shares: 8,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      user: {
        username: 'ProInvestor',
        avatar: null
      }
    }
  ];
  res.json(mockPosts);
});

io.on('connection', (socket) => {
  logger.info(`New client connected: ${socket.id}`);

  socket.on('join:trades', (userId) => {
    socket.join(`user:${userId}:trades`);
    logger.info(`Client ${socket.id} joined trades room for user ${userId}`);
  });

  socket.on('join:feed', () => {
    socket.join('feed');
    logger.info(`Client ${socket.id} joined feed room`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

setInterval(() => {
  const mockPriceUpdate = {
    symbol: 'BTC/USD',
    price: 45000 + Math.random() * 1000 - 500,
    change: Math.random() * 10 - 5,
    volume: Math.random() * 1000000,
    timestamp: new Date().toISOString()
  };
  io.to('feed').emit('price:update', mockPriceUpdate);
}, 5000);

const PORT = process.env.PORT || 3002;
const HOST = '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  logger.info(`API server running on ${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Socket.IO enabled`);
});