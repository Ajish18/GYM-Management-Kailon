# 2. Product Vision & User Personas

## 2.1 Product Vision

> Kailon gives every gym — from a single-trainer studio to a multi-branch chain — the same caliber of digital operations and member experience as the world's best fitness brands, without needing a technical team to run it.

Three pillars:

1. **Train** — trainers assign structured workout and diet programs and track adherence, not just attendance.
2. **Track** — attendance, streaks, body measurements, and progress are captured continuously and visualized clearly, for both the gym (retention, revenue) and the member (motivation).
3. **Transform** — the platform's north star metric is member transformation (visible progress + consistency), which is the actual product a gym sells.

Design principle: **the software should feel like something a member is proud to open**, not a back-office tool they're forced to tolerate. This shapes every UI decision downstream (see [14-security-design.md](14-security-design.md) is unrelated; see UI/UX notes in [13-dashboard-design.md](13-dashboard-design.md) and module design).

## 2.2 Target Market

- **Primary**: Independent gyms and fitness studios (1–3 locations), 100–2,000 members, currently using paper registers, Excel, WhatsApp, or fragmented point tools.
- **Secondary**: Small regional gym chains (3–15 branches) — addressed by the multi-branch architecture reserved in the roadmap (branches are modeled in the schema now, exposed in UI later).
- **Geography**: Global, India-first (payment methods — Cash/UPI/Card/Bank Transfer — and pricing localized), English UI at launch with i18n-ready architecture.

## 2.3 User Personas

### Persona 1 — Raj, Gym Owner ("The Operator")
- Owns a 400-member gym, 3 trainers, 1 receptionist.
- Runs the business on WhatsApp + a paper register + a shared Excel sheet for payments.
- Pain: doesn't know monthly profit/loss until his accountant tells him weeks later; can't see which members are about to churn; renewal follow-ups are manual and often missed.
- Wants: a dashboard he can check every morning on his phone that tells him "how is my gym doing today," and automated renewal/expiry alerts.
- Success looks like: never losing a renewal to "we forgot to call them," and knowing his net profit in real time.

### Persona 2 — Meena, Receptionist ("The Front Desk")
- Handles walk-ins, registrations, fee collection, and daily attendance marking.
- Not tech-savvy beyond basic apps; needs a fast, error-tolerant UI — she's often mid-conversation with a member while using it.
- Pain: current process is a paper register plus a separate cash notebook; reconciliation is manual and error-prone.
- Wants: a big, fast "check-in" screen, one-tap renewal + payment collection, and instant receipt printing.

### Persona 3 — Arjun, Trainer ("The Coach")
- Manages 25–40 assigned members. Spends most of his day on the gym floor, occasionally on his phone.
- Pain: no easy way to remember who's on which program, tracking progress is via personal notes/photos on his own phone, no structured way to message members.
- Wants: quick access to "my members today," fast workout/diet assignment from templates (not typing from scratch every time), and a simple way to log a measurement or note between sets.

### Persona 4 — Priya, Member ("The Trainee")
- Pays monthly, trains 4–5x/week, motivated by visible progress and streaks.
- Pain: no visibility into her own progress trend, doesn't know her plan expiry until she's turned away at the door, no easy way to ask her trainer a quick question outside gym hours.
- Wants: to see her streak, her next workout, her diet plan, and a simple chat with her trainer, from her phone.

### Persona 5 — Kailon Platform Ops ("The Vendor")
- Not gym staff — Kailon's own internal team running the SaaS business.
- Needs: visibility into every tenant's subscription health, platform-wide usage/analytics, ability to suspend non-paying tenants, and support tooling that never silently exposes member PII.

## 2.4 Design Language Reference

UI/UX benchmark set (referenced throughout, not implemented here): Apple Fitness+ (progress visualization, card-based stats), Nike Training Club (program/workout presentation), Linear/Vercel/Notion (dashboard information density, dark mode quality, motion restraint). Explicit anti-pattern: dense ERP grid tables as the primary interface — grids are a reporting surface, not the default experience.
