import { PrismaClient } from "@prisma/client";

// Standard Next.js/Prisma singleton: prevents exhausting the DB connection
// pool from hot-reload creating a new PrismaClient on every module reload
// in dev, and keeps one client per serverless function instance in prod.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Kailon runs as a long-lived Node server (`next dev` / `next start`), so we
// connect DIRECTLY to Postgres (port 5432) instead of through the Supabase
// pgbouncer transaction pooler (port 6543). Measured on a real project the
// direct connection is ~4–5× faster per query (~60ms vs ~270ms warm, and
// ~0.9s vs ~2.9s on the first cold connect) because it skips the pooler hop
// and Prisma's own connection manager keeps a warm persistent pool.
//
// One catch: the Supabase direct (session-mode) connection caps at 15
// concurrent clients (pool_size: 15), and Prisma's DEFAULT pool (cpus*2+1)
// can exceed that on multi-core boxes — which surfaces as "max clients
// reached in session mode" and 500s. So we pin Prisma's pool to 5, which is
// ample for one long-lived server and safely under the ceiling.
//
// The pooler only earns its keep on serverless (Vercel/edge functions),
// where a short-lived instance can't keep a pool warm and many direct
// connections would exhaust the DB's connection budget — if you deploy
// there, flip this back to DATABASE_URL.
function buildRuntimeUrl(): string | undefined {
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
  return raw; // Pooled fallback (serverless) — pgbouncer manages the pool.
}
const runtimeUrl = buildRuntimeUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: runtimeUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
