---
phase: 35-infrastructure-foundation
plan: 01
subsystem: monorepo
tags: [pnpm, workspace, types, monorepo, code-sharing]
dependency_graph:
  requires: []
  provides:
    - pnpm workspace monorepo structure
    - @newshub/types shared types package
    - workspace protocol dependency resolution
  affects:
    - apps/web (moved from root)
    - package.json (converted to monorepo root)
tech_stack:
  added:
    - pnpm workspaces
  patterns:
    - source-only TypeScript exports (no build step for packages)
    - workspace protocol dependencies (workspace:*)
key_files:
  created:
    - pnpm-workspace.yaml
    - .npmrc
    - tsconfig.base.json
    - apps/web/package.json
    - apps/web/tsconfig.json
    - apps/web/tsconfig.app.json
    - apps/web/tsconfig.node.json
    - packages/types/package.json
    - packages/types/tsconfig.json
    - packages/types/index.ts
  modified:
    - package.json (root)
decisions:
  - "Use pnpm workspaces with apps/* and packages/* layout per D-01"
  - "Source-only exports for packages (no build step) per D-04"
  - "tsconfig.base.json extends pattern for shared TypeScript config"
metrics:
  duration: "11 minutes"
  tasks_completed: 3
  tasks_total: 3
  files_created: 10
  files_modified: 1
  completed: "2026-04-26T08:46:40Z"
---

# Phase 35 Plan 01: Monorepo Workspace Setup Summary

pnpm workspace monorepo with apps/web and packages/types for cross-platform code sharing.

## What Was Built

### Monorepo Structure

Created pnpm workspace configuration with the standard `apps/` + `packages/` layout:

```
newshub/
  pnpm-workspace.yaml     # Workspace config
  .npmrc                  # pnpm settings (auto-install-peers, node-linker=isolated)
  tsconfig.base.json      # Shared TypeScript config
  package.json            # Root (delegates to workspace packages)
  apps/
    web/                  # Existing NewsHub app (moved from root)
  packages/
    types/                # Shared TypeScript types
```

### Shared Types Package

Extracted common types to `@newshub/types` for consumption by web and future mobile app:

- `PerspectiveRegion` - 13 region identifiers
- `Sentiment` - positive/negative/neutral
- `NewsArticle` - full article interface
- `ApiResponse<T>` - generic API response wrapper
- `GeoEvent`, `TimelineEvent` - event interfaces
- `FilterState` - UI filter state

### Workspace Protocol

The web app consumes types via workspace protocol:

```json
{
  "dependencies": {
    "@newshub/types": "workspace:*"
  }
}
```

pnpm resolves this as a symlink to `../../packages/types`, enabling:
- No publish step required for type changes
- Instant updates during development
- TypeScript source-only (no build step)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | e0ea50b | Create monorepo workspace configuration |
| 2 | 4551cd4 | Move existing app to apps/web |
| 3 | d0f01c7 | Extract shared types package |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] pnpm-workspace.yaml defines apps and packages globs
- [x] .npmrc configures auto-install-peers and node-linker=isolated
- [x] apps/web exists with all application code moved from root
- [x] apps/web/package.json declares workspace dependency on @newshub/types
- [x] packages/types exports shared TypeScript types without build step
- [x] pnpm install resolves workspace protocol dependencies
- [x] pnpm --filter @newshub/types typecheck passes

## Self-Check: PASSED

All files verified to exist:
- pnpm-workspace.yaml: FOUND
- .npmrc: FOUND
- tsconfig.base.json: FOUND
- apps/web/package.json: FOUND
- packages/types/index.ts: FOUND

All commits verified:
- e0ea50b: FOUND
- 4551cd4: FOUND
- d0f01c7: FOUND
