# Screenshot Capture Guide

Capture README screenshots at **1920x1080** with real seeded news data.

## Required screenshots

| Filename | Page | What to capture |
|----------|------|-----------------|
| `dashboard.png` | `/` | Signal feed with article cards, region distribution bar |
| `monitor-globe.png` | `/monitor` | 3D globe / 2D map with severity panel |
| `monitor-events.png` | `/monitor` | Map view with event categories |
| `analysis.png` | `/analysis` | Perspektiven-Analyse: clusters + framing + sentiment chart |
| `timeline.png` | `/timeline` | Event timeline grouped by date |
| `community.png` | `/community` | XP/contribution UI |
| `feed-manager.png` | Any | Feed manager dropdown / region filter open |
| `shortcuts.png` | Any | Keyboard shortcuts modal (`?`) |

## One-shot capture (recommended)

The Playwright spec at `apps/web/e2e/screenshots.spec.ts` writes directly to `docs/screenshots/` and uses the real backend (not the mocks from `e2e/fixtures.ts`).

```bash
# 1. Bring up infra (postgres + redis)
docker compose up -d postgres redis

# 2. Seed mock news/sources so pages render real content (see seed-news.ts)
pnpm seed:news

# 3. Start the dev servers in another shell — both 5173 + 3001 must be up
pnpm dev

# 4. Capture (uses default port 5173)
pnpm --filter @newshub/web screenshots

# Or, if 5173 is already taken and Vite fell back to 5174:
PLAYWRIGHT_TEST_BASE_URL=http://localhost:5174 pnpm --filter @newshub/web screenshots
```

The capture writes 8 PNGs into `docs/screenshots/`, overwriting the existing ones.

## Why the seed step matters

`pnpm seed` only seeds badges and personas. Without `pnpm seed:news`, the `NewsArticle` table is empty and every page that depends on news (dashboard, monitor, event map, timeline, analysis) renders the **empty state** ("0 SIGNALS detected", spinner-only loading screens). That is exactly how earlier README screenshots ended up showing only loaders + the "BACKEND OFFLINE" banner.

`seed-news.ts` is idempotent — re-running upserts the same fixed IDs without duplicating rows.

## Capture tips

- Dark theme is the canonical look — keep it (the spec sets `language: 'de'` and `theme: 'dark'` via `localStorage`).
- 1920×1080 viewport is set inside the spec; do not resize the browser manually.
- The spec waits up to 30s for the first article card and adds page-specific settle timeouts (15s for analysis clustering, 8s for the globe). Each test has a 90s timeout overall.
- The Vite dev server is bound to IPv6 by default. If `curl http://127.0.0.1:5174` refuses but `curl http://localhost:5174` works, that's why.

## Compress before committing

Optional but encouraged — TinyPNG or `pngquant` can drop file sizes 60–80% without visual loss:

```bash
pngquant --skip-if-larger --strip --ext .png --force --quality 65-85 docs/screenshots/*.png
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Every shot shows "BACKEND OFFLINE" | Backend (3001) crashed at startup | `tail -100` on the dev log; common cause is a missing dep — `pnpm install` |
| Dashboard shows "0 SIGNALS detected" | DB has no `NewsArticle` rows | Run `pnpm seed:news` |
| Analysis shows "Fehler beim Laden der Cluster" | AI quota exhausted on the fallback chain | Provide an `OPENROUTER_API_KEY` / `GEMINI_API_KEY` and restart, or accept the partial state |
| `monitor-globe` shows 2D map skeleton | Globe canvas didn't initialize in time | Bump the spec's `waitForTimeout` for `capture monitor globe` |
| Test exits at 30s mid-screenshot | Default test timeout too short | Already set to 90s via `test.setTimeout` |
