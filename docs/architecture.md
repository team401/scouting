# Team 401 Scouting architecture

## Decision summary

Use a Cloudflare-first stack: Next.js/TypeScript through Vinext on Workers, D1 for relational application data, R2 for robot photos and match video, and Worker route handlers for the API, scheduled TBA refresh, webhook ingestion, exports, and signed upload URLs. Keep the TBA key and webhook secret server-side.

The application and its data services stay in one Cloudflare account. D1 provides the relational model needed for event analysis, rankings, and stable exports, while IndexedDB provides explicit offline storage and synchronization on scouting devices.

Authentication uses first-party email/password accounts through Better Auth on the same Worker and D1 database; scouts do not need an external identity provider. Passwords are hashed by the authentication library and sessions use secure HTTP-only cookies. The first account creates the Team 401 organization as owner. The owner or an admin configures a team invite code, stored as a salted one-way hash in D1, which all later signups must provide. Later signups join as scouts until an owner or admin changes their role. Authorization is always checked server-side against `memberships`. Never accept an organization ID from the client without validating membership. Roles are ordered by permission, not by display name: owner, admin, strategy, scout, and video. Add email verification and password-reset delivery before production rollout.

On Cloudflare Workers, Better Auth reads `CF-Connecting-IP` for per-client rate
limits. Cloudflare replaces this header at the edge, so clients cannot select
their own rate-limit identity. Authentication migrations may rebuild the
ephemeral `rate_limits` table without affecting users or sessions.

Authentication endpoints use D1-backed rate limiting so limits are consistent
across Worker isolates. Owners and admins may disable or remove memberships;
both actions revoke active sessions while retaining historical scouting records.
Users can inspect and revoke their own device sessions. Email verification and
password reset remain blocked on selecting and configuring a transactional
email provider; they must not be presented as working features until delivery
is configured and tested for `team401.org`.

## Offline model

The PWA service worker caches the app shell and recently used read data. IndexedDB stores current-event schedule/team snapshots, drafts, and an append-only mutation outbox. Every mutation has a client-generated UUID, organization ID, client timestamp, schema version, and idempotency key.

When online, the client sends queued mutations in order. The server performs idempotent upserts and returns an authoritative sync version. Match scouting is immutable after submission for scouts unless reopened by strategy/admin; this removes most conflict ambiguity. Draft conflicts use last-write-wins only within the same user-owned draft. Official pick lists, alliance state, and match plans use optimistic concurrency and reject stale versions for an explicit reload/merge.

The Home screen includes an offline-readiness check that independently verifies
the cached application shell and current event pack. Devices can refresh both
before leaving connectivity, inspect rejected outbox items, export queued
mutations and drafts as an emergency JSON backup, and clear drafts without
deleting submitted records that are still waiting to synchronize.

Queued match submissions can also move between devices through the QR relay.
Each browser generates a non-exportable P-256 signing key and registers only
its public key while online. An offline sender compresses and signs up to 24
queued submissions, displays them as animated QR frames, and retains its local
copy. The connected receiver reassembles the frames and sends the signed
envelope to the relay endpoint. The server verifies the registered device,
organization membership, signature, event, and mutation IDs before storing the
entries under the original scout—not the relay operator. Existing mutation IDs
make rescanning safe and idempotent; photos and videos are never included.

The current event, its teams, match schedule, assignments, and the season form definition are downloaded together as an “event pack.” A scout must be able to open the app, complete several matches, close/reopen it, and later synchronize without connectivity.

## Year-to-year game support

Stable concepts stay relational: organization, event, match, team, station, scout, assignment, pit record, pick list, plan, and media. Game-specific answers live in a versioned JSON payload validated by a season definition.

Reusable field components include counters, boolean toggles, single/multi-select, timers, rating scales, field-position taps, cycle logs, defense/failure flags, endgame choices, and notes. Both 2025 and 2026 are definitions composed from these primitives; calculations and export columns are versioned alongside each definition. Never silently reinterpret an old payload after a season definition changes.

Exports are ZIP bundles containing `manifest.json`, `teams.csv`, `matches.csv`, `scouting.csv`, `pit.csv`, `plans.json`, and `pick-lists.json`. The manifest includes organization, event key, season, schema version, export timestamp, and per-file column definitions.

## TBA integration

An admin chooses a centrally stored `currentEventId`; clients never choose their own TBA event key. Initial sync fetches event and matches through the server. The current implementation treats the D1 event pack as the shared source of truth: the first online request after its 60-second freshness window reconciles schedules, predicted times, final scores, and results with TBA. Visible clients poll that shared cache every 45 seconds, and users can request an immediate refresh. Devices continue using their last IndexedDB event pack while offline.

TBA webhooks validate `X-TBA-HMAC` against the exact raw request body, then refresh every organization currently using the referenced event through the same reconciliation path. Webhooks accelerate updates rather than replace polling; offline devices still catch up during their next sync. A scheduled Worker remains a future fallback for times when no clients are open and TBA does not send a delivery.

## Media

The video role records outside the browser camera UI or through a simple capture input, then uploads directly to R2 using a short-lived signed URL. D1 stores ownership, match/team linkage, MIME type, byte count, checksum, and processing state. Uploads are resumable and queued until Wi-Fi is available. Apply an organization quota, default compression guidance, and retention policy before enabling full-match video broadly.

## Product phases

1. Foundation: accounts, organizations/roles, current event, TBA event pack, offline shell/outbox, 2025 match form, assignments, and CSV/JSON export.
2. Decisions: team summaries, data-quality coverage, comparison/radar views, custom weights, personal and official pick lists, and alliance-selection board.
3. Operations: pit scouting/photos, tablet match planning, notifications, TBA webhooks, audit log, and admin sync controls.
4. Media and hardening: video upload/playback, quotas/retention, load testing, backup/export restore, accessibility checks, and a real-event offline drill.

## Analysis views

Start with transparent aggregates rather than a single opaque score: sample count, median and percentile scoring by phase, consistency/variance, endgame rate, defense/failure rate, partner-adjusted trend, and data completeness. Alliance selection adds filters, side-by-side comparison, notes, “do not pick,” complementary-role tags, and a live board that marks drafted teams without deleting their original rank.
