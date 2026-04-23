// Load environment variables FIRST before any other imports
import 'dotenv/config';
import * as Sentry from '@sentry/node';

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
import bookmarksRoutes from './routes/bookmarks';
import historyRoutes from './routes/history';
import { authLimiter, aiLimiter, newsLimiter } from './middleware/rateLimiter';
import { serverTimingMiddleware } from './middleware/serverTiming';
import { metricsMiddleware } from './middleware/metricsMiddleware';
import { NewsAggregator } from './services/newsAggregator';
import { MetricsService } from './services/metricsService';
import { WebSocketService } from './services/websocketService';
import { CacheService } from './services/cacheService';
import { AIService } from './services/aiService';
import { CleanupService } from './services/cleanupService';
import { prisma } from './db/prisma';
import { logDbHealthCheck } from './utils/dbLogger';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize services
const wsService = WebSocketService.getInstance();
wsService.initialize(httpServer);
const cacheService = CacheService.getInstance();
const aiService = AIService.getInstance();
const metricsService = MetricsService.getInstance();

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

// Server-Timing header for p95 latency monitoring (D-05, D-06)
app.use(serverTimingMiddleware);

// Prometheus metrics collection (D-05)
app.use(metricsMiddleware);

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

// Routes with rate limiting (D-05)

// Auth endpoints - strict (5 req/min per IP) - D-05
// Apply to sensitive auth paths before the main authRoutes handler
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/request-reset', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth', authRoutes);

// AI endpoints - moderate (10 req/min per user) - D-05
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/analysis', aiLimiter, analysisRoutes);

// News/Events endpoints - relaxed (100 req/min per IP) - D-05
app.use('/api/news', newsLimiter, newsRoutes);
app.use('/api/events', newsLimiter, eventsRoutes);
app.use('/api/markets', newsLimiter, marketsRoutes);

// Other routes (no rate limiting)
app.use('/api/translate', translationRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/personas', personasRoutes);
app.use('/api/share', sharingRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/history', historyRoutes);

// Make services available to routes
app.locals.wsService = wsService;
app.locals.cacheService = cacheService;
app.locals.aiService = aiService;

// Test endpoint (no dependencies)
app.get('/api/ping', (_req, res) => {
  console.log('[PING] Received ping request');
  res.json({ status: 'pong' });
});

// Liveness probe - container orchestration (D-25, D-29, D-30, D-31)
app.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    status: 'healthy',
    version: process.env.BUILD_VERSION || 'unknown',
    commit: process.env.BUILD_COMMIT || 'unknown',
    uptime_seconds: Math.floor(process.uptime()),
  });
});

// Readiness probe - dependency check (D-26, D-28, D-29, D-30, D-31)
const DEPENDENCY_TIMEOUT = 3000; // D-28

app.get('/readiness', async (_req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  const checkDb = async (): Promise<number> => {
    const start = Date.now();
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), DEPENDENCY_TIMEOUT)),
    ]);
    return Date.now() - start;
  };

  const checkRedis = async (): Promise<number> => {
    const start = Date.now();
    if (!cacheService.isAvailable()) throw new Error('not connected');
    await Promise.race([
      cacheService.getStats(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), DEPENDENCY_TIMEOUT)),
    ]);
    return Date.now() - start;
  };

  try {
    const [dbLatency, redisLatency] = await Promise.all([checkDb(), checkRedis()]);
    res.json({
      status: 'ready',
      db_latency_ms: dbLatency,
      redis_latency_ms: redisLatency,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    res.status(503).json({
      status: 'not ready',
      error: err.message,
    });
  }
});

// Prometheus metrics endpoint (D-03)
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', metricsService.getContentType());
    res.end(await metricsService.getMetrics());
  } catch (error) {
    res.status(500).end();
  }
});

// Database health check - dedicated endpoint for container orchestration (D-05)
app.get('/api/health/db', async (_req, res) => {
  console.log('[HEALTH/DB] Received database health request');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  const start = Date.now();
  try {
    // Simple connectivity check - SELECT 1
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;

    logDbHealthCheck(true, duration);

    res.json({
      status: 'healthy',
      latency_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - start;
    const err = error instanceof Error ? error : new Error(String(error));

    logDbHealthCheck(false, duration, err);

    res.status(503).json({
      status: 'unhealthy',
      latency_ms: duration,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Redis health check - dedicated endpoint for container orchestration (D-09)
app.get('/api/health/redis', async (_req, res) => {
  console.log('[HEALTH/REDIS] Received Redis health request');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  const start = Date.now();

  if (!cacheService.isAvailable()) {
    const duration = Date.now() - start;
    res.status(503).json({
      status: 'unhealthy',
      latency_ms: duration,
      error: 'Redis not connected',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const stats = await cacheService.getStats();
    const duration = Date.now() - start;

    res.json({
      status: 'healthy',
      latency_ms: duration,
      keys: stats?.keys || 0,
      memory: stats?.memory || 'unknown',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - start;
    const err = error instanceof Error ? error : new Error(String(error));

    res.status(503).json({
      status: 'unhealthy',
      latency_ms: duration,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
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
      database: {
        available: true,  // Detailed check at /api/health/db
      },
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

// =============================================================================
// Production Static File Serving (D-07)
// =============================================================================
// In production, serve frontend from dist/ via Express
// This enables single-container deployment where one Express server handles
// both API routes and static frontend files
if (process.env.NODE_ENV === 'production') {
  // Path to Vite build output (dist/ at project root, relative to dist/server/)
  const staticPath = path.join(__dirname, '../');

  // Serve static files with aggressive caching
  // Assets have content hashes so can be cached indefinitely
  app.use(express.static(staticPath, {
    maxAge: '7d',
    etag: true,
    index: false,  // Don't serve index.html for directory requests (SPA handles this)
  }));

  // SPA fallback - serve index.html for all non-API routes
  // This enables client-side routing (React Router)
  // Note: Express 5 with path-to-regexp v8 requires '{*path}' syntax
  app.get('{*path}', (req, res) => {
    // Only handle non-API routes
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(staticPath, 'index.html'));
    }
  });

  console.log('[STATIC] Production mode: serving frontend from dist/');
}

// Sentry error handler - captures errors and forwards to next handler (per D-02)
Sentry.setupExpressErrorHandler(app);

// Error handler (existing - formats response)
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

  // Update WebSocket metrics periodically
  setInterval(() => {
    metricsService.setWebSocketConnections(wsService.getClientCount());
  }, 10000);
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
