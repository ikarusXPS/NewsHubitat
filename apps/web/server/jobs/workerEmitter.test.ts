/**
 * workerEmitter tests — branch coverage for todo 40-11.
 *
 * Covers:
 *   - initWorkerEmitter idempotency
 *   - getWorkerEmitter pre-init throw
 *   - shutdownWorkerEmitter cleanup
 *   - emitNewArticle: global + region + per-topic broadcasts + cache invalidation
 *   - emitBreakingNews
 *   - emitNewEvent: with + without event.location.region
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted mocks so they're available to the import-time evaluation of
// workerEmitter.ts. Constructors are class-based so the production `new X()`
// calls work — vi.fn() factories don't reliably propagate `new` semantics.
const { mockEmit, mockTo, mockToEmit, mockQuit, EmitterCtor, RedisCtor } = vi.hoisted(
  () => {
    const emit = vi.fn();
    const toEmit = vi.fn();
    const to = vi.fn(() => ({ emit: toEmit }));
    const quit = vi.fn(async () => 'OK');
    const EmitterCtor = vi.fn();
    EmitterCtor.mockImplementation(function (this: { emit: typeof emit; to: typeof to }) {
      this.emit = emit;
      this.to = to;
    });
    const RedisCtor = vi.fn();
    RedisCtor.mockImplementation(function (this: { quit: typeof quit }) {
      this.quit = quit;
    });
    return {
      mockEmit: emit,
      mockTo: to,
      mockToEmit: toEmit,
      mockQuit: quit,
      EmitterCtor,
      RedisCtor,
    };
  },
);

vi.mock('@socket.io/redis-emitter', () => ({
  Emitter: EmitterCtor,
}));

vi.mock('ioredis', () => ({
  default: RedisCtor,
}));

const delPattern = vi.fn(async () => 0);
vi.mock('../services/cacheService', () => ({
  CacheService: {
    getInstance: () => ({ delPattern }),
  },
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

async function freshModule() {
  vi.resetModules();
  return import('./workerEmitter');
}

describe('workerEmitter', () => {
  beforeEach(() => {
    EmitterCtor.mockClear();
    RedisCtor.mockClear();
    mockEmit.mockClear();
    mockTo.mockClear();
    mockToEmit.mockClear();
    mockQuit.mockClear();
    delPattern.mockClear();
    delete process.env.REDIS_URL;
  });

  afterEach(async () => {
    const mod = await import('./workerEmitter');
    await mod.shutdownWorkerEmitter();
  });

  describe('initWorkerEmitter', () => {
    it('constructs Redis client + Emitter using REDIS_URL', async () => {
      process.env.REDIS_URL = 'redis://test-host:6379';
      const mod = await freshModule();
      mod.initWorkerEmitter();
      expect(RedisCtor).toHaveBeenCalledWith('redis://test-host:6379');
      expect(EmitterCtor).toHaveBeenCalledTimes(1);
    });

    it('falls back to localhost when REDIS_URL is unset', async () => {
      const mod = await freshModule();
      mod.initWorkerEmitter();
      expect(RedisCtor).toHaveBeenCalledWith('redis://localhost:6379');
    });

    it('is idempotent: second call returns same Emitter without reconstructing', async () => {
      const mod = await freshModule();
      const first = mod.initWorkerEmitter();
      const second = mod.initWorkerEmitter();
      expect(first).toBe(second);
      expect(EmitterCtor).toHaveBeenCalledTimes(1);
      expect(RedisCtor).toHaveBeenCalledTimes(1);
    });
  });

  describe('getWorkerEmitter', () => {
    it('throws when called before init', async () => {
      const mod = await freshModule();
      expect(() => mod.getWorkerEmitter()).toThrow(/not initialized/);
    });

    it('returns the live instance after init', async () => {
      const mod = await freshModule();
      const inst = mod.initWorkerEmitter();
      expect(mod.getWorkerEmitter()).toBe(inst);
    });
  });

  describe('shutdownWorkerEmitter', () => {
    it('quits Redis + nulls singletons; second call is no-op', async () => {
      const mod = await freshModule();
      mod.initWorkerEmitter();
      await mod.shutdownWorkerEmitter();
      expect(mockQuit).toHaveBeenCalledTimes(1);
      // After shutdown, getWorkerEmitter should throw again
      expect(() => mod.getWorkerEmitter()).toThrow(/not initialized/);
      // Second shutdown when redisClient already null is a no-op
      await mod.shutdownWorkerEmitter();
      expect(mockQuit).toHaveBeenCalledTimes(1);
    });
  });

  describe('emitNewArticle', () => {
    it('emits global + region channel + per-topic channels + invalidates cache', async () => {
      const mod = await freshModule();
      mod.initWorkerEmitter();
      const article = {
        id: 'a1',
        perspective: 'usa',
        topics: ['politics', 'economy'],
      } as unknown as Parameters<typeof mod.emitNewArticle>[0];
      mod.emitNewArticle(article);
      // Global broadcast
      expect(mockEmit).toHaveBeenCalledWith('news:new', article);
      // Region-scoped (one `to('region:usa').emit(...)`)
      expect(mockTo).toHaveBeenCalledWith('region:usa');
      // Two per-topic broadcasts
      expect(mockTo).toHaveBeenCalledWith('topic:politics');
      expect(mockTo).toHaveBeenCalledWith('topic:economy');
      // Cache invalidation
      expect(delPattern).toHaveBeenCalledWith('news:list:*');
    });

    it('handles article with empty topics array (no per-topic broadcasts)', async () => {
      const mod = await freshModule();
      mod.initWorkerEmitter();
      const article = {
        id: 'a2',
        perspective: 'europa',
        topics: [],
      } as unknown as Parameters<typeof mod.emitNewArticle>[0];
      mod.emitNewArticle(article);
      // Only global + region — no topic channels
      expect(mockEmit).toHaveBeenCalledTimes(1);
      expect(mockTo).toHaveBeenCalledTimes(1);
      expect(mockTo).toHaveBeenCalledWith('region:europa');
    });
  });

  describe('emitBreakingNews', () => {
    it('emits news:breaking globally', async () => {
      const mod = await freshModule();
      mod.initWorkerEmitter();
      const article = { id: 'b1', perspective: 'usa', topics: [] } as unknown as Parameters<
        typeof mod.emitBreakingNews
      >[0];
      mod.emitBreakingNews(article);
      expect(mockEmit).toHaveBeenCalledWith('news:breaking', article);
    });
  });

  describe('emitNewEvent', () => {
    it('with region: emits global + region-scoped', async () => {
      const mod = await freshModule();
      mod.initWorkerEmitter();
      const event = {
        id: 'e1',
        location: { region: 'nahost' },
      } as unknown as Parameters<typeof mod.emitNewEvent>[0];
      mod.emitNewEvent(event);
      expect(mockEmit).toHaveBeenCalledWith('event:new', event);
      expect(mockTo).toHaveBeenCalledWith('region:nahost');
    });

    it('without region: emits global only', async () => {
      const mod = await freshModule();
      mod.initWorkerEmitter();
      const event = { id: 'e2' } as unknown as Parameters<typeof mod.emitNewEvent>[0];
      mod.emitNewEvent(event);
      expect(mockEmit).toHaveBeenCalledWith('event:new', event);
      expect(mockTo).not.toHaveBeenCalled();
    });

    it('with location object but no region field: emits global only', async () => {
      const mod = await freshModule();
      mod.initWorkerEmitter();
      const event = { id: 'e3', location: {} } as unknown as Parameters<
        typeof mod.emitNewEvent
      >[0];
      mod.emitNewEvent(event);
      expect(mockEmit).toHaveBeenCalledWith('event:new', event);
      expect(mockTo).not.toHaveBeenCalled();
    });
  });
});
