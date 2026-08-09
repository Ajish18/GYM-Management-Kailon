import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export type GymBranch = {
  id: string;
  name: string;
  address: { line?: string; city?: string } | null;
  isDefault: boolean;
  status: string;
  createdAt: Date;
};

/** Branches for a gym, default first, then oldest. The `Branch` model has no
 *  user-scoping relations yet, so this stays a plain list — a future
 *  migration can add branchId to User/MemberProfile on top of it.
 *  Branches change rarely; 5min caching removes a round-trip from every
 *  sidebar visit to /owner/branches. */
export const getBranches = unstable_cache(
  async (gymId: string): Promise<GymBranch[]> => {
    const branches = await db.branch.findMany({
      where: { gymId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return branches.map((b) => ({
      id: b.id,
      name: b.name,
      address: (b.address as { line?: string; city?: string } | null) ?? null,
      isDefault: b.isDefault,
      status: b.status,
      createdAt: b.createdAt,
    }));
  },
  ["branches-list"],
  { revalidate: 300 },
);
