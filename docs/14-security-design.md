# 15. Security Design

## 15.1 Authentication Security

- **Password storage**: argon2id (preferred) or bcrypt (cost factor ≥ 12); never logged, never returned in any API response, never included in `audit_logs` payloads.
- **JWT**: access token 15-minute expiry, refresh token 30-day expiry with rotation-on-use. Tokens delivered as `httpOnly`, `Secure`, `SameSite=Lax` cookies — not accessible to client-side JS, mitigating token theft via XSS.
- **Refresh reuse detection**: a refresh token used after being rotated away indicates possible theft → entire session family revoked, user forced to re-authenticate, security event logged.
- **MFA**: mandatory (TOTP) for Platform Super Admin; optional (v1.x) for Gym Owner given financial-data access.
- **Login rate limiting**: per-IP and per-account sliding-window limits; exponential backoff after repeated failures (FR-AUTH-005).
- **Session visibility**: users can view and revoke their own active sessions/devices (FR-AUTH-008), surfacing suspicious concurrent sessions.

## 15.2 Authorization Model

- **Role-Based Access Control (RBAC)** with five roles (see [03-user-roles.md](03-user-roles.md)), enforced by a single shared `authorize()` policy function consulted by every Route Handler — the [09-permission-matrix.md](09-permission-matrix.md) is that function's specification, not documentation-only.
- **Scope enforcement is server-derived, never client-supplied**: `gym_id` comes from the session JWT; `assigned_trainer_id` scoping is re-checked against the current DB state on every request (not cached in the token), so a trainer reassignment takes effect immediately.
- **Defense in depth**: application-layer scoping is the primary control; Postgres Row-Level Security policies keyed on a session-scoped `gym_id` are applied as a second layer where the connection-pooling model allows it, so a bug in one layer doesn't equal full tenant-isolation failure.
- **Fail closed**: any ambiguous/unrecognized role or missing scope check defaults to deny, not allow.

## 15.3 Multi-Tenant Data Isolation

- Every tenant table carries non-nullable `gym_id`; the data-access layer exposes only pre-scoped query helpers (e.g., `findMembersForGym(gymId, ...)`), making an unscoped query a code-review-visible anomaly rather than a silent possibility.
- Cross-tenant access exists in exactly one controlled path: Platform Super Admin **impersonation**, which is:
  - Explicitly initiated with a required `reason` field.
  - Time-boxed (max 60 minutes, server-enforced regardless of client request).
  - Fully logged (`impersonation_sessions.actions_log`, append-only).
  - Visible to the Gym Owner (a banner/notification records that a support session occurred, when, and by whom — no silent access).
  - Automatically expired; cannot be extended without starting a new, freshly-justified session.
- 404-not-403 policy (see [10-api-design.md](10-api-design.md) §11.3) prevents cross-tenant/cross-assignment resource existence from being inferable via error codes.

## 15.4 Input Validation & Injection Protection

- **SQL Injection**: eliminated by construction — all DB access via Prisma's parameterized query builder; no raw string-concatenated SQL. Any exceptional raw-SQL usage (e.g., complex reporting queries) uses parameterized `$queryRaw` only, reviewed explicitly.
- **XSS**: React's default output escaping is the baseline; any `dangerouslySetInnerHTML` usage is prohibited unless content is sanitized through a vetted library, and disallowed entirely for user-generated content (messages, notes). Content-Security-Policy headers restrict inline script execution.
- **Server-side validation**: every request body validated with Zod schemas regardless of client-side validation state (NFR-SEC-005) — the client validation is UX, the server validation is the actual boundary.
- **File upload validation**: MIME-type allowlist per bucket purpose (images: jpg/png/webp; documents: pdf), file-size caps, and magic-byte verification (not just trusting the `Content-Type` header) before issuing a Supabase Storage signed upload URL.

## 15.5 CSRF Protection

- Cookie-based auth requires explicit CSRF mitigation: `SameSite=Lax` cookies as the primary defense, combined with an Origin/Referer check on all state-changing (`POST`/`PATCH`/`DELETE`) requests, rejecting cross-origin write attempts.

## 15.6 Transport & Infrastructure Security

- TLS 1.2+ enforced everywhere (Vercel-terminated), HSTS enabled.
- Secrets (DB credentials, JWT signing keys, storage service keys) held in Vercel/Supabase environment configuration, never committed to the repository; separate secrets per environment (local/preview/staging/production).
- Supabase Storage buckets are private by default; all client access is via short-lived signed URLs, never public bucket URLs.

## 15.7 Audit Logging

- `audit_logs` (tenant) and `platform_audit_logs` (platform) capture actor, action, target, before/after state, and timestamp for all create/update/delete on financial, membership, and user-management entities — append-only, no update/delete permitted at the application layer (NFR-OBS-002).
- Report exports and impersonation sessions are separately, explicitly logged (FR-RPT-003, §15.3).

## 15.8 Sensitive Data Handling

- Health-related member notes are visible only to Owner and the member's assigned Trainer (NFR-COMP-003); excluded from bulk exports unless explicitly selected as a report column by an authorized role.
- No raw payment card data is ever stored (NFR-COMP-002) — v1 payment methods are recorded as transaction metadata, not tokenized card capture; card/online-gateway integration in v2 will use gateway-hosted tokenization (Stripe/Razorpay-class), keeping Kailon out of PCI-DSS cardholder-data scope.
- MFA secrets and any other genuinely secret fields are encrypted at rest, not just access-controlled.

## 15.9 Data Retention & Deletion

- Financial and membership records are never hard-deleted (soft delete only), consistent with accounting/legal retention expectations.
- Tenant offboarding: data export offered (portability), followed by scheduled hard deletion after a defined retention window (NFR-TENANT-003, NFR-COMP-001).
- Member-initiated data deletion requests are honored for non-financial personal data, with financial records retained as required by applicable record-keeping law, clearly disclosed in the product's data policy.

## 15.10 Security Testing & Ongoing Assurance

- CI pipeline includes dependency vulnerability scanning; production deploys blocked on critical/high findings.
- Recommended pre-launch and periodic (e.g., annual) third-party penetration test scoped to the multi-tenant isolation boundary, authentication flows, and file upload handling — the highest-risk surfaces in this architecture.
- Security-relevant configuration (RBAC policy, RLS policies, rate limits) is version-controlled and reviewed like code, not managed as untracked runtime configuration.
