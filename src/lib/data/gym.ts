import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

// Gym name/code change so rarely that every role layout re-fetching them from
// a remote Supabase DB on every request is pure waste (one 30–80ms round-trip
// per page load, ×4 layouts). This memoizes across requests for 5 minutes.
// Keyed by gymId, so tenants never share cache entries.
export const getGymMeta = unstable_cache(
  async (gymId: string) =>
    db.gym.findUnique({
      where: { id: gymId },
      select: { name: true, gymCode: true },
    }),
  ["gym-meta"],
  { revalidate: 300 },
);
