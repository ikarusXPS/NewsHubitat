# Deferred Items — Phase 36.2

Items discovered during execution that are out of scope for this phase but should
be tracked for future work.

## Build / Tooling

### `pnpm build` fails on pre-existing PWA workbox precache size limit

**Discovered during:** Plan 36.2-03 Task 2 verification (`pnpm build`)

**Status:** Pre-existing — confirmed by reverting all plan-03 changes and reproducing the same failure on the unmodified tree at commit `556694f`.

**Failure:**

```
Configure "workbox.maximumFileSizeToCacheInBytes" to change the limit:
  the default value is 2 MiB.
Assets exceeding the limit:
  - stats.html is 4.3 MB, and won't be precached.
```

**Root cause:** `rollup-plugin-visualizer` emits `dist/stats.html` (~4.3 MB),
which `vite-plugin-pwa` then refuses to precache because workbox's default
`maximumFileSizeToCacheInBytes` is 2 MiB. The build fails closed.

**Why deferred:** Out of scope for Plan 36.2-03 (which scoped to schema cutover
+ stripe.ts re-export). Pre-existing — predates this plan, persists when this
plan's stripe.ts edit is reverted. Likely surfaced when bundle size grew past
2 MiB sometime after the visualizer plugin was added. `pnpm typecheck` and
`pnpm test:run` (the plan's own verification gates) both pass cleanly.

**Suggested fix (for a future small plan):** Either
1. Set `workbox.maximumFileSizeToCacheInBytes: 5_000_000` in
   `apps/web/vite.config.ts` PWA plugin options, OR
2. Add `globIgnores: ['**/stats.html']` to the workbox config so the
   visualizer's debug artifact is not considered a precache asset, OR
3. Move the visualizer output outside `dist/` (e.g., `dist-stats/`) so it
   never enters the workbox manifest scan.

Option 2 is the cleanest — `stats.html` is a developer-only debug file, never
served to clients, and should not be precached by any service worker.

**Acceptance for closure:** `pnpm build` exits 0 from a clean checkout.
