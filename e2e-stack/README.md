# e2e-stack — Phase 37 verification harness

This directory hosts the WS-04 verification gate for Phase 37 (Horizontal Scaling).

## What this proves

- **WS-01:** `@socket.io/redis-adapter` (Plan 01) fans events across web replicas
- **WS-02:** Traefik `nh_sticky` cookie pins clients to a single replica per session
- **WS-04:** end-to-end cross-replica delivery — emit on replica A reaches clients on replica B
- **INFRA-02:** load-balancer distribution between replicas
- **INFRA-04:** sticky session contract works under round-robin LB
- **DEPLOY-02:** validates the single-host multi-replica contract end-to-end

Without the Redis adapter (Plan 01), the fanout test fails immediately. The
test is the locked verification gate for INFRA-04 (CONTEXT.md WS-04):

> Verification gate is a docker-compose-based integration test that boots
> >=2 web replicas behind Traefik, connects 2 Socket.IO clients, emits on
> replica A, and asserts the client on replica B receives the event.
> Mocked-adapter unit tests are insufficient.

## How to run

```bash
bash e2e-stack/run-fanout-test.sh
```

or, if added to root `package.json`:

```bash
pnpm test:fanout
```

The script builds the app image, brings up postgres + redis + traefik + 2× app,
waits for `/api/health` to respond through Traefik, runs `ws-fanout.test.ts`
via vitest, and tears down (`down -v --remove-orphans`).

Total time: ~2 minutes on first run (image build), ~30 seconds thereafter.

Exit code 0 = WS-04 cross-replica fanout verified. Non-zero = adapter
wiring is broken (or stack failed to come up — script dumps last 80 lines
of every container's logs on failure).

## Hardware floor

5 containers run concurrently. Minimum: **4 GB RAM, 2 CPU cores**. CI runners
with < 4 GB will OOM during the postgres start phase. The test is gated as a
non-blocking check unless explicitly invoked (it is NOT part of `pnpm test:run`
or the standard CI lane); local dev / release engineers run it via
`bash e2e-stack/run-fanout-test.sh` or `pnpm test:fanout` (T-37-19 mitigation).

## Troubleshooting

### Test fails with "Client B did not receive test:fanout within 5000ms"
- The Redis adapter is not wired. Verify `apps/web/server/services/websocketService.ts`
  has `this.io.adapter(createAdapter(pubClient, subClient))`.
- Both replicas must use the SAME Redis instance. Verify `REDIS_URL` env in
  `e2e-stack/docker-compose.test.yml` (should be `redis://redis:6379` for both
  `app-1` and `app-2`).
- Confirm the `socket.io#` channel namespace is shared: `docker compose -f
  e2e-stack/docker-compose.test.yml exec redis redis-cli MONITOR | grep socket.io`
  should show pub/sub traffic when the test fires.

### Test fails with "connect timeout for A" or "connect_error for B"
- Traefik isn't routing. Check `docker compose -f e2e-stack/docker-compose.test.yml logs traefik`.
- The app build may have failed silently. Check `docker compose -f
  e2e-stack/docker-compose.test.yml logs app-1` and `... app-2`.
- Port 8000 is already in use on the host. `lsof -i :8000` or change the
  `8000:80` mapping in `docker-compose.test.yml`.

### Test passes locally but fails in CI
- CI runner may not support the Docker socket mount Traefik needs
  (`/var/run/docker.sock`). Use rootless Docker or a different CI runner.
- CI runner may have < 4 GB RAM. See hardware floor above.

### Both clients land on the same replica
- Traefik default round-robin combined with `forceNew: true` + a unique
  query string in the test should always distribute across replicas. If
  not, try increasing the post-up `sleep 3` in `run-fanout-test.sh` to 10
  so Traefik fully observes both containers before the test connects.
- Even if clients land on the same replica, the test still passes — but
  that means the test ran a no-op (same-replica fanout works without the
  adapter). Verify by temporarily commenting out
  `this.io.adapter(createAdapter(...))` in `websocketService.ts`, rebuilding,
  and re-running. The test MUST fail when the adapter is removed; if it
  passes, the test isn't exercising cross-replica delivery (see Task 5).

## Production differences

The production stack (`stack.yml`, Plan 04) differs from this test harness:

| Aspect | Production (stack.yml) | Test (this harness) |
|--------|------------------------|---------------------|
| Mode | Docker Swarm | docker compose |
| Label location | `deploy.labels` (Swarm provider) | container `labels` (compose provider) |
| Replicas | 4 web + 1 worker | 2 web (no worker) |
| Sticky cookie | `secure=true` (HTTPS) | `secure=false` (plain HTTP localhost — T-37-18) |
| TLS | yes (production) | no |
| Extra services | PgBouncer, exporter, Prometheus, Grafana, Alertmanager | none |
| Healthcheck path | `/api/ready` (terminus-managed) | `/api/health` (liveness) |
| Stop grace | 35s | none (test uses `down -v` after success) |

## Files

- `docker-compose.test.yml` — minimal multi-replica topology (postgres, redis, traefik, app-1, app-2).
- `ws-fanout.test.ts` — Vitest spec; 2 socket.io clients via Traefik, asserts cross-replica delivery within 5s.
- `run-fanout-test.sh` — orchestrator: build → up → wait → vitest → down.
- `README.md` — this file.

## Test endpoint

The test relies on `POST /api/_test/emit-fanout` (defined in
`apps/web/server/routes/_testEmit.ts`), which is mounted ONLY when
`NODE_ENV === 'test'`. Production deployments never set this env var, so the
endpoint never registers — verified by `grep "NODE_ENV === 'test'"` in
`apps/web/server/index.ts`. The endpoint takes a JSON body and calls
`io.emit('test:fanout', payload)` on the receiving replica.
