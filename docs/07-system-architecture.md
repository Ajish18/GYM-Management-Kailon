# 8. System Architecture

## 8.1 Architecture Style

Kailon is a **multi-tenant, single-database, shared-schema SaaS application** built on a Next.js full-stack architecture (frontend + API routes in one deployable), backed by PostgreSQL via Prisma, deployed on Vercel with Supabase providing managed Postgres and object storage.

Chosen over alternatives:
- **Shared schema (not schema-per-tenant, not database-per-tenant)**: lowest operational overhead at the target scale (thousands of gyms, not thousands of huge enterprises), simplest migrations, and Postgres row-level filtering with proper indexing comfortably handles the projected data volume (NFR-SCALE-001). Every tenant-scoped table is partitioned logically by `gym_id`.
- **Next.js Route Handlers over a separate backend service**: one deployable, one repo, shared TypeScript types/Zod schemas between client and server, fastest path to production for the team size building this. Route Handlers are organized as a de facto REST API (see [10-api-design.md](10-api-design.md)) so a future extraction to a standalone service remains possible without a rewrite.

## 8.2 High-Level Diagram (logical)

```
┌─────────────────────────────────────────────────────────────────┐
│                            Clients                                │
│  Owner/Trainer/Member/Receptionist Web App   Platform Admin App   │
│         (Next.js, responsive, PWA-capable)                        │
└───────────────────────────┬────────────────────────────────────-─┘
                             │ HTTPS (TLS) / JSON / JWT bearer
┌───────────────────────────▼────────────────────────────────────-─┐
│                     Vercel Edge / Next.js App                     │
│  ┌───────────────┐  ┌───────────────────┐  ┌───────────────────┐  │
│  │  App Router    │  │  API Route         │  │  Middleware        │ │
│  │  (RSC pages)   │  │  Handlers (REST)   │  │  (auth, tenant     │ │
│  │                │  │                    │  │   scoping, rate    │ │
│  │                │  │                    │  │   limiting)        │ │
│  └───────────────┘  └─────────┬──────────┘  └───────────────────┘  │
└────────────────────────────────┼──────────────────────────────────┘
                                  │ Prisma Client (pooled)
┌─────────────────────────────────▼─────────────────────────────────┐
│                    Supabase (managed Postgres)                     │
│   - Single shared schema, gym_id-partitioned tenant tables         │
│   - Connection pooler (transaction mode) for serverless concurrency│
│   - Point-in-time recovery / automated backups                     │
└──────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼─────────────────────────────────┐
│                    Supabase Storage (object storage)                │
│   Buckets: profile-photos, progress-photos, chat-attachments,      │
│            receipts-invoices, gym-branding                          │
│   Access: signed URLs only, private buckets, bucket-per-purpose     │
└──────────────────────────────────────────────────────────────────┘

Supporting services (cross-cutting):
  - Background jobs (queue/cron): expiry checks, streak computation,
    notification dispatch, scheduled report exports
  - Email provider (transactional): password reset, invites,
    expiry/renewal notices (v1.x)
  - GitHub Actions: CI (lint/typecheck/test) + CD (Vercel deploy)
```

## 8.3 Application Boundaries

Two logically separate front-ends, one codebase:

1. **Tenant App** (`/app/(tenant)/...`) — Owner, Receptionist, Trainer, Member. Every route and API call is bound to a `gym_id` resolved from the session.
2. **Platform Console** (`/app/(platform)/...`) — Super Admin only. No `gym_id` binding; cross-tenant metadata views plus the impersonation entry point.

Both share the same Next.js deployment and database, separated by role-gated routing/middleware, not by separate deployments — this keeps infra simple while the platform console's blast radius is contained entirely by authorization checks (see [11-security-design.md](11-security-design.md)).

## 8.4 Request Flow (typical authenticated write)

1. Client sends request with `Authorization: Bearer <accessToken>` (or httpOnly cookie carrying it, per final auth transport decision — see 8.6).
2. **Middleware** verifies JWT signature/expiry, extracts `userId`, `role`, `gymId`; rejects with 401 if invalid/expired.
3. **Route Handler** re-derives authorization: role permission check for the specific action (see [09-permission-matrix.md](09-permission-matrix.md)), never trusting any `gymId`/`role` passed in the request body.
4. **Zod schema** validates request payload; invalid payload → 422 with field-level errors.
5. **Service/data-access layer** executes the operation via Prisma, with every query pre-scoped to `gymId` (helper functions wrap Prisma calls so `gym_id` filtering cannot be forgotten).
6. Financial/state-changing operations run inside a **Prisma transaction**; on success, an **audit log entry** is written in the same transaction.
7. Response serialized via a shared Zod response schema (prevents accidental over-fetching of sensitive fields).
8. **Notification/streak/report** side effects that are not required for the response are enqueued as background jobs rather than executed inline.

## 8.5 Multi-Tenancy Model

- **Tenant key**: `gym_id` (UUID), present on every tenant-scoped table.
- **Isolation mechanism**: application-layer enforcement via a shared data-access layer (every query helper requires `gymId` as a parameter) + defense-in-depth via Postgres Row-Level Security policies keyed on a session-set `app.current_gym_id` where feasible with the pooled-connection model.
- **Platform tables** (no `gym_id`): `platform_admins`, `subscription_plans`, `gym_subscriptions`, `platform_announcements`, `platform_audit_logs`.
- **Cross-tenant access**: only via a dedicated, logged `impersonation_sessions` table that time-boxes a Super Admin's elevated access to one `gym_id`.

## 8.6 Authentication & Session Architecture

- JWT **access token** (short-lived, ~15 min) carries `sub` (userId), `role`, `gymId` (null for Super Admin), `iat`/`exp`.
- JWT **refresh token** (long-lived, rotating, ~30 days), stored httpOnly + Secure + SameSite=Lax cookie; access token likewise cookie-delivered to avoid client-side token storage (mitigates XSS token theft) — see [11-security-design.md](11-security-design.md).
- Refresh rotation: each refresh issues a new refresh token and invalidates the previous one (reuse detection → force logout of that token family, flags account for review).
- `sessions` table tracks active refresh-token families for session listing/revocation (FR-AUTH-008).

## 8.7 Background Processing

Given a serverless (Vercel) deployment, background work runs via:
- **Scheduled jobs** (Vercel Cron → hits an internal, auth-protected Route Handler) for: nightly membership-expiry sweep, streak computation rollups, notification generation, scheduled report cleanup.
- **Async task queue** (e.g., a lightweight Postgres-backed job table processed by a cron-triggered worker route, or a managed queue if volume requires it later) for: large report export generation, bulk notification dispatch, bulk CSV import processing.

This keeps request/response handlers fast (NFR-PERF-001) and avoids serverless function timeout risk on heavy operations.

## 8.8 Storage Architecture (Supabase Storage)

| Bucket | Contents | Access |
|---|---|---|
| `profile-photos` | User/member profile images | Private, signed URL, owner+staff+self read |
| `progress-photos` | Member transformation photos | Private, signed URL, scoped to member + assigned trainer + owner |
| `chat-attachments` | Messaging images/PDFs | Private, signed URL, scoped to conversation participants |
| `receipts-invoices` | Generated PDF invoices/receipts | Private, signed URL, scoped to member + gym staff |
| `gym-branding` | Logos, gym-level assets | Private, signed URL, cacheable, scoped to gym + public member-facing app shell |

All uploads validated server-side for MIME type and size before a signed upload URL is issued (never direct anonymous upload).

## 8.9 Environments & Deployment Pipeline

| Environment | Purpose | Database |
|---|---|---|
| `local` | Developer machines | Local/branch Supabase Postgres |
| `preview` | Per-PR Vercel preview deployments | Ephemeral/shared dev Supabase branch |
| `staging` | Pre-production QA, mirrors prod config | Dedicated Supabase project |
| `production` | Live customer traffic | Dedicated Supabase project, backups + PITR enabled |

CI/CD (GitHub Actions → Vercel):
1. PR opened → typecheck, lint, unit tests, Prisma migration diff check → Vercel preview deploy.
2. Merge to `main` → full test suite → Prisma migration applied to staging → staging smoke test → manual promotion to production (or automated after a soak window, per release policy).
3. Production deploy is atomic (Vercel immutable deployments); rollback = re-promote prior deployment.

## 8.10 Third-Party Integrations (v1 and reserved)

| Integration | Purpose | Phase |
|---|---|---|
| Supabase Postgres | Primary database | v1 |
| Supabase Storage | Object storage | v1 |
| Transactional email (e.g., Resend/SES-class provider) | Invites, password reset, expiry notices | v1 (core), v1.x (notification breadth) |
| Payment gateway (Razorpay/Stripe-class) | Online payments, auto-renewal | v2 |
| WhatsApp Business API | Notifications | v2 |
| Push notification service (FCM/APNs via a future mobile app) | Push notifications | v2 |
| Wearables (Google Fit / Apple Health) | Activity sync | v2 |

## 8.11 Why This Scales

- Stateless compute (Vercel functions) scales horizontally with traffic automatically; no server fleet to manage.
- `gym_id`-indexed queries keep per-tenant query cost flat as total platform data grows — a query for Gym #8,412's members never scans other tenants' rows.
- Read-heavy dashboard/report endpoints are candidates for edge caching / TanStack Query client caching to keep DB load proportional to real usage, not page views.
- Clear extraction seams (Route Handlers as a REST boundary, Prisma as the sole DB access path) mean the backend can be split into a standalone service later without changing the frontend contract, if scale ever demands it.
