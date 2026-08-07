import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth/config";

// React `cache()` dedupes the full `auth()` call — including the jwt
// callback's DB-backed session check — to ONCE per server-render pass.
// Without it a single page triggers the session query 3× (role layout,
// <NotificationBell/>, then the page itself), which is 3 remote round-trips
// to Supabase on every request. The cookie still gives the same value for
// the whole render, so this is safe to memoize.
const getCachedAuth = cache(() => auth());

/** Authoritative auth check for Server Components/Actions — always backed
 *  by the DB-freshness logic in the main jwt() callback (see config.ts).
 *  Memoized per request via React `cache()`. */
export async function getSession() {
  return getCachedAuth();
}

export async function requireUser() {
  const session = await getCachedAuth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireRole(...roles: UserRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/login");
  }
  return user;
}

/** For Server Actions/Route Handlers scoped to one gym: returns the caller's
 *  own gymId, never a client-supplied one (NFR-SEC-002 / NFR-TENANT-002). */
export async function requireGymScope(...roles: UserRole[]) {
  const user = await requireRole(...roles);
  if (!user.gymId) {
    throw new Error("User has no gym scope");
  }
  return { user, gymId: user.gymId };
}
