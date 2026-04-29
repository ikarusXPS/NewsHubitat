/**
 * Worker Socket.IO Emitter (Phase 37 / JOB-03)
 *
 * Binds to the same Redis Pub/Sub channels as the @socket.io/redis-adapter
 * so the worker process can broadcast events to clients connected on web replicas
 * WITHOUT running an HTTP server.
 *
 * Channel prefix MUST match the adapter (default `socket.io#`) — do NOT pass
 * the `key` option to the Emitter constructor. ioredis `keyPrefix` does not
 * apply to Pub/Sub channel names, so passing the cache-prefixed client would
 * still work, but a fresh ioredis instance is cleaner and avoids subscriber-
 * mode collisions with CacheService.
 */

import { Emitter } from '@socket.io/redis-emitter';
import Redis from 'ioredis';
import logger from '../utils/logger';
import { CacheService } from '../services/cacheService';
import type {
  NewsArticle,
  GeoEvent,
} from '../../src/types';

let emitter: Emitter | null = null;
let redisClient: Redis | null = null;

/**
 * Initialize the Emitter. MUST be called before any emit*() helper.
 * Idempotent — second call is a no-op and returns the same instance.
 */
export function initWorkerEmitter(): Emitter {
  if (emitter) return emitter;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  // Do NOT pass keyPrefix — adapter channels are global (WS-03 / Pitfall 3).
  redisClient = new Redis(redisUrl);
  emitter = new Emitter(redisClient);
  logger.info('✓ Worker Socket.IO Emitter initialized');
  return emitter;
}

export function getWorkerEmitter(): Emitter {
  if (!emitter) {
    throw new Error('Worker emitter not initialized — call initWorkerEmitter() first');
  }
  return emitter;
}

export async function shutdownWorkerEmitter(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    emitter = null;
    logger.info('Worker Socket.IO Emitter shut down');
  }
}

/**
 * Match WebSocketService.broadcastNewArticle (websocketService.ts:293-310) 1:1
 * so the worker code path reads symmetrically with the web-replica path.
 * Worker now owns broadcast — also owns cache invalidation.
 */
export function emitNewArticle(article: NewsArticle): void {
  const e = getWorkerEmitter();
  e.emit('news:new', article);
  e.to(`region:${article.perspective}`).emit('news:new', article);
  for (const topic of article.topics) {
    e.to(`topic:${topic}`).emit('news:new', article);
  }
  // Cache invalidation hook (moved from websocketService.ts:307-310)
  const cache = CacheService.getInstance();
  void cache.delPattern('news:list:*');
}

export function emitBreakingNews(article: NewsArticle): void {
  getWorkerEmitter().emit('news:breaking', article);
}

export function emitNewEvent(event: GeoEvent): void {
  const e = getWorkerEmitter();
  e.emit('event:new', event);
  if (event.location?.region) {
    e.to(`region:${event.location.region}`).emit('event:new', event);
  }
}
