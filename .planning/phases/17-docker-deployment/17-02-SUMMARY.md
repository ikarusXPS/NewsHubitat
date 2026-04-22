---
plan: 17-02
phase: 17-docker-deployment
status: complete
started: 2026-04-23T22:25:00Z
completed: 2026-04-23T22:30:00Z
---

# Summary: Build Scripts & Static Serving

## What Was Built

Updated build scripts for separate frontend/server builds and added production static file serving to Express server for single-container deployment.

## Key Files

### Modified
- `package.json` - Added build:frontend, build:server scripts; installed react-is
- `server/index.ts` - Added production static file serving with SPA fallback

## Implementation Details

### package.json Scripts
```json
"build": "npm run build:frontend && npm run build:server",
"build:frontend": "vite build",
"build:server": "tsup"
```

### server/index.ts Static Serving
- Added `path` and `fileURLToPath` imports for ESM __dirname
- Static path resolves to `dist/` (one level up from `dist/server/index.js`)
- `express.static` with `maxAge: '7d'` for cache control
- Catch-all `*` route serves `index.html` for non-API routes
- Only active when `NODE_ENV === 'production'`

### Build Output
```
dist/
  index.html           # Vite frontend entry
  assets/              # Vite chunks (JS, CSS)
  sw.js                # PWA service worker
  server/
    index.js           # tsup server bundle (424 KB)
    index.js.map       # Source map
```

## Decisions

- D-07: Production static serving in Express
- D-16: Simple `node dist/server/index.js` execution
- Added `react-is` dependency to fix recharts build issue

## Commits

- `4e49026` - feat(17-02): add build scripts and production static serving

## Self-Check

- [x] package.json contains `build:frontend` and `build:server` scripts
- [x] package.json contains combined `build` script
- [x] server/index.ts imports `path` and `fileURLToPath`
- [x] server/index.ts contains `if (process.env.NODE_ENV === 'production')`
- [x] server/index.ts contains `express.static` with `maxAge: '7d'`
- [x] server/index.ts contains SPA fallback with `sendFile`
- [x] `npm run build` produces dist/index.html
- [x] `npm run build` produces dist/server/index.js
- [x] dist/assets/ directory exists with JS chunks

## Self-Check: PASSED
