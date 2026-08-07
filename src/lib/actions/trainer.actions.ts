"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireGymScope } from "@/lib/auth/guards";
import {
  updateTrainerProfileSchema,
  type UpdateTrainerProfileInput,
} from "@/lib/validations/trainer";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function updateTrainerProfileAction(
  input: UpdateTrainerProfileInput,
): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const parsed = updateTrainerProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { userId, specialization, bio, yearsExperience, maxMemberCapacity } = parsed.data;

  const profile = await db.trainerProfile.findFirst({ where: { userId, gymId } });
  if (!profile) return { success: false, error: "Trainer not found" };

  await db.trainerProfile.update({
    where: { userId },
    data: {
      specialization,
      bio: bio || null,
      yearsExperience: yearsExperience ?? null,
      maxMemberCapacity: maxMemberCapacity ?? null,
    },
  });

  revalidatePath("/owner/staff");
  return { success: true, data: undefined };
}

export async function listTrainersWithWorkload(gymId: string) {
  const trainers = await db.user.findMany({
    where: { gymId, role: "TRAINER", deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      status: true,
      passwordHash: true,
      trainerProfile: true,
      _count: { select: { membersAssigned: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return trainers;
}
