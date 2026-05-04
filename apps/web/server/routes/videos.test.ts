/**
 * Route tests for /api/videos (Phase 40-05 / Task 6).
 *
 * Uses the req/res mock pattern from podcasts.test.ts (no supertest dep) —
 * walks the router stack, matches by path+method, invokes the handler with
 * mocked Request/Response.
 *
 * Behaviors covered:
 *   1. GET /related/:articleId returns standard envelope + meta.source + 5min cache
 *   2. Invalid articleId rejected (400)
 *   3. GET /channels returns curated list + 24h Cache-Control
 *   4. GET /channel/:channelId/recent paginates and clamps limit
 *   5. All endpoints use the standard `success/data/meta` envelope
 *   6. Service throws → 500 with safe message (no stack-trace leak)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const findRelated = vi.fn();
const findManyMock = vi.fn();

vi.mock('../db/prisma', () => ({
  prisma: { video: { findMany: findManyMock } },
}));

vi.mock('../services/videoIndexService', () => ({
  VideoIndexService: { getInstance: () => ({ findRelated }) },
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
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
  return import('./videos');
}

beforeEach(() => {
  findRelated.mockReset();
  findManyMock.mockReset();
});

async function invoke(
  method: string,
  path: string,
  opts: { params?: Record<string, string>; query?: Record<string, unknown> } = {},
) {
  const mod = await loadRouter();
  const router = mod.videosRoutes as unknown as {
    stack: Array<{
      route?: {
        path: string;
        methods: Record<string, boolean>;
        stack: Array<{ handle: (req: Request, res: Response, next: () => void) => Promise<void> }>;
      };
    }>;
  };
  const layer = router.stack.find(
    l => l.route && l.route.path === path && l.route.methods[method.toLowerCase()],
  );
  if (!layer || !layer.route) throw new Error(`Route not found: ${method} ${path}`);
  const req = makeReq(opts);
  const res = makeRes();
  await layer.route.stack[0].handle(req, res, () => {});
  return res;
}

describe('GET /related/:articleId', () => {
  it('Test 1: returns standard envelope with meta.source + 5min Cache-Control', async () => {
    findRelated.mockResolvedValueOnce({
      videos: [
        {
          video: {
            id: 'v1',
            youtubeId: 'yt1',
            title: 't',
            description: '',
            publishedAt: new Date(),
          },
          matchScore: 0.4,
          matchedTerms: ['ukraine'],
          source: 'local-index',
        },
      ],
      source: 'local',
    });

    const res = await invoke('GET', '/related/:articleId', {
      params: { articleId: 'article-abc' },
    });

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.success).toBe(true);
    expect(jsonCall.data).toHaveLength(1);
    expect(jsonCall.meta.source).toBe('local');
    expect(jsonCall.meta.total).toBe(1);
  });

  it('Test 2: rejects missing/empty articleId', async () => {
    const res = await invoke('GET', '/related/:articleId', { params: { articleId: '' } });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects articleId longer than 128 chars', async () => {
    const longId = 'x'.repeat(200);
    const res = await invoke('GET', '/related/:articleId', { params: { articleId: longId } });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('Test 6: 500 with safe message on service throw (no stack-trace leak)', async () => {
    findRelated.mockRejectedValueOnce(new Error('upstream boom'));
    const res = await invoke('GET', '/related/:articleId', { params: { articleId: 'x' } });
    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to fetch related videos');
    expect(body.error).not.toContain('boom');
  });
});

describe('GET /channels', () => {
  it('Test 3: returns curated list + 24h Cache-Control', async () => {
    const res = await invoke('GET', '/channels');
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(20);
    expect(body.meta.total).toBe(body.data.length);
  });
});

describe('GET /channel/:channelId/recent', () => {
  it('Test 4: paginates and returns videos', async () => {
    const fakeRows = [
      { id: 'v1', youtubeId: 'yt1', title: 'A', publishedAt: new Date() },
      { id: 'v2', youtubeId: 'yt2', title: 'B', publishedAt: new Date() },
    ];
    findManyMock.mockResolvedValueOnce(fakeRows);

    const res = await invoke('GET', '/channel/:channelId/recent', {
      params: { channelId: 'UCabcdefghijklmnopqrstuv' },
      query: { limit: '10', offset: '0' },
    });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { channelId: 'UCabcdefghijklmnopqrstuv' },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      skip: 0,
    });
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.meta.limit).toBe(10);
    expect(body.meta.offset).toBe(0);
  });

  it('rejects invalid channelId format', async () => {
    const res = await invoke('GET', '/channel/:channelId/recent', {
      params: { channelId: 'not-a-uc-id' },
    });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects limit > 50', async () => {
    const res = await invoke('GET', '/channel/:channelId/recent', {
      params: { channelId: 'UCabcdefghijklmnopqrstuv' },
      query: { limit: '999' },
    });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('Test 5: sets Cache-Control max-age=300 on recent endpoint', async () => {
    findManyMock.mockResolvedValueOnce([]);
    const res = await invoke('GET', '/channel/:channelId/recent', {
      params: { channelId: 'UCabcdefghijklmnopqrstuv' },
    });
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
  });

  it('uses default limit=20 / offset=0 when query absent', async () => {
    findManyMock.mockResolvedValueOnce([]);
    const res = await invoke('GET', '/channel/:channelId/recent', {
      params: { channelId: 'UCabcdefghijklmnopqrstuv' },
    });
    expect(findManyMock).toHaveBeenCalledWith({
      where: { channelId: 'UCabcdefghijklmnopqrstuv' },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      skip: 0,
    });
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.meta.limit).toBe(20);
    expect(body.meta.offset).toBe(0);
  });
});
