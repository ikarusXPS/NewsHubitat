# Technology Stack

**Analysis Date:** 2026-04-18

## Languages

**Primary:**
- TypeScript ~6.0.3 - Full stack (frontend + backend)

**Secondary:**
- JavaScript (ES Modules) - Configuration files, ESLint config
- SQL - Database queries via Prisma

## Runtime

**Environment:**
- Node.js (ES2023 target for server, ES2022 for client)
- ES Modules (`"type": "module"` in package.json)

**Package Manager:**
- npm (pnpm compatible with overrides configured)
- Lockfile: package-lock.json present

## Frameworks

**Core:**
- React 19.2.0 - Frontend UI framework
- Express 5.2.1 - Backend REST API
- Vite 8.0.8 - Build tool and dev server

**State Management:**
- Zustand 5.0.11 - Client state (persisted to localStorage under `newshub-storage`)
- TanStack Query 5.90.21 - Server state, caching, and data fetching

**Routing:**
- React Router 7.13.1 - Client-side routing with lazy-loaded pages

**Testing:**
- Vitest 4.0.18 - Unit testing (jsdom environment)
- Playwright 1.58.2 - E2E testing (Chromium)
- Testing Library (React 16.3.2, Jest DOM 6.9.1) - Component testing

**Build/Dev:**
- tsx 4.21.0 - TypeScript execution for backend dev
- concurrently 9.2.1 - Parallel dev server execution
- nodemon 3.1.14 - File watching

## Key Dependencies

**Frontend:**
| Package | Version | Purpose |
|---------|---------|---------|
| `react-dom` | 19.2.0 | React DOM rendering |
| `lucide-react` | 1.8.0 | Icon library |
| `framer-motion` | 12.35.0 | Animations |
| `sonner` | 2.0.7 | Toast notifications |
| `cmdk` | 1.1.1 | Command palette |
| `@radix-ui/react-dialog` | 1.1.15 | Accessible dialogs |
| `class-variance-authority` | 0.7.1 | Component variants |
| `clsx` + `tailwind-merge` | 2.1.1 / 3.5.0 | Class utilities |

**Visualization:**
| Package | Version | Purpose |
|---------|---------|---------|
| `recharts` | 3.7.0 | Charts and graphs |
| `globe.gl` | 2.45.0 | 3D globe visualization |
| `three` | 0.184.0 | 3D graphics (globe.gl dep) |
| `leaflet` + `react-leaflet` | 1.9.4 / 5.0.0 | 2D maps |
| `leaflet.markercluster` | 1.5.3 | Map marker clustering |

**Backend:**
| Package | Version | Purpose |
|---------|---------|---------|
| `cors` | 2.8.6 | CORS middleware |
| `compression` | 1.8.1 | Response compression |
| `dotenv` | 17.3.1 | Environment variables |
| `jsonwebtoken` | 9.0.3 | JWT authentication |
| `bcryptjs` | 3.0.3 | Password hashing |
| `winston` | 3.19.0 | Logging |
| `zod` | 4.3.6 | Schema validation |

**Data & Scraping:**
| Package | Version | Purpose |
|---------|---------|---------|
| `rss-parser` | 3.13.0 | RSS feed parsing |
| `cheerio` | 1.2.0 | HTML parsing |
| `puppeteer` | 24.38.0 | Headless browser scraping |
| `puppeteer-extra` | 3.3.6 | Puppeteer plugins |
| `puppeteer-extra-plugin-stealth` | 2.11.2 | Anti-bot evasion |
| `puppeteer-extra-plugin-adblocker` | 2.13.6 | Ad blocking |
| `axios` | 1.13.6 | HTTP client |

**Database:**
| Package | Version | Purpose |
|---------|---------|---------|
| `@prisma/client` | 7.7.0 | ORM client |
| `prisma` | 7.7.0 | Schema management |
| `@prisma/adapter-better-sqlite3` | 7.7.0 | SQLite adapter |
| `better-sqlite3` | 12.9.0 | SQLite driver |
| `pg` | 8.20.0 | PostgreSQL driver (production) |

**AI Providers:**
| Package | Version | Purpose |
|---------|---------|---------|
| `openai` | 6.27.0 | OpenRouter API client |
| `@google/generative-ai` | 0.24.1 | Gemini API client |
| `@anthropic-ai/sdk` | 0.90.0 | Claude API client |

**Translation:**
| Package | Version | Purpose |
|---------|---------|---------|
| `deepl-node` | 1.24.0 | DeepL translation |

**Real-time:**
| Package | Version | Purpose |
|---------|---------|---------|
| `socket.io` | 4.8.3 | WebSocket server |
| `ioredis` | 5.10.1 | Redis client |

**Email:**
| Package | Version | Purpose |
|---------|---------|---------|
| `nodemailer` | 8.0.5 | Email sending |

**Market Data:**
| Package | Version | Purpose |
|---------|---------|---------|
| `yahoo-finance2` | 3.13.2 | Stock/commodity quotes |

## Styling

**CSS Framework:**
- Tailwind CSS 4.2.1 - Utility-first CSS
- PostCSS 8.5.8 - CSS processing
- Autoprefixer 10.4.27 - Vendor prefixes

**Build Optimization:**
- `vite-plugin-compression` - Gzip + Brotli compression
- `vite-plugin-pwa` 1.2.0 - PWA with Service Worker

## TypeScript Configuration

**Frontend (`tsconfig.app.json`):**
```json
{
  "target": "ES2022",
  "lib": ["ES2022", "DOM", "DOM.Iterable"],
  "module": "ESNext",
  "moduleResolution": "bundler",
  "jsx": "react-jsx",
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

**Backend (`tsconfig.node.json`):**
```json
{
  "target": "ES2023",
  "lib": ["ES2023"],
  "module": "ESNext",
  "moduleResolution": "bundler",
  "types": ["node"],
  "strict": true
}
```

## Linting & Formatting

**ESLint 10.2.1:**
- Config: `eslint.config.js` (flat config)
- Plugins: `typescript-eslint`, `react-hooks`, `react-refresh`
- Extends: `@eslint/js` recommended, TypeScript recommended

**No Prettier configured** - relies on ESLint for formatting rules.

## Test Configuration

**Vitest (`vitest.config.ts`):**
```typescript
{
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  include: ['src/**/*.{test,spec}.{ts,tsx}'],
  coverage: {
    provider: 'v8',
    thresholds: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  }
}
```

**Playwright (`playwright.config.ts`):**
```typescript
{
  testDir: './e2e',
  fullyParallel: true,
  projects: [{ name: 'chromium' }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173'
  }
}
```

## Build Output

**Frontend:**
- Output: `dist/` directory
- Chunks: Manual chunking for vendor splitting
  - `react-vendor`, `state-vendor`, `ui-vendor`, `animation-vendor`
  - `map-vendor`, `globe-vendor`, `chart-vendor`, `cmdk-vendor`

**Backend:**
- Output: `dist/server/` (compiled TypeScript)
- Entry: `dist/server/index.js`

## Development Ports

| Service | Port |
|---------|------|
| Frontend (Vite) | 5173 |
| Backend (Express) | 3001 |
| Prisma Studio | 5555 |

## Platform Requirements

**Development:**
- Node.js with ES2023 support (Node 20+)
- SQLite (via better-sqlite3, bundled)
- Optional: Redis for caching

**Production:**
- Node.js 20+
- PostgreSQL (recommended) or SQLite
- Redis (recommended for caching)
- SMTP server (for email features)

---

*Stack analysis: 2026-04-18*
