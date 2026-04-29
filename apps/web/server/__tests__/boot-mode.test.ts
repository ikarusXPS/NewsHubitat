/**
 * Phase 37 Plan 02 (JOB-01) — boot-mode env-gating tests.
 *
 * Validates that runBootLifecycle wires the right side-effects per mode:
 *   - Web replica  (runHttp=true,  runJobs=false): no schedulers, no emitter
 *   - Worker       (runHttp=false, runJobs=true ): schedulers + emitter
 *   - Single-rep   (runHttp=true,  runJobs=true ): both branches
 *
 * Ordering invariant (Assumption A8): initWorkerEmitter MUST run before
 * NewsAggregator.startAggregation so the first cross-replica broadcast has
 * a live Redis Pub/Sub channel.
 *
 * Regression guard for Pitfall 7 (T-37-05): web replicas do NOT construct
 * NewsAggregator at all — the helper does not call NewsAggregator.getInstance
 * when runJobs is false.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted lets the mock factories reference these vars without ReferenceError.
const mocks = vi.hoisted(() => ({
  startAggregation: vi.fn().mockResolvedValue(undefined),
  getInstanceNewsAggregator: vi.fn(),
  cleanupStart: vi.fn(),
  cleanupStop: vi.fn(),
  getInstanceCleanup: vi.fn(),
  initWorkerEmitter: vi.fn(),
}));

mocks.getInstanceNewsAggregator.mockImplementation(() => ({
  startAggregation: mocks.startAggregation,
}));
mocks.getInstanceCleanup.mockImplementation(() => ({
  start: mocks.cleanupStart,
  stop: mocks.cleanupStop,
}));

vi.mock('../services/newsAggregator', () => ({
  NewsAggregator: { getInstance: mocks.getInstanceNewsAggregator },
}));

vi.mock('../services/cleanupService', () => ({
  CleanupService: { getInstance: mocks.getInstanceCleanup },
}));

vi.mock('../jobs/workerEmitter', () => ({
  initWorkerEmitter: mocks.initWorkerEmitter,
  emitNewArticle: vi.fn(),
  emitBreakingNews: vi.fn(),
  emitNewEvent: vi.fn(),
  shutdownWorkerEmitter: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { runBootLifecycle } from '../bootLifecycle';

describe('Phase 37 Plan 02 — boot-mode gating (JOB-01)', () => {
  beforeEach(() => {
    mocks.startAggregation.mockClear();
    mocks.getInstanceNewsAggregator.mockClear();
    mocks.cleanupStart.mockClear();
    mocks.cleanupStop.mockClear();
    mocks.getInstanceCleanup.mockClear();
    mocks.initWorkerEmitter.mockClear();

    // Reset implementations after clearing
    mocks.getInstanceNewsAggregator.mockImplementation(() => ({
      startAggregation: mocks.startAggregation,
    }));
    mocks.getInstanceCleanup.mockImplementation(() => ({
      start: mocks.cleanupStart,
      stop: mocks.cleanupStop,
    }));
    mocks.startAggregation.mockResolvedValue(undefined);
  });

  it('runHttp=true, runJobs=false (web replica) — does NOT start schedulers or worker emitter', async () => {
    await runBootLifecycle({ runHttp: true, runJobs: false });

    expect(mocks.initWorkerEmitter).not.toHaveBeenCalled();
    expect(mocks.startAggregation).not.toHaveBeenCalled();
    expect(mocks.cleanupStart).not.toHaveBeenCalled();
    // Pitfall 7 / T-37-05: web replicas do not construct NewsAggregator at all
    expect(mocks.getInstanceNewsAggregator).not.toHaveBeenCalled();
  });

  it('runHttp=false, runJobs=true (worker) — starts schedulers + emitter; emitter init BEFORE startAggregation', async () => {
    const callOrder: string[] = [];
    mocks.initWorkerEmitter.mockImplementation(() => {
      callOrder.push('initWorkerEmitter');
    });
    mocks.startAggregation.mockImplementation(async () => {
      callOrder.push('startAggregation');
    });
    mocks.cleanupStart.mockImplementation(() => {
      callOrder.push('cleanupStart');
    });

    await runBootLifecycle({ runHttp: false, runJobs: true });

    expect(mocks.initWorkerEmitter).toHaveBeenCalledTimes(1);
    expect(mocks.startAggregation).toHaveBeenCalledTimes(1);
    expect(mocks.cleanupStart).toHaveBeenCalledTimes(1);

    // Assumption A8: emitter init must precede aggregation
    const emitterIdx = callOrder.indexOf('initWorkerEmitter');
    const aggIdx = callOrder.indexOf('startAggregation');
    expect(emitterIdx).toBeGreaterThanOrEqual(0);
    expect(aggIdx).toBeGreaterThanOrEqual(0);
    expect(emitterIdx).toBeLessThan(aggIdx);
  });

  it('runHttp=true, runJobs=true (single-replica dev) — both branches execute', async () => {
    await runBootLifecycle({ runHttp: true, runJobs: true });

    expect(mocks.initWorkerEmitter).toHaveBeenCalledTimes(1);
    expect(mocks.startAggregation).toHaveBeenCalledTimes(1);
    expect(mocks.cleanupStart).toHaveBeenCalledTimes(1);
  });

  it('runHttp=false, runJobs=false — neither branch executes (defensive default)', async () => {
    await runBootLifecycle({ runHttp: false, runJobs: false });

    expect(mocks.initWorkerEmitter).not.toHaveBeenCalled();
    expect(mocks.startAggregation).not.toHaveBeenCalled();
    expect(mocks.cleanupStart).not.toHaveBeenCalled();
    expect(mocks.getInstanceNewsAggregator).not.toHaveBeenCalled();
  });

  it('runHttp=true with httpServer and port — calls httpServer.listen and onListening callback', async () => {
    const mockListen = vi.fn((_port, cb: () => void) => cb());
    const fakeHttpServer = { listen: mockListen } as unknown as Parameters<
      typeof runBootLifecycle
    >[0]['httpServer'];
    const onListening = vi.fn();

    await runBootLifecycle({
      runHttp: true,
      runJobs: false,
      httpServer: fakeHttpServer,
      port: 3001,
      onListening,
    });

    expect(mockListen).toHaveBeenCalledWith(3001, expect.any(Function));
    expect(onListening).toHaveBeenCalledTimes(1);
  });

  it('runHttp=true without httpServer — does NOT throw (entrypoint may omit server)', async () => {
    await expect(
      runBootLifecycle({ runHttp: true, runJobs: false })
    ).resolves.toBeUndefined();
  });
});
