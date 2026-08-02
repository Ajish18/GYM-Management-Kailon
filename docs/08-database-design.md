# 9. Database Design

PostgreSQL, accessed exclusively via Prisma. All identifiers are UUID v4 unless noted. All monetary columns are `decimal(12,2)` in the gym's configured currency (no floats for money). All timestamps are `timestamptz`.

## 9.0 Global Conventions (apply to every tenant-scoped table unless noted)

| Convention | Detail |
|---|---|
| Primary key | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| Tenant key | `gym_id UUID NOT NULL REFERENCES gyms(id)` — indexed on every tenant table, present on every table below except the Platform Domain and the `gyms` table itself |
| Audit fields | `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()` (trigger-maintained), `created_by UUID REFERENCES users(id)`, `updated_by UUID REFERENCES users(id)` |
| Soft delete | `deleted_at timestamptz NULL` — all reads default-filter `deleted_at IS NULL`; hard delete is never used for member, payment, or membership records (financial/legal retention); reference/config tables may hard-delete |
| Indexing baseline | Every FK column indexed; every `(gym_id, <common filter column>)` composite indexed per table below; every `deleted_at` partial-indexed (`WHERE deleted_at IS NULL`) on high-volume tables |
| Cascade default | `ON DELETE RESTRICT` unless explicitly stated `CASCADE` or `SET NULL` below — financial and membership history is never implicitly cascaded away |

Composite uniqueness is expressed as `gym_id + <column>` throughout, since uniqueness is tenant-scoped, not global (e.g., two different gyms may each have a member with the same phone number).

---

## 9.1 Platform Domain (no `gym_id` — cross-tenant)

### `platform_admins`
| Column | Type | Default | Null | Unique | Indexed | FK |
|---|---|---|---|---|---|---|
| id | UUID | gen_random_uuid() | N | Y | PK | |
| email | citext | | N | Y | Y | |
| password_hash | text | | N | N | | |
| full_name | text | | N | N | | |
| mfa_enabled | boolean | false | N | | | |
| mfa_secret | text | NULL | Y | | | (encrypted at rest) |
| status | enum(`active`,`suspended`) | `active` | N | | Y | |
| created_at / updated_at | timestamptz | now() | N | | | |

**Validation:** email format; MFA mandatory before first production access grant (enforced at app layer). **Cascade:** none (top of hierarchy). **Search fields:** email, full_name.

### `subscription_plans`
| Column | Type | Default | Null | Unique | Indexed | FK |
|---|---|---|---|---|---|---|
| id | UUID | gen_random_uuid() | N | Y | PK | |
| code | text | | N | Y | Y | e.g. `starter`, `growth`, `pro` |
| name | text | | N | N | | |
| price_monthly | decimal(12,2) | | N | | | |
| price_yearly | decimal(12,2) | | N | | | |
| max_members | integer | NULL | Y | | | NULL = unlimited |
| max_trainers | integer | NULL | Y | | | NULL = unlimited |
| feature_flags | jsonb | `{}` | N | | | per-module entitlement map |
| is_active | boolean | true | N | | Y | |
| created_at / updated_at | timestamptz | now() | N | | | |

### `gym_subscriptions`
| Column | Type | Default | Null | Unique | Indexed | FK |
|---|---|---|---|---|---|---|
| id | UUID | gen_random_uuid() | N | Y | PK | |
| gym_id | UUID | | N | Y | Y | → gyms(id), CASCADE |
| plan_id | UUID | | N | | Y | → subscription_plans(id), RESTRICT |
| billing_cycle | enum(`monthly`,`yearly`) | `monthly` | N | | | |
| status | enum(`trialing`,`active`,`past_due`,`suspended`,`cancelled`) | `trialing` | N | | Y | |
| current_period_start | date | | N | | | |
| current_period_end | date | | N | | Y | drives expiry sweep |
| trial_ends_at | date | NULL | Y | | | |
| cancelled_at | timestamptz | NULL | Y | | | |
| created_at / updated_at | timestamptz | now() | N | | | |

**Relationships:** one-to-one active row per gym (historical rows retained, `status` transitions tracked). **Cascade:** `gym_id` CASCADE (deleting a gym's platform record removes its subscription rows only after tenant offboarding data-export, per NFR-TENANT-003).

### `platform_announcements`
| id, title, body (text/markdown), audience (`enum: all, plan:<code>, gym:<id>`), published_at, expires_at, created_by → platform_admins(id) |

### `impersonation_sessions`
| Column | Type | Default | Null | Indexed | FK |
|---|---|---|---|---|---|---|
| id | UUID | gen_random_uuid() | N | PK | |
| platform_admin_id | UUID | | N | Y | → platform_admins(id) |
| gym_id | UUID | | N | Y | → gyms(id) |
| reason | text | | N | | required justification |
| started_at | timestamptz | now() | N | | |
| expires_at | timestamptz | | N | Y | max 60 min, server-enforced |
| ended_at | timestamptz | NULL | | | |
| actions_log | jsonb | `[]` | | | append-only action trail during session |

**Validation:** cannot create a second concurrent session for the same admin; `expires_at` capped server-side regardless of client input. Full detail in [11-security-design.md](11-security-design.md).

### `platform_audit_logs`
| id, actor_id (→ platform_admins), action, target_type, target_id, metadata (jsonb), created_at (indexed) — append-only, no update/delete.

---

## 9.2 Tenant Core

### `gyms`
| Column | Type | Default | Null | Unique | Indexed | FK |
|---|---|---|---|---|---|---|
| id | UUID | gen_random_uuid() | N | Y | PK | |
| name | text | | N | | Y | |
| slug | text | | N | Y | Y | for future public URLs |
| owner_user_id | UUID | | N | Y | Y | → users(id), RESTRICT |
| logo_url | text | NULL | Y | | | Supabase Storage path |
| brand_color | text | NULL | Y | | | hex |
| address | jsonb | NULL | Y | | | line1, city, state, country, postal |
| timezone | text | `UTC` | N | | | IANA tz |
| currency | text | `INR` | N | | | ISO 4217 |
| status | enum(`active`,`suspended`,`trial`) | `trial` | N | | Y | mirrors gym_subscriptions.status |
| created_at / updated_at | timestamptz | now() | N | | | |

### `branches` (schema-ready, single implicit row per gym at v1)
| id, gym_id, name, address (jsonb), is_default (boolean, default true), status, created_at/updated_at |
**Cascade:** `gym_id` CASCADE.

### `gym_settings`
| Column | Type | Default | Notes |
|---|---|---|---|
| gym_id | UUID PK/FK | | → gyms(id), CASCADE, 1:1 |
| attendance_grace_minutes | integer | 15 | |
| max_session_hours | integer | 4 | auto-checkout threshold |
| self_checkin_enabled | boolean | true | |
| streak_requires_checkin | boolean | true | |
| streak_requires_workout_log | boolean | false | |
| streak_requires_checkout | boolean | false | |
| streak_freezes_per_month | integer | 1 | |
| invoice_prefix | text | `INV` | |
| invoice_next_seq | integer | 1 | atomically incremented |
| default_tax_percent | decimal(5,2) | 0 | |
| updated_at | timestamptz | now() | |

---

## 9.3 Users & Auth

### `users`
| Column | Type | Default | Null | Unique | Indexed | FK |
|---|---|---|---|---|---|---|
| id | UUID | gen_random_uuid() | N | Y | PK | |
| gym_id | UUID | NULL | Y | | Y | NULL for `platform_super_admin` role only |
| role | enum(`gym_owner`,`receptionist`,`trainer`,`member`,`platform_super_admin`) | | N | | Y | |
| email | citext | NULL | Y | Y(gym_id+email) | Y | member may have NULL email |
| phone | text | NULL | Y | Y(gym_id+phone) | Y | |
| password_hash | text | | N | | | |
| full_name | text | | N | | | |
| avatar_url | text | NULL | Y | | | |
| status | enum(`invited`,`active`,`inactive`) | `invited` | N | | Y | |
| mfa_enabled | boolean | false | N | | | |
| last_login_at | timestamptz | NULL | Y | | | |
| deleted_at | timestamptz | NULL | Y | | Y | soft delete |
| created_at / updated_at | timestamptz | now() | N | | | |

**Validation:** exactly one of `email`/`phone` required; `gym_id` required unless `role = platform_super_admin`. **Relationships:** parent of role-specific profile tables (`trainer_profiles`, `member_profiles`) via `user_id`. **Cascade:** `gym_id` RESTRICT (cannot delete a gym with active users; must offboard first).

### `sessions` (refresh-token families)
| id, user_id (→ users, CASCADE), refresh_token_hash, device_label, ip_address (inet), user_agent, created_at, expires_at, revoked_at (NULL), replaced_by_session_id (NULL, self-FK) — indexed on `user_id`, `expires_at`.

### `invites`
| id, gym_id, email, role, invited_by (→ users), token_hash, expires_at, accepted_at (NULL), created_at — unique on `(gym_id, email, accepted_at IS NULL)` partial index to prevent duplicate pending invites.

### `password_resets`
| id, user_id (→ users, CASCADE), token_hash, expires_at, used_at (NULL), created_at.

---

## 9.4 Staff & Trainer Profiles

### `trainer_profiles`
| Column | Type | Default | Notes |
|---|---|---|---|
| user_id | UUID PK/FK | | → users(id), CASCADE, 1:1 |
| gym_id | UUID | | indexed |
| specialization | text[] | `{}` | |
| bio | text | NULL | |
| certifications | jsonb | `[]` | |
| years_experience | integer | NULL | |
| max_member_capacity | integer | NULL | optional owner-set cap |

### `member_profiles`
| Column | Type | Default | Notes |
|---|---|---|---|
| user_id | UUID PK/FK | | → users(id), CASCADE, 1:1 |
| gym_id | UUID | | indexed |
| dob | date | NULL | |
| gender | enum(`male`,`female`,`other`,`undisclosed`) | `undisclosed` | |
| emergency_contact_name | text | NULL | |
| emergency_contact_phone | text | NULL | |
| health_notes | text | NULL | sensitive — see NFR-COMP-003 |
| assigned_trainer_id | UUID | NULL | → users(id), SET NULL, indexed |
| join_date | date | now() | |
| leaderboard_opt_in | boolean | true | |
| unit_preference | enum(`metric`,`imperial`) | `metric` | |

**Search fields:** joined to `users` for name/phone/email search; `assigned_trainer_id` indexed for trainer-scoped queries (core to permission enforcement — see [09-permission-matrix.md](09-permission-matrix.md)).

---

## 9.5 Membership

### `membership_plans`
| id, gym_id, name, duration_days (integer), price (decimal), description, includes_trainer (boolean), is_active (boolean, default true), sort_order, created_at/updated_at. **Unique:** `(gym_id, name)`.

### `member_memberships`
| Column | Type | Default | Notes |
|---|---|---|---|
| id | UUID | | PK |
| gym_id | UUID | | indexed |
| member_id | UUID | | → users(id), RESTRICT, indexed |
| plan_id | UUID | | → membership_plans(id), RESTRICT |
| start_date | date | | |
| end_date | date | | indexed (expiry sweep) |
| status | enum(`active`,`expired`,`frozen`,`cancelled`,`upgraded`) | `active` | indexed |
| price_paid | decimal(12,2) | | may differ from plan.price (discounts) |
| previous_membership_id | UUID | NULL | self-FK, chains renewals/upgrades |
| created_at / updated_at | timestamptz | now() | |

**Validation:** only one `status=active` row per member at a time (partial unique index). **Cascade:** `member_id` RESTRICT (history preserved). A renewal inserts a new row and marks the prior row `status=expired` (or `upgraded`) in the same transaction.

### `membership_freezes`
| id, gym_id, membership_id (→ member_memberships, CASCADE), start_date, end_date, reason, approved_by (→ users), created_at.

---

## 9.6 Attendance & Streaks

### `attendance_records`
| Column | Type | Default | Notes |
|---|---|---|---|
| id | UUID | | PK |
| gym_id | UUID | | indexed |
| member_id | UUID | | → users(id), RESTRICT, indexed |
| check_in_at | timestamptz | | indexed |
| check_in_method | enum(`manual`,`self`,`qr`) | `manual` | |
| check_in_by | UUID | NULL | → users(id) staff who recorded it, NULL if self |
| check_out_at | timestamptz | NULL | |
| check_out_method | enum(`manual`,`self`,`qr`,`auto`) | NULL | |
| auto_checked_out | boolean | false | |
| session_duration_minutes | integer | NULL | computed on checkout |

**Validation:** at most one open (`check_out_at IS NULL`) record per `member_id` (partial unique index) — enforces FR-ATT-003. **Indexed:** `(gym_id, member_id, check_in_at)` for calendar/history queries.

### `member_streaks`
| member_id PK/FK (→ users, CASCADE, 1:1), gym_id, current_streak (integer, default 0), longest_streak (integer, default 0), current_month_streak (integer, default 0), last_credit_date (date, NULL), streak_freezes_remaining (integer), updated_at.

### `streak_freeze_usages`
| id, gym_id, member_id, used_on_date, created_at. **Unique:** `(member_id, used_on_date)`.

### `vacation_mode_periods`
| id, gym_id, member_id, start_date, end_date, reason, status (enum `pending`,`approved`,`rejected`), approved_by (NULL), created_at.

### `badges` (catalog)
| id, gym_id (NULL = platform-default badge available to all gyms), code, name, description, icon, criteria (jsonb — e.g. `{type:"streak", threshold:30}`), created_at.

### `member_badges`
| id, gym_id, member_id, badge_id, awarded_at. **Unique:** `(member_id, badge_id)`.

---

## 9.7 Workout Module

### `exercises` (library — gym-level + platform-default seed set)
| id, gym_id (NULL = global catalog), name, muscle_group, equipment, instructions (text), media_url (NULL), is_active.

### `workout_templates`
| id, gym_id, name, description, created_by (→ users), is_active, created_at/updated_at.

### `workout_template_days`
| id, gym_id, template_id (→ workout_templates, CASCADE), day_order (integer), label (e.g. "Push Day").

### `workout_template_exercises`
| id, gym_id, template_day_id (→ workout_template_days, CASCADE), exercise_id (→ exercises, RESTRICT), target_sets, target_reps, target_weight (decimal, NULL), rest_seconds, sort_order.

### `workout_plans` (assignment of a template to a member)
| id, gym_id, member_id (→ users, RESTRICT), template_id (→ workout_templates, RESTRICT, NULL if fully custom), assigned_by (→ users), start_date, status (enum `active`,`completed`,`cancelled`), created_at/updated_at.

### `workout_logs`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| gym_id | UUID | indexed |
| workout_plan_id | UUID | → workout_plans, RESTRICT |
| member_id | UUID | → users, indexed |
| log_date | date | indexed, `(gym_id, member_id, log_date)` |
| status | enum(`completed`,`skipped`,`partial`) | |
| notes | text | NULL |

### `workout_log_sets`
| id, gym_id, workout_log_id (→ workout_logs, CASCADE), exercise_id (→ exercises), set_number, actual_reps, actual_weight (decimal, NULL), is_pr (boolean, default false).

### `personal_records`
| id, gym_id, member_id, exercise_id, best_weight (decimal), best_reps_at_weight (integer), achieved_at (date), source_log_set_id (→ workout_log_sets). **Unique:** `(member_id, exercise_id)` — always the current best; history derivable from `workout_log_sets.is_pr` flags.

---

## 9.8 Diet Module

### `diet_templates`
| id, gym_id, name, description, created_by, is_active.

### `diet_template_meals`
| id, gym_id, template_id (→ diet_templates, CASCADE), meal_name, time_slot (time), calories, protein_g, carbs_g, fat_g, sort_order.

### `diet_plans` (assignment)
| id, gym_id, member_id, template_id (NULL if custom), assigned_by, start_date, status (`active`,`completed`,`cancelled`).

### `diet_plan_meals` (snapshot copy at assignment time, editable independent of template)
| id, gym_id, diet_plan_id (→ diet_plans, CASCADE), meal_name, time_slot, calories, protein_g, carbs_g, fat_g, sort_order.

### `water_intake_logs`
| id, gym_id, member_id, log_date, amount_ml, created_at. **Unique:** `(member_id, log_date)` upserted through the day.

### `supplement_recommendations`
| id, gym_id, member_id, diet_plan_id (NULL), name, dosage, timing_note, recommended_by (→ users), created_at.

### `diet_notes` (daily trainer adherence notes)
| id, gym_id, member_id, diet_plan_id, note_date, note (text), created_by (→ users).

---

## 9.9 Progress Tracking

### `body_measurements`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| gym_id | UUID | indexed |
| member_id | UUID | → users, indexed, `(gym_id, member_id, measured_at)` |
| measured_at | date | |
| recorded_by | UUID | → users (trainer or self) |
| weight_kg | decimal(5,2) | NULL |
| height_cm | decimal(5,2) | NULL |
| bmi | decimal(4,1) | NULL, computed at write time from weight/height |
| body_fat_percent | decimal(4,1) | NULL |
| muscle_percent | decimal(4,1) | NULL |
| chest_cm | decimal(5,2) | NULL |
| waist_cm | decimal(5,2) | NULL |
| shoulder_cm | decimal(5,2) | NULL |
| arms_cm | decimal(5,2) | NULL |
| legs_cm | decimal(5,2) | NULL |
| source | enum(`trainer`,`self`) | |

### `progress_photos`
| id, gym_id, member_id, taken_at (date), pose (enum `front`,`side`,`back`), storage_path, uploaded_by (→ users), created_at.

---

## 9.10 Payments

### `invoices`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| gym_id | UUID | indexed |
| member_id | UUID | → users, RESTRICT, indexed |
| invoice_number | text | unique `(gym_id, invoice_number)`, generated from `gym_settings.invoice_prefix` + atomic sequence |
| related_membership_id | UUID | NULL → member_memberships |
| subtotal | decimal(12,2) | |
| discount_amount | decimal(12,2) | default 0 |
| discount_reason | text | NULL |
| tax_amount | decimal(12,2) | default 0 |
| total | decimal(12,2) | |
| status | enum(`paid`,`partially_paid`,`unpaid`,`void`) | indexed |
| issued_at | timestamptz | |
| pdf_storage_path | text | NULL, generated async |

### `payments`
| id, gym_id, invoice_id (→ invoices, RESTRICT), member_id, amount (decimal), method (enum `cash`,`upi`,`card`,`bank_transfer`), reference_note (text, NULL — UTR/txn id), collected_by (→ users), paid_at (timestamptz, indexed), is_reversal (boolean, default false), reversed_payment_id (NULL, self-FK).

**Validation:** `sum(payments.amount) for invoice` drives `invoices.status` transitions; corrections are new `is_reversal=true` rows referencing the original, never edits/deletes (FR-PAY-005). **Cascade:** RESTRICT everywhere — payments are permanent financial records.

### `dues` (materialized/derived view, not a base table)
Computed as `invoices.total − COALESCE(SUM(payments.amount),0)` per member; exposed via a DB view `v_member_dues` rather than a stored table to avoid drift.

---

## 9.11 Expenses

### `expense_categories`
| id, gym_id (NULL = platform default seed list), name, is_active. Seed values: Trainer Salary, Rent, Electricity, Equipment, Maintenance, Marketing, Cleaning, Miscellaneous.

### `expenses`
| id, gym_id, category_id (→ expense_categories, RESTRICT), amount (decimal), expense_date (date, indexed), vendor_note (text, NULL), receipt_storage_path (NULL), recorded_by (→ users), created_at/updated_at.

---

## 9.12 Notifications

### `notification_templates` (platform-seeded, gym-overridable)
| id, gym_id (NULL = platform default), type (enum — expiry, fee_due, attendance_reminder, workout_reminder, diet_reminder, birthday, announcement), channel (`in_app`,`email`), subject, body_template (text, supports `{{variables}}`).

### `notifications`
| id, gym_id, user_id (→ users, CASCADE, recipient), type, title, body, related_entity_type (NULL), related_entity_id (NULL), read_at (NULL, indexed), created_at (indexed).

### `notification_preferences`
| user_id PK/FK, gym_id, category → boolean map (jsonb, default all-true for in_app).

---

## 9.13 Messaging

### `conversations`
| id, gym_id, trainer_id (→ users), member_id (→ users), status (enum `active`,`archived`), created_at. **Unique:** `(gym_id, trainer_id, member_id)`.

### `messages`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| gym_id | UUID | indexed |
| conversation_id | UUID | → conversations, CASCADE, indexed |
| sender_id | UUID | → users |
| type | enum(`text`,`image`,`pdf`,`workout_note`,`diet_note`) | |
| body | text | NULL for pure-attachment messages |
| attachment_storage_path | text | NULL |
| related_workout_plan_id | UUID | NULL |
| related_diet_plan_id | UUID | NULL |
| read_at | timestamptz | NULL |
| created_at | timestamptz | indexed `(conversation_id, created_at)` |

---

## 9.14 Reports, Exports & Audit

### `report_exports`
| id, gym_id, requested_by (→ users), report_type, filters (jsonb), format (enum `csv`,`xlsx`,`pdf`), status (enum `pending`,`processing`,`ready`,`failed`), file_storage_path (NULL), created_at, completed_at (NULL).

### `audit_logs`
| id, gym_id (NULL for platform-scope actions), actor_id (→ users), action (text, e.g. `member.create`, `payment.record`, `member.delete`), target_type, target_id, before_state (jsonb, NULL), after_state (jsonb, NULL), ip_address (inet), created_at (indexed). Append-only; no update/delete permitted at the application layer.

---

## 9.15 Entity Relationship Summary (key relationships)

```
gyms 1─* users 1─1 (trainer_profiles | member_profiles)
gyms 1─* membership_plans 1─* member_memberships *─1 users(member)
users(member) 1─* attendance_records
users(member) 1─1 member_streaks
users(trainer) 1─* workout_plans *─1 users(member)
workout_plans 1─* workout_logs 1─* workout_log_sets
users(trainer) 1─* diet_plans *─1 users(member)
users(member) 1─* body_measurements, progress_photos
users(member) 1─* invoices 1─* payments
gyms 1─* expenses *─1 expense_categories
users(trainer) 1─1 conversations 1─1 users(member); conversations 1─* messages
gym_subscriptions *─1 subscription_plans; gym_subscriptions 1─1 gyms
```

Full DDL is generated from the Prisma schema (`prisma/schema.prisma`) during implementation; this document is the source of truth for that schema's design, not a substitute for it.
