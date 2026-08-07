# Kailon — Changelog

All notable changes to the Kailon Gym Management Platform will be documented in this file.

---

## [0.5.0] - 2026-08-07

### 🚀 Pending modules shipped + testing infra + build fixes

**All five remaining pending modules are now complete, the production build passes end-to-end, and a unit-test suite is in place.**

### Trainer Workload (owner)
- ✅ New `/owner/trainer-workload` page + nav item: per-trainer assigned members vs capacity, active workout/diet plan load, today's check-ins, and utilization bars (green → amber → red at ≥100%)
- ✅ `getTrainerWorkload(gymId)` in `lib/data/trainer-workload.ts` — groupBy aggregates + member-profile assignment map (no N+1)
- ✅ `workload-table.tsx` with empty state, avatar initials, stat badges

### Bulk Import (owner + reception)
- ✅ New `/owner/import-members` and `/reception/import-members` pages + nav items + quick "Import" button on the members page
- ✅ Client `bulk-import.tsx`: parses `.csv`/`.xlsx`/`.xls` in-browser via `xlsx`, header-alias normalization (name/phone/email/gender/dob/emergency contacts/health notes), Excel serial-date → ISO, live validation preview table, downloadable CSV template, capped at 200 rows
- ✅ `bulkImportMembersAction`: zod row validation, intra-file + DB phone dedupe, transactional insert as `user` + `memberProfile` + `memberStreak` (same shape as single create), per-row error report, `revalidatePath`
- ✅ Cap constant lives in `lib/validations/members.ts` (a `"use server"` file can't export non-function values)

### Branch Management (owner)
- ✅ New `/owner/branches` page + nav item: list, add (name/address/city), set-default (single default per gym), activate/deactivate (default can't be deactivated)
- ✅ `lib/data/branches.ts` + `branches.actions.ts` with `Prisma.JsonNull` for empty address

### Admin Analytics (platform admin)
- ✅ New `/admin/analytics` page + nav item: gyms / members / trainers / MRR stat cards, 6-month gym-growth bar chart, gym-status proportional bars, per-gym table (plan, headcount, MRR)
- ✅ `lib/data/platform.ts` `getPlatformAnalytics()` — 6 parallel queries, JS-side monthly bucketing

### QR Check-in
- ✅ `/api/qr/[memberId]` route — server-side SVG QR (qrcode lib), MEMBER self-only, owner/reception any in-gym, 1-day cache
- ✅ `/member/qr` page ("My QR Code") + `/reception/qr-checkin` page with camera scanner (`BarcodeDetector`, fallback manual entry), check-in/check-out toggle, last-result banner
- ✅ Shared `checkInMember()` helper; `qrCheckInAction` / `qrCheckOutAction` delegate to it

### REST API v1
- ✅ `lib/api/response.ts` (ApiError helpers, pagination) + `lib/api/guard.ts` (`requireApiUser`, `requireApiGymScope` — JSON errors, no redirect, for Route Handlers)
- ✅ `/api/v1/health`, `me`, `members` (list w/ batched latest-membership lookup), `members/[id]` (get/update/delete), `members/[id]/attendance`, `attendance` (list + check-in/out), `payments`, `expenses`
- ✅ Batched member-name lookups instead of per-row joins (no N+1)

### Payments polish
- ✅ Invoice PDFs cached: after generating, the route uploads the buffer to Supabase (`invoices/{id}.pdf`) and stores `pdfStoragePath`; repeat downloads 302-redirect to a signed URL (with graceful fallback)

### Reports export route hygiene
- ✅ `/api/reports/export/[type]`: removed dead helpers (`latestMembershipsByMember`, `parseDateRange`, `monthBounds`, etc.) and unused imports; removed `any`/`prefer-const` violations; the build's ESLint gate now passes

### Testing infrastructure
- ✅ Vitest added (devDependency), `vitest.config.mts` (node env, `@` alias), `npm test` / `npm run test:watch`
- ✅ 26 unit tests in `src/lib/__tests__/` covering `format.ts` (currency/date/days), `member-status.ts` (derived status matrix + metadata), `export.ts` (CSV quoting/subtitle/footer, XLSX round-trip, download headers, filename)

### Build fix — recharts RSC `createContext` failure
- ✅ Root-caused the build failure on `/owner/reports`: recharts creates a React context at module scope; bundled into the server RSC graph, `react` resolves to Next's vendored `react-rsc` copy which has **no** `createContext` → module throws at page-data collection
- ✅ Fix matches the existing `TrendChartLazy` pattern: `AnalyticsOverviewLazy` and `GymGrowthChartLazy` load recharts via `next/dynamic(..., { ssr: false })` with skeleton fallbacks; `StatusBreakdown` split into a recharts-free file so server pages can import it statically
- ✅ Bonus: removes recharts (~300 kB) from the first-load bundle of `/owner/reports`, `/admin/analytics`, and the progress pages

---

## [0.4.1] - 2026-08-06

### Performance pass
- ✅ Fixed dev-mode 500 caused by `NODE_ENV` in the Edge middleware
- ✅ Deduped the `auth()` session query with `cache()`
- ✅ Batched dashboard stats into 4 queries
- ✅ Reports page now only loads the active tab (23 → 5–8 queries)
- ✅ Cached gym meta + notification bell with `unstable_cache`
- ✅ Mobile viewport height fix (`100dvh`)

---

## [0.3.1] - 2026-08-05

### 💰 Payments module completion

**The Payments module is now production-ready: invoice PDFs, the reception collect flow, an owner payments dashboard, and payment reversal.**

### Invoice PDFs
- ✅ On-demand invoice PDF at `/api/invoices/[id]/pdf` (pdf-lib, A4) — gym header/address, bill-to, line item, subtotal/discount/tax, paid/balance, payment history, and footer
- ✅ Scoped by role: members may only download their own invoices; owner/receptionist anything in their gym
- ✅ Fixed a syntax error (`y - 12` used as an object shorthand) that broke the route, and a `Uint8Array`/`BodyInit` type incompatibility
- ✅ Member Payments page "Download" button now links to the PDF route (was a dead button)

### Reception Collect flow
- ✅ New `/reception/payments/[id]/collect` page — the destination of every "Collect" button (was a broken link)
- ✅ Invoice summary (bill-to, plan, due date, subtotal/discount/tax/total, already paid, balance due) + payment history
- ✅ Collect form wired to `collectPaymentAction`: amount defaults to full balance, quick "Full balance" fill, method picker, reference note; partial payments flip to PARTIALLY_PAID, final closes as PAID, PAYMENT_SUCCESS notification fired
- ✅ Handles already-paid / voided invoices with a clear "nothing to collect" state
- ✅ Reception Payments page: `?tab=` param now actually switches tabs; "Due date" column now shows `dueDate` instead of `issuedAt`

### Owner Payments page
- ✅ New `/owner/payments` page + nav item: revenue-this-month / pending-dues / payments-recorded stat cards, Invoices tab (download PDF + Collect), Payment History tab with per-payment **Reverse** action
- ✅ Reverse payment dialog wired to `reversePaymentAction` (compensating reversal row, invoice status recomputed)
- ✅ `reversePaymentAction` return type fixed so the action surfaces the recomputed invoice status

### Infrastructure
- ✅ Supabase storage client is now lazy-initialized — `next build` no longer fails on missing placeholder env keys; uploads fail with a clear "configure storage" message instead

---

## [0.3.0] - 2026-08-05

### 🎉 Notifications

**The Notifications module is now production-ready — an in-app notification center for every role, wired to real events across the app.**

### Notification Center (all 5 roles)
- ✅ `/member/notifications`, `/reception/notifications`, `/trainer/notifications`, `/admin/notifications` (own inboxes) + `/owner/notifications` (gym-wide view with member filter)
- ✅ Inbox with pagination, case-insensitive search, type filter, and unread-only toggle
- ✅ Mark as read, mark all read (own inbox), and delete
- ✅ Owner gym-wide scope: owner may read/delete any notification in their gym; per-row member names resolved
- ✅ Preferences tab (per-type toggles) on every role, including the 4 new types
- ✅ Unread badge in the header bell (all roles incl. admin) with 60s polling
- ✅ Loading + error states for all 5 notification routes

### Notification types & triggers (12 types total)
- ✅ **PAYMENT_SUCCESS** — created atomically with a payment in `assignMembershipAction`
- ✅ **TRAINER_MESSAGE** — fired on every chat message to the recipient; `notifyAssignedMemberAction` lets trainers ping assigned members and owners/reception ping any member
- ✅ **STREAK_MILESTONE** — fired alongside badge awards in the streak cron
- ✅ **GOAL_ACHIEVED** — fired when a workout log sets a new personal record
- ✅ **ATTENDANCE_REMINDER / WORKOUT_REMINDER / DIET_REMINDER** — nightly cron nudges for active members missing today's activity (schedule the job in the evening)
- ✅ EXPIRY / FEE_DUE / BIRTHDAY (existing) + ANNOUNCEMENT / SECURITY (always delivered)

### Data model
- ✅ `NotificationType` enum extended: PAYMENT_SUCCESS, TRAINER_MESSAGE, STREAK_MILESTONE, GOAL_ACHIEVED
- ✅ `@@index([userId, createdAt])` for history pagination
- ✅ All triggers honor per-member preference opt-outs

### Files Added
- `src/app/{member,reception,trainer,owner,admin}/notifications/page.tsx` + `loading.tsx` + `error.tsx`
- `src/components/notifications/notification-center.tsx`, `notification-center-page.tsx`
- `src/components/notifications/notification-filters.tsx`, `notification-row.tsx`, `notification-pagination.tsx`, `mark-all-read-button.tsx`, `notify-member-dialog.tsx`
- `src/components/notifications/notification-type.tsx`, `notification-query.ts`
- `src/components/notifications/notification-center-loading.tsx`, `notification-center-error.tsx`

### Files Modified
- `prisma/schema.prisma` — NotificationType enum + Notification index
- `src/lib/validations/notifications.ts` — new types, toggleable list, `notifyMemberSchema`
- `src/lib/data/notifications.ts` — `getNotificationHistory` (paginated, searchable, filterable)
- `src/lib/actions/notifications.actions.ts` — `deleteNotificationAction`, `notifyAssignedMemberAction`, owner-aware mark-read/delete
- `src/lib/actions/memberships.actions.ts` — PAYMENT_SUCCESS trigger
- `src/lib/actions/messaging.actions.ts` — TRAINER_MESSAGE trigger on new messages
- `src/lib/actions/workouts.actions.ts` — GOAL_ACHIEVED trigger on new PRs
- `src/app/api/cron/streaks/route.ts` — STREAK_MILESTONE notifications on badge awards
- `src/app/api/cron/notifications/route.ts` — ATTENDANCE/WORKOUT/DIET_REMINDER generation
- `src/components/notifications/notification-bell-client.tsx` — shared type icon map
- `src/components/notifications/preference-toggles.tsx` — labels for the 4 new types
- `src/components/app-shell/nav-config.tsx` — Notifications nav items for all 5 roles
- `src/app/admin/layout.tsx` — header notification bell

---

## [0.2.0] - 2026-08-05

### 🎉 Attendance & Streaks

**The Attendance and Streak modules are now production-ready.**

### Attendance
- ✅ Once-per-day check-in rule enforced for both manual and self check-in
- ✅ Manual check-in/out (Owner + Receptionist) with membership-status gating
- ✅ Member self check-in/out card mounted on the member dashboard
- ✅ Audited attendance corrections (writes `attendance.correct` AuditLog entries)
- ✅ Vacation mode: request, approve/reject, per-member history
- ✅ Auto-close of stale sessions (`maxSessionHours`) via cron
- ✅ Daily / weekly / monthly attendance list views with member filter + pagination
- ✅ Attendance stats: daily/monthly rollup, attendance percentage, avg session duration
- ✅ Attendance heatmap calendar (84 days)
- ✅ Attendance report table rendering real data (Operations → Reports)

### Streaks & Gamification
- ✅ Streak evaluation cron (check-in / workout / check-out requirements, monthly freeze replenishment, milestone badges)
- ✅ Current / longest / monthly streak tracking
- ✅ Streak freeze protection
- ✅ Badge awarding + member badge grid (achievements)
- ✅ Opt-in streak leaderboard
- ✅ Vacation mode pauses streak evaluation

### Member Experience
- ✅ New `/member/attendance` page: check-in, streak summary, heatmap, badges, vacation, leaderboard
- ✅ Attendance nav item added for members
- ✅ Loading + error states for all attendance routes (member, owner, reception)

### Files Added
- `src/app/member/attendance/page.tsx`
- `src/app/member/attendance/loading.tsx`, `src/app/member/attendance/error.tsx`
- `src/app/owner/attendance/loading.tsx`, `src/app/owner/attendance/error.tsx`
- `src/app/reception/attendance/loading.tsx`, `src/app/reception/attendance/error.tsx`
- `src/components/attendance/attendance-stats-cards.tsx`
- `src/components/attendance/badge-grid.tsx`
- `src/components/attendance/vacation-card.tsx`

### Files Modified
- `src/lib/actions/attendance.actions.ts` — once-per-day rule, `hasCheckedInToday` helper, member attendance revalidation
- `src/lib/data/attendance.ts` — `getAttendanceStats` rollup
- `src/app/owner/attendance/page.tsx`, `src/app/reception/attendance/page.tsx` — stats cards
- `src/app/member/page.tsx` — self check-in card
- `src/components/app-shell/nav-config.tsx` — member Attendance nav item
- `src/components/attendance/streak-summary-card.tsx` — monthly streak metric
- `src/components/reports/attendance-report-table.tsx` — real table replacing stub

### Breaking Changes
- Check-in is now strictly once per calendar day (was: multiple sessions allowed)

---

## [0.1.0] - 2026-08-05

### 🎉 Initial Foundation

**This version establishes the core foundation of the Kailon Gym Management SaaS Platform.**

### Database
- ✅ Implemented complete Prisma schema with 45+ models
- ✅ Multi-tenant data isolation via `gymId` scoping
- ✅ Auth.js integration with Account and UserSession models
- ✅ Audit trails with AuditLog and LoginAttempt models
- ✅ Full relation definitions for all entities

### Authentication & Authorization
- ✅ JWT-based authentication with access + refresh tokens
- ✅ Google OAuth integration for Trainers and Members
- ✅ Role-based access control (5 roles: PLATFORM_SUPER_ADMIN, GYM_OWNER, RECEPTIONIST, TRAINER, MEMBER)
- ✅ Brute-force protection with rate limiting
- ✅ Session management with sliding window expiry (90 days)
- ✅ Session revocation (immediate effect)
- ✅ Invite-based staff onboarding with token verification
- ✅ Member self-registration via Gym Code

### User Management
- ✅ Gym owner signup and gym creation
- ✅ Staff invitation system (email + token)
- ✅ Trainer approval workflow (for self-signups)
- ✅ Member registration
- ✅ User status lifecycle (INVITED → ACTIVE → INACTIVE)

### Gym Management
- ✅ Gym profile (name, logo, address, contact)
- ✅ Gym Settings (attendance rules, streak configuration, invoice numbering)
- ✅ Gym Code generation and sharing
- ✅ Branding (primary color, logo)
- ✅ Timezone and currency configuration

### Membership Plans
- ✅ Plan CRUD (create, read, update, delete)
- ✅ Plan assignment to members
- ✅ Plan status management (active/inactive)
- ✅ Membership status tracking (ACTIVE, EXPIRED, FROZEN, CANCELLED, UPGRADED)

### Member Management
- ✅ Member registration with personal info
- ✅ Member profile management
- ✅ Member search and filtering
- ✅ Status badge display
- ✅ Trainer assignment
- ✅ Emergency contact tracking
- ✅ Health notes

### Payments & Invoicing
- ✅ Invoice generation
- ✅ Payment recording (Cash, UPI, Card, Bank Transfer)
- ✅ Payment history tracking
- ✅ Invoice status management (UNPAID, PARTIALLY_PAID, PAID, VOID)
- ✅ Partial payment support
- ❌ Invoice PDF generation (pending)
- ❌ Due date tracking (pending)

### Expenses
- ✅ Expense CRUD operations
- ✅ Expense category management
- ✅ Monthly expense reporting
- ✅ P&L summary calculation
- ✅ Category-wise breakdown

### Workouts (Partial)
- ✅ Exercise library structure
- ✅ Workout template model
- ✅ Workout plan assignment
- ✅ Workout logging model
- ✅ Personal record tracking
- 🟡 UI components need completion

### Diet (Partial)
- ✅ Diet template model
- ✅ Diet plan assignment
- ✅ Meal tracking structure
- ✅ Water intake logging
- ✅ Supplement recommendations
- 🟡 UI components need completion

### Progress Tracking (Partial)
- ✅ Body measurement model
- ✅ Progress photo model
- ✅ Measurement source tracking (TRAINER/SELF)
- 🟡 UI components need completion

### Messaging (Partial)
- ✅ Conversation model
- ✅ Message types (TEXT, IMAGE, PDF, WORKOUT_NOTE, DIET_NOTE)
- ✅ Trainer ↔ Member threading
- 🟡 UI components need completion

### Notifications (Partial)
- ✅ Notification model
- ✅ Notification preference model
- ✅ Notification template model
- ✅ In-app notification bell component
- ❌ Email delivery pending
- ❌ Cron jobs for notifications pending

### Attendance (Partial)
- ✅ Attendance record model
- ✅ Check-in/out methods (MANUAL, SELF, QR, AUTO)
- ✅ Session duration tracking
- ✅ Streak model (current, longest, monthly)
- ✅ Vacation mode model
- ✅ Badge model
- 🟡 UI components need completion
- ❌ Streak calculation logic pending

### Reports
- ✅ Report export model
- ✅ Audit log model
- ✅ Filter options structure
- ❌ Export functionality pending
- ❌ Report UI stubs created

### UI/UX
- ✅ Responsive design across all pages
- ✅ shadcn/ui component library integration
- ✅ Dark mode support
- ✅ Role-based dashboards (5 roles)
- ✅ App shell with sidebar navigation
- ✅ User menu with logout
- ✅ Theme toggle

### Pages Implemented
- ✅ Landing page (/)
- ✅ Login (/login)
- ✅ Register (/register)
- ✅ Join Gym (/join)
- ✅ Invite acceptance (/invite/[token])
- ✅ Owner dashboard (/owner)
- ✅ Owner: Members, Memberships, Staff, Expenses, Settings, Reports
- ✅ Reception: Members, Payments, Attendance, Settings
- ✅ Trainer: Members, Workouts, Diet, Progress, Messages
- ✅ Member: Dashboard, Workout, Diet, Progress, Payments, Chat
- ✅ Admin: Dashboard

### Technical Debt
- ✅ TypeScript compilation fixed (18 → 0 errors)
- ✅ Created stub components for pending modules
- 🟡 Error boundaries needed
- 🟡 Global loading state inconsistent
- 🟡 Test suite not implemented
- 🟡 API routes not formalized (using Server Actions)

### Breaking Changes
- None yet (pre-1.0)

---

## Upcoming (Planned)

### [0.3.0] - Notifications & Payments
- Email notification delivery (expiry, fee due, reminders, announcements)
- Invoice PDF generation
- Due date tracking
- Report export (CSV/XLSX/PDF)
- Analytics dashboard
- Custom report builder

### [0.4.0] - Testing & Polish
- Unit and integration tests
- E2E testing with Playwright
- Performance optimization
- Security audit
- Production deployment

---

For detailed module specifications, see `/docs/*.md` files.
