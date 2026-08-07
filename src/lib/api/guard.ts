import "server-only";
import type { UserRole } from "@prisma/client";
import { getSession } from "@/lib/auth/guards";
import { errors } from "@/lib/api/response";

/** Route-handler counterpart to `requireGymScope`: same session/Db-fresh
 *  guarantees, but returns JSON errors (401/403) instead of calling
 *  `redirect()` (which is invalid outside Server Components/Actions). */
export async function requireApiUser() {
  const session = await getSession();
  if (!session?.user) throw errors.unauthenticated();
  return session.user;
}

export async function requireApiGymScope(...roles: UserRole[]) {
  const user = await requireApiUser();
  if (roles.length > 0 && !roles.includes(user.role)) {
    throw errors.forbidden();
  }
  if (!user.gymId) {
    throw errors.forbidden("Your account is not linked to a gym");
  }
  return { user, gymId: user.gymId };
}
