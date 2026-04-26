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
