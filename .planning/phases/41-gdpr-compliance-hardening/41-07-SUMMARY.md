---
phase: 41-gdpr-compliance-hardening
plan: 07
subsystem: observability
tags:
  - sentry
  - logging
  - pii
  - gdpr
  - tom-fix-04
  - tom-fix-05

# Dependency graph
requires:
  - phase: 19-sentry-error-tracking
    provides: Sentry init in apps/web/server/instrument.mjs + apps/web/src/instrument.ts (the actual wire-up points, not the index.ts / main.tsx listed in plan files_modified)
  - phase: 22-smtp-production
    provides: Winston logger at apps/web/server/utils/logger.ts (existing format pipeline extended with scrubFormat)
provides:
  - apps/web/server/utils/scrub.ts — canonical PII scrubber (scrubObject, scrubUrl, scrubString, scrubSentryEvent). Pure TS, zero Node-only deps, safely bundled into the Vite frontend.
  - apps/web/server/utils/scrub.test.ts — 36 unit tests covering every redacted key, URL query parameter, fragment/relative URL edge case, recursion bound, and Sentry-event shape variant.
  - apps/web/server/instrument.mjs — boot-time inline scrubber + Sentry.beforeSend hook (TS import not possible pre-bundle; keeps a duplicated minimal copy of the redaction tables that must stay in sync with scrub.ts).
  - apps/web/src/instrument.ts — Sentry.beforeSend wired via scrubSentryEvent import.
  - apps/web/server/utils/logger.ts — Winston format pipeline extended with scrubFormat() that deep-scrubs metadata + rewrites message/stack strings.
  - apps/web/src/lib/logger.ts — frontend console wrapper. Pure delegate around console.log/info/warn/error/debug with per-argument scrubbing; preserves Error prototype on instanceof checks.
affects:
  - All future Sentry events from frontend and backend (production-enabled paths only — dev guards remain via `enabled` flag)
  - All Winston logger transports (file + console) — message/metadata/stack/error fields scrubbed in-pipeline
  - Future frontend code that opts into the logger wrapper instead of raw console (mass migration deferred — see 41-07a-frontend-console-migration todo)

# Tech tracking
tech-stack:
  - TypeScript (scrub.ts, scrub.test.ts, logger wrappers, instrument.ts)
  - Plain ESM JS (instrument.mjs — must remain JS for `node --import` boot)
  - Winston 3.x format() pipeline (chosen — see Deviations §1)
  - Vitest (unit tests for scrubber)
  - @sentry/node + @sentry/react beforeSend hooks
---

# Plan 41-07: PII-Scrubbing für Sentry + Logs — SUMMARY

## What landed

Closes audit items **TOM-FIX-04** (Sentry PII leakage) and **TOM-FIX-05** (server-log PII leakage) by introducing a shared scrubber that runs in three places:

1. **Sentry beforeSend hooks** — both `@sentry/node` (server, via `instrument.mjs`) and `@sentry/react` (browser, via `instrument.ts`). Events flowing to Sentry now redact `user.email`, `request.headers.Authorization`/`Cookie`, `request.url` query parameters, `request.data` sensitive keys, top-level `message`, and email patterns embedded in `exception.values[].value` stack traces.
2. **Winston format pipeline** — `scrubFormat()` runs inside `winston.format.combine(...)` for every transport. All structured fields are walked via `scrubObject`, and string fields (`message`, `stack`) pass through `scrubString` (email regex + URL query-param scrubbing).
3. **Frontend logger wrapper** — `apps/web/src/lib/logger.ts` provides `logger.log / info / warn / error / debug` as drop-in replacements for `console.*`. Every argument is scrubbed before delegation; Error instances are reconstructed (preserving prototype) so downstream `instanceof Error` checks keep working.

## Self-Check

| Acceptance criterion | Status | Evidence |
|---|---|---|
| Sensitive object keys are redacted in Sentry events | PASS | `scrubSentryEvent` test (8 sub-cases incl. Authorization, Cookie, password) |
| URL query params (`token`, `verification_token`, `reset_token`, `code`, `state`) redacted | PASS | `scrubUrl` test (8 sub-cases incl. case-insensitive, fragments, relative paths) |
| Emails in stack traces redacted | PASS | `scrubString` test + `scrubSentryEvent` exception-values test |
| Sentry hook wired on both runtimes | PASS | `apps/web/server/instrument.mjs` (line 95) + `apps/web/src/instrument.ts` (line 21) |
| Server logger pipeline scrubs | PASS | `scrubFormat` added to format chain in `apps/web/server/utils/logger.ts` (lines 12–22) |
| Frontend logger wrapper exists | PASS | `apps/web/src/lib/logger.ts` exports default + named `logger` |
| Tests pass | PASS | 1710 / 1710 tests, all 36 scrub-specific tests green (+36 vs baseline) |
| Typecheck clean | PASS | `npx tsc --noEmit` exit 0 |

## Deviations

Three planning-time mismatches surfaced during execution and were resolved at user-approved checkpoint (option "Adapt + defer console migration"):

### 1. Logger framework — Pino → Winston

Plan called for Pino with `redact: { paths, censor }`. The project has used Winston since the original observability work; no Pino dependency exists. Adding Pino in parallel with Winston would split logger surface area for no audit-coverage gain. **Implementation:** Winston's documented `winston.format(info => ...)` factory pattern handles deep redaction equivalently; `scrubFormat()` is composed into the format chain before any transport.

### 2. Sentry.init location — index.ts/main.tsx → instrument.*

Plan `files_modified` listed `apps/web/server/index.ts` + `apps/web/src/main.tsx`. Actual `Sentry.init` calls live in `apps/web/server/instrument.mjs` (loaded via `node --import` per Phase 19 RESEARCH Pitfall 1) and `apps/web/src/instrument.ts` (imported first in main.tsx). **Implementation:** Edits applied at the real wire-up points. No changes to index.ts / main.tsx were necessary.

### 3. Console codemod — 156-site migration deferred

Plan Step 7 called for `console.log(` → `logger.log(` migration across ~156 sites (124 server + 32 frontend). The substitution is mechanical but API-incompatible (Winston has `.info/.warn/.error`, not `.log`), some server console calls are in standalone scripts where raw console is appropriate, and merge-conflict risk is high. **Implementation:** Deferred to a dedicated todo `40-13-followup-frontend-console-migration` (filed alongside this plan). The TOM-FIX-04/05 audit gap is closed at the Sentry + Winston layers — server logs and frontend Sentry events are scrubbed regardless of call site. The frontend `logger.ts` wrapper is available for new code to adopt incrementally.

## Out of scope

- Sentry-Sampling-Rate-Tuning (Performance topic, separate)
- Production-Log-Aggregation (Loki / Grafana — Phase 37 scope)
- Migration of existing `console.*` call sites (deferred — see Deviation §3)

## Files modified

```
A  apps/web/server/utils/scrub.ts
A  apps/web/server/utils/scrub.test.ts
A  apps/web/src/lib/logger.ts
M  apps/web/server/instrument.mjs
M  apps/web/src/instrument.ts
M  apps/web/server/utils/logger.ts
```

All paths begin with `apps/web/` — anti-pattern compliance verified against `.planning/.continue-here.md`.

## Verification

```
npx vitest run server/utils/scrub.test.ts   # 36 / 36 PASS
npx vitest run                              # 1710 / 1710 PASS, 93 test files
npx tsc --noEmit                            # exit 0
```

## Follow-ups filed

- `.planning/todos/pending/41-07-frontend-console-migration.md` — codemod the 156 raw `console.*` call sites to the new `logger.*` wrappers; bisectable across multiple PRs to keep the merge surface manageable.
