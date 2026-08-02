# Kailon — Product & Engineering Documentation

**Kailon** — *Train • Track • Transform* — is a premium, multi-tenant Gym Management SaaS platform sold on a monthly/annual subscription to gym owners. This folder is the complete pre-implementation blueprint: SRS, PRD, system architecture, database design, permission matrix, and module design. No implementation code is included by design — this is what engineering builds from.

## Technology Stack

Frontend: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, React Hook Form, Zod, TanStack Query, Axios
Backend: Next.js API Routes / Route Handlers, TypeScript
Database: PostgreSQL (Supabase-hosted) via Prisma ORM
Auth: JWT
Storage: Supabase Storage
Deployment: Vercel · CI/CD: GitHub Actions · VCS: GitHub

## Reading Order (matches required deliverable order)

| # | Deliverable | File |
|---|---|---|
| 1 | Executive Summary | [01-executive-summary.md](01-executive-summary.md) |
| 2–3 | Product Vision & User Personas | [02-product-vision-and-personas.md](02-product-vision-and-personas.md) |
| 4 | User Roles | [03-user-roles.md](03-user-roles.md) |
| 5 | Feature List | [04-feature-list.md](04-feature-list.md) |
| 6 | Functional Requirements | [05-functional-requirements.md](05-functional-requirements.md) |
| 7 | Non-Functional Requirements | [06-non-functional-requirements.md](06-non-functional-requirements.md) |
| 8 | System Architecture | [07-system-architecture.md](07-system-architecture.md) |
| 9 | Database Design | [08-database-design.md](08-database-design.md) |
| 10 | Permission Matrix | [09-permission-matrix.md](09-permission-matrix.md) |
| 11 | API Design | [10-api-design.md](10-api-design.md) |
| 12 | Module Design | [11-module-design.md](11-module-design.md) |
| 13 | Report Design | [12-report-design.md](12-report-design.md) |
| 14 | Dashboard Design | [13-dashboard-design.md](13-dashboard-design.md) |
| 15 | Security Design | [14-security-design.md](14-security-design.md) |
| 16 | Future Roadmap | [15-future-roadmap.md](15-future-roadmap.md) |

## One-Paragraph Orientation

Kailon is architected as a **single shared PostgreSQL schema, `gym_id`-partitioned** multi-tenant SaaS, not a schema-per-tenant or database-per-tenant system — this keeps operations simple at the target scale (thousands of gyms) while every table, query, and API route enforces tenant isolation server-side. Five roles exist: **Platform Super Admin** (runs the SaaS business, no standing tenant-data access), **Gym Owner** (full control of one gym), **Receptionist** (front-desk operations only), **Trainer** (scoped to assigned members only), and **Member** (scoped to their own data only). Twenty core modules cover the full gym-operations lifecycle — membership, attendance, workouts, diet, progress, payments, expenses, reporting, notifications, and messaging — unified by a gamified streak/retention system that is the product's key differentiator against legacy gym software. Every module's data model, API contract, and permission boundary is fully specified in this document set prior to any code being written.

## Status

Documentation complete for v1 scope. No application code exists yet in this repository — next step is Prisma schema implementation from [08-database-design.md](08-database-design.md), followed by API Route Handler scaffolding from [10-api-design.md](10-api-design.md).
