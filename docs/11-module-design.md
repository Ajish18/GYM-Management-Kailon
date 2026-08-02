# 12. Module Design

Each module below states: **Purpose**, **Key Flows**, **Business Rules & Edge Cases**, and **Depends On**. Cross-references: data model in [08-database-design.md](08-database-design.md), APIs in [10-api-design.md](10-api-design.md), permissions in [09-permission-matrix.md](09-permission-matrix.md).

## 12.1 Authentication
**Purpose**: Secure, role-aware entry point for all users.
**Key Flows**: Login → role-based redirect (Owner→Owner dashboard, Trainer→Trainer dashboard, Member→Member dashboard, Receptionist→Today view, PSA→Platform console) · Invite-based account activation · Password reset · Session/device management.
**Business Rules**: A user with `status=invited` cannot log in until invite accepted. Failed logins increment a counter with exponential lockout. Refresh token reuse triggers full session-family revocation and a security notification.
**Depends On**: none (foundational).

## 12.2 Gym Management
**Purpose**: The tenant's identity and operating configuration.
**Key Flows**: Owner completes gym profile during onboarding wizard (name, branding, hours, currency) → gym becomes fully operational (gates other modules' "empty state" prompts).
**Business Rules**: `gyms.status` mirrors `gym_subscriptions.status`; a `suspended` gym blocks login for all roles except Owner (who sees a billing-recovery screen, not the full app).
**Depends On**: Authentication.

## 12.3 User Management
**Purpose**: Owner-controlled staff provisioning.
**Key Flows**: Owner invites Trainer/Receptionist by email → invitee sets password → account active. Owner deactivates staff → sessions revoked, member reassignment prompted if the deactivated user was a trainer with active assignments.
**Business Rules**: Cannot deactivate the last remaining active Trainer if members are still assigned without a reassignment step (blocking validation, not silent orphaning).
**Depends On**: Authentication, Gym Management.

## 12.4 Trainer Management
**Purpose**: Trainer roster and capacity management.
**Key Flows**: Owner views trainer list with assigned-member counts → sets/edit specialization, bio, capacity cap → reassigns members individually or via a bulk reassignment tool (e.g., trainer offboarding).
**Business Rules**: `max_member_capacity` is advisory (soft warning on assignment past cap), not a hard block, unless the Owner explicitly enables enforcement in settings.
**Depends On**: User Management.

## 12.5 Member Management
**Purpose**: The system of record for who trains at the gym.
**Key Flows**: Registration (Receptionist/Owner) — personal info + optional first membership/payment in one guided flow → member becomes searchable/active. Ongoing profile maintenance, trainer assignment, status lifecycle.
**Business Rules**: Member `status` is **derived**, never manually set: `active` iff a `member_memberships` row with `status=active` and `end_date >= today` exists; `frozen` iff an approved freeze covers today; `expired` iff the most recent membership's `end_date < today`; `inactive` iff no membership has ever existed. Phone unique per gym (FR-MEM-002).
**Depends On**: Gym Management, Trainer Management, Membership Plans.

## 12.6 Membership Plans
**Purpose**: Monetizable service tiers a gym sells.
**Key Flows**: Owner defines plan catalog → Receptionist/Owner assigns/renews/upgrades/downgrades/freezes for a member, always alongside a payment transaction (renewal never exists without a linked invoice, even if `amountPaid=0` for a comped renewal — explicit `$0` payment, not an absent one).
**Business Rules**: Freeze extends `end_date` by the frozen day count on approval; a pending (unapproved) freeze does not yet affect dates. Only Owner/Receptionist can approve — Members can only request (self-service freeze request is a v1.x nicety; v1 ships staff-only freeze creation for simplicity, per FR-PLAN-005 staff-authored).
**Depends On**: Member Management, Payment Management.

## 12.7 Attendance
**Purpose**: Ground-truth presence data feeding streaks, reports, and billing-usage insight.
**Key Flows**: Front-desk check-in/out (Receptionist) · Member self check-in (mobile web, shows a large "Check In" button when membership is active) · Nightly job auto-closes sessions exceeding `max_session_hours`.
**Business Rules**: Check-in blocked with a clear reason if membership isn't active (FR-ATT-004) — UI surfaces "Membership expired, renew to check in" rather than a generic error, prompting the front-desk renewal flow inline.
**Depends On**: Member Management, Membership Plans.

## 12.8 Check-in / Check-out
**Purpose**: The atomic event pair underlying Attendance (documented separately per spec; same data model as 12.7).
**Key Flows**: Same as 12.7. QR flow (v2): member/gym-generated QR scanned by the other party's device to log the event without staff intervention.
**Business Rules**: One open session per member at a time (DB-enforced via partial unique index, not just app-layer).
**Depends On**: Attendance.

## 12.9 Workout Management
**Purpose**: Structured training delivery and adherence tracking.
**Key Flows**: Trainer builds/curates templates (or uses gym's shared library) → assigns to member with a start date → member sees "Today's Workout" on their dashboard → logs completion per exercise → history feeds PR detection.
**Business Rules**: A workout plan's `status` becomes `completed` when its defined duration elapses or the trainer manually closes it; reassigning a new plan while one is `active` auto-transitions the old one to `cancelled` (only one active plan per member at a time, keeping "today's workout" unambiguous).
**Depends On**: Member Management, Trainer Management.

## 12.10 Diet Management
**Purpose**: Nutrition guidance alongside training.
**Key Flows**: Mirrors Workout Management — template → assignment → member-facing daily view (meals + macros + water tracker) → trainer adherence notes.
**Business Rules**: `diet_plan_meals` is a snapshot copy at assignment time (not a live reference to the template), so later template edits don't retroactively change a member's already-assigned plan — trainer must explicitly reassign to push updates.
**Depends On**: Member Management, Trainer Management.

## 12.11 Progress Tracking
**Purpose**: The visible proof of transformation — the product's emotional core for members.
**Key Flows**: Trainer (or self, if enabled) logs measurements periodically → member views trend charts and monthly comparison → progress photos build a timeline view combining photo + concurrent metrics.
**Business Rules**: BMI is always server-computed from weight/height at write time, never client-supplied (data integrity). Photos are private by default; a member-facing "share to leaderboard/community" is explicitly out of scope for v1 (privacy-first default).
**Depends On**: Member Management.

## 12.12 Body Measurements
**Purpose**: Structured sub-component of Progress Tracking (listed separately per spec).
**Key Flows/Rules**: See 12.11 — same table, same rules. `source` field (`trainer` vs `self`) drives a visual "verified by trainer" badge on the member's chart to preserve trust in trainer-recorded data vs. self-reported entries.
**Depends On**: Progress Tracking.

## 12.13 Payment Management
**Purpose**: Revenue capture and financial record-keeping — the module with zero tolerance for data loss or ambiguity.
**Key Flows**: Record payment against a renewal/upgrade/ad-hoc charge → invoice + receipt generated → member/staff can view/print/download anytime.
**Business Rules**: Payments and invoices are **append-only**; corrections are reversal entries (FR-PAY-005), preserving a full audit trail for accounting reconciliation. Invoice numbers are gym-sequential and gap-free within normal operation (atomic sequence increment inside the same transaction as invoice creation).
**Depends On**: Member Management, Membership Plans.

## 12.14 Expense Module
**Purpose**: Gives the Owner a true P&L view, differentiating Kailon from pure "member management" tools.
**Key Flows**: Owner logs recurring/one-off expenses by category → monthly/category reports → P&L = revenue (from Payments) − expenses.
**Business Rules**: Expense categories are gym-customizable beyond the seeded defaults; category deletion is blocked if expenses reference it (RESTRICT), category can be deactivated instead.
**Depends On**: none (reads Payments for P&L computation, doesn't write to it).

## 12.15 Reports
**Purpose**: Turn raw operational data into decisions and exportable business artifacts. Full catalog in [12-report-design.md](12-report-design.md).
**Key Flows**: Filter/search/sort in-app → export (CSV/Excel/PDF) or print, scoped to the requester's role/assignment.
**Business Rules**: Exports beyond a row-count threshold are generated asynchronously (`report_exports` job) to avoid blocking the request cycle (NFR-PERF-004); user is notified in-app when ready.
**Depends On**: all data-producing modules.

## 12.16 Notifications
**Purpose**: Proactive, timely nudges that drive the retention outcomes (renewals, engagement) the product is sold on.
**Key Flows**: Nightly job scans for expiry/fee-due/birthday conditions → generates `notifications` rows → in-app bell + (v1.x) email. Reminders (workout/diet/attendance) are generated per gym-configured cadence.
**Business Rules**: Deduplication key = `(user_id, type, related_entity_id, date)` — the same expiry event never double-fires (FR-NOTIF-003).
**Depends On**: Membership Plans, Payment Management, Workout/Diet Management, Attendance.

## 12.17 Messaging
**Purpose**: The direct trainer-member relationship channel, replacing ad hoc WhatsApp usage with an in-product, gym-owned record.
**Key Flows**: Conversation auto-created on first trainer assignment → either party sends text/image/PDF/structured notes → both see it in their respective dashboards.
**Business Rules**: On trainer reassignment, the old conversation is archived (read-only for the old trainer), a new conversation is created with the new trainer; member's message history with the prior trainer remains visible to the member and to the Owner (for continuity/support), not to the outgoing trainer.
**Depends On**: Trainer Management, Member Management.

## 12.18 Dashboard
**Purpose**: The first screen every role sees — must answer "what do I need to know/do right now" in under 3 seconds. Full spec in [13-dashboard-design.md](13-dashboard-design.md).
**Depends On**: all modules (aggregation layer).

## 12.19 Analytics
**Purpose**: Trend-level insight beyond today's snapshot — for Owner decision-making and Platform business health.
**Key Flows**: Owner analytics (revenue trend, growth, churn risk, top performers) computed via scheduled aggregation jobs (not live heavy queries on every dashboard load) and cached.
**Business Rules**: "Inactive/at-risk member" flag = active membership but attendance < gym-configured threshold over trailing 14 days — surfaced as an actionable list, not just a chart.
**Depends On**: Attendance, Membership Plans, Payment Management.

## 12.20 Settings
**Purpose**: Tenant-level and platform-level configuration surface.
**Key Flows**: Owner configures attendance/streak/invoice/notification settings; Platform Super Admin configures plan catalog/feature flags, which gate module visibility per tenant at request time (a feature-flagged-off module returns `403 FORBIDDEN` from the API even if a client somehow renders it).
**Depends On**: Gym Management (tenant settings), Platform Domain (plan entitlements).

## 12.21 Streak & Gamification System
**Purpose**: The core retention mechanic — makes consistency visible and rewarding, directly targeting the industry's churn problem.
**Key Flows**: Nightly job evaluates each active member's prior day against `gym_settings` streak rules → increments/resets `member_streaks` → consumes a streak freeze automatically if a miss would otherwise break a streak and freezes remain → awards badges on threshold crossing → leaderboard recomputed from `member_streaks` for opted-in members.
**Business Rules**: A membership freeze (12.6) or approved vacation-mode period pauses streak evaluation entirely for its date range (neither breaks nor accrues) — distinct from a streak-freeze, which actively preserves an active streak through a single missed day. Leaderboard excludes non-opted-in members from *display* but their streaks are still computed (so opting in later doesn't create a "starting from zero" unfairness).
**Depends On**: Attendance, Workout Management (if `streak_requires_workout_log` enabled), Membership Plans.
