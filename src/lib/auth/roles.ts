import type { UserRole } from "@prisma/client";

// Single source of truth for role → home-route mapping.
//
// Used by:
//   - src/middleware.ts (Edge) — bounce authenticated users off `/` and `/login`
//   - src/app/(auth)/role-redirect/page.tsx (RSC) — deterministic post-login landing
//
// Keep this module free of server-only imports so it stays importable on the
// Edge runtime and in client components.

export const ROLE_HOME: Record<UserRole, string> = {
  PLATFORM_SUPER_ADMIN: "/admin",
  GYM_OWNER: "/owner",
  RECEPTIONIST: "/reception",
  TRAINER: "/trainer",
  MEMBER: "/member",
};

/** The route prefix each role owns. */
const ROLE_PREFIXES: Record<UserRole, string> = ROLE_HOME;

export function getRoleHome(role: UserRole | undefined | null): string {
  return (role && ROLE_HOME[role]) ?? "/";
}

/**
 * True when `path` lives under the given role's own area. Used to validate a
 * post-login `next` deep-link so an authenticated member can't be bounced into
 * `/owner/…` and vice-versa — a mismatch (or a path that isn't the user's own
 * area) means "drop the deep-link, go to your dashboard".
 */
export function isPathInRoleArea(path: string | undefined | null, role: UserRole): boolean {
  if (!path || !path.startsWith("/")) return false;
  const prefix = ROLE_PREFIXES[role];
  return path === prefix || path.startsWith(`${prefix}/`);
}
