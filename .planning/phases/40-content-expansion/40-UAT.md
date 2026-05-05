---
status: resolved
phase: 40-content-expansion
source: [40-01-SUMMARY.md, 40-02-SUMMARY.md, 40-03-SUMMARY.md, 40-04-SUMMARY.md, 40-05-SUMMARY.md, 40-06-SUMMARY.md, 40-07-SUMMARY.md, 40-08-SUMMARY.md, 40-09-SUMMARY.md, 40-10-SUMMARY.md]
started: 2026-05-05T11:00:00Z
updated: 2026-05-05T13:30:00Z
---

## Current Test

[all 4 gaps resolved by gap-closure plans 40-07/08/09/10 — 1 blocked + 2 skipped remain (pre-existing, not phase-40 gaps)]

## Tests

### 1. Cold Start Smoke Test
expected: Stop any running dev server, run `pnpm dev`, beide Prozesse (frontend 5173/5174 + backend 3001) starten ohne Fehler. Backend gibt `/api/health` 200, Prisma migrations applied, `/api/podcasts/curated` und `/api/videos` antworten ohne 500.
result: pass
notes: |
  Backend up :3001, frontend up :5177 (IPv6 — 5173/74/75/76 stale orphans).
  /api/health=200, /api/ready=200, /api/podcasts/=200 (returns 32 curated feeds:
  The Daily, Up First, …), /api/videos/channels=200. Boot log shows all 4
  phase-40 services init: PodcastFeedPollJob (32 feeds), VideoChannelPollJob
  (24 channels), WhisperService, TranscriptService. Prisma migrations applied
  (biasDiversityNote, FTS GIN indexes both present in INSERT statements).

### 2. Source Count + 4 New Sub-Regions
expected: NewsHub aggregiert jetzt aus 233 Sources über 17 Regions (vorher 130/13). Im Filter/Region-Picker erscheinen die 4 neuen Sub-Regions: **sudostasien**, **nordeuropa**, **sub-saharan-africa**, **indien**. Mindestens ein Artikel aus jeder neuen Sub-Region ist im Feed sichtbar nach Refresh.
result: pass

### 3. Bias Diversity Note für Russia/China
expected: In der Framing-Analysis-Ansicht für `russland` und `china` Region sieht man eine Footnote / Annotation "Limited bias diversity available for this region — state-dominated press constrains source balance" oder ein vergleichbarer UI-Hinweis. Die Markierung kommt aus `biasDiversityNote: 'limited'` im Schema.
result: issue
reported: "Fehler beim Laden der Cluster"
severity: major
notes: |
  Test ist nur indirekt ein Bias-Diversity-Note-Problem — die Analysis-Page kann
  Cluster gar nicht erst laden, also ist die Footnote nicht prüfbar. Kann eine
  AI-Quota-Erschöpfung sein (CLAUDE.md kennt das Symptom: "AI quota exhausted on
  the fallback chain"). Backend-Boot-Log zeigt aber Gemini + OpenRouter beide
  initialisiert. Diagnose-Phase soll Network-Tab-Fehler / Backend-Log /
  AI-Provider-Status prüfen.

### 4. /podcasts Page Loads From Sidebar
expected: Click auf "Podcasts" in der Sidebar öffnet `/podcasts`. Linke Spalte zeigt die 32 kuratierten Podcast-Feeds (PBS NewsHour, FAZ Frühdenker, Hard Fork, etc.); Click auf einen Feed lädt rechts die Episode-Liste mit Titel, Autor, Datum, Audio-Player.
result: issue
reported: "Pass aber folge lässt sich mit play nicht abspielen"
severity: major
notes: |
  Page-Listing + Feed-Selection rendern OK. Bug ist im Audio-Playback:
  Click auf Play-Button startet keine Wiedergabe. Betrifft PodcastPlayer.tsx
  (40-04 SUMMARY.md). Diagnose-Phase soll prüfen: (a) audio src URL korrekt
  gesetzt, (b) CORS auf RSS-enclosure-URLs, (c) `<audio>`-Element-State /
  PodcastPlayer-Implementation, (d) Browser-Console-Fehler.

### 5. Related Podcasts in NewsCard
expected: Auf der Hauptseite (`/`) — auf einem Article-Card eine "Related Podcasts" / "Verwandte Podcasts" Section sichtbar (lazy collapsed). Click auf die Section expandiert; falls Match gefunden wurde: 1-5 Podcast-Episoden mit Titel + Audio-Player. Falls kein Match: leer-state OK.
result: issue
reported: "auf dashboard überlappen sich die karten gegenseitig"
severity: major
notes: |
  Screenshot vom Dashboard zeigt Cards in 3-Spalten-Grid; jede Row überlappt
  visuell mit der nächsten Row — READ MORE-Button am Card-Boden wird vom
  oberen Rand des darunterliegenden Cards überdeckt. RelatedPodcasts-/
  RelatedVideos-Section war im Screenshot NICHT sichtbar — Test-5-
  Hauptbedingung (RelatedPodcasts-Slot in NewsCard) deshalb nicht direkt
  validierbar. Wahrscheinliche Ursache: NewsCard.tsx wurde in 40-04 +
  40-05 um <RelatedPodcasts> + <RelatedVideos> Slots vor </article>
  erweitert; die neuen Sections vergrößern die Card-Höhe, aber der
  Grid-Container nutzt vermutlich fixe row-height oder grid-auto-rows
  ohne `1fr`/`min-content`, sodass die Cards ihre eigenen Bounds
  überschreiten.
  Diagnose-Phase soll prüfen: (a) NewsCard.tsx Render-Output (sind die
  neuen Slots überhaupt da? lazy-collapsed default?), (b) Dashboard-/
  NewsFeed-Container CSS Grid-Definition (grid-template-rows /
  grid-auto-rows), (c) ob das ein z-index- oder negative-margin-Problem
  ist, (d) Visual-Regression vs. pre-Phase-40 (commit `cdb9d55^`).

### 6. Related Videos in NewsCard mit Click-to-Load
expected: Auf der Hauptseite — auf einem Article-Card eine "Related Videos" Section. Beim Expand: 1-5 Video-Thumbnails (KEINE iframes, KEINE YouTube-Cookies vor Click — DevTools Network zeigt nur thumbnail-img-Anfragen). Click auf einen Thumbnail lädt das iframe (youtube-nocookie.com bzw. Vimeo).
result: blocked
blocked_by: prior-phase
reason: |
  User reported: "kann related video wegen ui fehler nicht sehen ... oder die newscards sind noch mock daten".
  (a) Test-5-UI-Bug (NewsCard-Grid-Overlap) verdeckt die Related-Videos-Section visuell;
  (b) Dashboard zeigt überwiegend Mock-Seed-Artikel (seed-001..seed-040 aus `pnpm seed:news`),
      deren generische `entities`/`topics` möglicherweise zu schwachen Video-Matches führen
      — selbst wenn der Slot gerendert würde, wäre der Match-Pool dünn.
  Diagnose-Phase soll: (a) den Test-5-Layout-Fix priorisieren; nach Fix Test 6 retesten,
  (b) optional: für sauberen Test ohne Mock-Bias `pnpm seed:news` ausschalten und mit
  realen RSS-Artikeln (DB hat 22466) prüfen, oder Match-Logik mit deterministischen
  Test-Fixtures aus 40-03 PodcastMatcherService unit-tests reproduzieren.

### 7. Transcript Drawer FREE-Tier
expected: Als FREE-User auf einer Podcast-Episode (in `/podcasts` oder NewsCard `RelatedPodcasts`) den Transkript-Toggle/Button klicken. Statt Transkript erscheint Upgrade-Prompt "Premium-Feature" oder ein Paywall-Hinweis (NICHT im native iOS/Android Build — dort komplett verborgen).
result: pass
notes: |
  User-Bestätigung: "oben rechts ist ein upgrade um feature freizuschalten button" —
  Tier-Gate sichtbar als Upgrade-CTA. Wahrscheinlich PodcastsPage transcript-search-
  toggle oder generic UpgradePrompt-Komponente. Reader-App-Exemption (CC-01)
  separat in Test 9 geprüft.

### 8. Transcript Drawer Premium-Tier + Timestamp Navigation
expected: Als PREMIUM-User auf einer Podcast-Episode den Transkript-Toggle klicken. TranscriptDrawer öffnet, zeigt timestamped Segments. Click auf ein Segment springt der Audio-Player zu dieser Position (player.currentTime ≈ segment.startSec).
result: skipped
reason: "need premium — Test-Account ist FREE-Tier; Premium-Pfad muss separat geprüft werden (test-mode Tier-Override oder echter Premium-Account)"

### 9. Native App Reader-App-Exemption
expected: Capacitor build (iOS/Android) — die `PodcastsPage` Transcript-Search-Toggle und alle Premium-Hinweise/Upgrade-Prompts in TranscriptDrawer/RelatedPodcasts sind komplett verborgen (Apple Rule 3.1.3 / CC-01). FREE-Feature-Gates zeigen "feature not available" statt klickbarem Upgrade-Link.
result: skipped
reason: "need physical device — Capacitor iOS/Android build erfordert Simulator oder echtes Gerät; Web-Pfad alleine kann CC-01 (isNativeApp() === true) nicht reproduzieren. Kann via Vitest/RTL Mock von `isNativeApp()` als Unit-Test geprüft werden."

### 10. i18n DE/EN/FR Triple-Write
expected: Header-LanguageSwitcher zwischen DE/EN/FR togglen. Podcasts-Page UI-Strings ("Episoden", "Episodes", "Épisodes"), Videos-Section UI-Strings, und neue Region-Labels (sudostasien/nordeuropa/sub-saharan-africa/indien) übersetzen sich korrekt in allen 3 Sprachen.
result: issue
reported: "Pass aber nur deutsch und englisch zur auswahl im header"
severity: major
notes: |
  DE + EN switching funktioniert (Pass-Teil), aber FR fehlt komplett im
  Header-LanguageSwitcher. CLAUDE.md "i18n & PWA" Sektion sagt explizit
  "languages **DE / EN / FR**". Phase-23 (i18n Foundation) hat FR-Dateien
  angelegt; Phase-40 SUMMARYs schreiben durchgängig "i18n triple-write
  across DE/EN/FR". Mismatch zwischen Locales-on-Disk und Switcher-UI.
  Diagnose-Phase soll prüfen: (a) Component LanguageSwitcher.tsx —
  hardcoded language list? (b) i18n.config.ts / i18n/index.ts — supportedLngs?
  (c) public/locales/fr/*.json existieren? (d) Wann wurde FR aus dem
  Switcher entfernt — git-blame auf LanguageSwitcher.tsx.

### 11. Source-Bias-Coverage CI Gate
expected: `pnpm check:source-bias` läuft lokal grün — alle 17 Regions haben mindestens einen left-leaning + centrist + right-leaning Source ODER `biasDiversityNote: 'limited'` für state-dominated regions. Output: "✓ Bias coverage OK for all 17 regions".
result: pass
notes: |
  cd apps/web && pnpm check:source-bias →
    "Bias-coverage gate (D-A3): 17 regions, 233 sources"
    15 regions ✓ (L/C/R coverage)
    2 regions ℹ (china + russland — limited diversity exception per D-A3)
    "✓ Bias-coverage PASSED for all 17 regions"
  Counts pro Region geloggt; alle 4 neuen Sub-Regions (sudostasien, nordeuropa,
  sub-saharan-africa, indien) haben mindestens 1 left + 1 center + 1 right.

## Summary

total: 11
passed: 4
issues: 4
pending: 0
skipped: 2
blocked: 1

## Gaps

- truth: "Framing analysis surface (/analysis page) renders cluster groupings — required to display the bias diversity note for state-dominated regions"
  status: resolved
  resolved_by: "40-07 (commits 04d1811, 5df729b, 0b8ed04, 3be0d16)"
  reason: "User reported: Fehler beim Laden der Cluster"
  severity: major
  test: 3
  root_cause: "Three Analysis-page components fetch /api/analysis/* without an Authorization: Bearer header. Backend mounts authMiddleware before aiTierLimiter on /api/analysis since commit c5553f9 (2026-04-28) — silent 401 → React Query error → German error string at ClusterSummary.tsx:275. NOT an AI-quota issue (CLAUDE.md note is stale)."
  artifacts:
    - path: "apps/web/src/components/ClusterSummary.tsx"
      issue: "fetch('/api/analysis/clusters') at line 41-48 omits Authorization header; line 275 renders 'Fehler beim Laden der Cluster' on any non-2xx"
    - path: "apps/web/src/components/FramingComparison.tsx"
      issue: "fetch at line 84-91 omits Authorization header — blocks the bias-diversity-note display that Test 3 was supposed to verify"
    - path: "apps/web/src/components/PerspectiveCoverageStats.tsx"
      issue: "fetch at line 77-81 omits Authorization header — coverage-gap card silently 401ing"
  missing:
    - "Add headers: { Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}` } to all three component fetchers (mirror useFactCheck.ts:31-58 pattern)"
    - "Add <RequireAuth> wrapper around /analysis route in App.tsx:122 so anonymous users redirect to login instead of seeing a 401-derived error"
    - "(Follow-up tech-debt) introduce shared apps/web/src/lib/api.ts apiFetch() wrapper to auto-attach JWT — refactor 19+ DIY fetchers"
  debug_session: ".planning/debug/analysis-cluster-load-error.md"
  worktree_branch: "worktree-agent-a41ad2a7f281b4a7b"
  specialist: react

- truth: "Click on Play-Button in PodcastPlayer starts audio playback for selected episode"
  status: resolved
  resolved_by: "40-08 (commits 49ae551, 88de4a7, 7f80e4f, ea8f3a2, 2cf8da2, 9ab4d3f)"
  reason: "User reported: Pass aber folge lässt sich mit play nicht abspielen"
  severity: major
  test: 4
  root_cause: "Card-level Play button on PodcastEpisodeCard only mounts the PodcastPlayer UI; user must click a SECOND Play button INSIDE the player to actually start audio. Backend data is fine (audioUrl populated correctly). Current behavior is documented as design intent in PodcastEpisodeCard.test.tsx:68-74 — but is a UX/spec gap, not a regression."
  artifacts:
    - path: "apps/web/src/components/podcasts/PodcastEpisodeCard.tsx"
      issue: "handlePlay at lines 87-93 only calls setIsPlaying(toggle) when no onPlay prop passed; PodcastsPage.tsx:274-282 doesn't pass onPlay, so toggle-mount branch is active. Lines 152-156 render <PodcastPlayer> only when !onPlay && isPlaying — mount-only, no playback start."
    - path: "apps/web/src/components/podcasts/PodcastPlayer.tsx"
      issue: "<audio> at lines 178-184 has preload='metadata' (headers only), no autoPlay, no useEffect calling play() on mount. Only togglePlay (lines 116-124) ever invokes audio.play()."
    - path: "apps/web/src/components/podcasts/__tests__/PodcastEpisodeCard.test.tsx"
      issue: "Test 2 (lines 68-74) explicitly asserts the broken UX (clicking Play just mounts the player). Must be updated alongside the fix."
  missing:
    - "Add optional autoPlayOnMount?: boolean prop to PodcastPlayer; when true, attach a loadedmetadata listener (or in existing wiring useEffect) that calls void audio.play() once. Pass autoPlayOnMount from PodcastEpisodeCard whenever it mounts the player on user-gesture click — Chrome treats programmatic playback within ~5s of a user gesture as user-initiated."
    - "Update PodcastEpisodeCard.test.tsx Test 2 to spy on HTMLMediaElement.prototype.play and assert it was invoked, not just that the player mounted."
    - "(Optional) Add a Playwright E2E that clicks the card Play and waits for an <audio> element with non-zero currentTime to lock the fix."
  debug_session: ".planning/debug/podcast-player-play-noop.md"
  worktree_branch: "worktree-agent-a24566a02e168b8e4"
  specialist: react

- truth: "Dashboard NewsCard grid renders cards without vertical overlap; bottom of each card (READ MORE) is fully visible above the next row"
  status: resolved
  resolved_by: "40-09 (commit 0f04edd, shipped before this gap-closure run)"
  reason: "User reported: auf dashboard überlappen sich die karten gegenseitig"
  severity: major
  test: 5
  root_cause: "VirtualizedGrid.tsx:130 sets data-row-index instead of the literal data-index attribute that @tanstack/react-virtual v3 requires for measureElement() to map DOM nodes back to virtualizer rows. With wrong attr name, every measurement silently fails → falls back to constant estimateSize: 400. Real SignalCard rows often exceed 400px → row N+1's transform: translateY(start) is computed against under-counted estimate → row N+1 renders on top of the still-visible tail of row N. Bug predates Phase 40 (originated commit 4551cd45, Phase 35-01, 2026-04-26). Dashboard renders SignalCard, NOT NewsCard — Phase-40 RelatedPodcasts/RelatedVideos hypothesis disproven."
  artifacts:
    - path: "apps/web/src/components/virtualization/VirtualizedGrid.tsx"
      issue: "Line 130: data-row-index={virtualRow.index} should be data-index={virtualRow.index}. Reference VirtualizedList.tsx:99 for the correct pattern (List view shows no overlap with same library — only Grid view does)."
  missing:
    - "Rename data-row-index → data-index on VirtualizedGrid.tsx:130 (one-character functional change)"
    - "(Optional polish) Simplify the inline ref callback to ref={virtualizer.measureElement} — function is bound and stable in v3"
    - "(Optional polish) Raise estimateSize from 400 to ~360 to reduce initial-paint scroll-jump"
  debug_session: ".planning/debug/dashboard-newscard-grid-overlap.md"
  worktree_branch: "worktree-agent-ae2561803af4ddf31"
  specialist: react

- truth: "Header LanguageSwitcher exposes DE, EN, AND FR — all three languages selectable per CLAUDE.md and Phase-40 i18n triple-write convention"
  status: resolved
  resolved_by: "40-10 (commits 3dc11da, 20a0842, 7e7f7dd)"
  reason: "User reported: Pass aber nur deutsch und englisch zur auswahl im header"
  severity: major
  test: 10
  root_cause: "LanguageSwitcher.tsx hardcodes a `languages` array (lines 7-10) containing only de + en. Component renders the dropdown by mapping over this exact array — whatever isn't in the array can't be selected. Everything downstream of the switcher already supports FR (i18next supportedLngs: ['de','en','fr'], Zustand validators accept 'fr', FR locale files exist with real translations). Git history confirms 'fr'/'Français' have NEVER existed in this file — UI-list omission, not a regression."
  artifacts:
    - path: "apps/web/src/components/LanguageSwitcher.tsx"
      issue: "Lines 7-10: const languages = [{code:'de',...}, {code:'en',...}] — FR entry missing. Line 73: dropdown render maps over this array."
    - path: "apps/web/public/locales/fr/"
      issue: "Bonus finding: 2 namespaces declared in i18n config are missing FR translations (share.json, teams.json). Graceful English fallback already wired via fallbackLng: 'en', so these yield harmless 404s + per-key fallback rather than broken UI."
  missing:
    - "Insert { code: 'fr', label: 'Français', flag: 'FR' } into the languages array at LanguageSwitcher.tsx:9 between English and the closing ]. This is the entire required fix."
    - "(Optional follow-up, low priority) Copy share.json + teams.json from de/ or en/ to fr/ and translate, eliminating two 404s on first FR selection."
  debug_session: ".planning/debug/language-switcher-missing-fr.md"
  worktree_branch: "worktree-agent-a50037aeac585becf"
  specialist: react
