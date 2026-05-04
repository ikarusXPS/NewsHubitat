/**
 * Route tests for /api/transcripts (Phase 40-06 / Task 4 / T-40-06-03).
 *
 * Uses the no-supertest pattern from podcasts.test.ts: walks the router
 * stack and invokes handlers directly. requireTier is mocked so each test
 * controls the auth/tier outcome by setting a per-test result.
 *
 * Tests:
 *   1. 401 when no req.user (unauthenticated)
 *   2. 403 when FREE-tier JWT
 *   3. 200 with PREMIUM-tier on valid transcript
 *   4. 404 when service returns null
 *   5. 400 on invalid contentType (e.g. /api/transcripts/article/foo)
 *   6. /search returns segments matching the query
 *   7. /search returns 400 when query missing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const getTranscript = vi.fn();
const searchSegments = vi.fn();

vi.mock('../services/transcriptService', () => ({
  TranscriptService: {
    getInstance: () => ({ getTranscript, searchSegments }),
  },
}));

// requireTier mock — emits a fresh middleware per call. Tests configure
// the outcome by setting `tierMockResult` before invoking the route.
type TierOutcome = { status?: number; userId?: string; tier?: string };
let tierMockResult: TierOutcome = { userId: 'u1', tier: 'PREMIUM' };

vi.mock('../middleware/requireTier', () => ({
  requireTier: () => async (req: Request, res: Response, next: () => void) => {
    if (tierMockResult.status) {
      res.status(tierMockResult.status);
      res.json({ success: false, error: `tier_gate_${tierMockResult.status}` });
      return;
    }
    (req as unknown as { user: { userId: string; email: string }; userTier: string }).user = {
      userId: tierMockResult.userId ?? 'u1',
      email: 'x@y.z',
    };
    (req as unknown as { userTier: string }).userTier = tierMockResult.tier ?? 'PREMIUM';
    next();
  },
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function makeRes(): Response {
  const res: Partial<Response> & { _status?: number } = {};
  res.status = vi.fn((code: number) => {
    res._status = code;
    return res as Response;
  });
  res.json = vi.fn().mockReturnValue(res as Response);
  res.set = vi.fn().mockReturnValue(res as Response);
  return res as Response;
}

function makeReq(opts: {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
}): Request {
  return {
    params: opts.params ?? {},
    query: opts.query ?? {},
  } as unknown as Request;
}

async function loadRouter() {
  vi.resetModules();
  return import('./transcripts');
}

async function invoke(
  method: string,
  path: string,
  opts: { params?: Record<string, string>; query?: Record<string, unknown> } = {},
) {
  const mod = await loadRouter();
  const router = mod.transcriptRoutes as unknown as {
    stack: Array<{
      route?: {
        path: string;
        methods: Record<string, boolean>;
        stack: Array<{ handle: (req: Request, res: Response, next: () => void) => Promise<void> }>;
      };
    }>;
  };
  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method.toLowerCase()],
  );
  if (!layer || !layer.route) throw new Error(`Route not found: ${method} ${path}`);
  const req = makeReq(opts);
  const res = makeRes();

  // Walk middlewares: requireTier first, then the handler. If requireTier
  // ends the response (status set), we stop.
  let next = false;
  await layer.route.stack[0].handle(req, res, () => {
    next = true;
  });
  if (next && layer.route.stack[1]) {
    await layer.route.stack[1].handle(req, res, () => {});
  }
  return res;
}

beforeEach(() => {
  getTranscript.mockReset();
  searchSegments.mockReset();
  tierMockResult = { userId: 'u1', tier: 'PREMIUM' };
});

describe('GET /:contentType/:id', () => {
  it('returns 401 when requireTier blocks unauthenticated requests', async () => {
    tierMockResult = { status: 401 };
    const res = await invoke('GET', '/:contentType/:id', {
      params: { contentType: 'podcast', id: 'ep1' },
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(getTranscript).not.toHaveBeenCalled();
  });

  it('returns 403 when requireTier blocks FREE-tier JWT', async () => {
    tierMockResult = { status: 403 };
    const res = await invoke('GET', '/:contentType/:id', {
      params: { contentType: 'podcast', id: 'ep1' },
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(getTranscript).not.toHaveBeenCalled();
  });

  it('returns 200 + transcript envelope for PREMIUM-tier on valid transcript', async () => {
    getTranscript.mockResolvedValueOnce({
      id: 't1',
      contentType: 'podcast',
      contentId: 'ep1',
      language: 'en',
      segments: [{ startSec: 0, endSec: 5, text: 'Hello' }],
      provider: 'whisper',
      transcribedAt: new Date(),
    });
    const res = await invoke('GET', '/:contentType/:id', {
      params: { contentType: 'podcast', id: 'ep1' },
    });
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, max-age=3600');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.any(Object) }),
    );
  });

  it('returns 404 when service returns null', async () => {
    getTranscript.mockResolvedValueOnce(null);
    const res = await invoke('GET', '/:contentType/:id', {
      params: { contentType: 'podcast', id: 'ep1' },
    });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 on invalid contentType', async () => {
    const res = await invoke('GET', '/:contentType/:id', {
      params: { contentType: 'article', id: 'ep1' },
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(getTranscript).not.toHaveBeenCalled();
  });
});

describe('GET /:contentType/:id/search', () => {
  it('returns matched segments envelope', async () => {
    searchSegments.mockResolvedValueOnce([
      { startSec: 0, endSec: 5, text: 'matched' },
    ]);
    const res = await invoke('GET', '/:contentType/:id/search', {
      params: { contentType: 'podcast', id: 'ep1' },
      query: { q: 'matched' },
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        segments: [{ startSec: 0, endSec: 5, text: 'matched' }],
        total: 1,
      },
    });
  });

  it('returns 400 when query is missing', async () => {
    const res = await invoke('GET', '/:contentType/:id/search', {
      params: { contentType: 'podcast', id: 'ep1' },
      query: {},
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(searchSegments).not.toHaveBeenCalled();
  });
});
