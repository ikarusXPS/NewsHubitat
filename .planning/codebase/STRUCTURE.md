# Codebase Structure

**Analysis Date:** 2026-04-18

## Directory Layout

```
NewsHub/
├── .claude/                    # Claude Code configuration
├── .planning/                  # GSD planning documents
│   └── codebase/               # Codebase analysis (this file)
├── e2e/                        # Playwright E2E tests
├── prisma/                     # Database schema and config
├── public/                     # Static assets (favicon, etc.)
├── scripts/                    # Utility scripts
├── server/                     # Backend Express server
│   ├── config/                 # Source configs, AI provider settings
│   ├── data/                   # Static data (historical events)
│   ├── db/                     # Prisma client setup
│   ├── routes/                 # Express route handlers
│   ├── services/               # Business logic services
│   ├── utils/                  # Backend utilities
│   └── index.ts                # Server entry point
├── src/                        # Frontend React app
│   ├── components/             # React components
│   │   ├── community/          # Community feature components
│   │   ├── feed-manager/       # Feed management components
│   │   └── monitor/            # Monitor page components
│   ├── config/                 # Frontend config (presets, mock data)
│   ├── contexts/               # React contexts (Auth)
│   ├── generated/              # Prisma generated client (DO NOT EDIT)
│   │   └── prisma/             # Generated Prisma types
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility functions
│   ├── pages/                  # Route page components
│   ├── services/               # Frontend services (cache)
│   ├── store/                  # Zustand store
│   ├── test/                   # Test utilities and factories
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Frontend utilities
│   ├── App.tsx                 # Root component with routing
│   ├── main.tsx                # React entry point
│   └── index.css               # Global styles (Tailwind)
├── dev.db                      # SQLite database file
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config (root)
├── vite.config.ts              # Vite bundler config
└── vitest.config.ts            # Vitest test config
```

## Directory Purposes

**`server/`:**
- Purpose: All backend code - Express server, API routes, services
- Contains: TypeScript files, compiled to `dist/server/` on build
- Key files: `index.ts` (entry), `routes/*.ts` (endpoints), `services/*.ts` (business logic)

**`server/config/`:**
- Purpose: Backend configuration constants
- Contains: `sources.ts` (130 news sources), `aiProviders.ts` (AI model configs)
- Key files: `sources.ts` for adding new news sources

**`server/routes/`:**
- Purpose: Express Router handlers grouped by domain
- Contains: `news.ts`, `auth.ts`, `events.ts`, `analysis.ts`, `ai.ts`, `translation.ts`, etc.
- Key files: Each file exports a Router mounted at `/api/{name}`

**`server/services/`:**
- Purpose: Singleton service classes with business logic
- Contains: `newsAggregator.ts`, `aiService.ts`, `translationService.ts`, `cacheService.ts`, etc.
- Key files: All use `getInstance()` pattern for singleton access

**`src/components/`:**
- Purpose: Reusable React components
- Contains: UI components, feature components, layout components
- Key files: `NewsFeed.tsx`, `SignalCard.tsx`, `Layout.tsx`, `Header.tsx`, `Sidebar.tsx`

**`src/pages/`:**
- Purpose: Route-level page components (one per route)
- Contains: `Dashboard.tsx`, `Monitor.tsx`, `Analysis.tsx`, `Timeline.tsx`, `EventMap.tsx`, etc.
- Key files: Each maps to a React Router `<Route>` in `App.tsx`

**`src/store/`:**
- Purpose: Zustand global state store
- Contains: Single `index.ts` with all state slices
- Key files: `index.ts` exports `useAppStore()` hook

**`src/hooks/`:**
- Purpose: Custom React hooks
- Contains: `useCachedQuery.ts`, `useBackendStatus.ts`, `useKeyboardShortcuts.ts`, `useMapCenter.ts`
- Key files: `useCachedQuery.ts` for offline-capable data fetching

**`src/types/`:**
- Purpose: TypeScript type definitions shared across frontend
- Contains: `index.ts` (core types), `focus.ts`, `feeds.ts`
- Key files: `index.ts` defines NewsArticle, NewsSource, ApiResponse, etc.

**`prisma/`:**
- Purpose: Database schema and Prisma configuration
- Contains: `schema.prisma` (models), migrations (if used)
- Key files: `schema.prisma` for database model definitions

**`e2e/`:**
- Purpose: Playwright end-to-end tests
- Contains: `*.spec.ts` files for each test suite
- Key files: `auth.spec.ts`, `monitor.spec.ts`, `navigation.spec.ts`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React application entry (renders to `#root`)
- `server/index.ts`: Express server entry (starts HTTP + WebSocket)
- `index.html`: HTML shell for Vite/React

**Configuration:**
- `package.json`: Scripts, dependencies, Node/pnpm config
- `vite.config.ts`: Vite bundler, proxy, PWA config
- `tsconfig.json`: TypeScript root config (references app/node)
- `vitest.config.ts`: Unit test runner config
- `playwright.config.ts`: E2E test config
- `eslint.config.js`: Linting rules

**Core Logic:**
- `server/services/newsAggregator.ts`: RSS fetching, deduplication, article storage
- `server/services/aiService.ts`: Multi-provider AI with fallback chain
- `server/services/translationService.ts`: Multi-provider translation
- `src/store/index.ts`: All client-side state management
- `src/App.tsx`: Routing, providers, layout structure

**Testing:**
- `src/test/setup.ts`: Vitest DOM setup
- `src/test/factories.ts`: Test data factories
- `src/test/testUtils.tsx`: Test rendering utilities

## Naming Conventions

**Files:**
- Components: PascalCase (`NewsCard.tsx`, `SignalCard.tsx`)
- Pages: PascalCase (`Dashboard.tsx`, `Monitor.tsx`)
- Hooks: camelCase with `use` prefix (`useCachedQuery.ts`)
- Services: camelCase (`aiService.ts`, `newsAggregator.ts`)
- Routes: camelCase (`news.ts`, `auth.ts`)
- Types: camelCase (`index.ts`, `focus.ts`)
- Tests: `*.test.ts` or `*.spec.ts` suffix

**Directories:**
- Lowercase with hyphens (`feed-manager/`, `community/`)
- Singular for utility dirs (`hook/`, `type/`, `config/`)
- Plural for collection dirs (`components/`, `pages/`, `routes/`)

## Where to Add New Code

**New Feature:**
- Primary code: `src/components/` for UI, `server/services/` for backend logic
- Tests: `src/components/__tests__/` or co-located `*.test.ts`
- API endpoint: `server/routes/{feature}.ts`, mount in `server/index.ts`

**New Component/Module:**
- Implementation: `src/components/{ComponentName}.tsx`
- If feature-specific: `src/components/{feature-name}/{ComponentName}.tsx`
- Export from `src/components/{feature-name}/index.ts` if directory-based

**New Page:**
- Implementation: `src/pages/{PageName}.tsx`
- Route: Add lazy import and `<Route>` in `src/App.tsx`

**New Backend Route:**
- Implementation: `server/routes/{name}.ts` exporting Router
- Mount: Add `app.use('/api/{name}', {name}Routes)` in `server/index.ts`

**New Service:**
- Implementation: `server/services/{serviceName}.ts`
- Pattern: Use singleton `getInstance()` pattern
- Initialize: Add to `server/index.ts` if needed at startup

**Utilities:**
- Frontend: `src/lib/` for general utils, `src/utils/` for domain-specific
- Backend: `server/utils/`

**Types:**
- Shared frontend/backend: `src/types/index.ts`
- Frontend-only: `src/types/{domain}.ts`
- Database: `prisma/schema.prisma` + run `npx prisma generate`

## Special Directories

**`src/generated/prisma/`:**
- Purpose: Auto-generated Prisma client and types
- Generated: Yes (by `npx prisma generate`)
- Committed: No (in `.gitignore`)
- Note: DO NOT manually edit - regenerate from schema

**`node_modules/`:**
- Purpose: npm/pnpm dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No

**`dist/`:**
- Purpose: Production build output
- Generated: Yes (by `npm run build`)
- Committed: No

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: By GSD commands
- Committed: Yes (useful for context)

**`dev.db`:**
- Purpose: SQLite database file for development
- Generated: Yes (by Prisma on first run)
- Committed: Optional (contains local data)

---

*Structure analysis: 2026-04-18*
