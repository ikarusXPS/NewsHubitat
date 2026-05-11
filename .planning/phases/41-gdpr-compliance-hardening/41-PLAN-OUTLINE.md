# Phase 41 Plan Outline

**Phase:** 41-gdpr-compliance-hardening
**Phase goal:** Schließe alle nicht-blockierenden P1/P2-Punkte aus `docs/legal/GDPR-AUDIT.md` ab und richte das Tracking-Gerüst für die extern blockierten Items ein. NewsHub erreicht damit eine produktiv-launch-fähige DSGVO-Position für den EU-Markt.
**Mode:** chunked / outline-only
**Generated:** 2026-05-05 — Plan saved, execution wartet auf User-Daten + AVV-Beschaffung
**Plan count:** 7
**Audit-Quelle:** `docs/legal/GDPR-AUDIT.md` Status-Tracking (Stand 2026-05-05)

---

## Plan map

| Plan ID | Objective (1 line) | Wave | Depends On | Audit-Item | Blocked? |
|---------|-------------------|------|-----------|------------|----------|
| 41-01 | Verantwortlicher-Daten in `PROCESSING-RECORDS.md` + `Privacy.tsx` ausfüllen (`[FIRMENNAME]` / `[ADRESSE]` / DSB-Kontakt) | 1 | [] | ORG-02 | **Ja — User-Input** |
| 41-02 | AVV-Tracking-Infra: `docs/legal/avv/` Ordner mit Status-Trackerei pro Anbieter; Update `PROCESSING-RECORDS.md` Sektion 4 von ☐ auf ☑ pro unterzeichnetem AVV | 1 | [] | ORG-01 | **Ja — externe AVV-Beschaffung** |
| 41-03 | `Privacy.tsx` vollständig: alle 24 Tätigkeiten, Drittanbieter-Tabelle, Retention, Betroffenenrechte, Beschwerderecht; i18n DE/EN/FR via `privacy.json` | 2 | [41-01] | DOC-02 | Nein (sobald 41-01 grün) |
| 41-04 | Cookie-Policy-Seite `/cookie-policy` + Banner-Verlinkung + Footer-Link; Cookie-Liste essential/preferences/embeds; i18n DE/EN/FR via `cookies.json` | 2 | [41-01] | DOC-03 | Nein (sobald 41-01 grün) |
| 41-05 | Einwilligungsnachweis: `ConsentEvent` Prisma-Modell + Migration + `POST /api/consent` + Frontend `ConsentContext` ruft Endpoint bei jeder Bestätigung auf; `CONSENT_BANNER_VERSION` Konstante + `docs/legal/CONSENT-VERSIONS.md` | 2 | [41-04] | TOM-FIX-03 | Nein |
| 41-06 | Transfer-Impact-Assessment pro US-Anbieter: 17 Markdown-Files unter `docs/legal/tia/{vendor}.md` mit Template-Struktur (Übermittlung, Rechtsgrundlage, Risiko, Garantien, Schluss) | 3 | [41-02] | ORG-03 | Nein (Draft-First; Anwalt-Review extern) |
| 41-07 | PII-Scrubbing: Sentry `beforeSend` in Frontend (`apps/web/src/main.tsx`) + Backend (`apps/web/server/index.ts`); Pino-Logger-Filter in `server/utils/logger.ts`; Frontend `console`-Wrapper in `src/lib/logger.ts` | 3 | [] | TOM-FIX-04 + TOM-FIX-05 | Nein |
| 41-08 | Age-Gate + Acknowledgement: `birthYear`/`tcAcceptedAt`/`tcAcceptedVersion` Schema-Migration + Register-Form Felder + Zod-Validierung + Mindestalter 16 + ablehnung bei `< 16` | 3 | [41-03] | TOM-FIX-06 | Nein (sobald 41-03 grün — verlinkt /privacy) |

> Plan-Count nominal **7** (siehe oben), tatsächlich **8** weil 41-07 zwei Audit-IDs bündelt (TOM-FIX-04 + TOM-FIX-05 — beide redundant zur PII-Scrubbing-Logik). Trennung schaffen würde künstlich zwei Plans für eine Feature-Klammer erzeugen.

---

## Wave structure

```
Wave 1 (Org-Daten-blockiert):
  41-01 (Verantwortlicher-Daten)            ← BLOCKED on user
  41-02 (AVV-Tracking-Infra)                ← BLOCKED on external AVVs

Wave 2 (Doku + Consent):
  41-03 (Privacy.tsx)                       ← depends on 41-01
  41-04 (Cookie-Policy-Seite)               ← depends on 41-01
  41-05 (Einwilligungsnachweis)             ← depends on 41-04 (Cookie-Liste konsistent)

Wave 3 (Härtung):
  41-06 (TIA pro US-Anbieter)               ← depends on 41-02 (AVV-Status)
  41-07 (PII-Scrubbing Sentry + Logs)       ← unabhängig, parallel ausführbar
  41-08 (Age-Gate + T&C-Akzeptanz)          ← depends on 41-03 (Verlinkung /privacy)
```

**Parallelism:**
- Wave 1: 41-01 + 41-02 parallel (verschiedene Files, beide blockiert)
- Wave 2: 41-03 + 41-04 parallel (verschiedene Files), 41-05 wartet auf 41-04
- Wave 3: 41-06 + 41-07 parallel, 41-08 wartet auf 41-03

**File-ownership check:**
- 41-01 owns: `docs/legal/PROCESSING-RECORDS.md` (Sektion 1 only), `apps/web/src/pages/Privacy.tsx` (Imprint-Sektion only)
- 41-02 owns: `docs/legal/avv/` (new dir), `docs/legal/PROCESSING-RECORDS.md` (Sektion 4 only)
- **Detected overlap:** 41-01 + 41-02 + 41-03 alle könnten `PROCESSING-RECORDS.md` editieren. Resolved durch Sektion-Ownership: 41-01 = Sektion 1, 41-02 = Sektion 4, 41-03 = nur lesend (referenziert)
- 41-03 owns: `apps/web/src/pages/Privacy.tsx` (Hauptinhalt), `apps/web/public/locales/{de,en,fr}/privacy.json`
- 41-04 owns: `apps/web/src/pages/CookiePolicy.tsx` (new), `apps/web/public/locales/{de,en,fr}/cookies.json`, `apps/web/src/components/ConsentBanner.tsx` (Verlinkung), `apps/web/src/components/Footer.tsx` (Verlinkung)
- 41-05 owns: `apps/web/prisma/schema.prisma` (`ConsentEvent` model), `apps/web/server/routes/consent.ts` (new), `apps/web/src/contexts/ConsentContext.tsx`, `apps/web/src/lib/consent.ts` (new), `docs/legal/CONSENT-VERSIONS.md` (new)
- 41-06 owns: `docs/legal/tia/*.md` (17 new files)
- 41-07 owns: `apps/web/server/index.ts` (Sentry-Init beforeSend), `apps/web/src/main.tsx` (Sentry-Init beforeSend), `apps/web/server/utils/logger.ts`, `apps/web/src/lib/logger.ts` (new)
- 41-08 owns: `apps/web/prisma/schema.prisma` (`User.birthYear/tcAcceptedAt/tcAcceptedVersion`), `apps/web/src/pages/Register.tsx`, `apps/web/server/routes/auth.ts` (register-handler), `apps/web/server/openapi/schemas.ts` (RegisterSchema)

**No same-wave file overlap.** Schema-Änderungen in 41-05 (ConsentEvent) und 41-08 (User-Felder) sind in verschiedenen Waves — keine Migration-Konflikte.

---

## Coverage check

Alle 8 Audit-Items aus `GDPR-AUDIT.md` Status-Tracking sind in einem Plan abgedeckt:

| Audit-ID | Plan |
|----------|------|
| ORG-02 | 41-01 |
| ORG-01 | 41-02 |
| DOC-02 | 41-03 |
| DOC-03 | 41-04 |
| TOM-FIX-03 | 41-05 |
| ORG-03 | 41-06 |
| TOM-FIX-04 | 41-07 |
| TOM-FIX-05 | 41-07 |
| TOM-FIX-06 | 41-08 |

**Coverage status:** ✓ Alle Restpunkte erfasst.

---

## Notes

### Blocked-Plans-Dokumentation

41-01 und 41-02 sind als **BLOCKED** markiert weil sie auf nicht-Code-Inputs warten. Der Phase-Start braucht keinen `/gsd-execute-phase 41`-Aufruf — stattdessen:

1. Sobald User Firmenname/Adresse/DSB-Kontakt liefert: `/gsd-execute-plan 41-01` (5-min-Edit, keine Code-Änderungen)
2. AVVs werden im Hintergrund unterzeichnet — pro unterzeichnetem AVV ein Status-Update in `PROCESSING-RECORDS.md` und `docs/legal/avv/{vendor}.md` Tracker
3. Wenn 41-01 grün → Wave 2 (41-03 + 41-04 parallel) ausführbar

### Externe Validierung

Diese Phase liefert **technische und dokumentarische Compliance** — der Compliance-Score in `GDPR-AUDIT.md` Sektion 0 wird **nicht** durch die Phase neu bewertet, weil die Bewertung externe DSB- oder Anwalt-Review braucht. Nach Abschluss der Phase ist ein **Folge-Audit** angemessen (Empfehlung: `/gdpr-check` mit Fokus "Re-Audit nach Sprint 1-3").

### Kein DPIA dieser Phase

DSGVO Art. 35 (Datenschutz-Folgenabschätzung) ist erst pflichtig bei "wahrscheinlich hohem Risiko" — Trigger sind systematische Profiling/Scoring/Automatisierte Entscheidungen mit erheblicher Wirkung auf Betroffene. NewsHub trifft keinen dieser Trigger (KI-Analysen sind statistisch und nicht entscheidungs-relevant für die Person). DPIA bleibt out-of-scope dieser Phase; falls in Zukunft Personalisierungs-Algorithmen mit User-Profiling dazukommen, eigener Plan.

### Cross-cutting (nicht je Plan dupliziert)

- **CC-01** (i18n-Triple-Write) — alle neuen User-facing Strings in DE/EN/FR (Phase 40 CC-04 Konvention)
- **CC-02** (Schreibpfad-Restriktion) — neue Dateien nur unter `apps/web/...`, `packages/...`, `.github/...`, `.planning/...`, `docs/...` (CLAUDE.md anti-pattern)
- **CC-03** (No-Regression auf P0-Fixes) — `/api/account/export` bleibt kostenlos; `ConsentBanner` z-index bleibt 100; sensible Tokens bleiben aus Export ausgeschlossen
- **CC-04** (Migration-Sicherheit) — `41-05` (ConsentEvent) und `41-08` (User.birthYear/tcAccepted*) liefern jeweils eine eigene Migration; nicht in eine bündeln, damit Rollback granular ist
