# Phase 31: Virtual Scrolling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 31-virtual-scrolling
**Areas discussed:** Library choice, NewsFeed integration, Accessibility fallback, Memory & performance

---

## Library Choice

| Option | Description | Selected |
|--------|-------------|----------|
| @tanstack/react-virtual (Recommended) | Lightweight (~3KB), headless, works with any layout. Already using TanStack Query. | Y |
| react-virtuoso | Feature-rich (~15KB), built-in grid support, auto-height items. More opinionated. | |
| react-window | Mature (~6KB) but requires fixed row heights. Would limit card flexibility. | |

**User's choice:** @tanstack/react-virtual (Recommended)
**Notes:** Aligns with existing TanStack Query usage in project. Headless approach gives more control.

---

## View Mode Preservation

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both (Recommended) | Grid (3-col) and list modes both virtualized. More work but preserves user choice. | Y |
| Single column list only | Drop grid mode. Simpler virtualization but loses current feature. | |

**User's choice:** Keep both (Recommended)
**Notes:** Preserve existing UX. Grid mode is used by users.

---

## Card Entry Animations

| Option | Description | Selected |
|--------|-------------|----------|
| Remove stagger, keep fade (Recommended) | Remove delay-based stagger (causes jank). Keep simple opacity transition on mount. | Y |
| Full animation removal | No entry animations. Maximum performance, cards appear instantly. | |
| Keep current animations | Keep framer-motion stagger. May cause jank on fast scroll but preserves polish. | |

**User's choice:** Remove stagger, keep fade (Recommended)
**Notes:** Stagger animations cause jank with virtualization. Simple fade is sufficient.

---

## NewsFeed Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Inside NewsFeed (Recommended) | Replace the grid map() with VirtualizedGrid component. NewsFeed stays the orchestrator. | Y |
| New VirtualizedNewsFeed page | Create separate component, conditionally render based on article count. More isolation but duplication. | |

**User's choice:** Inside NewsFeed (Recommended)
**Notes:** Keep NewsFeed as single source of truth for article display logic.

---

## Dynamic Card Heights

| Option | Description | Selected |
|--------|-------------|----------|
| Estimated height with measureElement (Recommended) | Estimate ~400px, let tanstack measure real heights on mount. Works well with variable content. | Y |
| Fixed height per card | Force all cards to ~380px. Simpler but truncates long content. | |

**User's choice:** Estimated height with measureElement (Recommended)
**Notes:** Cards have variable content (summary, topics). Dynamic measurement preferred.

---

## Accessibility Fallback Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Reduced motion + screen reader (Recommended) | Detect prefers-reduced-motion OR screen reader presence. Auto-switch to paginated mode. | Y |
| User toggle in settings | Add "Use traditional scrolling" toggle in Settings. Manual control but adds UI complexity. | |
| Always show button | Keep "Load More" button visible below virtual list. Simple but cluttered UI. | |

**User's choice:** Reduced motion + screen reader (Recommended)
**Notes:** Automatic accessibility accommodation without requiring user action.

---

## Keyboard Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Arrow keys with focus management (Recommended) | Up/Down arrows move focus through visible cards. Tab moves between interactive elements. | Y |
| Tab-only navigation | Standard tab order. Simpler but requires more key presses to navigate long lists. | |

**User's choice:** Arrow keys with focus management (Recommended)
**Notes:** Better UX for keyboard users navigating long lists.

---

## Overscan Count

| Option | Description | Selected |
|--------|-------------|----------|
| 5 items (Recommended) | Render 5 items before/after viewport. Good balance of smoothness and memory. | Y |
| 3 items | Minimal overscan. Lower memory but may show blank space on fast scroll. | |
| 10 items | Large buffer. Smoothest scroll but higher memory usage. | |

**User's choice:** 5 items (Recommended)
**Notes:** Standard overscan amount for smooth scrolling.

---

## Scroll Position on Filter Change

| Option | Description | Selected |
|--------|-------------|----------|
| Reset to top (Recommended) | When filters or view mode change, scroll resets to top. Clean UX, matches user expectation. | Y |
| Attempt to preserve position | Try to keep scroll position near same article. Complex with filtered data changes. | |

**User's choice:** Reset to top (Recommended)
**Notes:** Clean UX when context changes. Preserving position is complex and error-prone.

---

## Virtualization Threshold

| Option | Description | Selected |
|--------|-------------|----------|
| Always virtualize (Recommended) | Use virtualization for any list size. Consistent behavior, minimal overhead even for small lists. | Y |
| Only when >50 articles | Fall back to regular rendering for small lists. Simpler DOM for small data but conditional logic. | |

**User's choice:** Always virtualize (Recommended)
**Notes:** Consistent behavior. TanStack Virtual has minimal overhead for small lists.

---

## Claude's Discretion

- Exact estimated row height based on testing
- Whether to create VirtualizedGrid as separate file or inline
- Screen reader detection method
- CSS transition timing for card fade-in

## Deferred Ideas

None
