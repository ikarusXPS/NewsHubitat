<!-- generated-by: gsd-doc-writer -->
# @newshub/types

Shared TypeScript type declarations for the NewsHub monorepo. Type-only package — zero runtime code, zero build step.

Part of the [NewsHub monorepo](../../README.md).

## Purpose

A single source of truth for the domain types that cross workspace boundaries:

- **`apps/web`** — React frontend and Express backend both import from here.
- **`apps/mobile`** — Capacitor wrapper consumes these types transitively through `apps/web` (the mobile app reuses the web `dist` bundle).

Because the consumers all live in the same pnpm workspace, changes propagate instantly on the next `pnpm typecheck` — no version bump or publish step is needed inside the monorepo.

## Installation

Already wired up via `pnpm-workspace.yaml`. To use it from another workspace package, add it to that package's `package.json`:

```json
{
  "dependencies": {
    "@newshub/types": "workspace:*"
  }
}
```

Then run `pnpm install` at the repo root.

## Usage

Always use a type-only import — there is no runtime export:

```typescript
import type {
  PerspectiveRegion,
  NewsArticle,
  ApiResponse,
} from '@newshub/types';

async function fetchArticles(): Promise<ApiResponse<NewsArticle[]>> {
  const response = await fetch('/api/news');
  return response.json();
}

const region: PerspectiveRegion = 'deutschland';
```

## Exported Types

### Core domain unions

| Type | Values |
|------|--------|
| `PerspectiveRegion` | 17 regions: `usa`, `europa`, `deutschland`, `nahost`, `tuerkei`, `russland`, `china`, `asien`, `afrika`, `lateinamerika`, `ozeanien`, `kanada`, `alternative`, `sudostasien`, `nordeuropa`, `sub-saharan-africa`, `indien` |
| `Sentiment` | `positive` \| `negative` \| `neutral` |
| `OwnershipType` | `state` \| `private` \| `public` \| `mixed` |
| `EventSeverity` | `critical` \| `high` \| `medium` \| `low` |
| `EventCategory` | `conflict` \| `humanitarian` \| `political` \| `economic` \| `military` \| `protest` \| `diplomacy` \| `other` |

### Interfaces

| Type | Description |
|------|-------------|
| `ApiResponse<T>` | Standard API envelope: `success`, `data?`, `error?`, and paginated `meta?` (`total`, `page`, `limit`, `hasMore?`) |
| `NewsSource` | Source metadata: id, region, language, bias (political/reliability/ownership), optional `biasDiversityNote: 'limited'` for state-dominated press |
| `NewsArticle` | Article shape with optional `titleTranslated`/`contentTranslated` (de/en), sentiment, perspective, entities, topics, and optional `confidence` score |
| `GeoEvent` | AI-extracted geo-located event with lat/lng, category, severity, perspectives |
| `TimelineEvent` | Historical timeline entry with date, severity (1-10), location, related articles; category is `military \| diplomacy \| humanitarian \| protest \| other` |
| `TimelineEventI18n` | Timeline event with `I18nText` title/description for localized rendering; extends `TimelineEvent` category with `economic` |
| `I18nText` | `{ de: string; en: string }` |
| `SentimentData` | Per-region sentiment aggregate for charts |
| `FilterState` | UI filter state: regions, topics, date range, search query, sentiment, sort field and order |
| `TranslationRequest` | `{ text, sourceLang?, targetLang: 'de' \| 'en' }` |

## Adding or changing types

1. Edit `index.ts` — this is the only source file.
2. Run `pnpm typecheck` at the repo root. Every consumer is rechecked immediately; no build, publish, or version bump required.
3. If a type also has a mirror in `apps/web/src/types/index.ts` (e.g. `PerspectiveRegion`, `NewsSource`), update both atomically — these mirrors exist for now and are flagged in the file with a comment.

## Build

There is no build step for runtime use — `package.json` points `main`, `types`, and `exports` directly at `index.ts`. The `tsconfig.json` enables `composite` + `declaration` so TypeScript project references work, but consumers read the source `.ts` file directly.

```bash
pnpm --filter @newshub/types typecheck
```
