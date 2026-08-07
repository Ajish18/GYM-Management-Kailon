import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { getBranches } from "@/lib/data/branches";
import { BranchManager } from "@/components/branches/branch-manager";

export const metadata: Metadata = { title: "Branches" };

export default async function OwnerBranchesPage() {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const branches = await getBranches(gymId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Branches</h1>
        <p className="text-muted-foreground">
          Manage locations of your gym and which one is the default.
        </p>
      </div>
      <BranchManager branches={branches} />
    </div>
  );
}
