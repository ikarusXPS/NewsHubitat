---
phase: 02-event-system
plan: 03
subsystem: ui
tags: [article-preview, i18n, event-panel, timeline]
dependency_graph:
  requires: [02-01]
  provides: [ArticlePreview, getLocalizedText, article-fetching]
  affects: [Timeline, EventDetailPanel]
tech_stack:
  added: []
  patterns: [i18n-text-helper, article-preview-component, loading-skeleton]
key_files:
  created: []
  modified:
    - src/pages/Timeline.tsx
decisions:
  - "ArticlePreview component inline in Timeline.tsx (not extracted to separate file) for co-location with EventDetailPanel"
  - "getLocalizedText helper returns German fallback if language key missing"
  - "Loading skeleton shows max 3 placeholders regardless of total article count"
metrics:
  duration: "~3 minutes"
  tasks_completed: 2
  files_modified: 1
  completed: 2026-04-18T04:46:58Z
---

# Phase 02 Plan 03: Article Preview + i18n Summary

ArticlePreview component and bilingual event display in EventDetailPanel, replacing generic "Artikel #1" placeholders with real article information.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ArticlePreview component | 59a0d04 | src/pages/Timeline.tsx |
| 2 | Fetch and display articles in EventDetailPanel | fe741a8 | src/pages/Timeline.tsx |

## What Was Built

### ArticlePreview Component (lines 218-272)

```typescript
interface ArticlePreviewProps {
  article: {
    id: string;
    title: string;
    source: { name: string };
    publishedAt: string;
    perspective: string;
    url: string;
  };
}

function ArticlePreview({ article }: ArticlePreviewProps) {
  // formatTimeAgo helper for relative timestamps
  // Returns: "Gerade" (<1min), "5m", "3h", "2d", or "18.04" (>7d)
  // ...
}
```

**Visual Contract (per UI-SPEC.md):**
- Container: `p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800`
- Title: 14px JetBrains Mono (font-mono), gray-300, truncate, hover: #00f0ff
- Metadata: 10px, gray-500, pipe-separated: `{source} | {timeAgo} | {REGION}`
- External link: positioned right, stopPropagation to prevent card selection

### EventDetailPanel Enhancements (lines 275-450)

**Article Fetching:**
```typescript
const [articles, setArticles] = useState<ArticlePreviewProps['article'][]>([]);
const [isLoadingArticles, setIsLoadingArticles] = useState(false);

useEffect(() => {
  fetch(`/api/events/${event.id}`)
    .then(res => res.json())
    .then(data => setArticles(data.data.articles.map(...)))
    // ...
}, [event.id, event.relatedArticles.length]);
```

**i18n Support:**
```typescript
const language = useAppStore(state => state.language); // 'de' | 'en'

const getLocalizedText = (text: string | { de: string; en: string }): string => {
  if (typeof text === 'object' && text !== null) {
    return text[language] || text.de; // Fallback to German
  }
  return text;
};
```

**Loading States:**
- Loading skeleton: Shows 1-3 animated placeholders while fetching
- Success: Renders ArticlePreview components with real data
- Fallback: Generic "Artikel #X" links if fetch fails

## Verification Results

- TypeScript compilation: PASSED
- ArticlePreview component created with UI-SPEC styling
- Article fetching via `/api/events/:id` endpoint
- i18n helper for bilingual historical events
- Loading skeleton during fetch
- Fallback to generic links on error

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

1. **Component co-location**: ArticlePreview defined inline in Timeline.tsx rather than extracted to a separate file. This keeps it close to its only consumer (EventDetailPanel) and avoids premature abstraction.

2. **German fallback**: The `getLocalizedText` helper falls back to German (`text.de`) if the current language key is missing, maintaining backward compatibility with existing German-only content.

3. **Skeleton limit**: Loading skeleton shows maximum 3 placeholders regardless of actual article count, preventing visual overload during fetch.

## Self-Check: PASSED

- [x] src/pages/Timeline.tsx exists and contains ArticlePreview, getLocalizedText
- [x] Commit 59a0d04 exists (ArticlePreview component)
- [x] Commit fe741a8 exists (article fetching and i18n)
