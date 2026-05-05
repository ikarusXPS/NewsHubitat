# DSGVO-Audit: NewsHub

**Stand:** 2026-05-05
**Scope:** Gesamtplattform (web + mobile + backend), Milestone v1.6
**Methodik:** Code-Review (`apps/web/`, Prisma-Schema, Routes, Services), Abgleich gegen `docs/legal/PROCESSING-RECORDS.md` v1.0
**Disclaimer:** Keine Rechtsberatung. Vor EU-Launch von DSB / Datenschutzanwalt freigeben lassen.

## Compliance-Score: 5.5 / 10

**Begründung:** Solide technische Grundlage (Consent-Banner, automatisierte Löschung, IP-Hashing, JWT-Versionierung, Cascade-Delete), aber **drei harte Verstöße** (Tier-gated Datenexport, unvollständiger Export, keine Einwilligungsnachweis-Speicherung) und **größere Dokumentationslücken** (Phase 38/40 fehlen vollständig im Verarbeitungsverzeichnis, alle AVVs als "Ausstehend" markiert). Vor produktivem EU-Launch ist Sanierung der P1-Punkte zwingend erforderlich.

---

## 1. Dateninventar (Aktualisiert vs. Code-Stand 2026-05-05)

### 1.1 Kontoverwaltung

| Datentyp | Modell | Rechtsgrundlage | Speicherdauer | Empfänger | Status |
|----------|--------|-----------------|---------------|-----------|--------|
| E-Mail, Name, Passwort-Hash | `User` | Art. 6(1)(b) Vertrag | Bis Löschung + 7d Karenz | SendGrid (Verifizierung) | ✓ Dokumentiert |
| Verifizierungs-/Reset-Token (SHA-256) | `User.verificationTokenHash`, `User.resetTokenHash` | Art. 6(1)(b) | 24h / 1h | — | ✓ Dokumentiert |
| OAuth-Provider-ID (SHA-256-Hash) | `User.googleIdHash`, `User.githubIdHash` | Art. 6(1)(a) Einwilligung | Bis Account-Löschung | Google, GitHub (USA) | ⚠ Hash-Strategie ist gut, **fehlt im Verarbeitungsverzeichnis** |
| Stripe-Customer-ID, Subscription-Status | `User.stripeCustomerId`, `subscriptionTier`, `subscriptionStatus`, `pausedUntil` | Art. 6(1)(b) + 6(1)(c) | Bis Löschung + Aufbewahrungspflichten (HGB §257: 10J Rechnungen) | Stripe (USA) | ❌ **Fehlt komplett im Verarbeitungsverzeichnis** |
| Studentenstatus + Verifizierungsdokument | `StudentVerification.documentUrl` | Art. 6(1)(b) | Bis Genehmigung/Ablehnung | Reviewer (intern) | ❌ **Fehlt** |
| Referral-Code, Belohnungen | `User.referralCode`, `ReferralReward` | Art. 6(1)(b) | Cascade bei Löschung beider Parteien | — | ❌ **Fehlt** |
| Custom Persona / Avatar | `UserPersona`, `User.avatarUrl`, `User.customAccentColor` | Art. 6(1)(b) | Cascade | Cloudinary (avatar uploads) | ⚠ Cloudinary nicht in Drittanbieter-Liste |

### 1.2 Inhaltsbezogene Verarbeitung

| Datentyp | Modell | Rechtsgrundlage | Speicherdauer | Empfänger | Status |
|----------|--------|-----------------|---------------|-----------|--------|
| Lesehistorie | `ReadingHistory` | Art. 6(1)(a) Einwilligung (analytics-Kategorie) | Cascade; pausierbar via `isHistoryPaused` | — | ✓ |
| Lesezeichen | `Bookmark` | Art. 6(1)(b) | Cascade | — | ✓ |
| Kommentare | `Comment` | Art. 6(1)(b) | Cascade; soft-delete via `isDeleted` | AI-Moderation (`aiModerated` Flag → externe AI?) | ❌ **Fehlt** |
| Team-Mitgliedschaften, Team-Bookmarks, Team-Invites | `TeamMember`, `TeamBookmark`, `TeamInvite` | Art. 6(1)(b) | Cascade; Token 7d | — | ❌ **Fehlt** |
| Fact-Check-Anfragen + Verdikt + Methodik | `FactCheck.userId`, `claimText`, `verdict`, `methodologyMd` | Art. 6(1)(b) | Cascade bei User-Löschung | OpenRouter / Gemini / Anthropic (USA) | ❌ **Fehlt (Phase 38)** |
| Source-Credibility-Cache | (Cache-only, keine Personenbeziehung) | Art. 6(1)(f) | 5min Redis-TTL | OpenRouter / Gemini | ✓ Keine PII |
| Gamification (XP, Badges, Leaderboard-Snapshots) | `UserBadge`, `LeaderboardSnapshot` | Art. 6(1)(b); Leaderboard nur bei `showOnLeaderboard=true` | Cascade; Snapshot nicht-personell | — | ✓ |

### 1.3 Drittanbieter-Inhalte (keine User-PII, aber relevante Verarbeitung)

| Datentyp | Modell | Rechtsgrundlage | Speicherdauer | Empfänger | Status |
|----------|--------|-----------------|---------------|-----------|--------|
| RSS-Artikel + Übersetzungen | `NewsArticle`, JSONB `titleTranslated/contentTranslated` | Art. 6(1)(f) berecht. Interesse | bis Cleanup | DeepL (EU), Google Translate (US) | ✓ Translation dokumentiert |
| Podcasts/Episoden (Phase 40) | `Podcast`, `PodcastEpisode` | Art. 6(1)(f) | unbestimmt | iTunes API, Podcast Index API | ❌ **Fehlt** |
| Videos (Phase 40) | `Video` | Art. 6(1)(f) | unbestimmt | YouTube Data API | ❌ **Fehlt** |
| Transkripte (Phase 40) | `Transcript.fullText`, `segments` (JSONB) | Art. 6(1)(b) für eigene Whisper-Transkriptionen, 6(1)(f) für YouTube-Captions | unbestimmt | Whisper API (OpenAI), YouTube Caption Extractor | ❌ **Fehlt** |

### 1.4 Sicherheits-/Analytics-Daten

| Datentyp | Modell | Rechtsgrundlage | Speicherdauer | Empfänger | Status |
|----------|--------|-----------------|---------------|-----------|--------|
| Share-Clicks (IP-Hash, UA, Referrer) | `ShareClick` | Art. 6(1)(f) | 90 Tage automatisch (`cleanupService.ts:188`) | — | ✓ |
| API-Key-Nutzung | `ApiKey.lastUsedAt`, `requestCount` | Art. 6(1)(b) | Cascade | — | ❌ **Fehlt** |
| Push-Token (Mobile) | gespeichert wo? (zu prüfen) | Art. 6(1)(a) | Bis Token-Widerruf | FCM (Google), APNS (Apple) | ❌ **Fehlt** |
| Sentry-Errors | externe Speicherung | Art. 6(1)(f) | 90d | Sentry (USA) | ✓ Dokumentiert, **aber ohne Scrubbing-Config** |
| JWT-Blacklist | Redis | Art. 6(1)(b) | 7d TTL | — | ✓ |

---

## 2. Compliance-Status

### ✅ Erfüllt
- **Verschlüsselung in Transit** — TLS 1.3 erzwungen
- **Passwort-Hashing** — bcrypt cost 10, min. 12 Zeichen (`authService.ts:42`)
- **Token-Hashing** — Verifizierung/Reset/OAuth-IDs SHA-256 in DB (`User.verificationTokenHash`, `googleIdHash`)
- **JWT-Versionierung** — `tokenVersion` invalidiert alle Sessions bei Passwort-Wechsel (`authService.ts:484`)
- **Automatisierte Löschung** — `cleanupService.ts` läuft täglich: unverifizierte Accounts (30d), ShareClick (90d), Account-Löschung mit 7d-Karenz inkl. Reminder-Mails an 7d und 1d
- **IP-Anonymisierung** — Share-Click speichert nur `ipHash` (`schema.prisma:423`)
- **Cascade-Delete** — User-Löschung cascadiert auf Bookmarks, ReadingHistory, Comments, TeamMemberships, Badges, FactChecks, ApiKeys, ReferralRewards
- **Soft-Delete + Karenzzeit** — `deletionRequestedAt`-Feld + 7-Tage-Frist + Cancel-Endpoint
- **Consent-Banner** — 3 Kategorien (essential / preferences / analytics), Default opt-in nur essential, granulare Widerruf-Routine mit `clearPreferencesStorage()` und `clearAnalyticsStorage()`
- **Rate-Limiting** — Tiered (auth 5/min, AI 10/min, news 100/min)
- **History-Pause** — Art. 18 (Einschränkung) implementiert via `isHistoryPaused`
- **Disposable-Email-Block** bei Registrierung

### ⚠️ Teilweise erfüllt
- **Datenexport (Art. 15 + 20)** — Endpoint existiert, aber **unvollständig** (siehe P1-1) und **Tier-gated** (siehe P0-1)
- **Verarbeitungsverzeichnis (Art. 30)** — Existiert (`PROCESSING-RECORDS.md`), aber Stand 2026-04-23 → **8 Verarbeitungstätigkeiten fehlen** (Phase 38/40, Stripe-Subscriptions im Detail, Teams, API-Keys, Referrals, StudentVerification, Comments, Mobile-Push)
- **Drittanbieter-Liste** — 6 Anbieter erfasst, aber **mind. 7 weitere fehlen** (Stripe, Cloudinary, Whisper/OpenAI, YouTube, iTunes, Podcast Index, FCM/APNS)
- **Privacy-Seite** (`Privacy.tsx`) — existiert, aber mit Platzhaltern `[Firmenname]` / `[Company Name]`
- **Sentry PII-Scrubbing** — Default-Masking aktiv, aber **kein expliziter `beforeSend`-Hook** zum Redacting von `req.body.email`, `req.body.password`, `Authorization`-Headers
- **Cookie-Banner-Sprache** — Banner ist da, aber Granularität "preferences" mischt Theme + Sprache + Filter (alles vermutlich Art. 6(1)(b) Vertrag, kein echter Consent nötig — könnte vereinfacht werden)

### ❌ Nicht erfüllt
- ~~**P0-1 Tier-gated Datenexport**~~ — ✅ **Erledigt** (Sprint 1, siehe Status-Tracking unten). JSON+CSV jetzt für alle authentifizierten Nutzer frei; PDF bleibt PREMIUM-gated als Komfortformat.
- ~~**P0-2 Unvollständiger Datenexport**~~ — ✅ **Erledigt** (Sprint 1, siehe Status-Tracking unten). Export umfasst jetzt alle 14 User-Relations + Profil-/Subscription-/Privacy-Felder. Sensible Tokens (passwordHash, *TokenHash, googleIdHash, githubIdHash, stripeCustomerId, stripeSubscriptionId, ApiKey.keyHash) bewusst ausgeschlossen.
- **P1-3 Kein Einwilligungsnachweis** — `ConsentContext.tsx:49-55` speichert nur das Consent-Objekt, **kein Timestamp, keine Banner-Version, kein Hash zur Beweisführung**. Art. 7 Abs. 1 verlangt Nachweispflicht der Einwilligung.
- **P1-4 Keine Re-Consent-Versionierung** — Bei Datenschutz-Änderungen werden Bestandsnutzer nicht erneut gefragt. Bei materieller Änderung ist Re-Einwilligung nötig.
- **P1-5 Verarbeitungsverzeichnis stark veraltet** — siehe Liste oben (8 Verarbeitungstätigkeiten + 7 Drittanbieter fehlen)
- **P1-6 AVVs alle "Ausstehend"** — `PROCESSING-RECORDS.md:209-217`: alle 6 gelisteten Drittanbieter (SendGrid, Sentry, OpenRouter, Google Gemini, Anthropic, DeepL) zeigen `☐ Ausstehend` für DPA. Drittland-Übermittlung ohne Rechtsgrundlage = Art. 44 Verstoß.
- **P1-7 Verantwortlicher-Felder leer** — `PROCESSING-RECORDS.md:14-17` enthält noch Platzhalter `[FIRMENNAME EINTRAGEN]` / `[ADRESSE EINTRAGEN]`. Identische Lücke in `Privacy.tsx`.
- **P2-8 PII in Logs** — `authService.ts:115` loggt `verification:sent email=${user.email}`. `queryCounter.ts:30` (dev) loggt SQL-Parameter, die User-Daten enthalten können. Selbst wenn dev-only, ist Risiko nicht null wenn Logs zentralisiert werden.
- **P2-9 Kein Age-Gate / Art. 8 DSGVO** — Keine Geburtsdatumsabfrage, keine elterliche Einwilligung für Minderjährige unter 16 (DE). Risiko bei DACH-Markt.
- **P2-10 Keine T&C/Privacy-Acknowledgement bei Registrierung** — Kein `acceptedTermsAt` / `acceptedPrivacyAt`-Timestamp. Bei Streit kein Beweis, dass Nutzer zugestimmt hat.

---

## 3. Risiko-Analyse

| ID | Risiko | Wahrscheinlichkeit | Impact | Priorität |
|----|--------|-------------------|--------|-----------|
| P0-1 | Aufsichtsbehörde-Beschwerde wegen Tier-gated Auskunft (Art. 15 + 12 Abs. 5) | **Hoch** (jeder FREE-User kann Beschwerde einlegen) | **Hoch** (4% Jahresumsatz Bußgeld; Reputationsschaden) | **P0** |
| P0-2 | Unvollständiger Datenexport → Aufsichtsbeschwerde Art. 15 | **Hoch** | **Hoch** (gleiche Bußgeldlogik) | **P0** |
| P1-3 | Beweisnot bei Consent-Streit (kein Timestamp/Version) | **Mittel** | **Hoch** (Beweislast bei Verantwortlichem) | **P1** |
| P1-4 | Bestandsnutzer auf veraltetem Consent (Re-Consent fehlt) | **Mittel** (bei nächster Policy-Änderung) | **Mittel** | **P1** |
| P1-5 | Verarbeitungsverzeichnis nicht aktuell (Art. 30) | **Hoch** (bei Audit) | **Mittel** (Bußgeld bis 10M / 2%) | **P1** |
| P1-6 | Drittlandtransfer ohne unterzeichneten AVV/SCC (Art. 44ff.) | **Hoch** (jede SendGrid/OpenAI/Anthropic-Anfrage) | **Hoch** (4% Bußgeld; Schrems-II-Risiko) | **P1** |
| P1-7 | Datenschutzerklärung mit Platzhaltern unbenutzbar | **Hoch** (jede Privacy-Page-Aufruf) | **Mittel** (Abmahnrisiko durch Wettbewerber/Verbände) | **P1** |
| P2-8 | Email-Logs könnten bei zentraler Log-Sammlung zur PII werden | Niedrig | Mittel | **P2** |
| P2-9 | Minderjährige ohne Einwilligung (Art. 8) | Mittel | Mittel | **P2** |
| P2-10 | Keine Beweisbarkeit von T&C-Zustimmung | Niedrig | Niedrig | **P2** |
| P3-11 | Inkonsistente Mobile-Push-Token-Behandlung | Niedrig | Niedrig | **P3** |
| P3-12 | Sentry-Breadcrumbs könnten User-PII enthalten | Niedrig (Sentry hat Default-Masking) | Mittel | **P3** |

**Bußgeld-Rahmen:** Art. 83 DSGVO — bis 4% des weltweiten Jahresumsatzes oder €20M (je nachdem, was höher ist) für Verstöße gegen Art. 5/6/9/12-22/44ff.

---

## 4. Drittanbieter-Analyse (Vollständig)

| Anbieter | Zweck | Standort | AVV vorhanden | SCCs nötig | Status | Hinweis |
|----------|-------|----------|---------------|------------|--------|---------|
| **SendGrid (Twilio)** | E-Mail (Verifizierung, Reset, Digests, Team-Invites) | USA | ☐ Ausstehend | Ja | ❌ | Twilio bietet Standard-DPA + EU-SCCs an (https://www.twilio.com/legal/data-protection-addendum) — Download + Unterschrift erforderlich |
| **Sentry** | Error-Tracking | USA | ☐ Ausstehend | Ja | ❌ | Sentry-DPA über Settings → Legal & Compliance herunterladbar |
| **OpenRouter** | AI-Routing (primär) | USA | ☐ Ausstehend | Ja | ❌ | OpenRouter ist ein Aggregator → DPA nötig + Sub-Processor-Liste prüfen (welche Models werden tatsächlich aufgerufen?) |
| **Google (Gemini)** | AI-Analyse (sekundär) | USA | ☐ Ausstehend | Ja | ❌ | Google Cloud DPA gilt; muss in Google-Cloud-Konto akzeptiert werden |
| **Anthropic** | AI-Premium-Fallback | USA | ☐ Ausstehend | Ja | ❌ | Anthropic DPA bei Commercial-Vertrag; Free Tier hat eigene ToS |
| **DeepL** | Übersetzung | DE/EU | ☐ Ausstehend | Nein | ❌ | EU-Anbieter, DPA dennoch erforderlich (DSGVO Art. 28) |
| **Google Translate** | Übersetzungs-Fallback | USA | ☐ Ausstehend | Ja | ❌ | Google-Cloud-DPA, sonst Nutzung einstellen und nur DeepL+LibreTranslate |
| **Stripe** | Payment-Processing | USA / EU | **Implizit** (Stripe ist Verantwortlicher für Payment-Daten, nicht Auftragsverarbeiter) | — | ⚠ | Stripe agiert als gemeinsam Verantwortlicher für Zahlungsdaten — hier gilt Art. 26 (Joint Controller Agreement), kein klassischer AVV |
| **Cloudinary** (Avatar-Upload) | Medien-CDN | USA / EU | ☐ Unbekannt | Ja (USA) | ❌ | **Nicht in Verarbeitungsverzeichnis** — falls EU-Region gewählt: weniger Aufwand |
| **OpenAI Whisper** (Phase 40) | Audio→Text-Transkription | USA | ☐ Unbekannt | Ja | ❌ | **Nicht in Verarbeitungsverzeichnis** — schickt potentiell User-bezogene Audioinhalte |
| **YouTube Data API** (Phase 40) | Video-Metadaten + Captions | USA | ☐ Unbekannt | Ja | ❌ | Google-DPA |
| **iTunes / Apple** (Phase 40) | Podcast-Metadaten | USA | ☐ Unbekannt | Ja | ❌ | Nur Read-Only-Metadaten, geringes Risiko, dennoch dokumentieren |
| **Podcast Index** (Phase 40) | Podcast-Metadaten | USA / community-run | ☐ Unbekannt | Ja | ❌ | Open-Source-Service; dokumentieren |
| **FCM (Google)** + **APNS (Apple)** (Mobile Phase 39) | Push-Notifications | USA | ☐ Unbekannt | Ja | ❌ | Push-Token-Verarbeitung dokumentieren |
| **Google OAuth** (Login) | Identitätsanbieter | USA | gemeinsam Verantwortlicher | — | ⚠ | OAuth-Login erfordert Hinweis in Datenschutzerklärung |
| **GitHub OAuth** (Login) | Identitätsanbieter | USA (Microsoft) | gemeinsam Verantwortlicher | — | ⚠ | analog Google |
| **OpenStreetMap-Tiles** (Leaflet, Event-Map) | Karten-Tiles | EU (OSM-FR) | implizit (CC-BY-SA) | Nein | ✓ | OSM ist EU-basiert; Tile-Server protokolliert IPs — Hinweis in Privacy nötig |

**Drittland-Bilanz:** 12 von 17 gelisteten Anbietern haben US-Standort. Nach Schrems-II-Urteil reichen Standardvertragsklauseln allein nicht — zusätzliche **Transfer-Impact-Assessments (TIA)** und ggf. zusätzliche Schutzmaßnahmen (Verschlüsselung) erforderlich.

---

## 5. Maßnahmen-Plan

### Technische Maßnahmen (TOM) — Priorität P0/P1

#### TOM-FIX-01 — Tier-Gating beim Datenexport entfernen (P0)
- **Datei:** `apps/web/server/routes/account.ts:85-108`
- **Aktion:** Entfernen der Tier-Prüfung. Datenexport für **alle authentifizierten Nutzer** (FREE inklusive) verfügbar machen. PDF-Export kann optional Premium bleiben (Format-Komfort), aber JSON+CSV müssen frei sein.
- **Test:** E2E-Test der bestätigt, dass FREE-User `200 OK` und vollständiges JSON erhalten

#### TOM-FIX-02 — Datenexport vervollständigen (P0)
- **Datei:** `apps/web/server/routes/account.ts:112-148`
- **Aktion:** Erweitere `prisma.user.findUnique({ select: ... })` um:
  - `readingHistory` (gefiltert wo `isHistoryPaused`-aware)
  - `comments`
  - `teamMemberships` + `teamBookmarks` (über `team` relation)
  - `factChecks` (Phase 38)
  - `emailSubscription` + `emailDigests`
  - `apiKeys` (ohne `keyHash`!)
  - `referralRewards` (referrer + referred)
  - `userPersona`
  - `studentVerification` (ohne `documentUrl` — sensibler Inhalt; oder mit Pseudonymisierung)
  - `subscriptionTier`, `subscriptionStatus`, `pausedUntil`
  - `avatarUrl`, `customAccentColor`, `isHistoryPaused`, `language` (aus `User`)
  - `stripeCustomerId` → optional pseudonymisiert anbieten oder weglassen
- **Format:** JSON sollte gut lesbar sein (verschachtelt, mit Beschreibungen). CSV bleibt tabular.
- **Test:** Snapshot-Test des Export-Schemas pro Nutzer-Typ

#### TOM-FIX-03 — Einwilligungsnachweis speichern (P1)
- **Datei:** `apps/web/src/contexts/ConsentContext.tsx:49-55`
- **Aktion:** Erweitere `ConsentState` um:
  - `decidedAt: string` (ISO-Timestamp)
  - `bannerVersion: string` (z.B. `'1.0'` als Konstante; bei Policy-Änderung erhöhen)
  - `userAgent?: string` (optional, für Beweissicherung — abwägen vs. Datensparsamkeit)
- **Persistenz:** Zusätzlich zum localStorage **server-side log** für eingeloggte Nutzer (z.B. `ConsentLog`-Tabelle mit `userId`, `consentJson`, `timestamp`, `bannerVersion`, `ipHash`).
- **Re-Consent-Logik:** Bei Mismatch zwischen `bannerVersion` im LocalStorage und `CURRENT_BANNER_VERSION`-Konstante → Banner erneut zeigen.

#### TOM-FIX-04 — Sentry-PII-Scrubbing (P2)
- **Datei:** `apps/web/server/index.ts` (wo Sentry initialisiert wird)
- **Aktion:** `Sentry.init({ ..., beforeSend: (event) => { /* redact email/password/Authorization in event.request */ return event; } })`
- **Frontend:** identisch in `apps/web/src/main.tsx` (Browser-Sentry-Init)

#### TOM-FIX-05 — Email/Token aus Logs entfernen (P2)
- **Datei:** `apps/web/server/services/authService.ts:115` (und ähnliche)
- **Aktion:** Ersetze `email=${user.email}` durch `userId=${user.id}` oder `emailHash=${sha256(email).slice(0,8)}`
- **Auch:** `apps/web/server/middleware/queryCounter.ts:30` — Parameter aus dev-logs entfernen oder redacten

#### TOM-FIX-06 — Age-Gate / T&C-Acknowledgement (P2)
- **Schema:** `User.acceptedTermsAt: DateTime?`, `User.acceptedPrivacyAt: DateTime?`, `User.birthYear: Int?` (nicht volles Geburtsdatum — Datensparsamkeit)
- **Frontend:** Registrierungsformular mit Checkboxen (Pflicht) und Geburtsjahr-Auswahl. Bei `birthYear < currentYear - 16` → Hinweis zu elterlicher Einwilligung
- **Backend:** Registration-Endpoint setzt Timestamps; blockt < 16 ohne Eltern-Einwilligungs-Flow

### Organisatorische Maßnahmen — Priorität P1

#### ORG-01 — AVVs unterzeichnen
- SendGrid (Twilio): https://www.twilio.com/legal/data-protection-addendum (Online-Abschluss möglich)
- Sentry: Account → Settings → Legal & Compliance
- Google (Gemini + Translate): in Google Cloud Console akzeptieren
- OpenRouter: per E-Mail anfragen
- Anthropic: bei Commercial-Account; Free-Tier nicht für PII nutzen
- DeepL: per Kontaktformular anfragen
- **Zeitrahmen:** 2 Wochen vor Launch

#### ORG-02 — Verantwortlicher-Daten ausfüllen
- `docs/legal/PROCESSING-RECORDS.md:14-17` — Firmenname, Adresse, Datenschutzbeauftragter (DSB)
- `apps/web/src/pages/Privacy.tsx` — gleiche Felder
- Falls Mitarbeiter > 20 oder regelmäßige PII-Verarbeitung in DE: **DSB benennen** (DSGVO Art. 37 + BDSG §38)

#### ORG-03 — Transfer-Impact-Assessment (Schrems II)
- Pro US-Drittanbieter: Bewertungsschritt — Welche Daten? Sind US-Behörden zugreifend (FISA 702)? Welche zusätzlichen Schutzmaßnahmen (Verschlüsselung, Pseudonymisierung)?
- Vorlage: EDPB Recommendations 01/2020

### Status-Tracking

| ID | Maßnahme | Status | Commit | Datum |
|----|----------|--------|--------|-------|
| TOM-FIX-01 | Tier-Gating Datenexport entfernen | ✅ Erledigt | (siehe folgender Commit) | 2026-05-05 |
| TOM-FIX-02 | Datenexport vollständig (alle 14 User-Relations + Profil-/Privacy-/Subscription-Felder) | ✅ Erledigt | (siehe folgender Commit) | 2026-05-05 |
| TOM-FIX-03 | Einwilligungsnachweis (Timestamp + Banner-Version + Server-Side-Log) | ⏳ Sprint 2 | — | — |
| TOM-FIX-04 | Sentry `beforeSend`-Scrubbing (Frontend + Backend) | ⏳ Sprint 3 | — | — |
| TOM-FIX-05 | PII aus Logs entfernen (Email/Token/Query-Parameter) | ⏳ Sprint 3 | — | — |
| TOM-FIX-06 | Age-Gate (Geburtsjahr) + T&C/Privacy-Acknowledgement bei Registrierung | ⏳ Sprint 3 | — | — |
| ORG-01 | AVVs unterzeichnen (SendGrid, Sentry, OpenRouter, Google, Anthropic, DeepL, Cloudinary) | ⏳ Sprint 1 (extern) | — | — |
| ORG-02 | Verantwortlicher-Daten ausfüllen (`PROCESSING-RECORDS.md` + `Privacy.tsx`) | ⏳ Sprint 1 | — | — |
| ORG-03 | Transfer-Impact-Assessments pro US-Anbieter | ⏳ Sprint 2 | — | — |
| DOC-01 | `PROCESSING-RECORDS.md` v1.1 (Phase 14/26/28/35/36-36.4/38/40 + Phase-41+ Mobile-Push als Tätigkeiten 2.12-2.24; Drittanbieter um Stripe, OpenAI, YouTube/Vimeo, iTunes, Podcast Index, APNS, FCM, GitHub/Google-OAuth, Google Translate erweitert; TOM-11..13 + Retention-Schedule um Webhook-Idempotenz/Team-Invites/Studenten/Whisper-Tempfiles ergänzt) | ✅ Erledigt | (siehe folgender Commit) | 2026-05-05 |
| DOC-02 | `Privacy.tsx` vollständig + DE/EN/FR-Übersetzungen | ⏳ Sprint 2 | — | — |
| DOC-03 | Cookie-Policy-Seite | ⏳ Sprint 2 | — | — |

> **Hinweis:** Compliance-Score in Sektion 0 wird in einem Folge-Audit (nach Sprint-2-Abschluss) neu bewertet, da nicht alle P0/P1-Maßnahmen rein technisch sind und externe Validierung (DSB/Anwalt) brauchen.

### Dokumentation — Priorität P1

#### DOC-01 — Verarbeitungsverzeichnis aktualisieren
- Datei: `docs/legal/PROCESSING-RECORDS.md`
- Neue Einträge hinzufügen (siehe ❌-Liste in Sektion 2):
  - 2.12 Stripe-Subscriptions (Customer-ID, Subscription-Daten, Webhook-Verarbeitung, HGB-Aufbewahrung 10J)
  - 2.13 Team-Kollaboration (Members, Invites, Bookmarks)
  - 2.14 Public API Keys (Developer-Zugang, Rate-Limit-Logs)
  - 2.15 Referral-System
  - 2.16 Studenten-Verifizierung (sensible Dokumenten-Uploads)
  - 2.17 Custom Personas (`UserPersona`)
  - 2.18 Comments mit AI-Moderation
  - 2.19 Fact-Check (Phase 38) — Nutzeranfragen → AI-Provider
  - 2.20 Source-Credibility (Phase 38)
  - 2.21 Podcasts/Videos/Transkripte (Phase 40) — externe APIs
  - 2.22 Mobile Push (Phase 39) — FCM/APNS-Tokens
  - 2.23 Avatar-Upload (Cloudinary)
- Drittanbieter-Tabelle (Section 4) auf 17 Anbieter erweitern (siehe Sektion 4 oben)
- Version auf `1.1` erhöhen, "Stand" auf 2026-05-05 setzen

#### DOC-02 — Datenschutzerklärung (Privacy.tsx) ausarbeiten
- Pflichtangaben nach Art. 13/14 DSGVO:
  - Name + Kontakt des Verantwortlichen
  - DSB-Kontakt (falls bestellt)
  - Zwecke + Rechtsgrundlagen pro Verarbeitung (mit Verweis auf konkrete Artikel)
  - Empfänger / Drittlandtransfers (jeden Anbieter aus Sektion 4 nennen!)
  - Speicherdauer pro Datentyp
  - Betroffenenrechte (Art. 15-22 + Beschwerderecht bei Aufsichtsbehörde)
  - Hinweis auf Cookie-Banner und Opt-Out-Möglichkeiten
  - OAuth-Hinweis (Google/GitHub Identifizierung)
- DE + EN + FR Übersetzungen via i18n (`apps/web/public/locales/{de,en,fr}/privacy.json`)

#### DOC-03 — Cookie-Policy / Cookie-Hinweis
- Eigene Seite `/cookies` mit kompletter Liste aus `ConsentContext.tsx` Storage-Keys
- Klassifizierung pro Cookie (Zweck, Dauer, Anbieter)

---

## 6. Empfohlene Textbausteine

### 6.1 Cookie-Banner (DE)

```
Wir nutzen Cookies und ähnliche Technologien.

Essenziell (immer aktiv) — sichern Login und Grundfunktionen.
Präferenzen — speichern Theme, Sprache, Filter-Einstellungen.
Analyse — speichern Lesehistorie für personalisierte Empfehlungen.

Sie können Ihre Einwilligung jederzeit unter „Einstellungen → Datenschutz" widerrufen.

[Alle akzeptieren]   [Nur essenzielle]   [Anpassen]
[Datenschutzerklärung]  [Cookie-Liste]
```

### 6.2 Datenschutzerklärung — Drittlandtransfer-Passage

```
Einige unserer Dienstleister haben ihren Sitz außerhalb der EU,
insbesondere in den USA (z.B. SendGrid, Sentry, OpenRouter, Google,
Anthropic). Wir haben mit diesen Anbietern Standardvertragsklauseln
nach Art. 46 Abs. 2 lit. c DSGVO abgeschlossen.

Aufgrund des Schrems-II-Urteils (EuGH C-311/18) ist ein vergleichbares
Schutzniveau bei US-Anbietern nicht garantiert; insbesondere können
US-Behörden auf Daten zugreifen. Wir haben für jeden Anbieter eine
Transfer-Impact-Assessment durchgeführt und zusätzliche Maßnahmen
(Verschlüsselung in Transit/at Rest, Datenminimierung, Pseudonymisierung
wo möglich) implementiert.

Sie haben das Recht, der Verarbeitung jederzeit zu widersprechen
(Art. 21 DSGVO).
```

### 6.3 Registrierungsformular (Pflichtfeld)

```
☐ Ich habe die [Datenschutzerklärung](/privacy) und die
  [Allgemeinen Geschäftsbedingungen](/terms) gelesen und akzeptiere sie.

Geburtsjahr: [____] (für Altersprüfung gem. Art. 8 DSGVO; nur Jahr,
              kein vollständiges Datum)

[Konto erstellen]
```

### 6.4 Privacy-Page Drittanbieter-Sektion (Auszug)

| Anbieter | Zweck | Sitz | Rechtsgrundlage | Speicherdauer |
|----------|-------|------|-----------------|---------------|
| SendGrid (Twilio Inc.) | Versand von E-Mails | USA | Art. 6(1)(b) + SCCs | bis Auftragsende |
| Sentry (Functional Software Inc.) | Fehler-Monitoring | USA | Art. 6(1)(f) + SCCs | 90 Tage |
| OpenRouter | KI-Anfragen-Routing | USA | Art. 6(1)(b) + SCCs | nicht persistent |
| Google LLC (Gemini, Translate, OAuth) | KI-Analyse, Übersetzung, Login | USA | Art. 6(1)(a/b) + SCCs | gemäß Google-DPA |
| ... | ... | ... | ... | ... |

---

## 7. Next Steps (Priorisiert)

### Sprint 1 (1-2 Wochen) — vor produktivem EU-Launch BLOCKING

1. **TOM-FIX-01** — Tier-Gating beim Export entfernen (1h Code + Test)
2. **TOM-FIX-02** — Export auf alle User-Modelle erweitern (4-6h)
3. **ORG-01** — AVVs unterzeichnen (parallel zur Code-Arbeit, externe Beschaffung)
4. **ORG-02** — Verantwortlicher-Daten in `PROCESSING-RECORDS.md` und `Privacy.tsx` ausfüllen (30min, sobald Daten bekannt)
5. **DOC-01** — `PROCESSING-RECORDS.md` v1.1 mit allen fehlenden Verarbeitungstätigkeiten (4-6h)

### Sprint 2 (1-2 Wochen) — Konformität herstellen

6. **TOM-FIX-03** — Consent-Versionierung + Server-Side-Log (4-6h)
7. **DOC-02** — `Privacy.tsx` mit ausgefüllten Inhalten + Übersetzungen (1-2 Tage; ggf. mit Anwalt)
8. **DOC-03** — Cookie-Policy-Seite (4h)
9. **ORG-03** — Transfer-Impact-Assessments pro US-Anbieter (1 Tag)

### Sprint 3 (Optional) — Härtung

10. **TOM-FIX-04** — Sentry-`beforeSend`-Scrubbing (2h)
11. **TOM-FIX-05** — PII aus Logs entfernen (2h)
12. **TOM-FIX-06** — Age-Gate + T&C-Acknowledgement bei Registrierung (1 Tag)

### Laufend

- DSB benennen, falls > 20 Mitarbeiter oder regelmäßige Risiko-Verarbeitung
- Datenschutz-Folgenabschätzung (DSFA / DPIA) bei sensiblen Verarbeitungen erwägen (z.B. AI-Fact-Check könnte eine erfordern)
- Quartalsweises Review von `PROCESSING-RECORDS.md` (in CI durch Update-Trigger automatisierbar)

---

## 8. Verbleibende offene Fragen (für Anwalt / DSB)

1. **Joint-Controller-Vereinbarung mit Stripe** (Art. 26) — ist die in den Stripe-AGBs implizit oder muss ein separater Vertrag her?
2. **Status der OpenRouter Sub-Processor-Liste** — welche Models werden tatsächlich angerufen? Sind alle DSGVO-konform?
3. **Anthropic Free Tier vs. Commercial** — bei Free-Tier-Nutzung: dürfen User-Anfragen zur Modell-Verbesserung verwendet werden? (Falls ja: nicht für PII einsetzen.)
4. **Cloudinary EU-Region** — wenn Avatar-Uploads passieren, welche Region ist konfiguriert?
5. **Whisper-Audio-Daten (Phase 40)** — werden potentiell User-bezogene Podcasts an OpenAI Whisper geschickt? (Bei Premium-Transkriptionen vom User → höhere Sensibilität, ggf. Einwilligungspflicht)
6. **Mobile-Push-Token-Lebensdauer** — werden FCM/APNS-Tokens persistiert, und wenn ja, wo (Schema?)? Cleanup-Regel?
7. **Leaderboard-Snapshot** — DSGVO-Aspekt der Top-100-Liste mit Profil-Daten (Username, Avatar) — Opt-out via `showOnLeaderboard` ist gut, aber Snapshot-Retention?
8. **NewsArticle-Translations** — wenn Übersetzung via Google Translate gemacht wird, wird der Artikelinhalt in die USA übertragen. Bei reinen News-Artikeln ohne PII unkritisch, aber bei User-Generated-Content (Comments?) wäre das problematisch — wird `translationService` für Comments aufgerufen?

---

*Dokument generiert via `/gdpr-check` (Claude Code) — Audit deckt Code-Stand 2026-05-05, Master-Branch `1fa8a48`.
**Keine Rechtsberatung.** Für produktiven EU-Einsatz von Datenschutzbeauftragtem oder spezialisiertem Anwalt freigeben lassen.*
