# 7. Non-Functional Requirements

## 7.1 Performance

| ID | Requirement |
|---|---|
| NFR-PERF-001 | p95 API response time < 300ms for read endpoints, < 600ms for write endpoints, under nominal load. |
| NFR-PERF-002 | Dashboard initial load (LCP) < 2.5s on a mid-tier mobile device over 4G. |
| NFR-PERF-003 | All list endpoints (members, payments, attendance, reports) shall be paginated server-side; no unbounded result sets. |
| NFR-PERF-004 | Report generation (including export) shall complete within 10s for datasets up to 50,000 rows; larger exports shall be handled asynchronously with a download-when-ready notification. |

## 7.2 Scalability

| ID | Requirement |
|---|---|
| NFR-SCALE-001 | Architecture shall support 10,000+ tenant gyms and 5M+ member records without schema redesign (single shared Postgres schema, `gym_id` partition key on all tenant tables, indexed accordingly). |
| NFR-SCALE-002 | Stateless API layer (Next.js Route Handlers on Vercel) shall scale horizontally with zero session affinity requirements (JWT-based auth). |
| NFR-SCALE-003 | Database connection usage shall use a pooled connection strategy (e.g., PgBouncer/Supabase pooler) suitable for serverless function concurrency. |
| NFR-SCALE-004 | Heavy/async workloads (bulk export, bulk notification dispatch) shall be offloaded from the request/response cycle (queued background jobs), not run synchronously in an API route. |

## 7.3 Availability & Reliability

| ID | Requirement |
|---|---|
| NFR-AVAIL-001 | Target 99.9% monthly uptime for the application and API layer. |
| NFR-AVAIL-002 | Database shall have automated daily backups with point-in-time recovery retained for at least 7 days (30 days on higher tiers). |
| NFR-AVAIL-003 | All financial write operations (payments, invoices) shall be transactional — partial writes must not be possible (e.g., invoice created without payment record, or vice versa). |
| NFR-AVAIL-004 | System shall degrade gracefully: if a non-critical subsystem (e.g., notification dispatch) fails, core flows (check-in, payment) shall not be blocked. |

## 7.4 Security

Covered fully in [11-security-design.md](11-security-design.md). Headline requirements:

| ID | Requirement |
|---|---|
| NFR-SEC-001 | All traffic over TLS 1.2+; no plaintext HTTP in any environment. |
| NFR-SEC-002 | All tenant data access enforced server-side by `gym_id` scoping derived from the authenticated session — never trusted from client input. |
| NFR-SEC-003 | Passwords hashed (argon2id or bcrypt cost ≥ 12), never logged or returned in any API response. |
| NFR-SEC-004 | All state-changing endpoints protected against CSRF (SameSite cookies + double-submit or origin-check strategy appropriate to JWT-in-cookie transport). |
| NFR-SEC-005 | All user input validated server-side with Zod schemas regardless of client-side validation. |
| NFR-SEC-006 | File uploads restricted by type/size allowlist, scanned for MIME-type spoofing, stored in access-controlled Supabase Storage buckets with signed URLs (no public bucket listing). |

## 7.5 Multi-Tenancy & Data Isolation

| ID | Requirement |
|---|---|
| NFR-TENANT-001 | No API response shall ever contain data from a `gym_id` other than the requester's, under any role except an active, audited Platform Super Admin impersonation session. |
| NFR-TENANT-002 | Every tenant-scoped table shall carry a non-nullable `gym_id` foreign key and every query path shall filter on it (enforced via a shared data-access layer, not ad hoc per query). |
| NFR-TENANT-003 | Tenant deletion/offboarding shall support a data export (GDPR-style portability) followed by scheduled hard deletion after a retention window. |

## 7.6 Usability & Accessibility

| ID | Requirement |
|---|---|
| NFR-UX-001 | UI shall meet WCAG 2.1 AA contrast and keyboard-navigation standards. |
| NFR-UX-002 | All primary flows (check-in, payment collection, member registration) shall be completable on a touch device in under 5 taps/inputs from the relevant dashboard. |
| NFR-UX-003 | Every list/table view shall define explicit empty, loading, and error states — no blank screens. |
| NFR-UX-004 | UI shall support light and dark mode, respecting system preference by default with manual override. |

## 7.7 Compatibility

| ID | Requirement |
|---|---|
| NFR-COMPAT-001 | Fully responsive across desktop, tablet, and mobile viewport breakpoints; no desktop-only critical flows. |
| NFR-COMPAT-002 | Support latest two major versions of Chrome, Safari, Edge, Firefox, and their mobile equivalents (iOS Safari, Chrome Android). |

## 7.8 Maintainability & Engineering Quality

| ID | Requirement |
|---|---|
| NFR-MAINT-001 | Strict TypeScript across frontend and backend; no `any` in shared/lib code. |
| NFR-MAINT-002 | All database schema changes managed via versioned Prisma migrations, never manual DDL against production. |
| NFR-MAINT-003 | CI (GitHub Actions) shall run typecheck, lint, and automated tests on every PR; merges to main require green CI. |
| NFR-MAINT-004 | API contracts (request/response shapes) validated by shared Zod schemas used by both client and server to prevent drift. |

## 7.9 Observability

| ID | Requirement |
|---|---|
| NFR-OBS-001 | All API errors logged with correlation/request ID, `gym_id`, and user ID (never with sensitive payload contents such as passwords or full payment card data). |
| NFR-OBS-002 | Audit log captures who/what/when for all create/update/delete on financial, membership, and user-management entities, retained indefinitely (append-only). |
| NFR-OBS-003 | Platform-level metrics (uptime, error rate, latency, per-tenant usage) visible to Platform Super Admin analytics. |

## 7.10 Compliance & Data Protection

| ID | Requirement |
|---|---|
| NFR-COMP-001 | Personal data handling aligned with GDPR-style principles: purpose limitation, right to export, right to erasure (subject to financial-record retention law where applicable). |
| NFR-COMP-002 | Payment data handling shall avoid storing raw card data at all (tokenized/gateway-hosted when online payments are introduced in v2); v1 cash/UPI/card/bank-transfer are recorded as transaction metadata only, never card numbers. |
| NFR-COMP-003 | Health-related member notes (injuries, conditions) treated as sensitive data: visible only to Owner and the member's assigned Trainer, never exported in bulk reports without explicit inclusion.
