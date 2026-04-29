import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { serverTimingMiddleware } from './serverTiming';

describe('serverTimingMiddleware', () => {
  function createMockRes(): Response {
    const headers: Record<string, string> = {};
    const res = {
      setHeader: vi.fn((key: string, value: string) => {
        headers[key] = value;
      }),
      writeHead: vi.fn(function (this: Response) {
        return this;
      }),
      getHeader: (key: string) => headers[key],
    } as unknown as Response;
    return res;
  }

  it('calls next() to continue middleware chain', () => {
    const req = {} as Request;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    serverTimingMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('sets Server-Timing header on writeHead', () => {
    const req = {} as Request;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    serverTimingMiddleware(req, res, next);

    // Simulate response being sent
    res.writeHead(200);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Server-Timing',
      expect.stringMatching(/^total;dur=\d+\.\d{2}$/)
    );
  });

  it('measures duration with millisecond precision', async () => {
    const req = {} as Request;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    serverTimingMiddleware(req, res, next);

    // Wait 50ms to simulate request processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    res.writeHead(200);

    const header = res.getHeader('Server-Timing') as string;
    const match = header.match(/total;dur=(\d+\.\d+)/);
    expect(match).toBeTruthy();

    const duration = parseFloat(match![1]);
    expect(duration).toBeGreaterThanOrEqual(45); // Allow some timing variance
    expect(duration).toBeLessThan(200); // Should not be too slow
  });

  it('works with different status codes', () => {
    const req = {} as Request;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    serverTimingMiddleware(req, res, next);

    res.writeHead(404);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Server-Timing',
      expect.stringMatching(/^total;dur=\d+\.\d{2}$/)
    );
  });

  it('works with 500 status code', () => {
    const req = {} as Request;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    serverTimingMiddleware(req, res, next);

    res.writeHead(500);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Server-Timing',
      expect.stringMatching(/^total;dur=\d+\.\d{2}$/)
    );
  });

  it('handles very fast responses', () => {
    const req = {} as Request;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    serverTimingMiddleware(req, res, next);
    res.writeHead(200);

    const header = res.getHeader('Server-Timing') as string;
    const match = header.match(/total;dur=(\d+\.\d+)/);
    expect(match).toBeTruthy();

    const duration = parseFloat(match![1]);
    // Fast responses should have very small durations
    expect(duration).toBeLessThan(50);
  });
});
