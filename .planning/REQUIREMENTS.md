# Requirements: NewsHub

**Defined:** 2026-04-23
**Core Value:** Users can see how the same story is covered by different regional perspectives

## v1.5 Requirements

Requirements for Performance Optimization milestone. Each maps to roadmap phases.

### Measurement Foundation

- [x] **MEAS-01**: Bundle analysis tooling configured with rollup-plugin-visualizer
- [x] **MEAS-02**: Prisma query logging enabled to expose N+1 patterns and slow queries
- [x] **MEAS-03**: Lighthouse CI baseline established with LCP, INP, CLS metrics

### Frontend Optimization

- [x] **FRON-01**: Route-based code splitting implemented for Dashboard, Analysis, Monitor, Timeline, EventMap pages
- [x] **FRON-02**: Virtual scrolling implemented for NewsFeed with @tanstack/react-virtual
- [x] **FRON-03**: Lazy image loading enabled for article thumbnails (native loading="lazy")
- [x] **FRON-04**: Initial JS bundle reduced to < 250KB (from ~800KB estimated)

### Image Pipeline

- [ ] **IMG-01**: WebP/AVIF format conversion implemented via Sharp
- [ ] **IMG-02**: Responsive srcset configured for article thumbnails (320w, 640w, 960w, 1280w)
- [ ] **IMG-03**: Image optimization integrated with existing Cloudinary fetch mode

### Caching

- [ ] **CACHE-01**: Smart cache invalidation implemented with WebSocket event hooks
- [ ] **CACHE-02**: HTTP cache headers optimized (Cache-Control, ETag) for static assets
- [ ] **CACHE-03**: Jitter-based TTL implemented in CacheService to prevent thundering herd

### Database

- [ ] **DB-01**: EXPLAIN ANALYZE audit completed for all major query patterns
- [ ] **DB-02**: Composite indexes added for identified slow queries
- [ ] **DB-03**: N+1 query patterns identified and fixed in Prisma queries
- [ ] **DB-04**: Connection pool tuned based on workload analysis

## Performance Targets

| Metric | Current | Target | Validation |
|--------|---------|--------|------------|
| LCP (Largest Contentful Paint) | TBD | < 2.0s | Lighthouse |
| INP (Interaction to Next Paint) | TBD | < 150ms | Chrome DevTools |
| CLS (Cumulative Layout Shift) | TBD | < 0.05 | Lighthouse |
| Initial JS Bundle | ~800KB | < 250KB | rollup-plugin-visualizer |
| API Cache Hit Ratio | TBD | > 90% | Redis INFO stats |
| Database Query P95 | TBD | < 50ms | Prisma logging |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MEAS-01 | Phase 29 | Complete |
| MEAS-02 | Phase 29 | Complete |
| MEAS-03 | Phase 29 | Complete |
| FRON-01 | Phase 30 | Complete |
| FRON-02 | Phase 31 | Complete |
| FRON-03 | Phase 30 | Complete |
| FRON-04 | Phase 30 | Complete |
| IMG-01 | Phase 32 | Pending |
| IMG-02 | Phase 32 | Pending |
| IMG-03 | Phase 32 | Pending |
| CACHE-01 | Phase 33 | Pending |
| CACHE-02 | Phase 33 | Pending |
| CACHE-03 | Phase 33 | Pending |
| DB-01 | Phase 34 | Pending |
| DB-02 | Phase 34 | Pending |
| DB-03 | Phase 34 | Pending |
| DB-04 | Phase 34 | Pending |

**Coverage:**
- v1.5 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---

## Future Requirements

Planned for v1.6+ milestones. Requirements defined, phases TBD during milestone planning.

### v1.6 Infrastructure & Scale

**Goal:** CDN integration and infrastructure scaling

- [ ] **INFRA-01**: CDN integration for static assets (Cloudflare/Vercel Edge)
- [ ] **INFRA-02**: Predictive prefetch for likely-next routes
- [ ] **INFRA-03**: PgBouncer transaction pooling (if connection metrics warrant)
- [ ] **SCALE-01**: Kubernetes Deployment mit Helm Charts
- [ ] **SCALE-02**: Horizontal Pod Autoscaling basierend auf CPU/Memory
- [ ] **SCALE-03**: Multi-Region Deployment (EU, US)
- [ ] **SCALE-04**: Database Read Replicas für Geo-Routing
- [ ] **LOG-01**: Zentrales Log Aggregation (Loki oder ELK)
- [ ] **LOG-02**: Structured Logging mit Correlation IDs

### v1.7 Growth & Monetization

**Goal:** Enable data-driven decisions and generate revenue

- [ ] **AB-01**: A/B Testing Framework integriert
- [ ] **AB-02**: Feature Flags für graduelle Rollouts
- [ ] **ANALYTICS-01**: User Behavior Analytics Dashboard
- [ ] **PAID-01**: Subscription Tiers (Free, Pro, Team)
- [ ] **PAID-02**: Stripe Payment Integration
- [ ] **PAID-03**: Premium Export Features (PDF, Excel)

### v1.8 Advanced Features (Demand-Driven)

**Goal:** Expand capabilities based on validated user demand

- [ ] **NATIVE-01**: iOS/Android App (React Native)
- [ ] **NATIVE-02**: Push Notifications für Breaking News
- [ ] **VIDEO-01**: Video Content Integration
- [ ] **CHAT-01**: Real-time Chat für Teams

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Custom Service Worker strategies | VitePWA defaults sufficient for NewsHub |
| Client-side heavy computation | AI/clustering stays server-side per architecture |
| Infinite scroll without virtual scrolling | Anti-pattern, causes DOM bloat |
| Over-aggressive caching (>24h TTL) | News freshness critical, contradicts "LIVE" badge |
| Manual lazy loading (Intersection Observer) | Native loading="lazy" sufficient for 96% cases |
| Increasing PostgreSQL max_connections | Use pooling instead per best practices |
| Apple Sign-In | Defer to future OAuth expansion |
| RTL Language Support (Arabic, Hebrew) | Significant layout work, defer to v1.6+ |
| Enterprise SSO (SAML/SCIM) | Defer to enterprise tier |

---

## Archived: v1.4 Requirements (Complete)

<details>
<summary>v1.4 User & Community Features — 18 requirements (all complete)</summary>

### OAuth Login
- [x] OAUTH-01: User kann sich mit Google OAuth anmelden
- [x] OAUTH-02: User kann sich mit GitHub OAuth anmelden
- [x] OAUTH-03: User kann OAuth-Account mit bestehendem Email-Account verknüpfen

### Internationalization (i18n)
- [x] I18N-01: User kann UI-Sprache über Sprachumschalter ändern
- [x] I18N-02: Alle UI-Texte sind übersetzbar (DE, EN, weitere Sprachen vorbereitet)
- [x] I18N-03: Browser-Sprache wird automatisch erkannt und angewendet

### Mobile Responsive
- [x] MOBILE-01: Alle Pages haben responsive Layouts für Mobile Screens
- [x] MOBILE-02: Touch-Navigation (Bottom Nav, Hamburger Menu, Swipe-Gesten)
- [x] MOBILE-03: Bilder sind für Mobile optimiert (responsive images, lazy loading)

### Social Sharing
- [x] SHARE-01: User kann Artikel via Share-Buttons teilen (Twitter, LinkedIn, WhatsApp, Facebook)
- [x] SHARE-02: Geteilte Links zeigen Rich Previews mit OpenGraph Meta-Tags
- [x] SHARE-03: Share-Klicks werden getrackt für Analytics

### Comments
- [x] COMM-01: User kann Artikel kommentieren
- [x] COMM-02: Kommentare unterstützen Threaded Replies (Antworten auf Kommentare)
- [x] COMM-03: Neue Kommentare erscheinen in Echtzeit ohne Refresh

### Team Collaboration
- [x] COLLAB-01: User kann Teams erstellen und Mitglieder einladen
- [x] COLLAB-02: Teams haben gemeinsame Bookmark-Sammlungen
- [x] COLLAB-03: Team-Rollen (Owner, Admin, Member) mit unterschiedlichen Permissions

</details>

## Archived: v1.3 Requirements (Complete)

<details>
<summary>v1.3 Production Ready — 19 requirements</summary>

### CI/CD Pipeline
- [x] CICD-01: Build und Tests laufen automatisch bei Pull Requests
- [x] CICD-02: Docker Image wird gebaut und zu Registry gepusht
- [x] CICD-03: Automatisches Deployment zu Staging bei merge to main
- [x] CICD-04: Automatisches Deployment zu Production mit Approval-Gate

### Sentry Error Tracking
- [x] SNTR-01: Frontend Errors werden via React Error Boundary + Sentry SDK erfasst
- [x] SNTR-02: Backend Errors werden via Express Error Handler + Sentry SDK erfasst
- [x] SNTR-03: Source Maps sind hochgeladen für lesbare Stack Traces
- [x] SNTR-04: Performance Monitoring zeigt Transaction Traces und API Latency

### Monitoring & Alerting
- [x] MNTR-01: Health Endpoints existieren (/health, /health/db, /health/redis, /readiness)
- [x] MNTR-02: Metriken werden im Prometheus-Format exportiert
- [x] MNTR-03: Externe Uptime-Checks mit Alerting sind konfiguriert
- [x] MNTR-04: Grafana Dashboard visualisiert alle Metriken

### Load Testing
- [x] LOAD-01: k6 Test Scripts existieren für kritische Endpoints
- [x] LOAD-02: System hält 10.000 gleichzeitige User aus
- [x] LOAD-03: Load Tests laufen als Teil der CI Pipeline
- [x] LOAD-04: Performance Baselines sind dokumentiert (p95, p99 Latency)

### SMTP Production
- [x] SMTP-01: Production SMTP ist konfiguriert (SendGrid)
- [x] SMTP-02: Email Delivery ist verifiziert (Verification, Password Reset)
- [x] SMTP-03: Bounce Handling für unzustellbare Emails ist implementiert

</details>

## Archived: v1.1 Requirements (Complete)

<details>
<summary>v1.1 Quality & Testing — 41 requirements (all complete)</summary>

### Unit Testing — Backend Services
- [x] UNIT-01 through UNIT-16: All backend services tested

### Unit Testing — Frontend Hooks
- [x] HOOK-01 through HOOK-07: All hooks tested

### Unit Testing — Libraries
- [x] LIB-01 through LIB-03: All libraries tested

### E2E Testing
- [x] E2E-01 through E2E-10: All pages tested

### Bug Fixes
- [x] BUG-01: B7 Article thumbnail fallback

### Code Quality
- [x] QUAL-01 through QUAL-04: All quality gates passing

</details>

---
*Requirements defined: 2026-04-23*
*Last updated: 2026-04-25 — v1.5 requirements defined (17 total)*
