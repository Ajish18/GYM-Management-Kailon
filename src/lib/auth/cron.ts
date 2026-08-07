import "server-only";
import type { NextRequest } from "next/server";

/** Fail-closed gate for the cron endpoints.
 *
 *  Before this helper existed the crons ran open whenever CRON_SECRET was
 *  unset ("pre-launch convenience"), which meant anyone who found the route
 *  could trigger a full gym-wide streak/notification run. Production default
 *  is now: if CRON_SECRET is not configured, the endpoint returns 401 so a
 *  misconfigured deployment fails loudly instead of running open. The secret
 *  is only accepted as `Authorization: Bearer <secret>` — never as a
 *  `?secret=` query param, which would leak it into access logs. */
export function isCronAuthorized(req: NextRequest | Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}
