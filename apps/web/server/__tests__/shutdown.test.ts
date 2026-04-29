/**
 * Phase 37 Plan 05 (DEPLOY-04, DEPLOY-05) — graceful shutdown unit tests.
 *
 * Drives the terminus config captured by a vi.mock of @godaddy/terminus —
 * we don't bind to a real HttpServer or attach process signal handlers; we
 * just verify the lifecycle hooks (beforeShutdown / onSignal / healthChecks)
 * behave per contract.
 *
 * Cases:
 *   A: pre-SIGTERM, isReadyForTraffic returns true, /api/ready resolves
 *   B: beforeShutdown flips readiness false; /api/ready throws afterwards
 *   C: onSignal calls cleanup in order ws -> cache -> ai -> cleanup -> prisma
 *   D: try/catch isolates failures — wsService.shutdown throw still runs the rest
 *   E: total drain (beforeShutdown + onSignal) completes within totalTimeoutMs
 */

import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
} from 'vitest';
import type { Server as HttpServer } from 'http';

// vi.hoisted lets the mock factories reference these vars without ReferenceError.
const mocks = vi.hoisted(() => ({
  capturedTerminusConfig: null as Record<string, unknown> | null,
  createTerminus: vi.fn(),
  prismaDisconnect: vi.fn(),
  prismaQueryRaw: vi.fn(),
  wsShutdown: vi.fn(),
  cacheShutdown: vi.fn(),
  cacheIsAvailable: vi.fn(),
  aiShutdown: vi.fn(),
  cleanupStop: vi.fn(),
}));

mocks.createTerminus.mockImplementation((_server, config) => {
  mocks.capturedTerminusConfig = config;
});

vi.mock('@godaddy/terminus', () => ({
  createTerminus: mocks.createTerminus,
}));

vi.mock('../db/prisma', () => ({
  prisma: {
    $disconnect: mocks.prismaDisconnect,
    $queryRaw: mocks.prismaQueryRaw,
  },
}));

vi.mock('../services/websocketService', () => ({
  WebSocketService: {
    getInstance: () => ({ shutdown: mocks.wsShutdown }),
  },
}));

vi.mock('../services/cacheService', () => ({
  CacheService: {
    getInstance: () => ({
      shutdown: mocks.cacheShutdown,
      isAvailable: mocks.cacheIsAvailable,
    }),
  },
}));

vi.mock('../services/aiService', () => ({
  AIService: { getInstance: () => ({ shutdown: mocks.aiShutdown }) },
}));

vi.mock('../services/cleanupService', () => ({
  CleanupService: { getInstance: () => ({ stop: mocks.cleanupStop }) },
}));

vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  registerShutdown,
  isReadyForTraffic,
  _resetShutdownState,
} from '../middleware/shutdown';

const fakeHttpServer = {} as HttpServer;

type CapturedConfig = {
  signals: string[];
  timeout: number;
  beforeShutdown: () => Promise<void>;
  onSignal: () => Promise<void>;
  healthChecks: Record<string, () => Promise<unknown>>;
  logger: (msg: string, err?: Error) => void;
};

function getConfig(): CapturedConfig {
  if (!mocks.capturedTerminusConfig) {
    throw new Error('terminus config not captured — registerShutdown not called');
  }
  return mocks.capturedTerminusConfig as unknown as CapturedConfig;
}

describe('Phase 37 Plan 05 graceful shutdown (DEPLOY-04, DEPLOY-05)', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    _resetShutdownState();
    mocks.capturedTerminusConfig = null;

    // Default mock returns
    mocks.prismaDisconnect.mockResolvedValue(undefined);
    mocks.prismaQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mocks.wsShutdown.mockResolvedValue(undefined);
    mocks.cacheShutdown.mockResolvedValue(undefined);
    mocks.cacheIsAvailable.mockReturnValue(true);
    mocks.aiShutdown.mockReturnValue(undefined);
    mocks.cleanupStop.mockReturnValue(undefined);
  });

  it('Case A: before SIGTERM, isReadyForTraffic returns true and /api/ready resolves', async () => {
    registerShutdown(fakeHttpServer);
    expect(isReadyForTraffic()).toBe(true);

    const result = await getConfig().healthChecks['/api/ready']();
    expect(result).toMatchObject({ status: 'ready' });
    expect(result).toHaveProperty('db_latency_ms');
    expect(mocks.prismaQueryRaw).toHaveBeenCalledTimes(1);
  });

  it('Case B: beforeShutdown flips isReadyForTraffic false; subsequent /api/ready throws shutting down', async () => {
    registerShutdown(fakeHttpServer, { drainGraceMs: 100 });

    // Kick off the beforeShutdown handler — readiness should flip immediately,
    // before the drain-grace sleep even starts.
    const beforePromise = getConfig().beforeShutdown();
    expect(isReadyForTraffic()).toBe(false);

    // Health check during drain must reject with "shutting down"
    await expect(getConfig().healthChecks['/api/ready']()).rejects.toThrow(
      /shutting down/i
    );

    // Advance past the drain grace and let beforeShutdown resolve
    await vi.advanceTimersByTimeAsync(100);
    await beforePromise;

    // Still shutting down after the sleep
    expect(isReadyForTraffic()).toBe(false);
    await expect(getConfig().healthChecks['/api/ready']()).rejects.toThrow(
      /shutting down/i
    );
  });

  it('Case C: onSignal calls cleanup methods in order ws -> cache -> ai -> cleanup -> prisma', async () => {
    registerShutdown(fakeHttpServer);

    const callOrder: string[] = [];
    mocks.wsShutdown.mockImplementation(async () => {
      callOrder.push('ws');
    });
    mocks.cacheShutdown.mockImplementation(async () => {
      callOrder.push('cache');
    });
    mocks.aiShutdown.mockImplementation(() => {
      callOrder.push('ai');
    });
    mocks.cleanupStop.mockImplementation(() => {
      callOrder.push('cleanup');
    });
    mocks.prismaDisconnect.mockImplementation(async () => {
      callOrder.push('prisma');
    });

    await getConfig().onSignal();

    expect(callOrder).toEqual(['ws', 'cache', 'ai', 'cleanup', 'prisma']);
  });

  it('Case D: if WebSocketService.shutdown throws, the remaining cleanup still runs', async () => {
    registerShutdown(fakeHttpServer);
    mocks.wsShutdown.mockRejectedValueOnce(new Error('boom'));

    await getConfig().onSignal();

    // Despite the early failure, downstream services must still be cleaned up.
    expect(mocks.cacheShutdown).toHaveBeenCalledTimes(1);
    expect(mocks.aiShutdown).toHaveBeenCalledTimes(1);
    expect(mocks.cleanupStop).toHaveBeenCalledTimes(1);
    expect(mocks.prismaDisconnect).toHaveBeenCalledTimes(1);
  });

  it('Case E: total drain (beforeShutdown + onSignal) completes within totalTimeoutMs', async () => {
    const drainGraceMs = 1_000;
    const totalTimeoutMs = 5_000;
    registerShutdown(fakeHttpServer, { drainGraceMs, totalTimeoutMs });

    const start = Date.now();

    const beforePromise = getConfig().beforeShutdown();
    await vi.advanceTimersByTimeAsync(drainGraceMs);
    await beforePromise;

    await getConfig().onSignal();

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(totalTimeoutMs);
  });
});
