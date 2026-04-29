# Phase 20: Monitoring & Alerting - Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 11
**Analogs found:** 8 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `server/services/metricsService.ts` | service | transform | `server/services/cacheService.ts` | exact |
| `server/middleware/metricsMiddleware.ts` | middleware | request-response | `server/middleware/serverTiming.ts` | exact |
| `server/index.ts` | controller | request-response | `server/index.ts` (self) | exact |
| `prometheus/prometheus.yml` | config | infrastructure | none | - |
| `prometheus/alert.rules.yml` | config | infrastructure | none | - |
| `alertmanager/alertmanager.yml` | config | infrastructure | none | - |
| `grafana/provisioning/datasources/prometheus.yml` | config | infrastructure | none | - |
| `grafana/provisioning/dashboards/dashboards.yml` | config | infrastructure | none | - |
| `grafana/provisioning/dashboards/newshub-operations.json` | config | infrastructure | none | - |
| `docker-compose.yml` | config | infrastructure | `docker-compose.yml` (self) | exact |
| `docs/monitoring/uptimerobot.md` | docs | - | none | - |

## Pattern Assignments

### `server/services/metricsService.ts` (service, transform)

**Analog:** `server/services/cacheService.ts`

**Imports pattern** (lines 1-9):
```typescript
/**
 * Redis Cache Service
 * Provides caching layer for API responses, sessions, and frequently accessed data
 */

import crypto from 'crypto';
import Redis from 'ioredis';
import logger from '../utils/logger';
```

**Interface exports pattern** (lines 10-16):
```typescript
export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}
```

**Singleton constructor pattern** (lines 36-52):
```typescript
export class CacheService {
  private static instance: CacheService;
  private client: Redis | null = null;
  private isConnected = false;
  private readonly config: CacheConfig;

  private constructor(config: CacheConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.connect();
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }
```

**isAvailable pattern** (lines 111-113):
```typescript
  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }
```

**getStats pattern** (lines 319-338):
```typescript
  /**
   * Get cache stats
   */
  async getStats(): Promise<{ connected: boolean; keys: number; memory: string } | null> {
    if (!this.isAvailable()) {
      return { connected: false, keys: 0, memory: '0' };
    }

    try {
      const info = await this.client!.info('memory');
      const dbsize = await this.client!.dbsize();
      const memoryMatch = info.match(/used_memory_human:(\S+)/);

      return {
        connected: true,
        keys: dbsize,
        memory: memoryMatch?.[1] || 'unknown',
      };
    } catch {
      return null;
    }
  }
```

**Graceful shutdown pattern** (lines 350-358):
```typescript
  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }
```

**Default export pattern** (lines 394-395):
```typescript
export default CacheService;
```

---

### `server/middleware/metricsMiddleware.ts` (middleware, request-response)

**Analog:** `server/middleware/serverTiming.ts`

**Full file - complete middleware pattern** (lines 1-43):
```typescript
/**
 * Server Timing Middleware (D-05, D-06)
 * Measures request duration and adds Server-Timing header
 * Visible in Chrome DevTools Network tab "Timing" section
 */

import type { Request, Response, NextFunction } from 'express';
import type { OutgoingHttpHeaders } from 'http';

/**
 * Express middleware that adds Server-Timing header to all responses.
 * Uses process.hrtime.bigint() for nanosecond precision.
 *
 * Header format: Server-Timing: total;dur=123.45
 */
export function serverTimingMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = process.hrtime.bigint();

  // Intercept when headers are about to be sent
  const originalWriteHead = res.writeHead.bind(res);

  res.writeHead = function (
    statusCode: number,
    statusMessage?: string | OutgoingHttpHeaders,
    headers?: OutgoingHttpHeaders
  ): Response {
    const end = process.hrtime.bigint();
    const durationNs = end - start;
    const durationMs = Number(durationNs) / 1_000_000;

    // Set Server-Timing header before writeHead completes
    res.setHeader('Server-Timing', `total;dur=${durationMs.toFixed(2)}`);

    return originalWriteHead.call(this, statusCode, statusMessage, headers);
  } as typeof res.writeHead;

  next();
}
```

**Key patterns to adapt:**
- Use `process.hrtime.bigint()` for nanosecond precision timing
- Hook into `res.on('finish')` instead of `res.writeHead` for metrics (simpler pattern)
- Export named function, not default

---

### `server/index.ts` modification (controller, request-response)

**Analog:** `server/index.ts` (existing health endpoints)

**Service initialization pattern** (lines 45-49):
```typescript
// Initialize services
const wsService = WebSocketService.getInstance();
wsService.initialize(httpServer);
const cacheService = CacheService.getInstance();
const aiService = AIService.getInstance();
```

**Health endpoint with latency measurement pattern** (lines 137-168):
```typescript
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
```

**Redis health check with isAvailable pattern** (lines 170-210):
```typescript
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
```

**Graceful shutdown pattern** (lines 309-328):
```typescript
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
```

---

### `docker-compose.yml` modification (config, infrastructure)

**Analog:** `docker-compose.yml` (existing services)

**Service with healthcheck pattern** (lines 1-19):
```yaml
services:
  postgres:
    image: postgres:17
    container_name: newshub-db
    environment:
      POSTGRES_USER: newshub
      POSTGRES_PASSWORD: newshub_dev
      POSTGRES_DB: newshub
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U newshub -d newshub"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped
```

**Service with depends_on and env_file pattern** (lines 43-65):
```yaml
  app:
    build: .
    container_name: newshub-app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://newshub:newshub_dev@postgres:5432/newshub
      - REDIS_URL=redis://redis:6379
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3001/api/health/db"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    restart: unless-stopped
```

**Named volumes pattern** (lines 67-69):
```yaml
volumes:
  postgres_data:
  redis_data:
```

---

### `server/services/metricsService.test.ts` (test, unit)

**Analog:** `server/services/cacheService.test.ts`

**Test file structure with mocks pattern** (lines 1-39):
```typescript
/**
 * Unit tests for CacheService
 * Tests singleton pattern, connection state, get/set/del operations, getOrSet, incr, and CacheKeys builders
 */

import { vi, describe, it, expect, afterEach } from 'vitest';

// Mock ioredis before importing CacheService
vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
    incr: vi.fn(),
    expire: vi.fn(),
    zadd: vi.fn(),
    zrevrange: vi.fn().mockResolvedValue([]),
    publish: vi.fn(),
    info: vi.fn().mockResolvedValue('used_memory_human:1M'),
    dbsize: vi.fn().mockResolvedValue(10),
    quit: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
  }));
  return { default: MockRedis };
});

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { CacheService, CacheKeys, CACHE_TTL } from './cacheService';

describe('CacheService', () => {
  afterEach(() => {
    // Reset singleton between tests
    (CacheService as unknown as { instance: CacheService | null }).instance = null;
    vi.clearAllMocks();
  });
```

**Singleton test pattern** (lines 41-47):
```typescript
  describe('singleton pattern', () => {
    it('getInstance() returns same instance', () => {
      const instance1 = CacheService.getInstance();
      const instance2 = CacheService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
```

**isAvailable test pattern** (lines 49-69):
```typescript
  describe('isAvailable', () => {
    it('returns false when not connected', () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = false;
      expect(service.isAvailable()).toBe(false);
    });

    it('returns false when client is null', () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      (service as any).client = null;
      expect(service.isAvailable()).toBe(false);
    });

    it('returns true when connected and client exists', () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      (service as any).client = {};
      expect(service.isAvailable()).toBe(true);
    });
  });
```

**Graceful degradation test pattern** (lines 483-502):
```typescript
  describe('shutdown', () => {
    it('disconnects Redis client', async () => {
      const service = CacheService.getInstance();
      const mockClient = { quit: vi.fn().mockResolvedValue('OK') };
      (service as any).client = mockClient;
      (service as any).isConnected = true;

      await service.shutdown();

      expect(mockClient.quit).toHaveBeenCalled();
      expect((service as any).client).toBeNull();
      expect((service as any).isConnected).toBe(false);
    });

    it('handles null client gracefully', async () => {
      const service = CacheService.getInstance();
      (service as any).client = null;

      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });
```

---

## Shared Patterns

### Singleton Service Pattern
**Source:** `server/services/cacheService.ts` lines 36-52
**Apply to:** `server/services/metricsService.ts`
```typescript
export class ServiceName {
  private static instance: ServiceName;

  private constructor() {
    // Initialize
  }

  static getInstance(): ServiceName {
    if (!ServiceName.instance) {
      ServiceName.instance = new ServiceName();
    }
    return ServiceName.instance;
  }
}

export default ServiceName;
```

### Health Endpoint with Latency Pattern
**Source:** `server/index.ts` lines 137-168
**Apply to:** `/health` and `/readiness` endpoints
```typescript
app.get('/endpoint', async (_req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  const start = Date.now();
  try {
    // Check dependency
    const duration = Date.now() - start;
    res.json({ status: 'healthy', latency_ms: duration });
  } catch (error) {
    const duration = Date.now() - start;
    res.status(503).json({ status: 'unhealthy', latency_ms: duration, error: error.message });
  }
});
```

### Express Middleware with Timing Pattern
**Source:** `server/middleware/serverTiming.ts` lines 16-42
**Apply to:** `server/middleware/metricsMiddleware.ts`
```typescript
export function middlewareName(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9; // seconds
    // Record metric
  });

  next();
}
```

### Docker Compose Service with Health Check Pattern
**Source:** `docker-compose.yml` lines 1-19
**Apply to:** prometheus, alertmanager, grafana services
```yaml
  servicename:
    image: image:tag
    container_name: newshub-servicename
    ports:
      - "hostport:containerport"
    volumes:
      - volume_name:/path/in/container
    healthcheck:
      test: ["CMD", "command", "args"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
```

### WebSocket Connection Tracking Pattern
**Source:** `server/services/websocketService.ts` lines 57-69, 92-106
**Apply to:** MetricsService WebSocket gauge updates
```typescript
// In WebSocketService
private connectedClients = new Map<string, Socket>();

// On connection
this.connectedClients.set(clientId, socket);

// On disconnect
this.connectedClients.delete(clientId);

// Get count
getClientCount(): number {
  return this.connectedClients.size;
}
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `prometheus/prometheus.yml` | config | infrastructure | No Prometheus config exists; use RESEARCH.md Pattern 4 |
| `prometheus/alert.rules.yml` | config | infrastructure | No alert rules exist; use RESEARCH.md Pattern 5 |
| `alertmanager/alertmanager.yml` | config | infrastructure | No Alertmanager config exists; use RESEARCH.md Pattern 6 |
| `grafana/provisioning/datasources/prometheus.yml` | config | infrastructure | No Grafana config exists; use RESEARCH.md Pattern 7 |
| `grafana/provisioning/dashboards/dashboards.yml` | config | infrastructure | No dashboard provisioning exists; use Grafana docs |
| `grafana/provisioning/dashboards/newshub-operations.json` | config | infrastructure | No dashboards exist; use Grafana JSON structure |
| `docs/monitoring/uptimerobot.md` | docs | - | No docs/ directory exists; create new |

---

## Metadata

**Analog search scope:** `server/services/`, `server/middleware/`, `server/index.ts`, `docker-compose.yml`, `docs/`
**Files scanned:** 35
**Pattern extraction date:** 2026-04-23
