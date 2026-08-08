# Kailon — Client Demo Runbook

**Live app:** https://gym-kailon.vercel.app
**Demo gym:** Iron Peak Fitness — a fully populated example gym (15 members,
payments, 30 days of attendance, streaks, workouts, diet, messages,
notifications) seeded into the live database so every screen is alive.

---

## 1. Logging in (do this before the client arrives)

Open https://gym-kailon.vercel.app/login and sign in. Every role uses the
**same login form**: Gym ID + email + password.

| Field | Value |
|-------|-------|
| **Gym ID** | `IRONPEAK` |
| **Password** (every account) | `Demo@123` |

| Role | Email |
|------|-------|
| Owner | `owner@ironpeak.fit` |
| Reception | `reception@ironpeak.fit` |
| Trainer | `trainer.vikram@ironpeak.fit` |
| Member | `aarav.mehta@example.com` |

Extra accounts to demo specific scenarios:
- **Member with overdue dues:** `pooja.joshi@example.com`
- **Member expiring in 3 days:** `sneha.reddy@example.com`
- **New member (onboarding):** `ishita.gupta@example.com`

---

## 2. The five-minute story (for the client)

Tell the story of **"Iron Peak Fitness, Andheri West"** — a real gym whose
owner swapped the spreadsheet + paper register + WhatsApp group for one app.

### 🏢 Owner — "run the whole business from here"
1. **Dashboard** (`/owner`) — today's check-ins, revenue collected, pending
   dues, memberships expiring this week. Everything a gym owner checks
   first thing in the morning.
2. **Members** (`/owner/members`) — 15 members, searchable, with membership
   status. Show the **Bulk Import** (CSV/XLSX) and **template download**.
3. **Memberships & payments** (`/owner/memberships`) — Starter ₹1,499 /
   Growth ₹2,499 / Pro ₹7,999 with GST invoices. Open a member's invoice and
   show the **PDF download**.
4. **Payments** (`/owner/payments`) — collected revenue, UPI/Cash/Card, and
   **Pooja's overdue invoice** (₹2,948.82) flagged as a pending due.
5. **Trainer Workload** (`/owner/trainer-workload`) — Vikram and Ananya's
   member load vs capacity.
6. **Reports** (`/owner/reports`) — revenue, attendance, member metrics with
   **CSV/XLSX export**.

### 💳 Reception — "the front desk, supercharged"
1. **Today** (`/reception`) — morning check-ins already rolling in, who's
   due, whose membership is about to expire.
2. **QR Check-in** (`/reception/qr`) — open a member's QR code from their
   phone and scan it at the desk (Chrome/Edge; camera required).

### 🏋️ Trainer — "every client, every day"
1. **My Members** (`/trainer`) — Vikram's assigned members with health notes.
2. **Workout** (`/trainer/workout`) — the **Push • Pull • Legs** program, the
   exercise library, and today's logged sessions (Deepak, Karan, Aarav).
3. **Diet** — Lean Bulk (3,000 kcal) and Fat Loss (1,800 kcal) plans assigned
   to members.
4. **Messages** — live trainer↔member conversations (Aarav, Diya, Sameer).

### 🙋 Member — "it's my gym, on my phone"
1. **Dashboard** (`/member`) — streak ("30-day streak 🔥" for Deepak),
   membership status, today's workout.
2. **My QR** (`/member/qr`) — the code they scan at the front desk.
3. **Workout / Diet / Progress** — logged sessions, PRs (Manish's 180 kg
   squat), body-measurement charts trending down, water intake.
4. **Payments** (`/member/payments`) — their invoices and receipts.
5. **Chat** — messages with their trainer.

### 🔔 Notifications — "the nudge engine"
Show the bell in the top-right on any role: payment confirmations, streak
milestones, fee-due alerts, expiry reminders, workout reminders. This is the
anti-churn loop.

---

## 3. Live "wow" moments (create in front of them)

These are genuinely impressive because they happen instantly and write real
data:

1. **Create a plan** → `/owner/memberships` → New Plan → name it, price it,
   save. It's on the member-assignment screen immediately.
2. **Register a walk-in member** → `/owner/members` → Register → assign a
   plan → collect payment → watch the **invoice number** generate (INV-00xx).
3. **Bulk import** → `/owner/members` → Import → download the template, add 2
   rows, upload, watch them validate + insert.
4. **Forgot password** → log out, use "Forgot password?" on the login page —
   watch the reset email flow (Resend sender).
5. **Check someone in** → Reception → Today → search a member → Check in →
   they appear at the top of today's list instantly.
6. **Streak leaderboard** → Member attendance page — Deepak's 30-day streak.

---

## 4. If the client asks about billing / revenue

- The product is a **B2B SaaS sold per gym** — one `Gym` record = one tenant =
  one subscription (already modeled: `Gym.status` = TRIAL/ACTIVE/SUSPENDED).
- **v0.7 (next):** Razorpay for INR (UPI/cards), auto monthly invoices, and
  subscription gating by `Gym.status`.
- **v0.8:** pricing tiers + self-serve upgrade, real platform MRR dashboard.
- Full detail in `docs/BUSINESS_ASSESSMENT.md`.

---

## 5. Reset the demo data

The demo gym is re-seedable. If anyone creates data during the demo and you
want a clean slate, re-run:

```bash
npx tsx prisma/seed-demo.ts
```

It deletes and recreates only the `IRONPEAK` gym — nothing else is touched.
