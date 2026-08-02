# 1. Executive Summary

## 1.1 Product

**Kailon** ("Train • Track • Transform") is a multi-tenant, cloud-native Gym Management SaaS platform. It replaces spreadsheets, WhatsApp groups, and legacy desktop gym software with a single premium web application that gym owners, receptionists, trainers, and members all use daily.

Kailon is sold on a recurring subscription basis (per-gym, tiered by member count / feature access) to independent gyms, boutique studios, and small gym chains. The platform is operated centrally by Kailon (the vendor) and consumed by thousands of independently-owned gyms ("tenants"), each with fully isolated data.

## 1.2 What Kailon Is Not

- Not an ERP: no general ledger, no procurement, no HR/payroll suite. Expense tracking exists only to give owners a P&L view of the gym.
- Not a single-tenant custom build: every feature must work identically for gym #1 and gym #10,000.
- Not a legacy admin panel: the UI/UX bar is Apple Fitness / Nike Training Club / modern SaaS dashboards (Linear, Vercel, Notion), not phpMyAdmin-grade CRUD screens.

## 1.3 Business Model

- **Model**: B2B SaaS, subscription billing per gym (the "tenant"), tiered plans (e.g., Starter / Growth / Pro), billed monthly or annually.
- **Buyer**: Gym Owner.
- **Users within a tenant**: Gym Owner, Receptionist(s), Trainer(s), Member(s) — all provisioned by the Gym Owner (or invited via the Owner's admin panel).
- **Platform operator**: Kailon's own team, via the Platform Super Admin console — a separate application surface not exposed to gym staff.

## 1.4 Strategic Goals (Year 1)

| Goal | Target |
|---|---|
| Onboard paying gyms | 500 gyms in first 12 months |
| Time-to-first-value | Gym owner can register a member and record a payment within 10 minutes of signup |
| Platform uptime | 99.9% monthly |
| Member-facing engagement | 40%+ of members check the member dashboard weekly (streak system as the hook) |
| Churn | < 3% monthly logo churn by month 12 |

## 1.5 Key Differentiators

1. **Gamified retention layer** (streaks, badges, leaderboards) that directly targets the #1 gym-industry problem: member attrition.
2. **Trainer-first workflow** — assigned-member scoping, workout/diet assignment, and progress tracking designed for how trainers actually work the floor, not just admin data entry.
3. **Premium consumer-grade UI** for an industry still using DOS-era or Excel-based tools, differentiating on experience rather than just feature checklists.
4. **Multi-tenant SaaS architecture from day one** — every module, table, and API is tenant-scoped, so the platform scales horizontally across gyms without per-customer forks.

## 1.6 Document Purpose

This documentation set is the system-of-record for scope, architecture, and design prior to implementation. It covers: product vision, personas, roles, functional and non-functional requirements, system architecture, database design, permission matrix, API design, module design, report design, dashboard design, security design, and the future roadmap. No implementation code is included by design — this is the blueprint the engineering team builds from.
