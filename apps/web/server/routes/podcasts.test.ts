/**
 * Route tests for /api/podcasts (Phase 40-03 / CONT-03 / D-B3).
 *
 * Uses the req/res mock pattern from ai.factCheck.test.ts (no supertest dep).
 * Each test mounts a fresh sub-router via importing the routes module and
 * exercising the handlers directly through Express's internal dispatch on
 * a small ad-hoc app instance.
 *
 * Behaviors covered (T1-T7):
 *   1. GET / returns curated list + 24h Cache-Control
 *   2. GET /:feedId/episodes returns data + meta; supports limit; 404 for unknown
 *   3. GET /episodes/:episodeId returns row or 404
 *   4. GET /related/:articleId returns matched + 1h Cache-Control
 *   5. Invalid articleId returns 400
 *   6. limit=999999 clamped to 100
 *   7. findRelated throwing returns 500 (no stack-trace leak)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const listCurated = vi.fn();
const getEpisodes = vi.fn();
const getEpisode = vi.fn();
const findRelated = vi.fn();

vi.mock('../services/podcastService', () => ({
  PodcastService: {
    getInstance: () => ({ listCurated, getEpisodes, getEpisode, findRelated }),
  },
}));

vi.mock('../config/podcasts', () => ({
  PODCAST_FEEDS: [
    { id: 'fixture-feed', title: 'Fixture', region: 'usa', language: 'en', rssUrl: 'https://x', category: 'news', reliability: 8 },
  ],
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Imports added to podcasts.ts for the PREMIUM-gated /transcripts/search route
// must be mocked here too — without these, the route module's top-level imports
// load real prisma + auth, which need DATABASE_URL + JWT setup at test boot.
vi.mock('../db/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    podcastEpisode: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock('../services/authService', () => ({
  authMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/requireTier', () => ({
  requireTier:
    () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

function makeRes(): Response {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res as Response);
  res.json = vi.fn().mockReturnValue(res as Response);
  res.set = vi.fn().mockReturnValue(res as Response);
  return res as Response;
}

function makeReq(opts: { params?: Record<string, string>; query?: Record<string, unknown> }): Request {
  return {
    params: opts.params ?? {},
    query: opts.query ?? {},
  } as unknown as Request;
}

async function loadRouter() {
  vi.resetModules();
  return import('./podcasts');
}

beforeEach(() => {
  listCurated.mockReset();
  getEpisodes.mockReset();
  getEpisode.mockReset();
  findRelated.mockReset();
});

// Helper: invoke a route by walking the router stack and matching by path + method
async function invoke(method: string, path: string, opts: { params?: Record<string, string>; query?: Record<string, unknown> } = {}) {
  const mod = await loadRouter();
  const router = mod.podcastRoutes as unknown as {
    stack: Array<{
      route?: {
        path: string;
        methods: Record<string, boolean>;
        stack: Array<{ handle: (req: Request, res: Response, next: () => void) => Promise<void> }>;
      };
    }>;
  };
  const layer = router.stack.find(l => l.route && l.route.path === path && l.route.methods[method.toLowerCase()]);
  if (!layer || !layer.route) throw new Error(`Route not found: ${method} ${path}`);
  const req = makeReq(opts);
  const res = makeRes();
  await layer.route.stack[0].handle(req, res, () => {});
  return res;
}

describe('GET /', () => {
  it('returns curated list + 24h cache header', async () => {
    listCurated.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
    const res = await invoke('GET', '/');
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 'a' }, { id: 'b' }], meta: { total: 2 } });
  });
});

describe('GET /episodes/:episodeId', () => {
  it('returns episode row when found', async () => {
    getEpisode.mockResolvedValueOnce({ id: 'e1', title: 'X' });
    const res = await invoke('GET', '/episodes/:episodeId', { params: { episodeId: 'abc123' } });
    expect(res.status).not.toHaveBeenCalledWith(404);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 'e1', title: 'X' } });
  });

  it('returns 404 when not found', async () => {
    getEpisode.mockResolvedValueOnce(null);
    const res = await invoke('GET', '/episodes/:episodeId', { params: { episodeId: 'missing' } });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Episode not found' });
  });

  it('returns 400 on invalid id', async () => {
    const res = await invoke('GET', '/episodes/:episodeId', { params: { episodeId: '' } });
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('GET /:feedId/episodes', () => {
  it('returns episodes for known feed with default limit 50', async () => {
    getEpisodes.mockResolvedValueOnce([{ id: 'e1' }]);
    const res = await invoke('GET', '/:feedId/episodes', { params: { feedId: 'fixture-feed' } });
    expect(getEpisodes).toHaveBeenCalledWith('fixture-feed', 50);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=600');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: 'e1' }],
      meta: { total: 1, limit: 50 },
    });
  });

  it('returns 404 for unknown feedId', async () => {
    const res = await invoke('GET', '/:feedId/episodes', { params: { feedId: 'unknown-feed' } });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Feed not found' });
  });

  it('returns 400 for malformed feedId', async () => {
    const res = await invoke('GET', '/:feedId/episodes', { params: { feedId: 'has spaces!' } });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('clamps limit > 100 to a 400 error (boundary safety)', async () => {
    const res = await invoke('GET', '/:feedId/episodes', {
      params: { feedId: 'fixture-feed' },
      query: { limit: '999999' },
    });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('respects limit when within range', async () => {
    getEpisodes.mockResolvedValueOnce([]);
    await invoke('GET', '/:feedId/episodes', {
      params: { feedId: 'fixture-feed' },
      query: { limit: '20' },
    });
    expect(getEpisodes).toHaveBeenCalledWith('fixture-feed', 20);
  });
});

describe('GET /related/:articleId', () => {
  it('returns matched episodes + 1h cache header', async () => {
    findRelated.mockResolvedValueOnce([{ id: 'm1', score: 12 }]);
    const res = await invoke('GET', '/related/:articleId', { params: { articleId: 'art-1' } });
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: 'm1', score: 12 }],
      meta: { total: 1 },
    });
  });

  it('returns 400 on empty articleId', async () => {
    const res = await invoke('GET', '/related/:articleId', { params: { articleId: '' } });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 with safe message when service throws (T-40-03-03 mitigation)', async () => {
    findRelated.mockRejectedValueOnce(new Error('internal stack trace leak'));
    const res = await invoke('GET', '/related/:articleId', { params: { articleId: 'art-2' } });
    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload).toEqual({ success: false, error: 'Failed to fetch related podcasts' });
    expect(JSON.stringify(payload)).not.toContain('internal stack trace leak');
  });
});
