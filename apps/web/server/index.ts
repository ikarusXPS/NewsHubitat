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
import passport from 'passport';
import { configurePassport } from './config/passport';
import { authRoutes } from './routes/auth';
import { oauthRoutes } from './routes/oauth';
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
import commentRoutes from './routes/comments';
import teamsRoutes from './routes/teams';
import stripeWebhookRouter from './routes/webhooks/stripe';
import subscriptionRoutes from './routes/subscriptions';
import { publicApiRoutes } from './routes/publicApi';
import { apiKeyRoutes } from './routes/apiKeys';
import { authLimiter, aiTierLimiter, newsLimiter } from './middleware/rateLimiter';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import { createApiKeyLimiter } from './middleware/apiKeyRateLimiter';
import { isBot, generateOGHtml } from './middleware/botDetection';
import { SharingService } from './services/sharingService';
import { serverTimingMiddleware } from './middleware/serverTiming';
import { etagMiddleware } from './middleware/etagMiddleware';
import { metricsMiddleware } from './middleware/metricsMiddleware';
import { queryCounterMiddleware } from './middleware/queryCounter';
import { authMiddleware } from './services/authService';
import { NewsAggregator } from './services/newsAggregator';
import { MetricsService } from './services/metricsService';
import { WebSocketService } from './services/websocketService';
import { CacheService } from './services/cacheService';
import { AIService } from './services/aiService';
import { CleanupService } from './services/cleanupService';
import { initWorkerEmitter } from './jobs/workerEmitter';
import { prisma, getPoolStats } from './db/prisma';
import { logDbHealthCheck } from './utils/dbLogger';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Phase 37 Plan 02 (JOB-01): boot-mode env gating
// RUN_HTTP=true (default) — this replica accepts HTTP/WebSocket traffic
// RUN_JOBS=true — this replica owns RSS aggregation, cleanup, email digests, worker emitter
// Single-replica dev defaults to BOTH true (preserves existing behavior).
// Multi-replica prod: web replicas RUN_JOBS=false, RUN_HTTP=true; worker RUN_JOBS=true, RUN_HTTP=false.
const RUN_JOBS = process.env.RUN_JOBS !== 'false'; // default true
const RUN_HTTP = process.env.RUN_HTTP !== 'false'; // default true

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Compression middleware - gzip responses over 1KB
app.use(compression({ threshold: 1024 }));

// Server-Timing header for p95 latency monitoring (D-05, D-06)
app.use(serverTimingMiddleware);

// ETag header for conditional caching (Phase 33 D-04, D-05, D-06)
app.use(etagMiddleware);

// Prometheus metrics collection (D-05)
app.use(metricsMiddleware);

// N+1 query detection (D-08 - Phase 34, dev only)
app.use(queryCounterMiddleware);

// Initialize Passport (no session - stateless JWT per D-05)
app.use(passport.initialize());
configurePassport();

// Stripe webhook route - MUST be before express.json() for raw body signature verification (Phase 36.3)
app.use('/api/webhooks/stripe', stripeWebhookRouter);

// JSON parser with raw body preservation for webhook signature verification (Phase 22)
app.use(express.json({
  verify: (req: express.Request, _res, buf) => {
    // Preserve raw body for routes that need signature verification
    if (buf && buf.length) {
      (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
    }
  },
}));

// Debug middleware to log all requests
app.use((req, _res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  next();
});

// Phase 37 Plan 02 (Pitfall 7 / T-37-05): NewsAggregator no longer attached
// to req.app.locals (the legacy "newsAggregator" key is removed). Web
// replicas (RUN_JOBS=false) do not construct NewsAggregator. The worker
// constructs it inside runBootLifecycle below. Read paths use
// newsReadService (Prisma + Redis cache).

// Routes with rate limiting (D-05)

// Auth endpoints - strict (5 req/min per IP) - D-05
// Apply to sensitive auth paths before the main authRoutes handler
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/request-reset', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth', authRoutes);

// OAuth routes (Google, GitHub) - uses same /api/auth prefix
app.use('/api/auth', oauthRoutes);

// AI endpoints - tier-aware (FREE: 10/day; PREMIUM/ENTERPRISE: unlimited) - Phase 36.4 D-01/D-02
// authMiddleware MUST run before aiTierLimiter so the limiter's skip() can read
// the resolved subscriptionTier (otherwise authReq.user is undefined and every
// request keys by IP under the FREE quota — defeats the PREMIUM bypass).
app.use('/api/ai', authMiddleware, aiTierLimiter, aiRoutes);
app.use('/api/analysis', authMiddleware, aiTierLimiter, analysisRoutes);

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

// Comment routes (Phase 27)
app.use('/api/comments', commentRoutes);

// Team routes (Phase 28)
app.use('/api/teams', teamsRoutes);

// Subscription routes (Phase 36.3 - relocated from orphaned root server/)
app.use('/api/subscriptions', authMiddleware, subscriptionRoutes);

// API key management routes (Phase 35-04) - for developer self-service
app.use('/api/keys', apiKeyRoutes);

// =============================================================================
// Public API v1 (Phase 35) - D-05: versioned at /api/v1/public/*
// =============================================================================
// Apply API key authentication and tiered rate limiting to all public API routes
const apiKeyLimiter = createApiKeyLimiter();
app.use('/api/v1/public', apiKeyAuth, apiKeyLimiter, publicApiRoutes);

// Serve OpenAPI spec (no auth required - public documentation)
app.get('/api/openapi.json', (_req, res) => {
  res.sendFile('openapi.json', { root: './public' });
});

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
  } catch (_error) {
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

  // Phase 37 Plan 02: web replicas don't hold in-memory NewsAggregator state.
  // Count articles via Prisma; tolerate failures (health is liveness signal).
  let articlesCount = 0;
  try {
    articlesCount = await prisma.newsArticle.count();
  } catch {
    articlesCount = -1;
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    articlesCount,
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
// Share Page Route (D-04, D-05) - serves OG HTML to bots, redirects humans
// =============================================================================
app.get('/s/:code', async (req, res) => {
  const { code } = req.params;
  const userAgent = req.get('User-Agent');

  const sharingService = SharingService.getInstance();
  const shared = await sharingService.getByCode(code);

  if (!shared) {
    if (isBot(userAgent)) {
      return res.status(404).send('Share not found');
    }
    // Humans get redirected to home with error param
    return res.redirect('/?error=share_not_found');
  }

  // Increment view count
  await sharingService.incrementViews(code);

  if (isBot(userAgent)) {
    // Serve OG HTML for crawlers
    const ogTags = sharingService.getOpenGraphTags(shared);
    res.set('Content-Type', 'text/html');
    return res.send(generateOGHtml(ogTags));
  }

  // Human visitors: redirect to content
  if (shared.contentType === 'article') {
    res.redirect(`/?article=${shared.contentId}`);
  } else if (shared.contentType === 'cluster') {
    res.redirect(`/analysis?cluster=${shared.contentId}`);
  } else {
    res.redirect('/');
  }
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
    setHeaders: (res, filePath) => {
      // D-10, D-11, D-12: Immutable for hashed assets in /assets/
      if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
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

httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

/**
 * Phase 37 Plan 02 (JOB-01) — boot-mode dispatcher.
 *
 * Exported so the boot-mode unit tests can drive each branch with explicit
 * args (the tests mock NewsAggregator/CleanupService/workerEmitter and
 * verify the right side-effects fire for web vs worker vs single-replica).
 *
 * Ordering invariant (Assumption A8): when runJobs is true,
 * initWorkerEmitter() MUST run BEFORE NewsAggregator.startAggregation() so
 * the first cross-replica broadcast has a live Redis Pub/Sub channel.
 */
export async function runBootLifecycle(opts: {
  runHttp: boolean;
  runJobs: boolean;
}): Promise<void> {
  if (opts.runHttp) {
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('WebSocket server ready');

      // Update metrics periodically (D-14 - Phase 34: add pool metrics)
      setInterval(() => {
        metricsService.setWebSocketConnections(wsService.getClientCount());

        // Pool metrics (D-14 - Phase 34)
        const poolStats = getPoolStats();
        if (poolStats) {
          metricsService.updatePoolMetrics(poolStats);
        }
      }, 10000);
    });
  }

  if (opts.runJobs) {
    console.log('RUN_JOBS=true — starting schedulers and worker emitter');

    // JOB-03: init worker emitter BEFORE startAggregation so first emit has
    // a live Redis Pub/Sub channel (Assumption A8 ordering).
    initWorkerEmitter();

    const newsAggregator = NewsAggregator.getInstance();
    newsAggregator.startAggregation().catch((err) => {
      console.error('Aggregation error:', err);
    });

    // Start cleanup service for unverified account management (D-18)
    const cleanupService = CleanupService.getInstance();
    cleanupService.start();
  }
}

// Drive the boot lifecycle from env vars (CLI / docker entrypoint).
// Tests import runBootLifecycle directly and bypass this top-level call
// via vitest's vi.mock infrastructure on the side-effect modules.
void runBootLifecycle({ runHttp: RUN_HTTP, runJobs: RUN_JOBS });

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
