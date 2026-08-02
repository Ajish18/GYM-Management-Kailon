# 4. User Roles

Kailon has **two role planes**:

- **Platform Plane**: `PLATFORM_SUPER_ADMIN` — operates the SaaS business itself, outside any tenant.
- **Tenant Plane**: `GYM_OWNER`, `RECEPTIONIST`, `TRAINER`, `MEMBER` — scoped to exactly one gym (`gym_id`).

Every tenant-plane user belongs to exactly one `gym_id`. There is no cross-gym access for tenant roles under any circumstance. Platform Super Admin has no default access to tenant data (see impersonation model below).

## 4.1 Platform Super Admin

**Scope**: entire platform, all tenants (metadata only, not member PII, by default).

Responsibilities:
- View list of all gyms, their subscription plan, status, and health metrics.
- Activate, suspend, or reinstate a gym (billing failure, ToS violation, trial expiry).
- Manage subscription plans (create/edit pricing tiers, feature flags per tier).
- View platform-wide analytics (MRR, churn, active gyms, growth trends).
- Configure global plan catalog and feature entitlements.
- Send platform-wide or segmented announcements (e.g., "maintenance window," "new feature").
- Trigger **support impersonation** into a specific gym — time-boxed, logged, and visible to the Gym Owner (see [11-security-design.md](11-security-design.md) impersonation controls).

Explicit boundary: **cannot** browse member personal data, workout/diet content, chat messages, or payment details of any gym without an active, audited impersonation session scoped to that one gym and expiring automatically.

## 4.2 Gym Owner

**Scope**: single gym (`gym_id`), full administrative control within it.

Responsibilities:
- Manage gym profile (name, branding, logo, address, contact, operating hours, timezone).
- Manage branches (schema-ready, UI reserved for roadmap phase — see [15-future-roadmap.md](15-future-roadmap.md)).
- Manage trainers and receptionists (invite, activate/deactivate, assign roles).
- Manage members (full CRUD, assign trainer, assign membership).
- Manage membership plans (create pricing tiers/durations).
- View revenue and financial dashboards/reports.
- View and record expenses.
- Manage workout template library and diet template library (gym-level content, usable by all trainers in the gym).
- Assign/reassign trainers to members.
- Configure attendance rules (check-in windows, grace periods).
- Configure streak rules (what actions earn a streak, streak-freeze allowances).
- Generate and export all reports.
- Configure gym-level settings (notification templates, branding, tax/currency defaults).

## 4.3 Receptionist

**Scope**: single gym, front-desk operational functions only.

Responsibilities:
- Register new members (intake form, initial payment).
- Renew existing memberships, record renewal payments.
- Collect payments and issue receipts/invoices for any transaction type.
- Mark attendance (manual check-in/check-out at the front desk, in addition to member self check-in).
- Print/reprint receipts.
- View "Today" operational dashboard (check-ins today, expiring memberships today, dues today).

Explicit boundaries: **no** access to revenue/expense analytics, P&L, trainer/member management beyond registration, workout/diet content, or gym settings.

## 4.4 Trainer

**Scope**: single gym, limited to members explicitly assigned to them.

Responsibilities:
- View list of assigned members and their profiles (fitness-relevant fields only, not full billing history).
- Assign workout plans (from gym template library or custom) to assigned members.
- Assign diet plans (from gym template library or custom) to assigned members.
- Add daily coaching notes per assigned member.
- Record body measurements / progress data for assigned members.
- Track workout/diet adherence (completed / skipped / partial) for assigned members.
- Send/receive messages with assigned members.
- View attendance history of assigned members only.

Explicit boundaries: **no** payment collection, **no** visibility into members not assigned to them, **no** gym settings access.

## 4.5 Member

**Scope**: strictly their own account — the narrowest role in the system.

Responsibilities/capabilities:
- View own profile and edit permitted self-service fields (contact info, photo, preferences).
- View own membership status, plan, and expiry.
- View own attendance history and calendar.
- View own assigned workout plan.
- View own assigned diet plan.
- View own payment history and download invoices.
- View own progress charts (measurements, photos, trend lines).
- View own achievements/badges and streak (current, longest).
- Chat with their assigned trainer.

Explicit boundaries: **cannot** edit protected/system-of-record fields (membership dates, payment records, trainer assignment, measurements entered by trainer) — those are read-only from the member's perspective, sourced from staff/trainer entry or system events.

## 4.6 Role Summary Table

| Role | Tenant-scoped | Sees other users' PII | Financial access | Content authority (workout/diet) | Primary device context |
|---|---|---|---|---|---|
| Platform Super Admin | No (cross-tenant, metadata) | Only via audited impersonation | Platform billing only | None | Desktop |
| Gym Owner | Yes (own gym) | All members/staff in own gym | Full (revenue, expenses, P&L) | Full (create templates) | Desktop + Mobile |
| Receptionist | Yes (own gym) | Member contact/membership data | Collection only, no analytics | None | Desktop (front-desk) |
| Trainer | Yes (own gym) | Assigned members only | None | Assign from templates + custom | Mobile-first |
| Member | Yes (own gym) | Own data only | Own payment history (read-only) | None (consumes only) | Mobile-first |

## 4.7 Account Provisioning Model

- Gym Owner accounts are created via **self-service signup** (tenant creation flow) or by Kailon sales/onboarding.
- Receptionist and Trainer accounts are created **only by the Gym Owner** (invite-by-email, sets initial role).
- Member accounts are created by **Gym Owner or Receptionist** (registration flow) — members do not self-register in v1 (reserved for future "member self-signup with owner approval" — see roadmap).
- Platform Super Admin accounts are provisioned **out-of-band** by Kailon internally (no public signup path), with mandatory MFA.
