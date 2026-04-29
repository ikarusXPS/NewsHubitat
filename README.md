<!-- generated-by: gsd-doc-writer -->
# NewsHub

A multi-perspective global news analysis platform that aggregates news from 130 sources across 13 regions with real-time translation, sentiment analysis, perspective comparison visualization, and AI-powered insights.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Installation

NewsHub uses npm for package management. Install dependencies:

```bash
npm install
```

## Prerequisites

- **Node.js**: >= 18.0.0
- **PostgreSQL**: 17 (via Docker recommended)
- **Redis**: 7.4 (optional, enables caching)
- **Docker**: Latest (for database and monitoring stack)

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/ikarusXPS/NewsHubitat.git
cd NewsHub
```

2. Start PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
```

3. Configure environment variables:

```bash
cp .env.example .env
# Edit .env and set JWT_SECRET (required, minimum 32 characters)
# Configure at least one AI provider (OPENROUTER_API_KEY recommended - free tier)
```

4. Initialize the database:

```bash
npx prisma generate
npx prisma db push
npm run seed
```

5. Start the development server:

```bash
npm run dev
```

Access the application at `http://localhost:5173` (frontend) and `http://localhost:3001` (backend API).

## Usage Examples

### Running Both Frontend and Backend

```bash
npm run dev
```

This starts the frontend dev server on port 5173 and the backend API on port 3001 concurrently.

### Running Tests

```bash
# Unit tests with coverage (80% threshold enforced)
npm run test:coverage

# E2E tests with Playwright
npm run test:e2e

# Interactive E2E UI mode
npm run test:e2e:ui
```

### Production Build

```bash
# Build both frontend and backend
npm run build

# Start production server
npm run start
```

The production server serves both the API and static frontend files on port 3001.

### Docker Deployment

```bash
# Build and start all services (app, postgres, redis, prometheus, grafana, alertmanager)
docker compose up -d

# View logs
docker compose logs -f app

# Check container health
docker compose ps
```

Access monitoring dashboards:
- **Prometheus**: http://localhost:9090 (metrics scraping)
- **Grafana**: http://localhost:3000 (dashboards, admin/admin)
- **Alertmanager**: http://localhost:9093 (alert routing)

### Database Management

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# Sync schema to database
npx prisma db push

# Generate Prisma client after schema changes
npx prisma generate
```

## Tech Stack

- **Frontend**: React 19, Vite 8, TypeScript 6, Tailwind CSS v4
- **State Management**: Zustand v5 (UI state), TanStack Query v5 (server state)
- **Backend**: Express 5, TypeScript, ES modules
- **Database**: PostgreSQL 17 via Prisma 7
- **Real-time**: Socket.io for WebSocket updates
- **AI**: Multi-provider fallback (OpenRouter → Gemini → Anthropic)
- **Translation**: Multi-provider chain (DeepL → Google → LibreTranslate → Claude)
- **Testing**: Vitest (unit, 80% coverage) + Playwright (E2E)
- **Monitoring**: Prometheus + Grafana + Alertmanager; Sentry for error tracking
- **Visualization**: Recharts 3, globe.gl 2, Leaflet 1.9

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/news` | GET | List articles (filter by region, sentiment, search) |
| `/api/news/:id` | GET | Single article details |
| `/api/news/sources` | GET | List all 130 news sources |
| `/api/translate` | POST | Translate text to target language |
| `/api/auth/register` | POST | Create account (triggers email verification) |
| `/api/auth/login` | POST | Login (returns JWT) |
| `/api/auth/me` | GET | Get current user (requires Bearer token) |
| `/api/analysis/clusters` | GET | Topic clustering with AI summaries |
| `/api/ai/ask` | POST | RAG-based Q&A with news context |
| `/api/events/geo` | GET | Geo-located events for map visualization |
| `/api/events/timeline` | GET | Historical event timeline |
| `/api/health` | GET | Server health check |
| `/api/metrics` | GET | Prometheus metrics (prom-client format) |

## Features

- **Multi-Region News**: Aggregates from 130 sources across USA, Europe, Middle East, China, Russia, and more
- **Real-time Translation**: Automatic translation to German and English via multi-provider fallback
- **Sentiment Analysis**: AI-powered sentiment detection (positive, negative, neutral) by region
- **Perspective Comparison**: Visualize how different regions frame the same story
- **Interactive Visualizations**: 3D globe view, clustered maps, timeline, sentiment charts
- **AI Analysis**: RAG-based Q&A and topic clustering with multi-provider AI (all free tiers)
- **Gamification**: Badges, leaderboards, and progress tracking for reader engagement
- **Customizable AI Personas**: 8 built-in personalities (Neutral, Skeptic, Optimist, etc.)
- **Email Digests**: Scheduled daily/weekly summaries via SendGrid
- **Offline Support**: Progressive Web App with service worker caching
- **Real-time Updates**: WebSocket-based live news feed
- **Reading History**: Track articles with pause/resume functionality
- **Bookmarks & Sharing**: Save articles and share with analytics

## Project Structure

```
NewsHub/
├── src/                    # Frontend React application
│   ├── components/         # React components (SignalCard, GlobeView, NewsFeed)
│   ├── pages/              # Route pages (Dashboard, Analysis, Monitor, Timeline)
│   ├── store/              # Zustand state management
│   ├── services/           # API clients and sync service
│   ├── types/              # TypeScript definitions
│   └── generated/prisma/   # Generated Prisma client (do not edit)
├── server/                 # Backend Express API
│   ├── routes/             # API endpoints (news, auth, ai, events)
│   ├── services/           # Business logic (newsAggregator, aiService, translationService)
│   ├── middleware/         # Express middleware (rate limiting, auth, metrics)
│   ├── config/             # Configuration (sources.ts with 130 news sources)
│   └── db/                 # Prisma database client
├── prisma/                 # Database schema and seeds
├── e2e/                    # Playwright E2E tests
├── docs/                   # Additional documentation
├── prometheus/             # Prometheus configuration
├── grafana/                # Grafana dashboards
├── alertmanager/           # Alertmanager configuration
└── docker-compose.yml      # Container orchestration
```

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Write tests for new features (maintain 80%+ coverage)
4. Run quality checks: `npm run typecheck && npm run lint && npm run test:run`
5. Commit with conventional commits format: `feat:`, `fix:`, `docs:`, etc.
6. Push and create a pull request

Before submitting:
- Ensure all tests pass: `npm run test:run`
- Verify build succeeds: `npm run build`
- Run E2E tests: `npm run test:e2e`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2024 ikarusXPS

## Documentation

For detailed documentation, see:
- [CLAUDE.md](CLAUDE.md) - Developer guide and architecture overview
- [docs/SENDGRID_SETUP.md](docs/SENDGRID_SETUP.md) - Email configuration guide
- [docs/monitoring/uptimerobot.md](docs/monitoring/uptimerobot.md) - Uptime monitoring setup

## Support

For questions or issues, please open a GitHub issue at: https://github.com/ikarusXPS/NewsHubitat/issues
