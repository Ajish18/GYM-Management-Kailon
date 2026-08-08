# Kailon — Train • Track • Transform

Kailon is a multi-tenant **gym management platform** — one app that replaces the
spreadsheet, paper register, and WhatsApp group: memberships & payments,
attendance & streaks, workout programming, diet & macros, progress tracking,
reports, notifications, and staff tools. Five roles in one tenant:

| Role | Home |
|------|------|
| Platform super admin | `/admin` |
| Gym owner | `/owner` |
| Receptionist | `/reception` |
| Trainer | `/trainer` |
| Member | `/member` |

## Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Database:** Prisma ORM on Supabase PostgreSQL (transaction pooler for
  serverless, direct connection locally)
- **Auth:** NextAuth v5 — JWT sessions, Google + Credentials providers,
  DB-backed revocable sessions, rate limiting
- **UI:** Tailwind CSS v4 + shadcn/Base UI components
- **Email:** Resend (transactional invites + password resets)

## Development

```bash
cp .env.example .env        # fill in real values (see SETUP.md)
npm install
npm run db:generate
npm run dev                 # http://localhost:3000
```

Quality gates (all green in CI / before deploy):

```bash
npm run typecheck           # tsc --noEmit
npm test                    # Vitest unit suites
npm run lint                # ESLint
npm run build               # production build
```

## Deployment

Deploys to Vercel from git. The `vercel-build` script generates the Prisma
client, applies migrations (`prisma migrate deploy`), then builds Next.js.
Required environment variables and the Google OAuth callback URL are documented
in [SETUP.md](SETUP.md). Product status and roadmap live in
[docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md); a business/revenue assessment
is in [docs/BUSINESS_ASSESSMENT.md](docs/BUSINESS_ASSESSMENT.md).

## Docs

The `docs/` folder contains the full product specification: feature list,
functional & non-functional requirements, role/permission matrix, database
design, API design, module design, and security design.
