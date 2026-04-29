# Deferred Items — Phase 37

> Out-of-scope discoveries logged during plan execution. Not fixed by the
> originating plan; tracked for follow-up.

## Plan 37-01 (executor agent-a94da8ebbc6f0cf1d)

### Pre-existing test failure: `apps/web/src/lib/formatters.test.ts`

- **Symptom:** Vitest fails to parse the file with
  `Failed to resolve import "date-fns" from "src/lib/formatters.ts"`
  during `pnpm test:run` from inside a worktree (`D:\NewsHub\.claude\worktrees\<id>`).
- **Root cause (suspected):** Vite import-analysis runs from a path that does
  not see the worktree's nested `apps/web/node_modules/date-fns`. The package
  is correctly installed (`apps/web/node_modules/date-fns` exists), but Vite
  resolves against the worktree-root `D--NewsHub` namespace.
- **Pre-existing status:** Confirmed via `git log` — the file was last touched
  in commit `4551cd4 feat(35-01): move existing app to apps/web`, well before
  Phase 37. Not introduced by Plan 37-01.
- **Out of scope:** Plan 37-01 only touches Socket.IO adapter wiring; this
  failure is unrelated to that surface.
- **Action:** Track for the orchestrator to decide whether to address as part
  of phase verification, or defer to a follow-up infrastructure plan.
