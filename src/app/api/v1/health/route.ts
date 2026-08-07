import { handle, ok, fail, errors } from "@/lib/api/response";
import { db } from "@/lib/db";

/** Liveness + DB connectivity probe. Public and intentionally minimal — it
 *  must not leak tenant data. */
export const GET = handle(async () => {
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    return fail(errors.internal("Database unreachable"));
  }
  return ok({ status: "ok", timestamp: new Date().toISOString() });
});
