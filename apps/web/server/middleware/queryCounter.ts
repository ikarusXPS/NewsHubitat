/**
 * N+1 Query Detection Middleware (D-08 - Phase 34)
 * Counts queries per request and warns when >5 queries execute.
 * Development-only to avoid production overhead.
 */

import type { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import { prisma } from '../db/prisma';
import logger from '../utils/logger';

// D-08: Only enable in development
const isDev = process.env.NODE_ENV !== 'production';

// Request-scoped query counter using AsyncLocalStorage
interface QueryStore {
  count: number;
  queries: string[];
}

const queryCountStorage = new AsyncLocalStorage<QueryStore>();

// Subscribe to Prisma query events once at module load (dev only)
if (isDev) {
  prisma.$on('query', (e) => {
    const store = queryCountStorage.getStore();
    if (store) {
      store.count++;
      // Store first 10 queries for debugging
      if (store.queries.length < 10) {
        store.queries.push(e.query.slice(0, 100));
      }
    }
  });
}

// Paths to skip (health checks, metrics)
const SKIP_PATHS = ['/health', '/readiness', '/metrics', '/api/health'];

/**
 * Express middleware that counts database queries per request.
 * Warns in console when >5 queries detected (potential N+1).
 */
export function queryCounterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip in production (D-08)
  if (!isDev) {
    return next();
  }

  // Skip health/metrics endpoints
  if (SKIP_PATHS.some(p => req.path.startsWith(p))) {
    return next();
  }

  const store: QueryStore = { count: 0, queries: [] };

  queryCountStorage.run(store, () => {
    res.on('finish', () => {
      // D-08: Warn on >5 queries per request
      if (store.count > 5) {
        logger.warn(
          `[N+1 WARNING] ${req.method} ${req.path}: ${store.count} queries`
        );
        if (store.queries.length > 0) {
          logger.warn(`  First queries: ${store.queries.slice(0, 3).join(' | ')}`);
        }
      }
    });
    next();
  });
}
