/**
 * ETag Middleware (D-04, D-05, D-06)
 * Generates weak ETags for API responses and handles conditional requests
 * Uses MD5 hash of JSON response body for content-based validation
 */

import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// Skip ETag for these paths (health checks, metrics - not useful to cache)
const SKIP_PATHS = ['/health', '/readiness', '/metrics', '/api/health'];

/**
 * Express middleware that generates weak ETags for JSON responses.
 * Returns 304 Not Modified when client's If-None-Match matches current ETag.
 */
export function etagMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only process GET requests (D-06: ETags for cacheable content)
  if (req.method !== 'GET') {
    return next();
  }

  // Skip health/metrics endpoints
  if (SKIP_PATHS.some(p => req.path.startsWith(p))) {
    return next();
  }

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override res.json to add ETag
  res.json = function (body: unknown): Response {
    // Generate weak ETag from content hash (D-04, D-05)
    const content = JSON.stringify(body);
    const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 16);
    const etag = `W/"${hash}"`;

    // Check If-None-Match header (D-06)
    const clientEtag = req.get('If-None-Match');
    if (clientEtag && clientEtag === etag) {
      res.status(304);
      return res.end();
    }

    // Set ETag header and send response
    res.set('ETag', etag);
    return originalJson(body);
  };

  next();
}
