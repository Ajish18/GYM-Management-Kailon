import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe subset of the auth config, used only by middleware.ts.
 *
 * Middleware runs on the Edge runtime, which cannot open a TCP connection
 * to Postgres — so this config has no Prisma adapter and no providers, and
 * therefore never re-runs the DB-backed jwt() callback from config.ts. It
 * only decrypts the existing session cookie and reads the claims that were
 * already embedded in it at sign-in time.
 *
 * This makes middleware a fast, approximate first-pass gate (good enough to
 * avoid flashing protected UI to the wrong role). The authoritative check —
 * including immediate effect of account deactivation/role changes — happens
 * server-side in layouts/route handlers/server actions via auth() from
 * config.ts, which DOES run on the Node runtime and re-validates against
 * the UserSession table on every call. Middleware is a UX optimization,
 * not the security boundary.
 */
export const authConfigEdge: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (token?.uid) {
        session.user.id = token.uid as string;
        session.user.role = token.role!;
        session.user.gymId = (token.gymId as string | null) ?? null;
      }
      return session;
    },
  },
};
