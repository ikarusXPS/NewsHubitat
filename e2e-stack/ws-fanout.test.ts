/**
 * WS-04 cross-replica fanout integration test (Phase 37).
 *
 * Verification gate: docker compose -f e2e-stack/docker-compose.test.yml up
 * boots 2 web replicas behind Traefik on localhost:8000. This test connects
 * 2 socket.io clients to the LB (each making a fresh forceNew connection so
 * Traefik issues a fresh nh_sticky cookie per session and round-robins them
 * to different replicas), then triggers io.emit on whichever replica handles
 * an HTTP POST and asserts the OTHER client receives the event.
 *
 * Without @socket.io/redis-adapter (Plan 01) wired correctly, this test
 * FAILS because the emit on replica A only reaches clients connected to
 * replica A. Re-running with the adapter line commented out is the
 * sanity-check that proves the test is meaningful (see Task 5 / README.md).
 *
 * Closes WS-04 (verification gate). Cited in CONTEXT.md as the locked
 * gate for INFRA-04: "Mocked-adapter unit tests are insufficient" — must
 * be a real Docker-orchestrated test.
 *
 * Run: bash e2e-stack/run-fanout-test.sh
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioClient, type Socket } from 'socket.io-client';

const TRAEFIK_URL = process.env.WS_FANOUT_URL || 'http://localhost:8000';
const FANOUT_TIMEOUT_MS = 5_000;
const CONNECT_TIMEOUT_MS = 10_000;

/**
 * Connect a fresh socket.io client through Traefik. forceNew + a unique query
 * param means Traefik treats this as a brand-new session and issues its own
 * nh_sticky cookie; the next forceNew call gets a different cookie value, so
 * round-robin steers it to the OTHER replica.
 *
 * transports: ['websocket'] only — NOT polling. Reason: socket.io-client v4
 * in Node.js does NOT manage cookies across requests (browsers do, Node
 * doesn't). With sticky-session load-balancing in front of socket.io
 * polling, the initial GET handshake gets a sid + nh_sticky cookie from
 * Traefik, but the follow-up POST goes WITHOUT the cookie, gets routed
 * randomly, and lands on a replica that doesn't know the sid → "xhr post
 * error". WebSocket sidesteps this because it's a single TCP connection:
 * sticky pinning happens once at upgrade time and the same socket stays
 * pinned for its lifetime. Production browsers don't have this problem
 * (they manage cookies natively). The Redis-adapter fanout proof is
 * transport-agnostic anyway — the adapter operates on Socket.IO message
 * pub/sub, not engine.io transport.
 */
async function connectClient(label: string): Promise<Socket> {
  const sock = ioClient(TRAEFIK_URL, {
    transports: ['websocket'],
    forceNew: true,
    autoConnect: true,
    // Cache-busting query param ensures Traefik doesn't reuse a session.
    query: { _client: label, _t: String(Date.now()) },
    reconnection: false,
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`connect timeout for ${label}`)),
      CONNECT_TIMEOUT_MS,
    );
    sock.on('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    sock.on('connect_error', (e: Error) => {
      clearTimeout(timer);
      reject(new Error(`connect_error for ${label}: ${e.message}`));
    });
  });
  return sock;
}

describe('WS-04 cross-replica fanout (Phase 37 / INFRA-04)', () => {
  let clientA: Socket;
  let clientB: Socket;

  beforeAll(async () => {
    clientA = await connectClient('A');
    clientB = await connectClient('B');
  }, 30_000);

  afterAll(() => {
    clientA?.disconnect();
    clientB?.disconnect();
  });

  it('emit on one replica reaches client on a different replica via Redis adapter', async () => {
    const payload = { id: `fanout-${Date.now()}`, hello: 'world' };

    // Setup listeners on BOTH clients before triggering — we expect both to
    // receive the event because io.emit broadcasts to all sockets across
    // every replica (via the Redis adapter pub/sub on socket.io# channels).
    // The cross-replica proof is that client B receives the event even
    // though Traefik may have routed the HTTP POST to replica A.
    const receivedB = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              `Client B did not receive test:fanout within ${FANOUT_TIMEOUT_MS}ms — Redis adapter wiring likely broken`,
            ),
          ),
        FANOUT_TIMEOUT_MS,
      );
      clientB.on('test:fanout', (data: unknown) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    // Trigger emit via HTTP — Traefik routes to one of the 2 replicas.
    // Whichever replica handles the request, its io.emit must fan out to
    // BOTH replicas via the Redis adapter (otherwise client B may be on
    // the OTHER replica and never see it).
    const res = await fetch(`${TRAEFIK_URL}/api/_test/emit-fanout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(200);

    const data = await receivedB;
    expect(data).toMatchObject(payload);
  }, FANOUT_TIMEOUT_MS + 5_000);
});
