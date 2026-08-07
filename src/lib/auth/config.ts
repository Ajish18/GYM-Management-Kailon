import crypto from "crypto";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { checkLoginRateLimit, recordLoginAttempt, verifyPassword } from "@/lib/auth/security";
import { loginSchema } from "@/lib/validations/auth";

// ── Session cache ─────────────────────────────────────────────────────
// The jwt() callback re-derives every claim from the DB on every request
// (see the "authoritative check" comment in guards.ts). During client-side
// navigation the RSC render fires this callback for *each* new page, so
// a 3-page click sequence triggers 3 identical SELECTs to Supabase — all
// returning the same row because the cookie hasn't changed.
//
// A short-lived in-memory cache keyed by session-JTI eliminates the
// redundant round-trips while keeping the revocation / deactivation check
// fresh enough for real-world use (5 s staleness is imperceptible for
// "did an admin just deactivate this account?"). The `lastActiveAt` write
// already only fires once per day (SESSION_REFRESH_THRESHOLD_MS), so this
// doesn't add any new write traffic.
const SESSION_CACHE_TTL_MS = 5_000;
type CachedSession = {
  userId: string;
  role: string;
  gymId: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  expiresAt: Date;
  sessionId: string;
  staleAt: number; // Date.now() + TTL
};
const sessionCache = new Map<string, CachedSession>();

// A sliding window, not a hard cutoff: as long as someone opens the app at
// least once every 90 days, they never see a login screen again — the same
// "just stays logged in" behavior people expect from Instagram/WhatsApp on
// their phone. Explicit sign-out or an owner deactivating the account are
// the only things that end it sooner (see the revocation check below).
const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days
// How stale UserSession.lastActiveAt must be before we bother extending it.
// Without this, an active user hitting several pages a minute would trigger
// a write on every single request; once a day is plenty to keep the window
// sliding forward for anyone who opens the app regularly.
const SESSION_REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** Roles that can additionally authenticate with the Google button — role
 *  itself is always fixed by the existing account (owner invite or
 *  self-signup via Join Gym), never chosen at Google sign-in time. */
const GOOGLE_ROLES = ["TRAINER", "MEMBER"] as const;

function getClientIp(req?: Request): string {
  const fwd = req?.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req?.headers.get("x-real-ip") ?? "unknown";
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    // Re-issue the session cookie with a fresh 90-day expiry once a day of
    // activity — this is what makes the window slide instead of counting
    // down from first login.
    updateAge: 24 * 60 * 60,
  },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Google has already verified ownership of this email address, and our
      // own signIn() callback below only lets the flow succeed for an email
      // that already has an account here (via owner invite or self-signup
      // through Join Gym) — so linking this Google identity to that
      // existing account is safe, not "dangerous" in the way this flag
      // usually implies.
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        gymCode: { label: "Gym ID", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const gymCode = parsed.data.gymCode.toUpperCase();
        const ip = getClientIp(request);
        const identifier = `${gymCode}:${email}`;

        const rate = await checkLoginRateLimit(identifier, ip);
        if (!rate.allowed) {
          throw new Error(
            rate.reason === "account_locked" ? "TooManyAttempts" : "TooManyAttemptsFromNetwork",
          );
        }

        const gym = await db.gym.findUnique({ where: { gymCode } });
        if (!gym) {
          await recordLoginAttempt({ identifier, ipAddress: ip, success: false });
          throw new Error("GymNotFound");
        }

        const candidate = await db.user.findUnique({
          where: { gymId_email: { gymId: gym.id, email } },
        });

        const valid =
          !!candidate?.passwordHash && (await verifyPassword(password, candidate.passwordHash));

        await recordLoginAttempt({
          identifier,
          ipAddress: ip,
          success: valid,
          userId: candidate?.id,
        });

        if (!valid || !candidate || candidate.deletedAt || candidate.status !== "ACTIVE") {
          return null;
        }

        return {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          image: candidate.image,
          role: candidate.role,
          gymId: candidate.gymId,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;

      const email = profile?.email?.toLowerCase();
      if (!email || !profile?.email_verified) return false;

      const existing = await db.user.findFirst({
        where: {
          email,
          role: { in: [...GOOGLE_ROLES] },
          deletedAt: null,
          gymId: { not: null }, // excludes orphan rows the adapter may have
          // auto-created for an email with no real account (see the `role`
          // field's default comment in schema.prisma) — those never got a
          // gymId, so they can't be a legitimate Trainer/Member account.
        },
      });

      if (!existing) return "/join?error=NoAccount";
      if (existing.status === "INACTIVE") return "/login?error=AccountDeactivated";

      if (existing.status === "INVITED") {
        // Owner-invited (via the /invite/[token] flow) accounts are already
        // vetted by the gym — activate on first successful sign-in.
        // Self-signed-up (via Join Gym, no specific invite) Trainers need
        // an owner's approval first; Members don't (low blast radius).
        const hasOwnerInvite =
          existing.role !== "TRAINER" ||
          (await db.invite.findFirst({ where: { gymId: existing.gymId!, email } })) !== null;

        if (!hasOwnerInvite) return "/join?error=PendingApproval";

        // This must happen here (before the jwt callback runs), not in the
        // signIn event — the event fires after the session token is built,
        // so activating there was one request too late and could reject a
        // legitimate first login.
        await db.user.update({ where: { id: existing.id }, data: { status: "ACTIVE" } });
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        const sid = crypto.randomUUID();
        await db.userSession.create({
          data: {
            userId: user.id,
            jti: sid,
            expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
          },
        });
        token.sid = sid;
      }

      // Re-derive every claim from the DB on every request: this is what
      // makes revocation (deactivate staff, delete member) and role/gym
      // changes take effect immediately instead of waiting for token expiry.
      //
      // During client-side navigation the RSC render fires this callback for
      // each new page, so we check the short-lived session cache first. The
      // cache is keyed by JTI and expires after SESSION_CACHE_TTL_MS — long
      // enough to eliminate redundant round-trips within a burst of clicks,
      // short enough that revoked / deactivated accounts are caught within
      // seconds.
      if (token.sid) {
        const jti = token.sid as string;
        const now = Date.now();
        let cached = sessionCache.get(jti);

        // Evict stale entries while we're here (amortised cleanup)
        if (cached && cached.staleAt < now) {
          sessionCache.delete(jti);
          cached = undefined;
        }

        let sessionData: {
          userId: string;
          role: string;
          gymId: string | null;
          name: string | null;
          email: string | null;
          image: string | null;
          expiresAt: Date;
          sessionId: string;
        } | null = null;

        if (cached) {
          // Cache hit — skip the DB round-trip entirely
          sessionData = {
            userId: cached.userId,
            role: cached.role,
            gymId: cached.gymId,
            name: cached.name,
            email: cached.email,
            image: cached.image,
            expiresAt: cached.expiresAt,
            sessionId: cached.sessionId,
          };
        } else {
          // Cache miss — query DB and populate cache
          const session = await db.userSession.findUnique({
            where: { jti },
            include: { user: true },
          });

          const revoked =
            !session ||
            session.revokedAt !== null ||
            session.expiresAt < new Date() ||
            !session.user ||
            session.user.deletedAt !== null ||
            session.user.status !== "ACTIVE";

          if (revoked) {
            sessionCache.delete(jti);
            return null;
          }

          sessionData = {
            userId: session.user.id,
            role: session.user.role,
            gymId: session.user.gymId,
            name: session.user.name,
            email: session.user.email ?? null,
            image: session.user.image ?? null,
            expiresAt: session.expiresAt,
            sessionId: session.id,
          };

          sessionCache.set(jti, {
            ...sessionData,
            staleAt: now + SESSION_CACHE_TTL_MS,
          });

          // Slide the expiry forward for anyone actively using the app —
          // otherwise this DB-tracked expiry (separate from the cookie's own
          // rolling expiry above) would become the real, silent 90-day cutoff
          // counted from first login instead of from last use.
          const staleness = now - session.lastActiveAt.getTime();
          if (staleness > SESSION_REFRESH_THRESHOLD_MS) {
            await db.userSession.update({
              where: { id: session.id },
              data: {
                lastActiveAt: new Date(),
                expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
              },
            });
          }
        }
      if (!sessionData) {
        return null;
      }

      token.uid = sessionData.userId;
      token.role = sessionData.role as "PLATFORM_SUPER_ADMIN" | "GYM_OWNER" | "RECEPTIONIST" | "TRAINER" | "MEMBER";
      token.gymId = sessionData.gymId;
      token.name = sessionData.name;
      token.email = sessionData.email ?? undefined;
      token.picture = sessionData.image ?? undefined;
    }

      return token;
    },
    async session({ session, token }) {
      if (token?.uid) {
        session.user.id = token.uid;
        session.user.role = token.role!;
        session.user.gymId = token.gymId ?? null;
        session.sessionId = token.sid;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user.id) return;
      await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      if (account?.provider === "google" && user.email) {
        await db.invite.updateMany({
          where: { email: user.email.toLowerCase(), acceptedAt: null },
          data: { acceptedAt: new Date() },
        });
      }
    },
    async signOut(message) {
      const sid = "token" in message ? message.token?.sid : undefined;
      if (sid) {
        await db.userSession.updateMany({
          where: { jti: sid as string, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
