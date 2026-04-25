/**
 * Prometheus Metrics Middleware (D-05, D-06, D-10)
 * Records HTTP request metrics with route normalization to prevent cardinality explosion
 */

import type { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../services/metricsService';

const metricsService = MetricsService.getInstance();

// Skip metrics for these paths (D-10)
const SKIP_PATHS = ['/health', '/readiness', '/metrics', '/api/health'];

/**
 * Normalize route labels to prevent cardinality explosion (D-06)
 * Replaces UUIDs, numeric IDs, and ObjectIds with :id placeholder
 */
function normalizeRoute(path: string): string {
  return path
    // Replace UUIDs: /api/news/550e8400-e29b-... -> /api/news/:id
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Replace numeric IDs: /api/news/12345 -> /api/news/:id
    .replace(/\/\d+/g, '/:id')
    // Replace ObjectIds: /api/news/507f1f77bcf86cd799439011 -> /api/news/:id
    .replace(/[0-9a-f]{24}/gi, ':id');
}

/**
 * Express middleware that records HTTP request metrics.
 * Uses res.on('finish') for accurate timing after response completes.
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip health/metrics endpoints (D-10)
  if (SKIP_PATHS.some(p => req.path.startsWith(p))) {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9; // Convert to seconds
    const route = normalizeRoute(req.path);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    metricsService.httpRequestDuration.observe(labels, duration);
    metricsService.httpRequestsTotal.inc(labels);
  });

  next();
}
