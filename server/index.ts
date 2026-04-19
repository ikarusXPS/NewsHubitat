// Load environment variables FIRST before any other imports
import 'dotenv/config';

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import compression from 'compression';
import { newsRoutes } from './routes/news';
import { translationRoutes } from './routes/translation';
import { analysisRoutes } from './routes/analysis';
import { eventsRoutes } from './routes/events';
import { authRoutes } from './routes/auth';
import aiRoutes from './routes/ai';
import marketsRoutes from './routes/markets.js';
import { focusRoutes } from './routes/focus';
import personasRoutes from './routes/personas';
import sharingRoutes from './routes/sharing';
import emailRoutes from './routes/email';
import { profileRoutes } from './routes/profile';
import { badgeRoutes } from './routes/badges';
import { leaderboardRoutes } from './routes/leaderboard';
import { accountRoutes } from './routes/account';
import { NewsAggregator } from './services/newsAggregator';
import { WebSocketService } from './services/websocketService';
import { CacheService } from './services/cacheService';
import { AIService } from './services/aiService';
import { CleanupService } from './services/cleanupService';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize services
const wsService = WebSocketService.getInstance();
wsService.initialize(httpServer);
const cacheService = CacheService.getInstance();
const aiService = AIService.getInstance();

// CORS configuration - production-ready with whitelist
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // Check if origin is in whitelist
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression middleware - gzip responses over 1KB
app.use(compression({ threshold: 1024 }));

app.use(express.json());

// Debug middleware to log all requests
app.use((req, _res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  next();
});

// Initialize news aggregator
const newsAggregator = NewsAggregator.getInstance();

// Make aggregator available to routes
app.locals.newsAggregator = newsAggregator;

// Routes
app.use('/api/news', newsRoutes);
app.use('/api/translate', translationRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/markets', marketsRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/personas', personasRoutes);
app.use('/api/share', sharingRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/account', accountRoutes);

// Make services available to routes
app.locals.wsService = wsService;
app.locals.cacheService = cacheService;
app.locals.aiService = aiService;

// Test endpoint (no dependencies)
app.get('/api/ping', (_req, res) => {
  console.log('[PING] Received ping request');
  res.json({ status: 'pong' });
});

// Health check - no caching for real-time status
app.get('/api/health', async (_req, res) => {
  console.log('[HEALTH] Received health request');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  const cacheStats = await cacheService.getStats();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    articlesCount: newsAggregator.getArticleCount(),
    services: {
      websocket: {
        available: wsService.isAvailable(),
        clients: wsService.getClientCount(),
      },
      cache: {
        available: cacheService.isAvailable(),
        ...cacheStats,
      },
      ai: {
        available: aiService.isAvailable(),
        provider: aiService.getProvider(),
      },
    },
  });
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('WebSocket server ready');
  console.log('Starting news aggregation...');
  newsAggregator.startAggregation().catch((err) => {
    console.error('Aggregation error:', err);
  });

  // Start cleanup service for unverified account management (D-18)
  const cleanupService = CleanupService.getInstance();
  cleanupService.start();
});

httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down gracefully...');

  // Shutdown services
  await wsService.shutdown();
  await cacheService.shutdown();
  aiService.shutdown();
  CleanupService.getInstance().stop();

  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
