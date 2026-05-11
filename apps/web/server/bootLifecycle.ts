/**
 * Phase 37 Plan 02 (JOB-01) — boot-mode dispatcher.
 *
 * Extracted from index.ts so the boot-mode unit tests can drive each branch
 * with explicit args (the tests mock NewsAggregator/CleanupService/
 * workerEmitter and verify the right side-effects fire for web vs worker
 * vs single-replica). Keeping this module side-effect-free at import time
 * (only `import` statements, no top-level invocations) is what makes that
 * possible.
 *
 * Ordering invariant (Assumption A8): when runJobs is true,
 * initWorkerEmitter() MUST run BEFORE NewsAggregator.startAggregation() so
 * the first cross-replica broadcast has a live Redis Pub/Sub channel.
 *
 * Threat mitigations:
 *   - T-37-04 (Tampering — duplicate writes): RUN_JOBS is the single source
 *     of truth. Only one replica per stack should be configured with
 *     runJobs=true (Plan 04 enforces topology with replicas=1 + stop-first).
 *   - T-37-05 (Information Disclosure — in-memory state): web replicas with
 *     runJobs=false do NOT construct NewsAggregator at all, so there is no
 *     in-memory Map to crash on.
 */

import type { Server as HttpServer } from 'http';
import { NewsAggregator } from './services/newsAggregator';
import { CleanupService } from './services/cleanupService';
import { initWorkerEmitter } from './jobs/workerEmitter';
import logger from './utils/logger';

export interface BootLifecycleOptions {
  runHttp: boolean;
  runJobs: boolean;
  /** HTTP server reference; only used when runHttp is true. */
  httpServer?: HttpServer;
  /** Port; only used when runHttp is true. */
  port?: number | string;
  /** Optional callback invoked after httpServer.listen completes. */
  onListening?: () => void;
}

export async function runBootLifecycle(opts: BootLifecycleOptions): Promise<void> {
  if (opts.runHttp) {
    if (opts.httpServer && opts.port !== undefined) {
      opts.httpServer.listen(opts.port, () => {
        if (opts.onListening) opts.onListening();
      });
    }
  }

  if (opts.runJobs) {
    // JOB-03: init worker emitter BEFORE startAggregation so first emit has
    // a live Redis Pub/Sub channel (Assumption A8 ordering).
    initWorkerEmitter();

    const newsAggregator = NewsAggregator.getInstance();
    newsAggregator.startAggregation().catch((err) => {
      // eslint-disable-next-line no-console
      logger.error('Aggregation error:', err);
    });

    const cleanupService = CleanupService.getInstance();
    cleanupService.start();
  }
}
