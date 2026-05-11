# Phase 41: GDPR Compliance Hardening — Context

**Gathered:** 2026-05-05
**Status:** Plan saved; **execution blocked on user-provided business data + external AVV signatures**
**Source:** `docs/legal/GDPR-AUDIT.md` Status-Tracking (2026-05-05) — 10 remaining items after Sprint 1 P0 (TOM-FIX-01 + TOM-FIX-02 + DOC-01 erledigt in commits `f990bce` + `92b9342`)

<domain>
## Phase Boundary

Schließt die im DSGVO-Audit (`docs/legal/GDPR-AUDIT.md`) als P1/P2 klassifizierten Restpunkte ab. Drei der Punkte sind **extern blockiert** (warten auf Geschäftsdaten und unterzeichnete AVVs); der Rest ist Code- und Doku-Arbeit.

Phase macht NewsHub aus DSGVO-Sicht produktiv launch-fähig für EU. Sprint 1 P0 hat die Pflichtverstöße geschlossen (Art. 12/15/20 — Datenexport kostenlos und vollständig); diese Phase schließt die nicht-blockierenden P1/P2-Lücken plus die organisatorischen Schritte, sobald die fehlenden Inputs vorliegen.

**IN scope:**
1. **Organisatorische Daten ausfüllen** (ORG-02) — `[FIRMENNAME EINTRAGEN]` / `[ADRESSE EINTRAGEN]` in `docs/legal/PROCESSING-RECORDS.md` und `apps/web/src/pages/Privacy.tsx`. **BLOCKED** auf User-Input (Firmenname, Anschrift, ggf. DSB-Kontakt).
2. **AVV-Unterzeichnung tracken** (ORG-01) — 17 Drittanbieter-AVVs unterzeichnen und Status in `PROCESSING-RECORDS.md` von `☐ Ausstehend` auf `☑ Unterzeichnet (Datum)` umstellen. **BLOCKED** auf externen Beschaffungsprozess.
3. **Privacy.tsx vollständig** (DOC-02) — Aktuell stark gekürzt; alle 24 Verarbeitungstätigkeiten + Drittanbieter-Tabelle + Betroffenenrechte + Beschwerderecht in DE/EN/FR.
4. **Cookie-Policy-Seite** (DOC-03) — Eigene Seite + Banner-Verlinkung; deckt Click-to-Load (YouTube/Vimeo) und Sentry-Session-Cookies ab.
5. **Einwilligungsnachweis** (TOM-FIX-03) — Consent-Banner-Version + Server-Side-Log mit Timestamp. Aktuell wird nur das Result in `localStorage` (`newshub-consent`) gespeichert — kein Server-Audit-Trail (Verstoß gegen Art. 7 Abs. 1 Nachweispflicht).
6. **Transfer-Impact-Assessment** (ORG-03) — Pro US-Drittanbieter dokumentieren (Schrems II), ob das EU-US Data Privacy Framework greift oder Zusatz-Garantien (Verschlüsselung, Pseudonymisierung) nötig sind.
7. **PII-Scrubbing** (TOM-FIX-04 + TOM-FIX-05) — `Sentry.init({ beforeSend })` redaktiert E-Mail/Token/Stripe-IDs aus Frontend + Backend; Logger-Wrapper entfernt PII aus Pino/console-Logs (Email/Token/Query-Parameter wie `?token=abc`).
8. **Age-Gate + T&C-Acknowledgement** (TOM-FIX-06) — Bei Registrierung: Geburtsjahr-Eingabe (Mindestalter 16, DSGVO Art. 8) + Pflicht-Checkbox für AGB/Datenschutz-Akzeptanz mit Versions-Hash.

**NOT in scope:**
- Compliance-Score-Neubewertung (braucht externe DSB-Validierung — separater Prozess)
- DPIA / Datenschutz-Folgenabschätzung (formales DPIA nur falls Profiling/Scoring/automatisierte Entscheidungen mit erheblicher Auswirkung dazukommen — aktuell keine Trigger)
- Auftragsverarbeiter-Audits (Vor-Ort-Prüfungen) — externe Tätigkeit
- Deutsche/österreichische DSB-Anmeldepflicht — Geschäftsdaten-abhängig
- Mobile-Push-Compliance (Phase 41+ Mobile-Push hat eigene Datenfluss-Anforderungen, behandelt wenn Phase 39 Mobile-Backend ausgeführt wird)

</domain>

<decisions>
## Implementation Decisions

### Area A — Organisatorische Daten (ORG-01, ORG-02)

- **D-A1 [BLOCKED]** — `ORG-02` braucht Geschäftsdaten vom Verantwortlichen. Drei Pflichtfelder: **(a) Name des Verantwortlichen** (Firmenname oder Einzelperson bei Solo-Founder), **(b) Anschrift** (Geschäftsadresse mit PLZ/Ort/Land), **(c) DSB-Kontakt** (Datenschutzbeauftragter; bei <250 Mitarbeitern und ohne Kerngeschäft personenbezogene Daten ggf. nicht pflichtig — dann "nicht bestellt; Anfragen an privacy@newshub.app" eintragen). **Ohne diese Daten kann 41-01 nicht ausgeführt werden** — Phase bleibt im Wartemodus.

- **D-A2 [LOCKED]** — `ORG-01` AVV-Unterzeichnung wird in `PROCESSING-RECORDS.md` Sektion 4 als Status getrackt (☐ Ausstehend → ☑ Unterzeichnet YYYY-MM-DD). 17 Anbieter zu unterzeichnen (Stand v1.1): SendGrid, Sentry, OpenRouter, Google (Gemini), Anthropic, DeepL, Google (Translate), Google (OAuth Identity), GitHub (OAuth Identity), Stripe, OpenAI (Whisper), Google (YouTube Data API + Embed), Vimeo, Apple (iTunes Search API), Podcast Index, Apple APNS, Google FCM. **Externer Prozess** — Plan dokumentiert nur den Tracking-Mechanismus.

### Area B — Dokumentation (DOC-02, DOC-03)

- **D-B1 [LOCKED]** — `Privacy.tsx` wird **single source of truth** für die rendered Datenschutzerklärung. i18n-Struktur: jede Sektion (1-12) als eigener i18n-Key in `apps/web/public/locales/{de,en,fr}/privacy.json`. **DE bleibt Master**; EN+FR werden via DeepL-Initial-Translation + manuellem Review erstellt. Inhalte spiegeln 1:1 `PROCESSING-RECORDS.md` Sektionen 2 (Tätigkeiten), 4 (Drittanbieter), 5 (Retention), 6 (Betroffenenrechte) plus Beschwerderecht-Hinweis (Art. 77 — Aufsichtsbehörde) und Kontaktdaten aus ORG-02.

- **D-B2 [LOCKED]** — `Cookie-Policy` wird **eigene Seite** unter `/cookie-policy` (NICHT in Privacy.tsx einbetten — Konvention bei deutschen Landingpages für Anwalts-Kompatibilität). Inhalt: aktuelle Cookie-Liste (essential: `newshub-auth-token`, `nh_sticky` Traefik-Sticky; preferences: `newshub-storage` Zustand-Persist, `newshub-consent`; analytics: keine aktiv; embeds: YouTube/Vimeo bei Click-to-Load — werden erst nach User-Click aktiv) + Verlinkung aus `ConsentBanner` und Footer.

### Area C — Einwilligungsnachweis (TOM-FIX-03)

- **D-C1 [LOCKED]** — Server-Side-Log auf eigene Tabelle `ConsentEvent` (User-ID-optional; bei Pre-Login per anonymer Session-ID). Felder: `id`, `userId?`, `sessionId`, `bannerVersion`, `consents` (JSONB: `{essential, preferences, analytics, marketing}`), `userAgent`, `ipHash` (SHA-256, kein Klartext), `createdAt`. Retention: **3 Jahre** (Verjährungsfrist BGB §195 für Vertragsstreitigkeiten). Endpoint: `POST /api/consent` — Idempotent-Key = `sessionId + bannerVersion`. Bei Banner-Version-Bump wird der User vom `ConsentContext` zum erneuten Bestätigen aufgefordert.

- **D-C2 [LOCKED]** — `bannerVersion` ist eine konstante `CONSENT_BANNER_VERSION` in `apps/web/src/lib/consent.ts`, gepflegt manuell. Bump bei (a) neuer Cookie-Kategorie, (b) neuem Drittanbieter, (c) Änderung der Datenkategorien. Versions-History in `docs/legal/CONSENT-VERSIONS.md`.

### Area D — PII-Scrubbing (TOM-FIX-04, TOM-FIX-05)

- **D-D1 [LOCKED]** — Sentry `beforeSend`-Hook in **beiden** `Sentry.init`-Aufrufen (`apps/web/src/main.tsx` und `apps/web/server/index.ts`). Scrubbt:
  - `event.user.email` → `[redacted-email]`
  - `event.user.username` → ungeändert (User-ID ist Pseudonym)
  - Request-URL Query-Parameter `token`, `verification_token`, `reset_token`, `code`, `state` → `[redacted]`
  - Request-Body bei JSON-Endpunkten: `password`, `token`, `email` (außer in `/api/auth/register|login|reset` — dort kompletter Body droppen)
  - Stack-Trace-Variablennamen: `passwordHash`, `*TokenHash`, `stripeCustomerId`, `stripeSubscriptionId`, `googleIdHash`, `githubIdHash` → `[redacted]`

- **D-D2 [LOCKED]** — Logger-PII-Filter in `apps/web/server/utils/logger.ts` (Pino) als formatter. Regex-basiert — bekannte Felder (siehe D-D1) plus URL-Parameter.  Frontend nutzt `console.log`-Wrapper in `apps/web/src/lib/logger.ts` mit derselben Filter-Logik.

### Area E — Schrems II / Transfer-Impact-Assessment (ORG-03)

- **D-E1 [LOCKED]** — Pro US-Anbieter eigene Markdown-Datei in `docs/legal/tia/{vendor}.md`. Template:
  - 1. Übermittlungs-Beschreibung (welche Daten, Zweck, Frequenz)
  - 2. Rechtsgrundlage (SCCs vs. EU-US Data Privacy Framework)
  - 3. Risiko-Bewertung (US-Surveillance-Reach: FISA 702, EO 12333)
  - 4. Zusätzliche Garantien (Ende-zu-Ende-Verschlüsselung, Pseudonymisierung, Zugriffsbeschränkung)
  - 5. Schlussfolgerung: Übermittlung zulässig?
  - 17 Files (siehe Drittanbieter-Tabelle). Initial-Versionen via Recherche; Final-Review extern (Anwalt).

### Area F — Age-Gate + Acknowledgement (TOM-FIX-06)

- **D-F1 [LOCKED]** — Registrierungs-Form (`/register`) erweitert um **(a) Geburtsjahr-Pflicht-Feld** (number, 4-stellig, Min `currentYear - 120`, Max `currentYear - 16`), **(b) Pflicht-Checkbox** "Ich habe die [Datenschutzerklärung](/privacy) und die [AGB](/terms) gelesen und akzeptiert" mit ungesetzt = Submit-Button disabled. Backend `/api/auth/register` validiert via Zod und speichert `birthYear`, `tcAcceptedAt`, `tcAcceptedVersion` als neue Felder im `User`-Modell. Bei `currentYear - birthYear < 16`: ablehnen mit Hinweis auf Eltern-Einwilligung.

- **D-F2 [DEFERRED]** — Eltern-Einwilligung für 13-15-Jährige (Double-Opt-In via Eltern-E-Mail) ist **explicit out-of-scope** dieser Phase. Stattdessen: Mindestalter 16 (Art. 8 DSGVO Default für Deutschland; einige EU-Länder setzen niedriger an, aber 16 ist die sicherste Annahme). Falls Marktexpansion in Länder mit Min 13 nötig wird, separater Plan.

</decisions>

<requirements>
## Requirements (mapped to GDPR-AUDIT.md Status-Tracking IDs)

| ID | Bezeichnung | Audit-Referenz | Sprint (Audit) |
|----|-------------|----------------|----------------|
| GDPR-01 | Verantwortlicher-Daten ausfüllen | ORG-02 | 1 |
| GDPR-02 | AVV-Tracking + Unterzeichnung | ORG-01 | 1 (extern) |
| GDPR-03 | Privacy.tsx vollständig DE/EN/FR | DOC-02 | 2 |
| GDPR-04 | Cookie-Policy-Seite | DOC-03 | 2 |
| GDPR-05 | Einwilligungsnachweis (Server-Log + Banner-Version) | TOM-FIX-03 | 2 |
| GDPR-06 | Transfer-Impact-Assessment pro US-Anbieter | ORG-03 | 2 |
| GDPR-07 | PII-Scrubbing (Sentry + Logs) | TOM-FIX-04 + TOM-FIX-05 | 3 |
| GDPR-08 | Age-Gate + T&C-Acknowledgement | TOM-FIX-06 | 3 |

</requirements>

<constraints>
## Constraints

- **External blockers:**
  - GDPR-01 / GDPR-02 brauchen **User-Input** bzw. **externe AVV-Beschaffung**. Phase startet die anderen Plans nicht-sequenziell, sobald 41-01 / 41-02 freigegeben sind.
  - GDPR-06 (TIAs) braucht ggf. **Anwalt-Review** für rechtsverbindliche Aussagen — Initial-Versionen können als "Draft" landen, Final-Stempel später.
  - GDPR-08 berührt UI + Auth-Backend + Schema-Migration — nicht zusammen mit anderen Schema-Änderungen pushen (Migration konfliktfrei halten).

- **No regressions allowed:**
  - `/api/account/export` muss kostenlos für FREE bleiben (siehe Sprint-1-Fix `f990bce`)
  - `ConsentBanner` z-index `z-[100]` darf nicht runter — überdeckt zu Recht alle anderen Layer beim First-Visit
  - i18n-Triple-Write (DE/EN/FR) für alle neuen Strings (CC-04 aus Phase 40)

- **Code-Pfad-Regel** (locked, milestone-level): Alle neuen Dateien unter `apps/web/...`, `apps/<other>/...`, `packages/...`, `.github/...`, `.planning/...`, `docs/...`. Keine Schreibvorgänge auf root-Level `server/`, `prisma/`, `src/`.

- **Sentry-Init-Stelle**: `apps/web/server/index.ts` initialisiert Sentry **vor** allen anderen Modul-Imports (siehe Sentry SDK Anforderung). `beforeSend`-Hook muss diese Reihenfolge respektieren.

</constraints>

<dependencies>
## Dependencies

- **Phase 1-40**: Alle Verarbeitungstätigkeiten (2.1-2.24 in PROCESSING-RECORDS.md) bereits dokumentiert in DOC-01 (`92b9342`)
- **Sprint 1 P0** (`f990bce`): `/api/account/export` Tier-Gating-Removal + vollständiger Export — Voraussetzung für `Privacy.tsx` Sektion "Betroffenenrechte"
- **External:** AVV-Templates der 17 Anbieter (meist über Vendor-Portale erreichbar — SendGrid/Twilio: Settings → Legal; Sentry: Account → Legal; Stripe: Dashboard → Compliance; etc.)

</dependencies>

<status>
## Current Status (2026-05-05)

**Phase saved, NOT started.** GDPR-AUDIT.md Status-Tracking gibt 10 Restpunkte:
- 2 ✅ Erledigt: TOM-FIX-01, TOM-FIX-02 (Sprint 1 P0)
- 1 ✅ Erledigt: DOC-01 (`92b9342`)
- 7 ⏳ in dieser Phase abzuhandeln (siehe Plan-Outline)

**Wartet auf:**
1. `[FIRMENNAME EINTRAGEN]` + `[ADRESSE EINTRAGEN]` + ggf. DSB-Kontakt vom User
2. Beschaffung der 17 AVVs (parallel/extern)

**Wenn beide vorhanden** → `/gsd-execute-phase 41` startet Wave 1 (Plan 41-01 + 41-02 dokumentations-only).

</status>
