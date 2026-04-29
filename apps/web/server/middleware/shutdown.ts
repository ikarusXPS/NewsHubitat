/**
 * Graceful Shutdown Middleware (Phase 37 / DEPLOY-04, DEPLOY-05)
 *
 * Wraps @godaddy/terminus to orchestrate the drain sequence:
 *   1. SIGTERM received
 *   2. beforeShutdown: isShuttingDown=true → /api/ready returns 503
 *   3. Sleep drainGraceMs (default 10s) so Traefik's healthcheck notices
 *      (Traefik's /api/ready healthcheck interval=10s; one cycle confirms unhealthy)
 *   4. onSignal: close Socket.IO, Redis, AI, Cleanup, Prisma — IN ORDER
 *   5. terminus closes httpServer; process exits 0
 *
 * Total budget: timeout=30_000ms (DEPLOY-05). stack.yml sets stop_grace_period: 35s
 * giving 5s slack before Swarm sends SIGKILL (Pitfall 5).
 *
 * Threat mitigations:
 *   - T-37-15 (DoS — terminus drain orchestration): timeout enforces upper bound;
 *     beforeShutdown sleep ≥ Traefik healthcheck interval gives LB time to notice.
 *   - T-37-16 (Tampering — Stripe webhook ordering): not touched here; this module
 *     is mounted from index.ts AFTER httpServer.listen in the RUN_HTTP block.
 *   - T-37-17 (Information Disclosure — /api/ready): aggregate latency only; no
 *     PII or query content (mirrors existing /readiness handler posture).
 */

import type { Server as HttpServer } from 'http';
import { createTerminus } from '@godaddy/terminus';
import logger from '../utils/logger';
import { prisma } from '../db/prisma';
import { CacheService } from '../services/cacheService';
import { WebSocketService } from '../services/websocketService';
import { AIService } from '../services/aiService';
import { CleanupService } from '../services/cleanupService';

let isShuttingDown = false;

/**
 * Whether the process is currently accepting new traffic.
 * Used by /api/ready terminus healthCheck and by anything else that wants to
 * gate on readiness without taking a hard dependency on terminus.
 */
export function isReadyForTraffic(): boolean {
  return !isShuttingDown;
}

export interface ShutdownOptions {
  /** ms to sleep in beforeShutdown so LB notices /api/ready=503. Default 10_000. */
  drainGraceMs?: number;
  /** Total terminus timeout. Default 30_000 (DEPLOY-05). */
  totalTimeoutMs?: number;
}

export function registerShutdown(
  httpServer: HttpServer,
  opts: ShutdownOptions = {}
): void {
  const drainGrace = opts.drainGraceMs ?? 10_000;
  const totalTimeout = opts.totalTimeoutMs ?? 30_000;

  createTerminus(httpServer, {
    signals: ['SIGTERM', 'SIGINT'],
    timeout: totalTimeout,

    beforeShutdown: async () => {
      isShuttingDown = true;
      logger.info(
        'shutdown:beforeShutdown — readiness now false; sleeping drain grace'
      );
      // Give Traefik one health-check interval to notice
      await new Promise((r) => setTimeout(r, drainGrace));
    },

    onSignal: async () => {
      logger.info('shutdown:onSignal — closing connections in order');

      // Service close order (mirrors existing inline shutdown in index.ts):
      // WebSocketService → CacheService → AIService → CleanupService → prisma.$disconnect
      // Each step wrapped in try/catch so a single failure does not abort the
      // remaining cleanup (T-37-15 mitigation: maximize cleanup completion).

      try {
        const wsService = WebSocketService.getInstance();
        await wsService.shutdown();
      } catch (err) {
        logger.error('shutdown: WebSocketService.shutdown failed', err as Error);
      }

      try {
        const cacheService = CacheService.getInstance();
        await cacheService.shutdown();
      } catch (err) {
        logger.error('shutdown: CacheService.shutdown failed', err as Error);
      }

      try {
        AIService.getInstance().shutdown();
      } catch (err) {
        logger.error('shutdown: AIService.shutdown failed', err as Error);
      }

      try {
        CleanupService.getInstance().stop();
      } catch (err) {
        logger.error('shutdown: CleanupService.stop failed', err as Error);
      }

      try {
        await prisma.$disconnect();
        logger.info('shutdown: prisma.$disconnect complete');
      } catch (err) {
        logger.error('shutdown: prisma.$disconnect failed', err as Error);
      }
    },

    healthChecks: {
      '/api/ready': async () => {
        if (isShuttingDown) {
          throw new Error('shutting down');
        }
        // Mirror existing readiness probe shape from index.ts:222-260:
        // DB ping + Redis isAvailable check, return latency-bearing payload.
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - dbStart;

        const cache = CacheService.getInstance();
        if (!cache.isAvailable()) {
          throw new Error('redis not ready');
        }

        return {
          status: 'ready',
          db_latency_ms: dbLatency,
        };
      },
    },

    logger: (msg, err) => (err ? logger.error(msg, err) : logger.info(msg)),
  });
}

/**
 * Test-only helper: reset internal state so multiple tests can drive
 * registerShutdown without process-level side effects.
 *
 * Vitest tests in shutdown.test.ts use this to reset isShuttingDown between
 * Cases A (pre-SIGTERM), B (during drain), C/D (cleanup), and E (timing).
 */
export function _resetShutdownState(): void {
  isShuttingDown = false;
}
