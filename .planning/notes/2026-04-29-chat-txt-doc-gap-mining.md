---
date: "2026-04-29 20:41"
promoted: false
---

User hat den kompletten Session-Chat (CI green-pilgrimage, doc regen, forensic audit, deploy planning) in eine .txt kopiert. Idee: aus dem Chat-Verlauf die Lücken in der Doku füllen, die die Maintenance Log nicht abdeckt.

Was im Chat steht aber NICHT in den Docs:
- Trajectory + Reasoning der E2E-Fixes (67 → 111 → 127 → 133 → 135 → 143 → 144 → 142 → 143). CLAUDE.md hat nur den Endzustand.
- Warum networkidle vs domcontentloaded gescheitert ist (Socket.io polling) — kurz in CLAUDE.md, ausführlich im Chat
- Warum publicApi serial mode nötig wurde (fullyParallel splittet describes über Worker, module-scope state ist undefined für N>0) — flach in CLAUDE.md
- Branch-protection contexts mismatch (lint vs Lint) — Story der Fehlersuche fehlt
- Production environment config (required reviewer + branch policy) — was eingestellt ist steht in CLAUDE.md, warum nicht
- Hetzner/DuckDNS/GitHub-PAT deploy plan — komplett undokumentiert, nur Maintenance Log Open Threads
- Doc regen Pattern: 9 parallel gsd-doc-writer agents, was funktionierte/was nicht
- can_admins_bypass UI-flip workaround — Maintenance Log hat nur Hinweis

Wann angehen: nicht in Phase 38, sondern als eigene Doku-Session nach Phase 38 / vor Milestone v1.7. User hat explizit gesagt "das hat zeit bis später".

Wie: chat.txt einlesen, gegen die existierenden Docs (CLAUDE.md, docs/*.md) diffen, neue Sections in CONTRIBUTING.md (CI-Story) oder einer neuen `docs/RUNBOOK.md` (deploy + ops) ergänzen. gsd-doc-writer agent kann das übernehmen wenn man ihm die chat.txt als context_input gibt.
