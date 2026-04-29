---
title: Rewrite root Dockerfile for pnpm monorepo and re-run WS-04 fanout test
created: 2026-04-29
phase_origin: 37
plan_origin: 37-06
priority: high
type: infrastructure_debt
blocking: WS-04 verification (cross-replica WebSocket fanout via Redis adapter)
---

## Context

Phase 37 plan 37-06 created the cross-replica WebSocket fanout E2E test artifacts in `e2e-stack/` (docker-compose.test.yml, ws-fanout.test.ts, run-fanout-test.sh, NODE_ENV-gated `/api/_test/emit-fanout` endpoint). The test design is correct and the static artifacts are committed.

When the operator ran `bash e2e-stack/run-fanout-test.sh` on 2026-04-29, the Docker build of `e2e-stack-app-1` and `e2e-stack-app-2` failed at the dependency-install stage because the **root `Dockerfile` is incompatible with the current pnpm monorepo layout**:

- Line 12 and line 56 use `npm ci --frozen-lockfile --legacy-peer-deps`
- This repo uses `pnpm-lock.yaml`, not `package-lock.json`
- `stripe@22.1.0` (added in phase 36) is in `pnpm-lock.yaml` but absent from any npm lockfile, so `npm ci` rejects the build with `EUSAGE: Missing: stripe@22.1.0 from lock file`
- The Dockerfile also references `src/generated` and `prisma/` at the repo root, but those paths live under `apps/web/` after the phase-35 monorepo split

The Dockerfile predates the pnpm monorepo migration and would fail any production build attempt — not just the e2e-stack one.

## Required work

1. Rewrite `Dockerfile` to use pnpm with corepack, mirroring the workspace layout:
   - `corepack enable && corepack prepare pnpm@<version> --activate`
   - `pnpm install --frozen-lockfile --filter @newshub/web...`
   - Copy workspace package manifests (`pnpm-workspace.yaml`, root `package.json`, `apps/web/package.json`, `packages/*/package.json`)
   - Update `prisma generate` invocation to run from `apps/web/` (`cd apps/web && pnpm prisma generate`)
   - Update `npm run build` → `pnpm --filter @newshub/web build`
   - Update `dist/server/index.js` path → `apps/web/dist/server/index.js`
   - Update `HEALTHCHECK` to hit `/api/health/db` on `apps/web` server (likely no path change, just confirm)
2. Keep the chromium/puppeteer block intact (used by D-03).
3. Re-run the fanout harness: `bash e2e-stack/run-fanout-test.sh` — expected end: `OK: WS-04 cross-replica fanout verified`
4. Run the optional sanity check from `37-06-SUMMARY.md`: temporarily comment the `createAdapter` line in `apps/web/server/services/websocketService.ts` (~line 158), rebuild, re-run — the test MUST FAIL with `Client B did not receive test:fanout within 5000ms`. Revert and confirm pass.
5. After WS-04 closes, update `phases/37-horizontal-scaling/37-06-SUMMARY.md` from `human-verify pending` to `verified` and re-run phase verification (`/gsd-verify-phase 37`).

## References

- `Dockerfile` (root) — current broken file
- `e2e-stack/docker-compose.test.yml` — references `dockerfile: Dockerfile` (parent context)
- `e2e-stack/README.md` — operator docs
- `.planning/phases/37-horizontal-scaling/37-06-SUMMARY.md` — full plan summary including verification protocol
- `apps/web/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` — current workspace state

## Suggested phase

Recommend `37.1 fix-dockerfile-monorepo` (decimal/polish phase) so the Dockerfile fix lives next to its closing artifact — also unblocks any future production deploy, not just WS-04. Could alternatively be folded into the next infra phase.
