# Verarbeitungsverzeichnis / Records of Processing Activities

Gemäß Art. 30 DSGVO / According to Art. 30 GDPR

**Stand / Last Updated:** 2026-05-05
**Version:** 1.1

---

## 1. Angaben zum Verantwortlichen / Data Controller Information

| Feld / Field | Wert / Value |
|--------------|--------------|
| Name des Verantwortlichen | [FIRMENNAME EINTRAGEN] |
| Anschrift | [ADRESSE EINTRAGEN] |
| E-Mail | privacy@newshub.app |
| Datenschutzbeauftragter | [NAME/KONTAKT FALLS BESTELLT] |

---

## 2. Verarbeitungstätigkeiten / Processing Activities

### 2.1 Benutzerkontenverwaltung / User Account Management

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Registrierung und Authentifizierung |
| **Zweck** | Bereitstellung personalisierter Dienste, Zugriffskontrolle |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Registrierte Nutzer |
| **Kategorien personenbezogener Daten** | E-Mail-Adresse, Name, Passwort-Hash, Erstellungsdatum |
| **Empfänger** | SendGrid (E-Mail-Versand) |
| **Drittlandübermittlung** | USA (SendGrid) - SCCs vorhanden |
| **Löschfrist** | Bei Account-Löschung + 7 Tage Karenzzeit; Unverified: 30 Tage |
| **TOM-Referenz** | TOM-01, TOM-02, TOM-03 |
| **Datenbank-Tabelle** | `User` |

### 2.2 E-Mail-Verifizierung / Email Verification

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | E-Mail-Bestätigung bei Registrierung |
| **Zweck** | Verifizierung der E-Mail-Adresse, Spam-Schutz |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Neu registrierte Nutzer |
| **Kategorien personenbezogener Daten** | E-Mail, Name, Verifizierungstoken (gehasht) |
| **Empfänger** | SendGrid (E-Mail-Versand) |
| **Drittlandübermittlung** | USA (SendGrid) - SCCs vorhanden |
| **Löschfrist** | Token: 24 Stunden; Account ohne Verifizierung: 30 Tage |
| **TOM-Referenz** | TOM-02, TOM-04 |
| **Datenbank-Tabelle** | `User` (verificationTokenHash, verificationTokenExpiry) |

### 2.3 Passwort-Zurücksetzung / Password Reset

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Passwort-Wiederherstellung |
| **Zweck** | Ermöglichung des Passwortwechsels bei Verlust |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Registrierte Nutzer |
| **Kategorien personenbezogener Daten** | E-Mail, Reset-Token (gehasht) |
| **Empfänger** | SendGrid (E-Mail-Versand) |
| **Drittlandübermittlung** | USA (SendGrid) - SCCs vorhanden |
| **Löschfrist** | Reset-Token: 1 Stunde |
| **TOM-Referenz** | TOM-02, TOM-04, TOM-05 |
| **Datenbank-Tabelle** | `User` (resetTokenHash, resetTokenExpiry) |

### 2.4 Lesezeichen / Bookmarks

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Artikel-Lesezeichen |
| **Zweck** | Speicherung favorisierter Artikel |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Registrierte Nutzer |
| **Kategorien personenbezogener Daten** | User-ID, Artikel-ID, Zeitstempel |
| **Empfänger** | Keine |
| **Drittlandübermittlung** | Keine |
| **Löschfrist** | Bei Account-Löschung (Cascade Delete) |
| **TOM-Referenz** | TOM-01, TOM-12 |
| **Datenbank-Tabelle** | `Bookmark` |

### 2.5 Lesehistorie / Reading History

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Verlauf gelesener Artikel |
| **Zweck** | Personalisierte Empfehlungen, Fortschrittsverfolgung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. a DSGVO (Einwilligung via Consent-Banner) |
| **Kategorien betroffener Personen** | Registrierte Nutzer (mit Einwilligung) |
| **Kategorien personenbezogener Daten** | User-ID, Artikel-ID, Titel, Quelle, Lesezeitpunkt |
| **Empfänger** | Keine |
| **Drittlandübermittlung** | Keine |
| **Löschfrist** | Bei Account-Löschung; Pausierbar durch Nutzer |
| **TOM-Referenz** | TOM-01, TOM-06, TOM-12 |
| **Datenbank-Tabelle** | `ReadingHistory` |

### 2.6 E-Mail-Digest / Email Subscriptions

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Newsletter und Benachrichtigungen |
| **Zweck** | Zusendung von News-Zusammenfassungen |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) |
| **Kategorien betroffener Personen** | Abonnenten |
| **Kategorien personenbezogener Daten** | E-Mail, Präferenzen (Frequenz, Regionen, Themen) |
| **Empfänger** | SendGrid (E-Mail-Versand) |
| **Drittlandübermittlung** | USA (SendGrid) - SCCs vorhanden |
| **Löschfrist** | Bei Abmeldung oder Account-Löschung |
| **TOM-Referenz** | TOM-02, TOM-07 |
| **Datenbank-Tabelle** | `EmailSubscription`, `EmailDigest` |

### 2.7 KI-Analyse / AI Analysis

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | KI-gestützte Nachrichtenanalyse |
| **Zweck** | Sentiment-Analyse, Zusammenfassungen, Q&A |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Alle Nutzer |
| **Kategorien personenbezogener Daten** | Nutzeranfragen (Fragen an AI), Kontext |
| **Empfänger** | OpenRouter, Google Gemini, Anthropic |
| **Drittlandübermittlung** | USA - SCCs erforderlich |
| **Löschfrist** | Anfragen werden nicht serverseitig gespeichert; Client-seitig via Consent |
| **TOM-Referenz** | TOM-08 |
| **Datenbank-Tabelle** | Keine (Client-Side localStorage) |

### 2.8 Übersetzung / Translation

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Artikelübersetzung |
| **Zweck** | Mehrsprachige Zugänglichkeit |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Alle Nutzer |
| **Kategorien personenbezogener Daten** | Keine (nur Artikelinhalte) |
| **Empfänger** | DeepL, Google Translate |
| **Drittlandübermittlung** | DeepL: Deutschland (keine); Google: USA (SCCs) |
| **Löschfrist** | Übersetzungen gecacht in Artikel-Daten |
| **TOM-Referenz** | TOM-08 |
| **Datenbank-Tabelle** | `NewsArticle` (titleTranslated, contentTranslated) |

### 2.9 Social Sharing Analytics

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Teilen-Funktionalität und Statistiken |
| **Zweck** | Ermöglichung des Teilens, Nutzungsstatistiken |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse) |
| **Kategorien betroffener Personen** | Nutzer, die Inhalte teilen oder aufrufen |
| **Kategorien personenbezogener Daten** | IP-Hash (anonymisiert), User-Agent, Referrer, Plattform |
| **Empfänger** | Keine |
| **Drittlandübermittlung** | Keine |
| **Löschfrist** | **90 Tage** (automatische Bereinigung) |
| **TOM-Referenz** | TOM-01, TOM-09 |
| **Datenbank-Tabelle** | `ShareClick`, `SharedContent` |

### 2.10 Gamification / Badges

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Abzeichen und Leaderboard |
| **Zweck** | Nutzerengagement, Achievements |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Registrierte Nutzer |
| **Kategorien personenbezogener Daten** | User-ID, Badge-ID, Fortschritt, Zeitstempel |
| **Empfänger** | Keine |
| **Drittlandübermittlung** | Keine |
| **Löschfrist** | Bei Account-Löschung |
| **TOM-Referenz** | TOM-01, TOM-12 |
| **Datenbank-Tabelle** | `Badge`, `UserBadge`, `LeaderboardSnapshot` |

### 2.11 Fehler-Tracking / Error Tracking

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Anwendungsfehler-Überwachung |
| **Zweck** | Fehlererkennung und -behebung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse) |
| **Kategorien betroffener Personen** | Alle Nutzer |
| **Kategorien personenbezogener Daten** | Browser-Info, Fehler-Stack, URL, anonyme Session-ID |
| **Empfänger** | Sentry |
| **Drittlandübermittlung** | USA (Sentry) - SCCs erforderlich |
| **Löschfrist** | 90 Tage (Sentry-Retention) |
| **TOM-Referenz** | TOM-08, TOM-10 |
| **Datenbank-Tabelle** | Keine (externer Dienst) |

### 2.12 OAuth-Anmeldung / OAuth Sign-In  (Phase 26 — _v1.1 ergänzt_)

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Single-Sign-On via Google / GitHub |
| **Zweck** | Anmeldung ohne separates Passwort |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | OAuth-anmeldende Nutzer |
| **Kategorien personenbezogener Daten** | E-Mail, Anzeigename, OAuth-Provider-ID (SHA-256-gehasht) |
| **Empfänger** | Google LLC, GitHub Inc. (Identity Provider) |
| **Drittlandübermittlung** | USA - SCCs erforderlich |
| **Löschfrist** | Bei Account-Löschung |
| **TOM-Referenz** | TOM-02, TOM-04, TOM-10 |
| **Datenbank-Tabelle** | `User` (googleIdHash, githubIdHash, hasPassword=false bei OAuth-only) |

### 2.13 Kommentare / Comments  (Phase 14 — _v1.1 ergänzt_)

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Threaded Artikel-Kommentare |
| **Zweck** | Diskussion zu Artikeln, Community-Funktion |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Registrierte Nutzer |
| **Kategorien personenbezogener Daten** | User-ID, Kommentar-Text (max. 5000 Zeichen), Artikel-ID, Thread-Parent, Zeitstempel, Flag-Status |
| **Empfänger** | OpenRouter / Gemini / Anthropic (KI-Moderation; siehe 2.7) |
| **Drittlandübermittlung** | USA (KI-Moderation) - SCCs erforderlich |
| **Löschfrist** | Bei Account-Löschung (Cascade); Soft-Delete via `isDeleted` flag |
| **TOM-Referenz** | TOM-08, TOM-12 |
| **Datenbank-Tabelle** | `Comment` |

### 2.14 Teams / Team Collaboration  (Phase 28 — _v1.1 ergänzt_)

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Team-Bereiche und gemeinsame Lesezeichen |
| **Zweck** | Kollaborative Recherche, Bookmark-Sharing innerhalb von Teams |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Team-Mitglieder, Eingeladene |
| **Kategorien personenbezogener Daten** | User-ID, Team-Mitgliedschafts-Rolle (owner/admin/member), Beitrittsdatum, Eingeladenen-E-Mail, Token-Hash, Notizen zu Team-Bookmarks |
| **Empfänger** | SendGrid (Einladungs-E-Mail) |
| **Drittlandübermittlung** | USA (SendGrid) - SCCs vorhanden |
| **Löschfrist** | Soft-Delete `Team.deletedAt`; bei Account-Löschung Cascade über alle Mitgliedschaften |
| **TOM-Referenz** | TOM-02, TOM-04, TOM-12 |
| **Datenbank-Tabelle** | `Team`, `TeamMember`, `TeamBookmark`, `TeamInvite` |

### 2.15 Stripe-Abonnements / Subscription Billing  (Phase 36 / 36.1-36.4 — _v1.1 ergänzt_)

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Bezahlte Abonnements (PREMIUM / ENTERPRISE) |
| **Zweck** | Abrechnung, Zahlungsabwicklung, Tier-Verwaltung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung); Art. 6 Abs. 1 lit. c DSGVO (gesetzliche Verpflichtung — Rechnungslegung) |
| **Kategorien betroffener Personen** | Zahlende Kunden |
| **Kategorien personenbezogener Daten** | E-Mail, Stripe-Customer-ID, Stripe-Subscription-ID, Tier, Status, Laufzeitende, Zahlungs-Metadaten (bei Stripe gespeichert) |
| **Empfänger** | Stripe Inc. (Zahlungsabwicklung) |
| **Drittlandübermittlung** | USA (Stripe) - SCCs erforderlich; AVV ausstehend |
| **Löschfrist** | Subscription-Felder bis Account-Löschung; Webhook-Events 24 h Idempotenz; Rechnungs-Daten 10 Jahre (HGB §257 — bei Stripe gespeichert) |
| **TOM-Referenz** | TOM-02, TOM-08, TOM-11 |
| **Datenbank-Tabelle** | `User` (stripeCustomerId, stripeSubscriptionId, subscriptionTier, subscriptionStatus, subscriptionEndsAt, pausedUntil), `ProcessedWebhookEvent` |

### 2.16 Empfehlungsprogramm / Referral Program  (Phase 36.2 — _v1.1 ergänzt_)

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Referral-Codes und Belohnungen |
| **Zweck** | Nutzergewinnung über Empfehlungen, Belohnungs-Audit-Trail |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Werbender Nutzer (Referrer), geworbener Nutzer (Referred) |
| **Kategorien personenbezogener Daten** | Referral-Code, Referrer-ID, Referred-ID, Belohnungstyp, Belohnungswert, Anwendungsdatum |
| **Empfänger** | Keine (interne Verarbeitung) |
| **Drittlandübermittlung** | Keine |
| **Löschfrist** | Bei Account-Löschung (Cascade über beide FKs) |
| **TOM-Referenz** | TOM-01, TOM-12 |
| **Datenbank-Tabelle** | `ReferralReward`, `User.referralCode`, `User.referredBy`, `User.freeMonthsEarned` |

### 2.17 Studenten-Verifizierung / Student Verification  (Phase 36.2 — _v1.1 ergänzt_)

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Nachweis-Prüfung für Studenten-Rabatt |
| **Zweck** | Tariffähigkeit für vergünstigtes Abonnement |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Bewerbende Studenten |
| **Kategorien personenbezogener Daten** | User-ID, Dokument-URL (Immatrikulationsbescheinigung — interne Speicherung), Status (pending/approved/rejected), Prüfer-ID, Prüfdatum |
| **Empfänger** | Keine (interne Prüfung) |
| **Drittlandübermittlung** | Keine |
| **Löschfrist** | Bei Account-Löschung (Cascade); abgelehnte Anträge: 6 Monate (analog Bewerbungen — AGG) |
| **TOM-Referenz** | TOM-01, TOM-08, TOM-12, TOM-13 |
| **Datenbank-Tabelle** | `StudentVerification` |

### 2.18 Developer API Keys  (Phase 35 — _v1.1 ergänzt_)

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | API-Schlüssel für externe Entwicklerzugriffe |
| **Zweck** | Programmgesteuerter Zugriff auf öffentliche API |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Registrierte Nutzer mit API-Bedarf |
| **Kategorien personenbezogener Daten** | User-ID, Schlüssel-Hash (bcrypt cost 10), Name, Tier, Environment, Erstellungsdatum, Letzter-Zugriff, Request-Zähler, Revocation-Daten |
| **Empfänger** | Keine |
| **Drittlandübermittlung** | Keine |
| **Löschfrist** | Bei Account-Löschung (Cascade); manueller Widerruf jederzeit über `revokedAt` |
| **TOM-Referenz** | TOM-03, TOM-08, TOM-10, TOM-12 |
| **Datenbank-Tabelle** | `ApiKey` |

### 2.19 Fact-Check Audit Trail  (Phase 38 — _v1.1 ergänzt_)

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Faktencheck-Anfragen und KI-Verdikte |
| **Zweck** | Nachvollziehbarkeit der Fact-Check-Urteile, Cache-Schlüssel |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Registrierte Nutzer |
| **Kategorien personenbezogener Daten** | User-ID, Artikel-ID, Behauptungstext, SHA-256-Hash, Sprache, Verdikt, Konfidenz, Modell-ID, Zitations-Artikel-IDs |
| **Empfänger** | OpenRouter / Gemini / Anthropic (siehe 2.7) |
| **Drittlandübermittlung** | USA - SCCs erforderlich |
| **Löschfrist** | Bei Account-Löschung; Anonymisierte Verdikte können für Statistik aggregiert bleiben |
| **TOM-Referenz** | TOM-04, TOM-08, TOM-12 |
| **Datenbank-Tabelle** | `FactCheck` |

### 2.20 Podcasts / Podcast Discovery  (Phase 40 — _v1.1 ergänzt_)

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Kuratierte Podcast-Suche und Episoden-Discovery |
| **Zweck** | Bereitstellung von Podcast-Inhalten zu Artikel-Themen |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Alle Nutzer (Lesezugriff); keine personenbezogenen Daten der Podcast-Hörer gespeichert |
| **Kategorien personenbezogener Daten** | Keine User-Daten; Podcast-Metadaten (Titel, Autor, RSS-URL) sind keine personenbezogenen Daten der Plattform-Nutzer |
| **Empfänger** | Podcast Index API, Apple iTunes Search API (Discovery), öffentliche RSS-Feeds (Episoden) |
| **Drittlandübermittlung** | USA (Podcast Index, Apple) - SCCs erforderlich; bei Discovery wird die User-IP indirekt übertragen, da der Server-Side-Fetch im Auftrag des Nutzers erfolgt |
| **Löschfrist** | Persistente Stammdaten; Cleanup nur bei manueller Kuratierung |
| **TOM-Referenz** | TOM-08 |
| **Datenbank-Tabelle** | `Podcast`, `PodcastEpisode` |

### 2.21 Videos / Video-Empfehlungen  (Phase 40 — _v1.1 ergänzt_)

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | YouTube/Vimeo-Empfehlungen zu Artikeln |
| **Zweck** | Multimediale Anreicherung der Berichterstattung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Alle Nutzer (Lesezugriff); embedded Player setzt erst nach Click Cookies (Click-to-Load gefordert) |
| **Kategorien personenbezogener Daten** | Server-seitig: keine; Client-seitig nach Embed-Activation: IP, User-Agent, Cookies via YouTube/Vimeo |
| **Empfänger** | YouTube Data API v3 (Server-Discovery), YouTube/Vimeo Embed (Client-Side bei Aktivierung) |
| **Drittlandübermittlung** | USA (Google YouTube, Vimeo) - SCCs erforderlich |
| **Löschfrist** | Persistente Video-Stammdaten |
| **TOM-Referenz** | TOM-06, TOM-08 |
| **Datenbank-Tabelle** | `Video` |

### 2.22 Transkripte / Transcripts  (Phase 40 — _v1.1 ergänzt_)

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Transkripte für Podcast-Episoden und Videos |
| **Zweck** | Barrierefreiheit, Volltext-Suche, Untertitel |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung); Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse — Barrierefreiheit) |
| **Kategorien betroffener Personen** | Keine (Inhalte sind öffentliche Medien); ggf. Stimmen Dritter im Audio-Material |
| **Kategorien personenbezogener Daten** | Keine User-Daten; Audio wird nur an OpenAI Whisper übertragen wenn keine `<podcast:transcript>` URL und keine YouTube-Captions verfügbar |
| **Empfänger** | OpenAI (Whisper API), Publisher-Transkripte über RSS, YouTube Captions |
| **Drittlandübermittlung** | USA (OpenAI, YouTube) - SCCs erforderlich |
| **Löschfrist** | Audio-Tempfiles werden nach Whisper-Aufruf gelöscht; Transkript-Texte persistent |
| **TOM-Referenz** | TOM-08, TOM-13 |
| **Datenbank-Tabelle** | `Transcript` |

### 2.23 Mobile App / Push Notifications  (Phase 41+ — _geplant, aktuell nicht aktiv_)

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Push-Benachrichtigungen über Capacitor 8 (iOS / Android) |
| **Zweck** | Benachrichtigung über Breaking News, Personalisierte Alerts |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. a DSGVO (Einwilligung — Opt-In bei App-Start) |
| **Kategorien betroffener Personen** | Mobile App Nutzer mit aktiviertem Push |
| **Kategorien personenbezogener Daten** | Device-Token (FCM/APNS), User-ID, Notification-Präferenzen |
| **Empfänger** | Apple APNS (iOS), Google Firebase Cloud Messaging (Android) |
| **Drittlandübermittlung** | USA (Apple, Google) - SCCs erforderlich |
| **Löschfrist** | Bei App-Deinstallation oder Opt-Out |
| **TOM-Referenz** | TOM-02, TOM-06 |
| **Datenbank-Tabelle** | _Backend-Integration noch nicht implementiert; Capacitor `PushNotifications` Plugin nur konfiguriert in `apps/mobile/capacitor.config.ts`_ |

### 2.24 Avatar-Upload / Profile Picture Upload  (Phase 6 — _v1.1 ergänzt_)

| Kriterium | Beschreibung |
|-----------|--------------|
| **Bezeichnung** | Profilbild-Upload und Preset-Auswahl |
| **Zweck** | Personalisierung des Nutzerprofils |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Kategorien betroffener Personen** | Registrierte Nutzer |
| **Kategorien personenbezogener Daten** | User-ID, Bild-Datei (lokal in `public/avatars/uploads/`), Preset-ID, Custom-Akzentfarbe |
| **Empfänger** | Keine (lokale Speicherung; kein CDN/Cloudinary aktiv) |
| **Drittlandübermittlung** | Keine |
| **Löschfrist** | Bei Account-Löschung; manueller Reset jederzeit |
| **TOM-Referenz** | TOM-01, TOM-12, TOM-13 |
| **Datenbank-Tabelle** | `User.avatarUrl`, `User.selectedPresetAvatar`, `User.customAccentColor` |

---

## 3. Technische und organisatorische Maßnahmen (TOM)

| ID | Maßnahme | Beschreibung |
|----|----------|--------------|
| TOM-01 | Verschlüsselung at Rest | PostgreSQL-Datenbank mit verschlüsseltem Storage |
| TOM-02 | Verschlüsselung in Transit | TLS 1.3 für alle Verbindungen (HTTPS) |
| TOM-03 | Passwort-Hashing | bcrypt mit Cost Factor 10, min. 12 Zeichen |
| TOM-04 | Token-Sicherheit | SHA-256 gehashte Tokens, zeitlich begrenzt |
| TOM-05 | Session-Invalidierung | JWT-Blacklist in Redis, Token-Versionierung |
| TOM-06 | Consent-Management | Opt-in für nicht-essentielle Datenverarbeitung |
| TOM-07 | E-Mail Opt-Out | One-Click-Abmeldung, Bounce-Tracking |
| TOM-08 | API-Sicherheit | Rate Limiting (5-100 req/min), Input-Validierung (Zod) |
| TOM-09 | IP-Anonymisierung | Hash-basierte Anonymisierung für Analytics |
| TOM-10 | Zugriffskontrolle | JWT-basierte Authentifizierung, Role-based Access |
| TOM-11 | Webhook-Integrität | Stripe Webhook-Signatur (HMAC-SHA256), 24-h-Idempotenz (Redis + `ProcessedWebhookEvent`) |
| TOM-12 | Cascade-Delete | Account-Löschung kaskadiert über alle 14+ User-Relations (Bookmark, ReadingHistory, Comment, TeamMember, ReferralReward, ApiKey, …) |
| TOM-13 | Upload-Validierung | MIME-Type-Whitelist, Dateigrößen-Limit, Pfad-Sanitization für Avatar-Upload und (intern) Studenten-Nachweise |

---

## 4. Drittanbieter-Übersicht / Third-Party Processors

| Anbieter | Zweck | Standort | DPA/AVV | SCCs |
|----------|-------|----------|---------|------|
| SendGrid (Twilio) | E-Mail-Versand | USA | ☐ Ausstehend | Ja |
| Sentry | Error-Tracking | USA | ☐ Ausstehend | Ja |
| OpenRouter | AI-Routing | USA | ☐ Ausstehend | Ja |
| Google (Gemini) | AI-Analyse | USA | ☐ Ausstehend | Ja |
| Anthropic | AI-Analyse | USA | ☐ Ausstehend | Ja |
| DeepL | Übersetzung | Deutschland | ☐ Ausstehend | Nein |
| Google (Translate) | Übersetzung | USA | ☐ Ausstehend | Ja |
| Google (OAuth Identity) | Sign-In | USA | ☐ Ausstehend | Ja |
| GitHub (OAuth Identity) | Sign-In | USA | ☐ Ausstehend | Ja |
| Stripe | Zahlungsabwicklung | USA / IRL | ☐ Ausstehend | Ja |
| OpenAI (Whisper API) | Transkription | USA | ☐ Ausstehend | Ja |
| Google (YouTube Data API + Embed) | Video-Discovery + Wiedergabe | USA | ☐ Ausstehend | Ja |
| Vimeo | Video-Wiedergabe (Embed) | USA | ☐ Ausstehend | Ja |
| Apple (iTunes Search API) | Podcast-Discovery | USA | ☐ Ausstehend | Ja |
| Podcast Index | Podcast-Discovery | USA | ☐ Ausstehend | Ja |
| Apple APNS | Mobile Push (Phase 41+ geplant) | USA | ☐ Ausstehend | Ja |
| Google FCM | Mobile Push (Phase 41+ geplant) | USA | ☐ Ausstehend | Ja |

> _Cloudinary war im Audit als möglicher CDN gelistet; der aktuelle Codestand nutzt **lokales** `public/avatars/uploads/`-Verzeichnis (multer disk storage) und **kein** externes CDN. Falls in v1.7+ ein CDN eingeführt wird, muss dieses Verzeichnis ergänzt werden._

---

## 5. Löschfristen-Übersicht / Retention Schedule

| Datenkategorie | Speicherdauer | Automatisch |
|----------------|---------------|-------------|
| Verifizierungstoken | 24 Stunden | Ja |
| Reset-Token | 1 Stunde | Ja |
| JWT-Token (Blacklist) | 7 Tage | Ja (Redis TTL) |
| Stripe-Webhook-Idempotenz | 24 Stunden (Redis) + permanent (`ProcessedWebhookEvent` für Audit) | Ja |
| Unverified Accounts | 30 Tage | Ja (Cleanup-Job) |
| Team-Einladungen | 7 Tage (`TeamInvite.expiresAt`) | Ja (Cleanup-Job) |
| ShareClick Analytics | 90 Tage | Ja (Cleanup-Job) |
| Account-Daten | Bis Löschung + 7 Tage Karenzzeit | Ja (Grace Period) |
| Lesehistorie / Bookmarks / Badges / Kommentare / API-Keys / Referrals / FactChecks | Bis Account-Löschung | Ja (Cascade) |
| Studenten-Verifizierung (abgelehnt) | 6 Monate | ⚠ Manuell (TOM-FIX-12 — TODO) |
| Stripe-Abrechnungs-Daten | 10 Jahre (HGB §257 — bei Stripe gespeichert) | Bei Stripe |
| Whisper-Audio-Tempfiles | Sofort nach Transkription | Ja (Service-intern) |
| Transkript-Texte | Persistent | Nein |
| Error Logs (Sentry) | 90 Tage | Ja (Sentry) |

---

## 6. Betroffenenrechte / Data Subject Rights

| Recht | Implementierung | Endpoint/Feature |
|-------|-----------------|------------------|
| Art. 15 Auskunft | Datenexport (JSON/CSV) — **kostenlos für alle Tarife** seit Commit `f990bce` (DSGVO Art. 12 Abs. 5) | `GET /api/account/export?format=json\|csv` |
| Art. 16 Berichtigung | Profil-Bearbeitung (mehrere Endpunkte) | `PUT /api/profile/name`, `PUT /api/profile/avatar/preset`, `POST /api/profile/avatar/upload`, `PUT /api/profile/leaderboard-visibility` |
| Art. 17 Löschung | Account-Löschung (Cascade über alle Relations) | `POST /api/account/delete-request` |
| Art. 18 Einschränkung | Historie pausieren | `isHistoryPaused` Toggle |
| Art. 20 Portabilität | Datenexport (JSON enthält alle 14+ Relations) — kostenlos | `GET /api/account/export?format=json` |
| Art. 21 Widerspruch | E-Mail Opt-Out | `emailOptOut` Flag |

---

## 7. Änderungshistorie / Change Log

| Datum | Version | Änderung | Autor |
|-------|---------|----------|-------|
| 2026-04-23 | 1.0 | Initiale Erstellung | System |
| 2026-05-05 | 1.1 | DOC-01 (GDPR-AUDIT): Phase 28 (Teams), 35 (API Keys), 36/36.2-36.4 (Stripe / Referrals / Studenten), 38 (FactCheck), 40 (Podcasts/Videos/Transkripte), 26 (OAuth), 14 (Comments), 6 (Avatar) sowie Phase-41+ Mobile-Push (geplant) als Tätigkeiten 2.12-2.24 ergänzt. Drittanbieter-Tabelle um Stripe, OpenAI, YouTube/Vimeo, iTunes, Podcast Index, APNS, FCM, GitHub-OAuth, Google-OAuth/Translate erweitert. TOM-11..TOM-13 ergänzt. Retention Schedule um Webhook-Idempotenz, Team-Invites, Studenten-Anträge, Whisper-Tempfiles erweitert. Sektion 6 spiegelt Commit `f990bce` (Tier-Gating-Removal /api/account/export). | DOC-01 |

---

## 8. Nächste Überprüfung / Next Review

**Datum:** Q3 2026 (nach Abschluss Sprint 1-3 aus `docs/legal/GDPR-AUDIT.md`)
**Verantwortlich:** [DATENSCHUTZBEAUFTRAGTER]

---

*Dieses Dokument ist Teil der DSGVO-Compliance-Dokumentation und muss bei Änderungen an der Datenverarbeitung aktualisiert werden.*
