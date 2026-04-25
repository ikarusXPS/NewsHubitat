/**
 * ETag Middleware Tests (Phase 33)
 * Tests for weak ETag generation, conditional 304 responses, and skip paths
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { etagMiddleware } from './etagMiddleware';

// Helper to create mock request
const mockRequest = (overrides: Partial<Request> = {}): Request => ({
  method: 'GET',
  path: '/api/news',
  get: vi.fn().mockReturnValue(undefined),
  ...overrides,
} as unknown as Request);

// Helper to create mock response
const mockResponse = (): Response & { _jsonBody?: unknown } => {
  const res = {
    json: vi.fn(function (this: Response & { _jsonBody?: unknown }, body: unknown) {
      this._jsonBody = body;
      return this;
    }),
    set: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & { _jsonBody?: unknown };
};

describe('etagMiddleware', () => {
  let req: Request;
  let res: Response & { _jsonBody?: unknown };
  let next: NextFunction;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = vi.fn();
  });

  describe('GET requests', () => {
    it('should generate weak ETag header for JSON responses (D-04, D-05)', () => {
      etagMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // Call the overridden json method
      const testBody = { articles: [{ id: '1', title: 'Test' }] };
      res.json(testBody);

      // Verify ETag was set with weak validator format W/"..."
      expect(res.set).toHaveBeenCalledWith('ETag', expect.stringMatching(/^W\/"[a-f0-9]{16}"$/));
    });

    it('should return 304 when If-None-Match matches ETag (D-06)', () => {
      // Calculate the expected ETag for our test body
      const testBody = { data: 'test' };
      const content = JSON.stringify(testBody);
      const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 16);
      const expectedEtag = `W/"${hash}"`;

      req = mockRequest({
        method: 'GET',
        get: vi.fn((header: string) => {
          if (header === 'If-None-Match') return expectedEtag;
          return undefined;
        }),
      });

      etagMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // Call json with same body
      res.json(testBody);

      // Should return 304, not the body
      expect(res.status).toHaveBeenCalledWith(304);
      expect(res.end).toHaveBeenCalled();
    });

    it('should return full response when If-None-Match does not match', () => {
      req = mockRequest({
        method: 'GET',
        get: vi.fn((header: string) => {
          if (header === 'If-None-Match') return 'W/"stale-etag-12345"';
          return undefined;
        }),
      });

      etagMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();

      const testBody = { fresh: 'data' };
      res.json(testBody);

      // Should set new ETag and return body
      expect(res.set).toHaveBeenCalledWith('ETag', expect.stringMatching(/^W\/"[a-f0-9]{16}"$/));
      expect(res._jsonBody).toEqual(testBody);
    });

    it('should return full response when no If-None-Match header present', () => {
      etagMiddleware(req, res, next);

      const testBody = { id: 1, name: 'test' };
      res.json(testBody);

      expect(res.set).toHaveBeenCalledWith('ETag', expect.stringMatching(/^W\/"[a-f0-9]{16}"$/));
      expect(res._jsonBody).toEqual(testBody);
      expect(res.status).not.toHaveBeenCalledWith(304);
    });
  });

  describe('non-GET requests', () => {
    it('should skip POST requests', () => {
      req = mockRequest({ method: 'POST' });
      const originalJson = res.json;

      etagMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // json method should not be overridden
      expect(res.json).toBe(originalJson);
    });

    it('should skip PUT requests', () => {
      req = mockRequest({ method: 'PUT' });
      const originalJson = res.json;

      etagMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();

      expect(res.json).toBe(originalJson);
    });

    it('should skip DELETE requests', () => {
      req = mockRequest({ method: 'DELETE' });
      const originalJson = res.json;

      etagMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();

      expect(res.json).toBe(originalJson);
    });

    it('should skip PATCH requests', () => {
      req = mockRequest({ method: 'PATCH' });
      const originalJson = res.json;

      etagMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();

      expect(res.json).toBe(originalJson);
    });
  });

  describe('skip paths', () => {
    it('should skip /health endpoint', () => {
      req = mockRequest({ path: '/health' });
      const originalJson = res.json;

      etagMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // json should not be overridden
      expect(res.json).toBe(originalJson);
    });

    it('should skip /readiness endpoint', () => {
      req = mockRequest({ path: '/readiness' });
      const originalJson = res.json;

      etagMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();

      expect(res.json).toBe(originalJson);
    });

    it('should skip /metrics endpoint', () => {
      req = mockRequest({ path: '/metrics' });
      const originalJson = res.json;

      etagMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();

      expect(res.json).toBe(originalJson);
    });

    it('should skip /api/health endpoints', () => {
      req = mockRequest({ path: '/api/health/db' });
      const originalJson = res.json;

      etagMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();

      expect(res.json).toBe(originalJson);
    });

    it('should skip /api/health/redis endpoint', () => {
      req = mockRequest({ path: '/api/health/redis' });
      const originalJson = res.json;

      etagMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();

      expect(res.json).toBe(originalJson);
    });
  });

  describe('ETag format', () => {
    it('should generate consistent ETag for same content', () => {
      const testBody = { id: 1, name: 'test' };

      // First request
      etagMiddleware(req, res, next);
      res.json(testBody);
      const firstEtag = (res.set as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'ETag'
      )?.[1];

      // Reset and second request with same body
      res = mockResponse();
      req = mockRequest();
      next = vi.fn();

      etagMiddleware(req, res, next);
      res.json(testBody);
      const secondEtag = (res.set as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'ETag'
      )?.[1];

      expect(firstEtag).toBe(secondEtag);
    });

    it('should generate different ETag for different content', () => {
      // First request
      etagMiddleware(req, res, next);
      res.json({ content: 'A' });
      const firstEtag = (res.set as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'ETag'
      )?.[1];

      // Reset and second request with different body
      res = mockResponse();
      req = mockRequest();
      next = vi.fn();

      etagMiddleware(req, res, next);
      res.json({ content: 'B' });
      const secondEtag = (res.set as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'ETag'
      )?.[1];

      expect(firstEtag).not.toBe(secondEtag);
    });

    it('should use weak validator format W/"..."', () => {
      etagMiddleware(req, res, next);
      res.json({ test: true });

      const etagCall = (res.set as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'ETag'
      );
      expect(etagCall?.[1]).toMatch(/^W\/"[a-f0-9]+"/);
    });

    it('should use 16-character hex hash', () => {
      etagMiddleware(req, res, next);
      res.json({ data: 'some content' });

      const etagCall = (res.set as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'ETag'
      );
      // Format: W/"<16 hex chars>"
      expect(etagCall?.[1]).toMatch(/^W\/"[a-f0-9]{16}"$/);
    });
  });

  describe('edge cases', () => {
    it('should handle empty object response', () => {
      etagMiddleware(req, res, next);
      res.json({});

      expect(res.set).toHaveBeenCalledWith('ETag', expect.stringMatching(/^W\/"[a-f0-9]{16}"$/));
    });

    it('should handle array response', () => {
      etagMiddleware(req, res, next);
      res.json([1, 2, 3]);

      expect(res.set).toHaveBeenCalledWith('ETag', expect.stringMatching(/^W\/"[a-f0-9]{16}"$/));
    });

    it('should handle null response', () => {
      etagMiddleware(req, res, next);
      res.json(null);

      expect(res.set).toHaveBeenCalledWith('ETag', expect.stringMatching(/^W\/"[a-f0-9]{16}"$/));
    });

    it('should handle nested object response', () => {
      etagMiddleware(req, res, next);
      res.json({
        level1: {
          level2: {
            level3: 'deep value'
          }
        }
      });

      expect(res.set).toHaveBeenCalledWith('ETag', expect.stringMatching(/^W\/"[a-f0-9]{16}"$/));
    });
  });
});
