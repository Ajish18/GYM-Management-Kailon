# 14. Dashboard Design

Design principle: each dashboard answers **"what do I need to know or do right now"** in under 3 seconds, using card-based, glanceable UI — not dense tables (tables live in Reports). Visual language: modern SaaS/consumer-fitness (see [02-product-vision-and-personas.md](02-product-vision-and-personas.md) §2.4), fully responsive, dark-mode-first with light-mode parity, skeleton loading states, and explicit empty states for a brand-new gym with no data yet.

## 14.1 Owner Dashboard

**Primary question**: "How is my gym doing today, and what needs my attention?"

| Section | Content |
|---|---|
| Hero stat row | Today's check-ins, Today's revenue, Pending fees (count + amount), Memberships expiring this week |
| Revenue trend | Monthly income vs expenses, last 6 months (line/bar chart) |
| Net profit card | Current month net profit, delta vs prior month |
| Top performers | Top 5 trainers (by retention/adherence), Top 5 members (by streak/attendance) |
| Attendance snapshot | Today's attendance % vs gym average |
| Recent activity feed | Latest registrations, renewals, payments, freezes (last 24–48h) |
| Alerts | Expiring memberships, pending dues, low-attendance ("at risk") members — each a clickable list, not just a number |
| Quick actions | Register member, Record payment, Add expense |

## 14.2 Trainer Dashboard

**Primary question**: "Who do I need to work with today, and what's outstanding?"

| Section | Content |
|---|---|
| Hero stat row | Assigned members count, Today's scheduled sessions (members with a workout due today), Unread messages |
| Today's roster | List of assigned members with a workout/diet plan active today, with quick-log-completion action |
| Pending workouts | Members who haven't logged today's assigned workout |
| Attendance of assigned members | Mini attendance snapshot scoped to their roster only |
| Messages | Recent conversation previews |
| Quick actions | Assign workout, Assign diet, Log measurement |

## 14.3 Member Dashboard

**Primary question**: "Am I on track today, and how am I doing overall?" — this is the retention/engagement surface, designed to feel rewarding to open.

| Section | Content |
|---|---|
| Hero | Current streak (large, prominent, flame/visual motif), Longest streak |
| Today's plan | Today's workout (with a check-in/complete CTA), Today's diet/meals, Water intake tracker |
| Membership status | Plan name, expiry date/days remaining, renew CTA if expiring soon |
| Attendance calendar | Month view heatmap |
| Progress snapshot | Latest measurement vs prior, mini trend chart |
| Achievements | Recently earned badges, next badge milestone |
| Payment status | Any pending dues, link to payment history |
| Chat | Quick access to trainer conversation |

## 14.4 Receptionist "Today" View

Not a full analytics dashboard by design (permission matrix excludes financial analytics) — an operational front-desk console.

| Section | Content |
|---|---|
| Check-in panel | Fast member search → one-tap check-in/out |
| Today's expected activity | Memberships expiring today, birthdays today |
| Pending dues today | Quick list for front-desk collection prompts |
| Quick actions | Register member, Record payment, Print receipt |

## 14.5 Platform Super Admin Dashboard

**Primary question**: "Is the business healthy, and does any tenant need attention?"

| Section | Content |
|---|---|
| Hero stat row | Total active gyms, MRR, Trial gyms, Past-due/suspended gyms |
| Growth trend | New gyms per month, churned gyms per month |
| Plan distribution | Gyms per subscription tier |
| Attention list | Gyms past-due, gyms nearing trial expiry, gyms with anomalous usage |
| Recent platform activity | New signups, plan changes, suspensions |
| Quick actions | Suspend/reinstate gym, send announcement, view impersonation audit log |

## 14.6 Cross-Cutting UI/UX Requirements

- **States**: every card/list defines loading (skeleton), empty (first-run guidance, e.g., "No payments yet — record your first one"), and error (retry affordance) states — no blank/broken renders (NFR-UX-003).
- **Responsiveness**: dashboards reflow to a single-column card stack on mobile; charts collapse to key-number summaries below a defined breakpoint rather than becoming illegibly small.
- **Motion**: Framer Motion used for state transitions and card entrance only — restrained, not decorative; respects `prefers-reduced-motion`.
- **Data freshness**: dashboards fetched via TanStack Query with a short stale-time (≤60s) and manual refresh affordance, consistent with FR-DASH-002 (not a live socket feed at v1).
- **Personalization**: Owner/Trainer/Member dashboards greet by name and reflect gym branding (logo/accent color) to reinforce "this is my gym's app," not a generic vendor tool.
