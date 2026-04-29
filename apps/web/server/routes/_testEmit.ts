/**
 * Test-only fanout-trigger endpoint (Phase 37 / WS-04 verification harness).
 *
 * REGISTERED ONLY WHEN process.env.NODE_ENV === 'test'.
 * Production builds NEVER mount this router. Confirm with grep:
 *   grep -A3 "NODE_ENV === 'test'" apps/web/server/index.ts
 *
 * Used by e2e-stack/ws-fanout.test.ts to trigger an io.emit on whichever
 * replica handles the incoming POST. With @socket.io/redis-adapter wired
 * (Plan 01), the emit fans out across ALL replicas via Redis Pub/Sub on
 * the `socket.io#` channel namespace. Without the adapter, only clients
 * connected to the handling replica receive the event — which is what
 * the WS-04 cross-replica fanout test guards against.
 *
 * Threat-model: T-37-20 (Information Disclosure) — mitigated by the
 * NODE_ENV gate. The endpoint exposes ONLY a Socket.IO emit; no DB,
 * Redis, or filesystem access.
 */

import { Router, Request, Response } from 'express';
import { WebSocketService } from '../services/websocketService';

export const testEmitRoutes = Router();

testEmitRoutes.post('/emit-fanout', (req: Request, res: Response) => {
  const payload = req.body && Object.keys(req.body).length > 0
    ? req.body
    : { hello: 'world', t: Date.now() };

  const ws = WebSocketService.getInstance();

  // Reach into the private `io` field. WebSocketService.broadcast* methods all
  // target rooms or specific event names typed via ServerToClientEvents; this
  // test-only endpoint emits a synthetic event name not in that union, so we
  // call io.emit directly. Cast is intentional and isolated to this test-only
  // module so the production type surface stays clean.
  const io = (ws as unknown as { io: { emit: (event: string, ...args: unknown[]) => void } | null }).io;
  if (!io) {
    return res.status(503).json({ success: false, error: 'WebSocket not initialized' });
  }

  io.emit('test:fanout', payload);
  return res.json({ success: true, emitted: 'test:fanout', payload });
});
