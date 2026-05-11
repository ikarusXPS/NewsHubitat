# Dependabot Vulnerability Audit — 2026-05-11

**Snapshot:** GitHub Dependabot reports **18 open** vulnerabilities on `master` (4 high, 13 medium, 1 low) across **47 total** alerts in the repo's lifetime. 29 were resolved by previous dep bumps (e.g. `02dbc72` cleared 7).

**Repo:** `ikarusXPS/NewsHubitat` · `master` HEAD `f930d49`

All 18 open alerts are **transitive** runtime-scope dependencies. Zero direct dependencies are flagged. The aim of this review is to map each alert to its top-level owner, assess realistic blast radius, and produce a prioritised action plan that the dependabot-PR queue can land safely.

## TL;DR

The 18 alerts collapse to **6 dependency chains** and **5 top-level packages**:

| Chain root (top-level) | Open alerts | Severity mix | Production exposure | Action |
|---|---|---|---|---|
| `vite-plugin-pwa` | 2 | high × 1, high × 1 | **Build-time only** (workbox) | Bump 1.2.0 → **1.3.0** |
| `prisma` / `@prisma/client` | 5 | high × 1, medium × 4 | **Dev-only** (`@prisma/dev` ships Prisma Studio) | Bump 7.7.0 → **7.8.0** |
| `@scalar/api-reference-react` | 8 | medium × 8 (all dompurify) | **Limited** — Scalar `/api-docs` UI only; we control the OpenAPI input | Bump 0.9.27 → **0.9.34** |
| `puppeteer` + `puppeteer-extra-plugin-adblocker` | 2 | high × 1, medium × 1 | **Unreachable** — basic-ftp + SOCKS code paths NewsHub never exercises | Bump 24.38.0 → **24.43.1** |
| `prisma` (hono via `@hono/node-server`) | 1 (low) | low × 1 | **Dev-only** | Lifts with prisma bump |

**Nothing on this list is a live production exposure today.** Three categories (build-time, dev-only, unreachable code path) cover all 18 alerts. The realistic worst-case is the 8 dompurify advisories chain through Scalar's `/api-docs` page, but that page renders an OpenAPI spec we control end-to-end — there is no untrusted-markdown surface to attack with mutation XSS.

That said, all 18 are easy wins. The recommended action plan below clears every alert with **4 root-level version bumps** — no architectural changes, no breaking changes.

## Open alerts (full list)

| # | Severity | Package | GHSA | Patched in | Top-level owner |
|---|---|---|---|---|---|
| 47 | high | `@babel/plugin-transform-modules-systemjs` | [GHSA-fv7c-fp4j-7gwp](https://github.com/babel/babel/security/advisories/GHSA-fv7c-fp4j-7gwp) | 7.29.4 | `vite-plugin-pwa` → workbox-build |
| 45 | high | `fast-uri` | [GHSA-v39h-62p7-jpjc](https://github.com/advisories/GHSA-v39h-62p7-jpjc) | 3.1.2 | `vite-plugin-pwa` + `prisma` |
| 43 | medium | `hono` | [GHSA-qp7p-654g-cw7p](https://github.com/advisories/GHSA-qp7p-654g-cw7p) | 4.12.18 | `prisma` (dev) |
| 41 | low | `hono` | [GHSA-hm8q-7f3q-5f36](https://github.com/advisories/GHSA-hm8q-7f3q-5f36) | 4.12.18 | `prisma` (dev) |
| 39 | high | `fast-uri` | [GHSA-q3j6-qgpj-74h6](https://github.com/advisories/GHSA-q3j6-qgpj-74h6) | 3.1.1 | `vite-plugin-pwa` + `prisma` |
| 37 | medium | `hono` | [GHSA-p77w-8qqv-26rm](https://github.com/advisories/GHSA-p77w-8qqv-26rm) | 4.12.18 | `prisma` (dev) |
| 35 | medium | `hono` | [GHSA-69xw-7hcm-h432](https://github.com/advisories/GHSA-69xw-7hcm-h432) | 4.12.16 | `prisma` (dev) |
| 33 | medium | `hono` | [GHSA-9vqf-7f2p-gf9v](https://github.com/advisories/GHSA-9vqf-7f2p-gf9v) | 4.12.16 | `prisma` (dev) |
| 31 | high | `basic-ftp` | [GHSA-rpmf-866q-6p89](https://github.com/advisories/GHSA-rpmf-866q-6p89) | 5.3.1 | `puppeteer` → proxy-agent → get-uri |
| 29 | medium | `ip-address` | [GHSA-v2v4-37r5-5v8g](https://github.com/advisories/GHSA-v2v4-37r5-5v8g) | 10.1.1 | `puppeteer` → socks-proxy-agent |
| 13 | medium | `dompurify` | [GHSA-h7mw-gpvr-xq4m](https://github.com/advisories/GHSA-h7mw-gpvr-xq4m) | 3.4.0 | `@scalar/api-reference-react` → monaco-editor |
| 12 | medium | `dompurify` | [GHSA-crv5-9vww-q3g8](https://github.com/advisories/GHSA-crv5-9vww-q3g8) | 3.4.0 | (same chain) |
| 11 | medium | `dompurify` | [GHSA-v9jr-rg53-9pgp](https://github.com/advisories/GHSA-v9jr-rg53-9pgp) | 3.4.0 | (same chain) |
| 10 | medium | `dompurify` | [GHSA-39q2-94rc-95cp](https://github.com/advisories/GHSA-39q2-94rc-95cp) | 3.4.0 | (same chain) |
| 9 | medium | `dompurify` | [GHSA-cjmm-f4jc-qw8r](https://github.com/advisories/GHSA-cjmm-f4jc-qw8r) | 3.3.2 | (same chain) |
| 8 | medium | `dompurify` | [GHSA-cj63-jhhr-wcxv](https://github.com/advisories/GHSA-cj63-jhhr-wcxv) | 3.3.2 | (same chain) |
| 7 | medium | `dompurify` | [GHSA-h8r8-wccr-v5f2](https://github.com/advisories/GHSA-h8r8-wccr-v5f2) | 3.3.2 | (same chain) |
| 6 | medium | `dompurify` | [GHSA-v2wj-7wpq-c8vv](https://github.com/advisories/GHSA-v2wj-7wpq-c8vv) | 3.3.2 | (same chain) |

## Per-chain analysis

### 1. `vite-plugin-pwa` → workbox → `@babel/preset-env` → `@babel/plugin-transform-modules-systemjs` (#47)

CVE-2026-44728 lets a malicious **source code input** make Babel emit arbitrary JavaScript. `@babel/plugin-transform-modules-systemjs` runs at PWA service-worker build time when Vite + workbox transpile precache manifests.

**Why this isn't a live exposure:** Babel only sees source files in our own repo. An attacker would need to commit malicious source code to the repo, at which point they could simply commit a backdoor directly — Babel doesn't widen their reach.

**Fix:** `vite-plugin-pwa` 1.3.0 (released after the workbox-build version that ships the patched Babel preset) lifts this transitively.

### 2. `vite-plugin-pwa` + `prisma` → `ajv` → `fast-uri` (#45, #39)

Two distinct fast-uri CVEs — host confusion via percent-encoded authority delimiters (#45) and path traversal via percent-encoded dot segments (#39). Both run inside Ajv's URI validation when JSON-schema validators process untrusted URIs.

**Why this isn't a live exposure:** Both consumer paths are **build-time / dev-time**:
- workbox-build's apideck/better-ajv-errors runs during the PWA build
- `@prisma/streams-local` is part of `@prisma/dev` (Prisma Studio runtime), used only when running `npx prisma studio` locally

NewsHub's production runtime uses `@prisma/client` directly with the pg adapter; Studio is not deployed.

**Fix:** Lifts via `vite-plugin-pwa@1.3.0` and `prisma@7.8.0` bumps. Both top-level packages are minor-version-pinned (`^`) so dependabot's PR will land cleanly.

### 3. `prisma` (dev) → `@prisma/dev` → `@hono/node-server` → `hono` (#43, #41, #37, #35, #33)

5 hono CVEs ranging from CSS injection in JSX SSR (#43) to body-limit bypass on chunked requests (#33) to JWT NumericDate validation (#41 low).

**Why this isn't a live exposure:** `@prisma/dev` is the runtime for Prisma Studio (the dev DB browser). NewsHub never imports hono — neither the Express backend nor the React frontend depend on it. Studio is dev-tool-only and is never present in the production build.

**Fix:** `prisma@7.8.0` brings a newer `@prisma/dev` that pins a patched hono. Verify with `pnpm why hono` after bump.

### 4. `puppeteer` → proxy-agent → `basic-ftp` (#31), `puppeteer` → socks-proxy-agent → `ip-address` (#29)

#31 (high): malicious FTP server can DoS the FTP client via unbounded multiline buffering. `basic-ftp` is loaded by puppeteer's proxy-agent for URI parsing.
#29 (medium): `ip-address` Address6 HTML-emitting method has XSS — reachable only if someone passes IPv6 strings to those rendering methods.

**Why this isn't a live exposure:**
- NewsHub uses puppeteer for stealth RSS scraping in `apps/web/server/services/stealthScraper.ts`. Targets are HTTP/HTTPS news sites. There is no FTP target in `apps/web/server/config/sources.ts`, and `basic-ftp` is only invoked when an FTP URL is encountered.
- The SOCKS proxy code path is reached only when `proxy-agent` is configured with `socks://` proxies. NewsHub doesn't configure proxies at all.

**Fix:** `puppeteer@24.43.1` ships a newer `@puppeteer/browsers` that pins patched versions of both chains.

### 5. `@scalar/api-reference-react` → monaco-editor → `dompurify` (#6 through #13)

8 dompurify CVEs spanning mutation-XSS, prototype-pollution-to-XSS, SAFE_FOR_TEMPLATES bypass, FORBID_TAGS bypass, and a CUSTOM_ELEMENT_HANDLING prototype pollution. These all matter when dompurify sanitises **untrusted HTML/markdown**.

monaco-editor (the code editor inside Scalar's API playground) uses dompurify to render OpenAPI descriptions, markdown bodies, and example payloads.

**Why this is the closest thing to a real risk:** Scalar renders the `apps/web/public/openapi.json` spec at `/api-docs`. Anything an attacker can inject into that spec ends up flowing through dompurify. The spec is **generated from server-side Zod schemas** by `apps/web/server/openapi/generator.ts` — we own every byte of input. An attacker would need to commit a malicious openapi.json (or modify generator.ts) to reach this code path, both of which are direct-source attacks like #1.

**Fix:** `@scalar/api-reference-react@0.9.34` brings monaco-editor 0.55.x with patched dompurify 3.4.0. Six of the eight CVEs (those patched in 3.3.2) were already mitigable in older Scalar builds; the four patched in 3.4.0 (#10-#13) need the latest monaco.

## Recommended action plan

### Phase 1 — automated lift (lands in one PR)

Bump these 4 top-level packages. All are minor-version bumps — semver-safe, no breaking changes documented in their changelogs:

```
apps/web/package.json:
- "vite-plugin-pwa": "^1.2.0"            →  "^1.3.0"
- "prisma": "^7.7.0"                      →  "^7.8.0"
- "@prisma/client": "^7.7.0"              →  "^7.8.0"
- "@scalar/api-reference-react": "^0.9.27" →  "^0.9.34"
- "puppeteer": "^24.38.0"                 →  "^24.43.1"
```

Then `pnpm install --filter @newshub/web` to refresh `pnpm-lock.yaml`, and verify each chain with `pnpm why <pkg>` returns a patched version:

```
pnpm why @babel/plugin-transform-modules-systemjs  →  expect >= 7.29.4
pnpm why fast-uri                                  →  expect >= 3.1.2
pnpm why hono                                      →  expect >= 4.12.18
pnpm why basic-ftp                                 →  expect >= 5.3.1
pnpm why ip-address                                →  expect >= 10.1.1
pnpm why dompurify                                 →  expect >= 3.4.0
```

CI gates this commit naturally — Unit Tests, Type Check, E2E, Build Docker Image all run.

### Phase 2 — confirm via dependabot UI

After Phase 1 lands, dependabot's nightly scan should mark all 18 open alerts as `fixed`. Visit https://github.com/ikarusXPS/NewsHubitat/security/dependabot and verify the count drops from 18 → 0 (or close to it). Any residual alerts indicate transitive paths the minor-bumps didn't reach — file a follow-up todo per chain.

### Phase 3 — re-enable strict gating (optional, future)

Once at 0 open alerts, consider tightening the dependabot config:
- `dependabot.yml` currently groups dev minor+patch and pins major bumps for `prisma`, `react`, `express`, `stripe`, `socket.io`. The pinned-major list keeps milestone-defining packages from auto-bumping into breaking changes — sensible to keep.
- Optional ratchet: add `severity-threshold: high` notifications so high alerts page someone faster than weekly review.

## Decision log entry

This audit lands as part of the v1.6 milestone wrap-up. The 4-bump plan can be executed by:

1. The next dependabot weekly batch (Monday 06:00 Europe/Berlin), which should propose 4 separate PRs to bump prisma + scalar + vite-plugin-pwa + puppeteer
2. A single manual bump commit (~10 min: edit package.json + pnpm install + run tests)

Either path closes all 18 open alerts.

## Provenance

Generated by reviewing the raw Dependabot API output at `.planning/tmp/dependabot.json` (`gh api repos/ikarusXPS/NewsHubitat/dependabot/alerts --paginate`) on 2026-05-11. Dependency chain analysis via `pnpm why <pkg>`.

See also:
- `.github/dependabot.yml` — weekly Monday 06:00 Europe/Berlin schedule; grouped minor+patch; majors pinned for `prisma`, `react`, `express`, `stripe`, `socket.io`
- `.github/SECURITY.md` — disclosure SLAs (3d ack / 14d assessment / 90d disclosure); reports route to GitHub Security Advisories
- Recent dep-bump commit `02dbc72` (2026-05-11) cleared 7 prior Dependabot alerts (axios + @anthropic-ai/sdk)
