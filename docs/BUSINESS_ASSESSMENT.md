# Kailon — Business / Product Assessment & Revenue Roadmap

**Prepared:** 2026-08-08 · **Version context:** v0.6 stabilization
**Author role:** BA / product / engineering summary for the founder

---

## 1. Executive summary

Kailon is a **B2B SaaS for gyms** — one multi-tenant app that replaces the spreadsheet, paper
register, and WhatsApp group with memberships, attendance, workouts, diet, payments, reports,
notifications, and staff tools. The product is **feature-complete enough to sell today**
(~92% of the planned module surface ships), but it is **not yet a product you can hand to a
client**, because the delivery pipeline and a handful of user-facing flows were never finished.

**The gap is operational, not conceptual.** The core engine (multi-role auth, tenant isolation,
payments, attendance, reporting) is genuinely there. What a client would bounce on is: sign-in
sending every role to the wrong page, no password recovery, Google login not wired up in
production, no automated tests around the flows that matter, and a slow perceived start.

This document separates (A) what's solid, (B) what must be fixed before the first paying gym,
and (C) how revenue gets turned on.

---

## 2. What is genuinely there (evidence-based)

| Area | State | Evidence |
|------|-------|----------|
| Multi-tenant auth (5 roles) | Strong | JWT + revocable DB-backed sessions, per-gym `gymId` scoping, brute-force lockout, rate limiting, deactivation takes effect server-side on every request |
| Owner experience | Strong | Dashboard, members + bulk CSV/XLSX import, staff + invites + approvals, memberships + invoices + payments, attendance + streaks, expenses + P&L, reports + export, notifications, trainer workload, branches |
| Member experience | Strong | Self check-in/out, QR code, "today's workout" from an assigned plan, diet/macros/water, progress measurements, payments, chat |
| Trainer experience | Strong | Assigned members, workout templates + plans, diet plans, progress tracking, messaging |
| Monetization backbone | Strong | Membership plans, invoice + payment collection (cash/UPI/card/bank), due-date tracking, pending-dues dashboards |
| Admin (platform) | Present | Gym rollup, MRR placeholder, plans, announcements |
| API | Present | REST v1 (members, attendance, payments, expenses) with gym-scoped guards |
| Quality gates | OK | 26 unit tests + ~40 more added in v0.6, `tsc --noEmit` clean, production build passes |

## 3. What a BA flags before first paying gym (the v0.6 fixes)

Ranked by how loudly a client would complain:

1. **Sign-in lands on the wrong page** — after login every role was dropped on the public
   marketing page. Root cause: the redirect depended on edge middleware that was unreliable in
   production; the app's own server-side session never decided where the user goes.
   → **Fixed in v0.6:** deterministic `/role-redirect` route driven by the authoritative session.
2. **No password recovery** — a locked-out or forgetful client had no way back in.
   → **Fixed in v0.6:** forgot-password + reset-password flow (model + email template already
   existed unused).
3. **Google sign-in not reachable in production** — provider env vars + the authorized
   redirect URI were never configured on the deployed domain.
   → **Fixed/actioned in v0.6:** code points Google to the role redirect; operator must add the
   env vars + Google Cloud Console callback URL (checklist in `SETUP.md`).
4. **No deployment pipeline** — the repo had one commit, zero migrations, and a `db push`-only
   database. A fresh clone could not produce the running site.
   → **Fixed in v0.6:** baseline migration + `vercel-build` that generates the client and runs
   `migrate deploy`, then the whole tree is committed and pushed.
5. **Perceived speed** — cold-started serverless pages with serialized DB round-trips.
   → **v0.6:** per-request memoization, `Promise.all` batching, bounded lists; further work is
   profile-driven (Vercel Analytics / Lighthouse) after the first stable deploy.

## 4. Revenue architecture (how this software makes money)

The product **is** the revenue engine (gyms already collect dues/invoices through it); the
question is how Kailon (you) gets paid for it.

### 4.1 Unit of sale
Per-gym SaaS subscription (a gym = a tenant = one `Gym` record). The schema already models
this: `Gym.status` has `TRIAL` / `ACTIVE` / `SUSPENDED`, and `AdminPlan`/plan seeding exists.
Every tenant is isolated by `gymId`, so multi-tenant billing maps 1:1 to subscriptions.

### 4.2 Roadmap

**v0.6 — ship stability (this round).**
- All fixes above deployed; production acceptance checklist passed.
- **Revenue step:** onboard 1–3 real gyms on a free trial / manual `TRIAL → ACTIVE` switch.
  Collect their friction (this is cheaper than any survey).

**v0.7 — collect money online.**
- **Razorpay integration for INR** (UPI is table stakes in India): create payment intents,
  webhook confirmations, and sync to the existing `Payment`/`Invoice` model — the payment
  gateway work is the one "0%" item in `docs/PROJECT_STATUS.md`).
- **Subscription gating:** `Gym.status` becomes the gate — a `TRIAL` gym runs fine for ~14 days,
  then the owner dashboard shows an upgrade wall instead of data. Manual switch for the first
  clients, then self-serve.
- Automated monthly invoice generation per active membership.

**v0.8 — scale revenue.**
- **Pricing tiers** (e.g., Solo / Growth / Multi-branch) stored as platform plans, self-serve
  upgrade in the owner dashboard.
- **Platform MRR dashboard** — the admin analytics already has an MRR placeholder; wire it to
  real subscription data so you can quote a number to investors/tax authorities.
- Referral/white-label hook for franchise gyms.

### 4.3 Non-revenue but revenue-adjacent (v1.x)
MFA (TOTP) for owner/staff accounts — an increasing requirement for B2B trust and for
larger gyms; online payment gateway completion (folded into v0.7).

### 4.4 Pricing guidance (for the founder to set, not for me to decide)
- Anchor on "what the gym already pays for a spreadsheet + payment app + WhatsApp" (~₹3–8k/mo
  for an average Indian gym). SaaS can land at ₹1.5–5k/mo per gym, or a per-member fee
  (₹10–30/member/mo) that scales with gym size — per-member is friendlier for small gyms and
  grows with them.
- Charge for the *saved* payment app fees and the anti-churn streak/attendance engine, not the
  CRUD.

## 5. What "meta coding standards" means for this repo (and what we're keeping)

The codebase already follows a consistent discipline worth preserving:
- **Layered separation:** `src/lib/data/*` (server-only queries), `src/lib/actions/*`
  (server actions), `src/lib/validations/*` (zod, shared client/server), `src/components/*`
  (presentation), per-role `src/app/<role>/*` routes.
- **Tenant safety:** every query scoped by `gymId`, never client-supplied.
- **Security defaults:** bcrypt, token-hash-only persistence, rate limiting, revocable sessions.
- **v0.6 additions:** shared `roles.ts` (one source of truth for routing), deterministic
  post-login redirect, and tests on the flows that actually broke.

## 6. Top 3 things that will bite next

1. **Workouts/Diet/Progress are ~70%** — "today's workout" and diet tracking work, but template
   depth and progress photos/measurement comparison are thin. Promise only what's done.
2. **Online payments (v0.7)** — every gym will ask for UPI collection inside the app; the manual
   collect flow works today but the gateway is the real unlock.
3. **Observability** — there's no error tracking (Sentry) or uptime alerting. Before onboarding
   paying gyms, add Sentry + a synthetic uptime check; a silent 500 in a client's gym is how
   you lose the reference account.
