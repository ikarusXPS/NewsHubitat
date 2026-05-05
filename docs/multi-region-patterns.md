# Multi-Region Deployment Patterns

> Phase 37 / INFRA-05 deliverable. Architecture-only — no vendor templates.
> Implementation lives in INFRA-F01 (active-active), INFRA-F02 (Kubernetes), INFRA-F03 (CDN edge).
> Last updated: 2026-04-29

This document describes patterns for deploying NewsHub across multiple regions
when single-region capacity (currently sized for ~30k concurrent users via
Phase 37's Docker Swarm topology) is no longer sufficient. It does NOT contain
deployment recipes for any specific cloud vendor — vendor-specific guidance
belongs in INFRA-F01 territory, where the actual implementation phase will pick
a target provider and build the topology.

The lock that produced this doc is **DEPLOY-03** (Phase 37 CONTEXT.md): the
multi-region deliverable for Phase 37 is *one architecture markdown file*. No
copy-pasteable templates, no vendor recipes, no concrete connection strings,
no account or project IDs. Documentation only.

## Table of Contents

1. [When to go multi-region](#1-when-to-go-multi-region)
2. [Active-active vs active-passive](#2-active-active-vs-active-passive)
3. [Postgres replication options](#3-postgres-replication-options)
4. [Redis replication options](#4-redis-replication-options)
5. [Latency-vs-consistency trade-offs](#5-latency-vs-consistency-trade-offs)
6. [CDN edge caching](#6-cdn-edge-caching)
7. [Operational considerations](#7-operational-considerations)
8. [What this phase does NOT do](#8-what-this-phase-does-not-do)

---

## 1. When to go multi-region

Multi-region deployment is justified by ONE of three forcing functions. If none
apply, the operational tax (deploy ordering, replication-lag monitoring,
conflict-resolution runbooks, doubled cloud bill) outweighs the benefit. Stay
single-region.

**Latency goals.** If users in a populated region routinely see > 200 ms RTT
to your primary deployment and engagement metrics correlate with that latency,
geographic distribution can pull p95 global latency below 100 ms. Realistic
target: < 100 ms p95 from each populated region to its nearest replica. Note
that a CDN edge layer (section 6) often closes most of the gap for read-mostly
workloads without requiring a full multi-region application deployment — try
the cheap option first.

**Data residency obligations.** GDPR (EU-resident user data must be stored and
processed in the EU), PIPL (China), LGPD (Brazil), and several other
regulations require user data to live in specific jurisdictions. NewsHub does
not currently trigger any of these for its current user base, but expansion
plans should trigger a residency analysis BEFORE engineering work — the
regulatory scope determines which regions are mandatory and which are
optional.

**Availability targets.** A single-region deployment has a hard RTO floor
around minutes (the time to spin up a fresh region from backups). RPO depends
on backup cadence — typically minutes to an hour. If contractual or product
commitments require RTO < 5 min and RPO < 1 min, multi-region active-passive
(or active-active) becomes mandatory; backup-only DR cannot meet those
windows.

**What 30k concurrent users does NOT need.** At Phase 37's target load profile,
single-region Swarm with 4 web replicas + 1 worker singleton is sized
comfortably. Multi-region is a constant operational tax — every deploy runs
twice, every alert fires per region, every schema migration must be sequenced
across regions. The marginal cost outweighs the marginal benefit at this load
level.

**What 300k+ concurrent users probably DOES need.** At an order of magnitude
higher, single-region capacity headroom shrinks to the point where regional
outages become material to product SLOs. Multi-region active-passive is the
typical first step (HA-driven), with active-active reserved for the latency
tier above that.

## 2. Active-active vs active-passive

Two fundamentally different operational shapes, picked for different reasons.

**Active-passive** (also "primary-secondary"): one region serves all live
traffic. Other regions hold near-real-time replicas of state, ready to take
over on failover. Lower operational complexity (no conflict resolution); higher
RTO (failover takes seconds to minutes); simpler reasoning about what is
authoritative.

- **Fits when**: HA is the goal (RTO/RPO targets), latency is acceptable from
  the primary region, write rate is moderate.
- **Doesn't fit when**: You need users in distant regions to see local
  read-after-write latencies. The standby region serves no live reads.

**Active-active**: all regions serve traffic simultaneously. Each region's
reads go to its local replicas; writes are handled by one of two routing
strategies:

- **Per-user pinning** ("home region per user"): every user has a home region
  recorded at signup; their writes always land there. Avoids most cross-region
  write conflicts but loses the latency benefit for write-heavy users who
  travel.
- **Nearest-region writes**: any region accepts any user's writes. Requires
  conflict resolution — typically Last-Write-Wins (LWW) on a single field
  basis, or CRDTs (counters, sets, registers) for richer types. CRDTs are
  expensive to retrofit into a relational schema; greenfield CRDT-friendly
  designs are easier.

**NewsHub fit.** Active-active works for NewsHub's read-heavy profile
reasonably well. Most user interactions are reads (browse articles, view
perspective comparisons, read AI Q&A responses). The write paths (Comments,
Bookmarks, ReadingHistory, Team interactions) tolerate eventual consistency
well as long as **read-after-write within a region** is preserved — a user
posting a comment must see their own comment on refresh; another user in a
different region seeing it a few seconds later is fine.

**The single hard write path.** RSS aggregation by `app-worker` (Phase 37,
JOB-01) MUST remain a global singleton. It should run in exactly one region,
either pinned to the primary region or chosen by leader election across
regions. Running the worker in two regions causes duplicate `NewsArticle`
inserts (no cross-region uniqueness constraint without distributed locking)
and produces duplicate cross-region broadcasts of `news:new`. Cross-region
replicas of `NewsArticle` propagate via Postgres replication (section 3).

**Stripe / subscription / webhook handling.** This is also a global
singleton — payment confirmations must be globally consistent the moment they
land. Pin the Stripe webhook handler and subscription state writes to the
home region. Other regions read the replicated subscription state with a
short staleness window (sub-second is fine; payments are not the latency
hot path).

## 3. Postgres replication options

| Option                                                  | When it fits                                                                                  | Trade-off                                                                                       |
|---------------------------------------------------------|-----------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| **Streaming replication** (built-in)                    | Single-primary; reads can fan out to local replicas                                           | Async lag (typically < 1 sec); failover is manual or via Patroni / repmgr                       |
| **Logical replication** (built-in)                      | Selective table sync; supports cross-version upgrades; bidirectional setups (with care)       | More moving parts; conflict handling is application logic in bidirectional mode                 |
| **Aurora Global Database** (managed, AWS)               | Multi-region read replicas with sub-second cross-region lag, well-tooled failover             | Vendor-specific; paid; locks the database tier to AWS                                           |
| **Cloud SQL cross-region read replicas** (managed, GCP) | Similar shape to Aurora Global, GCP-flavored                                                  | Vendor-specific; paid; locks to GCP                                                             |
| **Neon branching / replication** (managed, multi-cloud) | Modern serverless Postgres; branching is useful for staging+production parity                 | Newer; vendor risk smaller than the hyperscalers but still real                                 |

**Streaming replication** is the default starting point for INFRA-F01:
single primary in the home region, async streaming to read replicas in other
regions. NewsHub's read-heavy profile means a single primary plus per-region
read replicas captures most of the latency win without paying the
multi-master conflict-resolution tax. Read replicas serve `GET /api/news`,
`GET /api/news/sources`, `GET /api/clusters`, and similar query paths;
writes (article inserts from the worker, Comments, Bookmarks) flow back to
the primary.

**Logical replication** is the right tool when the topology needs to be more
selective — for example, replicating only the `NewsArticle` and `NewsSource`
tables to a read-only analytics region, or upgrading across major Postgres
versions without taking the primary offline. For Phase 37's straightforward
read-fanout case, logical replication is overkill.

**Multi-master Postgres is hard.** Solutions exist (BDR, Bucardo,
pglogical-based bidirectional configurations, Yugabyte's
Postgres-compatible distributed engine) but conflict resolution becomes
application logic. For NewsHub's read-heavy profile and singleton write
path (the worker), the conflict-resolution cost cannot be justified by the
write-latency win. Recommendation for INFRA-F01: start with single-primary
streaming replication; revisit multi-master only if write latency
becomes a measured problem (it currently isn't, and can't become one
without an orders-of-magnitude growth in user-driven writes).

**Connection pooling across regions.** Phase 37 fronts Postgres with PgBouncer
in transaction-pool mode. In a multi-region setup, each region runs its own
PgBouncer pointing at its local Postgres replica (for reads) and the primary
region's Postgres directly via `DIRECT_URL` (for writes that bypass the
read replica). This is a mechanical extension of the Phase 37 pattern;
no new architectural concept.

## 4. Redis replication options

| Option                                                              | When it fits                                                                          | Trade-off                                                                                |
|---------------------------------------------------------------------|---------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| **Master-replica** (built-in)                                       | Async replication; eventually consistent; replicas are read-only                       | Failover requires Sentinel or external orchestration; no automatic conflict resolution   |
| **Redis Cluster** (built-in)                                        | Sharded across nodes; each shard has master + replicas; horizontally scalable          | Operational complexity grows; multi-key transactions across shards are forbidden         |
| **Elasticache cross-region replication groups** (managed, AWS)      | AWS-managed multi-region                                                              | Vendor-specific; paid; locks Redis tier to AWS                                           |
| **Upstash Global** (managed, multi-cloud)                           | Globally distributed Redis with strong eventually-consistent reads                     | Newer; cost model is per-operation, can be expensive at high write rate                  |

**Critical Phase 37 note: the Socket.IO Redis adapter assumes a single
Pub/Sub plane.** Phase 37 wires `@socket.io/redis-adapter` (WS-01) so that
when one web replica emits an event, every other replica's connected clients
receive it via the shared Redis Pub/Sub channels. In a single-region
deployment, that is exactly what we want. In a multi-region deployment, that
shared plane becomes a cross-region fanout bottleneck: a publish from region
A pays inter-region latency to reach subscribers in region B, and Redis
Pub/Sub delivers no durability guarantee — if the cross-region link blips, the
publish is silently lost.

The recommended pattern for multi-region WebSocket fanout is:

- **Each region runs its own Redis instance and its own `redis-adapter`.**
  Within a region, the existing fanout pattern is unchanged: publishes from
  any web replica reach all subscribers in the region.
- **Cross-region fanout flows via Redis Streams replicated across regions**,
  with a per-region consumer that re-emits onto the local adapter. Streams
  are durable (replayable from a stored offset) so a transient cross-region
  network blip becomes lag, not loss. The consumer translates a Stream entry
  into a local Pub/Sub publish, which the local adapter then fans out to all
  region-local subscribers as if it had originated in the region.

This adds two operational pieces:

1. A region-local Stream consumer (a small Node process, or a worker thread
   in `app-worker`'s replica) that reads cross-region Streams and re-emits
   locally.
2. Stream replication topology — typically Redis-to-Redis replication of the
   Streams keyspace, or a managed equivalent (Upstash Global, Elasticache
   global datastore).

This is INFRA-F01 territory. Phase 37 deliberately does NOT ship it because
single-region Phase 37 doesn't need it, and a multi-region fanout layer
without a multi-region application deployment is dead weight.

**AI cache, rate-limit counters, JWT blacklist.** These are all per-region
state. Region-local Redis is correct: an AI response cached in region A doesn't
need to be visible to region B (it'll be re-computed locally and cached
region-locally), rate-limit counters are per-user-per-region (a user typically
talks to one region at a time), and the JWT blacklist follows the user's home
region.

## 5. Latency-vs-consistency trade-offs

CAP framing: in a partition, you choose Availability or Consistency. In
practice, multi-region designs are tuned per-data-domain — consistency
requirements vary by table. For NewsHub specifically:

| Data domain                                              | Consistency requirement                                                                                                                       | Multi-region pattern                                                                       |
|----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| **NewsArticle** (RSS-aggregated)                         | Eventual consistency is fine. Articles are immutable once written; cross-region replication lag of a few seconds doesn't hurt UX.             | Single-region writes (worker singleton); async replication to read regions.                |
| **NewsSource** metadata                                  | Static, edited rarely. Eventual consistency is fine.                                                                                          | Same.                                                                                      |
| **User accounts**                                        | Read-after-write within a region is required (a just-registered user must be able to log in). Cross-region read-after-write isn't required.   | Per-user pinning (route user to home region); replicate User table for failover.           |
| **Comments**                                             | Read-after-write within a region required. Cross-region is eventually consistent.                                                             | Region-local writes; logical/streaming replication for cross-region read.                  |
| **Bookmarks, ReadingHistory, TeamBookmark**              | Same as Comments.                                                                                                                             | Same.                                                                                      |
| **Subscription / Stripe state**                          | Strong consistency: a payment confirmation must be globally visible immediately.                                                              | Pin all subscription / Stripe webhook handling to the home region (single-primary).        |
| **JWT blacklist** (Redis)                                | Strong consistency: a revoked token must be rejected globally before its TTL.                                                                 | Cross-region Redis replication for the blacklist keyspace, OR shorter token TTL.           |
| **Rate-limit counters** (Redis)                          | Per-region is acceptable (a user usually hits one region per session).                                                                        | Region-local Redis.                                                                        |
| **AI cache** (Redis)                                     | Eventually consistent; cache misses re-compute the AI response.                                                                               | Region-local Redis.                                                                        |
| **Real-time WebSocket events**                           | Within-region: instant. Cross-region: best-effort, eventual delivery.                                                                         | Region-local adapter; cross-region via Redis Streams (section 4).                          |

NewsHub leans heavily eventually-consistent because most state is read-mostly
news data. The exceptions (Auth, Subscription, JWT revocation) get
single-primary or strong-consistency treatment and accept the latency cost
in exchange for correctness.

**Read-heavy profile note.** The product analytics already confirm reads vastly
outnumber writes. The read paths for `/api/news`, `/api/news/:id`,
`/api/clusters`, `/api/events/geo`, and the AI Q&A response cache all
tolerate eventually-consistent local reads. This is the structural reason
multi-region is viable for NewsHub at all — a write-heavy product (chat,
collaborative editing) would require a much more conservative topology.

## 6. CDN edge caching

A regional edge cache layer (Cloudflare, Fastly, AWS CloudFront, Bunny,
KeyCDN, others) reduces the latency win that multi-region requires from
"deploy in 4 regions" to often "deploy in 2 regions + edge cache". Edge
caching alone — without multi-region application deployment — closes most of
the global-latency gap for read-mostly traffic. For a read-heavy product like
NewsHub, edge caching is usually the cheaper first step.

**Cacheable at edge.** These endpoints already emit headers compatible with
edge caching:

- `GET /api/news` — `Cache-Control: public, max-age=300` (set in
  `apps/web/server/routes/news.ts`). 5-minute edge cache hits absorb the bulk
  of read traffic.
- `GET /api/news/sources` — `Cache-Control: public, max-age=86400`. 24-hour
  cache; sources change rarely.
- `GET /api/news/:id` — `Cache-Control: public, max-age=600`. Per-article;
  edge cache works because article bodies are immutable post-write.
- `GET /api/clusters` (or analogous topic-clustering endpoints) —
  `Cache-Control: public, max-age=600`. 10-minute cache.
- Static frontend assets (JS, CSS, fonts, hashed asset URLs) — already
  immutable-cacheable; this is standard frontend deploy hygiene.

**NOT cacheable at edge.** These paths must bypass the edge:

- `GET /api/auth/me` — per-user; would leak user identity if cached at the
  shared edge.
- `GET /api/account/*` — per-user account data, GDPR-sensitive.
- `GET /api/history` — per-user reading history.
- `GET /api/bookmarks` — per-user.
- `POST /*`, `PUT /*`, `DELETE /*`, `PATCH /*` — never cache mutations.
- WebSocket connections (`/socket.io/*`) — long-lived; CDN typically passes
  through unchanged. Edge caching is irrelevant for WS.
- Stripe webhook ingress (`/api/webhooks/stripe`) — must reach origin
  unmodified for HMAC signature verification.

**Cache key dimensions.** Region-aware caching needs the cache key to include
relevant variation: query parameters that drive content (`regions`, `topics`,
`search`, `sentiment`, `language`), and the `Vary: Accept-Encoding` header
for compression negotiation. Avoid caching on `Authorization` (it would
fragment the cache per JWT, defeating the point).

**Stale-while-revalidate.** Most CDNs support `stale-while-revalidate`; pair
it with the existing `max-age` so users see a cached response immediately
while the edge revalidates in the background. This is a free latency win for
the news read paths.

CDN edge caching implementation is **INFRA-F03**. Phase 37 does not implement
it; this section is a pointer at the strategy and the headers already in
place that make it cheap to enable when INFRA-F03 lands.

## 7. Operational considerations

Architectural pieces that must be designed before a multi-region deploy goes
live, but that don't change the application code shape.

**DNS-based routing.** Multi-region deployment requires intelligent DNS to
route users to the right region:

- **GeoDNS** — routes by client geographic IP. Simple, coarse-grained, works
  for most users; fails for users behind VPNs or mobile-carrier NAT (the
  apparent IP location is wrong).
- **Latency-based routing** (e.g. AWS Route 53 latency-based routing) —
  measures actual RTT from the resolver and picks the lowest-latency region.
  Works better for VPN/NAT cases because it measures network behavior, not
  IP geography.
- **Anycast** (Cloudflare, Fastly, Bunny CDN) — single IP advertised from all
  regions; the network routes to the nearest BGP peer. Simplest from the
  application's perspective; requires anycast-capable upstream providers.

For NewsHub, anycast via the chosen CDN is the cleanest answer if INFRA-F03
(CDN edge) lands first; latency-based routing is the fallback if a CDN is not
in front.

**Deploy ordering.** Multi-region rolling deploys must be sequenced
deliberately:

- **Schema migrations first, all regions before app rollout.** Phase 37 already
  separates `DATABASE_URL` (via PgBouncer) from `DIRECT_URL` (bypassing
  PgBouncer for migrations) per DB-02. Multi-region extends this: run
  `prisma migrate deploy` against every region's primary BEFORE rolling out
  any new application image. Backward-compatible migrations (additive) make
  this easy; backward-incompatible migrations (column rename, type change)
  require expand-then-contract patterns that are documented separately.
- **App rollout, region by region.** Deploy to one region, monitor for 15
  minutes (error rate, latency p95, replication lag), then proceed to the
  next region. Minimizes blast radius — a bad deploy is contained to one
  region.
- **Worker singleton during rollout.** The `app-worker` runs in exactly one
  region. Rolling that single replica is a `stop-first` Swarm update (Phase
  37 DEPLOY-04) — no concurrent worker windows. Across regions, the worker
  always lives in the home region; failover to a secondary region is a
  manual or leader-election event, not a rolling-deploy event.

**Monitoring across regions.** Prometheus federation is the standard pattern:
each region's Prometheus instance scrapes that region's services, and a
global aggregator Prometheus federates from all the regional ones. Phase 20
already runs Prometheus + Grafana + Alertmanager; multi-region adds
federation rules (each regional Prometheus exposes a `/federate` endpoint;
the global one queries it). Sentry already supports per-environment tagging
(Phase 18 / CI release tagging) — extend by tagging the region as well so
cross-region error rates are comparable in the Sentry UI.

**Operational concern: Traefik dashboard exposure.** If multi-region
operators need the Traefik dashboard (port 8080 in Phase 37 / Plan 04), keep
the bind to `127.0.0.1:8080:8080` per Plan 04's mitigation. Never expose the
dashboard on `0.0.0.0:8080` in production — it leaks routing topology and
backend service names to the public internet. SSH-tunnel into the host or
front it with an authenticated reverse proxy.

**Replication-lag monitoring.** Add Prometheus alerts on:

- Postgres replication lag > 5 seconds (warning) or > 30 seconds (critical) on
  any read replica.
- Redis replication offset drift between regions (Stream consumer falling
  behind producer).
- Worker singleton heartbeat (RSS aggregation last-run timestamp) — alert if
  the worker hasn't ingested any sources for > 2x the aggregation interval.

**Incident response.** Per-region runbooks (which region is currently
authoritative, what the failover procedure is, who has paging access in each
region's time zone) are operational, not architectural — they live in the
ops repo, not in this document. The architectural primitive this document
provides is a stable mental model of which region owns what writes.

**Cost note.** Multi-region roughly doubles cloud cost (compute, database,
Redis, monitoring) and increases data-transfer cost (cross-region replication
is metered on most clouds). Budget accordingly before signing off on
INFRA-F01.

## 8. What this phase does NOT do

Explicit out-of-scope list, with forward pointers to the requirements that
will deliver each piece. These are tracked in `.planning/REQUIREMENTS.md`
under the "Future" section.

- **Active-active multi-region implementation.** Tracked under **INFRA-F01**.
  This document is the design lock; INFRA-F01 is the build.
- **Kubernetes migration.** Phase 37 ships on Docker Swarm. Migration to
  Kubernetes (for richer multi-region orchestration, namespace isolation
  across regions, Helm-based deploys) is **INFRA-F02**.
- **CDN edge caching implementation.** The cacheability headers exist (section
  6) but no CDN is wired in front of NewsHub yet. Tracked under **INFRA-F03**.
- **Vendor selection.** This doc deliberately does not name a primary cloud
  vendor or a primary CDN. Vendor selection belongs to INFRA-F01 / INFRA-F03
  where the cost / regional-coverage / lock-in trade-offs can be evaluated
  with concrete proposals.
- **Multi-region load testing.** Phase 21's k6 harness tests a single region.
  Multi-region load testing requires the multi-region deployment to exist
  first; that work belongs to INFRA-F01.
- **Cross-region failover automation.** Manual runbook for the foreseeable
  future; automated failover is a follow-on once basic multi-region is
  proven stable.

## References

- Phase 37 RESEARCH.md (`.planning/phases/37-horizontal-scaling/37-RESEARCH.md`),
  section "Multi-Region Patterns Doc Structure" — the source list of sections
  this doc enumerates.
- Phase 37 CONTEXT.md, **DEPLOY-03** — the lock that declares this deliverable
  as documentation only.
- `.planning/REQUIREMENTS.md` — **INFRA-05** (closed by this doc),
  **INFRA-F01**, **INFRA-F02**, **INFRA-F03** (future-phase pointers).
- Phase 37 Plan 04 SUMMARY (`37-04-SUMMARY.md`) — the production single-region
  Swarm topology that this doc is the explicit forward-looking complement to.
- Postgres high-availability docs:
  https://www.postgresql.org/docs/current/high-availability.html
- Redis replication docs: https://redis.io/docs/management/replication/
- Redis Streams docs: https://redis.io/docs/data-types/streams/
- `@socket.io/redis-adapter` docs: https://socket.io/docs/v4/redis-adapter/

---

*Phase: 37-horizontal-scaling | Plan: 07 | Closes INFRA-05 | DEPLOY-03 lock*
