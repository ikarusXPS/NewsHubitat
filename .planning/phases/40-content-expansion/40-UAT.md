---
status: partial
phase: 40-content-expansion
source: [40-01-SUMMARY.md, 40-02-SUMMARY.md, 40-03-SUMMARY.md, 40-04-SUMMARY.md, 40-05-SUMMARY.md, 40-06-SUMMARY.md]
started: 2026-05-05T11:00:00Z
updated: 2026-05-05T11:30:00Z
---

## Current Test

[testing paused — 1 blocked, 2 skipped, 4 issues outstanding]

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
  status: failed
  reason: "User reported: Fehler beim Laden der Cluster"
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Click on Play-Button in PodcastPlayer starts audio playback for selected episode"
  status: failed
  reason: "User reported: Pass aber folge lässt sich mit play nicht abspielen"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Dashboard NewsCard grid renders cards without vertical overlap; bottom of each card (READ MORE) is fully visible above the next row"
  status: failed
  reason: "User reported: auf dashboard überlappen sich die karten gegenseitig"
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Header LanguageSwitcher exposes DE, EN, AND FR — all three languages selectable per CLAUDE.md and Phase-40 i18n triple-write convention"
  status: failed
  reason: "User reported: Pass aber nur deutsch und englisch zur auswahl im header"
  severity: major
  test: 10
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
