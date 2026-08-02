# 5. Feature List

Organized by the 20 core modules. `v1` = required for commercial launch. `v1.x` = fast-follow within 2 quarters. `v2` = future roadmap (architecture reserved now, see [15-future-roadmap.md](15-future-roadmap.md)).

## 5.1 Authentication — v1
- Email + password signup/login (JWT-based, access + refresh token pair)
- Role-aware login routing (redirect to correct dashboard per role)
- Password reset via email token
- Session management (refresh rotation, device/session listing, revoke)
- Account activation via invite link (staff/trainer/member accounts created by owner)
- Rate-limited login (brute-force protection)
- v1.x: 2FA/MFA (TOTP) for Gym Owner and Platform Super Admin

## 5.2 Gym Management — v1
- Gym profile (name, logo, address, contact, timezone, currency)
- Operating hours configuration
- Branding (primary color, logo) used across member-facing surfaces
- Branch entity reserved in schema (v2 UI)
- Gym-level settings (tax defaults, invoice numbering, notification templates)

## 5.3 User Management — v1
- Invite/create staff (Receptionist, Trainer) with role assignment
- Activate/deactivate staff accounts
- Platform Super Admin: gym account activation/suspension, plan assignment

## 5.4 Trainer Management — v1
- Trainer profile (specialization, bio, certifications, photo)
- Trainer-to-member assignment (single primary trainer per member in v1; multi-trainer reserved for v2)
- Trainer workload view (assigned member count)
- Trainer performance metrics (retention of assigned members, adherence rates) — v1.x

## 5.5 Member Management — v1
- Member registration (personal info, contact, emergency contact, photo, health notes)
- Member profile edit (staff-side full edit, member-side limited self-service)
- Member status lifecycle (Active, Expired, Frozen, Inactive, Cancelled)
- Member search/filter/list with pagination
- Bulk import (CSV) — v1.x

## 5.6 Membership Plans — v1
- Plan catalog: Monthly, Quarterly, Half-Yearly, Yearly, Custom duration
- Plan pricing, features included, trainer-inclusion flag
- Assign plan to member, renew, upgrade, downgrade
- Freeze membership (date range, reason, auto-extends expiry)
- Expiry notification triggers
- Auto-renewal — v2 (requires online payment gateway)

## 5.7 Attendance — v1
- Manual check-in/check-out (front desk)
- Member self check-in (mobile web)
- Daily / weekly / monthly attendance views
- Attendance percentage calculation
- Attendance calendar (heatmap-style)
- Missed-days tracking
- QR code check-in — v2 (see 5.8)

## 5.8 Check-in / Check-out — v1
- Check-in event (timestamp, method: manual/self/QR)
- Check-out event (timestamp; auto-checkout after configurable max session length)
- Session duration calculation
- QR code generation per gym + scanning flow — v2
- Face/biometric attendance — v2 (architecture notes only)

## 5.9 Workout Management — v1
- Exercise library (name, muscle group, equipment, instructions, media)
- Workout template builder (trainer/owner creates reusable templates)
- Workout plan assignment (template → member, with schedule)
- Daily workout log (completed / skipped / partially completed, per exercise set/rep/weight actuals)
- Workout history and PR (personal record) tracking

## 5.10 Diet Management — v1
- Diet plan template builder (meals, macros per meal)
- Diet plan assignment to member
- Daily meal plan (breakfast/lunch/dinner/snacks) with calories/protein/carbs/fat targets
- Water intake tracking
- Supplement recommendations
- Daily trainer notes on diet adherence

## 5.11 Progress Tracking — v1
- Body measurement entry (weight, height, BMI auto-calc, body fat %, muscle %, chest, waist, shoulder, arms, legs)
- Progress photo upload (front/side/back, dated)
- Monthly comparison view
- Trend charts per metric
- Transformation timeline (photo + metric overlay)

## 5.12 Body Measurements — v1
(Sub-feature of Progress Tracking, listed separately per spec — same data model)
- Structured measurement history per member
- Trainer-entered vs self-reported flag
- Unit preference (metric/imperial) — v1.x

## 5.13 Payment Management — v1
- Record payment (Cash, UPI, Card, Bank Transfer)
- Invoice generation (PDF)
- Receipt generation and reprint
- Payment history per member
- Pending dues tracking and dues list
- Discounts and offers (percentage or flat, per transaction)
- Tax line items — v1.x (configurable tax rate per gym)
- Online payment gateway integration — v2
- Refunds — v2

## 5.14 Expense Module — v1
- Expense entry by category (Trainer Salary, Rent, Electricity, Equipment, Maintenance, Marketing, Cleaning, Miscellaneous)
- Monthly expense report
- Category-wise breakdown
- Profit/Loss summary (Revenue − Expenses)

## 5.15 Reports — v1
All reports listed in [12-report-design.md](12-report-design.md), each supporting search, filter, sort, and export (CSV, Excel, PDF, Print).

## 5.16 Notifications — v1 (in-app) / v1.x (email) / v2 (push, WhatsApp)
- Membership expiry alerts
- Fee due alerts
- Attendance reminders
- Workout/diet reminders
- Birthday wishes
- Gym-wide announcements (from owner or platform)
- In-app notification center (v1); Email (v1.x); Push + WhatsApp (v2)

## 5.17 Messaging — v1
- Trainer ↔ Member 1:1 conversation thread
- Text messages
- Image attachments
- PDF attachments
- "Workout note" and "diet note" message types (structured, linked to plan)

## 5.18 Dashboard — v1
Role-specific dashboards: Owner, Trainer, Member (Receptionist gets a scoped "Today" operational view within the app shell). Full spec in [13-dashboard-design.md](13-dashboard-design.md).

## 5.19 Analytics — v1 (owner-level) / v1.x (trainer-level) / v2 (platform-level predictive)
- Revenue trend, membership growth, attendance trend, churn/inactive-member analytics
- Top trainers / top members (by adherence, retention)
- Platform Super Admin: cross-tenant MRR, churn, growth analytics

## 5.20 Settings — v1
- Gym profile settings, attendance rules, streak rules, notification templates, invoice numbering, tax/currency
- Platform settings (Super Admin): plan catalog, feature flags per plan, global announcement composer

## 5.21 Streak & Gamification System — v1
- Current streak, longest streak, monthly streak
- Streak badges (milestone-based: 7-day, 30-day, 100-day, etc.)
- Leaderboard (gym-scoped, opt-in per member privacy setting)
- Streak freeze (limited count per period, owner-configurable)
- Vacation mode (member-declared, staff-approved, does not break streak or attendance %)
- Membership-freeze protection (a frozen membership pauses streak/attendance expectations rather than "breaking" them)
