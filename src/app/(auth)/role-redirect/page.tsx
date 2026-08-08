import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getRoleHome, isPathInRoleArea } from "@/lib/auth/roles";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Deterministic post-login landing page.
 *
 * Every auth entry point (login form, join flow, invite accept, Google
 * buttons) redirects here after a successful sign-in. This resolves the
 * caller's role from the authoritative server-side session and sends them to
 * their dashboard — it does NOT depend on the Edge middleware, which is only
 * a secondary gate for direct URL access and can be stale/broken in a
 * mis-configured production deploy.
 *
 * `?next=` deep-links (set by the middleware when bouncing an unauthenticated
 * user) are honored only when they belong to the caller's own role area;
 * anything else falls back to the role home.
 */
export default async function RoleRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { next } = await searchParams;
  redirect(isPathInRoleArea(next, session.user.role) ? next! : getRoleHome(session.user.role));
}
