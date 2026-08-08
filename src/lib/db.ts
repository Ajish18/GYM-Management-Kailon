import { PrismaClient } from "@prisma/client";

// Standard Next.js/Prisma singleton: prevents exhausting the DB connection
// pool from hot-reload creating a new PrismaClient on every module reload
// in dev, and keeps one client per serverless function instance in prod.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Two connection modes, chosen by where we're running:
//
//  LOCAL (long-lived `next dev` / `next start`): connect DIRECTLY to
//  Postgres (port 5432) instead of through the Supabase pgbouncer
//  transaction pooler (port 6543). Measured on a real project the direct
//  connection is ~4–5× faster per query (~60ms vs ~270ms warm, and ~0.9s
//  vs ~2.9s on the first cold connect) because it skips the pooler hop and
//  Prisma's own connection manager keeps a warm persistent pool.
//
//  One catch for local: the Supabase direct (session-mode) connection caps
//  at 15 concurrent clients (pool_size: 15), and Prisma's DEFAULT pool
//  (cpus*2+1) can exceed that on multi-core boxes — which surfaces as "max
//  clients reached in session mode" and 500s. So we pin Prisma's pool to 5,
//  safely under the ceiling.
//
//  VERCEL (serverless functions): the pooler is the right choice here —
//  a short-lived instance can't keep a direct pool warm, and many cold
//  instances opening direct session-mode connections would collectively
//  blow past the 15-client cap. The transaction pooler (port 6543, with
//  pgbouncer=true in the URL) is built for exactly this. Vercel sets
//  process.env.VERCEL, so we flip based on that.
function buildRuntimeUrl(): string | undefined {
  if (process.env.VERCEL) {
    // Serverless — route through the pgbouncer transaction pooler.
    return process.env.DATABASE_URL;
  }
  const raw = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (raw && process.env.DIRECT_URL) {
    try {
      const url = new URL(raw);
      url.searchParams.set("connection_limit", "5");
      return url.toString();
    } catch {
      // Malformed URL — let Prisma surface the real error.
      return raw;
    }
  }
  return raw; // Pooled fallback — pgbouncer manages the pool.
}
const runtimeUrl = buildRuntimeUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: runtimeUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Cache unconditionally: in dev this prevents hot-reload from leaking clients,
// and in prod it dedupes the client across function bundles within a single
// serverless instance (each new PrismaClient = a fresh connection pool).
globalForPrisma.prisma = db;
