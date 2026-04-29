#!/usr/bin/env bash
# Phase 37 / WS-04 verification — runs the cross-replica fanout test
# Usage: bash e2e-stack/run-fanout-test.sh
#
# Orchestrates: docker compose build -> up -> wait for /api/health ->
# vitest run -> docker compose down -v.
#
# This is the locked verification gate for INFRA-04 (CONTEXT.md):
# mocked-adapter unit tests are insufficient — must be a real
# Docker-orchestrated test against >= 2 web replicas behind Traefik.
set -euo pipefail

# Resolve repo root regardless of where the script is invoked from.
cd "$(dirname "$0")/.."

COMPOSE_FILE="e2e-stack/docker-compose.test.yml"

cleanup() {
  echo "==> Tearing down test stack"
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans || true
}
trap cleanup EXIT

echo "==> Building app image (this can take a few minutes on first run)"
docker compose -f "$COMPOSE_FILE" build

echo "==> Starting test stack (postgres + redis + traefik + 2x app)"
docker compose -f "$COMPOSE_FILE" up -d

# Wait for Traefik to publish the routes and at least one app replica to be
# ready. /api/health is the simple liveness aggregate (Plan 05 / DEPLOY-04);
# /api/ready is also valid but liveness is fine for "stack is up" probing.
echo "==> Waiting for app readiness via Traefik (max 90s)"
for i in $(seq 1 90); do
  if curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "    ready after ${i}s"
    break
  fi
  if [ "$i" = "90" ]; then
    echo "FAIL: app did not become ready within 90s"
    docker compose -f "$COMPOSE_FILE" logs --tail=80
    exit 1
  fi
  sleep 1
done

# Give Traefik a couple more seconds to settle round-robin pinning between
# the 2 app containers — without this, both clients can land on the same
# replica during a cold start and the test passes without exercising the
# adapter.
sleep 3

echo "==> Running ws-fanout vitest spec"
# Run vitest from inside apps/web/ so 'vitest/config' and other imports
# in vitest.config.ts resolve via apps/web's node_modules (workspace
# root has no vitest of its own — pnpm hoisting in this monorepo
# leaves vitest scoped to the workspace package that depends on it).
#
# We pass --config explicitly to use e2e-stack/vitest.config.ts (a
# minimal node-environment config) instead of apps/web/vitest.config.ts
# (which uses jsdom + DB mocks and would break the real-stack test).
#
# Use absolute paths because vitest resolves --config relative to --root,
# which would otherwise compound to a wrong path on Windows / Git Bash.
REPO_ROOT="$(pwd)"
set +e
(
  cd apps/web && \
  WS_FANOUT_URL=http://localhost:8000 \
  node node_modules/vitest/dist/cli.js \
    run \
    --config "$REPO_ROOT/e2e-stack/vitest.config.ts" \
    --root "$REPO_ROOT/apps/web" \
    "$REPO_ROOT/e2e-stack/ws-fanout.test.ts" \
    --no-coverage \
    --reporter=verbose
)
TEST_EXIT=$?
set -e

if [ $TEST_EXIT -ne 0 ]; then
  echo "FAIL: ws-fanout test exited $TEST_EXIT"
  echo "==> Container logs (last 80 lines per service)"
  docker compose -f "$COMPOSE_FILE" logs --tail=80
  exit $TEST_EXIT
fi

echo "OK: WS-04 cross-replica fanout verified"
