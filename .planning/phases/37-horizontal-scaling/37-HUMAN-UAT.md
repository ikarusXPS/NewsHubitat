---
status: partial
phase: 37-horizontal-scaling
source: [37-VERIFICATION.md]
started: 2026-04-29
updated: 2026-04-29
---

## Current Test

[awaiting human testing on a Docker Swarm host]

## Tests

### 1. WS-04 cross-replica fanout (BLOCKED — deferred to 37.1)
expected: `bash e2e-stack/run-fanout-test.sh` exits 0 with end line "OK: WS-04 cross-replica fanout verified"
result: pending — Dockerfile rewrite required first
blocker: see .planning/todos/pending/37-06-fanout-test-dockerfile-rewrite.md
proof_optional: comment out the createAdapter line in apps/web/server/services/websocketService.ts:158, rebuild, re-run — test MUST FAIL with "Client B did not receive test:fanout within 5000ms". Revert and confirm pass. This proves the test exercises the adapter, not just the harness.

### 2. Grafana dashboard population under load
expected: After deploying the Swarm stack and running `pnpm load:smoke`, Grafana dashboards (localhost:3000) show:
  - `prisma_pool_total`, `prisma_pool_idle`, `prisma_pool_waiting` gauges populated per replica
  - `pgbouncer_pools_*` metrics from edoburu/pgbouncer scrape
  - WS connection count stable per replica (sticky-session evidence)
result: pending — requires Swarm runtime
verification_steps: |
  1. docker swarm init (if not already initialized)
  2. docker stack deploy -c stack.yml newshub
  3. Wait ~60s for healthchecks to pass
  4. pnpm load:smoke
  5. Open http://localhost:3000 (Grafana, admin/admin), confirm metrics flowing
  6. Confirm PgBouncerPoolSaturation and PrismaPoolSaturation alert rules are in alertmanager (not firing)

### 3. Rolling update drain behavior
expected: `docker service update --image newshub:next newshub_app` rolls replicas one at a time without dropping in-flight requests; `/api/ready` returns 503 during drain while `/api/health` continues 200
result: pending — requires Swarm runtime
verification_steps: |
  1. With stack deployed, start a continuous load:
     while true; do curl -s -o /dev/null -w "%{http_code} " http://localhost:8000/api/news?limit=1; sleep 0.1; done
  2. In another shell: docker service update --force newshub_app
  3. Confirm: zero non-2xx responses during the rolling update
  4. During the update, on a draining replica, curl -s http://localhost:3001/api/ready returns 503; curl -s http://localhost:3001/api/health returns 200

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 1

## Gaps

(none — all 5 ROADMAP success criteria SATISFIED statically; pending items are runtime-only checks that require deploy + load)
