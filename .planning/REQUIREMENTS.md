# Requirements: NewsHub

**Defined:** 2026-04-18
**Core Value:** Users can see how the same story is covered by different regional perspectives

## v1 Requirements

Requirements for milestone 1.0 (Phases 5-6). Each maps to roadmap phases.

### AI Analysis

- [x] **AI-01**: User receives citations with article IDs when AI answers questions
- [x] **AI-02**: User can ask follow-up questions with preserved context
- [x] **AI-03**: User sees coverage gap alerts when topics lack regional diversity
- [x] **AI-04**: User sees propaganda pattern indicators on articles

### Event Timeline

- [x] **EVT-01**: User can view timeline events linked to related NewsArticles
- [x] **EVT-02**: User can browse historical events database (100+ key events)
- [x] **EVT-03**: User sees clustered event markers in dense map regions
- [x] **EVT-04**: User sees real-time event markers update on globe/map

### Authentication

- [ ] **AUTH-01**: User receives email verification after registration
- [ ] **AUTH-02**: User can reset password via email link

### User Preferences

- [ ] **PREF-01**: User can configure language preference (de/en)
- [ ] **PREF-02**: User can toggle theme (dark/light)
- [ ] **PREF-03**: User can set default region filters
- [ ] **PREF-04**: User preferences persist across sessions

### Bookmarks

- [ ] **BOOK-01**: User can save articles to bookmarks
- [ ] **BOOK-02**: User can unsave articles from bookmarks
- [ ] **BOOK-03**: User can view all bookmarked articles on BookmarksPage

### Reading History

- [ ] **HIST-01**: User's read articles are tracked automatically
- [ ] **HIST-02**: User can view reading history
- [ ] **HIST-03**: User sees personalized feed based on reading patterns

### User Interface

- [ ] **UI-01**: User can view and edit profile on UserProfile page
- [ ] **UI-02**: User can manage all preferences on SettingsPage

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Performance (Phase 7)

- **PERF-01**: Application loads with Lighthouse score 90+
- **PERF-02**: Database migrated to PostgreSQL for scale
- **PERF-03**: Redis caching for API responses
- **PERF-04**: Service Worker enables offline reading

### Testing (Phase 8)

- **TEST-01**: Unit test coverage reaches 80%
- **TEST-02**: E2E tests cover auth flows
- **TEST-03**: Load tests validate 10k concurrent users

### Deployment (Phase 9)

- **DEPLOY-01**: CI/CD pipeline with GitHub Actions
- **DEPLOY-02**: Docker containerization
- **DEPLOY-03**: Production error tracking with Sentry

### Advanced Features (Phase 10)

- **ADV-01**: Multi-language UI (i18n)
- **ADV-02**: Team collaboration features
- **ADV-03**: Premium export features

## Out of Scope

Explicitly excluded from all milestones.

| Feature | Reason |
|---------|--------|
| Mobile native app | Web-first approach, PWA sufficient |
| Real-time chat | Not core to news analysis value |
| Video content | Storage/bandwidth costs, text focus |
| Paid subscriptions | Monetization deferred post-validation |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AI-01 | Phase 1 | Complete |
| AI-02 | Phase 1 | Complete |
| AI-03 | Phase 1 | Complete |
| AI-04 | Phase 1 | Complete |
| EVT-01 | Phase 2 | Complete |
| EVT-02 | Phase 2 | Complete |
| EVT-03 | Phase 2 | Complete |
| EVT-04 | Phase 2 | Complete |
| AUTH-01 | Phase 3 | Pending |
| AUTH-02 | Phase 3 | Pending |
| PREF-01 | Phase 4 | Pending |
| PREF-02 | Phase 4 | Pending |
| PREF-03 | Phase 4 | Pending |
| PREF-04 | Phase 4 | Pending |
| BOOK-01 | Phase 5 | Pending |
| BOOK-02 | Phase 5 | Pending |
| BOOK-03 | Phase 5 | Pending |
| HIST-01 | Phase 6 | Pending |
| HIST-02 | Phase 6 | Pending |
| HIST-03 | Phase 6 | Pending |
| UI-01 | Phase 6 | Pending |
| UI-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-18*
*Last updated: 2026-04-18 after Phase 2 complete (EVT-01, EVT-02, EVT-03, EVT-04 all complete)*
