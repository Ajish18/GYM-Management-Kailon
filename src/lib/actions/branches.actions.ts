"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireGymScope } from "@/lib/auth/guards";

const branchSchema = z.object({
  name: z.string().trim().min(2, "Branch name is required").max(120),
  addressLine: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
});
type BranchInput = z.infer<typeof branchSchema>;

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createBranchAction(
  input: BranchInput,
): Promise<ActionResult<{ branchId: string }>> {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const parsed = branchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, addressLine, city } = parsed.data;

  const branch = await db.$transaction(async (tx) => {
    const count = await tx.branch.count({ where: { gymId } });
    // First branch for a gym becomes the default.
    return tx.branch.create({
      data: {
        gymId,
        name,
        address: addressLine || city
          ? { line: addressLine || undefined, city: city || undefined }
          : Prisma.JsonNull,
        isDefault: count === 0,
        status: "active",
      },
    });
  });

  revalidatePath("/owner/branches");
  return { success: true, data: { branchId: branch.id } };
}

export async function setDefaultBranchAction(branchId: string): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const branch = await db.branch.findFirst({ where: { id: branchId, gymId } });
  if (!branch) return { success: false, error: "Branch not found" };

  await db.$transaction([
    db.branch.updateMany({ where: { gymId }, data: { isDefault: false } }),
    db.branch.update({ where: { id: branchId }, data: { isDefault: true } }),
  ]);

  revalidatePath("/owner/branches");
  return { success: true, data: undefined };
}

export async function toggleBranchStatusAction(branchId: string): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const branch = await db.branch.findFirst({ where: { id: branchId, gymId } });
  if (!branch) return { success: false, error: "Branch not found" };
  if (branch.isDefault) return { success: false, error: "The default branch can't be deactivated" };

  await db.branch.update({
    where: { id: branchId },
    data: { status: branch.status === "active" ? "inactive" : "active" },
  });

  revalidatePath("/owner/branches");
  return { success: true, data: undefined };
}
