# Kailon — How People Use It (Demo Plan)

## The five-minute story

1. **Gym owner signs up** at `/register` — name, gym name, email, password. Kailon
   instantly generates a unique **Gym ID** (e.g. `K7F3XQ`) and shows it once,
   clearly, with a copy button. This code is the gym's front door for
   everyone else.
2. **Owner shares the Gym ID** with their staff and members — printed on a
   poster at the front desk, sent in a WhatsApp group, whatever. It's not a
   secret like a password; it's just "which gym."
3. **Staff and members join themselves** at `/join`: type the Gym ID → pick
   "Sign In" or "Create Account" → set a name/email/password (or use
   Google). No IT department, no CSV imports, no owner manually typing in
   every trainer.
4. **Trainers need one click of approval** from the owner (Staff page) the
   first time — members don't, since a member only ever sees their own
   data, but a trainer can see assigned members' health notes and messages,
   so that one gets a human check.
5. **Owner can still hand-pick people instead**, via **Invite staff** on the
   Staff page — same destination, curated path: they type the person's
   email, Kailon emails a link, and that person is pre-approved (no
   approval step, since the owner explicitly chose them).

Both onboarding paths (self-serve with Gym ID, or owner-curated invite)
lead to the same account system — a person can always sign in with a
password **or** Google, whichever they set up.

## Role-by-role journey

### Gym Owner
- Signs up → gets Gym ID → lands on `/owner` dashboard (today's check-ins,
  revenue, pending dues, expiring memberships).
- `/owner/staff` — invite specific people, or watch self-joined trainers
  show up as "Awaiting approval" and approve/reject with one click.
- `/owner/memberships` — define plans (Monthly/Quarterly/Yearly, price,
  duration).
- `/owner/members` — register a member at the desk (for people who show up
  in person rather than self-signing-up), assign a plan, collect payment —
  one action creates the membership + invoice + payment together.
- `/owner/settings` — Gym ID (to re-share), gym-wide config (attendance
  grace period, streak freezes, tax %, invoice numbering), and their own
  password.

### Receptionist
- Joins via the Gym ID (owner tells them the code) or an owner invite.
- `/reception` — "Today" view: check-ins, dues, expiring memberships.
- `/reception/members` — same registration + plan-assignment flow as the
  owner, minus financial analytics and gym settings.
- `/reception/settings` — Gym ID (to help people join) + their own password.

### Trainer
- Either self-joins with the Gym ID (waits for one approval click) or
  accepts an owner invite (active immediately).
- Signs in with password or Google from then on.
- (Workout/diet/messaging modules are the next build phase — see below.)

### Member
- Self-joins with the Gym ID — active immediately, no waiting.
- Signs in with password or Google.
- Dashboard shows streak, membership status, and (soon) today's workout/diet.

## Suggested live-demo script (for a prospective client)

1. Open `/register` fresh, create "their" gym on the spot — watch the Gym
   ID get generated live. This is the "wow, that was fast" moment.
2. Show the owner dashboard, then jump to `/owner/memberships` and create a
   plan in front of them (e.g. "Monthly — ₹1,500").
3. Register a walk-in member via `/owner/members`, assign the plan you just
   made, collect a cash payment — point out the invoice number that just
   got generated.
4. Open an incognito window, go to `/join`, type the Gym ID, and self-sign-up
   as a Trainer — then flip back to the owner tab and approve them live.
   This double-sided moment (owner + trainer, two windows) tends to land
   well.
5. Sign in as the member (password or their Google account) and show the
   dashboard from their side.

## What's genuinely production-ready today

- Multi-tenant data isolation (every query scoped server-side by `gymId`,
  never trusted from the client).
- Brute-force protection on login (account + IP rate limiting).
- Session revocation that takes effect immediately (deactivate someone,
  they're out on their very next request, not next login).
- Password + Google as independent, coexisting auth methods per account.
- Atomic financial writes (membership + invoice + payment can't half-fail).
- Full audit trail on financial/membership actions.

## What's still ahead (not built yet)

Attendance/check-in, workouts, diet plans, progress tracking, streaks
(schema exists, no UI/logic yet), reports, in-app messaging, notifications.
These are the remaining modules from `docs/04-feature-list.md` — the
foundation (auth, tenancy, member/payment core loop) is what everything
else gets built on top of. Recommend picking 1-2 of these next based on
what matters most for your first client conversations — attendance/check-in
is probably the highest-leverage next build since it's the daily-use loop
that makes the product sticky.

## One security trade-off, made explicitly

Trainer self-signup requires owner approval before first login; Member
self-signup doesn't. This is because a Trainer account can see assigned
members' health notes and messages (higher blast radius if someone
mischievously signs up), while a Member account only ever sees their own
data. If you'd rather trainers also be instant-active (trading a little
security for zero friction), that's a one-line change — say the word.
