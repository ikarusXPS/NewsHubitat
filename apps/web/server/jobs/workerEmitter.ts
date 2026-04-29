/**
 * Worker Socket.IO Emitter — type-stub fallback
 *
 * NOTE (Phase 37 Plan 02): The full implementation is owned by Plan 01
 * (37-01). This file exists in this worktree as a minimal stub so that
 * Plan 02's references compile + tests pass during parallel execution.
 *
 * When the orchestrator merges Plan 01's branch, it will either:
 *   - Replace this file with the full implementation (preferred), or
 *   - Surface a merge conflict where Plan 01's version wins
 *
 * Behavior contract (must match Plan 01's exports):
 *   - initWorkerEmitter(): initializes Redis-backed Socket.IO Emitter
 *   - emitNewArticle(article): broadcast 'news:new' to all + region/topic rooms
 *   - emitBreakingNews(article): broadcast 'news:breaking' to all
 *   - emitNewEvent(event): broadcast 'event:new' to all + region room
 *   - shutdownWorkerEmitter(): closes Redis pub client
 *
 * RESEARCH §Pattern 3 (worker emits via Redis Pub/Sub channel set shared
 * with @socket.io/redis-adapter, so cross-replica fanout works without an
 * HTTP server).
 */

import type { NewsArticle, GeoEvent } from '../../src/types';
import logger from '../utils/logger';

let initialized = false;

export function initWorkerEmitter(): void {
  if (initialized) return;
  initialized = true;
  logger.info('workerEmitter (stub): initialized — full impl provided by Phase 37 Plan 01');
}

export function emitNewArticle(_article: NewsArticle): void {
  if (!initialized) return;
  // No-op stub — Plan 01 fan-outs via Socket.IO Emitter + Redis Pub/Sub
}

export function emitBreakingNews(_article: NewsArticle): void {
  if (!initialized) return;
  // No-op stub — Plan 01 fan-outs via Socket.IO Emitter + Redis Pub/Sub
}

export function emitNewEvent(_event: GeoEvent): void {
  if (!initialized) return;
  // No-op stub — Plan 01 fan-outs via Socket.IO Emitter + Redis Pub/Sub
}

export async function shutdownWorkerEmitter(): Promise<void> {
  initialized = false;
}
