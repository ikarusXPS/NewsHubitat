# Verarbeitungsverzeichnis / Records of Processing Activities

Gemäß Art. 30 DSGVO / According to Art. 30 GDPR

**Stand / Last Updated:** 2026-04-23
**Version:** 1.0

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
| **TOM-Referenz** | TOM-01 |
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
| **TOM-Referenz** | TOM-01, TOM-06 |
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
| **TOM-Referenz** | TOM-01 |
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

---

## 5. Löschfristen-Übersicht / Retention Schedule

| Datenkategorie | Speicherdauer | Automatisch |
|----------------|---------------|-------------|
| Verifizierungstoken | 24 Stunden | Ja |
| Reset-Token | 1 Stunde | Ja |
| JWT-Token | 7 Tage | Ja (Blacklist) |
| Unverified Accounts | 30 Tage | Ja (Cleanup-Job) |
| ShareClick Analytics | 90 Tage | Ja (Cleanup-Job) |
| Account-Daten | Bis Löschung + 7 Tage | Ja (Grace Period) |
| Lesehistorie | Bis Löschung | Ja (Cascade) |
| Bookmarks | Bis Löschung | Ja (Cascade) |
| Error Logs (Sentry) | 90 Tage | Ja (Sentry) |

---

## 6. Betroffenenrechte / Data Subject Rights

| Recht | Implementierung | Endpoint/Feature |
|-------|-----------------|------------------|
| Art. 15 Auskunft | Datenexport (JSON/CSV) | `GET /api/account/export` |
| Art. 16 Berichtigung | Profil-Bearbeitung | `PUT /api/profile` |
| Art. 17 Löschung | Account-Löschung | `POST /api/account/delete-request` |
| Art. 18 Einschränkung | Historie pausieren | `isHistoryPaused` Toggle |
| Art. 20 Portabilität | Datenexport (JSON) | `GET /api/account/export?format=json` |
| Art. 21 Widerspruch | E-Mail Opt-Out | `emailOptOut` Flag |

---

## 7. Änderungshistorie / Change Log

| Datum | Version | Änderung | Autor |
|-------|---------|----------|-------|
| 2026-04-23 | 1.0 | Initiale Erstellung | System |

---

## 8. Nächste Überprüfung / Next Review

**Datum:** Q2 2027
**Verantwortlich:** [DATENSCHUTZBEAUFTRAGTER]

---

*Dieses Dokument ist Teil der DSGVO-Compliance-Dokumentation und muss bei Änderungen an der Datenverarbeitung aktualisiert werden.*
